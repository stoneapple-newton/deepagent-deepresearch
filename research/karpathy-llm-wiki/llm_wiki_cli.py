#!/usr/bin/env python3
"""
llm-wiki — A minimal CLI implementation of Karpathy's LLM Wiki pattern.

A pattern for building personal knowledge bases using LLMs.
Inspired by Andrej Karpathy's llm-wiki.md idea file (April 2026).

Usage:
    python llm_wiki_cli.py init <path>       # Scaffold a new wiki
    python llm_wiki_cli.py ingest <path>      # Ingest a source file into raw/
    python llm_wiki_cli.py query <path> <q>   # Search the wiki for a term
    python llm_wiki_cli.py lint <path>        # Run health checks on the wiki
    python llm_wiki_cli.py serve <path>       # Start a local HTTP viewer
    python llm_wiki_cli.py info <path>        # Show wiki statistics

Requires: Python 3.9+ (stdlib only, optional 'markdown' package for serve)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path

# ── Constants ───────────────────────────────────────────────────────────────

WIKI_VERSION = "0.1.0"
WIKI_STRUCTURE = {
    "raw": {
        "articles": "Web articles and blog posts",
        "papers": "Academic papers and technical reports",
        "notes": "Personal notes and thoughts",
        "images": "Local copies of images for LLM reference",
    },
    "wiki": {
        "concepts": "Concept articles (e.g., attention-mechanism.md)",
        "entities": "Entity pages (people, orgs, projects)",
        "sources": "Source summaries (one per ingested document)",
        "comparisons": "Comparison pages (e.g., rag-vs-fine-tuning.md)",
    },
    "outputs": "Generated artifacts (lint reports, slide decks, etc.)",
}

# ── Core Commands ───────────────────────────────────────────────────────────


def cmd_init(wiki_path: Path) -> None:
    """Scaffold a new LLM Wiki directory structure."""
    if wiki_path.exists() and any(wiki_path.iterdir()):
        print(f"❌ {wiki_path} already exists and is not empty.")
        sys.exit(1)

    wiki_path.mkdir(parents=True, exist_ok=True)

    # Create directory structure
    for top, _ in sorted(WIKI_STRUCTURE.items()):
        if isinstance(WIKI_STRUCTURE[top], dict):
            for sub, desc in WIKI_STRUCTURE[top].items():
                dir_path = wiki_path / top / sub
                dir_path.mkdir(parents=True, exist_ok=True)
                (dir_path / ".gitkeep").touch()
        else:
            dir_path = wiki_path / top
            dir_path.mkdir(parents=True, exist_ok=True)
            (dir_path / ".gitkeep").touch()

    # Seed wiki/index.md
    index_path = wiki_path / "wiki" / "index.md"
    index_path.write_text(
        f"""---
title: Wiki Index
created: {date.today().isoformat()}
updated: {date.today().isoformat()}
---

# {wiki_path.name} — Wiki Index

This is the master content catalog for this LLM Wiki.

## Concepts
<!-- LLM: List concept pages here with brief summaries -->

## Entities
<!-- LLM: List entity pages here -->

## Sources
<!-- LLM: List ingested sources here -->

## Comparisons
<!-- LLM: List comparison pages here -->

---
*Auto-maintained by the LLM. Updated on every ingest/query/lint operation.*
"""
    )

    # Seed wiki/log.md
    log_path = wiki_path / "wiki" / "log.md"
    log_path.write_text(
        f"""# Operation Log — {wiki_path.name}

| Date | Operation | Description |
|------|-----------|-------------|
| {date.today().isoformat()} | init | Wiki created |

---
*Append-only log. Every operation adds a row.*
"""
    )

    # Seed wiki/CRITICAL_FACTS.md
    facts_path = wiki_path / "wiki" / "CRITICAL_FACTS.md"
    facts_path.write_text(
        f"""---
title: Critical Facts
created: {date.today().isoformat()}
---

# Critical Facts

This page tracks the most important, well-established facts in this wiki.
The LLM should update this page when high-confidence facts are confirmed
across multiple sources.

<!-- Facts should be recorded as concise statements with source citations -->

