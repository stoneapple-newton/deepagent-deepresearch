from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, desc, select

from api import schemas
from api.deps import get_session
from api.models import LogEntry, ResearchSession

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


@router.get("/reports")
def list_reports(db: Session = Depends(get_session)) -> list[schemas.ResearchSessionResponse]:
    statement = (
        select(ResearchSession)
        .where(ResearchSession.status == "completed")
        .order_by(desc(ResearchSession.completed_at))
    )
    sessions = db.exec(statement).all()
    return [_to_response(db, s) for s in sessions]


@router.get("/reports/{session_id}")
def get_report(session_id: str, db: Session = Depends(get_session)) -> schemas.ResearchSessionResponse:
    session = db.get(ResearchSession, session_id)
    if not session or session.status != "completed":
        raise HTTPException(status_code=404, detail="Report not found")
    return _to_response(db, session)
