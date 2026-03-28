import { useEffect, useMemo, useState } from 'react'
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
    if (!baseSalary) return 0
    return Number(baseSalary) * presentCount
  }, [baseSalary, presentCount])

  const availableYears = useMemo(() => {
    const years = new Set(
      allRecords
        .map((r) => Number(String(r.date).slice(0, 4)))
        .filter((y) => Number.isFinite(y) && y > 0)
    )
    years.add(new Date().getFullYear())
    return Array.from(years).sort((a, b) => b - a)
  }, [allRecords])

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
        dailySalary: r.present ? Number(baseSalary || 0) : 0,
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
      const add = r.present ? Number(baseSalary || 0) : 0
      map.set(y, prev + add)
    })

    return Array.from(map.entries())
      .map(([y, total]) => ({ year: y, total }))
      .sort((a, b) => b.year - a.year)
  }, [allRecords, baseSalary])

  const reportYearTotal = useMemo(
    () => reportDailyRows.reduce((sum, r) => sum + Number(r.dailySalary || 0), 0),
    [reportDailyRows]
  )

  async function upsert(e) {
    e.preventDefault()
    if (!startDate || !endDate) return
    
    const today = new Date().toISOString().slice(0, 10)
    if (startDate > today || endDate > today) return
    if (startDate > endDate) return
    
    setRangeLoading(true)
    try {
      await http.post(`/employee-profiles/${profileId}/attendance/mark-present-range`, {
        start_date: startDate,
        end_date: endDate,
        include_weekends: false // Automatically exclude weekends
      })
      setStartDate('')
      setEndDate('')
      await load()
    } catch (error) {
      console.error('Error marking attendance range:', error)
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
      <div className="row">
        <div className="row__left">
          <div className="h2">Attendance</div>
          <div className="p">
            Year {year}: {presentCount}/{totalCount} present
          </div>
          <div className="p">
            Current earned salary: ₱{Number(currentSalary).toLocaleString()}
          </div>
        </div>
      </div>

      <form className="inlineForm" onSubmit={upsert}>
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
          {rangeLoading ? 'Saving...' : 'Mark Range Present'}
        </button>
      </form>

      {loading ? <div className="muted">Loading…</div> : null}

      <div className="table table--salary">
        <div className="table__head">
          <div>Date</div>
          <div>Status</div>
          <div>
            <button className="btn btn--sm btn--primary" onClick={() => setShowAddForm(!showAddForm)}>
              + Add
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
            <div>
              <button className="btn btn--sm btn--primary" onClick={addNewRecord} disabled={!newDate}>
                Save
              </button>
              <button className="btn btn--sm" onClick={() => {
                setShowAddForm(false)
                setNewDate('')
                setNewPresent(true)
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {records.map((r) => (
          <div key={r.id} className="table__row">
            <div>{String(r.date).slice(0, 10)}</div>
            <div>{r.present ? 'Present' : 'Absent'}</div>
            <div>
              <button className="btn btn--sm" onClick={() => remove(r.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card2 attendanceReportPrint">
        <div className="row no-print">
          <div className="row__left">
            <div className="h2">Attendance Salary Report</div>
            <div className="p">Daily salary from attendance, plus monthly and yearly totals.</div>
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
              <th>Status</th>
              <th>Daily Salary</th>
            </tr>
          </thead>
          <tbody>
            {reportDailyRows.map((r) => (
              <tr key={r.id}>
                <td>{String(r.date).slice(0, 10)}</td>
                <td>{r.present ? 'Present' : 'Absent'}</td>
                <td>₱{Number(r.dailySalary).toLocaleString()}</td>
              </tr>
            ))}
            {!reportDailyRows.length ? (
              <tr>
                <td colSpan="3">No attendance records for {reportYear}.</td>
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
function SalaryPanel({ profileId, baseSalary, currentStatus, currentDesignation }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [salary, setSalary] = useState(String(baseSalary ?? 0))
  const [records, setRecords] = useState([])
  const [attendanceBasedMin, setAttendanceBasedMin] = useState(null)
  const [salaryError, setSalaryError] = useState('')

  async function load() {
    const res = await http.get(`/employee-profiles/${profileId}/yearly-salary`)
    const loaded = res.data.records || []
    setRecords(loaded)

    const existing = loaded.find(
      (r) =>
        Number(r.year) === Number(year) &&
        String(r.employment_status_snapshot || '') === String(currentStatus || '') &&
        String(r.designation_snapshot || '') === String(currentDesignation || '')
    )
    if (existing) {
      setSalary(String(existing.salary ?? 0))
    }
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
          String(r.employment_status_snapshot || '') === String(currentStatus || '') &&
          String(r.designation_snapshot || '') === String(currentDesignation || '')
      )
      if (existing) {
        setSalary(String(existing.salary ?? 0))
      }

      const res = await http.get(`/employee-profiles/${profileId}/attendance`, { params: { year } })
      let filtered = res.data.records || []
      if (existing?.created_at) {
        const from = String(existing.created_at).slice(0, 10)
        filtered = filtered.filter((r) => String(r.date).slice(0, 10) >= from)
      } else {
        filtered = []
      }
      const presentCount = filtered.filter((r) => r.present).length
      const computed = Number((Number(baseSalary || 0) * presentCount).toFixed(2))
      const hasAttendance = filtered.length > 0
      setAttendanceBasedMin(hasAttendance ? computed : null)

      // Auto-fill from attendance only if there is no existing saved salary row.
      if (!existing) {
        setSalary(String(computed.toFixed(2)))
      }
    }

    syncSalaryInputFromAttendance()
  }, [year, profileId, baseSalary, records, currentStatus, currentDesignation])

  async function upsert(e) {
    e.preventDefault()
    const salaryNumber = Number(salary || 0)
    if (
      attendanceBasedMin !== null &&
      Number.isFinite(salaryNumber) &&
      salaryNumber < attendanceBasedMin
    ) {
      setSalaryError(
        `For ${year} (${currentStatus || 'status'} / ${currentDesignation || 'designation'}), minimum allowed is ${attendanceBasedMin.toLocaleString()}`
      )
      return
    }

    try {
      setSalaryError('')
      await http.post(`/employee-profiles/${profileId}/yearly-salary`, { year, salary })
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

  return (
    <div className="card2">
      <div className="h2">Yearly salary records</div>
      {attendanceBasedMin !== null ? (
        <div className="p">
          Attendance-based minimum for {year} ({currentStatus || 'status'} / {currentDesignation || 'designation'}): {attendanceBasedMin.toLocaleString()}
        </div>
      ) : (
        <div className="p">No same status/designation segment yet for {year}. You can enter any salary amount.</div>
      )}
      <div className="p">Same year + same status/designation adds salary. Different status/designation creates a new record.</div>

      <form className="inlineForm" onSubmit={upsert}>
        <input
          className="input"
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />
        <input
          className="input"
          type="number"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
        />
        <button className="btn btn--primary">Save</button>
      </form>
      {salaryError ? <div className="alert">{salaryError}</div> : null}

      <div className="table">
        <div className="table__head">
          <div>Year</div>
          <div>Status / Designation</div>
          <div>Salary</div>
          <div />
        </div>

        {records.map((r) => (
          <div key={r.id} className="table__row">
            <div>{r.year}</div>
            <div>{(r.employment_status_snapshot || 'N/A') + ' / ' + (r.designation_snapshot || 'N/A')}</div>
            <div>{Number(r.salary).toLocaleString()}</div>
            <div>
              <button className="btn btn--sm" onClick={() => remove(r.id)}>
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
    return [...records].sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
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
              <tr key={r.id ?? r.year}>
                <td>{r.year ? `01/01/${r.year}` : 'N/A'}</td>
                <td>{r.year ? `12/31/${r.year}` : 'N/A'}</td>
                <td>{r.designation_snapshot || 'N/A'}</td>
                <td>{r.employment_status_snapshot || 'N/A'}</td>
                <td>{r.salary ? Number(r.salary).toLocaleString() : 'N/A'}</td>
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
          currentDesignation={profile.designation || profile.position}
        />
      )}

      {activeTab === 'print' && <PrintPanel profile={profile} />}
    </div>
  )
}