---
*Last updated: {date.today().isoformat()}*
"""
    )

    # Create AGENTS.md at root
    agents_path = wiki_path / "AGENTS.md"
    agents_path.write_text(
        f"""# AGENTS.md — LLM Wiki Schema

This file defines how an AI coding agent should maintain this wiki.

## Identity
You are a wiki maintainer. Your job is to compile raw source documents into
a structured, interlinked knowledge base in the `wiki/` directory.

## Directory Layout
- `raw/` — Immutable source documents. NEVER modify files here.
- `wiki/` — Compiled knowledge pages. You create and maintain these.
- `outputs/` — Generated artifacts (lint reports, presentations).

## Page Types
Every wiki page MUST have YAML frontmatter:
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

## Rules
1. NEVER modify files in raw/
2. Keep `wiki/index.md` updated after every operation
3. Append to `wiki/log.md` after every operation
4. Use `[[wikilink]]` for cross-references
5. Filenames: kebab-case.md
6. Always cite sources in each wiki page

## Operations
- **Ingest**: Read raw/ source → create/update wiki pages → update index → log
- **Query**: Read index → find relevant pages → synthesize answer → cite sources
- **Lint**: Scan for contradictions → orphan pages → stale claims → save report

## Git Hygiene
- Commit after every meaningful change
- Commit message format: `wiki: <operation> — <description>`
"""
    )

    print(f"✅ LLM Wiki initialized at {wiki_path}")
    print(f"   Structure: raw/ → wiki/ → AGENTS.md (3-layer architecture)")
    print(f"   Try: python llm_wiki_cli.py info {wiki_path}")


def cmd_ingest(source_path_str: str, wiki_path: Path | None = None) -> None:
    """Ingest a source file into the wiki."""
    source_path = Path(source_path_str)

    if not source_path.exists():
        print(f"❌ Source not found: {source_path}")
        sys.exit(1)

    # Determine wiki path (source path parent, or explicit)
    if wiki_path is None:
        wiki_path = source_path.parent
        # Walk up to find wiki root (look for AGENTS.md or wiki/)
        for parent in source_path.parents:
            if (parent / "wiki").exists() and (parent / "raw").exists():
                wiki_path = parent
                break

    raw_dir = wiki_path / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    # Copy source to raw/
    dest = raw_dir / source_path.name
    if dest.exists():
        print(f"⚠ Source already in raw/: {dest}")
        choice = input(" Overwrite? [y/N] ").strip().lower()
        if choice != "y":
            print("Skipped.")
            return

    shutil.copy2(source_path, dest)
    print(f"📄 Copied source to {dest}")

    # Create a source summary template
    wiki_sources = wiki_path / "wiki" / "sources"
    wiki_sources.mkdir(parents=True, exist_ok=True)

    source_name = source_path.stem
    summary_path = wiki_sources / f"{source_name}.md"

    if not summary_path.exists():
        summary_path.write_text(
            f"""---
title: {source_name} — Summary
type: source-summary
sources:
  - raw/{source_path.name}
related: []
created: {date.today().isoformat()}
updated: {date.today().isoformat()}
confidence: medium
---

# {source_name}

## Core Claims
<!-- LLM: Extract key claims from the source -->

1.
2.
3.

## Key Takeaways
<!-- LLM: Summarize what matters -->

## Related Concepts
<!-- LLM: Link to concept pages -->

