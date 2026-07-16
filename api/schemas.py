from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class LogEntryBase(BaseModel):
    agent: str
    phase: str
    message: str


class LogEntryCreate(LogEntryBase):
    pass


class LogEntryResponse(LogEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    timestamp: datetime


class AgentConfigBase(BaseModel):
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
    tools: list[str]


class AgentConfigCreate(AgentConfigBase):
    id: str


class AgentConfigUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    enabled: bool | None = None
    system_prompt: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    avg_execution_time: int | None = None
    success_rate: int | None = None
    total_invocations: int | None = None
    tools: list[str] | None = None


class AgentConfigResponse(AgentConfigBase):
    model_config = ConfigDict(from_attributes=True)

    id: str


class ResearchSessionBase(BaseModel):
    query: str
    thread_id: str | None = None
    model: str | None = None
    research_profile: str | None = None
    # Backward-compatible one-off override. Prefer editing research_profiles.yaml.
    max_llm_calls: int | None = None


class ResearchSessionCreate(ResearchSessionBase):
    tags: list[str] | None = None


class ResearchSessionContinue(BaseModel):
    pass


class ResearchProfileResponse(BaseModel):
    id: str
    label: str
    description: str
    max_llm_calls: int
    max_search_calls: int
    max_subagent_calls: int
    max_research_rounds: int
    recursion_limit: int


class ResearchProfileCatalogResponse(BaseModel):
    version: int
    default_profile: str
    profiles: list[ResearchProfileResponse]


class ResearchSessionUpdate(BaseModel):
    status: str | None = None
    phase: str | None = None
    progress: int | None = None
    report_path: str | None = None
    report_content: str | None = None
    source_count: int | None = None
    word_count: int | None = None
    duration: int | None = None
    completed_at: datetime | None = None
    tags: list[str] | None = None
    phase_times: dict[str, Any] | None = None
    llm_calls_used: int | None = None
    search_calls_used: int | None = None
    subagent_calls_used: int | None = None
    steering_instructions: list[dict[str, Any]] | None = None
    last_steering_at: datetime | None = None


class SteeringInstructionCreate(BaseModel):
    message: str


class ResearchSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    thread_id: str
    query: str
    status: str
    phase: str
    progress: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
    report: str | None = None
    source_count: int | None = None
    word_count: int | None = None
    duration: int | None = None
    model: str | None = None
    research_profile: str = "standard"
    max_llm_calls: int = 25
    llm_calls_used: int = 0
    max_search_calls: int = 10
    search_calls_used: int = 0
    max_subagent_calls: int = 4
    subagent_calls_used: int = 0
    max_research_rounds: int = 2
    recursion_limit: int = 80
    logs: list[LogEntryResponse] = []
    tags: list[str] = []
    phase_times: dict[str, Any] | None = None
    steering_instructions: list[dict[str, Any]] = []
    last_steering_at: datetime | None = None
