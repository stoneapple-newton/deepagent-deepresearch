from __future__ import annotations

from typing import Any

from sqlmodel import Session, select

from api.models import AgentConfig
from tools.report_quality import assess_research_report
from tools.search import internet_search

TOOL_MAP: dict[str, Any] = {
    "internet_search": internet_search,
    "assess_research_report": assess_research_report,
}


def get_active_subagents(db_session: Session) -> list[dict[str, Any]]:
    """Return enabled AgentConfig rows as subagent dicts for create_deep_agent."""
    statement = select(AgentConfig).where(AgentConfig.enabled.is_(True))
    configs = db_session.exec(statement).all()

    subagents = []
    for config in configs:
        tools = [TOOL_MAP[name] for name in config.tools if name in TOOL_MAP]
        subagents.append(
            {
                "name": config.id,
                "description": config.description,
                "system_prompt": config.system_prompt,
                "tools": tools,
            }
        )
    return subagents
