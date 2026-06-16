from deepagents import create_deep_agent
from langchain_moonshot import ChatMoonshot
from langgraph.checkpoint.memory import MemorySaver

from core.config import settings


def main() -> None:
    model = ChatMoonshot(
        model=settings.kimi_model,
        temperature=0.6,
        api_key=settings.kimi_api_key,
    )

    agent = create_deep_agent(
        model=model,
        system_prompt="You are a helpful assistant running on the Kimi (Moonshot) model.",
        checkpointer=MemorySaver(),
    )

    config = {"configurable": {"thread_id": "demo-thread"}}
    result = agent.invoke(
        {"messages": [{"role": "user", "content": "Hello! What model are you?"}]},
        config=config,
    )

    print(result["messages"][-1].content)


if __name__ == "__main__":
    main()
