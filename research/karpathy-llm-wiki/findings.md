# Findings: Karpathy Style LLM Wiki

## 1. What It Is

The Karpathy LLM Wiki is a **pattern** (not a product) for building personal knowledge bases using LLMs. 
Karpathy shared it as an **"idea file"** — meant to be copy-pasted to an LLM agent, not shipped as code.

**Core quote from Karpathy** (from his llm-wiki.md gist and social media):
> "Obsidian is the IDE, the LLM is the programmer, the wiki is the codebase."

Instead of traditional RAG (which rediscovers knowledge from scratch per query), the wiki compiles 
knowledge once, maintains it, and cross-references everything. Knowledge compounds over time.

## 2. The Three-Layer Architecture

```
raw/        → Layer 1: Immutable source documents (articles, papers, notes, transcripts)
wiki/       → Layer 2: LLM-compiled knowledge pages (concepts, entities, comparisons, source summaries)
CLAUDE.md   → Layer 3: Schema/governance (rules for how the agent maintains the wiki)
  (or AGENTS.md)
```

### Layer 1: raw/
- Contains source material: articles, papers, code repos, datasets, images
- **Never modified by the LLM** — additions only
- Obsidian Web Clipper converts web articles to .md files directly into raw/

### Layer 2: wiki/
- LLM-generated markdown pages organized by type:
  - `concepts/` — Concept pages (e.g., attention-mechanism.md)
  - `entities/` — People, organizations (e.g., openai.md)
  - `sources/` — Source summaries
  - `comparisons/` — Comparison pages
- Key structural files:
  - `index.md` — Master content catalog (updated on every operation)
  - `log.md` — Append-only operation log
- Every page uses YAML frontmatter:
  ```yaml
  ---
  title: Page Title
  type: concept | entity | source-summary | comparison
  sources:
    - raw/papers/filename.md
  related:
    - ""
  created: YYYY-MM-DD
  updated: YYYY-MM-DD
  confidence: high | medium | low
  ---
  ```
- Cross-references use `[[wikilink]]` conventions
- Kebab-case filenames

### Layer 3: Schema (CLAUDE.md / AGENTS.md)
- Tells the agent HOW to maintain the wiki
- Defines conventions, workflows, templates
- Can be supplemented with Claude Code Skills (ingest, lint, query)

## 3. Three Operations

### Ingest
1. Read the source document in raw/
2. Discuss key takeaways with the user
3. Create/modify wiki pages (source summary, concepts, entities)
4. Update wiki/index.md
5. Append to wiki/log.md

### Query
1. Read wiki/index.md to identify relevant pages
2. Read pages and synthesize answer
3. Cite sources using `[[source-links]]`
4. Optionally save novel answers as new wiki pages

### Lint (Health Checks)
1. Scan all wiki pages for contradictions
2. Identify orphan pages (no incoming links)
3. Flag missing concepts referenced but not created
4. Find stale claims superseded by newer sources
5. Save results to outputs/lint-YYYY-MM-DD.md

## 4. The "Idea File" Concept

Karpathy (from his X post, April 4, 2026):
> "The idea of the idea file is that in this era of LLM agents, there is less of a point/need of 
> sharing the specific code/app, you just share the idea, then the other person's agent customizes 
> & builds it for your specific needs."

The gist is designed to be:
- Copy-pasted to an LLM agent (Codex, Claude Code, Cursor, etc.)
- Intentionally abstract/vague so the agent customizes it
- A seed, not a blueprint

## 5. AGENTS.md — The Cross-Tool Standard

**AGENTS.md** is an open format for guiding coding agents, stewarded by the Agentic AI Foundation 
under the Linux Foundation. Used by 60k+ open-source projects.

Key points:
- **README is for humans; AGENTS.md is for agents**
- Compatible with 30+ agents (Codex, Claude Code, Copilot, Cursor, Gemini CLI, etc.)
- No required fields — optional sections for setup, testing, code style, boundaries
- Directory hierarchy: nearest AGENTS.md wins (OpenAI's repo uses 88 AGENTS.md files)
- 32 KiB default size cap (Codex)
- Complements CLAUDE.md (Claude-specific) and .cursorrules (Cursor-specific)

In the Karpathy wiki context:
- AGENTS.md or CLAUDE.md acts as the **schema layer** (Layer 3)
- Defines how the agent should maintain the wiki
- Can be refactored into Claude Code Skills (/wiki-ingest, /wiki-lint, /wiki-query) for efficiency

## 6. Python Implementations in the Ecosystem

### nashsu/llm_wiki (Desktop App)
- Cross-platform desktop app with visual knowledge graph
- Splits ingest into 2-step chain-of-thought for quality
- Adds purpose.md (the "why" of the wiki)
- Supports local models via Ollama
- Full search pipeline: tokenized → vector (LanceDB) → graph expansion

### Pratiyush/llm-wiki (CLI Tool)
- Python CLI: `python3 -m llmwiki`
- Single runtime dependency: `markdown` pip package
- Seeds wiki/index.md, wiki/overview.md, wiki/log.md, wiki/CRITICAL_FACTS.md
- Minimal, stdlib-focused approach

### lewisjared/llm-wiki-skill (Skill)
- Claude Code skill format
- Focus on minimal pattern, no CLI/server

### wiki-llm (Programmatic Python)
- `pip install markdown-hero`
- Config-driven pipeline with Writer → Evaluator → Editor → Lint → Repair loop
- Deterministic, versioned prompts
- Designed for production/scheduled runs

### docs-from-code-with-llm-wiki
- Post-commit git hook fires LLM wiki compilation
- Config-driven doc types (architecture, api, decisions, concepts)
- Auto-commits wiki updates

## 7. Limitations & Open Questions

- **Scale wall**: The index breaks past ~50-100K tokens; needs retrieval layer
- **Cost**: Every new document triggers 10-15 LLM calls for cross-references
- **Error compounding**: A single misinterpretation persists across generations
- **Order bias**: Ingest order affects wiki structure (non-idempotent)
- **Human oversight required**: Especially when output influences real decisions
- **Future direction**: Using the wiki to generate synthetic training data → personalized fine-tuned model

## 8. Tools Mentioned by Karpathy

- **Obsidian** — IDE/frontend for viewing data
- **Obsidian Web Clipper** — Convert web articles to .md
- **Claude Code** — Primary LLM agent
- **Marp** — Markdown slide deck format (Obsidian plugin)
- **Dataview** — Obsidian plugin for querying YAML frontmatter
- **QMD** — Local search engine for markdown (BM25/vector hybrid)
- **Git** — Version history, branching, collaboration
- **matplotlib** — For generating visualizations from queries
