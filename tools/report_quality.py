from __future__ import annotations

from langchain.tools import tool

from evaluation import evaluate_research_report


@tool
def assess_research_report(report_markdown: str) -> dict:
    """Assess a Markdown research report for structure and citation basics."""
    result = evaluate_research_report(report_markdown)
    result_dict = result.to_dict()

    return {
        "score": result.overall_score,
        "word_count": result.word_count,
        "heading_count": result.heading_count,
        "source_url_count": result.citation_count,
        "has_sources_section": "sources" in report_markdown.lower()
        or "references" in report_markdown.lower(),
        "issues": result.issues,
        "evaluation": result_dict,
    }