## Open Questions
<!-- LLM: Note uncertainties or gaps -->
"""
        )
        print(f"📝 Created summary template: {summary_path}")

    # Append to log
    log_path = wiki_path / "wiki" / "log.md"
    if log_path.exists():
        with open(log_path, "a") as f:
            f.write(
                f"| {date.today().isoformat()} | ingest | {source_path.name} added to wiki\n"
            )

    print(f"✅ Ingested {source_path.name}. Now tell your LLM to compile the wiki.")
    print(f"   Prompt: 'Read the source in raw/ and update the wiki pages.'")


def cmd_query(wiki_path: Path, query: str) -> None:
    """Search the wiki for relevant pages matching a query."""
    if not wiki_path.exists():
        print(f"❌ Wiki not found at {wiki_path}")
        sys.exit(1)

    query_lower = query.lower()
    results = []

    # Walk wiki/ directory
    wiki_dir = wiki_path / "wiki"
    if not wiki_dir.exists():
        print("❌ No wiki/ directory found. Run 'init' first.")
        sys.exit(1)

    for md_file in wiki_dir.rglob("*.md"):
        if md_file.name in (".gitkeep",):
            continue

        try:
            content = md_file.read_text(encoding="utf-8")
        except Exception:
            continue

        # Score based on title match, keyword match
        rel_path = md_file.relative_to(wiki_path)
        title_match = query_lower in md_file.stem.lower()
        content_match = query_lower in content.lower()

        if title_match or content_match:
            # Extract title from frontmatter or filename
            title = md_file.stem.replace("-", " ").title()
            fm_match = re.search(r"^title:\s*(.+)$", content, re.MULTILINE)
            if fm_match:
                title = fm_match.group(1).strip()

            # First line of content after frontmatter
            body = content.split("---", 2)[-1].strip() if content.count("---") >= 2 else content
            preview = " ".join(body.split()[:30]) + ("..." if len(body.split()) > 30 else "")

            results.append(
                {
                    "path": str(rel_path),
                    "title": title,
                    "preview": preview[:200],
                    "relevance": 2 if title_match else 1,
                }
            )

    # Sort by relevance
    results.sort(key=lambda r: r["relevance"], reverse=True)

    if not results:
        print(f"🔍 No results found for '{query}'")
        return

    print(f"🔍 Found {len(results)} result(s) for '{query}':\n")
    for i, r in enumerate(results, 1):
        print(f"  [{i}] {r['title']}")
        print(f"      File: {r['path']}")
        print(f"      {r['preview'][:120]}...")
        print()

    # Suggest LLM query
    print("─" * 50)
    print(f"💡 For a synthesized answer, tell your LLM agent:")
    print(f'   "Read the wiki and answer: {query}"')


def cmd_lint(wiki_path: Path) -> None:
    """Run health checks on the wiki."""
    if not (wiki_path / "wiki").exists():
        print("❌ No wiki/ directory found.")
        sys.exit(1)

    issues = []
    wiki_dir = wiki_path / "wiki"

    # Gather all wiki pages
    all_pages = {}
    for md_file in wiki_dir.rglob("*.md"):
        if md_file.name in (".gitkeep", "index.md", "log.md", "CRITICAL_FACTS.md"):
            continue
        rel_path = md_file.relative_to(wiki_path)
        content = md_file.read_text(encoding="utf-8")
        all_pages[str(rel_path)] = content

    # Check 1: Missing frontmatter
    for path, content in all_pages.items():
        if not content.startswith("---"):
            issues.append({"type": "missing_frontmatter", "file": path, "detail": "No YAML frontmatter"})

    # Check 2: Orphan pages (no incoming [[wikilinks]])
    for path, content in all_pages.items():
        page_name = Path(path).stem
        page_title = Path(path).stem.replace("-", " ").title()
        linked = False
        for other_path, other_content in all_pages.items():
            if other_path == path:
                continue
            if f"[[{page_name}" in other_content or f"[[{page_title}" in other_content:
                linked = True
                break
        if not linked:
            issues.append({"type": "orphan", "file": path, "detail": "No incoming links from other pages"})

    # Check 3: [[wikilinks]] to non-existent pages
    existing_stems = {Path(p).stem for p in all_pages}
    existing_titles = set()
    for p, c in all_pages.items():
        m = re.search(r"^title:\s*(.+)$", c, re.MULTILINE)
        if m:
            existing_titles.add(m.group(1).strip())

    for path, content in all_pages.items():
        for match in re.finditer(r"\[\[([^\]]+)\]\]", content):
            target = match.group(1)
            if target not in existing_stems and target not in existing_titles:
                issues.append(
                    {
                        "type": "broken_link",
                        "file": path,
                        "detail": f"Links to non-existent page: [[{target}]]",
                    }
                )

    # Check 4: Stale confidence
    for path, content in all_pages.items():
        if "confidence: low" in content:
            issues.append({"type": "low_confidence", "file": path, "detail": "Has low confidence rating"})

    # Generate report
    report_path = wiki_path / "outputs" / f"lint-{date.today().isoformat()}.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)

    report = f"""---
