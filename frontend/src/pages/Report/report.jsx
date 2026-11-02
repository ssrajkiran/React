import AppLayout from "../../components/layout/AppLayout";
import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import api from "../../api";
import ExcelJS from "exceljs";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import SharedSelect from "../../components/SharedSelect";
import { fmtDate, fmtDateLong } from "../../utils";

// ─── MONTH ROWS (summary table) ─────────────────────────────────────────────
const typeMeta = {
  leave:      { label: "Leave",      color: "var(--warning)", bg: "var(--warning-soft)", icon: "bi-calendar-x" },
  compoff:    { label: "Comp Off",   color: "var(--info)",    bg: "var(--info-soft)",    icon: "bi-arrow-left-right" },
  permission: { label: "Permission", color: "var(--primary)", bg: "var(--primary-soft)", icon: "bi-clock" },
  present:    { label: "Present",    color: "var(--purple)",  bg: "var(--purple-soft)",  icon: "bi-person-check" },
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
                    : `${r.days} day${Number(r.days) !== 1 ? "s" : ""}${r.half_day_type && r.half_day_type !== "full" ? " (half)" : ""}`}
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
                  <span className="ar-sum-detail-remarks text-truncate-hover" title={r.remarks}>
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

  // ─── CELL META ────────────────────────────────────────────────────────────
  const cellMeta = {
    P:   { label: "Present",            color: "var(--success)",  bg: "var(--success-soft)",  border: "color-mix(in srgb, var(--success) 35%, transparent)", icon: "bi-check2-circle" },
    PR:  { label: "Present on Holiday", color: "var(--purple)",   bg: "var(--purple-soft)",   border: "color-mix(in srgb, var(--purple) 45%, transparent)", icon: "bi-person-check-fill" },
    WH:  { label: "Work From Home",     color: "#0284c7",         bg: "rgba(14, 165, 233, 0.12)", border: "rgba(14, 165, 233, 0.40)",             icon: "bi-house-door-fill" },
    L:   { label: "Leave",              color: "var(--warning)",  bg: "var(--warning-soft)",  border: "color-mix(in srgb, var(--warning) 45%, transparent)", icon: "bi-calendar-x-fill" },
    HD:  { label: "Half Day Leave",     color: "var(--orange)",   bg: "var(--orange-soft)",   border: "color-mix(in srgb, var(--orange) 55%, transparent)",  icon: "bi-calendar2-half" },
    CO:  { label: "Comp Off",           color: "var(--info)",     bg: "var(--info-soft)",     border: "color-mix(in srgb, var(--info) 45%, transparent)",    icon: "bi-arrow-left-right" },
    PP:  { label: "Permission",         color: "var(--primary)",  bg: "var(--primary-soft)",  border: "color-mix(in srgb, var(--primary) 45%, transparent)", icon: "bi-clock-fill" },
    H:   { label: "Holiday",            color: "var(--warning)",  bg: "var(--warning-soft)",  border: "color-mix(in srgb, var(--warning) 35%, transparent)", icon: "bi-calendar-event" },
    WO:  { label: "Week Off",           color: "var(--t-muted)",  bg: "var(--bg-muted)",      border: "var(--border)",                                         icon: "bi-cup-hot" },
    A:   { label: "Absent",             color: "var(--danger)",   bg: "var(--danger-soft)",   border: "color-mix(in srgb, var(--danger) 45%, transparent)",   icon: "bi-x-circle-fill" },
    C:   { label: "Comp Off",           color: "var(--info)",     bg: "var(--info-soft)",     border: "color-mix(in srgb, var(--info) 45%, transparent)",    icon: "bi-arrow-left-right" },
  };

  const getMetaFor = (code) => cellMeta[code] || cellMeta.P;

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  const formatDate = (dateStr) => fmtDate(dateStr);

  const getDateStr = useCallback((d) =>
    `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`, [year, month]);

  const getDayOfWeek = (day) => {
    const d = new Date(year, month - 1, day);
    return ["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()];
  };

  const isWeekend = useCallback((day) => {
    const dow = new Date(year, month - 1, day).getDay();
    return dow === 0 || dow === 6;
  }, [year, month]);

  const isTodayDate = (day) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
  };

  const getCellInfo = useCallback((cell, day) => {
    const dateStr = getDateStr(day);
    const isHoliday = holidays.includes(dateStr);
    const isWknd = isWeekend(day);

    if (!cell) {
      if (isHoliday) return { display: "H", isHoliday: true, isWeekend: isWknd };
      if (isWknd) return { display: "WO", isHoliday: false, isWeekend: true };
      return { display: "P", isHoliday: false, isWeekend: false };
    }

    const status = cell.status;
    if (status === "present_on_holiday" || status === "present") return { display: "PR", isHoliday, isWeekend: isWknd };
    if (status === "WH" || status === "wfh" || status === "work_from_home" || cell.type === "wfh" || cell.type === "work_from_home") {
      return { display: "WH", isHoliday, isWeekend: isWknd };
    }
    if (status === "compoff")            return { display: cell.half_day_type && cell.half_day_type !== "full" ? "HD" : "CO", isHoliday, isWeekend: isWknd };
    if (status === "permission")         return { display: "PP", isHoliday, isWeekend: isWknd };
    if (status === "leave")              return { display: cell.half_day_type && cell.half_day_type !== "full" ? "HD" : "L", isHoliday, isWeekend: isWknd };
    if (status === "absent")             return { display: "A",  isHoliday, isWeekend: isWknd };
    if (status === "holiday" || isHoliday) return { display: "H", isHoliday: true, isWeekend: isWknd };
    if (status === "weekoff" || isWknd)  return { display: "WO", isHoliday: false, isWeekend: true };

    return { display: status, isHoliday, isWeekend: isWknd };
  }, [getDateStr, holidays, isWeekend]);

  // ─── MODAL CONTROLS ───────────────────────────────────────────────────────
  const openModal = (user, cell, day) => {
    setSelectedUser(user);
    setSelectedCell({ ...cell, day });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedCell(null);
    setSelectedUser(null);
  }, []);

  const handleCopyRecord = async () => {
    if (!selectedCell || !selectedUser) return;
    const { display } = getCellInfo(selectedCell, selectedCell.day);
    const meta = getMetaFor(display);
    const dateFormatted = formatDate(getDateStr(selectedCell.day));
    const durationText = selectedCell.days
      ? `${selectedCell.days} day${Number(selectedCell.days) !== 1 ? "s" : ""}`
      : selectedCell.hours
      ? `${selectedCell.hours} hrs`
      : "1 day";

    const textToCopy = [
      `Attendance Record Details:`,
      `Employee: ${selectedUser}`,
      `Date: ${dateFormatted}`,
      `Type: ${meta.label}`,
      `Duration: ${durationText}`,
      selectedCell.from_date ? `From: ${formatDate(selectedCell.from_date)}` : null,
      selectedCell.to_date ? `To: ${formatDate(selectedCell.to_date)}` : null,
      selectedCell.remarks ? `Remarks: ${selectedCell.remarks}` : null,
      `Status: ${selectedCell.approval_status || "Approved"}`,
    ].filter(Boolean).join("\n");

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const ta = document.createElement("textarea");
        ta.value = textToCopy;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Attendance details copied to clipboard!");
    } catch {
      toast.info("Copied summary text!");
    }
  };

  // Jump to Current Month
  const handleResetToCurrentMonth = () => {
    const cur = new Date();
    setYear(cur.getFullYear());
    setMonth(cur.getMonth() + 1);
  };

  // ─── FETCH ────────────────────────────────────────────────────────────────
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year, month });
      if (personId) params.append("user_id", personId);
      const res = await api.get(`/attendance?${params.toString()}`);
      setRows(res.data.rows || []);
      setDaysInMonth(res.data.daysInMonth || 0);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to fetch attendance");
    }
    setLoading(false);
  };

  const fetchHolidays = async () => {
    try {
      const res = await api.get(`/holidays/?year=${year}&month=${month}`);
      setHolidays((res.data || []).map((d) => d.date));
    } catch (err) {
      console.error("Failed to fetch holidays", err);
    }
  };

  const fetchPeople = async () => {
    try {
      const res = await api.get("/attendance/people");
      setPeople(res.data || []);
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

  // Modal keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && modalOpen) {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  const searchQ = searchQuery.trim().toLowerCase();
  const filteredRows = searchQ
    ? rows.filter((r) => String(r.User || "").toLowerCase().includes(searchQ))
    : rows;

  // ─── EXECUTIVE KPI STATS ──────────────────────────────────────────────────
  const kpiStats = useMemo(() => {
    let workingDaysCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isHol = holidays.includes(dateStr);
      const dow = new Date(year, month - 1, d).getDay();
      const isWk = dow === 0 || dow === 6;
      if (!isHol && !isWk) workingDaysCount++;
    }

    let totalLeaves = 0;
    let totalCompOff = 0;
    let totalPermissions = 0;
    let totalPresent = 0;
    let totalPR = 0;
    let totalAbsent = 0;
    let totalWFH = 0;

    const counts = { P: 0, PR: 0, WH: 0, L: 0, HD: 0, CO: 0, PP: 0, H: 0, WO: 0, A: 0 };

    rows.forEach((row) => {
      for (let d = 1; d <= daysInMonth; d++) {
        const { display } = getCellInfo(row[d], d);
        if (counts[display] !== undefined) counts[display]++;
        if (display === "L") totalLeaves += 1;
        else if (display === "HD") totalLeaves += 0.5;
        else if (display === "CO") totalCompOff += 1;
        else if (display === "PP") totalPermissions += 1;
        else if (display === "PR") totalPR += 1;
        else if (display === "WH") { totalWFH += 1; totalPresent += 1; }
        else if (display === "P") totalPresent += 1;
        else if (display === "A") totalAbsent += 1;
      }
    });

    const totalEmployees = rows.length;
    const totalSlots = totalEmployees * (workingDaysCount || 1);
    const presentSlots = totalPresent + totalPR;
    const attendanceRate = totalSlots > 0 ? Math.min(100, Math.round((presentSlots / totalSlots) * 100)) : 100;

    return {
      totalEmployees,
      workingDaysCount,
      totalLeaves,
      totalCompOff,
      totalPermissions,
      totalPresent,
      totalWFH,
      totalAbsent,
      totalHolidays: holidays.length,
      attendanceRate,
      counts,
    };
  }, [rows, daysInMonth, holidays, year, month, getCellInfo]);

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
      .filter(([k]) => !["C"].includes(k))
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
          <div className="ar-title-badge">HR & Workforce Insights</div>
          <h5 className="ar-page-title">Attendance Report</h5>
          <nav className="ar-breadcrumb" aria-label="breadcrumb">
            <Link to="/employee/dashboard">Dashboard</Link>
            <i className="bi bi-chevron-right" />
            <span>Attendance Report</span>
          </nav>
        </div>
        <div className="ar-header-actions">
          <button
            className="ar-today-btn"
            onClick={handleResetToCurrentMonth}
            title="Jump to current month"
          >
            <i className="bi bi-calendar-event" /> Current Month
          </button>
          <button className="ar-export-btn" onClick={exportToExcel} title="Export data to Microsoft Excel">
            <i className="bi bi-file-earmark-excel-fill" /> Export Excel
          </button>
        </div>
      </div>

      {/* EXECUTIVE KPI DASHBOARD BAR */}
      <div className="ar-kpi-grid">
        <div className="ar-kpi-card">
          <div className="ar-kpi-icon ar-kpi-icon-emp">
            <i className="bi bi-people-fill" />
          </div>
          <div className="ar-kpi-info">
            <span className="ar-kpi-label">Employees</span>
            <span className="ar-kpi-val">{kpiStats.totalEmployees}</span>
            <span className="ar-kpi-sub">In active view</span>
          </div>
        </div>

        <div className="ar-kpi-card">
          <div className="ar-kpi-icon ar-kpi-icon-work">
            <i className="bi bi-briefcase-fill" />
          </div>
          <div className="ar-kpi-info">
            <span className="ar-kpi-label">Working Days</span>
            <span className="ar-kpi-val">{kpiStats.workingDaysCount}</span>
            <span className="ar-kpi-sub">Excl. weekends & holidays</span>
          </div>
        </div>

        <div className="ar-kpi-card">
          <div className="ar-kpi-icon ar-kpi-icon-rate">
            <i className="bi bi-speedometer2" />
          </div>
          <div className="ar-kpi-info">
            <span className="ar-kpi-label">Attendance Rate</span>
            <span className="ar-kpi-val">{kpiStats.attendanceRate}%</span>
            <span className="ar-kpi-sub">Presence efficiency</span>
          </div>
        </div>

        <div className="ar-kpi-card">
          <div className="ar-kpi-icon ar-kpi-icon-leave">
            <i className="bi bi-calendar-x-fill" />
          </div>
          <div className="ar-kpi-info">
            <span className="ar-kpi-label">Leaves Taken</span>
            <span className="ar-kpi-val">{kpiStats.totalLeaves} <small>days</small></span>
            <span className="ar-kpi-sub">Approved leaves</span>
          </div>
        </div>

        <div className="ar-kpi-card">
          <div className="ar-kpi-icon ar-kpi-icon-co">
            <i className="bi bi-arrow-left-right" />
          </div>
          <div className="ar-kpi-info">
            <span className="ar-kpi-label">Comp Offs</span>
            <span className="ar-kpi-val">{kpiStats.totalCompOff} <small>days</small></span>
            <span className="ar-kpi-sub">Compensatory off</span>
          </div>
        </div>

        <div className="ar-kpi-card">
          <div className="ar-kpi-icon ar-kpi-icon-perm">
            <i className="bi bi-clock-history" />
          </div>
          <div className="ar-kpi-info">
            <span className="ar-kpi-label">Permissions</span>
            <span className="ar-kpi-val">{kpiStats.totalPermissions} <small>hrs</small></span>
            <span className="ar-kpi-sub">Total time permitted</span>
          </div>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="ar-card">
        {/* Toolbar — controls + search */}
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
                options={Array.from({ length: 6 }, (_, i) => ({
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
                onChange={(val) => setPersonId(val || "")}
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
                  placeholder="Filter employee name…"
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
                : <><i className="bi bi-arrow-clockwise" /> Reload</>}
            </button>
          </div>

          {/* Interactive Live Legend with real-time counts */}
          <div className="ar-legend-wrap">
            <span className="ar-legend-title">Legend & Counts:</span>
            <div className="ar-legend">
              {[
                ["P",  cellMeta.P,  kpiStats.counts.P],
                ["PR", cellMeta.PR, kpiStats.counts.PR],
                ["WH", cellMeta.WH, kpiStats.counts.WH],
                ["L",  cellMeta.L,  kpiStats.counts.L],
                ["HD", cellMeta.HD, kpiStats.counts.HD],
                ["CO", cellMeta.CO, kpiStats.counts.CO],
                ["PP", cellMeta.PP, kpiStats.counts.PP],
                ["H",  cellMeta.H,  kpiStats.counts.H],
                ["WO", cellMeta.WO, kpiStats.counts.WO],
                ["A",  cellMeta.A,  kpiStats.counts.A],
              ].map(([code, meta, count]) => (
                <div key={code} className="ar-legend-item" title={`${meta.label}: ${count} total occurrences`}>
                  <span className="ar-legend-chip" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
                    {code}
                  </span>
                  <span className="ar-legend-label">{meta.label}</span>
                  <span className="ar-legend-counter">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table Subheader Bar */}
        <div className="ar-table-title-bar">
          <div className="ar-table-title">
            <i className="bi bi-calendar2-range" />
            <span>{monthNames[month - 1]} {year} Overview</span>
          </div>
          <div className="ar-table-meta-right">
            {filteredRows.length > 0 && (
              <span className="ar-table-count">
                Showing <strong>{filteredRows.length}</strong> of <strong>{rows.length}</strong> employees
              </span>
            )}
            <span className="ar-hint-pill">
              <i className="bi bi-info-circle" /> Click on leave, comp-off, or permission chips for details
            </span>
          </div>
        </div>

        <div className="ar-table-scroll">
          {loading ? (
            <div className="ar-loading">
              <i className="bi bi-arrow-repeat ar-spin ar-spin-lg" />
              <span>Loading attendance records…</span>
            </div>
          ) : (
            <table className="ar-table">
              <thead>
                <tr>
                  <th className="ar-th-name">
                    <span>Employee</span>
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = getDateStr(day);
                    const isHol = holidays.includes(dateStr);
                    const isWknd = isWeekend(day);
                    const isToday = isTodayDate(day);
                    return (
                      <th
                        key={day}
                        className={`ar-th-day ${isWknd ? "ar-weekend" : ""} ${isHol ? "ar-holiday-col" : ""} ${isToday ? "ar-today-col" : ""}`}
                        title={`${getDayOfWeek(day)}, ${day} ${monthNames[month - 1]} ${isHol ? "(Holiday)" : isWknd ? "(Weekend)" : ""}`}
                      >
                        <div className="ar-th-day-num">{day}</div>
                        <div className="ar-th-day-name">{getDayOfWeek(day)}</div>
                        {isToday && <span className="ar-today-badge">TODAY</span>}
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
                          : "No attendance data found for this period"}
                      </span>
                    </td>
                  </tr>
                ) : filteredRows.map((row, idx) => (
                  <tr key={idx} className="ar-tr">
                    <td className="ar-td-name">
                      <div className="ar-emp-cell">
                        <div className="ar-avatar">{row.User?.charAt(0).toUpperCase()}</div>
                        <span className="ar-emp-name text-truncate-hover" title={row.User}>{row.User}</span>
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const cell = row[day];
                      const { display } = getCellInfo(cell, day);
                      const meta = getMetaFor(display);
                      const clickable = !["P", "H", "WO"].includes(display) && !!cell;
                      const isWknd = isWeekend(day);
                      const isToday = isTodayDate(day);

                      return (
                        <td
                          key={day}
                          className={`ar-td-cell ${isWknd ? "ar-weekend-cell" : ""} ${isToday ? "ar-today-cell" : ""} ${clickable ? "ar-clickable" : ""}`}
                          onClick={() => clickable && openModal(row.User, cell, day)}
                          title={clickable ? `${meta.label} on Day ${day} — Click to view full details` : meta.label}
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

      {/* PERSON MONTH-WISE SUMMARY (Active when an employee is selected) */}
      {personId && (
        <div className="ar-card ar-summary-card">
          <div className="ar-table-title-bar">
            <div className="ar-table-title">
              <i className="bi bi-clipboard-data-fill" />
              <span>Annual Attendance Breakdown — {personSummary?.user?.name || "Employee"} ({year})</span>
            </div>
            {personSummary && (
              <span className="ar-table-count">
                {personSummary.totals?.total_days || 0} day{(personSummary.totals?.total_days || 0) !== 1 ? "s" : ""} annual leave
              </span>
            )}
          </div>

          {personSummary && (
            <div className="ar-sum-totals">
              <div className="ar-sum-total-chip ar-sum-t-leave">
                <i className="bi bi-calendar-x" />
                <span className="ar-sum-total-val">{personSummary.totals.leave_days}</span>
                <span className="ar-sum-total-label">Leaves (Days)</span>
              </div>
              <div className="ar-sum-total-chip ar-sum-t-co">
                <i className="bi bi-arrow-left-right" />
                <span className="ar-sum-total-val">{personSummary.totals.compoff_days}</span>
                <span className="ar-sum-total-label">Comp Off (Days)</span>
              </div>
              <div className="ar-sum-total-chip ar-sum-t-perm">
                <i className="bi bi-clock" />
                <span className="ar-sum-total-val">{personSummary.totals.permission_hours}</span>
                <span className="ar-sum-total-label">Permission (Hrs)</span>
              </div>
              <div className="ar-sum-total-chip ar-sum-t-pr">
                <i className="bi bi-person-check" />
                <span className="ar-sum-total-val">{personSummary.totals.present_days}</span>
                <span className="ar-sum-total-label">Present/Holiday</span>
              </div>
              <div className="ar-sum-total-chip ar-sum-t-all">
                <i className="bi bi-calculator" />
                <span className="ar-sum-total-val">{personSummary.totals.total_days}</span>
                <span className="ar-sum-total-label">Total Out of Office</span>
              </div>
            </div>
          )}

          <div className="ar-sum-table-wrap">
            {summaryLoading ? (
              <div className="ar-loading">
                <i className="bi bi-arrow-repeat ar-spin ar-spin-lg" />
                <span>Loading annual summary…</span>
              </div>
            ) : !personSummary ? (
              <div className="ar-empty">
                <i className="bi bi-inbox" />
                <span>No summary records available for this person</span>
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
                    const hasRecords = b.records && b.records.length > 0;
                    return (
                      <MonthRows
                        key={b.month}
                        bucket={b}
                        monthNames={monthNames}
                        isExpanded={isExpanded}
                        hasRecords={hasRecords}
                        onToggle={() => hasRecords && setExpandedMonths((p) => ({ ...p, [b.month]: !p[b.month] }))}
                      />
                    );
                  })}
                  <tr className="ar-sum-tr ar-sum-tr-total">
                    <td className="ar-sum-td-month">
                      <span className="ar-sum-month-badge ar-sum-total-badge">
                        <i className="bi bi-trophy-fill" /> TOTAL
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

      {/* ─── INNOVATIVE ATTENDANCE DETAIL VIEW MODAL ───────────────────────── */}
      {modalOpen && selectedCell && (() => {
        const { display } = getCellInfo(selectedCell, selectedCell.day);
        const meta = getMetaFor(display);
        const isLeaveType = ["L", "CO", "HD"].includes(display);
        const isPermType  = display === "PP";
        const isPR        = display === "PR";
        const isHalfDay   = display === "HD";
        const isWFH       = display === "WH";

        const daysVal = selectedCell.days ? Number(selectedCell.days) : null;
        const durationFormatted = daysVal !== null
          ? (daysVal === 0.5 ? "Half Day (0.5)" : `${daysVal} Day${daysVal !== 1 ? "s" : ""}`)
          : selectedCell.hours
          ? `${selectedCell.hours} Hour${Number(selectedCell.hours) !== 1 ? "s" : ""}`
          : "1 Day";

        const recordDateStr = getDateStr(selectedCell.day);

        return (
          <div className="ul-overlay" onClick={closeModal} role="dialog" aria-modal="true">
            <div className="ul-modal ul-modal-md ar-modal-sheet" onClick={(e) => e.stopPropagation()}>
              {/* Unified Standard Header matching entire application */}
              <div className="ul-modal-header">
                <div className="ul-modal-header-left">
                  <div
                    className="ul-modal-icon ul-modal-icon-primary"
                    style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                  >
                    <i className={`bi ${
                      display === "WH" ? "bi-house-door-fill" :
                      display === "L"  ? "bi-calendar-x-fill" :
                      display === "HD" ? "bi-calendar2-half" :
                      display === "CO" ? "bi-arrow-left-right" :
                      display === "PP" ? "bi-clock-fill" :
                      display === "PR" ? "bi-person-check-fill" :
                      display === "A"  ? "bi-x-circle-fill" :
                      "bi-calendar-check-fill"
                    }`} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h6 className="ul-modal-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {meta.label} Details
                    </h6>
                    <p className="ul-modal-sub" title={selectedUser} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedUser} • {fmtDateLong(recordDateStr)}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto" }}>
                  <div className={`ar-status-tag ar-status-${selectedCell.approval_status || "approved"}`}>
                    <span className="ar-status-dot" />
                    {(selectedCell.approval_status || "Approved").toUpperCase()}
                  </div>
                  <button className="ul-modal-close" onClick={closeModal} title="Close (Esc)">
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>

              <div className="ul-modal-divider" />

              {/* Standard Body */}
              <div className="ul-modal-body">
                {/* ── KEY HIGHLIGHT CARD: THE DURATION ("2 DAYS") DISPLAY ── */}
                <div className="ar-hero-duration-card" data-testid="duration-hero-card">
                  <div className="ar-hero-duration-icon">
                    <i className={`bi ${
                      display === "WH" ? "bi-house-check-fill" :
                      isPermType ? "bi-clock-history" :
                      isPR ? "bi-star-fill" :
                      "bi-calendar2-range-fill"
                    }`} />
                  </div>
                  <div className="ar-hero-duration-content">
                    <span className="ar-hero-duration-label">
                      {display === "WH"
                        ? "Work From Home Duration"
                        : isPermType
                        ? "Allocated Permission Duration"
                        : isPR
                        ? "Holiday Assignment"
                        : "Total Leave Duration"}
                    </span>
                    <div className="ar-hero-duration-val">
                      <span className="ar-hero-duration-number">{durationFormatted}</span>
                      {isHalfDay && selectedCell.half_day_type && (
                        <span className="ar-hero-duration-sub">
                          {selectedCell.half_day_type === "first_half" ? "Morning Session" : "Afternoon Session"}
                        </span>
                      )}
                      {isPermType && selectedCell.slot && (
                        <span className="ar-hero-duration-sub">
                          Slot: {selectedCell.slot}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ar-hero-duration-badge">
                    <i className="bi bi-patch-check-fill" /> Active
                  </div>
                </div>

                {/* Multi-date timeline or single date span */}
                {(isLeaveType || isWFH) && selectedCell.from_date && selectedCell.to_date && (
                  <div className="ar-timeline-card">
                    <div className="ar-timeline-col">
                      <span className="ar-tl-label">From Date</span>
                      <strong className="ar-tl-val">{formatDate(selectedCell.from_date)}</strong>
                    </div>
                    <div className="ar-timeline-track">
                      <span className="ar-timeline-line" />
                      <span className="ar-timeline-pill">{durationFormatted}</span>
                      <i className="bi bi-arrow-right" />
                    </div>
                    <div className="ar-timeline-col ar-tl-col-end">
                      <span className="ar-tl-label">To Date</span>
                      <strong className="ar-tl-val">{formatDate(selectedCell.to_date)}</strong>
                    </div>
                  </div>
                )}

                {/* Additional Information Grid */}
                <div className="ar-info-grid">
                  <div className="ar-info-item">
                    <span className="ar-info-title">Attendance Type</span>
                    <div className="ar-info-badge" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
                      <i className={`bi ${meta.icon || (display === "WH" ? "bi-house-door-fill" : "bi-check2")}`} /> {meta.label}
                    </div>
                  </div>

                  {display === "CO" && selectedCell.comp_off_date && (
                    <div className="ar-info-item">
                      <span className="ar-info-title">Earned From Holiday Worked</span>
                      <strong className="ar-info-val">
                        <i className="bi bi-gift-fill" style={{ color: "var(--info)", marginRight: 5 }} />
                        {formatDate(selectedCell.comp_off_date)}
                      </strong>
                    </div>
                  )}

                  {isPR && selectedCell.holiday_name && (
                    <div className="ar-info-item">
                      <span className="ar-info-title">Official Holiday Name</span>
                      <strong className="ar-info-val">
                        <i className="bi bi-star-fill" style={{ color: "var(--warning)", marginRight: 5 }} />
                        {selectedCell.holiday_name}
                      </strong>
                    </div>
                  )}

                  {isPermType && selectedCell.slot && (
                    <div className="ar-info-item">
                      <span className="ar-info-title">Permission Slot</span>
                      <strong className="ar-info-val" style={{ textTransform: "capitalize" }}>
                        {selectedCell.slot}
                      </strong>
                    </div>
                  )}

                  <div className="ar-info-item">
                    <span className="ar-info-title">Approval Status</span>
                    <strong className="ar-info-val" style={{ textTransform: "capitalize" }}>
                      {selectedCell.approval_status || "Approved"}
                    </strong>
                  </div>
                </div>

                {/* Remarks Block with ellipsis hover tooltip */}
                <div className="ar-remarks-box">
                  <div className="ar-remarks-header">
                    <i className="bi bi-chat-quote-fill" />
                    <span>Employee Reason / Remarks</span>
                  </div>
                  <p className="ar-remarks-text" title={selectedCell.remarks || undefined}>
                    {selectedCell.remarks ? `“${selectedCell.remarks}”` : "No specific remarks or reasons were recorded for this entry."}
                  </p>
                </div>
              </div>

              <div className="ul-modal-divider" />

              {/* Unified Standard Footer */}
              <div className="ul-modal-footer">
                <button className="ar-copy-btn" onClick={handleCopyRecord} title="Copy attendance record summary to clipboard">
                  <i className="bi bi-clipboard me-1" /> Copy Summary
                </button>
                <button className="ar-btn-close-action" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppLayout>
  );
}

// ─── STYLES (Theme-Resilient, High-Contrast & Innovative) ─────────────────────
const styles = `
  /* ── Page Header ── */
  .ar-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:14px; }
  .ar-title-badge { display:inline-block; font-size:11px; font-weight:700; color:var(--primary); background:var(--primary-soft); padding:3px 10px; border-radius:20px; margin-bottom:4px; letter-spacing:0.04em; text-transform:uppercase; border:1px solid color-mix(in srgb, var(--primary) 20%, transparent); }
  .ar-page-title { font-size:24px; font-weight:800; color:var(--t-base); margin:0; letter-spacing:-0.02em; font-family:var(--font-display); }
  .ar-breadcrumb { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--t-muted); margin-top:6px; }
  .ar-breadcrumb a { color:var(--primary); text-decoration:none; font-weight:600; }
  .ar-breadcrumb a:hover { text-decoration:underline; }
  .ar-breadcrumb i { font-size:10px; opacity:0.6; }
  .ar-header-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .ar-today-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 15px; background:var(--bg-card); color:var(--t-base); border:1.5px solid var(--border); border-radius:var(--radius); font-size:12.5px; font-weight:600; cursor:pointer; transition:all 0.15s; font-family:var(--font); box-shadow:var(--shadow-sm); }
  .ar-today-btn:hover { border-color:var(--primary); color:var(--primary); background:var(--primary-soft); }
  .ar-export-btn { display:inline-flex; align-items:center; gap:7px; padding:9px 18px; background:var(--success); color:#FFFFFF; border:none; border-radius:var(--radius); font-size:13px; font-weight:700; cursor:pointer; transition:all 0.15s; font-family:var(--font); box-shadow:0 4px 12px color-mix(in srgb, var(--success) 35%, transparent); }
  .ar-export-btn:hover { filter:brightness(1.08); transform:translateY(-1px); }

  /* ── Executive KPI Dashboard Bar ── */
  .ar-kpi-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:12px; margin-bottom:20px; }
  .ar-kpi-card { display:flex; align-items:center; gap:12px; padding:14px 16px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); box-shadow:var(--shadow-card); transition:transform 0.15s, box-shadow 0.15s; }
  .ar-kpi-card:hover { transform:translateY(-2px); box-shadow:var(--shadow-md); }
  .ar-kpi-icon { width:42px; height:42px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
  .ar-kpi-icon-emp { background:var(--primary-soft); color:var(--primary); }
  .ar-kpi-icon-work { background:var(--info-soft); color:var(--info); }
  .ar-kpi-icon-rate { background:var(--success-soft); color:var(--success); }
  .ar-kpi-icon-leave { background:var(--warning-soft); color:var(--warning); }
  .ar-kpi-icon-co { background:var(--purple-soft); color:var(--purple); }
  .ar-kpi-icon-perm { background:color-mix(in srgb, var(--primary) 15%, var(--bg-card)); color:var(--primary); }
  .ar-kpi-info { display:flex; flex-direction:column; min-width:0; }
  .ar-kpi-label { font-size:11px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.04em; }
  .ar-kpi-val { font-size:19px; font-weight:800; color:var(--t-base); line-height:1.2; letter-spacing:-0.02em; font-family:var(--font-display); }
  .ar-kpi-val small { font-size:11px; font-weight:600; color:var(--t-muted); }
  .ar-kpi-sub { font-size:10.5px; color:var(--t-light); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  /* ── Table Card & Toolbar ── */
  .ar-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); box-shadow:var(--shadow-card); overflow:hidden; margin-bottom:24px; }
  .ar-toolbar { display:flex; align-items:flex-end; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border-soft); gap:16px; flex-wrap:wrap; background:color-mix(in srgb, var(--bg-muted) 45%, var(--bg-card)); }
  .ar-controls-left { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; flex:1; }
  .ar-field { display:flex; flex-direction:column; gap:5px; }
  .ar-field-person { min-width:210px; }
  .ar-field-search { min-width:220px; }
  .ar-label { font-size:11px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.06em; }
  .ar-search { display:flex; align-items:center; gap:8px; height:38px; background:var(--bg-card); border:1.5px solid var(--border); border-radius:var(--radius); padding:0 12px; box-shadow:var(--shadow-sm); transition:border-color 0.15s; }
  .ar-search:focus-within { border-color:var(--primary); }
  .ar-search i { font-size:12px; color:var(--t-muted); }
  .ar-search input { flex:1; min-width:0; border:none; outline:none; background:transparent; font-family:var(--font); font-size:13px; color:var(--t-base); }
  .ar-search input::placeholder { color:var(--t-muted); }
  .ar-search-clear { display:flex; align-items:center; justify-content:center; border:none; background:var(--bg-muted); color:var(--t-muted); width:18px; height:18px; border-radius:50%; font-size:9px; cursor:pointer; padding:0; }
  .ar-search-clear:hover { background:var(--danger-soft); color:var(--danger); }
  .ar-load-btn { display:inline-flex; align-items:center; gap:6px; height:38px; padding:0 18px; background:var(--primary); color:var(--on-primary); border:none; border-radius:var(--radius); font-size:13px; font-weight:700; cursor:pointer; transition:all 0.15s; font-family:var(--font); }
  .ar-load-btn:hover:not(:disabled) { background:var(--primary-dark); }
  .ar-load-btn:disabled { opacity:0.6; cursor:not-allowed; }

  /* Legend */
  .ar-legend-wrap { display:flex; flex-direction:column; gap:6px; }
  .ar-legend-title { font-size:10.5px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.05em; }
  .ar-legend { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .ar-legend-item { display:flex; align-items:center; gap:5px; background:var(--bg-card); border:1px solid var(--border-soft); padding:3px 8px; border-radius:6px; cursor:default; }
  .ar-legend-chip { font-size:10px; font-weight:800; padding:2px 6px; border-radius:4px; border:1px solid transparent; letter-spacing:0.04em; }
  .ar-legend-label { font-size:11.5px; color:var(--t-base); font-weight:600; }
  .ar-legend-counter { font-size:10.5px; font-weight:700; color:var(--t-muted); background:var(--bg-muted); padding:1px 5px; border-radius:10px; }

  /* Table Subheader Bar */
  .ar-table-title-bar { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; border-bottom:1px solid var(--border-soft); flex-wrap:wrap; gap:10px; background:var(--bg-card); }
  .ar-table-title { display:flex; align-items:center; gap:8px; font-size:14.5px; font-weight:700; color:var(--t-base); font-family:var(--font-display); }
  .ar-table-title i { color:var(--primary); font-size:16px; }
  .ar-table-meta-right { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .ar-table-count { font-size:12px; color:var(--t-muted); }
  .ar-table-count strong { color:var(--t-base); }
  .ar-hint-pill { font-size:11.5px; color:var(--primary); background:var(--primary-soft); padding:3px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:5px; font-weight:600; }

  /* ── Matrix Table ── */
  .ar-table-scroll { overflow-x:auto; }
  .ar-table { width:100%; border-collapse:collapse; font-size:12.5px; }

  /* thead */
  .ar-th-name { padding:12px 18px; text-align:left; font-size:11px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid var(--border-soft); background:var(--bg-card); position:sticky; left:0; z-index:4; min-width:180px; white-space:nowrap; box-shadow:3px 0 8px -2px rgba(0, 0, 0, 0.05); }
  .ar-th-day { padding:8px 4px; text-align:center; border-bottom:1px solid var(--border-soft); background:var(--bg-card); min-width:44px; border-left:1px solid var(--border-soft); transition:background 0.15s; }
  .ar-th-day-num { font-size:12.5px; font-weight:700; color:var(--t-base); }
  .ar-th-day-name { font-size:9.5px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.05em; }
  .ar-weekend { background:var(--weekend-bg) !important; }
  .ar-weekend .ar-th-day-num, .ar-weekend .ar-th-day-name { color:var(--danger) !important; font-weight:800; }
  .ar-holiday-col { background:var(--holiday-bg) !important; }
  .ar-holiday-col .ar-th-day-num { color:var(--warning) !important; font-weight:800; }
  .ar-today-col { background:color-mix(in srgb, var(--primary) 8%, var(--bg-card)) !important; }
  .ar-today-badge { display:block; font-size:8px; font-weight:800; color:var(--primary); letter-spacing:0.04em; }

  /* tbody */
  .ar-tr { border-bottom:1px solid var(--border-soft); transition:background 0.1s; }
  .ar-tr:last-child { border-bottom:none; }
  .ar-tr:hover { background:var(--bg-hover); }
  .ar-tr:hover .ar-td-name { background:var(--bg-hover); }
  .ar-td-name { padding:8px 18px; border-right:1px solid var(--border-soft); position:sticky; left:0; background:var(--bg-card); z-index:3; white-space:nowrap; box-shadow:3px 0 8px -2px rgba(0, 0, 0, 0.05); }
  .ar-emp-cell { display:flex; align-items:center; gap:9px; }
  .ar-avatar { width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--primary-dark)); color:var(--on-primary); font-size:11.5px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 2px 6px color-mix(in srgb, var(--primary) 25%, transparent); }
  .ar-avatar-hero { width:46px; height:46px; font-size:17px; }
  .ar-emp-name { font-size:12.5px; font-weight:600; color:var(--t-base); max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:inline-block; vertical-align:middle; }
  .ar-td-cell { padding:5px 3px; text-align:center; border-left:1px solid var(--border-soft); transition:background 0.12s; }
  .ar-weekend-cell { background:var(--weekend-cell-bg); }
  .ar-today-cell { background:color-mix(in srgb, var(--primary) 4%, transparent); }
  .ar-clickable { cursor:pointer; }
  .ar-clickable:hover { background:color-mix(in srgb, var(--primary) 12%, transparent); }
  .ar-clickable:hover .ar-cell-chip { transform:translateY(-1px) scale(1.12); box-shadow:0 4px 10px rgba(0,0,0,0.12); }
  .ar-cell-chip { display:inline-flex; align-items:center; justify-content:center; font-size:10.5px; font-weight:800; padding:2px 6px; border-radius:6px; letter-spacing:0.03em; min-width:27px; border:1px solid transparent; transition:transform 0.15s, box-shadow 0.15s; }

  /* Loading & Empty */
  .ar-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:60px 20px; color:var(--t-muted); font-size:13.5px; }
  .ar-spin { animation:ar-spin 0.7s linear infinite; display:inline-block; }
  .ar-spin-lg { font-size:28px; color:var(--primary); }
  @keyframes ar-spin { to { transform:rotate(360deg); } }
  .ar-empty { text-align:center; padding:50px 20px; color:var(--t-muted); font-size:13.5px; }
  .ar-empty i { font-size:32px; opacity:0.4; display:block; margin-bottom:8px; }

  /* ── INNOVATIVE ATTENDANCE DETAIL MODAL (THE VIEW PAGE) ── */
  .ar-modal-backdrop { position:fixed; inset:0; background:rgba(15, 23, 42, 0.65); backdrop-filter:blur(10px); z-index:1050; display:flex; align-items:center; justify-content:center; padding:16px; animation:ar-fade-in 0.18s ease-out; }
  .ar-modal-container { width:100%; max-width:540px; max-height:90vh; background:var(--bg-card); border-radius:18px; border:1px solid var(--border); box-shadow:0 25px 60px -15px rgba(0, 0, 0, 0.35); display:flex; flex-direction:column; overflow:hidden; animation:ar-scale-up 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
  @keyframes ar-fade-in { from{opacity:0} to{opacity:1} }
  @keyframes ar-scale-up { from{opacity:0; transform:scale(0.94)} to{opacity:1; transform:scale(1)} }

  /* Modal Hero Header */
  .ar-modal-hero { padding:18px 22px 16px; border-bottom:1.5px solid var(--border-soft); background:color-mix(in srgb, var(--bg-muted) 55%, var(--bg-card)); }
  .ar-modal-hero-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; gap:8px; }
  .ar-modal-hero-badge { display:inline-flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; padding:4px 12px; border-radius:20px; border:1px solid transparent; letter-spacing:0.03em; }
  .ar-status-tag { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:800; padding:3px 10px; border-radius:20px; letter-spacing:0.04em; }
  .ar-status-dot { width:7px; height:7px; border-radius:50%; }
  .ar-status-approved { background:var(--success-soft); color:var(--success); border:1px solid color-mix(in srgb, var(--success) 30%, transparent); }
  .ar-status-approved .ar-status-dot { background:var(--success); box-shadow:0 0 6px var(--success); }
  .ar-status-pending  { background:var(--warning-soft); color:var(--warning); border:1px solid color-mix(in srgb, var(--warning) 30%, transparent); }
  .ar-status-pending .ar-status-dot  { background:var(--warning); box-shadow:0 0 6px var(--warning); }
  .ar-status-rejected { background:var(--danger-soft); color:var(--danger); border:1px solid color-mix(in srgb, var(--danger) 30%, transparent); }
  .ar-status-rejected .ar-status-dot { background:var(--danger); box-shadow:0 0 6px var(--danger); }

  .ar-modal-close-btn { width:32px; height:32px; border-radius:50%; background:var(--bg-card); border:1px solid var(--border); color:var(--t-muted); display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:13px; transition:all 0.15s; margin-left:auto; }
  .ar-modal-close-btn:hover { background:var(--danger-soft); color:var(--danger); border-color:var(--danger); transform:rotate(90deg); }

  .ar-modal-hero-user { display:flex; align-items:center; gap:14px; }
  .ar-modal-user-info { display:flex; flex-direction:column; gap:2px; min-width:0; }
  .ar-modal-emp-name { margin:0; font-size:17px; font-weight:800; color:var(--t-base); letter-spacing:-0.01em; font-family:var(--font-display); }
  .ar-modal-record-date { font-size:12.5px; color:var(--t-muted); display:flex; align-items:center; gap:6px; font-weight:500; }
  .ar-modal-record-date i { color:var(--primary); font-size:12px; }

  /* Modal Content */
  .ar-modal-content { padding:20px 22px; overflow-y:auto; display:flex; flex-direction:column; gap:14px; }
  .ar-modal-content::-webkit-scrollbar { width:4px; }
  .ar-modal-content::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }

  /* ── HERO DURATION ("2 DAYS") DISPLAY ── */
  .ar-hero-duration-card { display:flex; align-items:center; gap:14px; padding:15px 18px; background:color-mix(in srgb, var(--primary) 8%, var(--bg-card)); border:1.5px solid color-mix(in srgb, var(--primary) 28%, var(--border)); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); }
  .ar-hero-duration-icon { width:44px; height:44px; border-radius:12px; background:var(--primary); color:var(--on-primary); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; box-shadow:0 4px 12px color-mix(in srgb, var(--primary) 28%, transparent); }
  .ar-hero-duration-content { flex:1; display:flex; flex-direction:column; gap:2px; }
  .ar-hero-duration-label { font-size:11px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.06em; }
  .ar-hero-duration-val { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
  .ar-hero-duration-number { font-size:18px; font-weight:800; color:var(--t-base); letter-spacing:-0.01em; font-family:var(--font-display); }
  .ar-hero-duration-sub { font-size:12px; font-weight:600; color:var(--t-muted); background:var(--bg-card); padding:2px 8px; border-radius:12px; border:1px solid var(--border); }
  .ar-hero-duration-badge { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:700; color:var(--primary); background:var(--bg-card); padding:4px 10px; border-radius:20px; border:1px solid color-mix(in srgb, var(--primary) 25%, var(--border)); }

  /* Timeline */
  .ar-timeline-card { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:var(--bg-muted); border-radius:var(--radius); border:1px solid var(--border-soft); gap:10px; }
  .ar-timeline-col { display:flex; flex-direction:column; gap:2px; }
  .ar-tl-col-end { text-align:right; }
  .ar-tl-label { font-size:10px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.05em; }
  .ar-tl-val { font-size:13px; font-weight:700; color:var(--t-base); font-variant-numeric:tabular-nums; }
  .ar-timeline-track { flex:1; display:flex; align-items:center; justify-content:center; position:relative; gap:6px; padding:0 8px; }
  .ar-timeline-line { position:absolute; left:0; right:0; height:2px; background:var(--border); z-index:0; }
  .ar-timeline-pill { position:relative; z-index:1; font-size:10.5px; font-weight:700; background:var(--bg-card); border:1px solid var(--border); color:var(--primary); padding:2px 8px; border-radius:12px; }
  .ar-timeline-track i { position:relative; z-index:1; font-size:12px; color:var(--t-muted); margin-left:auto; }

  /* Info Grid */
  .ar-info-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; }
  .ar-info-item { display:flex; flex-direction:column; gap:4px; padding:10px 14px; background:var(--bg-muted); border-radius:var(--radius); border:1px solid var(--border-soft); }
  .ar-info-title { font-size:10.5px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.05em; }
  .ar-info-val { font-size:13px; font-weight:600; color:var(--t-base); }
  .ar-info-badge { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; width:fit-content; border:1px solid transparent; }

  /* Remarks */
  .ar-remarks-box { display:flex; flex-direction:column; gap:6px; padding:12px 16px; background:var(--bg-muted); border-radius:var(--radius); border-left:3.5px solid var(--primary); }
  .ar-remarks-header { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.05em; }
  .ar-remarks-header i { color:var(--primary); font-size:12px; }
  .ar-remarks-text { margin:0; font-size:13px; font-style:italic; color:var(--t-base); line-height:1.5; word-break:break-word; }

  /* Modal Footer */
  .ar-modal-footer { display:flex; align-items:center; justify-content:space-between; padding:14px 22px; border-top:1px solid var(--border-soft); background:var(--bg-card); gap:10px; }
  .ar-copy-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 15px; border-radius:var(--radius); background:var(--bg-muted); color:var(--t-base); font-size:12.5px; font-weight:600; border:1px solid var(--border); cursor:pointer; transition:all 0.15s; font-family:var(--font); }
  .ar-copy-btn:hover { background:var(--primary-soft); color:var(--primary); border-color:var(--primary); }
  .ar-btn-close-action { display:inline-flex; align-items:center; justify-content:center; padding:8px 20px; border-radius:var(--radius); background:var(--primary); color:var(--on-primary); font-size:13px; font-weight:700; border:none; cursor:pointer; transition:all 0.15s; font-family:var(--font); }
  .ar-btn-close-action:hover { background:var(--primary-dark); }

  /* ── Person Monthly Summary ── */
  .ar-summary-card { margin-top:24px; }
  .ar-sum-totals { display:flex; gap:10px; flex-wrap:wrap; padding:14px 20px; border-bottom:1px solid var(--border-soft); background:color-mix(in srgb, var(--bg-muted) 45%, var(--bg-card)); }
  .ar-sum-total-chip { display:flex; align-items:center; gap:8px; padding:9px 14px; border-radius:var(--radius); font-size:12px; font-weight:600; flex:1; min-width:130px; box-shadow:var(--shadow-sm); }
  .ar-sum-total-chip i { font-size:16px; }
  .ar-sum-total-val { font-size:16px; font-weight:800; letter-spacing:-0.02em; font-family:var(--font-display); }
  .ar-sum-total-label { color:var(--t-muted); font-weight:600; font-size:11px; margin-left:auto; white-space:nowrap; }
  .ar-sum-t-leave { background:var(--warning-soft); color:var(--warning); }
  .ar-sum-t-co { background:var(--info-soft); color:var(--info); }
  .ar-sum-t-perm { background:var(--primary-soft); color:var(--primary); }
  .ar-sum-t-pr { background:var(--purple-soft); color:var(--purple); }
  .ar-sum-t-all { background:var(--success-soft); color:var(--success); }

  .ar-sum-table-wrap { overflow-x:auto; }
  .ar-sum-table { width:100%; border-collapse:collapse; font-size:13px; }
  .ar-sum-table thead th { padding:10px 14px; font-size:10.5px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.06em; text-align:left; border-bottom:1px solid var(--border-soft); white-space:nowrap; background:var(--bg-card); }
  .ar-sum-th-month { min-width:140px; }
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
  .ar-sum-has-data { background:var(--primary-soft); color:var(--primary); font-weight:800; }
  .ar-sum-rec-count { display:inline-block; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:10px; background:var(--bg-muted); color:var(--t-muted); }
  .ar-sum-td-act { text-align:right; }

  .ar-sum-tr-total { background:var(--success-soft); border-top:2px solid var(--success); }
  .ar-sum-tr-total:hover { background:var(--success-soft); }
  .ar-sum-total-badge { background:var(--success); color:#FFFFFF; font-size:11px; letter-spacing:0.04em; }
  .ar-sum-grand { display:inline-block; min-width:34px; text-align:center; font-size:14px; font-weight:800; padding:3px 10px; border-radius:20px; background:var(--success); color:#FFFFFF; }

  /* Details inside expanded month */
  .ar-sum-detail-row { background:var(--bg); border-bottom:1px solid var(--border-soft); }
  .ar-sum-detail-row:hover { background:var(--bg-hover); }
  .ar-sum-detail-row td { padding:8px 14px; }
  .ar-sum-detail-pad { border:none; }
  .ar-sum-detail-item { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .ar-sum-detail-chip { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px; white-space:nowrap; }
  .ar-sum-detail-date { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:600; color:var(--t-base); font-variant-numeric:tabular-nums; }
  .ar-sum-detail-date i { color:var(--t-muted); font-size:11px; }
  .ar-sum-detail-dur { font-size:11.5px; font-weight:700; color:var(--t-base); background:var(--bg-muted); border:1px solid var(--border); padding:3px 9px; border-radius:12px; }
  .ar-sum-detail-note { display:inline-flex; align-items:center; gap:4px; font-size:11px; color:var(--t-muted); }
  .ar-sum-detail-note i { color:var(--info); font-size:10px; }
  .ar-sum-detail-remarks { display:inline-flex; align-items:center; gap:4px; font-size:11.5px; color:var(--t-base); max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ar-sum-detail-remarks i { font-size:10px; color:var(--t-muted); }

  @media(max-width: 768px) {
    .ar-page-title { font-size:20px; }
    .ar-kpi-grid { grid-template-columns:repeat(2, 1fr); }
    .ar-controls-left { flex-direction:column; align-items:stretch; }
    .ar-field-person, .ar-field-search { min-width:100%; }
    .ar-modal-container { width:95vw; }
  }
`;
