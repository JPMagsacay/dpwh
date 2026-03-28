import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { http } from '../api/http'

function Avatar({ url, name }) {
  if (url) return <img className="avatar" src={url} alt={name || 'photo'} />
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  return <div className="avatar avatar--fallback">{initials || '?'}</div>
}

export default function ArchiveProfiles() {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pageData, setPageData] = useState(null)

  const query = useMemo(() => q.trim(), [q])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get('/employee-profiles', {
        params: query ? { archived: true, q: query } : { archived: true },
      })
      setPageData(res.data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [query])

  async function onDelete(id) {
    const ok = window.confirm(
      'Warning: This will permanently delete the archived profile and related records. This action cannot be undone. Continue?'
    )
    if (!ok) return

    await http.delete(`/employee-profiles/${id}`)
    await load()
  }

  return (
    <div className="page2">
      <div className="page2__header">
        <div>
          <h1 className="h1">Archived Profiles</h1>
          <p className="p">Delete archived profiles permanently with warning confirmation.</p>
        </div>
        <Link className="btn" to="/profiling">
          ← Back to Active Profiles
        </Link>
      </div>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search archived profile…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? <div className="card2">Loading…</div> : null}
      {error ? <div className="card2 card2--error">Failed to load archived profiles.</div> : null}
      {!loading && pageData?.data?.length === 0 ? <div className="card2">No archived profiles.</div> : null}

      <div className="grid">
        {(pageData?.data || []).map((p) => (
          <div key={p.id} className="profileCard">
            <Avatar url={p.photo_url} name={p.full_name} />
            <div className="profileCard__body">
              <div className="profileCard__name">{p.full_name}</div>
              <div className="profileCard__meta">
                {p.position || '—'} · Salary: {Number(p.base_salary || 0).toLocaleString()}
              </div>
              <div className="actions">
                <button className="btn btn--danger" onClick={() => onDelete(p.id)}>
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

