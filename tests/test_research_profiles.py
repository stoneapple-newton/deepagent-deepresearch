from __future__ import annotations

from pathlib import Path

import pytest

from agents.deep_research import (
    ResearchBudgetCallback,
    ResearchBudgetExceeded,
    build_research_instructions,
    run_research,
)
from core.research_profiles import (
    ResearchProfileError,
    load_research_profiles,
)


def test_default_profile_catalog_loads_from_yaml() -> None:
    catalog = load_research_profiles()

    assert catalog.default_profile == "standard"
    assert [profile.id for profile in catalog.profiles] == ["quick", "standard", "deep"]
    assert catalog.get("quick").max_research_rounds == 1
    assert catalog.get("deep").max_search_calls == 18


def test_profile_catalog_is_re_read_after_file_change(tmp_path: Path) -> None:
    profile_path = tmp_path / "profiles.yaml"
    profile_path.write_text(
        """version: 1
default_profile: custom
profiles:
  - id: custom
    label: Custom
    description: Editable test profile.
    max_llm_calls: 7
    max_search_calls: 3
    max_subagent_calls: 2
    max_research_rounds: 1
    recursion_limit: 20
""",
        encoding="utf-8",
    )
    assert load_research_profiles(profile_path).get().max_llm_calls == 7

    profile_path.write_text(
        profile_path.read_text(encoding="utf-8").replace("max_llm_calls: 7", "max_llm_calls: 9"),
        encoding="utf-8",
    )
    assert load_research_profiles(profile_path).get().max_llm_calls == 9


def test_invalid_default_profile_is_rejected(tmp_path: Path) -> None:
    profile_path = tmp_path / "profiles.yaml"
    profile_path.write_text(
        """version: 1
default_profile: missing
profiles:
  - id: quick
    label: Quick
    description: Quick profile.
    max_llm_calls: 5
    max_search_calls: 2
    max_subagent_calls: 1
    max_research_rounds: 1
    recursion_limit: 10
""",
        encoding="utf-8",
    )

    with pytest.raises(ResearchProfileError, match="default_profile"):
        load_research_profiles(profile_path)


def test_budget_callback_enforces_nested_tool_budgets() -> None:
    profile = load_research_profiles().get("quick")
    events: list[tuple[str, int, int]] = []
    callback = ResearchBudgetCallback(profile=profile, on_usage=lambda *event: events.append(event))

    for _ in range(profile.max_search_calls):
        callback.on_tool_start({"name": "internet_search"}, "query")

    assert events[-1] == ("search", profile.max_search_calls, profile.max_search_calls)
    with pytest.raises(ResearchBudgetExceeded, match="Search call budget"):
        callback.on_tool_start({"name": "internet_search"}, "one more")

    for _ in range(profile.max_subagent_calls):
        callback.on_tool_start({"name": "task"}, "delegate")
    with pytest.raises(ResearchBudgetExceeded, match="Subagent call budget"):
        callback.on_tool_start({"name": "task"}, "one more")


def test_research_prompt_contains_resolved_profile_contract() -> None:
    profile = load_research_profiles().get("quick")
    prompt = build_research_instructions("2026-07-15", profile)

    assert "Active profile: Quick (`quick`)" in prompt
    assert "Perform no more than 1 research rounds" in prompt
    assert "4 web\n  searches" in prompt


def test_run_research_applies_profile_recursion_limit_and_thread_id() -> None:
    class FakeAgent:
        def __init__(self) -> None:
            self.config = None

        def invoke(self, inputs, config):
            self.config = config
            return {"messages": [type("Message", (), {"content": "done"})()]}

    agent = FakeAgent()
    result = run_research(
        "test",
        thread_id="profile-thread",
        agent=agent,
        profile=load_research_profiles().get("quick"),
    )

    assert result == "done"
    assert agent.config["recursion_limit"] == 40
    assert agent.config["configurable"]["thread_id"] == "profile-thread"
