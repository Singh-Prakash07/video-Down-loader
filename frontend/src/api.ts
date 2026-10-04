import type { DownloadJob } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function readResponse<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>

  const payload = (await response.json().catch(() => null)) as { detail?: string } | null
  throw new Error(payload?.detail ?? 'The server could not complete that request.')
}

export async function createDownload(url: string, format_id: string): Promise<DownloadJob> {
  const response = await fetch(`${API_URL}/api/downloads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, format_id }),
  })
  return readResponse<DownloadJob>(response)
}

export async function getDownload(id: string): Promise<DownloadJob> {
  const response = await fetch(`${API_URL}/api/downloads/${id}`)
  return readResponse<DownloadJob>(response)
}

export function fileUrl(id: string): string {
  return `${API_URL}/api/downloads/${id}/file`
}
