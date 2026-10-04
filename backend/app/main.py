from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .downloader import create_job, get_download_path, get_job, process_download
from .schemas import DownloadJob, DownloadRequest, HealthCheck

app = FastAPI(
    title="Video Downloader API",
    version="0.1.0",
    description="Create and track local media download jobs.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthCheck, tags=["system"])
def health_check() -> HealthCheck:
    return HealthCheck(status="ok")


@app.post("/api/downloads", response_model=DownloadJob, status_code=202, tags=["downloads"])
def start_download(request: DownloadRequest, background_tasks: BackgroundTasks) -> DownloadJob:
    job = create_job(request)
    background_tasks.add_task(process_download, job.id)
    return job


@app.get("/api/downloads/{job_id}", response_model=DownloadJob, tags=["downloads"])
def read_download(job_id: str) -> DownloadJob:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Download job not found")
    return job


@app.get("/api/downloads/{job_id}/file", tags=["downloads"])
def retrieve_file(job_id: str) -> FileResponse:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Download job not found")
    if job.status != "complete":
        raise HTTPException(status_code=409, detail="This download is not complete yet")

    file_path = get_download_path(job)
    if not file_path or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Downloaded file could not be found")
    return FileResponse(path=file_path, filename=Path(job.filename or "download").name)
