from __future__ import annotations

import asyncio
import os
import re
import time
import traceback
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

from sqlmodel import Session

from agents.deep_research import LlmBudgetExceeded, run_research
from api.database import engine
from api.models import LogEntry, ResearchSession
from api.services import broadcaster

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="research-")

REPORTS_DIR = Path("reports")
REPORTS_DIR.mkdir(exist_ok=True)

PHASES = [
    ("planning", 10, "planner"),
    ("researching", 40, "web_researcher"),
    ("auditing", 65, "source_auditor"),
    ("writing", 85, "report_writer"),
    ("checking", 95, "quality_checker"),
]


def _add_log(db: Session, session_id: str, agent: str, phase: str, message: str) -> None:
    log = LogEntry(
        id=uuid.uuid4().hex,
        session_id=session_id,
        agent=agent,
        phase=phase,
        message=message,
    )
    db.add(log)


def _record_budget_usage(session_id: str, used: int, max_calls: int) -> None:
    with Session(engine) as db:
        session = db.get(ResearchSession, session_id)
        if session is None:
            return
        session.llm_calls_used = used
        session.max_llm_calls = max_calls
        session.updated_at = datetime.utcnow()
        db.add(session)
        db.commit()


def _consume_steering(session_id: str) -> str:
    with Session(engine) as db:
        session = db.get(ResearchSession, session_id)
        if session is None:
            return ""

        pending = [
            instruction
            for instruction in session.steering_instructions
            if not instruction.get("consumed")
        ]
        if not pending:
            return ""

        updated = []
        now = datetime.utcnow().isoformat()
        for instruction in session.steering_instructions:
            if instruction.get("consumed"):
                updated.append(instruction)
            else:
                updated.append({**instruction, "consumed": True, "consumed_at": now})
        session.steering_instructions = updated
        session.updated_at = datetime.utcnow()
        _add_log(
            db,
            session_id,
            "deep_research_agent",
            session.phase,
            f"Consumed {len(pending)} steering instruction(s).",
        )
        db.add(session)
        db.commit()

    return "\n".join(
        f"- {instruction.get('message', '')}" for instruction in pending if instruction.get("message")
    )


def _estimate_source_count(report: str) -> int:
    urls = re.findall(r"https?://[^\s\)\]]+", report)
    return len(set(urls))


def _word_count(report: str) -> int:
    return len(report.split())


async def start_research(
    session_id: str,
    query: str,
    thread_id: str,
    *,
    max_llm_calls: int,
    model_name: str | None = None,
) -> None:
    """Run research in the background and emit SSE events."""
    start_time = time.time()

    with Session(engine) as db:
        session = db.get(ResearchSession, session_id)
        if session is None:
            return

        session.status = "running"
        session.phase = "planning"
        session.progress = 0
        session.max_llm_calls = max_llm_calls
        session.model = model_name or session.model
        session.updated_at = datetime.utcnow()
        db.add(session)
        db.commit()

    await broadcaster.emit(session_id, {"type": "phase", "phase": "planning"})

    # Synthetic progress events for each phase.
    for phase, progress, agent in PHASES:
        with Session(engine) as db:
            session = db.get(ResearchSession, session_id)
            if session is None:
                return
            session.phase = phase
            session.progress = progress
            session.updated_at = datetime.utcnow()
            db.add(session)
            _add_log(
                db,
                session_id,
                agent,
                phase,
                f"{phase.capitalize()} phase started for query: {query[:80]}...",
            )
            db.commit()

        await broadcaster.emit(session_id, {"type": "phase", "phase": phase})
        await broadcaster.emit(
            session_id,
            {
                "type": "log",
                "agent": agent,
                "phase": phase,
                "message": f"{phase.capitalize()} phase started",
            },
        )
        await broadcaster.emit(session_id, {"type": "progress", "progress": progress})

    try:
        loop = asyncio.get_running_loop()

        def on_budget_usage(used: int, max_calls: int) -> None:
            _record_budget_usage(session_id, used, max_calls)
            loop.call_soon_threadsafe(
                asyncio.create_task,
                broadcaster.emit(
                    session_id,
                    {"type": "budget", "llm_calls_used": used, "max_llm_calls": max_calls},
                ),
            )

        report = await loop.run_in_executor(
            _executor,
            lambda: run_research(
                query,
                thread_id=thread_id,
                model_name=model_name,
                max_llm_calls=max_llm_calls,
                on_budget_usage=on_budget_usage,
                steering_reader=lambda: _consume_steering(session_id),
            ),
        )

        report_path = REPORTS_DIR / f"{session_id}.md"
        report_path.write_text(report, encoding="utf-8")

        duration = int(time.time() - start_time)
        source_count = _estimate_source_count(report)
        words = _word_count(report)

        with Session(engine) as db:
            session = db.get(ResearchSession, session_id)
            if session is None:
                return
            session.status = "completed"
            session.phase = "completed"
            session.progress = 100
            session.report_path = str(report_path)
            session.report_content = report
            session.source_count = source_count
            session.word_count = words
            session.duration = duration
            session.completed_at = datetime.utcnow()
            session.updated_at = datetime.utcnow()
            _add_log(
                db,
                session_id,
                "deep_research_agent",
                "completed",
                f"Research completed in {duration}s. Report saved to {report_path}.",
            )
            db.add(session)
            db.commit()

        await broadcaster.emit(
            session_id,
            {
                "type": "completed",
                "report_summary": report[:500],
                "source_count": source_count,
                "word_count": words,
                "duration": duration,
            },
        )
    except LlmBudgetExceeded as exc:
        with Session(engine) as db:
            session = db.get(ResearchSession, session_id)
            if session is None:
                return
            session.status = "budget_exhausted"
            session.phase = "failed"
            session.updated_at = datetime.utcnow()
            _add_log(
                db,
                session_id,
                "deep_research_agent",
                "failed",
                f"Research stopped because the LLM budget was exhausted: {exc!s}",
            )
            db.add(session)
            db.commit()

        await broadcaster.emit(
            session_id,
            {
                "type": "error",
                "error": str(exc),
                "status": "budget_exhausted",
            },
        )
    except Exception as exc:  # noqa: BLE001
        error_message = f"Research failed: {exc!s}"
        full_traceback = traceback.format_exc()
        with Session(engine) as db:
            session = db.get(ResearchSession, session_id)
            if session is None:
                return
            session.status = "failed"
            session.phase = "failed"
            session.updated_at = datetime.utcnow()
            _add_log(
                db,
                session_id,
                "deep_research_agent",
                "failed",
                error_message,
            )
            # Also log the traceback as a separate log entry for debugging.
            _add_log(
                db,
                session_id,
                "deep_research_agent",
                "failed",
                full_traceback,
            )
            db.add(session)
            db.commit()

        print(full_traceback)
        await broadcaster.emit(session_id, {"type": "error", "error": str(exc)})
