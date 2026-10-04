# Video Downloader

A simple full-stack video download dashboard built with FastAPI and React + TypeScript.

> Only download media you own or are authorised to download, and comply with the source platform's terms of service and applicable law.

## Project layout

```text
backend/   FastAPI API and download worker
frontend/  React + TypeScript (Vite) dashboard
```

## Run locally

### 1. Start the API

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`; interactive API documentation is at `http://localhost:8000/docs`.

### 2. Start the web app

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (normally `http://localhost:5173`).

## Configuration

Copy `frontend/.env.example` to `frontend/.env` to point the web app at a different API URL. The default is `http://localhost:8000`.

Completed files are stored locally in `backend/downloads/`. Jobs are held in memory, so their history resets when the API restarts. This makes the starter easy to run; use a database and object storage before deploying it for multiple users.
