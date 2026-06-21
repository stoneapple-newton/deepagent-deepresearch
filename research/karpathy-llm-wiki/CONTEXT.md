# Karpathy Style LLM Wiki — Full Context

> A pattern for building personal knowledge bases using LLMs.
> — Andrej Karpathy, April 2026

---

## Table of Contents

1. [The Core Idea](#1-the-core-idea)
2. [Why This Exists](#2-why-this-exists)
3. [The Three-Layer Architecture](#3-the-three-layer-architecture)
4. [The Three Operations](#4-the-three-operations)
5. [Directory Structure](#5-directory-structure)
6. [Page Templates](#6-page-templates)
7. [The "Idea File" Philosophy](#7-the-idea-file-philosophy)
8. [AGENTS.md & CLAUDE.md (The Schema Layer)](#8-agentsmd--claudemd-the-schema-layer)
9. [Tools in the Ecosystem](#9-tools-in-the-ecosystem)
10. [Python Implementations](#10-python-implementations)
11. [Limitations & Open Questions](#11-limitations--open-questions)
12. [Getting Started](#12-getting-started)

---

## 1. The Core Idea

**Karpathy's framing**: Instead of treating every query as a fresh retrieval problem (standard RAG), 
the LLM **compiles** your raw documents into a structured, interlinked wiki — a persistent knowledge 
layer that grows richer with every source and every query.

**The analogy** (Karpathy's own words):
> "Obsidian is the IDE, the LLM is the programmer, the wiki is the codebase."

**The shift from RAG:**
- **RAG**: Retrieve chunks → synthesize answer → forget. Nothing compounds.
- **LLM Wiki**: Ingest sources → compile wiki → query wiki → lint & improve. Knowledge compounds.

You rarely write or edit the wiki manually. That's the domain of the LLM. You curate sources and 
ask questions; the LLM does all the bookkeeping.

## 2. Why This Exists

Karpathy published this idea in April 2026 via an X post that went extremely viral and a GitHub Gist.
Multiple sources noted Lex Fridman as an early adopter of the pattern.

The motivation:
- Most people's knowledge is scattered across Notion, Google Docs, bookmarks, sticky notes
- Traditional RAG rebuilds context from scratch on every query — no accumulation
- LLMs are very good at reading, summarizing, cross-referencing, and maintaining structure
- A markdown wiki is human-readable, version-controllable, and model-native

## 3. The Three-Layer Architecture

```
┌──────────────────────────────────────────────────────┐
│  LAYER 3: SCHEMA                                      │
│  CLAUDE.md or AGENTS.md                               │
│  "The rules that govern how the agent maintains       │
│   the wiki"                                           │
├──────────────────────────────────────────────────────┤
│  LAYER 2: WIKI                                        │
│  wiki/ — LLM-generated and maintained                 │
│  ├── index.md (master catalog)                        │
│  ├── log.md (append-only operation log)               │
│  ├── concepts/                                        │
│  ├── entities/                                        │
│  ├── sources/                                         │
│  └── comparisons/                                     │
├──────────────────────────────────────────────────────┤
│  LAYER 1: RAW SOURCES                                 │
│  raw/ — Immutable source documents                    │
│  ├── articles/                                        │
│  ├── papers/                                          │
│  ├── notes/                                           │
│  └── ...                                              │
└──────────────────────────────────────────────────────┘
```

### Layer 1: raw/ (Immutable Input)
- Your source documents — articles, papers, code repos, datasets, images
- **The LLM never modifies files here** — additions only
- The verification baseline: every claim in the wiki traces back to a file in raw/
- Use Obsidian Web Clipper to convert web articles → .md → raw/

### Layer 2: wiki/ (Compiled Knowledge)
- All LLM-generated and maintained markdown pages
- Organized by page type (concepts, entities, sources, comparisons)
- Every page has YAML frontmatter with metadata
- Cross-linked using `[[wikilink]]` syntax
- Two critical structural files:
  - **index.md**: Master content catalog — lists every page with summary
  - **log.md**: Append-only record of all operations

### Layer 3: Schema (Agent Instructions)
- CLAUDE.md (Claude Code) or AGENTS.md (cross-tool standard)
- Tells the agent: directory layout, naming conventions, templates, workflows
- Can be refactored into Claude Code Skills for efficiency:
  - `/wiki-ingest` — Full ingest procedure + templates
  - `/wiki-lint` — Health check procedure
  - `/wiki-query` — Query workflow

## 4. The Three Operations

### 🔄 Ingest
```
1. Read the source document in raw/
2. Discuss key takeaways with the user
3. Create wiki/sources/[source-name].md summary
4. Update or create concept/entity pages
5. Update wiki/index.md
6. Append to wiki/log.md
```

### 🔍 Query
```
1. Read wiki/index.md to identify relevant pages
2. Read identified pages → synthesize answer
3. Cite sources using [[source-links]]
4. If answer is novel/valuable, offer to save as new wiki page
```

### 🧹 Lint (Health Check)
```
1. Scan all pages for contradictions
2. Identify orphan pages (no incoming links)
3. Flag concepts referenced but not created
4. Find stale claims superseded by newer sources
5. Save results to outputs/lint-YYYY-MM-DD.md
```

The ingest → query → lint loop is the core rhythm. It cycles continuously — 
every source gets integrated into existing pages, query answers get written back 
so explorations compound, and an optional scheduled Lint Agent runs health checks.

## 5. Directory Structure

```
my-wiki/
├── AGENTS.md                  # Cross-tool agent instructions (Layer 3)
├── CLAUDE.md                  # Claude Code-specific schema (alternative to AGENTS.md)
│
├── raw/                       # Layer 1: immutable source documents
│   ├── articles/
│   ├── papers/
│   ├── notes/
│   └── images/
│
├── wiki/                      # Layer 2: LLM-compiled knowledge
│   ├── index.md               # Master catalog
│   ├── log.md                 # Append-only operation log
│   ├── concepts/              # Concept pages
│   ├── entities/              # People, organizations
│   ├── sources/               # Source summaries
│   └── comparisons/           # Comparison pages
│
└── outputs/                   # Generated artifacts
    └── lint-2026-06-19.md
```

## 6. Page Templates

### Concept Page
```markdown
---
title: Attention Mechanism
type: concept
sources:
  - raw/papers/attention-is-all-you-need.md
  - raw/articles/transformer-explained.md
related:
  - "Transformer Architecture"
  - "Self-Attention"
  - "Multi-Head Attention"
created: 2026-06-01
updated: 2026-06-15
confidence: high
---

# Attention Mechanism

## Summary
A mechanism that allows models to focus on relevant parts of input...

## Key Ideas
- Scaled dot-product attention
- Multi-head attention
- Self-attention vs cross-attention

## Key Sources
- [[Attention Is All You Need]] (raw/papers/attention-is-all-you-need.md)
- [[Transformer Explained Visually]] (raw/articles/transformer-explained.md)
```

### Source Summary
```markdown
---
title: "Attention Is All You Need — Summary"
type: source-summary
sources:
  - raw/papers/attention-is-all-you-need.md
related:
  - "Transformer Architecture"
  - "Attention Mechanism"
created: 2026-06-01
updated: 2026-06-01
confidence: high
---

# Attention Is All You Need

## Core Claims
1. Attention alone is sufficient for sequence transduction
2. Multi-head attention with positional encoding...
```

## 7. The "Idea File" Philosophy

Karpathy (X post, April 4, 2026):
> "The idea of the idea file is that in this era of LLM agents, there is less of a point/need 
> of sharing the specific code/app, you just share the idea, then the other person's agent 
> customizes & builds it for your specific needs."

**Three ways to use an idea file:**
1. **Copy-paste the gist** directly to your agent — let it build the wiki for you
2. **Drop an AGENTS.md** into your project — point your agent at a folder of documents
3. **Install a Python package** — `pip install` and run a config-driven pipeline

The gist is intentionally abstract/vague so the agent collaborates with you on specifics.

## 8. AGENTS.md & CLAUDE.md (The Schema Layer)

### AGENTS.md (Cross-Tool Standard)
- Open format stewarded by the Agentic AI Foundation (Linux Foundation)
- Used by 60k+ open-source projects
- Compatible with 30+ agents: Codex, Claude Code, Copilot, Cursor, Gemini CLI, etc.
- Think: "README for agents"
- Directory hierarchy: nearest AGENTS.md wins
- 32 KiB default size cap

### CLAUDE.md (Claude Code)
- Claude Code-specific instruction file
- Supports `@imports` (up to 4 hops deep)
- Can reference Skills (`.claude/skills/`)
- Pre/post tool hooks support

### Which to use?
- **Start with AGENTS.md** if you want cross-tool compatibility
- **Add CLAUDE.md** if you need Claude-specific features (hooks, skills)
- Many projects symlink: `ln -s AGENTS.md CLAUDE.md`

## 9. Tools in the Ecosystem

| Tool | Purpose | Link |
|------|---------|------|
| **Obsidian** | IDE/frontend for viewing the wiki | obsidian.md |
| **Obsidian Web Clipper** | Convert web articles → .md | Obsidian plugin |
| **Claude Code** | Primary LLM agent for compilation | claude.ai/code |
| **OpenAI Codex** | Alternative LLM agent | openai.com/codex |
| **Marp** | Markdown slide decks (Obsidian plugin) | marp.app |
| **Dataview** | Query YAML frontmatter (Obsidian) | Obsidian plugin |
| **QMD** | Local BM25/vector search for markdown | github.com/qmd |
| **Git** | Version control for the wiki | git-scm.com |
| **Syncthing** | P2P sync across devices | syncthing.net |

## 10. Python Implementations

### Minimal CLI (`llm-wiki`)
- Pure Python, stdlib + `markdown` package
- Commands: `init`, `ingest`, `query`, `lint`, `serve`
- Seeds index.md, log.md, CRITICAL_FACTS.md
- See accompanying `llm_wiki_cli.py`

### nashsu/llm_wiki (Desktop App)
- Cross-platform GUI
- 2-step chain-of-thought ingest
- Visual knowledge graph
- Local model support (Ollama)
- Vector search (LanceDB)

### wiki-llm (Programmatic Pipeline)
- `pip install markdown-hero`
- Config-driven production pipeline
- Writer → Evaluator → Editor → Lint → Repair loop
- Deterministic, versioned prompts

### docs-from-code-llm-wiki
- Post-commit git hook approach
- Auto-documents code changes

## 11. Limitations & Open Questions

**Scale**: The index breaks past ~50-100K tokens. At that point, a retrieval layer (BM25, vector) 
becomes necessary.

**Cost**: Every new document triggers 10-15 LLM calls to update cross-references. The denser the 
wiki, the more expensive each addition.

**Error compounding**: If the LLM misinterprets a source, that error persists in the wiki and 
influences all future work built on it.

**Order bias**: Ingest order affects wiki structure — the same documents in different order 
produce different wikis.

**Human oversight**: Still required, especially when output influences real decisions. 
The LLM is a capable bookkeeper but not infallible.

**Future direction**: Karpathy mentions eventually using the wiki to generate synthetic training 
data and fine-tune a model so it "knows" the data in its weights.

## 12. Getting Started

### 5-minute setup:
1. Install **Obsidian**, create a vault at `~/wiki`
2. Clone or create the directory structure (raw/, wiki/, outputs/)
3. Create your schema file (AGENTS.md or CLAUDE.md)
4. Drop a few source documents into raw/
5. Tell your agent: "Read the idea file and build me a wiki from raw/"
6. Start querying

### Three starter paths:
| Path | Best For | Setup Time |
|------|----------|------------|
| Copy-paste Karpathy's gist to agent | First-timers, experimenting | 2 min |
| Drop AGENTS.md into project | Already using Claude Code/Codex | 5 min |
| Install Python CLI tool | Production, automation, teams | 10 min |

---

*Derived from Andrej Karpathy's llm-wiki.md gist (April 2026), X posts, and community implementations.*