title: Lint Report
created: {date.today().isoformat()}
wiki: {wiki_path.name}
---

# Lint Report — {date.today().isoformat()}

## Summary
- Total pages: {len(all_pages)}
- Issues found: {len(issues)}

## Issues
"""
    if not issues:
        report += "\n🎉 No issues found! The wiki is healthy.\n"
    else:
        # Group by type
        by_type: dict[str, list] = {}
        for issue in issues:
            by_type.setdefault(issue["type"], []).append(issue)

        for issue_type, items in sorted(by_type.items()):
            report += f"\n### {issue_type.replace('_', ' ').title()} ({len(items)})\n\n"
            for item in items:
                report += f"- **{item['file']}**: {item['detail']}\n"

    # Suggestions for LLM
    report += """
## Suggested Actions for LLM
- Add frontmatter to pages missing it
- Fix broken [[wikilinks]] or create the target pages
- Add backlinks to orphan pages
- Review low-confidence pages with newer sources

---
*Auto-generated by llm-wiki lint*
"""

    report_path.write_text(report)

    print(f"🧹 Lint complete. {len(issues)} issue(s) found.")
    print(f"   Report saved to {report_path}")
    for issue in issues:
        print(f"   ⚠ [{issue['type']}] {issue['file']}: {issue['detail'][:80]}")

    print(f"\n💡 Tell your LLM: 'Run the lint recommendations from {report_path}'")


def cmd_info(wiki_path: Path) -> None:
    """Show wiki statistics."""
    if not wiki_path.exists():
        print(f"❌ Wiki not found at {wiki_path}")
        sys.exit(1)

    stats = {
        "name": wiki_path.name,
        "path": str(wiki_path.resolve()),
        "raw_files": 0,
        "wiki_pages": 0,
        "wiki_words": 0,
        "total_size_kb": 0,
        "last_modified": "",
    }

    raw_dir = wiki_path / "raw"
    wiki_dir = wiki_path / "wiki"

    if raw_dir.exists():
        stats["raw_files"] = len([f for f in raw_dir.rglob("*") if f.is_file() and f.name != ".gitkeep"])

    if wiki_dir.exists():
        md_files = [f for f in wiki_dir.rglob("*.md") if f.name != ".gitkeep"]
        stats["wiki_pages"] = len(md_files)
        stats["wiki_words"] = sum(len(f.read_text().split()) for f in md_files if f.exists())
        stats["total_size_kb"] = sum(f.stat().st_size for f in md_files) / 1024

        # Last modified
        mtimes = [f.stat().st_mtime for f in md_files if f.exists()]
        if mtimes:
            stats["last_modified"] = datetime.fromtimestamp(max(mtimes)).isoformat()

    print(f"""
╔══════════════════════════════════╗
║     LLM Wiki — Wiki Info         ║
╠══════════════════════════════════╣
║ Name:         {stats['name']:<20} ║
║ Path:         {stats['path']:<20} ║
║ Raw Sources:  {stats['raw_files']:<20} ║
║ Wiki Pages:   {stats['wiki_pages']:<20} ║
║ Wiki Words:   {stats['wiki_words']:<20} ║
║ Wiki Size:    {stats['total_size_kb']:.1f} KB{'':<16} ║
║ Last Updated: {stats['last_modified'][:19]:<20} ║
╚══════════════════════════════════╝

Architecture: raw/ ({stats['raw_files']} files) → wiki/ ({stats['wiki_pages']} pages) → AGENTS.md
    """)


def cmd_serve(wiki_path: Path, port: int = 8080) -> None:
    """Start a simple HTTP server to browse the wiki."""
    if not (wiki_path / "wiki").exists():
        print(f"❌ No wiki/ directory found at {wiki_path}")
        sys.exit(1)

    # Check for optional markdown package
    try:
        import markdown
    except ImportError:
        print("⚠ The 'markdown' package is not installed. Serving raw markdown.")
        print("  Install: pip install markdown\n")
        markdown = None

    http_path = str(wiki_path.resolve())

    if markdown:
        # Serve rendered HTML
        html_template = """<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>{title} — LLM Wiki</title>
