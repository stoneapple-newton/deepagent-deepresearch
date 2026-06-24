from __future__ import annotations

from collections.abc import Callable
from datetime import date
from typing import Any

from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend
from langchain.tools import tool
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_deepseek import ChatDeepSeek
from langgraph.checkpoint.memory import MemorySaver

from tools.report_quality import assess_research_report
from tools.search import internet_search

DEFAULT_RESEARCH_QUERY = (
    "Research LangGraph: what it is, how it compares to other agent frameworks, "
    "and real-world use cases. Write a report."
)

DEFAULT_THREAD_ID = "deep-research-demo"
DEFAULT_SKILL_PATHS = ["./.agents/skills/"]
REPORT_ROOT = "/reports"
WORKSPACE_ROOT = "/research"


def today_iso() -> str:
    return date.today().isoformat()


class LlmBudgetExceeded(RuntimeError):
    """Raised when a research session exhausts its model-call budget."""


class LlmBudgetCallback(BaseCallbackHandler):
    def __init__(
        self,
        *,
        max_calls: int,
        on_usage: Callable[[int, int], None] | None = None,
    ) -> None:
        self.max_calls = max_calls
        self.calls_used = 0
        self.on_usage = on_usage

    def _increment(self) -> None:
        if self.calls_used >= self.max_calls:
            raise LlmBudgetExceeded(
                f"LLM call budget exhausted before call {self.calls_used + 1}/{self.max_calls}"
            )
        self.calls_used += 1
        if self.on_usage is not None:
            self.on_usage(self.calls_used, self.max_calls)

    def on_chat_model_start(self, *args: Any, **kwargs: Any) -> Any:
        self._increment()

    def on_llm_start(self, *args: Any, **kwargs: Any) -> Any:
        self._increment()


def build_deepseek_model(
    *,
    model_name: str | None = None,
) -> BaseChatModel:
    from core.config import settings

    return ChatDeepSeek(
        model=model_name or settings.deepseek_model,
        temperature=0.2,
        api_key=settings.deepseek_api_key,
    )


def build_research_subagents(current_date: str | None = None) -> list[dict[str, Any]]:
    current_date = current_date or today_iso()

    web_researcher = {
        "name": "web_researcher",
        "description": (
            "Conduct focused web research on one sub-question and return concise, "
            "sourced facts with URLs."
        ),
        "system_prompt": f"""You are a focused web researcher.

Today is {current_date}.

Investigate exactly one assigned sub-question. Use internet_search for targeted
queries and prefer primary sources, official documentation, reputable journalism,
and credible technical writing. Use include_raw_content=True when snippets are
insufficient.

Return:
- 5-8 sourced facts or findings
- direct source URLs for each major claim
- notes on disagreement, uncertainty, or freshness

Do not write files. Keep the result compact enough for the lead researcher to
synthesize.""",
        "tools": [internet_search],
    }

    source_auditor = {
        "name": "source_auditor",
        "description": (
            "Verify claims and source quality, especially for recent or contested "
            "information."
        ),
        "system_prompt": f"""You are a source auditor.

Today is {current_date}.

Given draft claims, verify whether the cited sources support them. Search for
primary or more authoritative sources when needed. Flag:
- unsupported claims
- stale or low-quality sources
- contradictions between sources
- claims that require date qualifiers

Return a concise audit with recommended fixes and replacement URLs.""",
        "tools": [internet_search],
    }

    report_critic = {
        "name": "report_critic",
        "description": (
            "Review a draft research report for coverage, structure, citations, and "
            "remaining gaps before final delivery."
        ),
        "system_prompt": """You are a research report editor.

Review the provided draft for completeness, clarity, citation quality, and
actionability. Use assess_research_report for a deterministic structure check,
then add editorial comments. Return prioritized fixes only; do not rewrite the
whole report unless asked.""",
        "tools": [assess_research_report],
    }

    return [web_researcher, source_auditor, report_critic]


