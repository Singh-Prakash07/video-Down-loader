import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createDownload, fileUrl, getDownload } from './api'
import type { DownloadJob } from './types'

const formats = [
  { value: 'best', label: 'Best available', hint: 'Highest quality provided by the source' },
  { value: 'bestvideo+bestaudio/best', label: 'Best video + audio', hint: 'May take longer to merge' },
  { value: 'best[height<=720]/best', label: 'Up to 720p', hint: 'A lighter, more compatible file' },
  { value: 'worstaudio/bestaudio', label: 'Audio only', hint: 'Best audio stream when available' },
]

function statusLabel(status: DownloadJob['status']): string {
  return status === 'queued' ? 'In queue' : status[0].toUpperCase() + status.slice(1)
}

function isActive(status: DownloadJob['status']): boolean {
  return status === 'queued' || status === 'downloading'
}

function App() {
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState('best')
  const [jobs, setJobs] = useState<DownloadJob[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const activeJobs = useMemo(() => jobs.filter((job) => isActive(job.status)), [jobs])

  useEffect(() => {
    if (!activeJobs.length) return

    const timer = window.setInterval(() => {
      activeJobs.forEach((job) => {
        getDownload(job.id)
          .then((updated) => {
            setJobs((current) => current.map((item) => (item.id === updated.id ? updated : item)))
          })
          .catch((pollError: unknown) => {
            setError(pollError instanceof Error ? pollError.message : 'Could not refresh a download.')
          })
      })
    }, 1200)

    return () => window.clearInterval(timer)
  }, [activeJobs])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Enter a valid http or https URL.')

      setSubmitting(true)
      const job = await createDownload(url, format)
      setJobs((current) => [job, ...current])
      setUrl('')
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Could not start the download.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page-shell">
      <header className="hero">
        <a className="brand" href="/" aria-label="Video Downloader home">
          <span className="brand-mark" aria-hidden="true">↓</span>
          <span>VIDEO<span>DROP</span></span>
        </a>
        <div className="hero-copy">
          <p className="eyebrow">LOCAL-FIRST DOWNLOADS</p>
          <h1>Save the videos<br /><em>you’re allowed to keep.</em></h1>
          <p className="intro">Paste a public video URL, choose the quality you need, and let your local download worker handle the rest.</p>
        </div>
        <div className="orb orb-one" aria-hidden="true" />
        <div className="orb orb-two" aria-hidden="true" />
      </header>

      <section className="download-panel" aria-labelledby="download-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">NEW DOWNLOAD</p>
            <h2 id="download-title">What would you like to save?</h2>
          </div>
          <span className="local-note"><i /> Saved on this computer</span>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="source-url">Video URL</label>
          <div className="url-row">
            <span className="link-icon" aria-hidden="true">↗</span>
            <input
              id="source-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/video"
              autoComplete="url"
              required
            />
          </div>

          <div className="format-header">
            <label htmlFor="quality">Quality</label>
            <span>Choose what suits this download</span>
          </div>
          <select id="quality" value={format} onChange={(event) => setFormat(event.target.value)}>
            {formats.map((option) => <option key={option.value} value={option.value}>{option.label} — {option.hint}</option>)}
          </select>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-footer">
            <p>By continuing, you confirm you have permission to download this media.</p>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Starting…' : <>Start download <span aria-hidden="true">↓</span></>}
            </button>
          </div>
        </form>
      </section>

      <section className="jobs-section" aria-labelledby="jobs-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR QUEUE</p>
            <h2 id="jobs-title">Recent downloads</h2>
          </div>
          <span className="job-count">{jobs.length} {jobs.length === 1 ? 'item' : 'items'}</span>
        </div>

        {jobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">↓</div>
            <h3>Your download queue is clear</h3>
            <p>New downloads will appear here with live progress.</p>
          </div>
        ) : (
          <div className="job-list">
            {jobs.map((job) => (
              <article className="job-card" key={job.id}>
                <div className={`status-dot ${job.status}`} aria-hidden="true" />
                <div className="job-content">
                  <div className="job-title-row">
                    <h3>{job.title ?? new URL(job.source_url).hostname}</h3>
                    <span className={`status status-${job.status}`}>{statusLabel(job.status)}</span>
                  </div>
                  <p className="source-url">{job.source_url}</p>
                  {isActive(job.status) && (
                    <div className="progress-wrap" aria-label={`${job.progress}% complete`}>
                      <div className="progress-bar"><span style={{ width: `${job.progress}%` }} /></div>
                      <span>{job.progress}%</span>
                    </div>
                  )}
                  {job.error && <p className="job-error">{job.error}</p>}
                </div>
                {job.status === 'complete' && (
                  <a className="save-button" href={fileUrl(job.id)}>Save file <span aria-hidden="true">↓</span></a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <footer>VideoDrop runs on your machine. No URLs are stored after the server restarts.</footer>
    </main>
  )
}

export default App