<style>
body {{ font-family: -apple-system, system-ui, sans-serif; max-width: 800px; margin: 2em auto; padding: 0 1em; line-height: 1.6; }}
pre {{ background: #f4f4f4; padding: 1em; overflow-x: auto; }}
code {{ background: #f4f4f4; padding: 0.2em 0.4em; }}
table {{ border-collapse: collapse; width: 100%; }}
th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
th {{ background: #f4f4f4; }}
a {{ color: #0366d6; text-decoration: none; }}
a:hover {{ text-decoration: underline; }}
nav {{ margin-bottom: 2em; padding: 1em; background: #f8f8f8; border-radius: 4px; }}
</style>
</head><body>
<nav><a href="/">🏠 Wiki Index</a> | <a href="/lint">🧹 Latest Lint</a></nav>
<div id="content">{content}</div>
</body></html>"""

        from http.server import HTTPServer, SimpleHTTPRequestHandler

        class WikiHandler(SimpleHTTPRequestHandler):
            def translate_path(self, path):
                # Map / to wiki/index.md
                if path == "/" or path == "":
                    path = "/wiki/index.md"
                return super().translate_path(path)

            def do_GET(self):
                if self.path == "/lint":
                    self.path = "/outputs"
                filepath = self.translate_path(self.path)

                if filepath.endswith(".md"):
                    try:
                        md_content = Path(filepath).read_text(encoding="utf-8")
                        html_body = markdown.markdown(
                            md_content, extensions=["fenced_code", "tables"]
                        )
                        title = Path(filepath).stem.replace("-", " ").title()
                        html = html_template.format(title=title, content=html_body)
                        self.send_response(200)
                        self.send_header("Content-type", "text/html; charset=utf-8")
                        self.end_headers()
                        self.wfile.write(html.encode("utf-8"))
                        return
                    except Exception as e:
                        pass  # Fall through to default handler

                super().do_GET()

        server = HTTPServer(("", port), WikiHandler)
        print(f"🌐 LLM Wiki viewer running at http://localhost:{port}")
        print(f"   📁 Serving: {http_path}")
        print(f"   Press Ctrl+C to stop.")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
    else:
        # Serve raw directory listing
        os.chdir(http_path)
        subprocess.run([sys.executable, "-m", "http.server", str(port)], check=False)


# ── CLI Entry Point ─────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="llm-wiki — Karpathy-style LLM Wiki CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python llm_wiki_cli.py init ~/my-wiki
  python llm_wiki_cli.py ingest ~/my-wiki/raw/articles/my-article.md
  python llm_wiki_cli.py query ~/my-wiki "attention mechanism"
  python llm_wiki_cli.py lint ~/my-wiki
  python llm_wiki_cli.py serve ~/my-wiki --port 9090
  python llm_wiki_cli.py info ~/my-wiki
        """,
    )

    parser.add_argument("command", choices=["init", "ingest", "query", "lint", "serve", "info"])
    parser.add_argument("path", nargs="?", default=".", help="Path to wiki directory or source file")
    parser.add_argument("query_text", nargs="?", default="", help="Query text (for 'query' command)")
    parser.add_argument("--port", type=int, default=8080, help="Port for HTTP server (default: 8080)")
    parser.add_argument("--version", action="version", version=f"llm-wiki {WIKI_VERSION}")

    args = parser.parse_args()

    if args.command == "init":
        cmd_init(Path(args.path))
    elif args.command == "ingest":
        cmd_ingest(args.path)
    elif args.command == "query":
        if not args.query_text:
            print("❌ Query text required. Usage: llm-wiki query <path> <query>")
            sys.exit(1)
        cmd_query(Path(args.path), args.query_text)
    elif args.command == "lint":
        cmd_lint(Path(args.path))
    elif args.command == "info":
        cmd_info(Path(args.path))
    elif args.command == "serve":
        cmd_serve(Path(args.path), args.port)


if __name__ == "__main__":
    main()
