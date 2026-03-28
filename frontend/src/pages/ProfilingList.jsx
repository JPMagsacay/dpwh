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

export default function ProfilingList() {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pageData, setPageData] = useState(null)

  const query = useMemo(() => q.trim(), [q])

  useEffect(() => {
    let ignore = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await http.get('/employee-profiles', { params: query ? { q: query } : {} })
        if (!ignore) setPageData(res.data)
      } catch (e) {
        if (!ignore) setError(e)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [query])

  return (
    <div className="page2">
      <div className="page2__header">
        <div>
          <h1 className="h1">Profiling</h1>
          <p className="p">Add and manage employee profiles (with photo, details, salary).</p>
        </div>
        <div className="page2__headerActions">
          <Link className="btn" to="/profiling/archive">
            Archive
          </Link>
          <Link className="btn btn--primary" to="/profiling/new">
            + Add profile
          </Link>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? <div className="card2">Loading…</div> : null}
      {error ? <div className="card2 card2--error">Failed to load profiles.</div> : null}

      {!loading && pageData?.data?.length === 0 ? <div className="card2">No profiles yet.</div> : null}

      <div className="grid">
        {(pageData?.data || []).map((p) => (
          <Link key={p.id} className="profileCard" to={`/profiling/${p.id}`}>
            <Avatar url={p.photo_url} name={p.full_name} />
            <div className="profileCard__body">
              <div className="profileCard__name">{p.full_name}</div>
              <div className="profileCard__meta">
                {p.position || '—'} · Salary: {Number(p.base_salary || 0).toLocaleString()}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

