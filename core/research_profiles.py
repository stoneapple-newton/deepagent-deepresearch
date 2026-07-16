from __future__ import annotations

from pathlib import Path
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator
import yaml

from core.config import settings


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class ResearchProfileError(RuntimeError):
    """Raised when the research profile catalog cannot be loaded."""


class ResearchProfile(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str = Field(pattern=r"^[a-z][a-z0-9_-]*$")
    label: str = Field(min_length=1)
    description: str = Field(min_length=1)
    max_llm_calls: int = Field(ge=1)
    max_search_calls: int = Field(ge=1)
    max_subagent_calls: int = Field(ge=1)
    max_research_rounds: int = Field(ge=1)
    recursion_limit: int = Field(ge=2)


class ResearchProfileCatalog(BaseModel):
    model_config = ConfigDict(frozen=True)

    version: int = Field(ge=1)
    default_profile: str
    profiles: tuple[ResearchProfile, ...] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_profile_ids(self) -> Self:
        ids = [profile.id for profile in self.profiles]
        if len(ids) != len(set(ids)):
            raise ValueError("Research profile ids must be unique")
        if self.default_profile not in ids:
            raise ValueError(
                f"default_profile {self.default_profile!r} is not present in profiles"
            )
        return self

    def get(self, profile_id: str | None = None) -> ResearchProfile:
        requested = profile_id or self.default_profile
        for profile in self.profiles:
            if profile.id == requested:
                return profile
        available = ", ".join(profile.id for profile in self.profiles)
        raise KeyError(f"Unknown research profile {requested!r}. Available: {available}")


def research_profiles_path() -> Path:
    configured = Path(settings.research_profiles_path).expanduser()
    return configured if configured.is_absolute() else PROJECT_ROOT / configured


def load_research_profiles(path: str | Path | None = None) -> ResearchProfileCatalog:
    catalog_path = Path(path) if path is not None else research_profiles_path()
    try:
        raw = yaml.safe_load(catalog_path.read_text(encoding="utf-8"))
        return ResearchProfileCatalog.model_validate(raw)
    except (OSError, yaml.YAMLError, ValueError) as exc:
        raise ResearchProfileError(
            f"Unable to load research profiles from {catalog_path}: {exc}"
        ) from exc


def get_research_profile(profile_id: str | None = None) -> ResearchProfile:
    return load_research_profiles().get(profile_id)
