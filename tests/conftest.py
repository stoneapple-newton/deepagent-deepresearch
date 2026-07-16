import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool

# Must monkeypatch the database URL before importing the app
import core.config

core.config.settings.database_url = "sqlite:///:memory:"

from api.main import app  # noqa: E402
from api.deps import get_session  # noqa: E402

# Override the engine with an in-memory one
_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


def override_get_session():
    with Session(_test_engine) as session:
        yield session


app.dependency_overrides[get_session] = override_get_session


@pytest.fixture(scope="function")
def client():
    SQLModel.metadata.create_all(_test_engine)
    with TestClient(app) as c:
        yield c
    SQLModel.metadata.drop_all(_test_engine)


@pytest.fixture(scope="function")
def db_session(client):
    with Session(_test_engine) as session:
        yield session
