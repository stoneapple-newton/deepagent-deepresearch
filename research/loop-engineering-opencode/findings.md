# Synthesized Research Findings

## Loop Engineering
- Defined from Addy Osmani's essay (June 7, 2026) and Peter Steinberger's viral post
- "Stop prompting coding agents. Start designing the loops that prompt them." — Peter Steinberger
- "I don't prompt Claude anymore. I have loops running." — Boris Cherny
- Core concept: replace manual prompting with a system that: finds work → executes → verifies → records → decides next step
- 5 building blocks: Automations, Worktrees, Skills, Connectors/Plugins, Sub-agents
- Claude Code: /goal (May 11, 2026), /loop, hooks
- Codex: Automations tab, worktrees, triage inbox

## OpenCode
- Open-source terminal-based AI coding assistant by Anomaly Co
- ~126,000 GitHub stars, ~5M monthly active users
- Multi-LLM: OpenAI, Anthropic, Google, Ollama, 75+ providers
- Key features: SKILL.md files, plugins, subagents, MCP servers, LSP integration
- Loop engineering via skills, subagents, and plugin hooks
- Not as mature as Claude Code for native loops (no /goal equivalent)
- Has OpenCode MCP Server for integration with Cursor, Claude Desktop, etc.

## Token Economics
- Simple loops: 472K tokens/$1.49 for 10-step naive loop
- Code review = ~59.4% of all tokens
- Complex refactoring: 500K tokens/$1.50
- Runaway: 5M+ tokens/$15+ unconstrained
- Cost variance: 30-200x between optimized and unoptimized

## Key Stats
- Anthropic: 80%+ of merged code AI-authored (May 2026)
- Google: 75% of new code AI-generated (April 2026)
- Industry-wide: ~41% of all code AI-generated
