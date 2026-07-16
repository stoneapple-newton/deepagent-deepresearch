from __future__ import annotations

import asyncio
import re
import time
import traceback
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

from sqlmodel import Session, desc, select

from agents.deep_research import ResearchBudgetExceeded, run_research
from api.database import engine
from api.models import LogEntry, ResearchSession
from api.services import broadcaster
from core.research_profiles import ResearchProfile, get_research_profile
from langgraph.errors import GraphRecursionError

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="research-")

REPORTS_DIR = Path("reports")
REPORTS_DIR.mkdir(exist_ok=True)
RESEARCH_DIR = Path("research")

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


def _record_budget_usage(
    session_id: str,
    kind: str,
    used: int,
    max_calls: int,
) -> dict[str, int]:
    fields = {
        "llm": ("llm_calls_used", "max_llm_calls"),
        "search": ("search_calls_used", "max_search_calls"),
        "subagent": ("subagent_calls_used", "max_subagent_calls"),
    }
    used_field, max_field = fields[kind]
    with Session(engine) as db:
        session = db.get(ResearchSession, session_id)
        if session is None:
            return {}
        setattr(session, used_field, used)
        setattr(session, max_field, max_calls)
        session.updated_at = datetime.utcnow()
        db.add(session)
        db.commit()
        return {
            "llm_calls_used": session.llm_calls_used,
            "max_llm_calls": session.max_llm_calls,
            "search_calls_used": session.search_calls_used,
            "max_search_calls": session.max_search_calls,
            "subagent_calls_used": session.subagent_calls_used,
            "max_subagent_calls": session.max_subagent_calls,
        }


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


def _score_candidate_file(path: Path, query_terms: set[str]) -> tuple[int, float]:
    parts = set(re.findall(r"[a-z0-9]+", path.as_posix().lower()))
    overlap = len(parts & query_terms)
    try:
        mtime = path.stat().st_mtime
    except OSError:
        mtime = 0.0
    return overlap, mtime


def _detect_research_files(query: str, *, limit: int = 12) -> list[str]:
    if not RESEARCH_DIR.exists():
        return []

    query_terms = {
        term
        for term in re.findall(r"[a-z0-9]+", query.lower())
        if len(term) >= 3
    }
    files = [
        path
        for path in RESEARCH_DIR.rglob("*")
        if path.is_file() and path.suffix.lower() in {".md", ".txt", ".json"}
    ]
    ranked = sorted(
        files,
        key=lambda path: _score_candidate_file(path, query_terms),
        reverse=True,
    )
    return [path.as_posix() for path in ranked[:limit]]


def _latest_failure_message(db: Session, session_id: str) -> str:
    log = db.exec(
        select(LogEntry)
        .where(LogEntry.session_id == session_id)
        .where(LogEntry.phase == "failed")
        .order_by(desc(LogEntry.timestamp))
    ).first()
    if log is None:
        return "No prior failure log was recorded."
    message = log.message.strip()
    return message[:1500] if message else "Prior failure log was empty."


def _build_resume_query(
    *,
    session_id: str,
    query: str,
    previous_status: str | None,
    previous_llm_calls: int | None,
    max_llm_calls: int,
) -> str:
    with Session(engine) as db:
        session = db.get(ResearchSession, session_id)
        failure_message = _latest_failure_message(db, session_id)
        report_path = session.report_path if session and session.report_path else None

    files = _detect_research_files(query)
    file_lines = "\n".join(f"- /{path}" for path in files) or "- No existing research files detected."
    report_line = f"\nExisting report path, if useful: /{report_path}" if report_path else ""
    previous_call_text = (
        str(previous_llm_calls) if previous_llm_calls is not None else "unknown"
    )
    previous_status_text = previous_status or "unknown"

    return f"""Continue the original research request using existing progress.

Original request:
{query}

Resume context:
- Previous status: {previous_status_text}
- Previous LLM calls used: {previous_call_text}
- Fresh LLM call budget for this attempt: {max_llm_calls}
- Previous failure: {failure_message}{report_line}

Existing candidate research files under /research:
{file_lines}

Instructions for this continuation:
- Inspect existing /research notes and any report drafts first.
- Reuse prior findings, todos, searches, source audits, and draft sections.
- Avoid repeating completed searches unless verification, freshness, or contradiction resolution requires it.
- Fill only the remaining gaps, then produce and save the final Markdown report.
- Keep citations close to the claims they support and finish with the saved report path plus key takeaways.
"""


async def start_research(
    session_id: str,
    query: str,
    thread_id: str,
    *,
    max_llm_calls: int | None = None,
    profile: ResearchProfile | None = None,
    model_name: str | None = None,
    resume: bool = False,
    previous_status: str | None = None,
    previous_llm_calls: int | None = None,
) -> None:
    """Run research in the background and emit SSE events."""
    start_time = time.time()
    profile = profile or get_research_profile()
    if max_llm_calls is not None and max_llm_calls != profile.max_llm_calls:
        profile = profile.model_copy(update={"max_llm_calls": max(1, max_llm_calls)})
    max_llm_calls = profile.max_llm_calls

    with Session(engine) as db:
        session = db.get(ResearchSession, session_id)
        if session is None:
            return

        session.status = "running"
        session.phase = "planning"
        session.progress = 0
        session.llm_calls_used = 0
        session.search_calls_used = 0
        session.subagent_calls_used = 0
        session.research_profile = profile.id
        session.max_llm_calls = profile.max_llm_calls
        session.max_search_calls = profile.max_search_calls
        session.max_subagent_calls = profile.max_subagent_calls
        session.max_research_rounds = profile.max_research_rounds
        session.recursion_limit = profile.recursion_limit
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

        def on_budget_usage(kind: str, used: int, max_calls: int) -> None:
            usage = _record_budget_usage(session_id, kind, used, max_calls)
            loop.call_soon_threadsafe(
                asyncio.create_task,
                broadcaster.emit(
                    session_id,
                    {"type": "budget", "kind": kind, **usage},
                ),
            )

        run_query = query
        if resume:
            run_query = _build_resume_query(
                session_id=session_id,
                query=query,
                previous_status=previous_status,
                previous_llm_calls=previous_llm_calls,
                max_llm_calls=max_llm_calls,
            )

        report = await loop.run_in_executor(
            _executor,
            lambda: run_research(
                run_query,
                thread_id=thread_id,
                model_name=model_name,
                profile=profile,
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
    except (ResearchBudgetExceeded, GraphRecursionError) as exc:
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
                f"Research stopped because a profile limit was exhausted: {exc!s}",
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
        error_message = f"Unexpected research failure: {type(exc).__name__}: {exc!s}"
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
