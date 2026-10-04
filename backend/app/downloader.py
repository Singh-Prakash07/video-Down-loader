"""In-memory jobs and the background yt-dlp worker."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from uuid import uuid4

from .schemas import DownloadJob, DownloadRequest

DOWNLOAD_DIRECTORY = Path(__file__).resolve().parents[1] / "downloads"
DOWNLOAD_DIRECTORY.mkdir(exist_ok=True)

_jobs: dict[str, DownloadJob] = {}
_lock = Lock()


def create_job(request: DownloadRequest) -> DownloadJob:
    job = DownloadJob(
        id=uuid4().hex,
        source_url=str(request.url),
        format_id=request.format_id,
        status="queued",
        progress=0,
        created_at=datetime.now(UTC),
    )
    with _lock:
        _jobs[job.id] = job
    return job


def get_job(job_id: str) -> DownloadJob | None:
    with _lock:
        job = _jobs.get(job_id)
        return job.model_copy(deep=True) if job else None


def _update_job(job_id: str, **changes: object) -> None:
    with _lock:
        job = _jobs[job_id]
        _jobs[job_id] = job.model_copy(update=changes)


def get_download_path(job: DownloadJob) -> Path | None:
    if not job.filename:
        return None

    path = (DOWNLOAD_DIRECTORY / job.filename).resolve()
    # Do not ever serve a path outside the application's download directory.
    if DOWNLOAD_DIRECTORY.resolve() not in path.parents:
        return None
    return path


def process_download(job_id: str) -> None:
    """Run a single yt-dlp request in FastAPI's background worker."""
    try:
        import yt_dlp

        _update_job(job_id, status="downloading", progress=1)

        def on_progress(update: dict[str, object]) -> None:
            if update.get("status") != "downloading":
                return
            total = update.get("total_bytes") or update.get("total_bytes_estimate")
            downloaded = update.get("downloaded_bytes", 0)
            if isinstance(total, int) and total > 0 and isinstance(downloaded, int):
                _update_job(job_id, progress=min(99, max(1, round(downloaded / total * 100))))

        job = get_job(job_id)
        if not job:
            return

        options: dict[str, object] = {
            "format": job.format_id,
            "outtmpl": str(DOWNLOAD_DIRECTORY / "%(title).160B-%(id)s.%(ext)s"),
            "noplaylist": True,
            "restrictfilenames": True,
            "progress_hooks": [on_progress],
            "quiet": True,
            "no_warnings": True,
        }
        with yt_dlp.YoutubeDL(options) as downloader:
            info = downloader.extract_info(job.source_url, download=True)
            filename = Path(downloader.prepare_filename(info)).name

        _update_job(
            job_id,
            status="complete",
            progress=100,
            title=str(info.get("title") or "Untitled video"),
            filename=filename,
        )
    except Exception as exc:  # The error is deliberately exposed as a user-facing job status.
        _update_job(job_id, status="failed", error=str(exc)[:500])
