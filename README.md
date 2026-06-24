# deepagent_demo

A sandbox for running Deep Agents demos with the DeepSeek model. The main demo is
a deep research agent that plans a research task, delegates focused searches to
subagents, audits sources, checks report quality, and writes a Markdown report to
`/reports`.

## Setup

Copy `.env.example` to `.env` and fill in:

- `TAVILY_API_KEY`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL` (optional, defaults to `deepseek-chat`)
- `LANGSMITH_API_KEY`
- `LANGSMITH_PROJECT` (optional)

Install dependencies:

```bash
uv sync
```

## Start the backend

Run the FastAPI server from the repo root:

```bash
uv run uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

The frontend expects the backend to be available at `http://127.0.0.1:8000`.

## Start the frontend

Run the Vite app from the `frontend/` directory:

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:3000` and proxies `/api` requests to the backend.

## Run

Run the default LangGraph research demo:

```bash
uv run python main.py
```

Run a custom research task:

```bash
uv run python main.py "Research the current state of open-source browser agents and write a report."
```

Use a stable thread id to continue the same research context:

```bash
uv run python main.py --thread-id browser-agent-research "Continue the previous report with risks and limitations."
```

## Evaluate a report

The evaluation v1 is offline and deterministic. It does not call Tavily,
DeepSeek, LangSmith, or an LLM judge.

```bash
uv run python evaluate_report.py reports/langgraph-overview.md --query "Research LangGraph" --expected-topic LangGraph --no-log
```

By default, evaluations append JSONL records to
`evaluation_runs/evaluation_log.jsonl`. Use `--no-log` for one-off checks.

## Key files

- `agents/deep_research.py`: Deep Agents factory, prompts, and subagents.
- `evaluation/`: Deterministic report evaluator and JSONL logging helpers.
- `evaluate_report.py`: CLI for evaluating saved Markdown reports.
- `tools/search.py`: Tavily search tool with recency and domain filters.
- `tools/report_quality.py`: Deterministic Markdown report quality checker.
- `.agents/skills/deep-research/SKILL.md`: On-demand research methodology.
- `core/config.py`: Pydantic settings loaded from `.env`.
