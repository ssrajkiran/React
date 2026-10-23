import { useState, useEffect } from "react";
import api from "../../api";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import AppLayout from "../../components/layout/AppLayout";
import { Link } from "react-router-dom";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import SharedDatePicker from "../../components/SharedDatePicker";
import SharedSelect from "../../components/SharedSelect";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function pad(n) { return String(n).padStart(2, "0"); }
function toDS(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function is2ndOr4thSat(y, m, d) {
  if (new Date(y, m, d).getDay() !== 6) return false;
  let count = 0;
  for (let i = 1; i <= d; i++) if (new Date(y, m, i).getDay() === 6) count++;
  return count === 2 || count === 4;
}

function HolidayCalendar({ holidays, selected, onSelect }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const holidayMap = {};
  holidays.forEach((h) => { holidayMap[h.date] = h.name; });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const navigate = (dir) => {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  const getDayMeta = (y, m, d) => {
    const ds = toDS(y, m, d);
    const dow = new Date(y, m, d).getDay();
    if (holidayMap[ds]) return { type: "holiday", label: holidayMap[ds], ds };
    if (dow === 0) return { type: "sunday", label: "Sunday", ds };
    if (is2ndOr4thSat(y, m, d)) return { type: "saturday-off", label: "2nd/4th Saturday", ds };
    return { type: "workday", ds };
  };

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, otherMonth: true, disabled: true });
  for (let d = 1; d <= daysInMonth; d++) {
    const meta = getDayMeta(year, month, d);
    cells.push({ day: d, ...meta, disabled: meta.type === "workday" });
  }
  const rem = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let i = 1; i <= rem; i++) cells.push({ day: i, otherMonth: true, disabled: true });

  const TYPE_STYLE = {
    holiday: { bg: "var(--success-soft)", color: "var(--success)", dot: "var(--success)" },
    sunday: { bg: "var(--danger-soft)", color: "var(--danger)", dot: "var(--danger)" },
    "saturday-off": { bg: "var(--warning-soft)", color: "var(--warning)", dot: "var(--warning)" },
    workday: { bg: "transparent", color: "var(--border)", dot: null },
  };

  return (
    <div className="hcal">
      <div className="hcal-nav">
        <button className="hcal-nav-btn" title="Previous month" onClick={() => navigate(-1)}><i className="bi bi-chevron-left" /></button>
        <span className="hcal-title">{MONTHS[month]} {year}</span>
        <button className="hcal-nav-btn" title="Next month" onClick={() => navigate(1)}><i className="bi bi-chevron-right" /></button>
      </div>
      <div className="hcal-grid">
        <div className="hcal-dow">
          {DAYS_SHORT.map((d, i) => (
            <div key={d} className={`hcal-dow-cell${i === 0 ? " hcal-dow-sun" : i === 6 ? " hcal-dow-sat" : ""}`}>{d}</div>
          ))}
        </div>
        <div className="hcal-days">
          {cells.map((c, i) => {
            const ts = TYPE_STYLE[c.type] || TYPE_STYLE.workday;
            const isSelected = !c.otherMonth && c.ds === selected;
            const clickable = !c.disabled && !c.otherMonth;
            return (
              <div key={i} className={["hcal-day-cell", c.otherMonth || c.disabled ? "hcal-disabled" : "", isSelected ? "hcal-selected" : ""].join(" ").trim()}
                style={isSelected ? {} : { background: c.otherMonth ? "transparent" : ts.bg, color: c.otherMonth ? "var(--border)" : ts.color }}
                title={c.label || ""} onClick={() => clickable && onSelect(c.ds === selected ? "" : c.ds)}>
                {c.day}
                {ts.dot && !c.otherMonth && !isSelected && <span className="hcal-dot" style={{ background: ts.dot }} />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="hcal-legend">
        <div className="hcal-leg-item"><span className="hcal-leg-dot" style={{ background: "var(--success)" }} /> Public Holiday</div>
        <div className="hcal-leg-item"><span className="hcal-leg-dot" style={{ background: "var(--danger)" }} /> Sunday</div>
        <div className="hcal-leg-item"><span className="hcal-leg-dot" style={{ background: "var(--warning)" }} /> 2nd / 4th Sat</div>
      </div>
    </div>
  );
}

export default function Leaves() {
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [sortField, setSortField] = useState("start");
  const [sortOrder, setSortOrder] = useState("desc");
  const [permissionRemaining, setPermissionRemaining] = useState(2);
  const [compoffEligible, setCompoffEligible] = useState([]);
  const [compoffLoading, setCompoffLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: null, leave_type: "leave", start_date: "", end_date: "", reason: "", days: 0,
    compoff_date: "", half_day_type: "full", hours: 0, slot: "morning", status: "", holiday_name: "",
  });

  const fetchLeaves = async () => {
    try {
      const res = await api.get("/leaves/my");
      setEvents(res.data.map((ev) => ({ ...ev, start: new Date(ev.start), end: new Date(ev.end) })));
    } catch (err) { console.error(err); }
  };
  const fetchPermissionRemaining = async () => {
    try { const res = await api.get("/leaves/permission-remaining"); setPermissionRemaining(res.data.remaining || 0); }
    catch { setPermissionRemaining(0); }
  };
  const fetchHolidays = async () => {
    try { const res = await api.get("/leaves/holidays"); setHolidays(res.data); } catch (err) { console.error(err); }
  };
  const fetchCompoffEligible = async () => {
    setCompoffLoading(true);
    try { const res = await api.get("/leaves/compoff-eligible"); setCompoffEligible(res.data); }
    catch { setCompoffEligible([]); } finally { setCompoffLoading(false); }
  };

  useEffect(() => { fetchLeaves(); fetchPermissionRemaining(); fetchHolidays(); }, []);
  useEffect(() => {
    if (formData.leave_type === "compoff" && !formData.id) { fetchCompoffEligible(); setFormData((prev) => ({ ...prev, compoff_date: "" })); }
  }, [formData.leave_type]);

  const toCalendarDate = (date) => { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start); s.setHours(0, 0, 0, 0);
    const e = new Date(end); e.setHours(0, 0, 0, 0);
    return (e - s) / (1000 * 60 * 60 * 24) + 1;
  };
  const blankForm = (overrides = {}) => ({
    id: null, leave_type: "leave", start_date: "", end_date: "", reason: "", days: 0,
    compoff_date: "", half_day_type: "full", hours: permissionRemaining, slot: "morning", status: "pending", holiday_name: "", ...overrides,
  });

  const handleDelete = async () => {
    if (!formData.id) return;
    try {
      setLoading(true);
      await api.delete(`/leaves/delete/${formData.id}?type=${formData.leave_type}`);
      setLoading(false); setShowModal(false); setShowDeleteConfirm(false);
      fetchLeaves(); fetchPermissionRemaining();
      alert(`${formData.leave_type.charAt(0).toUpperCase() + formData.leave_type.slice(1)} deleted successfully!`);
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Something went wrong while deleting.");
      setLoading(false);
    }
  };

  const handleSelectSlot = (slotInfo) => {
    const startDate = new Date(slotInfo.start);
    const endDate = new Date(slotInfo.end);
    if (startDate.getTime() !== endDate.getTime()) endDate.setDate(endDate.getDate() - 1);
    const overlapping = events.some((ev) => {
      if (ev.type !== "leave" && ev.type !== "compoff") return false;
      return startDate <= new Date(ev.end) && endDate >= new Date(ev.start);
    });
    if (overlapping) { alert("Leave already exists for selected date(s)."); return; }
    setFormData(blankForm({ start_date: toCalendarDate(startDate), end_date: toCalendarDate(endDate), days: calculateDays(startDate, endDate) }));
    setIsViewMode(false); setShowModal(true);
  };

  const handleSelectEvent = (event) => {
    const viewOnly = event.status === "approved";
    setFormData({
      id: event.id, leave_type: event.type || "leave", start_date: toCalendarDate(event.start), end_date: toCalendarDate(event.end),
      reason: event.remarks || "", days: calculateDays(event.start, event.end), compoff_date: event.comp_off_date || "",
      half_day_type: event.half_day_type || "full", hours: event.hours || permissionRemaining, slot: event.slot || "morning",
      status: event.status, holiday_name: event.holiday_name || "",
    });
    if (event.type === "compoff" && event.status !== "approved") fetchCompoffEligible();
    setIsViewMode(viewOnly); setShowModal(true);
  };

  useEffect(() => {
    if (formData.leave_type !== "leave") return;
    const total = calculateDays(formData.start_date, formData.end_date);
    setFormData((prev) => ({
      ...prev,
      days: formData.start_date === formData.end_date && formData.half_day_type !== "full" ? 0.5 : total,
    }));
  }, [formData.start_date, formData.end_date, formData.half_day_type, formData.leave_type]);

  const handleSubmit = async () => {
    if (isViewMode) return;
    setLoading(true);
    try {
      let payload = { id: formData.id };
      if (formData.leave_type === "permission") {
        if (!formData.start_date || !formData.hours || !formData.slot) { alert("Please fill all fields for permission."); setLoading(false); return; }
        if (formData.hours > permissionRemaining) { alert(`You only have ${permissionRemaining} hour(s) remaining.`); setLoading(false); return; }
        payload = { ...payload, from_date: formData.start_date, type: "permission", hours: formData.hours, slot: formData.slot, remarks: formData.reason || null };
      } else if (formData.leave_type === "compoff") {
        if (!formData.start_date || !formData.compoff_date) { alert("Please fill all fields for comp off."); setLoading(false); return; }
        payload = { ...payload, from_date: formData.start_date, type: "compoff", comp_off_date: formData.compoff_date, days: formData.half_day_type !== "full" ? 0.5 : 1, half_day_type: formData.half_day_type, remarks: formData.reason || null };
      } else if (formData.leave_type === "present") {
        if (!formData.start_date) { alert("Please select a holiday date."); setLoading(false); return; }
        const selectedHoliday = holidays.find((h) => h.date === formData.start_date);
        let holidayName = selectedHoliday?.name || null;
        if (!holidayName) {
          const dow = new Date(formData.start_date).getDay();
          if (dow === 0) holidayName = "Sunday";
          else if (is2ndOr4thSat(...formData.start_date.split("-").map((v, i) => i === 1 ? Number(v) - 1 : Number(v)))) holidayName = "2nd/4th Saturday";
        }
        payload = { ...payload, from_date: formData.start_date, type: "present", holiday_name: holidayName, remarks: formData.reason || null };
      } else {
        if (!formData.start_date || !formData.end_date) { alert("Please select start and end date."); setLoading(false); return; }
        payload = { ...payload, from_date: formData.start_date, to_date: formData.end_date, type: "leave", days: formData.days, half_day_type: formData.half_day_type, remarks: formData.reason || null };
      }
      await api.post("/leaves", payload);
      setLoading(false); setShowModal(false); fetchLeaves(); fetchPermissionRemaining();
    } catch (err) { alert(err.response?.data?.error || "Something went wrong"); setLoading(false); }
  };

  const typeConfig = {
    leave: { label: "Leave", color: "var(--primary)", bg: "var(--primary-soft)" },
    compoff: { label: "Comp Off", color: "var(--info)", bg: "var(--info-soft)" },
    permission: { label: "Permission", color: "var(--warning)", bg: "var(--warning-soft)" },
    present: { label: "Present on Holiday", color: "var(--success)", bg: "var(--success-soft)" },
  };
  const statusConfig = {
    approved: { label: "Approved", color: "var(--success)", bg: "var(--success-soft)" },
    pending: { label: "Pending", color: "var(--warning)", bg: "var(--warning-soft)" },
    rejected: { label: "Rejected", color: "var(--danger)", bg: "var(--danger-soft)" },
  };
  const typeIcons = { leave: "bi-calendar-x", compoff: "bi-arrow-left-right", permission: "bi-clock", present: "bi-person-check" };
  const modalTitle = isViewMode ? `${typeConfig[formData.leave_type]?.label || "Leave"} Details` : formData.id ? "Edit Request" : "New Request";

  const selectedHolidayName = (() => {
    if (!formData.start_date) return "—";
    const ph = holidays.find((h) => h.date === formData.start_date);
    if (ph) return ph.name;
    const dow = new Date(formData.start_date).getDay();
    if (dow === 0) return "Sunday";
    const [y, m, d] = formData.start_date.split("-").map(Number);
    if (is2ndOr4thSat(y, m - 1, d)) return "2nd/4th Saturday";
    return formData.holiday_name || "—";
  })();

  const handleSort = (field) => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("asc"); }
  };
  const sortedEvents = [...events].sort((a, b) => {
    let valA, valB;
    if (sortField === "start") { valA = a.start; valB = b.start; }
    else if (sortField === "type") { valA = a.type; valB = b.type; }
    else if (sortField === "status") { valA = a.status; valB = b.status; }
    else { valA = a.start; valB = b.start; }
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const formatDate = (d) => { try { return format(new Date(d), "dd MMM yyyy"); } catch { return "—"; } };

  return (
    <AppLayout>
      <style>{styles}</style>

      <div className="lv-page-header">
        <div>
          <h5 className="lv-page-title">Attendance</h5>
          <nav className="lv-breadcrumb">
            <Link to="/employee/dashboard">Dashboard</Link>
            <i className="bi bi-chevron-right" />
            <span>Attendance</span>
          </nav>
        </div>
      </div>

      <div className="lv-card">
        <div className="lv-toolbar">
          <div className="lv-view-toggle">
            <button className={`lv-toggle-btn ${viewMode === "calendar" ? "active" : ""}`} onClick={() => setViewMode("calendar")}>
              <i className="bi bi-calendar3" /> Calendar
            </button>
            <button className={`lv-toggle-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>
              <i className="bi bi-list-ul" /> List
            </button>
          </div>
          <div className="lv-toolbar-right">
            <span className="lv-count">{events.length} record{events.length === 1 ? "" : "s"}</span>
            <button className="lv-apply-btn" onClick={() => { setFormData(blankForm()); setCompoffEligible([]); setIsViewMode(false); setShowModal(true); }}>
              <i className="bi bi-plus-lg" /> Apply Leave
            </button>
          </div>
        </div>
        {viewMode === "calendar" ? (
          <>
            <div className="lv-legend">
              {Object.entries(statusConfig).map(([key, s]) => (
                <div key={key} className="lv-legend-item">
                  <span className="lv-legend-dot" style={{ background: s.color }} />
                  <span>{s.label}</span>
                </div>
              ))}
              <div className="lv-legend-sep" />
              <span className="lv-legend-hint"><i className="bi bi-info-circle" /> Click a date to apply · Click an event to view</span>
            </div>
            <div className="lv-calendar-wrap">
              <Calendar selectable localizer={localizer} events={events} startAccessor="start" endAccessor="end"
                style={{ height: 600 }} onSelectSlot={handleSelectSlot} onSelectEvent={handleSelectEvent}
                eventPropGetter={(event) => {
                  const color = event.status === "approved" ? "var(--success)" : event.status === "rejected" ? "var(--danger)" : "var(--warning)";
                  return { style: { backgroundColor: color, color: "#fff", borderRadius: "6px", border: "none", fontSize: "12px", fontWeight: 600 } };
                }}
              />
            </div>
          </>
        ) : (
          <div className="lv-table-wrap">
            {sortedEvents.length === 0 ? (
              <div className="lv-empty-state">
                <i className="bi bi-calendar-x lv-empty-icon" />
                <h3>No Attendance Records</h3>
                <p>You haven't applied for any leaves yet. Click "Apply Leave" to get started.</p>
              </div>
            ) : (
              <table className="lv-table">
                <thead>
                  <tr>
                    {[
                      { key: "type", label: "Type" },
                      { key: "start", label: "Date" },
                      { key: null, label: "Duration" },
                      { key: null, label: "Reason" },
                      { key: "status", label: "Status" },
                      { key: null, label: "Actions" },
                    ].map(({ key, label }, idx) => (
                      <th key={idx} className={key ? "lv-th-sortable" : ""} onClick={key ? () => handleSort(key) : undefined}>
                        {label}
                        {key && sortField === key && <i className={`bi bi-chevron-${sortOrder === "asc" ? "up" : "down"} lv-sort-icon`} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedEvents.map((ev, idx) => (
                    <tr key={idx} className="lv-tr">
                      <td>
                        <span className="lv-type-pill" style={{ background: typeConfig[ev.type]?.bg, color: typeConfig[ev.type]?.color }}>
                          <i className={`bi ${typeIcons[ev.type] || "bi-calendar-x"}`} style={{ fontSize: 11 }} />
                          {typeConfig[ev.type]?.label || ev.type}
                        </span>
                      </td>
                      <td>
                        <div className="lv-date-cell">
                          <span className="lv-date-main">{formatDate(ev.start)}</span>
                          {ev.start !== ev.end && <span className="lv-date-sub">to {formatDate(ev.end)}</span>}
                        </div>
                      </td>
                      <td className="lv-duration">
                        {ev.type === "permission" ? `${ev.hours || "-"}h` : ev.type === "present" ? "—" : `${ev.days || 1}d`}
                      </td>
                      <td className="lv-reason">{ev.remarks || <span className="lv-muted">—</span>}</td>
                      <td>
                        <span className="lv-status-pill" style={{ background: statusConfig[ev.status]?.bg, color: statusConfig[ev.status]?.color }}>
                          <span className="lv-status-dot" style={{ background: statusConfig[ev.status]?.color }} />
                          {statusConfig[ev.status]?.label || ev.status}
                        </span>
                      </td>
                      <td>
                        <div className="lv-actions">
                          <button className="lv-action-btn lv-view-btn" title="View" onClick={() => handleSelectEvent(ev)}>
                            <i className="bi bi-eye" />
                          </button>
                          {ev.status !== "approved" && (
                            <button className="lv-action-btn lv-edit-btn" title="Edit" onClick={() => { handleSelectEvent(ev); setIsViewMode(false); }}>
                              <i className="bi bi-pencil" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="ul-overlay" onClick={() => setShowModal(false)}>
          <div className="ul-modal ul-modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="ul-modal-header">
                <div className="ul-modal-header-left">
                  {formData.status && (
                    <span className="lv-status-pill-sm" style={{ background: statusConfig[formData.status]?.bg, color: statusConfig[formData.status]?.color }}>
                      <span className="lv-status-dot" style={{ background: statusConfig[formData.status]?.color }} />
                      {statusConfig[formData.status]?.label || formData.status}
                    </span>
                  )}
                  <div>
                    <h6 className="ul-modal-title">{modalTitle}</h6>
                    <p className="ul-modal-sub">{isViewMode ? "View request details" : "Submit a leave request"}</p>
                  </div>
                </div>
                <button className="ul-modal-close" title="Close" onClick={() => setShowModal(false)}><i className="bi bi-x-lg" /></button>
              </div>

              <div className="ul-modal-divider" />

              <div className="ul-modal-body">
                {isViewMode ? (
                  /* ===== VIEW MODE ===== */
                  <div className="lv-view-content">
                    {/* Type Badge */}
                    <div className="lv-view-type" style={{ background: typeConfig[formData.leave_type]?.bg, color: typeConfig[formData.leave_type]?.color }}>
                      <i className={`bi ${typeIcons[formData.leave_type] || "bi-calendar-x"}`} />
                      {typeConfig[formData.leave_type]?.label}
                    </div>

                    {/* Info Grid */}
                    <div className="lv-view-grid">
                      {formData.leave_type === "leave" && (
                        <>
                          <div className="lv-view-item">
                            <span className="lv-view-label">Start Date</span>
                            <span className="lv-view-value">{formData.start_date || "—"}</span>
                          </div>
                          <div className="lv-view-item">
                            <span className="lv-view-label">End Date</span>
                            <span className="lv-view-value">{formData.end_date || "—"}</span>
                          </div>
                          <div className="lv-view-item">
                            <span className="lv-view-label">Duration</span>
                            <span className="lv-view-value lv-view-highlight">{formData.days} {formData.days === 1 ? "day" : "days"}</span>
                          </div>
                          {formData.half_day_type !== "full" && (
                            <div className="lv-view-item">
                              <span className="lv-view-label">Type</span>
                              <span className="lv-view-value">{formData.half_day_type === "first_half" ? "First Half" : "Second Half"}</span>
                            </div>
                          )}
                        </>
                      )}
                      {formData.leave_type === "compoff" && (
                        <>
                          <div className="lv-view-item">
                            <span className="lv-view-label">Leave Date</span>
                            <span className="lv-view-value">{formData.start_date || "—"}</span>
                          </div>
                          <div className="lv-view-item">
                            <span className="lv-view-label">Holiday Worked</span>
                            <span className="lv-view-value">{formData.compoff_date || "—"}</span>
                          </div>
                          <div className="lv-view-item">
                            <span className="lv-view-label">Duration</span>
                            <span className="lv-view-value lv-view-highlight">
                              {formData.half_day_type === "first_half" ? "1st Half" : formData.half_day_type === "second_half" ? "2nd Half" : "Full Day"}
                            </span>
                          </div>
                        </>
                      )}
                      {formData.leave_type === "present" && (
                        <>
                          <div className="lv-view-item">
                            <span className="lv-view-label">Holiday Date</span>
                            <span className="lv-view-value">{formData.start_date || "—"}</span>
                          </div>
                          <div className="lv-view-item">
                            <span className="lv-view-label">Holiday Name</span>
                            <span className="lv-view-value">{selectedHolidayName}</span>
                          </div>
                        </>
                      )}
                      {formData.leave_type === "permission" && (
                        <>
                          <div className="lv-view-item">
                            <span className="lv-view-label">Date</span>
                            <span className="lv-view-value">{formData.start_date || "—"}</span>
                          </div>
                          <div className="lv-view-item">
                            <span className="lv-view-label">Hours</span>
                            <span className="lv-view-value lv-view-highlight">{formData.hours}h</span>
                          </div>
                          <div className="lv-view-item">
                            <span className="lv-view-label">Slot</span>
                            <span className="lv-view-value">{formData.slot === "morning" ? "Morning" : "Evening"}</span>
                          </div>
                        </>
                      )}
                      {formData.reason && (
                        <div className="lv-view-item lv-view-full">
                          <span className="lv-view-label">Reason</span>
                          <span className="lv-view-value">{formData.reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ===== EDIT MODE ===== */
                  <>
                    {/* Request Type — dropdown */}
                    <div className="lv-field">
                      <label className="lv-label">Request Type</label>
                      <SharedSelect
                        value={formData.leave_type}
                        onChange={(val) => setFormData({ ...formData, leave_type: val, start_date: "", end_date: "", compoff_date: "", half_day_type: "full" })}
                        options={Object.entries(typeConfig).map(([key, cfg]) => ({ value: key, label: cfg.label }))}
                        placeholder="Select request type…"
                      />
                    </div>

                    {/* Leave Type Fields */}
                    {formData.leave_type === "leave" && (
                      <div className="lv-form-grid">
                        <div className="lv-field">
                          <label className="lv-label">Start Date</label>
                          <SharedDatePicker value={formData.start_date} disabled={isViewMode} onChange={(val) => setFormData({ ...formData, start_date: val })} className="lv-input" />
                        </div>
                        <div className="lv-field">
                          <label className="lv-label">End Date</label>
                          <SharedDatePicker value={formData.end_date} disabled={isViewMode} onChange={(val) => setFormData({ ...formData, end_date: val })} className="lv-input" />
                        </div>
                        {formData.start_date === formData.end_date && formData.start_date && (
                          <div className="lv-field lv-field-full">
                            <label className="lv-label">Duration</label>
                            <div className="lv-radio-group">
                              {[["full", "Full Day"], ["first_half", "First Half"], ["second_half", "Second Half"]].map(([val, lbl]) => (
                                <label key={val} className={`lv-radio-btn ${formData.half_day_type === val ? "active" : ""}`}>
                                  <input type="radio" name="half_day_type" value={val} checked={formData.half_day_type === val} disabled={isViewMode}
                                    onChange={(e) => setFormData({ ...formData, half_day_type: e.target.value })} />
                                  {lbl}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="lv-field lv-field-full">
                          <label className="lv-label">Number of Days</label>
                          <div className="lv-days-display"><i className="bi bi-calendar-check" /><span>{formData.days} {formData.days === 1 ? "day" : "days"}</span></div>
                        </div>
                      </div>
                    )}

                    {formData.leave_type === "compoff" && (
                      <div className="lv-form-grid">
                        <div className="lv-field">
                          <label className="lv-label">Leave Date <span className="lv-label-hint">(day off to take)</span></label>
                          <SharedDatePicker value={formData.start_date} disabled={isViewMode} onChange={(val) => setFormData({ ...formData, start_date: val })} className="lv-input" />
                        </div>
                        <div className="lv-field">
                          <label className="lv-label">Holiday Worked <span className="lv-label-hint">(must be approved present)</span></label>
                          {compoffLoading ? (
                            <p className="lv-info-text"><i className="bi bi-arrow-repeat lv-spin" /> Loading eligible dates…</p>
                          ) : compoffEligible.length === 0 ? (
                            <div className="lv-empty-compoff">
                              <i className="bi bi-calendar-x" />
                              <span>No eligible holidays found. You must be marked <strong>Present on Holiday</strong> and approved first.</span>
                            </div>
                          ) : (
                            <SharedSelect value={formData.compoff_date}
                              onChange={(val) => setFormData({ ...formData, compoff_date: val })}
                              options={compoffEligible.map((h) => ({ value: h.date_str, label: `${h.holiday_name} — ${h.date_str}` }))}
                              placeholder="— Select Holiday Worked —" />
                          )}
                        </div>
                        <div className="lv-field lv-field-full">
                          <label className="lv-label">Duration</label>
                          <div className="lv-radio-group">
                            {[["full", "Full Day"], ["first_half", "1st Half"], ["second_half", "2nd Half"]].map(([val, lbl]) => (
                              <label key={val} className={`lv-radio-btn ${formData.half_day_type === val ? "active" : ""}`}>
                                <input type="radio" name="compoff_half" value={val} checked={formData.half_day_type === val}
                                  onChange={(e) => setFormData({ ...formData, half_day_type: e.target.value })} />
                                {lbl}
                              </label>
                            ))}
                          </div>
                          {formData.half_day_type !== "full" && (
                            <p className="lv-hint-text"><i className="bi bi-info-circle" /> Half day comp off consumes 0.5 day.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {formData.leave_type === "present" && (
                      <div className="lv-field">
                        <label className="lv-label">Holiday Date</label>
                        <HolidayCalendar holidays={holidays} selected={formData.start_date}
                          onSelect={(date) => setFormData({ ...formData, start_date: date })} />
                        {formData.start_date && (
                          <div className="lv-selected-date-chip">
                            <i className="bi bi-calendar-check" />
                            <span>
                              {new Date(formData.start_date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                              {selectedHolidayName !== "—" && ` — ${selectedHolidayName}`}
                            </span>
                          </div>
                        )}
                        <p className="lv-hint-text"><i className="bi bi-info-circle" /> Once approved by admin, you can apply Comp Off for this day.</p>
                      </div>
                    )}

                    {formData.leave_type === "permission" && (
                      <div className="lv-form-grid">
                        <div className="lv-field">
                          <label className="lv-label">Date</label>
                          <SharedDatePicker value={formData.start_date} disabled={isViewMode} onChange={(val) => setFormData({ ...formData, start_date: val })} className="lv-input" />
                        </div>
                        <div className="lv-field">
                          <label className="lv-label">Hours <span className="lv-label-hint">({permissionRemaining}h remaining)</span></label>
                          <input type="number" className="lv-input" min={0.5} max={permissionRemaining} step={0.5} value={formData.hours}
                            disabled={permissionRemaining === 0}
                            onChange={(e) => setFormData({ ...formData, hours: Number(e.target.value) })} />
                        </div>
                        <div className="lv-field lv-field-full">
                          <label className="lv-label">Slot</label>
                          <div className="lv-radio-group">
                            {[["morning", "Morning"], ["evening", "Evening"]].map(([val, lbl]) => (
                              <label key={val} className={`lv-radio-btn ${formData.slot === val ? "active" : ""}`}>
                                <input type="radio" name="slot" value={val} checked={formData.slot === val} disabled={permissionRemaining === 0}
                                  onChange={(e) => setFormData({ ...formData, slot: e.target.value })} />
                                {lbl}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reason */}
                    <div className="lv-field">
                      <label className="lv-label">Reason <span className="lv-label-hint">(optional)</span></label>
                      <textarea className="lv-textarea" rows={2} value={formData.reason}
                        placeholder="Enter reason for leave..."
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
                    </div>
                  </>
                )}
              </div>

              <div className="ul-modal-divider" />

              <div className="ul-modal-footer">
                {formData.id && formData.status === "pending" && (
                  <button className="ul-btn ul-btn-danger" onClick={() => setShowDeleteConfirm(true)} disabled={loading}>
                    <i className="bi bi-trash" /> Delete
                  </button>
                )}
                <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                  <button className="ul-btn ul-btn-ghost" onClick={() => setShowModal(false)}>Close</button>
                  {!isViewMode && (
                    <button className="ul-btn ul-btn-primary" onClick={handleSubmit} disabled={loading}>
                      {loading ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Submitting…</> : <><i className="bi bi-send" /> Submit</>}
                    </button>
                  )}
                </div>
              </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="ul-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="ul-modal ul-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="ul-modal-icon ul-modal-icon-danger">
              <i className="bi bi-trash" />
            </div>
            <h6 className="ul-modal-title">Confirm Delete</h6>
            <p className="ul-modal-sub">Are you sure you want to delete this {formData.leave_type} request? This action cannot be undone.</p>
            <div className="ul-modal-divider" />
            <div className="ul-modal-footer">
              <button className="ul-btn ul-btn-ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="ul-btn ul-btn-danger" onClick={handleDelete} disabled={loading}>
                {loading ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Deleting…</> : <><i className="bi bi-trash" /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

const styles = `
  .lv-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
  .lv-page-title { font-size:24px; font-weight:800; letter-spacing:-0.02em; color:var(--t-base); margin:0; }
  .lv-breadcrumb { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--t-muted); margin-top:6px; }
  .lv-breadcrumb a { color:var(--primary); text-decoration:none; font-weight:500; }
  .lv-breadcrumb a:hover { text-decoration:underline; }
  .lv-breadcrumb i { font-size:10px; opacity:0.5; }
  .lv-apply-btn { display:flex; align-items:center; gap:7px; padding:9px 18px; background:var(--primary); color:#fff; border:none; border-radius:var(--radius); font-size:13px; font-weight:600; cursor:pointer; transition:background 0.15s, transform 0.15s; font-family:var(--font); }
  .lv-apply-btn:hover { background:var(--primary-dark); transform:translateY(-1px); }
  .lv-apply-btn i { font-size:14px; }

  /* Card — module-wise layout (full-bleed card + toolbar strip) */
  .lv-card { background:var(--bg-card); border-radius:var(--radius-lg); box-shadow:var(--shadow-card), 0 24px 60px -30px rgba(15, 23, 42, 0.20); overflow:hidden; }
  .lv-toolbar { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-bottom:1px solid var(--border-soft); gap:12px; }
  .lv-count { font-size:12px; font-weight:600; color:var(--t-muted); background:var(--bg-card); box-shadow:var(--shadow-sm); border-radius:20px; padding:3px 10px; white-space:nowrap; }
  .lv-toolbar-right { display:flex; align-items:center; gap:12px; margin-left:auto; }
  .lv-view-toggle { display:flex; gap:4px; background:var(--bg-muted); border-radius:var(--radius); padding:3px; }
  .lv-toggle-btn { display:flex; align-items:center; gap:6px; padding:6px 14px; border:none; background:transparent; border-radius:6px; font-size:12.5px; font-weight:600; color:var(--t-muted); cursor:pointer; transition:all 0.15s; font-family:var(--font); }
  .lv-toggle-btn:hover:not(.active) { color:var(--primary); background:var(--bg-hover); }
  .lv-toggle-btn.active { background:var(--primary); color:#fff; box-shadow:var(--shadow-sm); }
  .lv-toggle-btn i { font-size:13px; }
  .lv-legend { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:1px solid var(--border-soft); flex-wrap:wrap; }
  .lv-calendar-wrap { padding:14px 20px 20px; }
  .lv-legend-item { display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--t-muted); font-weight:500; }
  .lv-legend-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
  .lv-legend-sep { flex:1; }
  .lv-legend-hint { font-size:12px; color:var(--t-muted); display:flex; align-items:center; gap:5px; }

  .rbc-calendar { font-family:var(--font) !important; }
  .rbc-toolbar button { border-radius:var(--radius) !important; font-size:12.5px !important; font-weight:600 !important; color:var(--t-muted) !important; border-color:transparent !important; background:var(--bg-muted) !important; }
  .rbc-toolbar button.rbc-active, .rbc-toolbar button:hover { background:var(--primary-soft) !important; color:var(--primary) !important; box-shadow:none !important; }
  .rbc-toolbar-label { font-size:14px !important; font-weight:700 !important; color:var(--t-base) !important; }
  .rbc-header { font-size:11px !important; font-weight:700 !important; color:var(--t-muted) !important; text-transform:uppercase !important; letter-spacing:0.06em !important; padding:8px 0 !important; border-color:var(--border-soft) !important; }
  .rbc-today { background:var(--primary-soft) !important; }
  .rbc-off-range-bg { background:var(--bg-muted) !important; }
  .rbc-date-cell { font-size:12px !important; color:var(--t-muted) !important; font-weight:500 !important; }
  .rbc-date-cell.rbc-now a { color:var(--primary) !important; font-weight:700 !important; }
  .rbc-day-bg:hover { background: var(--bg-hover) !important; cursor:pointer; }
  .rbc-month-row, .rbc-month-view, .rbc-day-bg, .rbc-header { border-color:var(--border-soft) !important; }

  .lv-table-wrap { overflow-x:auto; }
  .lv-table { width:100%; border-collapse:collapse; font-size:13px; }
  .lv-table thead tr { border-bottom:1px solid var(--border-soft); }
  .lv-table th { padding:10px 14px; font-size:10.5px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.06em; text-align:left; white-space:nowrap; background:var(--bg-card); }
  .lv-th-sortable { cursor:pointer; user-select:none; }
  .lv-th-sortable:hover { color:var(--primary); }
  .lv-sort-icon { font-size:9px; margin-left:4px; }
  .lv-table td { padding:11px 14px; border-bottom:1px solid var(--border-soft); vertical-align:middle; color:var(--t-base); }
  .lv-tr { transition:background 0.1s; }
  .lv-tr:hover td { background:var(--bg-hover); }
  .lv-tr:last-child td { border-bottom:none; }
  .lv-date-cell { display:flex; flex-direction:column; gap:2px; }
  .lv-date-main { font-size:13px; font-weight:500; }
  .lv-date-sub { font-size:11.5px; color:var(--t-muted); }
  .lv-duration { font-size:13px; font-weight:600; color:var(--t-base); }
  .lv-reason { max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12.5px; color:var(--t-muted); }
  .lv-muted { color:var(--t-muted); }
  .lv-type-pill, .lv-status-pill { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; padding:4px 10px; border-radius:20px; letter-spacing:0.02em; white-space:nowrap; }
  .lv-status-pill-sm { display:inline-block; font-size:10.5px; font-weight:700; padding:2px 9px; border-radius:20px; letter-spacing:0.04em; width:fit-content; }
  .lv-status-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .lv-actions { display:flex; align-items:center; gap:6px; }
  .lv-action-btn { width:30px; height:30px; border:none; border-radius:var(--radius); display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px; transition:all 0.15s; }
  .lv-view-btn { background:var(--primary-soft); color:var(--primary); }
  .lv-view-btn:hover { background:var(--primary); color:#fff; }
  .lv-edit-btn { background:var(--danger-soft); color:var(--danger); }
  .lv-edit-btn:hover { background:var(--danger); color:#fff; }
  .lv-empty-state { text-align:center; padding:48px 24px; }
  .lv-empty-icon { font-size:48px; color:var(--t-muted); opacity:0.4; display:block; margin-bottom:16px; }
  .lv-empty-state h3 { font-size:16px; font-weight:600; color:var(--t-base); margin:0 0 8px; }
  .lv-empty-state p { font-size:14px; color:var(--t-muted); margin:0; }

  .lv-field { display:flex; flex-direction:column; gap:6px; }
  .lv-field-full { grid-column:1 / -1; }
  .lv-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .lv-label { font-size:13px; font-weight:600; color:var(--t-muted); display:flex; align-items:center; gap:5px; }
  .lv-label-hint { font-size:11.5px; font-weight:500; color:var(--t-muted); }
  .lv-input, .lv-textarea { width:100%; padding:10px 12px; border:none; border-radius:var(--radius); background:var(--bg-muted); font-size:14px; color:var(--t-base); font-family:var(--font); transition:box-shadow 0.15s; outline:none; box-sizing:border-box; height:40px; }
  .lv-input:focus, .lv-textarea:focus { box-shadow:0 0 0 3px rgba(80,72,229,0.18); }
  .lv-input:disabled, .lv-textarea:disabled { background:var(--bg); color:var(--t-muted); cursor:default; }
  .lv-input-readonly { background:var(--bg); color:var(--t-muted); cursor:default; height:40px; display:flex; align-items:center; }
  .lv-textarea { resize:none; line-height:1.5; height:auto; }

  .lv-type-badge { display:inline-flex; align-items:center; gap:7px; font-size:14px; font-weight:600; padding:8px 14px; border-radius:var(--radius); width:fit-content; }

  .lv-radio-group { display:flex; gap:8px; flex-wrap:wrap; }
  .lv-radio-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border:none; border-radius:var(--radius); font-size:13px; font-weight:500; color:var(--t-muted); cursor:pointer; transition:all 0.15s; user-select:none; background:var(--bg-muted); }
  .lv-radio-btn input[type="radio"] { display:none; }
  .lv-radio-btn.active { background:var(--primary-soft); color:var(--primary); font-weight:600; }
  .lv-radio-btn:has(input:disabled) { opacity:0.5; cursor:default; }

  .lv-days-display { display:flex; align-items:center; gap:8px; padding:0 12px; background:var(--primary-soft); border-radius:var(--radius); font-size:14px; font-weight:700; color:var(--primary); height:40px; }
  .lv-info-text { font-size:13px; color:var(--t-muted); margin:0; display:flex; align-items:center; gap:6px; }
  .lv-hint-text { font-size:12px; color:var(--info); margin:0; display:flex; align-items:center; gap:5px; background:var(--info-soft); padding:8px 10px; border-radius:var(--radius); }
  .lv-empty-compoff { display:flex; align-items:flex-start; gap:10px; padding:12px; background:var(--warning-soft); border-radius:var(--radius); font-size:13px; color:var(--warning); line-height:1.5; }
  .lv-empty-compoff i { font-size:16px; margin-top:1px; flex-shrink:0; color:var(--warning); }
  .lv-delete-icon-wrap { width:56px; height:56px; border-radius:50%; background:var(--danger-soft); display:flex; align-items:center; justify-content:center; margin:0 auto; }
  .lv-delete-icon-wrap i { font-size:24px; color:var(--danger); }

  /* View Modal Content */
  .lv-view-content { display:flex; flex-direction:column; gap:16px; }
  .lv-view-type { display:inline-flex; align-items:center; gap:8px; font-size:14px; font-weight:700; padding:10px 16px; border-radius:var(--radius); width:fit-content; }
  .lv-view-type i { font-size:18px; }
  .lv-view-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; background:var(--bg-muted); padding:16px; border-radius:var(--radius-lg); }
  .lv-view-item { display:flex; flex-direction:column; gap:4px; }
  .lv-view-full { grid-column:1 / -1; }
  .lv-view-label { font-size:11px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.05em; }
  .lv-view-value { font-size:14px; font-weight:500; color:var(--t-base); line-height:1.4; }
  .lv-view-highlight { font-size:18px; font-weight:700; color:var(--primary); }

  .lv-footer-right { display:flex; gap:8px; margin-left:auto; }

  .lv-spin { animation:spin 0.7s linear infinite; display:inline-block; }
  @keyframes spin { to { transform:rotate(360deg); } }

  .hcal { border-radius:var(--radius); overflow:hidden; }
  .hcal-nav { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--bg-muted); }
  .hcal-nav-btn { width:28px; height:28px; border:none; border-radius:6px; background:var(--bg-card); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:12px; color:var(--t-muted); transition:all 0.12s; }
  .hcal-nav-btn:hover { background:var(--primary-soft); color:var(--primary); }
  .hcal-title { font-size:13px; font-weight:700; color:var(--t-base); }
  .hcal-grid { padding:10px; }
  .hcal-dow { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; margin-bottom:4px; }
  .hcal-dow-cell { text-align:center; font-size:10px; font-weight:700; color:var(--t-light); letter-spacing:0.05em; padding:3px 0; text-transform:uppercase; }
  .hcal-dow-sun { color:var(--danger); }
  .hcal-dow-sat { color:var(--warning); }
  .hcal-days { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
  .hcal-day-cell { aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:7px; font-size:12px; font-weight:500; cursor:pointer; transition:all 0.12s; gap:2px; }
  .hcal-day-cell:hover:not(.hcal-disabled):not(.hcal-selected) { filter:brightness(0.92); transform:scale(1.06); }
  .hcal-disabled { cursor:default !important; }
  .hcal-selected { background:var(--primary) !important; color:#fff !important; font-weight:700 !important; box-shadow:0 2px 8px rgba(80,72,229,0.3); transform:scale(1.06); }
  .hcal-dot { width:4px; height:4px; border-radius:50%; flex-shrink:0; }
  .hcal-legend { display:flex; gap:12px; flex-wrap:wrap; padding:8px 12px; border-top:1px solid var(--border-soft); background:var(--bg); }
  .hcal-leg-item { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--t-muted); font-weight:500; }
  .hcal-leg-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .lv-selected-date-chip { display:flex; align-items:center; gap:8px; padding:10px 12px; background:var(--primary-soft); border-radius:var(--radius); font-size:13px; font-weight:600; color:var(--primary); }
  .ul-modal { border:none; border-radius:var(--radius-lg); box-shadow:var(--shadow-card), 0 24px 60px -30px rgba(15, 23, 42, 0.20); }
`;
