from core.config import settings

from tavily import TavilyClient

client = TavilyClient(api_key=settings.tavily_api_key)

response = client.search("What is LangChain?")
print(response["results"][0]["content"])
