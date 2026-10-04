from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class DownloadRequest(BaseModel):
    url: HttpUrl = Field(description="Public URL of the media page to download")
    format_id: str = Field(
        default="best",
        min_length=1,
        max_length=100,
        pattern=r"^[A-Za-z0-9._+\-/=\[\]<>:,()]+$",
        description="yt-dlp format selector, for example 'best' or 'bestvideo+bestaudio'",
    )


class DownloadJob(BaseModel):
    id: str
    source_url: str
    format_id: str
    status: Literal["queued", "downloading", "complete", "failed"]
    progress: int = Field(ge=0, le=100)
    title: str | None = None
    filename: str | None = None
    error: str | None = None
    created_at: datetime


class HealthCheck(BaseModel):
    status: str
