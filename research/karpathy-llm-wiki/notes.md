# Karpathy LLM Wiki - Research Notes

## Core Idea (from Karpathy's gist, April 4, 2026)
- Instead of RAG (re-deriving knowledge each query), the LLM incrementally builds and maintains a persistent wiki
- Three-layer architecture: Raw sources → Wiki → Schema (CLAUDE.md)
- "Obsidian is the IDE; the LLM is the programmer; the wiki is the codebase."

## The 3-Layer Architecture

### Layer 1: Raw Sources (immutable)
- Source documents: articles, papers, images, data files
- NEVER modified by the LLM - read-only source of truth
- Stored in `raw/` folder

### Layer 2: The Wiki (LLM-owned)
- Directory of LLM-generated markdown files
- Summaries, entity pages, concept pages, comparisons, overview, synthesis
- LLM creates, updates, cross-references everything
- Humans read it; LLM writes it

### Layer 3: The Schema (CLAUDE.md)
- Configuration file telling the LLM how the wiki is structured
- Conventions, workflows for ingest/query/lint
- Makes the LLM a disciplined wiki maintainer, not a generic chatbot

## Three Operations

### Ingest
- Drop source into raw/, LLM reads it, discusses key takeaways, writes summary page, updates index, updates entity/concept pages, appends to log
- Single source may touch 10-15 wiki pages

### Query
- LLM searches index → finds relevant pages → reads them → synthesizes answer with citations
- Good answers can be filed BACK into the wiki as new pages (compounding)

### Lint
- Health-check: contradictions, stale claims, orphan pages, missing cross-references, data gaps
- LLM suggests new questions and sources

## Key Files
- `index.md` - content-oriented catalog of everything in the wiki (updated on every ingest)
- `log.md` - append-only chronological record of ingests, queries, lints

## Tooling
- **Obsidian** - The frontend/viewer (graph view, backlinks)
- **Claude Code** - The LLM agent that maintains the wiki
- **Obsidian Web Clipper** - Browser extension to capture web content into raw/
- **Git** - Version history for the wiki
- **qmd** - Optional local search engine for larger wikis
- **Obsidian plugins**: Dataview (YAML queries), Marp (slides)

## Setup Steps (from multiple tutorials)
1. Create a new Obsidian vault (empty folder)
2. Create folder structure: `raw/`, `wiki/`, `templates/`
3. Create `CLAUDE.md` schema file at vault root
4. Install the Terminal community plugin in Obsidian
5. Install Obsidian Web Clipper browser extension
6. Open Claude Code inside Obsidian via the Terminal plugin
7. Paste Karpathy's LLM Wiki gist as context + instructions
8. First ingest: point Claude at the LLM Wiki gist itself as source

## Sources
- Karpathy's original gist: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Teacher's Tech setup video: https://www.youtube.com/watch?v=iXd0t60YmMw
- Data Science Dojo tutorial: https://datasciencedojo.com/blog/llm-wiki-tutorial
- AskGlitch step-by-step: https://www.askglitch.com/blog/build-a-second-brain
- MindStudio guide: https://www.mindstudio.ai/blog/andrej-karpathy-llm-wiki-knowledge-base-claude-code
- AI Maker Substack: https://aimaker.substack.com/p/llm-wiki-obsidian-knowledge-base-andrej-karphaty
