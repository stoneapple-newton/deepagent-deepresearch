from sqlalchemy import inspect, text
from sqlmodel import SQLModel, create_engine

from core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, echo=False, connect_args=connect_args)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    _add_missing_sqlite_columns()


def _add_missing_sqlite_columns() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "research_session" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("research_session")}
    columns = {
        "model": "VARCHAR",
        "max_llm_calls": "INTEGER DEFAULT 40 NOT NULL",
        "llm_calls_used": "INTEGER DEFAULT 0 NOT NULL",
        "research_profile": "VARCHAR DEFAULT 'standard' NOT NULL",
        "max_search_calls": "INTEGER DEFAULT 10 NOT NULL",
        "search_calls_used": "INTEGER DEFAULT 0 NOT NULL",
        "max_subagent_calls": "INTEGER DEFAULT 4 NOT NULL",
        "subagent_calls_used": "INTEGER DEFAULT 0 NOT NULL",
        "max_research_rounds": "INTEGER DEFAULT 2 NOT NULL",
        "recursion_limit": "INTEGER DEFAULT 80 NOT NULL",
        "steering_instructions": "JSON DEFAULT '[]' NOT NULL",
        "last_steering_at": "DATETIME",
    }
    with engine.begin() as connection:
        for name, ddl in columns.items():
            if name not in existing:
                connection.execute(text(f"ALTER TABLE research_session ADD COLUMN {name} {ddl}"))
