import argparse

from agents.deep_research import (
    DEFAULT_RESEARCH_QUERY,
    DEFAULT_THREAD_ID,
    run_research,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the DeepSeek deep research agent.")
    parser.add_argument(
        "query",
        nargs="*",
        help="Research request. Defaults to the built-in LangGraph demo query.",
    )
    parser.add_argument(
        "--thread-id",
        default=DEFAULT_THREAD_ID,
        help="Conversation thread id for Deep Agents state.",
    )
    parser.add_argument(
        "--profile",
        default=None,
        help="Research profile id from research_profiles.yaml (defaults to catalog default).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    query = " ".join(args.query).strip() or DEFAULT_RESEARCH_QUERY

    print(run_research(query, thread_id=args.thread_id, profile_id=args.profile))


if __name__ == "__main__":
    main()
