from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.sqlite import JSON
from sqlmodel import Field, SQLModel

if TYPE_CHECKING:
    pass


class AgentConfig(SQLModel, table=True):
    __tablename__ = "agent_config"

    id: str = Field(primary_key=True)
    name: str
    description: str
    icon: str = "Bot"
    enabled: bool = True
    system_prompt: str
    temperature: float = 0.2
    max_tokens: int = 4096
    avg_execution_time: int = 60
    success_rate: int = 95
    total_invocations: int = 0
    tools: list[str] = Field(default_factory=list, sa_column=Column(JSON))


class ResearchSession(SQLModel, table=True):
    __tablename__ = "research_session"

    id: str = Field(primary_key=True)
    thread_id: str
    query: str
    status: str = "pending"  # pending | running | completed | failed | budget_exhausted
    phase: str = "planning"  # planning | researching | auditing | writing | checking | completed | failed
    progress: int = 0
    model: str | None = None
    max_llm_calls: int = 40
    llm_calls_used: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=False)))
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=False)))
    completed_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=False)))
    report_path: str | None = None
    report_content: str | None = None
    source_count: int | None = None
    word_count: int | None = None
    duration: int | None = None
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    phase_times: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    steering_instructions: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    last_steering_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=False)))


class LogEntry(SQLModel, table=True):
    __tablename__ = "log_entry"

    id: str = Field(primary_key=True)
    session_id: str = Field(foreign_key="research_session.id", index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime(timezone=False)))
    agent: str
    phase: str
    message: str
