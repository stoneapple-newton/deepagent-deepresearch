from collections.abc import Generator

from sqlmodel import Session

from api.database import engine


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
