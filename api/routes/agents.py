from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from api import schemas
from api.deps import get_session
from api.models import AgentConfig

router = APIRouter(prefix="/api")


DEFAULT_AGENTS = [
    {
        "id": "planner",
        "name": "Planner",
        "description": "Decomposes research queries into structured sub-questions and creates investigation plans.",
        "icon": "LayoutTemplate",
        "enabled": True,
        "system_prompt": "You are a research planning agent. Your job is to analyze a research query and break it down into 3-7 focused sub-questions that, when answered together, will provide a comprehensive answer to the original query. Output a structured plan with clear priorities.",
        "temperature": 0.3,
        "max_tokens": 2048,
        "avg_execution_time": 45,
        "success_rate": 98,
        "total_invocations": 156,
        "tools": [],
    },
    {
        "id": "web_researcher",
        "name": "Web Researcher",
        "description": "Conducts focused web searches, extracts facts from sources, and compiles findings with citations.",
        "icon": "Globe",
        "enabled": True,
        "system_prompt": "You are a focused web researcher. Investigate exactly one assigned sub-question. Use internet_search for targeted queries and prefer primary sources, official documentation, reputable journalism, and credible technical writing. Return 5-8 sourced facts with direct source URLs for each major claim.",
        "temperature": 0.2,
        "max_tokens": 4096,
        "avg_execution_time": 120,
        "success_rate": 95,
        "total_invocations": 423,
        "tools": ["internet_search"],
    },
    {
        "id": "source_auditor",
        "name": "Source Auditor",
        "description": "Reviews and validates the credibility, freshness, and relevance of all gathered sources.",
        "icon": "ShieldCheck",
        "enabled": True,
        "system_prompt": "You are a source credibility auditor. Review all gathered sources for: (1) credibility of the publisher/author, (2) recency and freshness, (3) potential bias, (4) factual accuracy where verifiable. Flag any sources that should be excluded or downweighted.",
        "temperature": 0.1,
        "max_tokens": 2048,
        "avg_execution_time": 60,
        "success_rate": 99,
        "total_invocations": 312,
        "tools": [],
    },
    {
        "id": "report_writer",
        "name": "Report Writer",
        "description": "Synthesizes all audited findings into a well-structured, comprehensive Markdown report.",
        "icon": "FileText",
        "enabled": True,
        "system_prompt": "You are an expert technical report writer. Synthesize all audited research findings into a comprehensive, well-structured Markdown report. Use clear headings, tables for comparisons, and maintain an objective, analytical tone. Include an executive summary and conclusion.",
        "temperature": 0.3,
        "max_tokens": 8192,
        "avg_execution_time": 180,
        "success_rate": 97,
        "total_invocations": 156,
        "tools": [],
    },
    {
        "id": "quality_checker",
        "name": "Quality Checker",
        "description": "Evaluates the final report for completeness, accuracy, and alignment with the original query.",
        "icon": "CheckCircle",
        "enabled": True,
        "system_prompt": "You are a quality assurance agent. Evaluate the research report against the original query for: (1) completeness - does it answer all aspects?, (2) accuracy - are facts supported by sources?, (3) structure - is it well-organized and readable?, (4) objectivity - is the tone balanced?",
        "temperature": 0.1,
        "max_tokens": 2048,
        "avg_execution_time": 90,
        "success_rate": 96,
        "total_invocations": 156,
        "tools": ["assess_research_report"],
    },
]


@router.get("/agents")
def list_agents(db: Session = Depends(get_session)) -> list[schemas.AgentConfigResponse]:
    statement = select(AgentConfig)
    agents = db.exec(statement).all()
    return [schemas.AgentConfigResponse.model_validate(a) for a in agents]


@router.get("/agents/{agent_id}")
def get_agent(agent_id: str, db: Session = Depends(get_session)) -> schemas.AgentConfigResponse:
    agent = db.get(AgentConfig, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return schemas.AgentConfigResponse.model_validate(agent)


@router.put("/agents/{agent_id}")
def update_agent(
    agent_id: str, payload: schemas.AgentConfigUpdate, db: Session = Depends(get_session)
) -> schemas.AgentConfigResponse:
    agent = db.get(AgentConfig, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(agent, key, value)

    db.add(agent)
    db.commit()
    db.refresh(agent)
    return schemas.AgentConfigResponse.model_validate(agent)


@router.post("/agents/seed")
def seed_agents(db: Session = Depends(get_session)) -> list[schemas.AgentConfigResponse]:
    created = []
    for data in DEFAULT_AGENTS:
        existing = db.get(AgentConfig, data["id"])
        if existing:
            continue
        agent = AgentConfig(**data)
        db.add(agent)
        created.append(agent)

    db.commit()
    for agent in created:
        db.refresh(agent)

    statement = select(AgentConfig)
    agents = db.exec(statement).all()
    return [schemas.AgentConfigResponse.model_validate(a) for a in agents]
