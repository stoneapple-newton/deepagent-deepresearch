# deepagent_demo

A sandbox for running Deep Agents demos with the DeepSeek model.

## Project overview

- Framework: Deep Agents (built on LangChain / LangGraph)
- Model provider: DeepSeek via `langchain-deepseek`
- Web search: Tavily (API key reserved; not used in the hello-world demo)
- Observability: LangSmith

## Environment variables

Copy `.env.example` to `.env` and fill in the keys:

- `TAVILY_API_KEY` — Tavily search key
- `DEEPSEEK_API_KEY` — DeepSeek API key
- `DEEPSEEK_MODEL` — DeepSeek model name (optional, defaults to `deepseek-chat`)
- `LANGSMITH_API_KEY` — LangSmith key
- `LANGSMITH_PROJECT` — LangSmith project (optional, defaults to `deepagent_demo`)

`core/config.py` loads the `.env` file with Pydantic and forwards the relevant values into `os.environ` so LangSmith and DeepSeek pick them up automatically.

## Run the demo

```bash
uv run python main.py
```

## Key files

- `core/config.py` — Pydantic settings from `.env`
- `main.py` — runnable Deep Agents hello-world demo
- `docs/llm_wiki.md` — Karpathy-style LLM notes

## Conventions

- Read configuration only through `core.config.settings`.
- Pass an explicit model instance to `create_deep_agent` when using DeepSeek.
- Always provide a `thread_id` when invoking the agent to keep conversation context.
