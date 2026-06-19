from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4

URL_PATTERN = re.compile(r"https?://[^\s)\]>\"']+")
HEADING_PATTERN = re.compile(r"^#{1,6}\s+\S+", re.MULTILINE)
WORD_PATTERN = re.compile(r"\b[\w'-]+\b")

DEFAULT_LOG_PATH = Path("evaluation_runs/evaluation_log.jsonl")

HIGH_AUTHORITY_DOMAINS = {
    "arxiv.org": 1.0,
    "nature.com": 1.0,
    "science.org": 1.0,
    "nejm.org": 0.95,
    "ieee.org": 0.9,
    "acm.org": 0.9,
    "docs.langchain.com": 0.9,
    "langchain.com": 0.85,
    "openai.com": 0.9,
    "anthropic.com": 0.9,
    "reuters.com": 0.85,
    "bloomberg.com": 0.85,
    "github.com": 0.8,
    "medium.com": 0.6,
    "substack.com": 0.5,
}

SAFETY_TERMS = {
    "private key": "possible secret exposure",
    "api key": "possible secret exposure",
    "password": "possible credential exposure",
    "social security": "possible personal data exposure",
    "credit card": "possible financial data exposure",
    "malware": "potentially harmful content",
    "exploit": "potentially harmful content",
}


@dataclass(frozen=True)
class EvaluationResult:
    run_id: str
    timestamp: str
    query: str | None
    model: str
    human_rating: float | None
    word_count: int
    heading_count: int
    citation_count: int
    citation_density: float
    domain_authority_score: float
    coverage_score: float | None
    total_steps: int | None
    tool_call_count: int | None
    unique_tool_count: int | None
    retry_count: int | None
    latency_seconds: float | None
    total_tokens: int | None
    component_scores: dict[str, float | None]
    overall_score: float
    issues: list[str]
    safety_flags: list[str]
    expected_topics: list[str]
    covered_topics: list[str]
    missing_topics: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "timestamp": self.timestamp,
            "query": self.query,
            "model": self.model,
            "human_rating": self.human_rating,
            "word_count": self.word_count,
            "heading_count": self.heading_count,
            "citation_count": self.citation_count,
            "citation_density": self.citation_density,
            "domain_authority_score": self.domain_authority_score,
            "coverage_score": self.coverage_score,
            "total_steps": self.total_steps,
            "tool_call_count": self.tool_call_count,
            "unique_tool_count": self.unique_tool_count,
            "retry_count": self.retry_count,
            "latency_seconds": self.latency_seconds,
            "total_tokens": self.total_tokens,
            "component_scores": self.component_scores,
            "overall_score": self.overall_score,
            "issues": self.issues,
            "safety_flags": self.safety_flags,
            "expected_topics": self.expected_topics,
            "covered_topics": self.covered_topics,
            "missing_topics": self.missing_topics,
        }


def evaluate_research_report(
    report_markdown: str,
    *,
    query: str | None = None,
    expected_topics: list[str] | None = None,
    trace: dict[str, Any] | None = None,
    model: str = "unknown",
    run_id: str | None = None,
    human_rating: float | None = None,
) -> EvaluationResult:
    urls = extract_urls(report_markdown)
    unique_urls = sorted(set(urls))
    words = WORD_PATTERN.findall(report_markdown)
    headings = HEADING_PATTERN.findall(report_markdown)
    lower_report = report_markdown.lower()
    expected_topics = expected_topics or []

    coverage = evaluate_topic_coverage(report_markdown, expected_topics)
    trace_metrics = evaluate_trace(trace)
    safety_flags = detect_safety_flags(report_markdown)

    word_count = len(words)
    heading_count = len(headings)
    citation_count = len(unique_urls)
    citation_density = round(citation_count / max(word_count, 1) * 1000, 2)
    domain_authority_score = average_domain_authority(unique_urls)
    has_summary = "executive summary" in lower_report or "summary" in lower_report
    has_sources_section = "sources" in lower_report or "references" in lower_report
    has_uncertainty = any(
        marker in lower_report
        for marker in ("uncertain", "uncertainty", "limitation", "limitations", "open questions")
    )

    issues = collect_issues(
        word_count=word_count,
        heading_count=heading_count,
        citation_count=citation_count,
        domain_authority_score=domain_authority_score,
        has_summary=has_summary,
        has_sources_section=has_sources_section,
        has_uncertainty=has_uncertainty,
        missing_topics=coverage["missing_topics"],
        safety_flags=safety_flags,
    )

    component_scores = calculate_component_scores(
        word_count=word_count,
        heading_count=heading_count,
        citation_count=citation_count,
        citation_density=citation_density,
        domain_authority_score=domain_authority_score,
        has_summary=has_summary,
        has_sources_section=has_sources_section,
        coverage_score=coverage["coverage_score"],
        trace_metrics=trace_metrics,
        safety_flags=safety_flags,
    )
    overall_score = calculate_overall_score(component_scores)

    return EvaluationResult(
        run_id=run_id or str(uuid4()),
        timestamp=datetime.now(UTC).isoformat(),
        query=query,
        model=model,
        human_rating=human_rating,
        word_count=word_count,
        heading_count=heading_count,
        citation_count=citation_count,
        citation_density=citation_density,
        domain_authority_score=domain_authority_score,
        coverage_score=coverage["coverage_score"],
        total_steps=trace_metrics["total_steps"],
        tool_call_count=trace_metrics["tool_call_count"],
        unique_tool_count=trace_metrics["unique_tool_count"],
        retry_count=trace_metrics["retry_count"],
        latency_seconds=trace_metrics["latency_seconds"],
        total_tokens=trace_metrics["total_tokens"],
        component_scores=component_scores,
        overall_score=overall_score,
        issues=issues,
        safety_flags=safety_flags,
        expected_topics=expected_topics,
        covered_topics=coverage["covered_topics"],
        missing_topics=coverage["missing_topics"],
    )


