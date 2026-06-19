from typing import Literal

from langchain.tools import tool
from tavily import TavilyClient

_tavily_client: TavilyClient | None = None


def _get_tavily_client() -> TavilyClient:
    global _tavily_client

    if _tavily_client is None:
        from core.config import settings

        _tavily_client = TavilyClient(api_key=settings.tavily_api_key)
    return _tavily_client


@tool
def internet_search(
    query: str,
    max_results: int = 5,
    search_depth: Literal["basic", "advanced", "fast", "ultra-fast"] = "basic",
    topic: Literal["general", "news", "finance"] = "general",
    time_range: Literal["day", "week", "month", "year"] | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    days: int | None = None,
    include_answer: bool = False,
    include_raw_content: bool = False,
    include_domains: list[str] | None = None,
    exclude_domains: list[str] | None = None,
) -> dict:
    """Run a web search and return results from Tavily.

    Args:
        query: The search query.
        max_results: Maximum number of results to return, from 1 to 10.
        search_depth: Search depth: "basic", "advanced", "fast", or "ultra-fast".
        topic: Search topic category: "general", "news", or "finance".
        time_range: Optional recency filter: day, week, month, or year.
        start_date: Optional start date filter in YYYY-MM-DD format.
        end_date: Optional end date filter in YYYY-MM-DD format.
        days: Optional day lookback, most useful with topic="news".
        include_answer: Whether to include Tavily's generated answer.
        include_raw_content: Whether to include the raw page content for each result.
        include_domains: Optional list of domains to include.
        exclude_domains: Optional list of domains to exclude.
    """
    if max_results < 1 or max_results > 10:
        raise ValueError("max_results must be between 1 and 10")

    return _get_tavily_client().search(
        query=query,
        max_results=max_results,
        search_depth=search_depth,
        time_range=time_range,
        start_date=start_date,
        end_date=end_date,
        days=days,
        include_answer=include_answer,
        include_raw_content=include_raw_content,
        include_domains=include_domains,
        exclude_domains=exclude_domains,
        topic=topic,
    )
