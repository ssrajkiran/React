import AppLayout from "../../components/layout/AppLayout";
import { useState, useEffect, Fragment } from "react";
import api from "../../api";
import ExcelJS from "exceljs";
import { Link } from "react-router-dom";
import SharedSelect from "../../components/SharedSelect";
import { fmtDate } from "../../utils";

// ─── MONTH ROWS (summary table) ─────────────────────────────────────────────
const typeMeta = {
  leave:     { label: "Leave",     color: "var(--warning)", bg: "var(--warning-soft)", icon: "bi-calendar-x" },
  compoff:   { label: "Comp Off",  color: "var(--info)",    bg: "var(--info-soft)",    icon: "bi-arrow-left-right" },
  permission:{ label: "Permission",color: "var(--primary)", bg: "var(--primary-soft)", icon: "bi-clock" },
  present:   { label: "Present",   color: "var(--purple)",  bg: "var(--purple-soft)",  icon: "bi-person-check" },
};

function MonthRows({ bucket, monthNames, isExpanded, hasRecords, onToggle }) {
  const dayName = (d) => new Date(d).toLocaleDateString("en-US", { weekday: "short" });

  return (
    <Fragment>
      <tr className={`ar-sum-tr ${hasRecords ? "ar-sum-clickable" : ""}`} onClick={onToggle}>
        <td className="ar-sum-td-month">
          <span className="ar-sum-month-badge">
            {hasRecords && (
              <i className={`bi bi-chevron-${isExpanded ? "down" : "right"} ar-sum-chev`} />
            )}
            {monthNames[bucket.month - 1]}
          </span>
        </td>
        <td><span className="ar-sum-num" style={{ color: bucket.leave_days > 0 ? "var(--warning)" : "var(--t-light)" }}>{bucket.leave_days}</span></td>
        <td><span className="ar-sum-num" style={{ color: bucket.compoff_days > 0 ? "var(--info)" : "var(--t-light)" }}>{bucket.compoff_days}</span></td>
        <td><span className="ar-sum-num" style={{ color: bucket.permission_hours > 0 ? "var(--primary)" : "var(--t-light)" }}>{bucket.permission_hours}h</span></td>
        <td><span className="ar-sum-num" style={{ color: bucket.present_days > 0 ? "var(--purple)" : "var(--t-light)" }}>{bucket.present_days}</span></td>
        <td>
          <span className={`ar-sum-total-pill ${bucket.total_days > 0 ? "ar-sum-has-data" : ""}`}>
            {bucket.total_days}
          </span>
        </td>
        <td className="ar-sum-td-act">
          {hasRecords && <span className="ar-sum-rec-count">{bucket.records.length}</span>}
        </td>
      </tr>

      {isExpanded && bucket.records.map((r, i) => {
        const meta = typeMeta[r.type] || typeMeta.leave;
        return (
          <tr key={`${r.day}-${i}`} className="ar-sum-detail-row">
            <td className="ar-sum-detail-pad"></td>
            <td colSpan={6}>
              <div className="ar-sum-detail-item">
                <span className="ar-sum-detail-chip" style={{ background: meta.bg, color: meta.color }}>
                  <i className={`bi ${meta.icon}`} /> {meta.label}
                </span>
                <span className="ar-sum-detail-date">
                  <i className="bi bi-calendar3" />
                  {r.type === "permission" || r.type === "present" ? (
                    <>{dayName(r.day)} {fmtDate(r.day)}</>
                  ) : (
                    <>{fmtDate(r.from_date)}{r.to_date && r.to_date !== r.from_date ? ` → ${fmtDate(r.to_date)}` : ""}</>
                  )}
                </span>
                <span className="ar-sum-detail-dur">
                  {r.type === "permission"
                    ? `${r.hours} hr${r.hours !== 1 ? "s" : ""}${r.slot ? ` (${r.slot})` : ""}`
                    : `${r.days} day${r.days !== 1 ? "s" : ""}${r.half_day_type && r.half_day_type !== "full" ? " (half)" : ""}`}
                </span>
                {r.type === "compoff" && r.comp_off_date && (
                  <span className="ar-sum-detail-note">
                    <i className="bi bi-gift" /> earned {fmtDate(r.comp_off_date)}
                  </span>
                )}
                {r.type === "present" && r.holiday_name && (
                  <span className="ar-sum-detail-note">
                    <i className="bi bi-star" /> {r.holiday_name}
                  </span>
                )}
                {r.remarks && (
                  <span className="ar-sum-detail-remarks" title={r.remarks}>
                    <i className="bi bi-text-left" /> {r.remarks}
                  </span>
                )}
              </div>
            </td>
          </tr>
        );
      })}
    </Fragment>
  );
}

