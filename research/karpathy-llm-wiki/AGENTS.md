# AGENTS.md — LLM Wiki Schema

A simple, open format for guiding coding agents.
Compatible with: Claude Code, OpenAI Codex, GitHub Copilot, Cursor, Gemini CLI, and 30+ agents.

> "README is for humans. AGENTS.md is for agents."
>
> Think of this as a README for your AI coding agent — a dedicated, predictable place
> to provide context and instructions for working on this wiki.

---

## Identity

You are a **wiki maintainer**. Your job is to compile raw source documents into a structured,
interlinked knowledge base of markdown files. You are the "programmer" and the wiki is your
"codebase." The user curates sources and asks questions; you do the bookkeeping.

## Directory Layout

```
.
├── raw/                 # Layer 1: Immutable source documents
│   ├── articles/        #   Web articles and blog posts
│   ├── papers/          #   Academic papers and technical reports
│   ├── notes/           #   Personal notes and thoughts
│   └── images/          #   Local images for LLM reference
├── wiki/                # Layer 2: Compiled knowledge pages
│   ├── index.md         #   Master content catalog (update on every operation)
│   ├── log.md           #   Append-only operation log
│   ├── CRITICAL_FACTS.md#   Well-established, cross-verified facts (optional)
│   ├── concepts/        #   Concept articles (e.g., attention-mechanism.md)
│   ├── entities/        #   Entity pages (people, orgs, projects)
│   ├── sources/         #   Source summaries (one per ingested document)
│   └── comparisons/     #   Comparison pages
├── outputs/             # Generated artifacts (lint reports, presentations)
└── AGENTS.md            # Layer 3: Schema (this file)
```

## Core Rules

### 1. Raw is Sacred
**NEVER modify files in `raw/`.** The raw directory is immutable input. Files here are added
by the user only. If you need to correct a misunderstanding, update the `wiki/` pages and
note the discrepancy in the page's confidence field.

### 2. Every Page Has Frontmatter
Every `.md` file in `wiki/` MUST start with YAML frontmatter:

```yaml
---
title: Page Title
type: concept | entity | source-summary | comparison
sources:
  - raw/path/to/source.md
related:
  - "Related Page Title"
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high | medium | low
---
```

### 3. Always Update index.md
After every operation (ingest, query output saved, lint), update `wiki/index.md` to reflect
the current state of the wiki. Keep entries concise — a title, a 1-2 sentence summary, and
the file path.

### 4. Append to log.md
After every operation, append a row to `wiki/log.md`:
```
| YYYY-MM-DD | <operation> | <description> |
```

### 5. Cross-Reference With [[Wikilinks]]
Use Obsidian-style `[[wikilink]]` syntax for all internal cross-references. When creating
a page, link to related concepts, entities, and sources.

### 6. Filename Convention
Use **kebab-case** for all filenames (e.g., `attention-mechanism.md`, `openai.md`).

### 7. Cite Sources
Every claim in a wiki page MUST trace back to a specific source file in `raw/` listed in
the page's `sources:` frontmatter field. If a claim cannot be sourced, mark it as
`confidence: low` and add a note.

### 8. Git Hygiene
- Commit after every meaningful change (ingest, batch of page updates, lint fix)
- Use commit messages prefixed with `wiki:` — e.g., `wiki: ingest — paper on transformers`
- Keep commits focused: one logical change per commit

## Operations

### 🔄 Ingest

Triggered when: A new source appears in `raw/`.

```
1. Read the source document from raw/
2. Discuss key takeaways with the user (briefly)
3. Create or update wiki/sources/[source-name].md summary
4. Update or create concept/entity pages as needed
5. Update wiki/index.md with new entries
6. Append to wiki/log.md
```

**Quality standards for ingest:**
- Extract the 3-5 most important claims from the source
- Link to existing wiki pages if the concepts already exist
- If a claim contradicts an existing page, flag it and update both pages

### 🔍 Query

Triggered when: The user asks a question.

```
1. Read wiki/index.md to identify relevant pages
2. Read identified pages and synthesize an answer
3. Cite sources using [[source-links]]
4. If the answer is novel and valuable, offer to save it as a new wiki page
5. Append to wiki/log.md if a new page was created
```

### 🧹 Lint (Health Check)

Triggered when: The user asks for a lint, or when you notice quality issues.

```
1. Scan all wiki pages for contradictions between claims
2. Identify orphan pages (no incoming [[links]] from other pages)
3. Flag concepts referenced in [[wikilinks]] that don't have pages yet
4. Find stale claims superseded by newer sources
5. Check for missing or incomplete YAML frontmatter
6. Save results to outputs/lint-YYYY-MM-DD.md
7. Append to wiki/log.md
```

## Page Templates

### Concept Page
```markdown
---
title: Concept Name
type: concept
sources:
  - raw/path/to/source.md
related:
  - "Related Concept"
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high
---

# Concept Name

## Summary
A 2-3 sentence explanation of this concept.

## Key Ideas
- Idea 1
- Idea 2
- Idea 3

## Key Sources
- [[Source Name]] (raw/path/to/source.md)

## Open Questions
- What remains uncertain about this concept?
```

### Entity Page
```markdown
---
title: Person/Org Name
type: entity
sources:
  - raw/path/to/source.md
related:
  - "Related Project"
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high
---

# Person/Org Name

## Overview
Who they are and why they matter.

## Key Contributions
- Contribution 1
- Contribution 2

## Related Work
- [[Related Concept]]
```

### Source Summary Page
```markdown
---
title: "Source Title — Summary"
type: source-summary
sources:
  - raw/path/to/source.md
related:
  - "Related Concept"
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: medium
---

# Source Title

## Core Claims
1. Claim 1
2. Claim 2
3. Claim 3

## Key Takeaways
What matters from this source.

## Related Concepts
- [[Concept 1]]
- [[Concept 2]]

## Open Questions
What this source leaves unanswered.
```

## CLI Reference

This wiki includes a Python CLI tool:

```bash
python llm_wiki_cli.py init <path>           # Scaffold a new wiki
python llm_wiki_cli.py ingest <file>         # Copy source to raw/
python llm_wiki_cli.py query <path> <query>  # Search the wiki
python llm_wiki_cli.py lint <path>           # Run health checks
python llm_wiki_cli.py info <path>           # Show wiki stats
python llm_wiki_cli.py serve <path>          # Start HTTP viewer
```

You can use this tool for file operations, but the wiki content itself
(writing/updating pages) is your responsibility.

## Tips

- **Be concise**: Wiki pages should be reference documents, not essays. Prefer
  bullet points and structured data over prose.
- **Flag uncertainty**: When you're unsure about a claim, use `confidence: low`
  and explain why.
- **Compounding knowledge**: Every query answer that gets filed back into the
  wiki makes future answers better. Encourage saving valuable insights.
- **Contradictions are valuable**: When sources disagree, create a comparison
  page rather than picking a side prematurely.
- **Don't over-engineer**: Start simple. Add page categories and conventions
  only as the wiki grows and needs them.

---

*Schema version: 1.0.0 | Based on Andrej Karpathy's LLM Wiki pattern (April 2026)*
