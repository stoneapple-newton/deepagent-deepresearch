from __future__ import annotations

import asyncio

import json

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse
from sqlmodel import Session

from api.deps import get_session
from api.models import ResearchSession
from api.services import broadcaster

router = APIRouter(prefix="/api")


async def _event_generator(session_id: str) -> broadcaster.EventStream:
    queue = broadcaster.get_queue(session_id)
    if queue is None:
        raise HTTPException(status_code=404, detail="Session stream not found")

    while True:
        try:
            event = await asyncio.wait_for(queue.get(), timeout=30.0)
            event_type = str(event.get("type", "message"))
            yield {"event": event_type, "data": json.dumps(event)}
            if event.get("type") in ("completed", "error"):
                break
        except asyncio.TimeoutError:
            yield {"event": "ping", "data": "{}"}


@router.get("/sessions/{session_id}/stream")
async def stream_session(
    session_id: str, db: Session = Depends(get_session)
) -> EventSourceResponse:
    session = db.get(ResearchSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return EventSourceResponse(_event_generator(session_id))
