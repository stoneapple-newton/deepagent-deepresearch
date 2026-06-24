import logging
import random
import time
from typing import Any, Literal

from langchain.tools import tool
import requests
from tavily import TavilyClient
from urllib3 import exceptions as urllib3_exceptions

logger = logging.getLogger(__name__)

_tavily_client: TavilyClient | None = None
_SEARCH_MAX_ATTEMPTS = 3
_SEARCH_BACKOFF_SECONDS = 0.25
_SEARCH_JITTER_SECONDS = 0.1


def _get_tavily_client() -> TavilyClient:
    global _tavily_client

    if _tavily_client is None:
        from core.config import settings

        _tavily_client = TavilyClient(api_key=settings.tavily_api_key)
    return _tavily_client


def _http_status_code(exc: Exception) -> int | None:
    response = getattr(exc, "response", None)
    status_code = getattr(response, "status_code", None)
    if status_code is None:
        status_code = getattr(exc, "status_code", None)
    try:
        return int(status_code) if status_code is not None else None
    except (TypeError, ValueError):
        return None


def _is_transient_search_error(exc: Exception) -> bool:
    if isinstance(
        exc,
        (
            requests.exceptions.ConnectionError,
            requests.exceptions.Timeout,
            urllib3_exceptions.ProtocolError,
            urllib3_exceptions.ReadTimeoutError,
        ),
    ):
        return True

    status_code = _http_status_code(exc)
    return status_code == 429 or (status_code is not None and 500 <= status_code <= 599)


def _recoverable_search_error(
    *,
    query: str,
    attempts: int,
    exc: Exception,
) -> dict[str, Any]:
    error: dict[str, Any] = {
        "type": type(exc).__name__,
        "message": str(exc),
        "attempts": attempts,
        "recoverable": True,
    }
    status_code = _http_status_code(exc)
    if status_code is not None:
        error["status_code"] = status_code
    return {"query": query, "results": [], "error": error}


def _search_with_retries(client: TavilyClient, **search_kwargs: Any) -> dict[str, Any]:
    query = str(search_kwargs.get("query", ""))
    for attempt in range(1, _SEARCH_MAX_ATTEMPTS + 1):
        try:
            return client.search(**search_kwargs)
        except Exception as exc:
            if not _is_transient_search_error(exc):
                raise

            if attempt >= _SEARCH_MAX_ATTEMPTS:
                logger.error(
                    "Tavily search failed after %s attempts for query %r: %s: %s",
                    attempt,
                    query,
                    type(exc).__name__,
                    exc,
                )
                return _recoverable_search_error(query=query, attempts=attempt, exc=exc)

            logger.warning(
                "Tavily search failed on attempt %s/%s for query %r; retrying: %s: %s",
                attempt,
                _SEARCH_MAX_ATTEMPTS,
                query,
                type(exc).__name__,
                exc,
            )
            delay = (_SEARCH_BACKOFF_SECONDS * (2 ** (attempt - 1))) + random.uniform(
                0,
                _SEARCH_JITTER_SECONDS,
            )
            time.sleep(delay)


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

    return _search_with_retries(
        _get_tavily_client(),
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
