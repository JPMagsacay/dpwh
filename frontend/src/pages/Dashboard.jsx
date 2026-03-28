import { useEffect, useMemo, useState } from 'react'
import { http } from '../api/http'
import './Dashboard.css'

function MiniBars({ items }) {
  const max = Math.max(1, ...items.map((x) => Number(x.total_salary || 0)))
  return (
    <div className="bars dashboardBars">
      {items.map((x) => {
        const v = Number(x.total_salary || 0)
        const h = Math.round((v / max) * 100)
        return (
          <div key={x.year} className="bars__item dashboardBars__item" title={`${x.year}: ${v.toLocaleString()}`}>
            <div className="bars__bar" style={{ height: `${h}%` }} />
            <div className="dashboardBars__value">₱{v.toLocaleString()}</div>
            <div className="bars__label">{x.year}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let ignore = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await http.get('/analytics/dashboard')
        if (!ignore) setData(res.data)
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
  }, [])

  const cards = useMemo(() => data?.cards || {}, [data])
  const salaryByYear = data?.salary_by_year || []
  const latestSalary = salaryByYear.length ? Number(salaryByYear[0]?.total_salary || 0) : 0
  const previousSalary = salaryByYear.length > 1 ? Number(salaryByYear[1]?.total_salary || 0) : 0
  const salaryDelta = latestSalary - previousSalary
  const salaryDeltaPct = previousSalary > 0 ? (salaryDelta / previousSalary) * 100 : 0

  return (
    <div className="page2 dashboardPage">
      <div className="page2__header">
        <div>
          <h1 className="h1">Dashboard</h1>
          <p className="p">Analytics overview for the system.</p>
        </div>
      </div>

      {loading ? <div className="card2">Loading…</div> : null}
      {error ? <div className="card2 card2--error">Failed to load analytics.</div> : null}

      {!loading && data ? (
        <>
          <div className="stats dashboardStats">
            <div className="stat dashboardStat">
              <div className="stat__label">Profiles</div>
              <div className="stat__value">{cards.profiles ?? 0}</div>
            </div>
            <div className="stat dashboardStat">
              <div className="stat__label">Present days ({data.year})</div>
              <div className="stat__value">{cards.present_days_year ?? 0}</div>
            </div>
            <div className="stat dashboardStat">
              <div className="stat__label">Presence coverage ({data.year})</div>
              <div className="stat__value">{cards.presence_coverage_year ?? 0}%</div>
            </div>
          </div>

          <div className="dashboardGrid">
            <div className="card2 dashboardCard">
              <div className="h2">Total salary by year</div>
              <p className="p">Based on saved yearly salary records.</p>
              {salaryByYear.length ? <MiniBars items={salaryByYear} /> : <div className="muted">No yearly salary data yet.</div>}
            </div>

            <div className="card2 dashboardCard">
              <div className="h2">Quick insights</div>
              <div className="dashboardInsightList">
                <div className="dashboardInsight">
                  <div className="dashboardInsight__label">Latest yearly total</div>
                  <div className="dashboardInsight__value">₱{latestSalary.toLocaleString()}</div>
                </div>
                <div className="dashboardInsight">
                  <div className="dashboardInsight__label">Previous yearly total</div>
                  <div className="dashboardInsight__value">₱{previousSalary.toLocaleString()}</div>
                </div>
                <div className="dashboardInsight">
                  <div className="dashboardInsight__label">Year-over-year change</div>
                  <div className={`dashboardInsight__value ${salaryDelta >= 0 ? 'dashboardInsight__value--up' : 'dashboardInsight__value--down'}`}>
                    {salaryDelta >= 0 ? '+' : '-'}₱{Math.abs(salaryDelta).toLocaleString()}
                    {previousSalary > 0 ? ` (${salaryDeltaPct >= 0 ? '+' : ''}${salaryDeltaPct.toFixed(1)}%)` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

