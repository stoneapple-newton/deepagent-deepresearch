from __future__ import annotations

import logging

import pytest
import requests

from tools import search


class FakeTavilyClient:
    def __init__(self, outcomes: list[dict | Exception]) -> None:
        self.outcomes = outcomes
        self.calls: list[dict] = []

    def search(self, **kwargs):
        self.calls.append(kwargs)
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


@pytest.fixture(autouse=True)
def reset_search_client(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(search, "_tavily_client", None)
    monkeypatch.setattr(search.time, "sleep", lambda _delay: None)
    monkeypatch.setattr(search.random, "uniform", lambda _start, _end: 0)


def test_internet_search_succeeds_on_first_attempt(monkeypatch: pytest.MonkeyPatch) -> None:
    response = {
        "query": "langgraph",
        "results": [{"title": "LangGraph", "url": "https://example.com"}],
    }
    fake_client = FakeTavilyClient([response])
    monkeypatch.setattr(search, "_tavily_client", fake_client)

    result = search.internet_search.invoke({"query": "langgraph", "max_results": 2})

    assert result == response
    assert len(fake_client.calls) == 1
    assert fake_client.calls[0]["query"] == "langgraph"
    assert fake_client.calls[0]["max_results"] == 2


def test_internet_search_succeeds_after_transient_connection_error(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    response = {"query": "deep agents", "results": [{"title": "Deep Agents"}]}
    fake_client = FakeTavilyClient(
        [requests.exceptions.ConnectionError("connection reset"), response]
    )
    monkeypatch.setattr(search, "_tavily_client", fake_client)

    with caplog.at_level(logging.WARNING, logger="tools.search"):
        result = search.internet_search.invoke({"query": "deep agents"})

    assert result == response
    assert len(fake_client.calls) == 2
    assert "attempt 1/3" in caplog.text
    assert "ConnectionError" in caplog.text
    assert "connection reset" in caplog.text


def test_internet_search_returns_structured_error_after_retry_exhaustion(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    fake_client = FakeTavilyClient(
        [
            requests.exceptions.ConnectionError("connection reset"),
            requests.exceptions.ConnectionError("connection reset"),
            requests.exceptions.ConnectionError("connection reset"),
        ]
    )
    monkeypatch.setattr(search, "_tavily_client", fake_client)

    with caplog.at_level(logging.WARNING, logger="tools.search"):
        result = search.internet_search.invoke({"query": "unstable query"})

    assert len(fake_client.calls) == 3
    assert result["query"] == "unstable query"
    assert result["results"] == []
    assert result["error"] == {
        "type": "ConnectionError",
        "message": "connection reset",
        "attempts": 3,
        "recoverable": True,
    }
    assert "failed after 3 attempts" in caplog.text


def test_internet_search_does_not_retry_invalid_max_results(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_client = FakeTavilyClient([{"query": "invalid", "results": []}])
    monkeypatch.setattr(search, "_tavily_client", fake_client)

    with pytest.raises(ValueError, match="max_results must be between 1 and 10"):
        search.internet_search.invoke({"query": "invalid", "max_results": 0})

    assert fake_client.calls == []
