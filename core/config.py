import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    tavily_api_key: str
    kimi_api_key: str
    kimi_model: str = "kimi-k2.5"
    langsmith_api_key: str
    langsmith_project: str = "deepagent_demo"


settings = Settings()

os.environ.setdefault("MOONSHOT_API_KEY", settings.kimi_api_key)
os.environ.setdefault("TAVILY_API_KEY", settings.tavily_api_key)
os.environ.setdefault("LANGSMITH_API_KEY", settings.langsmith_api_key)
os.environ.setdefault("LANGSMITH_PROJECT", settings.langsmith_project)
os.environ.setdefault("LANGSMITH_TRACING", "true")
