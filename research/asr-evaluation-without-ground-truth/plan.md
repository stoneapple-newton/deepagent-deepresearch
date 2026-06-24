# Research Plan: Evaluating ASR Transcripts Without Ground Truth

## Target Audience
Developers/researchers building ASR systems who need to evaluate transcript quality when reference transcripts are unavailable. Practical focus: "what can I use today?"

## Sub-questions
1. What are the main categories of reference-free ASR evaluation methods?
2. What specific tools, libraries, and packages exist for ground-truth-free ASR evaluation?
3. How are LLMs being used as zero-shot transcript evaluators?
4. What are the tradeoffs (accuracy vs. reference-based metrics, cost, latency, domain sensitivity)?
5. What are the practical recommendations for different use cases?

## Report Shape
- Executive summary
- Background: Why reference-free evaluation matters
- Methods taxonomy (pseudo-reference, self-consistency, quality estimation, LLM-as-judge)
- Available tools and libraries (with links, maturity, language support)
- LLM-based approaches in detail
- Comparison table
- Recommendations by use case
- Limitations and open questions
- Sources

## Time-sensitive claims
- LLM-based evaluation is fast-moving; prioritize 2024-2026 work
- Specific model versions and APIs will date quickly
