from __future__ import annotations

import json

from evaluation import append_evaluation_log, evaluate_research_report
from evaluation.core import extract_urls
from tools.report_quality import assess_research_report


STRONG_REPORT = """
# LangGraph Research Report

## Executive Summary

LangGraph is a framework for building stateful agent workflows, and this report
summarizes its graph runtime, state management, production patterns, and limits.
The analysis focuses on LangGraph, stateful agents, citations, and deployment
tradeoffs. The evidence base includes official documentation, technical
references, and public repositories. The limitations section calls out
uncertainty where source data is incomplete.

## Findings

LangGraph organizes applications around nodes, edges, and shared state. This
lets developers build stateful agents that loop, branch, and persist context
across complex work. The official docs describe these graph primitives at
https://docs.langchain.com/oss/python/langgraph/graph-api and the project source
is available at https://github.com/langchain-ai/langgraph. Related agent design
guidance appears at https://docs.langchain.com/oss/python/langchain/agents.

For production research systems, the main benefits are explicit control flow,
durable state, checkpointing, observability, and the ability to combine tools
with human review. External references such as https://arxiv.org/abs/2308.00352,
https://www.nist.gov/artificial-intelligence, and
https://www.acm.org/articles/people-of-acm/2024/research-agents provide broader
context for agent evaluation, reliability, and responsible deployment.

LangGraph is not the only way to build agents. Simpler tool loops can work when
the task is narrow, while graph orchestration becomes more valuable when the
workflow needs retries, branching, persistence, or parallel work. Teams should
choose the smallest architecture that gives them enough control, testability,
and observability for the target workflow.

## Limitations and Open Questions

There is uncertainty around public benchmarks because agent workloads vary by
query, tool availability, model choice, and trace depth. Some claims about
business adoption are hard to verify without private case studies, so deployment
claims should be treated cautiously. Future evaluation should compare repeated
runs, source quality, latency, token use, and failure recovery.

## Sources

- https://docs.langchain.com/oss/python/langgraph/graph-api
- https://github.com/langchain-ai/langgraph
- https://docs.langchain.com/oss/python/langchain/agents
- https://arxiv.org/abs/2308.00352
- https://www.nist.gov/artificial-intelligence
- https://www.acm.org/articles/people-of-acm/2024/research-agents
""" + "\n".join(
    [
        "This additional paragraph preserves enough depth for deterministic "
        "word-count checks while reiterating that strong research reports cite "
        "sources inline, explain limitations, and separate evidence from "
        "interpretation."
        for _ in range(14)
    ]
)


WEAK_REPORT = """
# Quick Note

LangGraph is useful. It is good for agents.
"""


def test_strong_report_scores_well_and_tracks_expected_topics() -> None:
    result = evaluate_research_report(
        STRONG_REPORT,
        query="Research LangGraph and stateful agents",
        expected_topics=["LangGraph", "stateful agents"],
        trace={
            "steps": 8,
            "tool_calls": ["internet_search", {"name": "assess_research_report"}],
            "latency_ms": 12500,
            "input_tokens": 1000,
            "output_tokens": 500,
            "retries": 1,
            "redundant_steps": 1,
        },
        model="deepseek-test",
        run_id="test-run",
    )

    data = result.to_dict()

    assert data["run_id"] == "test-run"
    assert data["model"] == "deepseek-test"
    assert data["citation_count"] == 6
    assert data["coverage_score"] == 1.0
    assert data["domain_authority_score"] > 0.8
    assert data["overall_score"] >= 80
    assert data["total_steps"] == 8
    assert data["tool_call_count"] == 2
    assert data["unique_tool_count"] == 2
    assert data["latency_seconds"] == 12.5
    assert data["total_tokens"] == 1500
    assert not data["safety_flags"]


def test_weak_report_records_expected_issues() -> None:
    result = evaluate_research_report(
        WEAK_REPORT,
        expected_topics=["stateful agents", "citations"],
    )

    assert result.word_count < 500
    assert result.citation_count == 0
    assert result.coverage_score == 0.0
    assert result.overall_score < 50
    assert "Report is likely too short for deep research." in result.issues
    assert "Report should cite at least five source URLs." in result.issues
    assert any("missing expected topics" in issue for issue in result.issues)


def test_url_extraction_deduplicates_and_strips_trailing_punctuation() -> None:
    report = "See https://example.com/a. Then https://example.com/a and https://nist.gov/test,"
    result = evaluate_research_report(report)

    assert extract_urls(report) == [
        "https://example.com/a",
        "https://example.com/a",
        "https://nist.gov/test",
    ]
    assert result.citation_count == 2


def test_report_quality_tool_preserves_legacy_keys() -> None:
    result = assess_research_report.invoke({"report_markdown": STRONG_REPORT})

    assert {"score", "word_count", "heading_count", "source_url_count", "has_sources_section", "issues"} <= set(result)
    assert result["source_url_count"] == 6
    assert result["has_sources_section"] is True
    assert "evaluation" in result


def test_append_evaluation_log_writes_jsonl(tmp_path) -> None:
    path = tmp_path / "evaluation_log.jsonl"
    first = evaluate_research_report(STRONG_REPORT, run_id="one")
    second = evaluate_research_report(WEAK_REPORT, run_id="two")

    append_evaluation_log(first, path)
    append_evaluation_log(second, path)

    lines = path.read_text(encoding="utf-8").splitlines()
    parsed = [json.loads(line) for line in lines]

    assert [item["run_id"] for item in parsed] == ["one", "two"]
    assert parsed[0]["citation_count"] == 6
    assert parsed[1]["citation_count"] == 0
