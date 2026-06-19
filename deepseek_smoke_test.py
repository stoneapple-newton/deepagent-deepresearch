from core.config import settings

from langchain_deepseek import ChatDeepSeek

llm = ChatDeepSeek(
    model=settings.deepseek_model,
    temperature=0.7,
    api_key=settings.deepseek_api_key,
)

response = llm.invoke("Hello, DeepSeek! What can you do?")
print(response.content)
