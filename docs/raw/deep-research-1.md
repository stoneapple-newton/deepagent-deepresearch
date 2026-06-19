I'd be happy to help you build a deep research agent with LangChain DeepAgent! Let me first research the latest information to ensure my guidance is accurate and up-to-date.
# 🚀 LangChain DeepAgent: Complete Guide to Building a Deep Research Agent

Based on the latest LangChain documentation and ecosystem resources, here's your comprehensive step-by-step guide.

---

## 📋 Table of Contents
1. [Understanding DeepAgent](#1-understanding-deepagent)
2. [Installation & Setup](#2-installation--setup)
3. [Building the Deep Research Agent](#3-building-the-deep-research-agent)
4. [Integrating Skills](#4-integrating-skills)
5. [Integrating MCP (Model Context Protocol)](#5-integrating-mcp)
6. [Adding Custom Tools](#6-adding-custom-tools)
7. [Using Subagents](#7-using-subagents)
8. [Evaluation Strategies](#8-evaluation-strategies)
9. [Continuous Improvement](#9-continuous-improvement)

---

## 1. Understanding DeepAgent

**DeepAgent** is LangChain's high-level framework for building complex, long-running AI agents. Think of it as the "car" while LangGraph gives you the "engine and transmission."

### Key Capabilities:
| Feature | What It Does |
|---------|-------------|
| **Planning Tool** | Auto-breaks complex tasks into todo lists |
| **File System** | Create, read, edit files within the agent's context |
| **Subagents** | Delegate tasks to specialized sub-agents |
| **Context Management** | Automatically handles large context windows so the model never hits token limits |
| **Human-in-the-Loop** | Pause for human approval at critical steps |
| **MCP Integration** | Connect external tools via Model Context Protocol |
| **Skills System** | Reusable instruction modules the agent can load dynamically |

### Architecture Overview:
```
User Request → DeepAgent Harness → Planner (todo list)
                     ↓
            ┌────────┼────────┐
            ↓        ↓        ↓
        Tools   Subagents   File System
            └────────┼────────┘
                     ↓
              Final Output
```

---

## 2. Installation & Setup

### Step 1: Create Project Directory
```bash
mkdir deep-research-agent
cd deep-research-agent
```

### Step 2: Install Dependencies
```bash
# Core package
pip install deepagents tavily-python httpx markdownify langchain-core

# Choose your model provider:
# For Anthropic (Claude)
pip install langchain-anthropic

# For Google (Gemini)
pip install langchain-google-genai

# For OpenAI
pip install langchain-openai
```

### Step 3: Set API Keys
```bash
# Required - pick your model provider
export ANTHROPIC_API_KEY="your_anthropic_api_key"
# OR
export GOOGLE_API_KEY="your_google_api_key"
# OR
export OPENAI_API_KEY="your_openai_api_key"

# Required for web search
export TAVILY_API_KEY="your_tavily_api_key"

# Optional but recommended for tracing/debugging
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY="your_langsmith_api_key"
export LANGCHAIN_PROJECT="deep-research-agent"
```

---

## 3. Building the Deep Research Agent

### Basic Agent Setup

Create `agent.py`:

```python
import os
from datetime import datetime
from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model
from tavily import TavilyClient

# ─── TOOLS ─────────────────────────────────────────────────────

tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])

def internet_search(
    query: str,
    max_results: int = 5,
    topic: str = "general",
    include_raw_content: bool = False,
):
    """Run a web search and return comprehensive results."""
    return tavily_client.search(
        query=query,
        max_results=max_results,
        include_raw_content=include_raw_content,
        topic=topic,
    )

# ─── SYSTEM PROMPT ─────────────────────────────────────────────

RESEARCH_INSTRUCTIONS = """You are an expert deep research agent.

Your workflow:
1. **Plan**: Use write_todos to create a research plan before starting
2. **Research**: Use internet_search to gather information from the web
3. **Delegate**: Spawn subagents for parallel research on different topics
4. **Synthesize**: Compile findings into a comprehensive, well-cited report
5. **Save**: Write intermediate findings to files to avoid losing context

Rules:
- Always cite your sources with URLs
- Write findings to files as you go
- Be thorough but concise in your final report
- Today's date: {date}
"""

# ─── CREATE AGENT ──────────────────────────────────────────────

current_date = datetime.now().strftime("%Y-%m-%d")

model = init_chat_model(model="anthropic:claude-sonnet-4-6", temperature=0.0)

agent = create_deep_agent(
    model=model,
    tools=[internet_search],
    system_prompt=RESEARCH_INSTRUCTIONS.format(date=current_date),
)

# ─── RUN ───────────────────────────────────────────────────────

if __name__ == "__main__":
    result = agent.invoke({
        "messages": [{
            "role": "user",
            "content": "Research the current state of quantum computing in 2025 and write a structured report."
        }]
    })
    print(result["messages"][-1].content)
```

### What Happens When You Run:
1. The agent calls `write_todos` to plan research steps
2. It runs searches, auto-offloading large results to the virtual filesystem
3. For complex topics, it spawns subagents for parallel research
4. It reads back files and synthesizes a final report
5. The harness manages context so the model never hits token limits

---

## 4. Integrating Skills

**Skills** are reusable instruction modules that the agent loads dynamically based on the task.

### Step 1: Create Skills Directory
```bash
mkdir -p .deepagents/skills/
# or for project-level
mkdir -p skills/
```

### Step 2: Create a Skill

Each skill is a directory with a `SKILL.md` file:

```bash
mkdir -p skills/web-research
```

**`skills/web-research/SKILL.md`:**
```yaml
---
name: web-research
description: >-
  Use this skill when conducting web research. Provides best practices for
  search query formulation, source evaluation, and information synthesis.
---

# Web Research Skill

## Instructions

### 1. Formulate Search Queries
Break the research question into 3-5 specific search queries.
- Use specific keywords, not broad terms
- Include the current year for recent information
- Search for both supporting and opposing viewpoints

### 2. Evaluate Sources
For each search result, assess:
- **Authority**: Is the source credible? (academic, government, established media)
- **Currency**: Is the information recent and relevant?
- **Bias**: Does the source have a known agenda?

### 3. Synthesize Findings
Combine information from multiple sources:
- Identify areas of consensus
- Note contradictions or gaps
- Form conclusions supported by evidence
```

### Step 3: Load Skills into Agent

```python
from deepagents import create_deep_agent
from deepagents.backends.filesystem import FilesystemBackend

# Option 1: FilesystemBackend (local disk)
backend = FilesystemBackend(root_dir="./my-project")

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    backend=backend,
    tools=[internet_search],
    system_prompt=RESEARCH_INSTRUCTIONS,
    skills=["./skills/"],  # ← Load skills from this directory
)

# Option 2: With subagent-specific skills
research_subagent = {
    "name": "research-agent",
    "description": "Deep research specialist",
    "system_prompt": "You are a research specialist...",
    "tools": [internet_search],
    "skills": ["./skills/web-research/"],  # Only this subagent gets these
}

agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    skills=["./skills/general/"],  # Main agent + GP subagents
    subagents=[research_subagent],
)
```

### Pro Tips for Skills:
| Tip | Why |
|-----|-----|
| Write specific descriptions | The agent selects skills based on description matching |
| Keep skills focused | One skill per domain/task type |
| Use YAML frontmatter | `name` and `description` are required |
| Layer skill sources | Later sources override earlier ones for same skill names |

---

## 5. Integrating MCP (Model Context Protocol)

**MCP** lets you extend your agent with tools from external servers without modifying the agent code.

### Step 1: Create MCP Config File

**Option A: User-level** (available to all projects):
```bash
mkdir -p ~/.deepagents
touch ~/.deepagents/.mcp.json
```

**Option B: Project-level**:
```bash
touch .mcp.json
# or hidden version
mkdir -p .deepagents
touch .deepagents/.mcp.json
```

### Step 2: Add MCP Servers

**`~/.deepagents/.mcp.json`** or **`.mcp.json`**:
```json
{
    "mcpServers": {
        "docs-langchain": {
            "type": "http",
            "url": "https://docs.langchain.com/mcp"
        },
        "filesystem": {
            "type": "stdio",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"]
        },
        "slack": {
            "type": "http",
            "url": "https://slack.com/api",
            "headers": {
                "Authorization": "Bearer ${SLACK_BOT_TOKEN}"
            }
        },
        "github": {
            "type": "sse",
            "url": "https://api.githubcopilot.com/mcp"
        }
    }
}
```

### Step 3: Launch and Verify

```bash
# For Deep Agents Code (coding agent)
dcode

# You'll see:
# ✓ Loaded 3 MCP tools

# Check loaded MCP tools
# Run /mcp in the interactive session
```

### MCP Server Types Supported:
| Type | Use Case | Example |
|------|----------|---------|
| `http` | REST API services | Documentation servers |
| `stdio` | Local CLI tools | File system access |
| `sse` | Server-Sent Events | GitHub Copilot |
| `websocket` | Real-time services | Custom integrations |

### OAuth Authentication (for services like Slack, GitHub):
```bash
# Login flow
dcode mcp login slack
dcode mcp login github

# Tokens are stored securely at:
# ~/.deepagents/.state/mcp-tokens/<server>-<hash>.json
```

---

## 6. Adding Custom Tools

### Tool Best Practices:
```python
from typing import Literal, Optional
import httpx
from markdownify import markdownify

def advanced_web_search(
    query: str,
    max_results: int = 5,
    topic: Literal["general", "news", "finance"] = "general",
    include_raw_content: bool = True,
    days: Optional[int] = None,  # For news: last N days
) -> dict:
    """
    Search the web and return full page content for deep analysis.
    
    Args:
        query: Search query string
        max_results: Number of results (1-10)
        topic: Search category - general, news, or finance
        include_raw_content: Whether to fetch full page content
        days: Restrict to recent results (days back from now)
    """
    # Implementation
    ...

def fetch_and_convert(url: str) -> str:
    """
    Fetch a webpage and convert HTML to clean markdown.
    Use this when you need to read the full content of a specific URL.
    """
    response = httpx.get(url, follow_redirects=True, timeout=30)
    return markdownify(response.text)

def save_research_note(
    filename: str,
    content: str,
    tags: list[str] = None,
) -> str:
    """
    Save a research note to the virtual filesystem.
    Use this to persist findings and avoid context loss.
    """
    # Implementation using agent's file system
    ...
```

### Register Tools:
```python
agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    tools=[
        advanced_web_search,
        fetch_and_convert,
        save_research_note,
        # ... more tools
    ],
)
```

---

## 7. Using Subagents

Subagents are specialized agents for parallel, context-isolated tasks.

### Defining Subagents:
```python
max_concurrent_research_units = 3
max_researcher_iterations = 3

# Research specialist subagent
research_subagent = {
    "name": "research-agent",
    "description": (
        "Delegate focused research tasks to this subagent. "
        "Give ONE specific topic at a time. It searches the web and "
        "returns a concise summary with sources."
    ),
    "system_prompt": """You are a focused research assistant.

Instructions:
1. Search for information on the assigned topic only
2. Evaluate source credibility
3. Return a concise summary (max 300 words)
4. Include source URLs
5. Flag any uncertain information

Today's date: {date}
""".format(date=datetime.now().strftime("%Y-%m-%d")),
    "tools": [internet_search],
    # Optional: specify a different model for this subagent
    # "model": "openai:gpt-4.1-mini",
}

# Analysis subagent
analysis_subagent = {
    "name": "analysis-agent",
    "description": "Analyzes research findings and identifies patterns, gaps, and conclusions.",
    "system_prompt": "You are a data analyst. Review provided research and extract key insights...",
    "tools": [],  # This one doesn't need tools - it analyzes provided data
}

# Create main agent with subagents
agent = create_deep_agent(
    model="anthropic:claude-sonnet-4-6",
    tools=[internet_search],
    system_prompt=main_instructions,
    subagents=[research_subagent, analysis_subagent],
)
```

### Subagent Best Practices:

| Practice | Example |
|----------|---------|
| **Clear descriptions** | ✅ `"Conducts web research and synthesizes findings with sources"` ❌ `"Does research"` |
| **Minimal tool sets** | Only give each subagent the tools it needs |
| **Concise outputs** | Instruct subagents to return summaries, not raw data |
| **One task at a time** | Give subagents single, focused assignments |
| **Model selection** | Use smaller models for simple tasks, larger for complex analysis |

---

## 8. Evaluation Strategies

### A. Unit Testing with Mocked Tools

Use `vcr` to record and replay HTTP requests:

```python
import vcr
import pytest
from deepagents import create_deep_agent

my_vcr = vcr.VCR(
    cassette_library_dir='tests/cassettes/',
    record_mode='once',  # Record once, replay thereafter
)

@my_vcr.use_cassette('research_quantum.yaml')
def test_quantum_research():
    agent = create_deep_agent(
        model="anthropic:claude-sonnet-4-6",
        tools=[internet_search],
        system_prompt=RESEARCH_INSTRUCTIONS,
    )
    
    result = agent.invoke({
        "messages": [{
            "role": "user",
            "content": "Research quantum computing advances in 2025"
        }]
    })
    
    final_output = result["messages"][-1].content
    
    # Assertions
    assert len(final_output) > 500  # Substantial output
    assert "source" in final_output.lower() or "http" in final_output
    assert "quantum" in final_output.lower()
```

### B. Structured Output Evaluation

```python
from pydantic import BaseModel, Field
from typing import List

class ResearchReport(BaseModel):
    title: str = Field(description="Report title")
    executive_summary: str = Field(description="2-3 paragraph summary")
    key_findings: List[str] = Field(description="List of key findings")
    sources: List[str] = Field(description="List of source URLs")
    confidence_score: float = Field(description="0-1 confidence in findings")

# Evaluate structure and quality
def evaluate_report(report_text: str) -> dict:
    evaluation = {
        "has_citations": "http" in report_text or "source" in report_text.lower(),
        "has_structure": "# " in report_text or "## " in report_text,
        "word_count": len(report_text.split()),
        "source_count": report_text.count("http"),
        "coverage_score": 0,  # Manual or LLM-judged
    }
    return evaluation
```

### C. LLM-as-Judge Evaluation

```python
def llm_evaluate(output: str, expected_topics: list[str]) -> dict:
    """Use an LLM to evaluate research quality."""
    
    evaluation_prompt = f"""
    Evaluate this research report on: {', '.join(expected_topics)}
    
    Report:
    {output[:4000]}
    
    Score each 1-5:
    1. Coverage: Does it cover all expected topics?
    2. Accuracy: Are claims supported by evidence?
    3. Citations: Are sources properly cited?
    4. Structure: Is the report well-organized?
    5. Actionability: Are conclusions actionable?
    
    Return JSON with scores and reasoning.
    """
    
    # Run evaluation through the model
    # ...
```

### D. LangSmith Tracing

```python
# Enable automatic tracing
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_PROJECT="deep-research-eval"

# View traces in LangSmith UI to:
# - See every tool call
# - Inspect context at each step
# - Identify where the agent went wrong
# - Compare runs over time
```

### E. Evaluation Checklist

| Aspect | What to Check | How |
|--------|-------------|-----|
| **Correctness** | Facts are accurate | Cross-reference with known sources |
| **Completeness** | All aspects covered | Check against rubric/expected topics |
| **Citations** | Sources provided | Regex for URLs, manual spot-checks |
| **Structure** | Well-organized output | Markdown header validation |
| **Efficiency** | Not too many tool calls | Count steps in LangSmith trace |
| **Cost** | Reasonable token usage | Monitor in LangSmith dashboard |

---

## 9. Continuous Improvement

### The Improvement Loop:
```
Run Agent → Evaluate Output → Identify Issues → Refine → Repeat
```

### A. Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Agent misses topics | Vague system prompt | Add explicit checklist to prompt |
| Too many tool calls | No iteration limit | Set `max_researcher_iterations` |
| Context overflow | Large tool outputs | Enable auto-eviction or summarize |
| Wrong subagent chosen | Poor description | Rewrite subagent descriptions |
| No citations | Missing instructions | Add "Always cite sources" rule |
| Repetitive searches | No memory of past searches | Use todo list to track completed searches |

### B. Prompt Engineering Improvements

```python
# Before (vague)
RESEARCH_INSTRUCTIONS = "You are a research agent. Do thorough research."

# After (specific, structured)
RESEARCH_INSTRUCTIONS = """You are an expert deep research agent.

## Workflow
1. PLAN: Create a todo list with write_todos before researching
2. SEARCH: Conduct 3-5 targeted searches per topic
3. EVALUATE: Assess source credibility before using information
4. SYNTHESIZE: Combine findings from multiple sources
5. CITE: Always include source URLs for every claim

## Quality Standards
- Minimum 5 distinct sources per report
- Include conflicting viewpoints when they exist
- Flag uncertain information with [uncertain] tag
- Structure output with clear headers and bullet points

## Constraints
- Maximum 3 search iterations per topic
- Summarize findings in under 500 words per section
- Save intermediate results to /tmp/ directory
"""
```

### C. The "Reflect & Create" Skill Loop

Turn successful patterns into reusable skills:

```python
# 1. Execute a task manually first
result = agent.invoke({
    "messages": [{"role": "user", "content": "Research AI regulation in EU"}]
})

# 2. Reflect on what worked
# Ask the agent: "Analyze your recent research process. 
# What search strategies worked best?"

# 3. Create a skill from the pattern
# The agent writes a new SKILL.md based on its reflection

# 4. Future tasks automatically use the refined skill
```

### D. Iterative Testing with LangGraph Studio

```bash
# Launch visual debugging environment
langgraph dev

# Open: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024

# Use the UI to:
# - Visualize the agent's decision graph
# - Inspect state at each node
# - Replay from any point
# - Modify inputs and re-run
```

### E. Metrics to Track Over Time

Create a simple evaluation dashboard:

```python
import json
from datetime import datetime

class AgentEvaluator:
    def __init__(self):
        self.runs = []
    
    def log_run(self, query: str, output: str, metrics: dict):
        self.runs.append({
            "timestamp": datetime.now().isoformat(),
            "query": query,
            "output_length": len(output),
            "tool_calls": metrics.get("tool_calls", 0),
            "sources_cited": metrics.get("sources", 0),
            "latency_seconds": metrics.get("latency"),
            "human_rating": metrics.get("rating"),  # 1-5
        })
        self.save()
    
    def save(self):
        with open("evaluation_log.jsonl", "a") as f:
            for run in self.runs[-1:]:
                f.write(json.dumps(run) + "\n")
    
    def get_improvement_trends(self):
        # Analyze trends over time
        # Are tool calls decreasing while quality increases?
        # Is latency improving?
        pass
```

### F. A/B Testing Different Configurations

```python
configs = [
    {
        "name": "claude-sonnet-4-tools",
        "model": "anthropic:claude-sonnet-4-6",
        "tools": [internet_search, fetch_and_convert],
        "max_iterations": 3,
    },
    {
        "name": "gpt-5-mini-subagents",
        "model": "openai:gpt-5-mini",
        "tools": [internet_search],
        "subagents": [research_subagent],
        "max_iterations": 5,
    },
]

# Run same queries through different configs
# Compare: cost, latency, output quality, citation count
```

---

## 🎯 Quick Start Checklist

- [ ] Install `deepagents` and model provider package
- [ ] Set API keys (model + Tavily + LangSmith)
- [ ] Create basic agent with `create_deep_agent()`
- [ ] Add internet search tool
- [ ] Test with a simple research query
- [ ] Add planning instructions (write_todos)
- [ ] Create `.deepagents/skills/` directory and first skill
- [ ] Create `.mcp.json` for external tool integration
- [ ] Define subagents for parallel research
- [ ] Set up evaluation harness (vcr + assertions)
- [ ] Enable LangSmith tracing
- [ ] Run 5-10 test queries and log results
- [ ] Identify top 3 issues and refine prompts/skills
- [ ] Repeat evaluation cycle

---

## 📚 Additional Resources

| Resource | Link |
|----------|------|
| **Official Docs** | [docs.langchain.com/oss/python/deepagents](https://docs.langchain.com/oss/python/deepagents) |
| **Deep Research Guide** | [docs.langchain.com/oss/python/deepagents/deep-research](https://docs.langchain.com/oss/python/deepagents/deep-research) |
| **Skills Guide** | [docs.langchain.com/oss/python/deepagents/skills](https://docs.langchain.com/oss/python/deepagents/skills) |
| **MCP Tools** | [docs.langchain.com/oss/python/deepagents/code/mcp-tools](https://docs.langchain.com/oss/python/deepagents/code/mcp-tools) |
| **GitHub Repo** | [github.com/langchain-ai/deepagents](https://github.com/langchain-ai/deepagents) |
| **Awesome Skills** | [github.com/EgoAlpha/awesome-DeepAgent-skills](https://github.com/EgoAlpha/awesome-DeepAgent-skills) |
| **Template Project** | [github.com/liam-langchain/deepagent-template](https://github.com/liam-langchain/deepagent-template) |
| **LangChain Skills** | [github.com/langchain-ai/langchain-skills](https://github.com/langchain-ai/langchain-skills) |

---

Would you like me to elaborate on any specific section, create a working example project, or dive deeper into any particular aspect like MCP server integration or the evaluation framework?