export default function AttendanceReport() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [daysInMonth, setDaysInMonth] = useState(0);
  const [loading, setLoading] = useState(false);
  const [holidays, setHolidays] = useState([]);

  const [people, setPeople] = useState([]);
  const [personId, setPersonId] = useState("");
  const [personSummary, setPersonSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  // ─── FETCH ────────────────────────────────────────────────────────────────
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year, month });
      if (personId) params.append("user_id", personId);
      const res = await api.get(`/attendance?${params.toString()}`);
      setRows(res.data.rows);
      setDaysInMonth(res.data.daysInMonth);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to fetch attendance");
    }
    setLoading(false);
  };

  const fetchHolidays = async () => {
    try {
      const res = await api.get(`/holidays/?year=${year}&month=${month}`);
      setHolidays(res.data.map((d) => d.date));
    } catch (err) {
      console.error("Failed to fetch holidays", err);
    }
  };

  const fetchPeople = async () => {
    try {
      const res = await api.get("/attendance/people");
      setPeople(res.data);
    } catch (err) {
      console.error("Failed to fetch people", err);
    }
  };

  const fetchPersonSummary = async (pid, yr) => {
    if (!pid) { setPersonSummary(null); return; }
    setSummaryLoading(true);
    try {
      const res = await api.get(`/attendance/person-summary?user_id=${pid}&year=${yr}`);
      setPersonSummary(res.data);
    } catch (err) {
      console.error("Failed to fetch person summary", err);
      setPersonSummary(null);
    }
    setSummaryLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { fetchAttendance(); fetchHolidays(); }, [year, month, personId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPeople(); }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPersonSummary(personId, year); }, [personId, year]);

  const searchQ = searchQuery.trim().toLowerCase();
  const filteredRows = searchQ
    ? rows.filter((r) => String(r.User || "").toLowerCase().includes(searchQ))
    : rows;

  // ─── CELL META ────────────────────────────────────────────────────────────
  // Maps every status code the API can return → display config
  const cellMeta = {
    P:   { label: "Present",    color: "var(--success)",  bg: "var(--success-soft)",  border: "color-mix(in srgb, var(--success) 35%, transparent)" },
    H:   { label: "Holiday",    color: "var(--t-muted)",  bg: "var(--bg-muted)",      border: "var(--border)" },
    WO:  { label: "Week Off",   color: "var(--t-light)",  bg: "var(--bg-hover)",      border: "var(--border)" },
    L:   { label: "Leave",      color: "var(--warning)",  bg: "var(--warning-soft)",  border: "color-mix(in srgb, var(--warning) 35%, transparent)" },
    HD:  { label: "Half Day Leave", color: "var(--warning)", bg: "var(--warning-soft)", border: "color-mix(in srgb, var(--warning) 55%, transparent)" },
    CO:  { label: "Comp Off",   color: "var(--info)",     bg: "var(--info-soft)",     border: "color-mix(in srgb, var(--info) 35%, transparent)" },
    PR:  { label: "Present on Holiday", color: "var(--purple)", bg: "var(--purple-soft)", border: "color-mix(in srgb, var(--purple) 35%, transparent)" },
    PP:  { label: "Permission", color: "var(--primary)",  bg: "var(--primary-soft)",  border: "color-mix(in srgb, var(--primary) 35%, transparent)" },
    A:   { label: "Absent",     color: "var(--danger)",   bg: "var(--danger-soft)",   border: "color-mix(in srgb, var(--danger) 35%, transparent)" },
    // Legacy / alternate codes your API might send
    C:   { label: "Comp Off",   color: "var(--info)",     bg: "var(--info-soft)",     border: "color-mix(in srgb, var(--info) 35%, transparent)" },
  };

  const getMetaFor = (code) => cellMeta[code] || cellMeta.P;

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  const formatDate = (dateStr) => fmtDate(dateStr);

  const getDateStr = (d) =>
    `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  const getDayOfWeek = (day) => {
    const d = new Date(year, month - 1, day);
    return ["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()];
  };

  const isWeekend = (day) => {
    const dow = new Date(year, month - 1, day).getDay();
    return dow === 0 || dow === 6;
  };

  const getCellInfo = (cell, day) => {
    const dateStr = getDateStr(day);
    const isHoliday = holidays.includes(dateStr);

    // No record for this day
    if (!cell) {
      if (isHoliday) return { display: "H", isHoliday: true };
      return { display: "P", isHoliday: false };
    }

    // Map API status to display code
    const status = cell.status;
    if (status === "present_on_holiday" || status === "present") return { display: "PR", isHoliday };
    if (status === "compoff")            return { display: cell.half_day_type && cell.half_day_type !== "full" ? "HD" : "CO", isHoliday };
    if (status === "permission")         return { display: "PP", isHoliday };
    if (status === "leave")              return { display: cell.half_day_type && cell.half_day_type !== "full" ? "HD" : "L", isHoliday };
    if (status === "absent")             return { display: "A",  isHoliday };
    if (status === "holiday" || isHoliday) return { display: "H", isHoliday: true };

    // Pass-through if API already sends short codes (P, CO, PR, PP, L, H, A, WO)
    return { display: status, isHoliday };
  };

  // ─── MODAL ────────────────────────────────────────────────────────────────
  const openModal = (user, cell, day) => {
    setSelectedUser(user);
    setSelectedCell({ ...cell, day });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setSelectedCell(null); setSelectedUser(null); };

  // ─── EXCEL EXPORT ─────────────────────────────────────────────────────────
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Attendance");
    const columns = ["Employee"];
    for (let d = 1; d <= daysInMonth; d++) columns.push(`${d}\n${getDayOfWeek(d)}`);
    sheet.addRow(columns);

    rows.forEach((row) => {
      const rowData = [row.User];
      for (let d = 1; d <= daysInMonth; d++) {
        const { display } = getCellInfo(row[d], d);
        rowData.push(display);
      }
      sheet.addRow(rowData);
    });

    sheet.addRow([]);
    sheet.addRow(["Code", "Meaning"]);
    Object.entries(cellMeta)
      .filter(([k]) => !["C"].includes(k)) // skip aliases
      .forEach(([code, { label }]) => sheet.addRow([code, label]));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Attendance_${monthNames[month-1]}_${year}.xlsx`;
    link.click();
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <style>{styles}</style>

      {/* PAGE HEADER */}
      <div className="ar-page-header">
        <div>
          <h5 className="ar-page-title">Attendance Report</h5>
          <nav className="ar-breadcrumb">
            <Link to="/employee/dashboard">Dashboard</Link>
            <i className="bi bi-chevron-right" />
            <span>Attendance</span>
          </nav>
        </div>
        <button className="ar-export-btn" onClick={exportToExcel}>
          <i className="bi bi-file-earmark-excel" /> Export Excel
        </button>
      </div>

      {/* TABLE CARD */}
      <div className="ar-card">
        {/* Toolbar — controls + legend (module-wise) */}
        <div className="ar-toolbar">
          <div className="ar-controls-left">
            <div className="ar-field">
              <label className="ar-label">Month</label>
              <SharedSelect
                value={month}
                onChange={(val) => setMonth(Number(val))}
                options={monthNames.map((name, i) => ({ value: i + 1, label: name }))}
                placeholder="Select month"
              />
            </div>
            <div className="ar-field">
              <label className="ar-label">Year</label>
              <SharedSelect
                value={year}
                onChange={(val) => setYear(Number(val))}
                options={Array.from({ length: 5 }, (_, i) => ({
                  value: today.getFullYear() - 2 + i,
                  label: String(today.getFullYear() - 2 + i),
                }))}
                placeholder="Select year"
              />
            </div>
            <div className="ar-field ar-field-person">
              <label className="ar-label">Person</label>
              <SharedSelect
                value={personId}
                onChange={(val) => setPersonId(val)}
                options={[
                  { value: "", label: "All Persons" },
                  ...people.map((p) => ({ value: p.id, label: p.name })),
                ]}
                placeholder="All persons"
                isClearable
              />
            </div>
            <div className="ar-field ar-field-search">
              <label className="ar-label">Search</label>
              <div className="ar-search">
                <i className="bi bi-search" />
                <input
                  type="text"
                  placeholder="Employee name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="ar-search-clear" title="Clear search" onClick={() => setSearchQuery("")}>
                    <i className="bi bi-x-lg" />
                  </button>
                )}
              </div>
            </div>
            <button className="ar-load-btn" onClick={() => { fetchAttendance(); fetchHolidays(); }} disabled={loading}>
              {loading
                ? <><i className="bi bi-arrow-repeat ar-spin" /> Loading…</>
                : <><i className="bi bi-arrow-clockwise" /> Load</>}
            </button>
          </div>

          {/* Legend — only canonical codes */}
          <div className="ar-legend">
            {[
              ["P",  cellMeta.P],
              ["PR", cellMeta.PR],
              ["L",  cellMeta.L],
              ["HD", cellMeta.HD],
              ["CO", cellMeta.CO],
              ["PP", cellMeta.PP],
              ["H",  cellMeta.H],
              ["WO", cellMeta.WO],
              ["A",  cellMeta.A],
            ].map(([code, meta]) => (
              <div key={code} className="ar-legend-item">
                <span className="ar-legend-chip" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
                  {code}
                </span>
                <span className="ar-legend-label">{meta.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ar-table-title">
          <i className="bi bi-calendar-range" />
          {monthNames[month - 1]} {year}
          {filteredRows.length > 0 && (
            <span className="ar-table-count">{filteredRows.length} employee{filteredRows.length !== 1 ? "s" : ""}{filteredRows.length !== rows.length && ` of ${rows.length}`}</span>
          )}
        </div>

        <div className="ar-table-scroll">
          {loading ? (
            <div className="ar-loading">
              <i className="bi bi-arrow-repeat ar-spin ar-spin-lg" />
              <span>Loading attendance data…</span>
            </div>
          ) : (
            <table className="ar-table">
              <thead>
                <tr>
                  <th className="ar-th-name">Employee</th>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = getDateStr(day);
                    const isHol = holidays.includes(dateStr);
                    const isWknd = isWeekend(day);
                    return (
                      <th
                        key={day}
                        className={`ar-th-day ${isWknd ? "ar-weekend" : ""} ${isHol ? "ar-holiday-col" : ""}`}
                      >
                        <div className="ar-th-day-num">{day}</div>
                        <div className="ar-th-day-name">{getDayOfWeek(day)}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={daysInMonth + 1} className="ar-empty">
                      <i className="bi bi-inbox" />
                      <span>
                        {rows.length > 0 && searchQ
                          ? `No employees match “${searchQuery}”`
                          : "No attendance data found"}
                      </span>
                    </td>
                  </tr>
                ) : filteredRows.map((row, idx) => (
                  <tr key={idx} className="ar-tr">
                    <td className="ar-td-name">
                      <div className="ar-emp-cell">
                        <div className="ar-avatar">{row.User?.charAt(0).toUpperCase()}</div>
                        <span className="ar-emp-name">{row.User}</span>
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const cell = row[day];
                      const { display } = getCellInfo(cell, day);
                      const meta = getMetaFor(display);
                      // Clickable only for non-plain statuses that have detail
                      const clickable = !["P", "H", "WO"].includes(display) && cell;
                      const isWknd = isWeekend(day);

                      return (
                        <td
                          key={day}
                          className={`ar-td-cell ${isWknd ? "ar-weekend-cell" : ""} ${clickable ? "ar-clickable" : ""}`}
                          onClick={() => clickable && openModal(row.User, cell, day)}
                          title={meta.label}
                        >
                          <span
                            className="ar-cell-chip"
                            style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                          >
                            {display}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* PERSON MONTH-WISE SUMMARY */}
      {personId && (
        <div className="ar-card ar-summary-card">
          <div className="ar-table-title">
            <i className="bi bi-clipboard-data" />
            Monthly Leave Summary — {personSummary?.user?.name || "…"} ({year})
            {personSummary && (
              <span className="ar-table-count">
                {personSummary.totals.total_days} day{personSummary.totals.total_days !== 1 ? "s" : ""} total
              </span>
            )}
          </div>

          {/* Year totals strip */}
          {personSummary && (
            <div className="ar-sum-totals">
              <div className="ar-sum-total-chip ar-sum-t-leave">
                <i className="bi bi-calendar-x" />
                <span className="ar-sum-total-val">{personSummary.totals.leave_days}</span>
                <span className="ar-sum-total-label">Leave (days)</span>
              </div>
              <div className="ar-sum-total-chip ar-sum-t-co">
                <i className="bi bi-arrow-left-right" />
                <span className="ar-sum-total-val">{personSummary.totals.compoff_days}</span>
                <span className="ar-sum-total-label">Comp Off (days)</span>
              </div>
              <div className="ar-sum-total-chip ar-sum-t-perm">
                <i className="bi bi-clock" />
                <span className="ar-sum-total-val">{personSummary.totals.permission_hours}</span>
                <span className="ar-sum-total-label">Permission (hrs)</span>
              </div>
              <div className="ar-sum-total-chip ar-sum-t-pr">
                <i className="bi bi-person-check" />
                <span className="ar-sum-total-val">{personSummary.totals.present_days}</span>
                <span className="ar-sum-total-label">Present/Holiday</span>
              </div>
              <div className="ar-sum-total-chip ar-sum-t-all">
                <i className="bi bi-calculator" />
                <span className="ar-sum-total-val">{personSummary.totals.total_days}</span>
                <span className="ar-sum-total-label">Total (days)</span>
              </div>
            </div>
          )}

          <div className="ar-sum-table-wrap">
            {summaryLoading ? (
              <div className="ar-loading">
                <i className="bi bi-arrow-repeat ar-spin ar-spin-lg" />
                <span>Loading summary…</span>
              </div>
            ) : !personSummary ? (
              <div className="ar-empty">
                <i className="bi bi-inbox" />
                <span>No summary available</span>
              </div>
            ) : (
              <table className="ar-table ar-sum-table">
                <thead>
                  <tr>
                    <th className="ar-sum-th-month">Month</th>
                    <th>Leave</th>
                    <th>Comp Off</th>
                    <th>Permission</th>
                    <th>Present</th>
                    <th className="ar-sum-th-total">Total</th>
                    <th className="ar-sum-th-act"></th>
                  </tr>
                </thead>
                <tbody>
                  {personSummary.monthly.map((b) => {
                    const isExpanded = !!expandedMonths[b.month];
                    const hasRecords = b.records.length > 0;
                    return (
                      <MonthRows
                        key={b.month}
                        bucket={b}
                        monthNames={monthNames}
                        isExpanded={isExpanded}
                        hasRecords={hasRecords}
                        onToggle={() => hasRecords && setExpandedMonths((p) => ({ ...p, [b.month]: !p[b.month] }))}
                        cellMeta={cellMeta}
                      />
                    );
                  })}
                  {/* TOTAL row */}
                  <tr className="ar-sum-tr ar-sum-tr-total">
                    <td className="ar-sum-td-month">
                      <span className="ar-sum-month-badge ar-sum-total-badge">
                        <i className="bi bi-trophy" /> TOTAL
                      </span>
                    </td>
                    <td><span className="ar-sum-num" style={{ color: "var(--warning)" }}>{personSummary.totals.leave_days}</span></td>
                    <td><span className="ar-sum-num" style={{ color: "var(--info)" }}>{personSummary.totals.compoff_days}</span></td>
                    <td><span className="ar-sum-num" style={{ color: "var(--primary)" }}>{personSummary.totals.permission_hours}h</span></td>
                    <td><span className="ar-sum-num" style={{ color: "var(--purple)" }}>{personSummary.totals.present_days}</span></td>
                    <td><span className="ar-sum-grand">{personSummary.totals.total_days}</span></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {modalOpen && selectedCell && (() => {
        const { display } = getCellInfo(selectedCell, selectedCell.day);
        const meta = getMetaFor(display);
        const isLeaveType = ["L", "CO", "HD"].includes(display);
        const isPermType  = display === "PP";
        const isPR        = display === "PR";
        const isHalfDay   = display === "HD";

        return (
          <>
            <div className="ar-modal-overlay" onClick={closeModal} />
            <div className="ar-modal-wrap">
              <div className="ar-modal">
                <div className="ar-modal-header">
                  <div className="ar-modal-header-left">
                    <span
                      className="ar-modal-type-badge"
                      style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                    >
                      <i className={`bi ${
                        display === "L"  ? "bi-calendar-x" :
                        display === "HD" ? "bi-calendar2-half" :
                        display === "CO" ? "bi-arrow-left-right" :
                        display === "PP" ? "bi-clock" :
                        display === "PR" ? "bi-person-check" :
                        display === "A"  ? "bi-x-circle" :
                        "bi-calendar-check"
                      }`} />
                      {meta.label}
                    </span>
                    <h6 className="ar-modal-title">Attendance Details</h6>
                  </div>
                  <button className="ar-modal-close" title="Close" onClick={closeModal}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>

                <div className="ar-modal-body">
                  <div className="ar-detail-grid">

                    <div className="ar-detail-row">
                      <span className="ar-detail-label">Employee</span>
                      <div className="ar-detail-emp">
                        <div className="ar-avatar ar-avatar-lg">{selectedUser?.charAt(0).toUpperCase()}</div>
                        <span className="ar-detail-value">{selectedUser}</span>
                      </div>
                    </div>

                    <div className="ar-detail-row">
                      <span className="ar-detail-label">Date</span>
                      <span className="ar-detail-value">
                        {formatDate(getDateStr(selectedCell.day))}
                      </span>
                    </div>

                    <div className="ar-detail-row">
                      <span className="ar-detail-label">Type</span>
                      <span
                        className="ar-type-badge"
                        style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                      >
                        {meta.label}
                      </span>
                    </div>

                    {/* Leave / Comp-off */}
                    {isLeaveType && (
                      <>
                        {selectedCell.from_date && (
                          <div className="ar-detail-row">
                            <span className="ar-detail-label">From</span>
                            <span className="ar-detail-value">{formatDate(selectedCell.from_date)}</span>
                          </div>
                        )}
                        {selectedCell.to_date && (
                          <div className="ar-detail-row">
                            <span className="ar-detail-label">To</span>
                            <span className="ar-detail-value">{formatDate(selectedCell.to_date)}</span>
                          </div>
                        )}
                        {selectedCell.days && (
                          <div className="ar-detail-row">
                            <span className="ar-detail-label">Days</span>
                            <div className="ar-days-display">
                              <i className="bi bi-calendar-check" />
                              <span>{selectedCell.days} day{Number(selectedCell.days) !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                        )}
                        {isHalfDay && selectedCell.half_day_type && (
                          <div className="ar-detail-row">
                            <span className="ar-detail-label">Half Day</span>
                            <span className="ar-detail-value">
                              {selectedCell.half_day_type === "first_half" ? "First Half (Morning)" : "Second Half (Afternoon)"}
                            </span>
                          </div>
                        )}
                        {display === "CO" && selectedCell.comp_off_date && (
                          <div className="ar-detail-row">
                            <span className="ar-detail-label">Holiday Worked</span>
                            <span className="ar-detail-value">{formatDate(selectedCell.comp_off_date)}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Permission */}
                    {isPermType && (
                      <>
                        {selectedCell.hours && (
                          <div className="ar-detail-row">
                            <span className="ar-detail-label">Hours</span>
                            <span className="ar-detail-value">{selectedCell.hours}h</span>
                          </div>
                        )}
                        {selectedCell.slot && (
                          <div className="ar-detail-row">
                            <span className="ar-detail-label">Slot</span>
                            <span className="ar-detail-value" style={{ textTransform: "capitalize" }}>
                              {selectedCell.slot}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Present on Holiday */}
                    {isPR && selectedCell.holiday_name && (
                      <div className="ar-detail-row">
                        <span className="ar-detail-label">Holiday</span>
                        <span className="ar-detail-value">{selectedCell.holiday_name}</span>
                      </div>
                    )}

                    {/* Remarks / reason */}
                    {selectedCell.remarks && (
                      <div className="ar-detail-row">
                        <span className="ar-detail-label">Remarks</span>
                        <span className="ar-detail-value ar-detail-remarks">{selectedCell.remarks}</span>
                      </div>
                    )}

                    <div className="ar-detail-row">
                      <span className="ar-detail-label">Status</span>
                      <span className={`ar-status-pill ar-status-${selectedCell.approval_status || "approved"}`}>
                        {(selectedCell.approval_status || "Approved").charAt(0).toUpperCase() +
                          (selectedCell.approval_status || "Approved").slice(1)}
                      </span>
                    </div>

                  </div>
                </div>

                <div className="ar-modal-footer">
                  <div className="ar-footer-right">
                    <button className="ar-btn ar-btn-ghost" onClick={closeModal}>Close</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </AppLayout>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = `
  /* ── page header ── */
  .ar-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
  .ar-page-title { font-size:24px; font-weight:800; color:var(--t-base); margin:0; letter-spacing:-0.02em; }
  .ar-breadcrumb { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--t-muted); margin-top:6px; }
  .ar-breadcrumb a { color:var(--primary); text-decoration:none; font-weight:500; }
  .ar-breadcrumb a:hover { text-decoration:underline; }
  .ar-breadcrumb i { font-size:10px; opacity:0.5; }
  .ar-export-btn { display:flex; align-items:center; gap:7px; padding:9px 18px; background:var(--success-soft); color:var(--success); border-radius:var(--radius); font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s; font-family:var(--font); }
  .ar-export-btn:hover { background:var(--success); color:#fff; transform:translateY(-1px); }

  /* ── controls ── */
  .ar-toolbar { display:flex; align-items:flex-end; justify-content:space-between; padding:14px 20px; border-bottom:1px solid var(--border-soft); gap:16px; flex-wrap:wrap; }
  .ar-controls-left { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; }
  .ar-field { display:flex; flex-direction:column; gap:5px; }
  .ar-field-person { min-width:200px; }
  .ar-field-search { min-width:210px; }
  .ar-search {
    display:flex; align-items:center; gap:7px; height:38px;
    background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius);
    padding:0 12px; box-shadow:var(--shadow-sm); transition:border-color 0.15s;
  }
  .ar-search:focus-within { border-color:var(--primary); }
  .ar-search i { font-size:12px; color:var(--t-muted); }
  .ar-search input {
    flex:1; min-width:0; border:none; outline:none; background:transparent;
    font-family:var(--font); font-size:13px; color:var(--t-base);
  }
  .ar-search input::placeholder { color:var(--t-muted); }
  .ar-search-clear {
    display:flex; align-items:center; justify-content:center; border:none; background:var(--bg-muted);
    color:var(--t-muted); width:18px; height:18px; border-radius:50%; font-size:9px; cursor:pointer; padding:0;
  }
  .ar-search-clear:hover { background:var(--danger-soft); color:var(--danger); }
  .ar-label { font-size:10.5px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.06em; }
  .ar-select { padding:8px 32px 8px 12px; border:none; border-radius:var(--radius); background:var(--bg-muted); font-size:13px; color:var(--t-base); font-family:var(--font); outline:none; cursor:pointer; transition:box-shadow 0.15s; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; }
  .ar-select:focus { box-shadow:0 0 0 3px var(--primary-ring); }
  .ar-load-btn { display:flex; align-items:center; gap:7px; padding:8px 18px; background:var(--primary); color: var(--on-primary); border:none; border-radius:var(--radius); font-size:13px; font-weight:600; cursor:pointer; transition:background 0.15s; font-family:var(--font); align-self:flex-end; }
  .ar-load-btn:hover:not(:disabled) { background:var(--primary-dark); }
  .ar-load-btn:disabled { opacity:0.6; cursor:not-allowed; }

  /* ── legend ── */
  .ar-legend { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .ar-legend-item { display:flex; align-items:center; gap:5px; }
  .ar-legend-chip { font-size:10px; font-weight:800; padding:2px 7px; border-radius:5px; letter-spacing:0.04em; white-space:nowrap; }
  .ar-legend-label { font-size:11px; color:var(--t-muted); font-weight:500; white-space:nowrap; }

  /* ── table card ── */
  .ar-card { background:var(--bg-card); border-radius:var(--radius-lg); box-shadow:var(--shadow-card), 0 24px 60px -30px rgba(15, 23, 42, 0.20); overflow:hidden; }
  .ar-table-title { display:flex; align-items:center; gap:8px; padding:14px 20px; border-bottom:1px solid var(--border-soft); font-size:13.5px; font-weight:700; color:var(--t-base); }
  .ar-table-title i { color:var(--primary); font-size:15px; }
  .ar-table-count { margin-left:4px; font-size:11.5px; font-weight:600; color:var(--t-muted); background:var(--bg-card); box-shadow:var(--shadow-sm); border-radius:20px; padding:1px 9px; }
  .ar-table-scroll { overflow-x:auto; }
  .ar-table { width:100%; border-collapse:collapse; font-size:12.5px; }

  /* ── thead ── */
  .ar-th-name { padding:10px 16px; text-align:left; font-size:11px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid var(--border-soft); background:var(--bg-card); position:sticky; left:0; z-index:2; min-width:160px; white-space:nowrap; }
  .ar-th-day { padding:6px 4px; text-align:center; border-bottom:1px solid var(--border-soft); background:var(--bg-card); min-width:42px; border-left:1px solid var(--border-soft); }
  .ar-th-day-num { font-size:12px; font-weight:700; color:var(--t-base); }
  .ar-th-day-name { font-size:9px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.06em; }
  .ar-weekend .ar-th-day-num, .ar-weekend .ar-th-day-name { color:var(--danger); }
  .ar-weekend { background:var(--weekend-bg) !important; }
  .ar-holiday-col { background:var(--holiday-bg) !important; }

  /* ── tbody ── */
  .ar-tr { border-bottom:1px solid var(--border-soft); transition:background 0.1s; }
  .ar-tr:last-child { border-bottom:none; }
  .ar-tr:hover .ar-td-name, .ar-tr:hover .ar-td-cell { background: var(--bg-hover); }
  .ar-td-name { padding:8px 16px; border-right:1px solid var(--border-soft); position:sticky; left:0; background:var(--bg-card); z-index:1; white-space:nowrap; }
  .ar-emp-cell { display:flex; align-items:center; gap:8px; }
  .ar-avatar { width:28px; height:28px; border-radius:50%; background:var(--primary-light); color:var(--primary); font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .ar-avatar-lg { width:36px; height:36px; font-size:14px; }
  .ar-emp-name { font-size:12.5px; font-weight:600; color:var(--t-base); }
  .ar-td-cell { padding:5px 3px; text-align:center; border-left:1px solid var(--border-soft); transition:background 0.1s; }
  .ar-weekend-cell { background:var(--weekend-cell-bg); }
  .ar-clickable { cursor:pointer; }
  .ar-clickable:hover .ar-cell-chip { filter:brightness(0.9); transform:scale(1.12); }
  .ar-cell-chip { display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; padding:2px 5px; border-radius:5px; letter-spacing:0.03em; min-width:26px; transition:transform 0.12s,filter 0.12s; }

  /* ── loading / empty ── */
  .ar-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:60px 20px; color:var(--t-muted); font-size:13px; }
  .ar-spin { animation:ar-spin 0.7s linear infinite; display:inline-block; }
  .ar-spin-lg { font-size:24px; }
  @keyframes ar-spin { to { transform:rotate(360deg); } }
  .ar-empty { text-align:center; padding:48px; color:var(--t-muted); font-size:13px; display:flex; flex-direction:column; align-items:center; gap:8px; }
  .ar-empty i { font-size:28px; opacity:0.4; }

  /* ── modal ── */
.ar-modal-overlay { position:fixed; inset:0; background:rgba(17,24,39,0.45); backdrop-filter:blur(8px); z-index:1000; }
.ar-modal-wrap { position:fixed; inset:0; z-index:1001; display:flex; align-items:center; justify-content:center; padding:16px; pointer-events:none; }
.ar-modal { width:80vw; height:80vh; max-height:80vh; background:var(--bg-card); border-radius:var(--radius-lg); box-shadow:var(--shadow-card), 0 24px 60px -30px rgba(15, 23, 42, 0.20); display:flex; flex-direction:column; overflow:hidden; pointer-events:all; animation:ar-modal-center-in 0.22s ease; }
  @keyframes ar-modal-center-in { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
  .ar-modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 20px 16px; border-bottom:1px solid var(--border-soft); flex-shrink:0; }
  .ar-modal-header-left { display:flex; flex-direction:column; gap:5px; }
  .ar-modal-title { font-size:14px; font-weight:700; color:var(--t-base); margin:0; letter-spacing:-0.01em; }
  .ar-modal-type-badge { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; width:fit-content; }
  .ar-modal-close { width:30px; height:30px; border-radius:var(--radius); background:var(--bg-muted); display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--t-muted); font-size:13px; transition:all 0.15s; flex-shrink:0; }
  .ar-modal-close:hover { background: var(--danger-soft); color: var(--danger); }
  .ar-modal-body { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:0; }
  .ar-modal-body::-webkit-scrollbar { width:4px; }
  .ar-modal-body::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
  .ar-modal-footer { display:flex; align-items:center; justify-content:flex-end; padding:14px 20px; border-top:1px solid var(--border-soft); flex-shrink:0; }
  .ar-footer-right { display:flex; gap:8px; }

  /* ── detail rows ── */
  .ar-detail-grid { display:flex; flex-direction:column; }
  .ar-detail-row { display:flex; align-items:center; justify-content:space-between; padding:11px 0; border-bottom:1px solid var(--border-soft); gap:12px; }
  .ar-detail-row:last-child { border-bottom:none; }
  .ar-detail-label { font-size:11.5px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.05em; flex-shrink:0; }
  .ar-detail-value { font-size:13px; font-weight:500; color:var(--t-base); text-align:right; }
  .ar-detail-remarks { max-width:220px; text-align:right; line-height:1.4; }
  .ar-detail-emp { display:flex; align-items:center; gap:9px; }
  .ar-type-badge { display:inline-flex; align-items:center; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; }
  .ar-days-display { display:flex; align-items:center; gap:7px; padding:5px 11px; background:var(--primary-light); border-radius:var(--radius); font-size:12.5px; font-weight:700; color:var(--primary); }
  .ar-status-pill { display:inline-block; font-size:10.5px; font-weight:700; padding:2px 9px; border-radius:20px; letter-spacing:0.04em; }
  .ar-status-approved { background:var(--success-soft); color:var(--success); }
  .ar-status-pending  { background:var(--warning-soft); color:var(--warning); }
  .ar-status-rejected { background:var(--danger-soft); color:var(--danger); }

  /* ── buttons ── */
  .ar-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:var(--radius); font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s; border:1px solid transparent; font-family:var(--font); }
  .ar-btn-ghost { background:var(--bg-muted); border-color:transparent; color:var(--t-muted); }
  .ar-btn-ghost:hover { color:var(--primary); background: var(--primary-soft); }

  /* ── person month-wise summary ── */
  .ar-summary-card { margin-top:20px; }
  .ar-sum-totals { display:flex; gap:10px; flex-wrap:wrap; padding:14px 20px; border-bottom:1px solid var(--border-soft); }
  .ar-sum-total-chip { display:flex; align-items:center; gap:8px; padding:8px 14px; border-radius:var(--radius); font-size:12px; font-weight:600; flex:1; min-width:130px; }
  .ar-sum-total-chip i { font-size:15px; }
  .ar-sum-total-val { font-size:16px; font-weight:800; letter-spacing:-0.02em; }
  .ar-sum-total-label { color:var(--t-muted); font-weight:600; font-size:11px; margin-left:auto; white-space:nowrap; }
  .ar-sum-t-leave { background:var(--warning-soft); color:var(--warning); }
  .ar-sum-t-co { background:var(--info-soft); color:var(--info); }
  .ar-sum-t-perm { background:var(--primary-soft); color:var(--primary); }
  .ar-sum-t-pr { background:var(--purple-soft); color:var(--purple); }
  .ar-sum-t-all { background:var(--success-soft); color:var(--success); }

  .ar-sum-table-wrap { overflow-x:auto; }
  .ar-sum-table { width:100%; border-collapse:collapse; font-size:13px; }
  .ar-sum-table thead th { padding:10px 14px; font-size:10.5px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.06em; text-align:left; border-bottom:1px solid var(--border-soft); white-space:nowrap; }
  .ar-sum-th-month { min-width:130px; }
  .ar-sum-th-total { text-align:center; }
  .ar-sum-th-act { width:50px; }

  .ar-sum-tr { border-bottom:1px solid var(--border-soft); transition:background 0.1s; }
  .ar-sum-tr:hover { background:var(--bg-hover); }
  .ar-sum-clickable { cursor:pointer; }
  .ar-sum-tr td { padding:10px 14px; vertical-align:middle; }
  .ar-sum-td-month { white-space:nowrap; }
  .ar-sum-month-badge { display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:700; color:var(--t-base); background:var(--bg-muted); border-radius:20px; padding:4px 12px; }
  .ar-sum-chev { font-size:10px; color:var(--t-muted); }
  .ar-sum-num { font-size:13px; font-weight:700; font-variant-numeric:tabular-nums; }
  .ar-sum-total-pill { display:inline-block; min-width:34px; text-align:center; font-size:12.5px; font-weight:700; padding:3px 9px; border-radius:20px; background:var(--bg-muted); color:var(--t-light); }
  .ar-sum-has-data { background:var(--primary-soft); color:var(--primary); }
  .ar-sum-rec-count { display:inline-block; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:10px; background:var(--bg-muted); color:var(--t-muted); }
  .ar-sum-td-act { text-align:right; }

  .ar-sum-tr-total { background:var(--success-soft); border-top:2px solid var(--success); }
  .ar-sum-tr-total:hover { background:var(--success-soft); }
  .ar-sum-total-badge { background:var(--success); color:#fff; font-size:11px; letter-spacing:0.04em; }
  .ar-sum-grand { display:inline-block; min-width:34px; text-align:center; font-size:14px; font-weight:800; padding:3px 10px; border-radius:20px; background:var(--success); color:#fff; }

  /* detail rows */
  .ar-sum-detail-row { background:var(--bg); border-bottom:1px solid var(--border-soft); }
  .ar-sum-detail-row:hover { background:var(--bg-hover); }
  .ar-sum-detail-row td { padding:7px 14px; }
  .ar-sum-detail-pad { border:none; }
  .ar-sum-detail-item { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .ar-sum-detail-chip { display:inline-flex; align-items:center; gap:5px; font-size:10.5px; font-weight:700; padding:3px 9px; border-radius:20px; white-space:nowrap; }
  .ar-sum-detail-chip i { font-size:10px; }
  .ar-sum-detail-date { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:600; color:var(--t-base); font-variant-numeric:tabular-nums; }
  .ar-sum-detail-date i { color:var(--t-muted); font-size:11px; }
  .ar-sum-detail-dur { font-size:11.5px; font-weight:700; color:var(--t-muted); background:var(--bg-muted); padding:2px 8px; border-radius:10px; }
  .ar-sum-detail-note { display:inline-flex; align-items:center; gap:4px; font-size:11px; color:var(--t-muted); }
  .ar-sum-detail-note i { color:var(--info); font-size:10px; }
  .ar-sum-detail-remarks { display:inline-flex; align-items:center; gap:4px; font-size:11px; color:var(--t-light); max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ar-sum-detail-remarks i { font-size:10px; }
`;
