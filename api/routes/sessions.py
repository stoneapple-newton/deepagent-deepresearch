from __future__ import annotations

import asyncio
from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, desc, select

from api import schemas
from api.deps import get_session as get_db_session
from api.models import LogEntry, ResearchSession
from api.services import broadcaster, research_runner

router = APIRouter(prefix="/api")


def _to_response(db: Session, session: ResearchSession) -> schemas.ResearchSessionResponse:
    logs = db.exec(
        select(LogEntry)
        .where(LogEntry.session_id == session.id)
        .order_by(LogEntry.timestamp)
    ).all()
    data = {
        **session.model_dump(),
        "report": session.report_content,
        "logs": [log.model_dump() for log in logs],
    }
    return schemas.ResearchSessionResponse(**data)


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db_session)) -> list[schemas.ResearchSessionResponse]:
    statement = select(ResearchSession).order_by(desc(ResearchSession.created_at))
    sessions = db.exec(statement).all()
    return [_to_response(db, s) for s in sessions]


@router.post("/sessions")
async def create_session(
    payload: schemas.ResearchSessionCreate, db: Session = Depends(get_db_session)
) -> schemas.ResearchSessionResponse:
    session_id = uuid.uuid4().hex
    thread_id = payload.thread_id or f"thread-{session_id}"
    session = ResearchSession(
        id=session_id,
        thread_id=thread_id,
        query=payload.query,
        model=payload.model,
        max_llm_calls=max(1, payload.max_llm_calls),
        status="running",
        phase="planning",
        progress=0,
        tags=payload.tags or [],
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    broadcaster.create_queue(session_id)
    asyncio.create_task(
        research_runner.start_research(
            session_id,
            payload.query,
            thread_id,
            max_llm_calls=max(1, payload.max_llm_calls),
            model_name=payload.model,
        )
    )

    return _to_response(db, session)


@router.post("/sessions/{session_id}/steer")
async def steer_session(
    session_id: str,
    payload: schemas.SteeringInstructionCreate,
    db: Session = Depends(get_db_session),
) -> schemas.ResearchSessionResponse:
    session = db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "running":
        raise HTTPException(status_code=409, detail="Only running sessions can be steered")

    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Steering message cannot be empty")

    entry = {
        "id": uuid.uuid4().hex,
        "message": message,
        "created_at": datetime.utcnow().isoformat(),
        "consumed": False,
    }
    session.steering_instructions = [*session.steering_instructions, entry]
    session.last_steering_at = datetime.utcnow()
    session.updated_at = datetime.utcnow()

    log = LogEntry(
        id=uuid.uuid4().hex,
        session_id=session_id,
        agent="operator",
        phase=session.phase,
        message=f"Steering added: {message}",
    )
    db.add(log)
    db.add(session)
    db.commit()
    db.refresh(session)

    await broadcaster.emit(session_id, {"type": "steering", "instruction": entry})
    await broadcaster.emit(
        session_id,
        {"type": "log", "agent": "operator", "phase": session.phase, "message": log.message},
    )
    return _to_response(db, session)


@router.get("/sessions/{session_id}")
def get_research_session(
    session_id: str, db: Session = Depends(get_db_session)
) -> schemas.ResearchSessionResponse:
    session = db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return _to_response(db, session)


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db_session)) -> dict[str, str]:
    session = db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    logs = db.exec(select(LogEntry).where(LogEntry.session_id == session_id)).all()
    for log in logs:
        db.delete(log)
    db.delete(session)
    db.commit()
    broadcaster.delete_queue(session_id)
    return {"message": "Session deleted"}
