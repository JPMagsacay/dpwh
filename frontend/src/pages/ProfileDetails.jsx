import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import { http } from '../api/http'
import './ProfileDetails.css'

/* =========================
   TAB COMPONENT
========================= */
function Tab({ to, children, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => (isActive ? 'tab tab--active' : 'tab')}
    >
      {children}
    </NavLink>
  )
}

/* =========================
   AVATAR COMPONENT
========================= */
function Avatar({ url, name }) {
  if (url) return <img className="avatar avatar--lg" src={url} alt={name || 'photo'} />
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  return <div className="avatar avatar--lg avatar--fallback">{initials || '?'}</div>
}

/** Amount earned for one attendance row (uses rate locked when the day was saved). */
function dayEarnedFromRecord(r, profileBaseSalary) {
  if (!r.present) return 0
  const raw = r.daily_rate != null && r.daily_rate !== '' ? Number(r.daily_rate) : Number(profileBaseSalary || 0)
  return Number.isFinite(raw) ? raw : 0
}

/* =========================
   ATTENDANCE PANEL
========================= */
function AttendancePanel({ profileId, baseSalary }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [present, setPresent] = useState(true)
  const [records, setRecords] = useState([])
  const [allRecords, setAllRecords] = useState([])
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [rangeLoading, setRangeLoading] = useState(false)
  
  // Quick add form states
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newPresent, setNewPresent] = useState(true)
  const [addLoading, setAddLoading] = useState(false)
  
  // Success message state
  const [successMessage, setSuccessMessage] = useState(null)

  async function load() {
    setLoading(true)
    const [yearRes, allRes] = await Promise.all([
      http.get(`/employee-profiles/${profileId}/attendance`, { params: { year } }),
      http.get(`/employee-profiles/${profileId}/attendance`, { params: { all: true } }),
    ])
    setRecords(yearRes.data.records || [])
    setAllRecords(allRes.data.records || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [year, profileId])

  const presentCount = useMemo(() => records.filter((r) => r.present).length, [records])
  const totalCount = records.length

  const currentSalary = useMemo(() => {
    return Number(
      records.reduce((sum, r) => sum + dayEarnedFromRecord(r, baseSalary), 0).toFixed(2)
    )
  }, [records, baseSalary])

  const availableYears = useMemo(() => {
    const years = new Set(
      allRecords
        .map((r) => Number(String(r.date).slice(0, 4)))
        .filter((y) => Number.isFinite(y) && y > 0)
    )
    years.add(new Date().getFullYear())
    years.add(year)
    return Array.from(years).sort((a, b) => b - a)
  }, [allRecords, year])

  useEffect(() => {
    if (!availableYears.length) return
    if (!availableYears.includes(reportYear)) {
      setReportYear(availableYears[0])
    }
  }, [availableYears, reportYear])

  const reportDailyRows = useMemo(() => {
    return allRecords
      .filter((r) => Number(String(r.date).slice(0, 4)) === Number(reportYear))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((r) => ({
        ...r,
        dailySalary: dayEarnedFromRecord(r, baseSalary),
      }))
  }, [allRecords, reportYear, baseSalary])

  const monthlyTotals = useMemo(() => {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]

    const totals = Array.from({ length: 12 }, (_, i) => ({
      month: monthNames[i],
      total: 0,
    }))

    reportDailyRows.forEach((r) => {
      const m = new Date(r.date).getMonth()
      if (m >= 0 && m < 12) {
        totals[m].total += Number(r.dailySalary || 0)
      }
    })

    return totals.filter((m) => m.total > 0)
  }, [reportDailyRows])

  const yearlyTotals = useMemo(() => {
    const map = new Map()
    allRecords.forEach((r) => {
      const y = Number(String(r.date).slice(0, 4))
      const prev = map.get(y) || 0
      map.set(y, prev + dayEarnedFromRecord(r, baseSalary))
    })

    return Array.from(map.entries())
      .map(([y, total]) => ({ year: y, total }))
      .sort((a, b) => b.year - a.year)
  }, [allRecords, baseSalary])

  const reportYearTotal = useMemo(
    () => reportDailyRows.reduce((sum, r) => sum + Number(r.dailySalary || 0), 0),
    [reportDailyRows]
  )

  const sortedDailyForYear = useMemo(() => {
    return [...records].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [records])

  async function upsert(e) {
    e.preventDefault()
    if (!startDate || !endDate) return
    
    const today = new Date().toISOString().slice(0, 10)
    if (startDate > today || endDate > today) return
    if (startDate > endDate) return
    
    setRangeLoading(true)
    try {
      const response = await http.post(`/employee-profiles/${profileId}/attendance/present-range`, {
        start_date: startDate,
        end_date: endDate,
        include_weekends: false // Automatically exclude weekends
      })
      
      // Show success message with salary info
      const data = response.data
      setSuccessMessage({
        totalDays: data.total_days,
        workingDays: data.working_days,
        weekendDays: data.weekend_days,
        salary: data.salary_for_range,
        startDate: data.start_date,
        endDate: data.end_date,
        weekendDates: data.weekend_dates
      })
      
      setStartDate('')
      setEndDate('')
      await load()
    } catch (error) {
      console.error('Error marking attendance range:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Error marking attendance range. Please try again.'
      alert(errorMessage)
    } finally {
      setRangeLoading(false)
    }
  }

  function calculateWorkingDays(start, end) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    let workingDays = 0
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
        workingDays++
      }
    }
    
    return workingDays
  }

  const estimatedSalary = useMemo(() => {
    if (!baseSalary || !startDate || !endDate) return 0
    const workingDays = calculateWorkingDays(startDate, endDate)
    return Number(baseSalary) * workingDays
  }, [baseSalary, startDate, endDate])

  async function addNewRecord() {
    if (!newDate) return
    
    const today = new Date().toISOString().slice(0, 10)
    if (newDate > today) return
    
    setAddLoading(true)
    try {
      await http.post(`/employee-profiles/${profileId}/attendance`, {
        date: newDate,
        present: newPresent
      })
      setNewDate('')
      setNewPresent(true)
      setShowAddForm(false)
      await load()
    } catch (error) {
      console.error('Error adding attendance record:', error)
    } finally {
      setAddLoading(false)
    }
  }

  async function remove(id) {
    await http.delete(`/employee-profiles/${profileId}/attendance/${id}`)
    await load()
  }

  return (
    <div className="card2">
      <div className="attendancePanel__header">
        <div className="attendancePanel__titleRow">
          <h2 className="h2 attendancePanel__h2">Attendance</h2>
          <label className="attendancePanel__yearPick">
            <span className="attendancePanel__yearPickLabel">Calendar year</span>
            <select
              className="input attendancePanel__yearSelect"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="attendancePanel__stats">
          <span>
            <strong>{presentCount}</strong> present / <strong>{totalCount}</strong> days in list
          </span>
          <span className="attendancePanel__statsSep" aria-hidden="true">
            ·
          </span>
          <span>
            Year total (locked daily rates): <strong>₱{Number(currentSalary).toLocaleString()}</strong>
          </span>
        </div>
        <p className="p attendancePanel__hint">
          Each day stores the employment status from your profile when the record was saved. Use the Salary tab for
          yearly totals by status.
        </p>
      </div>

      <div className="attendancePanel__section">
        <h3 className="attendancePanel__sectionTitle">Mark working days present (range)</h3>
        <p className="p attendancePanel__sectionDesc">
          Weekends are skipped unless you use a future option to include them. Dates must not be after today.
        </p>
      <form className="inlineForm attendancePanel__rangeForm" onSubmit={upsert}>
        <div className="dateRangeInputs">
          <input
            className="input"
            type="date"
            value={startDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              const nextDate = e.target.value
              setStartDate(nextDate)
              if (nextDate) {
                setYear(new Date(nextDate).getFullYear())
              }
            }}
            placeholder="Start date"
            required
          />
          <span className="dateRangeSeparator">to</span>
          <input
            className="input"
            type="date"
            value={endDate}
            min={startDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              const nextDate = e.target.value
              setEndDate(nextDate)
              if (nextDate) {
                setYear(new Date(nextDate).getFullYear())
              }
            }}
            placeholder="End date"
            required
          />
        </div>
        
        {startDate && endDate && (
          <div className="workingDaysInfo">
            <span className="muted">
              Working days: {calculateWorkingDays(startDate, endDate)} 
              (weekends excluded)
            </span>
            <span className="muted">
              Estimated salary: ₱{Number(estimatedSalary).toLocaleString()}
            </span>
          </div>
        )}
        
        <button 
          className="btn btn--primary" 
          disabled={rangeLoading || !startDate || !endDate}
        >
          {rangeLoading ? 'Saving...' : 'Mark range present'}
        </button>
      </form>
      </div>

      {loading ? <div className="muted">Loading…</div> : null}
      
      {successMessage && (
        <div className="successMessage">
          <div className="successMessage__content">
            <h4>✅ Attendance Range Successfully Marked!</h4>
            <div className="successMessage__details">
              <div><strong>Date Range:</strong> {successMessage.startDate} to {successMessage.endDate}</div>
              <div><strong>Total Days:</strong> {successMessage.totalDays}</div>
              <div><strong>Working Days:</strong> {successMessage.workingDays}</div>
              {successMessage.weekendDays > 0 && (
                <div style={{color: '#dc2626'}}>
                  <strong>Weekend Days:</strong> {successMessage.weekendDays} (No salary)
                </div>
              )}
              <div>
                <strong>Attendance-based amount (this range):</strong> ₱{Number(successMessage.salary).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                This is not saved to yearly records until you use the Salary tab and click Save.
              </div>
              {successMessage.weekendDays > 0 && (
                <div style={{fontSize: '12px', color: '#6b7280', marginTop: '8px'}}>
                  💡 Weekends automatically excluded from salary calculation
                </div>
              )}
            </div>
            <button className="btn btn--sm" onClick={() => setSuccessMessage(null)}>Dismiss</button>
          </div>
        </div>
      )}

      <div className="attendancePanel__section">
        <h3 className="attendancePanel__sectionTitle">Daily records — {year}</h3>
        <p className="p attendancePanel__sectionDesc">Sorted by date. Employment status is locked per day when saved.</p>
      <div className="attendancePanel__tableWrap">
      <div className="table table--salary">
        <div className="table__head">
          <div>Date</div>
          <div>Presence</div>
          <div>Emp. status (recorded)</div>
          <div>Daily ₱</div>
          <div className="table__actions">
            <button type="button" className="btn btn--sm btn--primary" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Close' : '+ Add day'}
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="table__row table__row--add">
            <div>
              <input
                className="input input--sm"
                type="date"
                value={newDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setNewDate(e.target.value)}
                placeholder="Date"
              />
            </div>
            <div>
              <label className="check check--sm">
                <input
                  type="checkbox"
                  checked={newPresent}
                  onChange={(e) => setNewPresent(e.target.checked)}
                />{' '}
                Present
              </label>
            </div>
            <div className="muted table__cellMuted">From profile when saved</div>
            <div className="muted table__cellMuted">—</div>
            <div className="table__actions">
              <button type="button" className="btn btn--sm btn--primary" onClick={addNewRecord} disabled={!newDate}>
                Save
              </button>
              <button type="button" className="btn btn--sm" onClick={() => {
                setShowAddForm(false)
                setNewDate('')
                setNewPresent(true)
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {sortedDailyForYear.map((r) => (
          <div key={r.id} className="table__row">
            <div>{String(r.date).slice(0, 10)}</div>
            <div>
              <span className={r.present ? 'attendancePanel__badge attendancePanel__badge--present' : 'attendancePanel__badge attendancePanel__badge--absent'}>
                {r.present ? 'Present' : 'Absent'}
              </span>
            </div>
            <div title="Status stored on this attendance row">{r.employment_status_snapshot || '—'}</div>
            <div>₱{Number(dayEarnedFromRecord(r, baseSalary)).toLocaleString()}</div>
            <div className="table__actions">
              <button type="button" className="btn btn--sm" onClick={() => remove(r.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {!sortedDailyForYear.length && !showAddForm ? (
          <div className="attendancePanel__empty">No attendance rows for {year}. Add a day or use a date range above.</div>
        ) : null}
      </div>
      </div>
      </div>

      <div className="card2 attendanceReportPrint">
        <div className="row no-print">
          <div className="row__left">
            <div className="h2">Attendance Salary Report</div>
            <div className="p">
              Each day uses the daily rate from when it was recorded. Editing the profile rate does not change past days;
              new attendance uses the latest rate.
            </div>
          </div>
          <div className="row__right inlineForm">
            <select
              className="input"
              value={reportYear}
              onChange={(e) => setReportYear(Number(e.target.value))}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn--primary" onClick={() => window.print()}>
              Print Attendance Report
            </button>
          </div>
        </div>

        <div className="attendanceReport__title">Attendance Salary Report - {reportYear}</div>

        <table className="attendanceReport__table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Presence</th>
              <th>Emp. status (recorded)</th>
              <th>Daily salary</th>
            </tr>
          </thead>
          <tbody>
            {reportDailyRows.map((r) => (
              <tr key={r.id}>
                <td>{String(r.date).slice(0, 10)}</td>
                <td>{r.present ? 'Present' : 'Absent'}</td>
                <td>{r.employment_status_snapshot || '—'}</td>
                <td>₱{Number(r.dailySalary).toLocaleString()}</td>
              </tr>
            ))}
            {!reportDailyRows.length ? (
              <tr>
                <td colSpan="4">No attendance records for {reportYear}.</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div className="attendanceReport__summary">
          <div className="h2">Monthly Totals ({reportYear})</div>
          <table className="attendanceReport__table attendanceReport__table--compact">
            <thead>
              <tr>
                <th>Month</th>
                <th>Total Salary</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTotals.map((m) => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td>₱{Number(m.total).toLocaleString()}</td>
                </tr>
              ))}
              <tr>
                <th>Year Total</th>
                <th>₱{Number(reportYearTotal).toLocaleString()}</th>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="attendanceReport__summary">
          <div className="h2">Yearly Totals</div>
          <table className="attendanceReport__table attendanceReport__table--compact">
            <thead>
              <tr>
                <th>Year</th>
                <th>Total Salary</th>
              </tr>
            </thead>
            <tbody>
              {yearlyTotals.map((y) => (
                <tr key={y.year}>
                  <td>{y.year}</td>
                  <td>₱{Number(y.total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* =========================
   SALARY PANEL
========================= */
function SalaryPanel({ profileId, baseSalary, currentStatus }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [salary, setSalary] = useState(String(baseSalary ?? 0))
  const [records, setRecords] = useState([])
  const [attendanceBasedMin, setAttendanceBasedMin] = useState(null)
  const [salaryError, setSalaryError] = useState('')
  const [recordedStatus, setRecordedStatus] = useState(() => String(currentStatus || ''))
  const salarySegmentRef = useRef(`${year}|${String(currentStatus || '').trim()}`)

  useEffect(() => {
    setRecordedStatus(String(currentStatus || ''))
  }, [profileId, currentStatus])

  const effectiveEmploymentStatus = useMemo(() => {
    const typed = String(recordedStatus || '').trim()
    return typed !== '' ? typed : String(currentStatus || '').trim()
  }, [recordedStatus, currentStatus])

  const statusSuggestions = useMemo(() => {
    const s = new Set()
    if (currentStatus) s.add(String(currentStatus))
    records.forEach((r) => {
      const v = r.employment_status_snapshot
      if (v) s.add(String(v))
    })
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [records, currentStatus])

  async function load() {
    const res = await http.get(`/employee-profiles/${profileId}/yearly-salary`)
    const loaded = res.data.records || []


    setRecords(loaded)
  }

  useEffect(() => {
    load()
  }, [profileId])

  useEffect(() => {
    async function syncSalaryInputFromAttendance() {
      setSalaryError('')
      const existing = records.find(
        (r) =>
          Number(r.year) === Number(year) &&
          String(r.employment_status_snapshot || '') === effectiveEmploymentStatus
      )

      const res = await http.get(`/employee-profiles/${profileId}/attendance`, { params: { year } })
      const rows = res.data.records || []
      const attendanceTotal = Number(
        rows
          .filter((r) => {
            if (!r.present) return false
            return String(r.employment_status_snapshot ?? '') === effectiveEmploymentStatus
          })
          .reduce((sum, r) => sum + dayEarnedFromRecord(r, baseSalary), 0)
          .toFixed(2)
      )
      const presentCount = rows.filter(
        (r) => r.present && String(r.employment_status_snapshot ?? '') === effectiveEmploymentStatus
      ).length
      const hasPresent = presentCount > 0
      setAttendanceBasedMin(hasPresent ? attendanceTotal : null)

      const saved = existing ? Number(existing.salary ?? 0) : 0
      const floor = Math.max(attendanceTotal, saved)
      const segmentKey = `${year}|${effectiveEmploymentStatus}`
      const segmentChanged = salarySegmentRef.current !== segmentKey
      salarySegmentRef.current = segmentKey

      if (segmentChanged) {
        setSalary(String(floor.toFixed(2)))
        return
      }

      setSalary((prev) => {
        const prevNum = Number(prev || 0)
        const next = Math.max(prevNum, floor)
        return String(next.toFixed(2))
      })
    }

    syncSalaryInputFromAttendance()
  }, [year, profileId, baseSalary, records, effectiveEmploymentStatus])

  async function upsert(e) {
    e.preventDefault()
    const salaryNumber = Number(salary || 0)
    if (
      attendanceBasedMin !== null &&
      Number.isFinite(salaryNumber) &&
      salaryNumber < attendanceBasedMin
    ) {
      setSalaryError(
        `For ${year} (${effectiveEmploymentStatus || 'status'}), minimum allowed is ${attendanceBasedMin.toLocaleString()}`
      )
      return
    }

    if (!effectiveEmploymentStatus) {
      setSalaryError('Enter employment status for this salary record (or set it on the profile).')
      return
    }

    try {
      setSalaryError('')
      await http.post(`/employee-profiles/${profileId}/yearly-salary`, {
        year,
        salary,
        employment_status: recordedStatus.trim(),
      })
      await load()
    } catch (err) {
      const msg = err?.response?.data?.errors?.salary?.[0] || err?.response?.data?.message
      if (msg) setSalaryError(String(msg))
      else throw err
    }
  }

  async function remove(id) {
    await http.delete(`/employee-profiles/${profileId}/yearly-salary/${id}`)
    await load()
  }

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      if (Number(b.year) !== Number(a.year)) return Number(b.year) - Number(a.year)
      return String(a.employment_status_snapshot || '').localeCompare(String(b.employment_status_snapshot || ''))
    })
  }, [records])

  return (
    <div className="card2">
      <div className="h2">Yearly salary records</div>
      {attendanceBasedMin !== null ? (
        <div className="p">
          Attendance-based amount for {year} and status “{effectiveEmploymentStatus || '—'}” (only present days whose
          recorded status matches exactly; cannot save below this; you may increase it): ₱
          {attendanceBasedMin.toLocaleString()}
        </div>
      ) : (
        <div className="p">
          No present attendance days for {year} with recorded status “{effectiveEmploymentStatus || '—'}” yet. You may
          save any salary amount (including 0).
        </div>
      )}
      <div className="p">
        Choose the <strong>employment status for this row</strong> before saving (it can differ from the profile’s
        current value). Each unique <strong>year + status</strong> is its own record. Attendance totals use only days
        stamped with that same status when the day was marked present.
      </div>

      <form className="salaryPanelForm" onSubmit={upsert}>
        <div className="salaryPanelForm__fields">
          <label className="salaryPanelForm__label">
            <span className="salaryPanelForm__caption">Recorded employment status</span>
            <input
              className="input"
              list={`salary-status-${profileId}`}
              value={recordedStatus}
              onChange={(e) => setRecordedStatus(e.target.value)}
              placeholder="e.g. Permanent, Contractual"
              autoComplete="off"
            />
            <datalist id={`salary-status-${profileId}`}>
              {statusSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
        </div>
        <div className="inlineForm salaryPanelForm__row">
          <input
            className="input"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            title="Year"
          />
          <input
            className="input"
            type="number"
            min={attendanceBasedMin ?? 0}
            step="0.01"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            title="Salary amount"
          />
          <span className="salary-current-display">
            Current: {(() => {
              const status = String(effectiveEmploymentStatus || '').toLowerCase().trim()
              const currentSalary = Number(baseSalary || 0)
              
              if (status === 'permanent') {
                return `${currentSalary.toLocaleString()}/annum`
              } else if (status === 'casual') {
                return `${currentSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}/day`
              } else {
                return currentSalary.toLocaleString()
              }
            })()}
          </span>
          <button type="submit" className="btn btn--primary">
            Save yearly salary
          </button>
        </div>
      </form>
      {salaryError ? <div className="alert">{salaryError}</div> : null}

      <div className="table table--yearly-salary">
        <div className="table__head">
          <div>Year</div>
          <div>Employment status</div>
          <div>Salary</div>
          <div />
        </div>

        {sortedRecords.map((r) => (
          <div key={r.id} className="table__row">
            <div>{r.year}</div>
            <div>{r.employment_status_snapshot || '—'}</div>
            <div>{Number(r.salary).toLocaleString()}</div>
            <div>
              <button type="button" className="btn btn--sm" onClick={() => remove(r.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* =========================
   PRINT PANEL
========================= */
function PrintPanel({ profile }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const yearlyRecords = useMemo(() => {
    const records = Array.isArray(profile?.yearly_salary_records) ? profile.yearly_salary_records : []
    return [...records].sort((a, b) => {
      if (Number(b.year || 0) !== Number(a.year || 0)) return Number(b.year || 0) - Number(a.year || 0)
      return String(a.employment_status_snapshot || '').localeCompare(String(b.employment_status_snapshot || ''))
    })
  }, [profile])

  const profileDesignationLabel = useMemo(() => {
    const d = String(profile?.designation || '').trim()
    const p = String(profile?.position || '').trim()
    return d || p || ''
  }, [profile])

  if (!profile) return null

  return (
    <div className="print-area">
      <div className="sr-container">

        {/* HEADER */}
        <div className="sr-header">
          <img src="/dpwh-logo.png" alt="logo" className="logo" />
          <div className="header-text">
            <div className="header-text__small">Republic of the Philippines</div>
            <div className="header-text__dept">DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS</div>
            <div className="header-text__dept">OFFICE OF THE DISTRICT ENGINEER</div>
            <div className="header-text__line">Cagayan de Oro 1st District Engineering Office</div>
            <div className="header-text__line">10th Regional Equipment Services Compound</div>
            <div className="header-text__line">Bulua, Cagayan de Oro City</div>
          </div>
        </div>

        <div className="sr-title-block">
          <div className="title">SERVICE RECORD</div>
          <div className="subtitle">(To Be Accomplished By Employer)</div>
        </div>

        {/* NAME + BIRTH */}
        <table className="sr-info">
          <tbody>
            <tr>
              <td className="label">NAME</td>
              <td className="line">{profile.surname || 'N/A'}</td>
              <td className="line">{profile.given_name || 'N/A'}</td>
              <td className="line">{profile.middle_name || 'N/A'}</td>
              <td className="note">(If married woman, give also full maiden name)</td>
            </tr>
            <tr className="sub">
              <td></td>
              <td>(Surname)</td>
              <td>(Given Name)</td>
              <td>(Middle Name)</td>
              <td></td>
            </tr>
            <tr>
              <td className="label">BIRTH</td>
              <td className="line">{formatDate(profile.birth_date)}</td>
              <td className="line" colSpan="2">{profile.address || 'N/A'}</td>
              <td className="note">
                (Data herein should be checked from birth or baptismal certificate or other reliable documents)
              </td>
            </tr>
            <tr className="sub">
              <td></td>
              <td>(Date)</td>
              <td colSpan="2">(Place)</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <p className="sr-desc">
          The employee named above actually rendered services in this Office as shown by the
          service records and other papers actually issued by this Office and approved by
          authorities concerned.
        </p>

        {/* MAIN TABLE */}
        <table className="sr-table">
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '8.5%' }} />
            <col style={{ width: '8.5%' }} />
          </colgroup>
          <thead>
            <tr>
              <th colSpan="2">SERVICE<br /><span>(Inclusive Dates)</span></th>
              <th colSpan="3">RECORD OF APPOINTMENT</th>
              <th colSpan="2">OFFICE ENTITY/DIVISION</th>
              <th>Leave Absence w/o Pay</th>
              <th colSpan="2">SEPARATION</th>
            </tr>
            <tr>
              <th>FROM</th>
              <th>TO</th>
              <th>Designation</th>
              <th>Status</th>
              <th>Salary</th>
              <th>Station/Place of Assignment</th>
              <th>Branch</th>
              <th></th>
              <th>Date</th>
              <th>Cause</th>
            </tr>
          </thead>

          <tbody>
            {yearlyRecords.map((r) => (
              <tr key={r.id}>
                <td>{r.year ? `01/01/${r.year}` : 'N/A'}</td>
                <td>{r.year ? `12/31/${r.year}` : 'N/A'}</td>
                <td>
                  {String(r.designation_snapshot || '').trim() || profileDesignationLabel || 'N/A'}
                </td>
                <td>{r.employment_status_snapshot || 'N/A'}</td>
                <td>
                  {r.salary ? (
                    (() => {
                      const status = String(r.employment_status_snapshot || '').toLowerCase().trim()
                      const salaryAmount = Number(r.salary).toLocaleString()
                      
                      if (status === 'permanent') {
                        return `${salaryAmount}/annum`
                      } else if (status === 'casual') {
                        return `${Number(r.salary).toLocaleString(undefined, { maximumFractionDigits: 2 })}/day`
                      } else {
                        return salaryAmount
                      }
                    })()
                  ) : 'N/A'}
                </td>
                <td>{r.station_place_of_assignment_snapshot || 'N/A'}</td>
                <td>{r.branch_snapshot || 'N/A'}</td>
                <td>None</td>
                <td>{r.separation_date_snapshot ? formatDate(r.separation_date_snapshot) : ''}</td>
                <td>{r.separation_cause_snapshot || ''}</td>
              </tr>
            ))}
            {!yearlyRecords.length && (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center' }}>
                  No yearly salary records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* FOOTER */}
        <div className="sr-footer">
          <p>
            Issued in compliance with Executive Order No. 54 dated August 10, 1954 and in
            accordance with Circular No. 58 dated August 10, 1954 of the system.
          </p>
          <div className="signature-row">
            <div className="signature-left">
              <div>{new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div>Date</div>
            </div>
            <div className="signature">
              <p>CERTIFIED CORRECT:</p>
              <strong>LEAH E. NALIPONGUIT</strong>
              <div>Administrative Officer V</div>
            </div>
          </div>
        </div>

        {/* PRINT BUTTON */}
        <button onClick={() => window.print()} className="btn btn--primary no-print">
          Print
        </button>
      </div>
    </div>
  )
}

/* =========================
   MAIN PROFILE DETAILS COMPONENT
========================= */
export default function ProfileDetails() {
  const { id, tab } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)

  const activeTab = tab || 'attendance'

  useEffect(() => {
    async function load() {
      const res = await http.get(`/employee-profiles/${id}`)
      setProfile(res.data.profile)
    }
    load()
  }, [id])

  async function onArchive() {
    const ok = window.confirm(
      'Archive this profile? It will be removed from active profiles and moved to Archive.'
    )
    if (!ok) return

    await http.post(`/employee-profiles/${id}/archive`)
    navigate('/profiling', { replace: true })
  }

  if (!profile) return <div>Loading...</div>

  return (
    <div className="page2">
      <div className="page2__header">
        <h1>Profile</h1>
        <div className="page2__headerActions">
          <button className="btn" onClick={onArchive}>
            Archive
          </button>
          <Link className="btn" to={`/profiling/${id}/edit`}>
            Edit Profile
          </Link>
        </div>
      </div>

      <div className="tabs">
        <Tab to={`/profiling/${id}`} end>
          Attendance
        </Tab>
        <Tab to={`/profiling/${id}/salary`}>Salary</Tab>
        <Tab to={`/profiling/${id}/print`}>Print Report</Tab>
      </div>

      {activeTab === 'attendance' && (
        <AttendancePanel profileId={id} baseSalary={profile.base_salary} />
      )}

      {activeTab === 'salary' && (
        <SalaryPanel
          profileId={id}
          baseSalary={profile.base_salary}
          currentStatus={profile.employment_status}
        />
      )}

      {activeTab === 'print' && <PrintPanel profile={profile} />}
    </div>
  )
}