export type DownloadStatus = 'queued' | 'downloading' | 'complete' | 'failed'

export interface DownloadJob {
  id: string
  source_url: string
  format_id: string
  status: DownloadStatus
  progress: number
  title: string | null
  filename: string | null
  error: string | null
  created_at: string
}
