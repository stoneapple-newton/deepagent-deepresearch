from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from evaluation import DEFAULT_LOG_PATH, append_evaluation_log, evaluate_research_report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate a Markdown research report.")
    parser.add_argument("report_path", help="Path to the Markdown report to evaluate.")
    parser.add_argument("--query", help="Original research query.")
    parser.add_argument(
        "--expected-topic",
        action="append",
        default=[],
        help="Expected topic that should appear in the report. Repeatable.",
    )
    parser.add_argument(
        "--trace-json",
        help="Path to a JSON trace file, or an inline JSON object with trace metrics.",
    )
    parser.add_argument("--model", default="unknown", help="Model name used for the report.")
    parser.add_argument("--run-id", help="Stable run id for this evaluation.")
    parser.add_argument("--human-rating", type=float, help="Optional human rating, typically 1-5.")
    parser.add_argument(
        "--log-path",
        default=str(DEFAULT_LOG_PATH),
        help="JSONL path for appending evaluation records.",
    )
    parser.add_argument(
        "--no-log",
        action="store_true",
        help="Do not append this evaluation to the JSONL log.",
    )
    return parser.parse_args()


def load_trace(value: str | None) -> dict[str, Any] | None:
    if not value:
        return None

    stripped = value.strip()
    if stripped.startswith("{"):
        parsed = json.loads(stripped)
    else:
        parsed = json.loads(Path(value).read_text(encoding="utf-8"))

    if not isinstance(parsed, dict):
        raise ValueError("--trace-json must resolve to a JSON object")
    return parsed


def main() -> None:
    args = parse_args()
    report_markdown = Path(args.report_path).read_text(encoding="utf-8")
    result = evaluate_research_report(
        report_markdown,
        query=args.query,
        expected_topics=args.expected_topic,
        trace=load_trace(args.trace_json),
        model=args.model,
        run_id=args.run_id,
        human_rating=args.human_rating,
    )

    if not args.no_log:
        append_evaluation_log(result, args.log_path)

    print(json.dumps(result.to_dict(), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
