from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from typing import Any

_queues: dict[str, asyncio.Queue[dict[str, Any]]] = {}

EventStream = AsyncGenerator[dict[str, Any], None]


def create_queue(session_id: str) -> asyncio.Queue[dict[str, Any]]:
    queue = asyncio.Queue[dict[str, Any]]()
    _queues[session_id] = queue
    return queue


def get_queue(session_id: str) -> asyncio.Queue[dict[str, Any]] | None:
    return _queues.get(session_id)


def delete_queue(session_id: str) -> None:
    _queues.pop(session_id, None)


async def emit(session_id: str, event: dict[str, Any]) -> None:
    queue = _queues.get(session_id)
    if queue is None:
        return
    await queue.put(event)
