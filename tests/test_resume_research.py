from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

import pytest
from fastapi import HTTPException
from sqlmodel import Session, SQLModel, create_engine, select

from api.models import LogEntry, ResearchSession
from api.routes import sessions as session_routes
from api.services import research_runner


def make_engine(tmp_path: Path):
    return create_engine(
        f"sqlite:///{tmp_path / 'test.db'}",
        connect_args={"check_same_thread": False},
    )


def seed_session(
    db: Session,
    *,
    status: str = "failed",
    session_id: str = "session-1",
) -> ResearchSession:
    session = ResearchSession(
        id=session_id,
        thread_id="thread-1",
        query="Research open source browser agents",
        status=status,
        phase="failed" if status in {"failed", "budget_exhausted"} else "completed",
        progress=65,
        max_llm_calls=40,
        llm_calls_used=14,
        model="deepseek-chat",
    )
    db.add(session)
    db.add(
        LogEntry(
            id="failure-log",
            session_id=session_id,
            agent="deep_research_agent",
            phase="failed",
            message="Unexpected research failure: RuntimeError: search failed",
        )
    )
    db.commit()
    db.refresh(session)
    return session


def test_continue_failed_session_reuses_same_row_and_schedules_resume(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    engine = make_engine(tmp_path)
    SQLModel.metadata.create_all(engine)
    scheduled: list[dict[str, Any]] = []

    async def fake_start_research(*args: Any, **kwargs: Any) -> None:
        scheduled.append({"args": args, "kwargs": kwargs})

    monkeypatch.setattr(session_routes.research_runner, "start_research", fake_start_research)
    monkeypatch.setattr(session_routes.broadcaster, "delete_queue", lambda _session_id: None)
    monkeypatch.setattr(session_routes.broadcaster, "create_queue", lambda _session_id: None)

    async def run_test() -> None:
        with Session(engine) as db:
            original = seed_session(db)
            response = await session_routes.continue_session(original.id, None, db)
            await asyncio.sleep(0)

            refreshed = db.get(ResearchSession, original.id)
            logs = db.exec(
                select(LogEntry).where(LogEntry.session_id == original.id)
            ).all()

        assert refreshed is not None
        assert response.id == original.id
        assert refreshed.thread_id == "thread-1"
        assert refreshed.status == "running"
        assert refreshed.phase == "planning"
        assert refreshed.progress == 0
        assert refreshed.llm_calls_used == 0
        assert refreshed.max_llm_calls == 40
        assert any("Continuing failed research in place" in log.message for log in logs)
        assert len(scheduled) == 1
        assert scheduled[0]["args"][:3] == (
            original.id,
            "Research open source browser agents",
            "thread-1",
        )
        assert scheduled[0]["kwargs"]["resume"] is True
        assert scheduled[0]["kwargs"]["previous_status"] == "failed"
        assert scheduled[0]["kwargs"]["previous_llm_calls"] == 14

    asyncio.run(run_test())


def test_continue_rejects_completed_session(tmp_path: Path) -> None:
    engine = make_engine(tmp_path)
    SQLModel.metadata.create_all(engine)

    async def run_test() -> None:
        with Session(engine) as db:
            session = seed_session(db, status="completed")
            with pytest.raises(HTTPException) as exc_info:
                await session_routes.continue_session(session.id, None, db)

        assert exc_info.value.status_code == 409

    asyncio.run(run_test())


def test_build_resume_query_includes_context_and_research_file_hints(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    engine = make_engine(tmp_path)
    SQLModel.metadata.create_all(engine)
    research_dir = tmp_path / "research"
    workspace = research_dir / "browser-agents"
    workspace.mkdir(parents=True)
    (workspace / "findings.md").write_text("Prior findings", encoding="utf-8")

    monkeypatch.setattr(research_runner, "engine", engine)
    monkeypatch.setattr(research_runner, "RESEARCH_DIR", research_dir)

    with Session(engine) as db:
        seed_session(db)

    prompt = research_runner._build_resume_query(
        session_id="session-1",
        query="Research open source browser agents",
        previous_status="failed",
        previous_llm_calls=14,
        max_llm_calls=40,
    )

    assert "Continue the original research request using existing progress" in prompt
    assert "Research open source browser agents" in prompt
    assert "Previous status: failed" in prompt
    assert "Previous LLM calls used: 14" in prompt
    assert "Unexpected research failure: RuntimeError: search failed" in prompt
    assert "/research/browser-agents/findings.md" in prompt
    assert "Avoid repeating completed searches" in prompt