def build_research_instructions(current_date: str | None = None) -> str:
    current_date = current_date or today_iso()

    return f"""You are an expert deep research agent.

Today is {current_date}. You run a disciplined research workflow, maintain notes
in files, and produce polished Markdown reports saved to disk.

## Available tools and collaborators

- internet_search: Search the web with optional recency filters and raw content.
- task: Delegate focused work to web_researcher, source_auditor, or report_critic.
- write_todos: Plan and update multi-step research work.
- ls, read_file, write_file, edit_file, glob, grep: Manage research files.
- assess_research_report: Check report structure, citations, and obvious gaps.
- check_steering: Check for operator guidance added from the frontend.

## Required workflow

1. Plan first with write_todos. Break the request into 3-7 concrete angles.
2. Create a workspace under {WORKSPACE_ROOT}/<kebab-case-topic>/ for notes.
3. Delegate independent sub-questions to web_researcher. Give each subagent one
   specific question, expected output format, and any time constraints.
4. Run your own verification searches to fill gaps and resolve contradictions.
5. Save useful intermediate notes as Markdown files in the workspace.
6. Draft the final report with title, executive summary, sections, inline source
   URLs, and a Sources section.
7. Use source_auditor on claims that are recent, controversial, or central to the
   conclusion.
8. Use report_critic and assess_research_report before finalizing. Fix material
   issues they identify.
9. Save the final report under {REPORT_ROOT}/<kebab-case-topic>.md.
10. Return the saved report path and 3-5 key takeaways to the user.

## Budget and steering

- Treat the session LLM-call budget as a hard limit.
- If the budget is low, reduce subquestions, avoid optional critic passes, and
  write the best available report before the limit is reached.
- Call check_steering after planning, after delegated research, and before final
  writing. Incorporate new operator guidance unless it conflicts with the
  original request or research standards.

## Research standards

- Prefer primary sources, official documentation, academic papers, government
  sources, and reputable news outlets.
- Include dates for time-sensitive claims.
- Separate facts, interpretation, and uncertainty.
- Cite URLs inline near the claims they support.
- Do not pad reports. Make them complete, structured, and useful.
- If search access or required credentials are unavailable, explain the blocker
  and produce the best offline outline from available context.

Use the deep-research skill when the task involves research methodology."""


def build_deep_research_agent(
    *,
    model: BaseChatModel | None = None,
    model_name: str | None = None,
    callbacks: list[BaseCallbackHandler] | None = None,
    root_dir: str = ".",
    skill_paths: list[str] | None = None,
    current_date: str | None = None,
    steering_reader: Callable[[], str] | None = None,
):
    current_date = current_date or today_iso()
    model = model or build_deepseek_model(model_name=model_name)

    @tool
    def check_steering() -> str:
        """Return new operator steering instructions for the active research session."""
        if steering_reader is None:
            return "No new steering instructions."
        return steering_reader() or "No new steering instructions."

    return create_deep_agent(
        name="deep-research-agent",
        model=model,
        tools=[internet_search, assess_research_report, check_steering],
        subagents=build_research_subagents(current_date),
        system_prompt=build_research_instructions(current_date),
        backend=FilesystemBackend(root_dir=root_dir, virtual_mode=True),
        skills=skill_paths or DEFAULT_SKILL_PATHS,
        checkpointer=MemorySaver(),
    )


def run_research(
    query: str = DEFAULT_RESEARCH_QUERY,
    *,
    thread_id: str = DEFAULT_THREAD_ID,
    agent=None,
    model_name: str | None = None,
    max_llm_calls: int | None = None,
    on_budget_usage: Callable[[int, int], None] | None = None,
    steering_reader: Callable[[], str] | None = None,
) -> str:
    callbacks: list[BaseCallbackHandler] | None = None
    if max_llm_calls is not None:
        callbacks = [
            LlmBudgetCallback(max_calls=max(1, max_llm_calls), on_usage=on_budget_usage)
        ]
    agent = agent or build_deep_research_agent(
        model_name=model_name,
        callbacks=callbacks,
        steering_reader=steering_reader,
    )
    config = {"configurable": {"thread_id": thread_id}}
    if callbacks:
        config["callbacks"] = callbacks
    result = agent.invoke(
        {"messages": [{"role": "user", "content": query}]},
        config=config,
    )
    return result["messages"][-1].content
