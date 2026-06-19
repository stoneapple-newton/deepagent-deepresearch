---
name: deep-research
description: Methodology for conducting thorough multi-step research, synthesizing findings from web searches, and writing a polished Markdown report to disk.
---

# Deep Research

## Overview

Use this skill when the user asks for research, a report, a comparison, an
explanation of a complex topic, or any task that requires gathering and
synthesizing information from the web.

## When to use

- The user asks "research X", "write a report on X", "compare X and Y", or "explain X in depth".
- The answer requires up-to-date or external information.
- The topic benefits from breaking into sub-questions.

## Instructions

Follow these steps in order.

### 1. Plan the research

Call `write_todos` to create a todo list. Break the topic into 3-7 concrete
sub-questions or angles. Example structure:

- Understand the core definition / background
- Explore key components, features, or recent developments
- Find comparisons or alternatives
- Gather real-world examples or case studies
- Synthesize a conclusion

Before searching, write down the target audience, the expected report shape, and
which claims are likely to be time-sensitive.

### 2. Build a query plan

Create specific searches instead of one broad query.

- Use 3-5 targeted queries for the core topic.
- Add the current year for recent developments.
- Search for both supporting and dissenting views when the topic is debated.
- Prefer primary-source queries such as official docs, standards bodies,
  company blogs, government pages, academic papers, or project repositories.
- Use recency filters for news or fast-moving topics.

### 3. Delegate sub-research

For each independent sub-question, call
`task(agent="web_researcher", instruction=...)`. Give the subagent:

- A clear, specific question
- The desired output format: bulleted facts with source URLs
- Any constraints (e.g., focus on 2024-2025 developments)
- A reminder to flag uncertainty and source quality issues

Run multiple `task` calls in parallel when the sub-questions are independent.

### 4. Evaluate sources

For each important source, assess:

- Authority: Is it primary, official, peer-reviewed, or otherwise credible?
- Currency: Is it recent enough for the claim being made?
- Relevance: Does it directly support the claim?
- Bias: Does the source have a commercial, political, or advocacy angle?
- Corroboration: Is the claim supported by more than one reliable source?

Prefer primary sources over summaries. Use summaries only as context unless they
are the subject of the report.

### 5. Run your own verification searches

Use `internet_search` directly to:

- Fill gaps left by subagent summaries
- Verify conflicting claims
- Find authoritative sources (official docs, reputable news, academic sources)

Use `include_raw_content=True` when you need more than a snippet.

### 6. Save research notes

Create a workspace under `/research/<kebab-case-topic>/` and save useful notes
there. Suggested files:

- `plan.md`: research plan and sub-questions
- `sources.md`: source list with quality notes
- `findings.md`: synthesized facts and evidence
- `open-questions.md`: uncertainties, contradictions, or gaps

### 7. Synthesize findings

Combine subagent outputs and your own search results into a coherent narrative. Resolve contradictions. Prioritize primary sources and recent information.

Separate:

- established facts
- interpretation
- examples or case studies
- uncertainty and limitations
- implications or recommended next steps

### 8. Audit the draft

Before final delivery:

- Call `task(agent="source_auditor", instruction=...)` for central claims,
  recent claims, or claims based on weaker sources.
- Call `task(agent="report_critic", instruction=...)` with the draft report.
- Use `assess_research_report` for a deterministic quality check.
- Fix material issues before saving the final report.

### 9. Write the report to disk

Create the directory `/reports/` if it does not exist. Choose a kebab-case filename based on the topic, e.g. `/reports/langgraph-overview.md`.

The report should include:

- A title and one-paragraph executive summary
- Clearly marked sections (use Markdown headings)
- Bullet points or tables where appropriate
- Inline citations with source URLs
- Date qualifiers for time-sensitive claims
- A limitations, uncertainty, or open questions section when appropriate
- A "Sources" section listing all references

Use `write_file` to save the report.

### 10. Return a concise summary to the user

After saving the report, tell the user:

- The file path of the saved report
- 3-5 key takeaways
- Any notable limitations or unresolved questions