def append_evaluation_log(
    result: EvaluationResult,
    log_path: str | Path = DEFAULT_LOG_PATH,
) -> Path:
    path = Path(log_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(result.to_dict(), sort_keys=True) + "\n")
    return path


def extract_urls(markdown: str) -> list[str]:
    return [url.rstrip(".,;:!?") for url in URL_PATTERN.findall(markdown)]


def average_domain_authority(urls: list[str]) -> float:
    if not urls:
        return 0.0
    scores = [domain_authority_score(url) for url in urls]
    return round(sum(scores) / len(scores), 3)


def domain_authority_score(url: str) -> float:
    domain = urlparse(url).netloc.lower().split("@")[-1].split(":")[0]
    if domain.startswith("www."):
        domain = domain[4:]

    if domain in HIGH_AUTHORITY_DOMAINS:
        return HIGH_AUTHORITY_DOMAINS[domain]
    if domain.endswith(".gov") or domain.endswith(".edu"):
        return 0.95
    for known_domain, score in HIGH_AUTHORITY_DOMAINS.items():
        if domain.endswith(f".{known_domain}"):
            return score
    if domain.endswith(".org"):
        return 0.7
    return 0.5


def evaluate_topic_coverage(report_markdown: str, expected_topics: list[str]) -> dict[str, Any]:
    if not expected_topics:
        return {
            "coverage_score": None,
            "covered_topics": [],
            "missing_topics": [],
        }

    report_words = [word.lower() for word in WORD_PATTERN.findall(report_markdown)]
    report_word_set = set(report_words)
    normalized_report = " ".join(report_words)
    covered_topics: list[str] = []
    missing_topics: list[str] = []

    for topic in expected_topics:
        topic_words = [word.lower() for word in WORD_PATTERN.findall(topic)]
        normalized_topic = " ".join(topic_words)
        covered = bool(normalized_topic and normalized_topic in normalized_report)
        if not covered and topic_words:
            covered = all(word in report_word_set for word in topic_words)

        if covered:
            covered_topics.append(topic)
        else:
            missing_topics.append(topic)

    coverage_score = len(covered_topics) / len(expected_topics)
    return {
        "coverage_score": round(coverage_score, 3),
        "covered_topics": covered_topics,
        "missing_topics": missing_topics,
    }


def evaluate_trace(trace: dict[str, Any] | None) -> dict[str, Any]:
    if trace is None:
        return {
            "total_steps": None,
            "tool_call_count": None,
            "unique_tool_count": None,
            "retry_count": None,
            "latency_seconds": None,
            "total_tokens": None,
            "step_efficiency": None,
        }

    tool_calls = trace.get("tool_calls", trace.get("tools_called", [])) or []
    tool_names = [extract_tool_name(tool_call) for tool_call in tool_calls]
    tool_names = [tool_name for tool_name in tool_names if tool_name]

    total_steps = coerce_int(trace.get("steps"))
    retry_count = coerce_int(trace.get("retries"), default=0)
    redundant_steps = coerce_int(trace.get("redundant_steps"), default=0)
    latency_seconds = coerce_latency_seconds(trace)
    total_tokens = coerce_int(trace.get("total_tokens"))
    if total_tokens is None:
        input_tokens = coerce_int(trace.get("input_tokens"), default=0)
        output_tokens = coerce_int(trace.get("output_tokens"), default=0)
        total_tokens = input_tokens + output_tokens

    if total_steps is None:
        total_steps = len(tool_calls) if tool_calls else None

    step_efficiency = None
    if total_steps and total_steps > 0:
        step_efficiency = max(0.0, 1.0 - (redundant_steps / total_steps) - (retry_count * 0.05))

    return {
        "total_steps": total_steps,
        "tool_call_count": len(tool_calls),
        "unique_tool_count": len(set(tool_names)),
        "retry_count": retry_count,
        "latency_seconds": latency_seconds,
        "total_tokens": total_tokens,
        "step_efficiency": round(step_efficiency, 3) if step_efficiency is not None else None,
    }


