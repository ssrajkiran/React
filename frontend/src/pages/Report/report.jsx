import AppLayout from "../../components/layout/AppLayout";
import { useState, useEffect } from "react";
import api from "../../api";
import ExcelJS from "exceljs";
import { Link } from "react-router-dom";

export default function AttendanceReport() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [daysInMonth, setDaysInMonth] = useState(0);
  const [loading, setLoading] = useState(false);
  const [holidays, setHolidays] = useState([]);

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
      const res = await api.get(`/attendance?year=${year}&month=${month}`);
      setHeaders(res.data.headers);
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

  useEffect(() => { fetchAttendance(); fetchHolidays(); }, [year, month]);

  // ─── CELL META ────────────────────────────────────────────────────────────
  // Maps every status code the API can return → display config
  const cellMeta = {
    P:   { label: "Present",    color: "#059669", bg: "#ECFDF5", border: "#6ee7b7" },
    H:   { label: "Holiday",    color: "#6B7280", bg: "#F3F4F6", border: "#D1D5DB" },
    WO:  { label: "Week Off",   color: "#9CA3AF", bg: "#F9FAFB", border: "#E5E7EB" },
    L:   { label: "Leave",      color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
    CO:  { label: "Comp Off",   color: "#0891B2", bg: "#ECFEFF", border: "#67E8F9" },
    PR:  { label: "Present on Holiday", color: "#7C3AED", bg: "#F5F3FF", border: "#C4B5FD" },
    PP:  { label: "Permission", color: "#5048E5", bg: "#EEF2FF", border: "#C7D2FE" },
    A:   { label: "Absent",     color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5" },
    // Legacy / alternate codes your API might send
    C:   { label: "Comp Off",   color: "#0891B2", bg: "#ECFEFF", border: "#67E8F9" },
  };

  const getMetaFor = (code) => cellMeta[code] || cellMeta.P;

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
  };

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
    if (status === "compoff")            return { display: "CO", isHoliday };
    if (status === "permission")         return { display: "PP", isHoliday };
    if (status === "leave")              return { display: "L",  isHoliday };
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

      {/* CONTROLS CARD */}
      <div className="ar-controls-card">
        <div className="ar-controls-left">
          <div className="ar-field">
            <label className="ar-label">Month</label>
            <select className="ar-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {monthNames.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div className="ar-field">
            <label className="ar-label">Year</label>
            <select className="ar-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => (
                <option key={i} value={today.getFullYear() - 2 + i}>{today.getFullYear() - 2 + i}</option>
              ))}
            </select>
          </div>
          <button className="ar-load-btn" onClick={() => { fetchAttendance(); fetchHolidays(); }} disabled={loading}>
            {loading
              ? <><i className="bi bi-arrow-repeat ar-spin" /> Loading…</>
              : <><i className="bi bi-search" /> Load</>}
          </button>
        </div>

        {/* Legend — only canonical codes */}
        <div className="ar-legend">
          {[
            ["P",  cellMeta.P],
            ["PR", cellMeta.PR],
            ["L",  cellMeta.L],
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

      {/* TABLE CARD */}
      <div className="ar-card">
        <div className="ar-table-title">
          <i className="bi bi-calendar-range" />
          {monthNames[month - 1]} {year}
          {rows.length > 0 && (
            <span className="ar-table-count">{rows.length} employee{rows.length !== 1 ? "s" : ""}</span>
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
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={daysInMonth + 1} className="ar-empty">
                      <i className="bi bi-inbox" />
                      <span>No attendance data found</span>
                    </td>
                  </tr>
                ) : rows.map((row, idx) => (
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

      {/* DETAIL MODAL */}
      {modalOpen && selectedCell && (() => {
        const { display } = getCellInfo(selectedCell, selectedCell.day);
        const meta = getMetaFor(display);
        const isLeaveType = ["L", "CO"].includes(display);
        const isPermType  = display === "PP";
        const isPR        = display === "PR";

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
                  <button className="ar-modal-close" onClick={closeModal}>
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
                        {selectedCell.day} {monthNames[month - 1]} {year}
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
  .ar-page-title { font-size:15px; font-weight:700; color:var(--text-primary); margin:0 0 4px; letter-spacing:-0.01em; }
  .ar-breadcrumb { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-muted); }
  .ar-breadcrumb a { color:var(--primary); text-decoration:none; font-weight:500; }
  .ar-breadcrumb a:hover { text-decoration:underline; }
  .ar-breadcrumb i { font-size:10px; opacity:0.5; }
  .ar-export-btn { display:flex; align-items:center; gap:7px; padding:9px 18px; background:#ECFDF5; color:#059669; border:1px solid #6ee7b7; border-radius:var(--radius); font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s; font-family:'Plus Jakarta Sans',sans-serif; }
  .ar-export-btn:hover { background:#059669; color:#fff; transform:translateY(-1px); }

  /* ── controls ── */
  .ar-controls-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px 20px; box-shadow:var(--shadow); margin-bottom:16px; display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:16px; }
  .ar-controls-left { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; }
  .ar-field { display:flex; flex-direction:column; gap:5px; }
  .ar-label { font-size:10.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; }
  .ar-select { padding:8px 32px 8px 12px; border:1px solid var(--border); border-radius:var(--radius); background:var(--surface); font-size:13px; color:var(--text-primary); font-family:'Plus Jakarta Sans',sans-serif; outline:none; cursor:pointer; transition:border-color 0.15s,box-shadow 0.15s; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; }
  .ar-select:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(80,72,229,0.1); }
  .ar-load-btn { display:flex; align-items:center; gap:7px; padding:8px 18px; background:var(--primary); color:#fff; border:none; border-radius:var(--radius); font-size:13px; font-weight:600; cursor:pointer; transition:background 0.15s; font-family:'Plus Jakarta Sans',sans-serif; align-self:flex-end; }
  .ar-load-btn:hover:not(:disabled) { background:var(--primary-dark); }
  .ar-load-btn:disabled { opacity:0.6; cursor:not-allowed; }

  /* ── legend ── */
  .ar-legend { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .ar-legend-item { display:flex; align-items:center; gap:5px; }
  .ar-legend-chip { font-size:10px; font-weight:800; padding:2px 7px; border-radius:5px; border:1px solid; letter-spacing:0.04em; white-space:nowrap; }
  .ar-legend-label { font-size:11px; color:var(--text-secondary); font-weight:500; white-space:nowrap; }

  /* ── table card ── */
  .ar-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); box-shadow:var(--shadow); overflow:hidden; }
  .ar-table-title { display:flex; align-items:center; gap:8px; padding:14px 20px; border-bottom:1px solid var(--border); font-size:13.5px; font-weight:700; color:var(--text-primary); }
  .ar-table-title i { color:var(--primary); font-size:15px; }
  .ar-table-count { margin-left:4px; font-size:11.5px; font-weight:600; color:var(--text-muted); background:var(--bg); border:1px solid var(--border); border-radius:20px; padding:1px 9px; }
  .ar-table-scroll { overflow-x:auto; }
  .ar-table { width:100%; border-collapse:collapse; font-size:12.5px; }

  /* ── thead ── */
  .ar-th-name { padding:10px 16px; text-align:left; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; border-bottom:2px solid var(--border); background:var(--surface); position:sticky; left:0; z-index:2; min-width:160px; white-space:nowrap; }
  .ar-th-day { padding:6px 4px; text-align:center; border-bottom:2px solid var(--border); background:var(--surface); min-width:42px; border-left:1px solid var(--border); }
  .ar-th-day-num { font-size:12px; font-weight:700; color:var(--text-primary); }
  .ar-th-day-name { font-size:9px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; }
  .ar-weekend .ar-th-day-num, .ar-weekend .ar-th-day-name { color:#DC2626; }
  .ar-weekend { background:#FFF5F5 !important; }
  .ar-holiday-col { background:#F3F4F6 !important; }

  /* ── tbody ── */
  .ar-tr { border-bottom:1px solid var(--border); transition:background 0.1s; }
  .ar-tr:last-child { border-bottom:none; }
  .ar-tr:hover .ar-td-name, .ar-tr:hover .ar-td-cell { background:#fafbff; }
  .ar-td-name { padding:8px 16px; border-right:1px solid var(--border); position:sticky; left:0; background:var(--surface); z-index:1; white-space:nowrap; }
  .ar-emp-cell { display:flex; align-items:center; gap:8px; }
  .ar-avatar { width:28px; height:28px; border-radius:50%; background:var(--primary-light); color:var(--primary); font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .ar-avatar-lg { width:36px; height:36px; font-size:14px; }
  .ar-emp-name { font-size:12.5px; font-weight:600; color:var(--text-primary); }
  .ar-td-cell { padding:5px 3px; text-align:center; border-left:1px solid var(--border); transition:background 0.1s; }
  .ar-weekend-cell { background:#FFF5F566; }
  .ar-clickable { cursor:pointer; }
  .ar-clickable:hover .ar-cell-chip { filter:brightness(0.9); transform:scale(1.12); }
  .ar-cell-chip { display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; padding:2px 5px; border-radius:5px; border:1px solid; letter-spacing:0.03em; min-width:26px; transition:transform 0.12s,filter 0.12s; }

  /* ── loading / empty ── */
  .ar-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:60px 20px; color:var(--text-muted); font-size:13px; }
  .ar-spin { animation:ar-spin 0.7s linear infinite; display:inline-block; }
  .ar-spin-lg { font-size:24px; }
  @keyframes ar-spin { to { transform:rotate(360deg); } }
  .ar-empty { text-align:center; padding:48px; color:var(--text-muted); font-size:13px; display:flex; flex-direction:column; align-items:center; gap:8px; }
  .ar-empty i { font-size:28px; opacity:0.4; }

  /* ── modal ── */
  .ar-modal-overlay { position:fixed; inset:0; background:rgba(17,24,39,0.45); backdrop-filter:blur(2px); z-index:200; }
  .ar-modal-wrap { position:fixed; inset:0; z-index:201; display:flex; align-items:center; justify-content:flex-end; padding:16px; pointer-events:none; }
  .ar-modal { width:400px; max-width:100%; max-height:calc(100vh - 32px); background:var(--surface); border-radius:var(--radius-lg); box-shadow:0 20px 60px rgba(0,0,0,0.18); display:flex; flex-direction:column; overflow:hidden; pointer-events:all; animation:ar-slide-in 0.22s ease; }
  @keyframes ar-slide-in { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
  .ar-modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 20px 16px; border-bottom:1px solid var(--border); flex-shrink:0; }
  .ar-modal-header-left { display:flex; flex-direction:column; gap:5px; }
  .ar-modal-title { font-size:14px; font-weight:700; color:var(--text-primary); margin:0; letter-spacing:-0.01em; }
  .ar-modal-type-badge { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; border:1px solid; width:fit-content; }
  .ar-modal-close { width:30px; height:30px; border:1px solid var(--border); border-radius:var(--radius); background:transparent; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-muted); font-size:13px; transition:all 0.15s; flex-shrink:0; }
  .ar-modal-close:hover { background:#FEF2F2; border-color:#fca5a5; color:#DC2626; }
  .ar-modal-body { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:0; }
  .ar-modal-body::-webkit-scrollbar { width:4px; }
  .ar-modal-body::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
  .ar-modal-footer { display:flex; align-items:center; justify-content:flex-end; padding:14px 20px; border-top:1px solid var(--border); flex-shrink:0; }
  .ar-footer-right { display:flex; gap:8px; }

  /* ── detail rows ── */
  .ar-detail-grid { display:flex; flex-direction:column; }
  .ar-detail-row { display:flex; align-items:center; justify-content:space-between; padding:11px 0; border-bottom:1px solid var(--border); gap:12px; }
  .ar-detail-row:last-child { border-bottom:none; }
  .ar-detail-label { font-size:11.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; flex-shrink:0; }
  .ar-detail-value { font-size:13px; font-weight:500; color:var(--text-primary); text-align:right; }
  .ar-detail-remarks { max-width:220px; text-align:right; line-height:1.4; }
  .ar-detail-emp { display:flex; align-items:center; gap:9px; }
  .ar-type-badge { display:inline-flex; align-items:center; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; border:1px solid; }
  .ar-days-display { display:flex; align-items:center; gap:7px; padding:5px 11px; background:var(--primary-light); border:1px solid #c7d2fe; border-radius:var(--radius); font-size:12.5px; font-weight:700; color:var(--primary); }
  .ar-status-pill { display:inline-block; font-size:10.5px; font-weight:700; padding:2px 9px; border-radius:20px; letter-spacing:0.04em; }
  .ar-status-approved { background:#ECFDF5; color:#059669; }
  .ar-status-pending  { background:#FFFBEB; color:#D97706; }
  .ar-status-rejected { background:#FEF2F2; color:#DC2626; }

  /* ── buttons ── */
  .ar-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:var(--radius); font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s; border:1px solid transparent; font-family:'Plus Jakarta Sans',sans-serif; }
  .ar-btn-ghost { background:transparent; border-color:var(--border); color:var(--text-secondary); }
  .ar-btn-ghost:hover { background:var(--bg); }
`;