def extract_tool_name(tool_call: Any) -> str | None:
    if isinstance(tool_call, str):
        return tool_call
    if not isinstance(tool_call, dict):
        return None
    for key in ("name", "tool", "tool_name"):
        value = tool_call.get(key)
        if isinstance(value, str):
            return value
    nested = tool_call.get("function")
    if isinstance(nested, dict) and isinstance(nested.get("name"), str):
        return nested["name"]
    return None


def coerce_int(value: Any, default: int | None = None) -> int | None:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def coerce_latency_seconds(trace: dict[str, Any]) -> float | None:
    if trace.get("latency_seconds") is not None:
        try:
            return round(float(trace["latency_seconds"]), 3)
        except (TypeError, ValueError):
            return None
    if trace.get("latency_ms") is not None:
        try:
            return round(float(trace["latency_ms"]) / 1000, 3)
        except (TypeError, ValueError):
            return None
    return None


def detect_safety_flags(report_markdown: str) -> list[str]:
    lower_report = report_markdown.lower()
    flags = sorted({flag for term, flag in SAFETY_TERMS.items() if term in lower_report})
    return flags


def collect_issues(
    *,
    word_count: int,
    heading_count: int,
    citation_count: int,
    domain_authority_score: float,
    has_summary: bool,
    has_sources_section: bool,
    has_uncertainty: bool,
    missing_topics: list[str],
    safety_flags: list[str],
) -> list[str]:
    issues: list[str] = []
    if word_count < 500:
        issues.append("Report is likely too short for deep research.")
    if heading_count < 3:
        issues.append("Report should use more Markdown sections.")
    if citation_count < 5:
        issues.append("Report should cite at least five source URLs.")
    if citation_count and domain_authority_score < 0.55:
        issues.append("Cited sources appear to have low average authority.")
    if not has_summary:
        issues.append("Report should include an executive summary or summary.")
    if not has_sources_section:
        issues.append("Report should include a Sources or References section.")
    if not has_uncertainty:
        issues.append("Consider noting uncertainty, limitations, or open questions.")
    if missing_topics:
        issues.append("Report is missing expected topics: " + ", ".join(missing_topics))
    for flag in safety_flags:
        issues.append(f"Safety flag: {flag}.")
    return issues


def calculate_component_scores(
    *,
    word_count: int,
    heading_count: int,
    citation_count: int,
    citation_density: float,
    domain_authority_score: float,
    has_summary: bool,
    has_sources_section: bool,
    coverage_score: float | None,
    trace_metrics: dict[str, Any],
    safety_flags: list[str],
) -> dict[str, float | None]:
    structure = (
        min(word_count / 500, 1.0) * 0.30
        + min(heading_count / 3, 1.0) * 0.25
        + (0.25 if has_summary else 0.0)
        + (0.20 if has_sources_section else 0.0)
    )
    citations = (
        min(citation_count / 8, 1.0) * 0.45
        + min(citation_density / 5, 1.0) * 0.25
        + domain_authority_score * 0.30
    )
    safety = max(0.0, 1.0 - (len(safety_flags) * 0.25))

    step_efficiency = trace_metrics.get("step_efficiency")
    efficiency = None
    if step_efficiency is not None:
        efficiency = max(0.0, min(float(step_efficiency), 1.0)) * 100

    return {
        "structure": round(structure * 100, 2),
        "citation_quality": round(citations * 100, 2),
        "coverage": round(coverage_score * 100, 2) if coverage_score is not None else None,
        "efficiency": round(efficiency, 2) if efficiency is not None else None,
        "safety": round(safety * 100, 2),
    }


def calculate_overall_score(component_scores: dict[str, float | None]) -> float:
    weights = {
        "structure": 0.35,
        "citation_quality": 0.30,
        "coverage": 0.20,
        "efficiency": 0.05,
        "safety": 0.10,
    }
    total = 0.0
    total_weight = 0.0
    for name, weight in weights.items():
        score = component_scores.get(name)
        if score is None:
            continue
        total += score * weight
        total_weight += weight
    if total_weight == 0:
        return 0.0
    return round(total / total_weight, 2)
