import { useState, useEffect, useMemo } from "react";
import api from "../../api";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import AppLayout from "../../components/layout/AppLayout";
import { Link } from "react-router-dom";
import {
  format, parse, startOfWeek, getDay,
  startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isToday,
} from "date-fns";
import enUS from "date-fns/locale/en-US";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// ─────────────────────────────────────────────────────────────────────────────
// HOLIDAY CALENDAR PICKER — helpers
// ─────────────────────────────────────────────────────────────────────────────
function getWeekOccurrenceInMonth(date) {
  return Math.ceil(new Date(date).getDate() / 7);
}

function isSpecialWeekend(date) {
  const dow = getDay(date);
  const occ = getWeekOccurrenceInMonth(date);
  if (dow === 6) return occ === 2 || occ === 4; // 2nd & 4th Saturday
  if (dow === 0) return true;                    // ALL Sundays
  return false;
}

function specialWeekendLabel(date) {
  const dow = getDay(date);
  const occ = getWeekOccurrenceInMonth(date);
  const ord = ["", "1st", "2nd", "3rd", "4th", "5th"];
  if (dow === 6) return `${ord[occ]} Saturday`;
  if (dow === 0) return `${ord[occ]} Sunday`;
  return "";
}

// ─────────────────────────────────────────────────────────────────────────────
// HOLIDAY CALENDAR PICKER — component
// ─────────────────────────────────────────────────────────────────────────────
function HolidayCalendarPicker({ holidays = [], value, onChange }) {
  const [viewDate, setViewDate] = useState(new Date());

  const holidayMap = useMemo(() => {
    const m = {};
    holidays.forEach((h) => { m[h.date] = h.name; });
    return m;
  }, [holidays]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) });
  }, [viewDate]);

  const leadingBlanks = getDay(startOfMonth(viewDate)); // 0=Sun

  const handleDayClick = (date) => {
    const ds = format(date, "yyyy-MM-dd");
    if (!holidayMap[ds] && !isSpecialWeekend(date)) return;
    onChange(ds);
  };

  const selectableDays = useMemo(
    () => days.filter((d) => holidayMap[format(d, "yyyy-MM-dd")] || isSpecialWeekend(d)),
    [days, holidayMap]
  );

  return (
    <div className="hcp-root">
      {/* Month nav */}
      <div className="hcp-nav">
        <button className="hcp-nav-btn" onClick={() => setViewDate(subMonths(viewDate, 1))}>
          <i className="bi bi-chevron-left" />
        </button>
        <span className="hcp-month-label">{format(viewDate, "MMMM yyyy")}</span>
        <button className="hcp-nav-btn" onClick={() => setViewDate(addMonths(viewDate, 1))}>
          <i className="bi bi-chevron-right" />
        </button>
      </div>

      {/* Grid */}
      <div className="hcp-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="hcp-weekday">{d}</div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`b${i}`} className="hcp-day hcp-blank" />
        ))}
        {days.map((date) => {
          const ds = format(date, "yyyy-MM-dd");
          const isHol = !!holidayMap[ds];
          const isSW = isSpecialWeekend(date);
          const selectable = isHol || isSW;
          const selected = ds === value;
          const dow = getDay(date);
          const isWknd = dow === 0 || dow === 6;

          let cls = "hcp-day";
          if (isHol)            cls += " hcp-holiday";
          else if (isSW)        cls += " hcp-special-weekend";
          else if (isWknd)      cls += " hcp-regular-weekend";
          else                  cls += " hcp-normal";
          if (selectable)       cls += " hcp-selectable";
          if (selected)         cls += " hcp-selected";
          if (isToday(date))    cls += " hcp-today";

          return (
            <div
              key={ds}
              className={cls}
              title={isHol ? holidayMap[ds] : isSW ? specialWeekendLabel(date) : ""}
              onClick={() => selectable && handleDayClick(date)}
            >
              <span className="hcp-day-num">{date.getDate()}</span>
              {isHol && <span className="hcp-dot hcp-dot-holiday" />}
              {isSW && !isHol && <span className="hcp-dot hcp-dot-sw" />}
            </div>
          );
        })}
      </div>

      {/* Selected banner */}
      {value && (
        <div className="hcp-selected-info">
          <i className="bi bi-calendar-check-fill" />
          <span>
            <strong>{format(new Date(value + "T00:00:00"), "dd MMMM yyyy")}</strong>
            {holidayMap[value]
              ? ` — ${holidayMap[value]}`
              : ` — ${specialWeekendLabel(new Date(value + "T00:00:00"))}`}
          </span>
          <button className="hcp-clear" onClick={() => onChange("")}>
            <i className="bi bi-x" />
          </button>
        </div>
      )}

      {/* Selectable list */}
      {selectableDays.length > 0 ? (
        <div className="hcp-list">
          <div className="hcp-list-title">
            <i className="bi bi-list-ul" /> Selectable dates this month
          </div>
          <div className="hcp-list-items">
            {selectableDays.map((d) => {
              const ds = format(d, "yyyy-MM-dd");
              const isHol = !!holidayMap[ds];
              const isSel = ds === value;
              return (
                <button
                  key={ds}
                  className={`hcp-list-item ${isHol ? "hcp-list-holiday" : "hcp-list-sw"} ${isSel ? "hcp-list-selected" : ""}`}
                  onClick={() => handleDayClick(d)}
                >
                  <span className={`hcp-list-dot ${isHol ? "hcp-dot-holiday" : "hcp-dot-sw"}`} />
                  <span className="hcp-list-date">{format(d, "EEE, dd MMM")}</span>
                  <span className="hcp-list-name">
                    {isHol ? holidayMap[ds] : specialWeekendLabel(d)}
                  </span>
                  {isSel && <i className="bi bi-check2 hcp-list-check" />}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="hcp-empty-month">
          <i className="bi bi-calendar-x" /> No holidays or special weekends this month
        </div>
      )}

      {/* Legend */}
      <div className="hcp-legend">
        <div className="hcp-legend-item">
          <span className="hcp-dot hcp-dot-holiday" /> Public Holiday
        </div>
        <div className="hcp-legend-item">
          <span className="hcp-dot hcp-dot-sw" /> 2nd/4th Sat · All Sundays
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminLeaves() {
  const [events, setEvents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [viewMode, setViewMode] = useState("calendar");
  const [sortField, setSortField] = useState("start");
  const [sortOrder, setSortOrder] = useState("desc");

  const [compoffEligible, setCompoffEligible] = useState([]);
  const [compoffLoading, setCompoffLoading] = useState(false);

  const [applyForm, setApplyForm] = useState({
    user_id: "",
    leave_type: "leave",
    start_date: "",
    end_date: "",
    reason: "",
    days: 0,
    compoff_date: "",
    half_day_type: "full",
    hours: 2,
    slot: "morning",
  });
  const [applyLoading, setApplyLoading] = useState(false);

  // ── FETCH ──────────────────────────────────────────────────────────────────
  const fetchEmployees = async () => {
    try { const res = await api.get("/leaves/admin_userspanel"); setEmployees(res.data); }
    catch (err) { console.error(err); }
  };

  const fetchHolidays = async () => {
    try { const res = await api.get("/leaves/holidays"); setHolidays(res.data); }
    catch (err) { console.error(err); }
  };

  const fetchAllLeaves = async () => {
    try {
      const res = await api.get("/leaves/adminpanel");
      const formatted = res.data.map((ev) => ({
        ...ev,
        start: new Date(ev.start),
        end: new Date(ev.end),
        title: `${ev.name} (${ev.type.charAt(0).toUpperCase() + ev.type.slice(1)})`,
      }));
      setEvents(formatted);
    } catch (err) { console.error(err); }
  };

  const fetchCompoffEligible = async (userId) => {
    if (!userId) { setCompoffEligible([]); return; }
    setCompoffLoading(true);
    try {
      const res = await api.get(`/leaves/compoff-eligible?user_id=${userId}`);
      setCompoffEligible(res.data);
    } catch (err) { console.error(err); setCompoffEligible([]); }
    finally { setCompoffLoading(false); }
  };

  useEffect(() => { fetchEmployees(); fetchAllLeaves(); fetchHolidays(); }, []);

  useEffect(() => {
    if (applyForm.leave_type === "compoff" && applyForm.user_id) {
      fetchCompoffEligible(applyForm.user_id);
      setApplyForm((prev) => ({ ...prev, compoff_date: "" }));
    }
  }, [applyForm.user_id, applyForm.leave_type]);

  // ── HELPERS ────────────────────────────────────────────────────────────────
  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start); s.setHours(0, 0, 0, 0);
    const e = new Date(end);   e.setHours(0, 0, 0, 0);
    return (e - s) / (1000 * 60 * 60 * 24) + 1;
  };

  useEffect(() => {
    if (applyForm.leave_type !== "leave") return;
    const total = calculateDays(applyForm.start_date, applyForm.end_date);
    setApplyForm((prev) => ({
      ...prev,
      days: (applyForm.start_date === applyForm.end_date && applyForm.half_day_type !== "full") ? 0.5 : total,
    }));
  }, [applyForm.start_date, applyForm.end_date, applyForm.half_day_type, applyForm.leave_type]);

  // ── SELECT EVENT ───────────────────────────────────────────────────────────
  const handleSelectEvent = (event) => {
    setFormData({
      id: event.id,
      user_id: event.user_id,
      name: event.name,
      type: event.type,
      start_date: format(event.start, "yyyy-MM-dd"),
      end_date: format(event.end, "yyyy-MM-dd"),
      days: event.days || null,
      hours: event.hours || null,
      slot: event.slot || null,
      compoff_date: event.comp_off_date || null,
      half_day_type: event.half_day_type || "full",
      reason: event.remarks || "",
      status: event.status,
      holiday_name: event.holiday_name || null,
    });
    setShowModal(true);
  };

  // ── APPROVE / REJECT ───────────────────────────────────────────────────────
  const handleUpdateStatus = async (status) => {
    if (!formData.id) return;
    setLoading(true);
    try {
      let endpoint;
      if (formData.type === "permission") endpoint = `/leaves/permission/${formData.id}`;
      else if (formData.type === "present") endpoint = `/leaves/present/${formData.id}`;
      else endpoint = `/leaves/leave/${formData.id}`;
      await api.put(endpoint, { status });
      setLoading(false); setShowModal(false);
      fetchAllLeaves();
      alert(`Status updated to ${status}`);
    } catch (err) {
      alert(err.response?.data?.error || "Error updating status");
      setLoading(false);
    }
  };

  // ── APPLY LEAVE ────────────────────────────────────────────────────────────
  const handleApplyLeave = async () => {
    setApplyLoading(true);
    try {
      let payload = { user_id: applyForm.user_id };

      if (applyForm.leave_type === "present") {
        if (!applyForm.user_id || !applyForm.start_date) {
          alert("Please select an employee and holiday date."); setApplyLoading(false); return;
        }
        payload = { ...payload, from_date: applyForm.start_date, type: "present", remarks: applyForm.reason || null };
      } else if (applyForm.leave_type === "permission") {
        if (!applyForm.user_id || !applyForm.start_date || !applyForm.hours || !applyForm.slot) {
          alert("Please fill all fields."); setApplyLoading(false); return;
        }
        payload = { ...payload, from_date: applyForm.start_date, type: "permission", hours: applyForm.hours, slot: applyForm.slot, remarks: applyForm.reason || null };
      } else if (applyForm.leave_type === "compoff") {
        if (!applyForm.user_id || !applyForm.start_date || !applyForm.compoff_date) {
          alert("Please select employee, leave date, and the holiday worked date."); setApplyLoading(false); return;
        }
        payload = { ...payload, from_date: applyForm.start_date, type: "compoff", comp_off_date: applyForm.compoff_date, remarks: applyForm.reason || null };
      } else {
        if (!applyForm.user_id || !applyForm.start_date || !applyForm.end_date) {
          alert("Please select employee, start and end date."); setApplyLoading(false); return;
        }
        payload = { ...payload, from_date: applyForm.start_date, to_date: applyForm.end_date, type: "leave", days: applyForm.days, half_day_type: applyForm.half_day_type, remarks: applyForm.reason || null };
      }

      await api.post("/leaves/admin", payload);
      setApplyLoading(false); setShowApplyModal(false);
      fetchAllLeaves();
      setApplyForm({ user_id: "", leave_type: "leave", start_date: "", end_date: "", reason: "", days: 0, compoff_date: "", half_day_type: "full", hours: 2, slot: "morning" });
    } catch (err) {
      alert(err.response?.data?.error || "Something went wrong");
      setApplyLoading(false);
    }
  };
const generateSummary = () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const fyYear = month >= 4 ? today.getFullYear() : today.getFullYear() - 1;
  const start = new Date(`${fyYear}-04-01`);
  const end   = new Date(`${fyYear + 1}-03-31`);

  const monthsElapsed = month >= 4 ? month - 3 : month + 9;
  const leaveAllocated      = parseFloat((monthsElapsed * 2.5).toFixed(2));
  const permissionAllocated = parseFloat((monthsElapsed * 2).toFixed(2));

  const summary = {};

  events
    .filter((ev) => ev.start >= start && ev.start <= end)
    .forEach((ev) => {
      if (!summary[ev.name])
        summary[ev.name] = { leave: 0, compoff: 0, permissionHours: 0 };

      if (ev.type === "leave")
        summary[ev.name].leave += Number(ev.days || 1);
      else if (ev.type === "compoff")
        summary[ev.name].compoff += Number(ev.days || 1);
      else if (ev.type === "permission" && ev.status === "approved")
        summary[ev.name].permissionHours += Number(ev.hours || 0);
    });

  const result = Object.entries(summary).map(([name, counts]) => {
    const netLeave  = counts.leave - counts.compoff;
    const permUsed  = counts.permissionHours;
    const permLeft  = permissionAllocated - permUsed;
    const leaveBalance = leaveAllocated - netLeave;

    return {
      name,
      leaveTaken:       counts.leave.toFixed(2),
      compOff:          counts.compoff.toFixed(2),
      permUsed:         permUsed.toFixed(2),
      permAllocated:    permissionAllocated.toFixed(2),
      permLeft:         permLeft.toFixed(2),
      leaveAllocated:   leaveAllocated.toFixed(2),
      totalUsed:        netLeave.toFixed(2),
      remaining:        leaveBalance.toFixed(2),
    };
  });

  setSummaryData(result);
  setShowSummaryModal(true);
};

  // ── SORT ───────────────────────────────────────────────────────────────────
  const sortedEvents = [...events].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (sortField === "start" || sortField === "end") { valA = new Date(valA); valB = new Date(valB); }
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("asc"); }
  };

  // ── CONFIG ─────────────────────────────────────────────────────────────────
  const typeConfig = {
    leave:      { label: "Leave",      color: "#5048E5", bg: "#EEF2FF" },
    compoff:    { label: "Comp Off",   color: "#0891B2", bg: "#ECFEFF" },
    permission: { label: "Permission", color: "#D97706", bg: "#FFFBEB" },
    present:    { label: "Present",    color: "#059669", bg: "#ECFDF5" },
  };

  const statusConfig = {
    approved: { label: "Approved", color: "#059669", bg: "#ECFDF5" },
    pending:  { label: "Pending",  color: "#D97706", bg: "#FFFBEB" },
    rejected: { label: "Rejected", color: "#DC2626", bg: "#FEF2F2" },
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <style>{styles}</style>

      {/* PAGE HEADER */}
      <div className="al-page-header">
        <div>
          <h5 className="al-page-title">Employee Leave Management</h5>
          <nav className="al-breadcrumb">
            <Link to="/admin/dashboard">Dashboard</Link>
            <i className="bi bi-chevron-right" />
            <span>Leaves</span>
          </nav>
        </div>
        <div className="al-header-actions">
          <div className="al-view-toggle">
            <button className={`al-toggle-btn ${viewMode === "calendar" ? "active" : ""}`} onClick={() => setViewMode("calendar")}>
              <i className="bi bi-calendar3" /> Calendar
            </button>
            <button className={`al-toggle-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>
              <i className="bi bi-list-ul" /> List
            </button>
          </div>
          <button className="al-summary-btn" onClick={generateSummary}>
            <i className="bi bi-bar-chart-line" /> Summary
          </button>
          <button className="al-apply-btn" onClick={() => {
            setApplyForm({ user_id: "", leave_type: "leave", start_date: "", end_date: "", reason: "", days: 0, compoff_date: "", half_day_type: "full", hours: 2, slot: "morning" });
            setCompoffEligible([]);
            setShowApplyModal(true);
          }}>
            <i className="bi bi-plus-lg" /> Apply Leave
          </button>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="al-card">
        {viewMode === "calendar" ? (
          <>
            <div className="al-legend">
              {Object.entries(statusConfig).map(([key, s]) => (
                <div key={key} className="al-legend-item">
                  <span className="al-legend-dot" style={{ background: s.color }} />
                  <span>{s.label}</span>
                </div>
              ))}
              <div className="al-legend-sep" />
              <span className="al-legend-hint">
                <i className="bi bi-info-circle" /> Click an event to view &amp; manage
              </span>
            </div>
            <Calendar
              selectable={false}
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 620 }}
              onSelectEvent={handleSelectEvent}
              tooltipAccessor={(ev) => `${ev.name} — ${ev.type.toUpperCase()} (${ev.status})`}
              eventPropGetter={() => ({
                style: { backgroundColor: "transparent", border: "none", padding: 0, margin: 0 },
              })}
              components={{
                event: ({ event }) => {
                  const s = statusConfig[event.status] || { color: "#6B7280", bg: "#F3F4F6" };
                  const t = typeConfig[event.type] || {};
                  return (
                    <div className="al-cal-event">
                      <span className="al-cal-dot" style={{ background: s.color }} />
                      <span className="al-cal-name">{event.name}</span>
                      <span className="al-cal-type" style={{ color: t.color, background: t.bg }}>
                        {event.type === "compoff" ? "CO" : event.type === "permission" ? "PM" : event.type === "present" ? "PR" : "LV"}
                      </span>
                    </div>
                  );
                },
              }}
            />
          </>
        ) : (
          <div className="al-table-wrap">
            <table className="al-table">
              <thead>
                <tr>
                  {[
                    { key: "name", label: "Employee" },
                    { key: "type", label: "Type" },
                    { key: "start", label: "Start Date" },
                    { key: "end", label: "End Date" },
                    { key: null, label: "Days / Hrs" },
                    { key: null, label: "Reason" },
                    { key: "status", label: "Status" },
                  ].map(({ key, label }) => (
                    <th key={label} className={key ? "al-th-sortable" : ""} onClick={key ? () => handleSort(key) : undefined}>
                      {label}
                      {key && sortField === key && (
                        <i className={`bi bi-chevron-${sortOrder === "asc" ? "up" : "down"} al-sort-icon`} />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedEvents.length === 0 ? (
                  <tr><td colSpan={7} className="al-empty">No records found</td></tr>
                ) : sortedEvents.map((ev, idx) => (
                  <tr key={idx} className="al-tr" onClick={() => handleSelectEvent(ev)}>
                    <td>
                      <div className="al-emp-cell">
                        <div className="al-avatar">{ev.name?.charAt(0).toUpperCase()}</div>
                        <span>{ev.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="al-type-pill" style={{ background: typeConfig[ev.type]?.bg, color: typeConfig[ev.type]?.color }}>
                        {typeConfig[ev.type]?.label || ev.type}
                      </span>
                    </td>
                    <td className="al-date">{format(ev.start, "dd MMM yyyy")}</td>
                    <td className="al-date">{format(ev.end, "dd MMM yyyy")}</td>
                    <td>{ev.type === "permission" ? `${ev.hours || "-"}h` : ev.type === "present" ? "—" : `${ev.days || 1}d`}</td>
                    <td className="al-reason">{ev.remarks || <span className="al-muted">—</span>}</td>
                    <td>
                      <span className="al-status-pill" style={{ background: statusConfig[ev.status]?.bg, color: statusConfig[ev.status]?.color }}>
                        {statusConfig[ev.status]?.label || ev.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW / APPROVE MODAL */}
      {showModal && (
        <>
          <div className="al-modal-overlay" onClick={() => setShowModal(false)} />
          <div className="al-modal-wrap">
            <div className="al-modal">
              <div className="al-modal-header">
                <div className="al-modal-header-left">
                  {formData.status && (
                    <span className="al-status-pill" style={{ background: statusConfig[formData.status]?.bg, color: statusConfig[formData.status]?.color }}>
                      {statusConfig[formData.status]?.label}
                    </span>
                  )}
                  <h6 className="al-modal-title">Request Details</h6>
                </div>
                <button className="al-modal-close" onClick={() => setShowModal(false)}><i className="bi bi-x-lg" /></button>
              </div>
              <div className="al-modal-body">
                <div className="al-detail-grid">
                  <div className="al-detail-row">
                    <span className="al-detail-label">Employee</span>
                    <div className="al-detail-emp">
                      <div className="al-avatar al-avatar-lg">{formData.name?.charAt(0).toUpperCase()}</div>
                      <span className="al-detail-value">{formData.name}</span>
                    </div>
                  </div>
                  <div className="al-detail-row">
                    <span className="al-detail-label">Type</span>
                    <span className="al-type-pill" style={{ background: typeConfig[formData.type]?.bg, color: typeConfig[formData.type]?.color }}>
                      <i className={`bi ${formData.type === "permission" ? "bi-clock" : formData.type === "compoff" ? "bi-arrow-left-right" : formData.type === "present" ? "bi-person-check" : "bi-calendar-x"}`} />
                      {typeConfig[formData.type]?.label || formData.type}
                    </span>
                  </div>
                  <div className="al-detail-row">
                    <span className="al-detail-label">Date</span>
                    <span className="al-detail-value">{formData.start_date}</span>
                  </div>
                  {formData.type === "leave" && (
                    <>
                      <div className="al-detail-row">
                        <span className="al-detail-label">To</span>
                        <span className="al-detail-value">{formData.end_date}</span>
                      </div>
                      <div className="al-detail-row">
                        <span className="al-detail-label">Days</span>
                        <div className="al-days-display">
                          <i className="bi bi-calendar-check" />
                          <span>{formData.days || 1} {(formData.days || 1) === 1 ? "day" : "days"}</span>
                        </div>
                      </div>
                    </>
                  )}
                  {formData.type === "permission" && (
                    <>
                      <div className="al-detail-row">
                        <span className="al-detail-label">Hours</span>
                        <span className="al-detail-value">{formData.hours}</span>
                      </div>
                      <div className="al-detail-row">
                        <span className="al-detail-label">Slot</span>
                        <span className="al-detail-value" style={{ textTransform: "capitalize" }}>{formData.slot}</span>
                      </div>
                    </>
                  )}
                  {formData.type === "compoff" && (
                    <div className="al-detail-row">
                      <span className="al-detail-label">Holiday Worked</span>
                      <span className="al-detail-value">{formData.compoff_date}</span>
                    </div>
                  )}
                  {formData.type === "present" && formData.holiday_name && (
                    <div className="al-detail-row">
                      <span className="al-detail-label">Holiday</span>
                      <span className="al-detail-value">{formData.holiday_name}</span>
                    </div>
                  )}
                  <div className="al-detail-row">
                    <span className="al-detail-label">Reason</span>
                    <span className="al-detail-value">{formData.reason || <span className="al-muted">—</span>}</span>
                  </div>
                </div>
              </div>
              <div className="al-modal-footer">
                <button className="al-btn al-btn-ghost" onClick={() => setShowModal(false)}>Close</button>
                {formData.status === "pending" && (
                  <div className="al-footer-right">
                    <button className="al-btn al-btn-danger" onClick={() => handleUpdateStatus("rejected")} disabled={loading}>
                      <i className="bi bi-x-circle" /> {loading ? "…" : "Reject"}
                    </button>
                    <button className="al-btn al-btn-success" onClick={() => handleUpdateStatus("approved")} disabled={loading}>
                      <i className="bi bi-check-circle" /> {loading ? "…" : "Approve"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* APPLY LEAVE MODAL */}
      {showApplyModal && (
        <>
          <div className="al-modal-overlay" onClick={() => setShowApplyModal(false)} />
          <div className="al-modal-wrap">
            <div className="al-modal">
              <div className="al-modal-header">
                <div className="al-modal-header-left">
                  <h6 className="al-modal-title">Apply Leave on Behalf</h6>
                </div>
                <button className="al-modal-close" onClick={() => setShowApplyModal(false)}><i className="bi bi-x-lg" /></button>
              </div>

              <div className="al-modal-body">
                {/* Employee */}
                <div className="al-field">
                  <label className="al-label">Employee</label>
                  <select
                    className="al-input al-select"
                    value={applyForm.user_id}
                    onChange={(e) => setApplyForm({ ...applyForm, user_id: e.target.value })}
                  >
                    <option value="">— Select Employee —</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                {/* Type tabs */}
                <div className="al-field">
                  <label className="al-label">Request Type</label>
                  <div className="al-type-tabs">
                    {Object.entries(typeConfig).map(([key, cfg]) => (
                      <button
                        key={key}
                        className={`al-type-tab ${applyForm.leave_type === key ? "active" : ""}`}
                        style={applyForm.leave_type === key ? { background: cfg.bg, color: cfg.color, borderColor: cfg.color } : {}}
                        onClick={() => setApplyForm({ ...applyForm, leave_type: key, start_date: "", end_date: "", compoff_date: "" })}
                      >
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── LEAVE ── */}
                {applyForm.leave_type === "leave" && (
                  <>
                    <div className="al-row-2">
                      <div className="al-field">
                        <label className="al-label">Start Date</label>
                        <input type="date" className="al-input" value={applyForm.start_date}
                          onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })} />
                      </div>
                      <div className="al-field">
                        <label className="al-label">End Date</label>
                        <input type="date" className="al-input" value={applyForm.end_date}
                          onChange={(e) => setApplyForm({ ...applyForm, end_date: e.target.value })} />
                      </div>
                    </div>
                    {applyForm.start_date === applyForm.end_date && applyForm.start_date && (
                      <div className="al-field">
                        <label className="al-label">Duration</label>
                        <div className="al-radio-group">
                          {[["full", "Full Day"], ["first_half", "First Half"], ["second_half", "Second Half"]].map(([val, lbl]) => (
                            <label key={val} className={`al-radio-btn ${applyForm.half_day_type === val ? "active" : ""}`}>
                              <input type="radio" name="half_day_type" value={val} checked={applyForm.half_day_type === val}
                                onChange={(e) => setApplyForm({ ...applyForm, half_day_type: e.target.value })} />
                              {lbl}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {applyForm.days > 0 && (
                      <div className="al-days-display">
                        <i className="bi bi-calendar-check" />
                        <span>{applyForm.days} {applyForm.days === 1 ? "day" : "days"}</span>
                      </div>
                    )}
                  </>
                )}

                {/* ── PRESENT ON HOLIDAY — calendar picker ── */}
                {applyForm.leave_type === "present" && (
                  <div className="al-field">
                    <label className="al-label">Holiday Date</label>
                    {holidays.length === 0 ? (
                      <p className="al-info-text"><i className="bi bi-calendar-x" /> No holidays configured.</p>
                    ) : (
                      <HolidayCalendarPicker
                        holidays={holidays}
                        value={applyForm.start_date}
                        onChange={(ds) => setApplyForm({ ...applyForm, start_date: ds })}
                      />
                    )}
                    <p className="al-hint-text">
                      <i className="bi bi-info-circle" /> Once approved, the employee can apply Comp Off for this date.
                    </p>
                  </div>
                )}

                {/* ── COMP OFF ── */}
                {applyForm.leave_type === "compoff" && (
                  <>
                    <div className="al-field">
                      <label className="al-label">Leave Date <span className="al-label-hint">(day off to take)</span></label>
                      <input type="date" className="al-input" value={applyForm.start_date}
                        onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })} />
                    </div>
                    <div className="al-field">
                      <label className="al-label">
                        Holiday Worked <span className="al-label-hint">(must have approved present)</span>
                      </label>
                      {!applyForm.user_id ? (
                        <p className="al-info-text"><i className="bi bi-arrow-up" /> Select an employee first</p>
                      ) : compoffLoading ? (
                        <p className="al-info-text"><i className="bi bi-arrow-repeat al-spin" /> Loading eligible dates…</p>
                      ) : compoffEligible.length === 0 ? (
                        <div className="al-empty-compoff">
                          <i className="bi bi-calendar-x" />
                          <span>No eligible holidays found. Employee must be marked <strong>Present</strong> on a holiday first.</span>
                        </div>
                      ) : (
                        <select
                          className="al-input al-select"
                          value={applyForm.compoff_date}
                          onChange={(e) => setApplyForm({ ...applyForm, compoff_date: e.target.value })}
                        >
                          <option value="">— Select Holiday Worked —</option>
                          {compoffEligible.map((h) => (
                            <option key={h.present_id} value={h.date_str}>
                              {h.holiday_name} — {h.date_str}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </>
                )}

                {/* ── PERMISSION ── */}
                {applyForm.leave_type === "permission" && (
                  <>
                    <div className="al-field">
                      <label className="al-label">Date</label>
                      <input type="date" className="al-input" value={applyForm.start_date}
                        onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })} />
                    </div>
                    <div className="al-row-2">
                      <div className="al-field">
                        <label className="al-label">Hours</label>
                        <input type="number" className="al-input" min={0.5} max={2} step={0.5}
                          value={applyForm.hours}
                          onChange={(e) => setApplyForm({ ...applyForm, hours: Number(e.target.value) })} />
                      </div>
                      <div className="al-field">
                        <label className="al-label">Slot</label>
                        <div className="al-radio-group">
                          {[["morning", "Morning"], ["evening", "Evening"]].map(([val, lbl]) => (
                            <label key={val} className={`al-radio-btn ${applyForm.slot === val ? "active" : ""}`}>
                              <input type="radio" name="apply_slot" value={val} checked={applyForm.slot === val}
                                onChange={(e) => setApplyForm({ ...applyForm, slot: e.target.value })} />
                              {lbl}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Reason */}
                <div className="al-field">
                  <label className="al-label">Reason <span className="al-label-hint">(optional)</span></label>
                  <textarea className="al-textarea" rows={3} value={applyForm.reason}
                    placeholder="Enter reason..."
                    onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })} />
                </div>
              </div>

              <div className="al-modal-footer">
                <button className="al-btn al-btn-ghost" onClick={() => setShowApplyModal(false)}>Cancel</button>
                <div className="al-footer-right">
                  <button className="al-btn al-btn-primary" onClick={handleApplyLeave} disabled={applyLoading}>
                    {applyLoading
                      ? <><i className="bi bi-arrow-repeat al-spin" /> Submitting…</>
                      : <><i className="bi bi-send" /> Submit</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SUMMARY MODAL */}
      {showSummaryModal && (
        <>
          <div className="al-modal-overlay" onClick={() => setShowSummaryModal(false)} />
          <div className="al-modal-wrap al-modal-wrap-center">
            <div className="al-modal al-modal-lg">
              <div className="al-modal-header">
                <div className="al-modal-header-left">
                  <h6 className="al-modal-title">Employee Leave Summary</h6>
                  <span className="al-label-hint">Current Financial Year</span>
                </div>
                <button className="al-modal-close" onClick={() => setShowSummaryModal(false)}><i className="bi bi-x-lg" /></button>
              </div>
              <div className="al-modal-body">
                <div className="al-table-wrap">
                  <table className="al-table">
                    <thead>
                      <tr>
                        <th>Employee</th><th>Leaves</th><th>Comp Off</th>
                        <th>Permission</th><th>Total Used</th><th>Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.length === 0 ? (
                        <tr><td colSpan={6} className="al-empty">No data available</td></tr>
                      ) : summaryData.map((row, idx) => (
                        <tr key={idx} className="al-tr">
                          <td>
                            <div className="al-emp-cell">
                              <div className="al-avatar">{row.name?.charAt(0).toUpperCase()}</div>
                              <span>{row.name}</span>
                            </div>
                          </td>
                          <td>{row.leaveTaken}</td>
                          <td>{row.compOff}</td>
                        <td>{row.permUsed} / {row.permAllocated}h</td>
                          <td><strong>{row.totalUsed}</strong></td>
                          <td>
                            <span style={{ color: Number(row.remaining) < 5 ? "#DC2626" : "#059669", fontWeight: 700 }}>
                              {row.remaining}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="al-modal-footer">
                <div className="al-footer-right">
                  <button className="al-btn al-btn-ghost" onClick={() => setShowSummaryModal(false)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = `
  /* ── page layout ── */
  .al-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
  .al-page-title { font-size:15px; font-weight:700; color:var(--text-primary); margin:0 0 4px; letter-spacing:-0.01em; }
  .al-breadcrumb { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-muted); }
  .al-breadcrumb a { color:var(--primary); text-decoration:none; font-weight:500; }
  .al-breadcrumb a:hover { text-decoration:underline; }
  .al-breadcrumb i { font-size:10px; opacity:0.5; }
  .al-header-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .al-view-toggle { display:flex; background:var(--bg); border:1px solid var(--border); border-radius:var(--radius); padding:3px; gap:2px; }
  .al-toggle-btn { display:flex; align-items:center; gap:6px; padding:6px 14px; border:none; border-radius:calc(var(--radius) - 2px); font-size:12.5px; font-weight:600; color:var(--text-secondary); background:transparent; cursor:pointer; transition:all 0.15s; font-family:'Plus Jakarta Sans',sans-serif; }
  .al-toggle-btn.active { background:var(--surface); color:var(--primary); box-shadow:0 1px 4px rgba(0,0,0,0.08); }
  .al-toggle-btn:hover:not(.active) { color:var(--text-primary); }
  .al-apply-btn, .al-summary-btn { display:flex; align-items:center; gap:7px; padding:9px 18px; border:none; border-radius:var(--radius); font-size:13px; font-weight:600; cursor:pointer; transition:background 0.15s,transform 0.15s; letter-spacing:0.01em; font-family:'Plus Jakarta Sans',sans-serif; }
  .al-apply-btn { background:var(--primary); color:#fff; }
  .al-apply-btn:hover { background:var(--primary-dark); transform:translateY(-1px); }
  .al-summary-btn { background:var(--surface); color:var(--text-secondary); border:1px solid var(--border); }
  .al-summary-btn:hover { background:var(--bg); color:var(--text-primary); }
  .al-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px; box-shadow:var(--shadow); }
  /* ── legend ── */
  .al-legend { display:flex; align-items:center; gap:16px; margin-bottom:16px; flex-wrap:wrap; }
  .al-legend-item { display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--text-secondary); font-weight:500; }
  .al-legend-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
  .al-legend-sep { flex:1; }
  .al-legend-hint { font-size:11.5px; color:var(--text-muted); display:flex; align-items:center; gap:5px; }
  /* ── calendar events ── */
  .al-cal-event { display:flex; align-items:center; gap:4px; padding:1px 2px; overflow:hidden; }
  .al-cal-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .al-cal-name { font-size:11.5px; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; }
  .al-cal-type { font-size:9px; font-weight:800; padding:1px 5px; border-radius:4px; flex-shrink:0; letter-spacing:0.04em; }
  /* ── rbc overrides ── */
  .rbc-calendar { font-family:'Plus Jakarta Sans',sans-serif !important; }
  .rbc-toolbar button { border-radius:var(--radius) !important; font-size:12.5px !important; font-weight:600 !important; color:var(--text-secondary) !important; border-color:var(--border) !important; }
  .rbc-toolbar button.rbc-active, .rbc-toolbar button:hover { background:var(--primary-light) !important; color:var(--primary) !important; border-color:#c7d2fe !important; box-shadow:none !important; }
  .rbc-toolbar-label { font-size:14px !important; font-weight:700 !important; color:var(--text-primary) !important; }
  .rbc-header { font-size:11px !important; font-weight:700 !important; color:var(--text-muted) !important; text-transform:uppercase !important; letter-spacing:0.06em !important; padding:8px 0 !important; border-color:var(--border) !important; }
  .rbc-today { background:var(--primary-light) !important; }
  .rbc-off-range-bg { background:#fafafa !important; }
  .rbc-date-cell { font-size:12px !important; color:var(--text-secondary) !important; font-weight:500 !important; }
  .rbc-date-cell.rbc-now a { color:var(--primary) !important; font-weight:700 !important; }
  .rbc-month-row, .rbc-month-view, .rbc-day-bg, .rbc-header { border-color:var(--border) !important; }
  /* ── table ── */
  .al-table-wrap { overflow-x:auto; }
  .al-table { width:100%; border-collapse:collapse; font-size:13px; }
  .al-table thead tr { border-bottom:2px solid var(--border); }
  .al-table th { padding:10px 14px; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; text-align:left; white-space:nowrap; }
  .al-th-sortable { cursor:pointer; user-select:none; }
  .al-th-sortable:hover { color:var(--primary); }
  .al-sort-icon { margin-left:4px; font-size:10px; }
  .al-table td { padding:11px 14px; border-bottom:1px solid var(--border); vertical-align:middle; color:var(--text-primary); }
  .al-tr { cursor:pointer; transition:background 0.12s; }
  .al-tr:hover td { background:var(--bg); }
  .al-tr:last-child td { border-bottom:none; }
  .al-empty { text-align:center; color:var(--text-muted); padding:32px; }
  /* ── shared atoms ── */
  .al-emp-cell { display:flex; align-items:center; gap:9px; }
  .al-avatar { width:30px; height:30px; border-radius:50%; background:var(--primary-light); color:var(--primary); font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .al-avatar-lg { width:36px; height:36px; font-size:14px; }
  .al-date { font-size:12.5px; color:var(--text-secondary); font-variant-numeric:tabular-nums; }
  .al-reason { max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-secondary); }
  .al-muted { color:var(--text-muted); }
  .al-type-pill { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:700; padding:3px 10px; border-radius:20px; white-space:nowrap; }
  .al-status-pill { display:inline-block; font-size:10.5px; font-weight:700; padding:2px 9px; border-radius:20px; letter-spacing:0.04em; width:fit-content; }
  /* ── modal ── */
  .al-modal-overlay { position:fixed; inset:0; background:rgba(17,24,39,0.45); backdrop-filter:blur(2px); z-index:200; }
  .al-modal-wrap { position:fixed; inset:0; z-index:201; display:flex; align-items:center; justify-content:flex-end; padding:16px; pointer-events:none; }
  .al-modal-wrap-center { justify-content:center; }
  .al-modal { width:420px; max-width:100%; max-height:calc(100vh - 32px); background:var(--surface); border-radius:var(--radius-lg); box-shadow:0 20px 60px rgba(0,0,0,0.18); display:flex; flex-direction:column; overflow:hidden; pointer-events:all; animation:al-slide-in 0.22s ease; }
  .al-modal-lg { width:700px; }
  @keyframes al-slide-in { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
  .al-modal-wrap-center .al-modal { animation:al-fade-in 0.2s ease; }
  @keyframes al-fade-in { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
  .al-modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 20px 16px; border-bottom:1px solid var(--border); flex-shrink:0; }
  .al-modal-header-left { display:flex; flex-direction:column; gap:5px; }
  .al-modal-title { font-size:14px; font-weight:700; color:var(--text-primary); margin:0; letter-spacing:-0.01em; }
  .al-modal-close { width:30px; height:30px; border:1px solid var(--border); border-radius:var(--radius); background:transparent; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-muted); font-size:13px; transition:all 0.15s; flex-shrink:0; }
  .al-modal-close:hover { background:#FEF2F2; border-color:#fca5a5; color:#DC2626; }
  .al-modal-body { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px; }
  .al-modal-body::-webkit-scrollbar { width:4px; }
  .al-modal-body::-webkit-scrollbar-track { background:transparent; }
  .al-modal-body::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
  .al-modal-footer { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-top:1px solid var(--border); flex-shrink:0; gap:8px; }
  .al-footer-right { display:flex; gap:8px; margin-left:auto; }
  /* ── detail rows ── */
  .al-detail-grid { display:flex; flex-direction:column; gap:0; }
  .al-detail-row { display:flex; align-items:center; justify-content:space-between; padding:11px 0; border-bottom:1px solid var(--border); gap:12px; }
  .al-detail-row:last-child { border-bottom:none; }
  .al-detail-label { font-size:11.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; flex-shrink:0; }
  .al-detail-value { font-size:13px; font-weight:500; color:var(--text-primary); text-align:right; }
  .al-detail-emp { display:flex; align-items:center; gap:9px; }
  /* ── form ── */
  .al-field { display:flex; flex-direction:column; gap:6px; }
  .al-row-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .al-label { font-size:11.5px; font-weight:700; color:var(--text-secondary); letter-spacing:0.04em; text-transform:uppercase; display:flex; align-items:center; gap:5px; }
  .al-label-hint { font-size:10.5px; font-weight:500; color:var(--text-muted); text-transform:none; letter-spacing:0; }
  .al-input, .al-textarea, .al-select { width:100%; padding:9px 12px; border:1px solid var(--border); border-radius:var(--radius); background:var(--surface); font-size:13px; color:var(--text-primary); font-family:'Plus Jakarta Sans',sans-serif; transition:border-color 0.15s,box-shadow 0.15s; outline:none; }
  .al-input:focus, .al-textarea:focus, .al-select:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(80,72,229,0.1); }
  .al-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; cursor:pointer; }
  .al-textarea { resize:none; line-height:1.5; }
  .al-type-tabs { display:flex; gap:8px; flex-wrap:wrap; }
  .al-type-tab { flex:1; min-width:80px; padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius); background:var(--surface); font-size:12.5px; font-weight:600; color:var(--text-secondary); cursor:pointer; transition:all 0.15s; font-family:'Plus Jakarta Sans',sans-serif; text-align:center; }
  .al-type-tab:hover { background:var(--primary-light); color:var(--primary); border-color:#c7d2fe; }
  .al-radio-group { display:flex; gap:8px; flex-wrap:wrap; }
  .al-radio-btn { display:flex; align-items:center; gap:6px; padding:7px 12px; border:1px solid var(--border); border-radius:var(--radius); font-size:12.5px; font-weight:500; color:var(--text-secondary); cursor:pointer; transition:all 0.15s; user-select:none; }
  .al-radio-btn input[type="radio"] { display:none; }
  .al-radio-btn.active { background:var(--primary-light); color:var(--primary); border-color:#c7d2fe; font-weight:600; }
  .al-days-display { display:flex; align-items:center; gap:8px; padding:9px 12px; background:var(--primary-light); border:1px solid #c7d2fe; border-radius:var(--radius); font-size:13px; font-weight:700; color:var(--primary); }
  /* ── buttons ── */
  .al-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:var(--radius); font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s; border:1px solid transparent; font-family:'Plus Jakarta Sans',sans-serif; white-space:nowrap; }
  .al-btn:disabled { opacity:0.6; cursor:not-allowed; }
  .al-btn-primary { background:var(--primary); color:#fff; }
  .al-btn-primary:hover:not(:disabled) { background:var(--primary-dark); }
  .al-btn-ghost { background:transparent; border-color:var(--border); color:var(--text-secondary); }
  .al-btn-ghost:hover { background:var(--bg); }
  .al-btn-success { background:#ECFDF5; color:#059669; border-color:#6ee7b7; }
  .al-btn-success:hover:not(:disabled) { background:#059669; color:#fff; }
  .al-btn-danger { background:#FEF2F2; color:#DC2626; border-color:#fca5a5; }
  .al-btn-danger:hover:not(:disabled) { background:#DC2626; color:#fff; }
  /* ── misc ── */
  .al-spin { animation:al-spin 0.7s linear infinite; display:inline-block; }
  @keyframes al-spin { to { transform:rotate(360deg); } }
  .al-info-text { font-size:12.5px; color:var(--text-muted); margin:0; display:flex; align-items:center; gap:6px; }
  .al-hint-text { font-size:11.5px; color:#0891B2; margin:0; display:flex; align-items:center; gap:5px; background:#ECFEFF; padding:8px 10px; border-radius:var(--radius); border:1px solid #a5f3fc; }
  .al-empty-compoff { display:flex; align-items:flex-start; gap:10px; padding:12px; background:#FFFBEB; border:1px solid #fcd34d; border-radius:var(--radius); font-size:12.5px; color:#92400E; line-height:1.5; }
  .al-empty-compoff i { font-size:16px; margin-top:1px; flex-shrink:0; color:#D97706; }

  /* ════════════════════════════════════════════════
     HOLIDAY CALENDAR PICKER
  ════════════════════════════════════════════════ */
  .hcp-root { display:flex; flex-direction:column; gap:10px; border:1px solid var(--border); border-radius:var(--radius-lg); padding:14px; background:var(--bg); }
  /* nav */
  .hcp-nav { display:flex; align-items:center; justify-content:space-between; }
  .hcp-nav-btn { width:28px; height:28px; border:1px solid var(--border); border-radius:var(--radius); background:var(--surface); color:var(--text-secondary); font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; flex-shrink:0; }
  .hcp-nav-btn:hover { background:var(--primary-light); color:var(--primary); border-color:#c7d2fe; }
  .hcp-month-label { font-size:13px; font-weight:700; color:var(--text-primary); }
  /* grid */
  .hcp-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
  .hcp-weekday { font-size:9.5px; font-weight:700; color:var(--text-muted); text-align:center; padding:5px 0 3px; text-transform:uppercase; letter-spacing:0.05em; }
  .hcp-day { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; height:34px; border-radius:var(--radius); font-size:12px; font-weight:500; transition:all 0.12s; user-select:none; }
  .hcp-blank { background:transparent !important; }
  .hcp-normal { color:var(--text-secondary); }
  .hcp-regular-weekend { color:#d1d5db; }
  .hcp-selectable { cursor:pointer; }
  /* holiday = red tint */
  .hcp-holiday { background:#FEF2F2; color:#DC2626; font-weight:700; }
  .hcp-holiday.hcp-selectable:hover { background:#DC2626; color:#fff; }
  /* special weekend = amber tint */
  .hcp-special-weekend { background:#FFFBEB; color:#D97706; font-weight:700; }
  .hcp-special-weekend.hcp-selectable:hover { background:#D97706; color:#fff; }
  /* selected ring */
  .hcp-selected.hcp-holiday { background:#DC2626 !important; color:#fff !important; outline:2.5px solid #DC2626; outline-offset:2px; }
  .hcp-selected.hcp-special-weekend { background:#D97706 !important; color:#fff !important; outline:2.5px solid #D97706; outline-offset:2px; }
  /* today underline */
  .hcp-today .hcp-day-num { text-decoration:underline; text-underline-offset:2px; }
  .hcp-day-num { position:relative; line-height:1; }
  /* dots */
  .hcp-dot { width:4px; height:4px; border-radius:50%; position:absolute; bottom:3px; }
  .hcp-dot-holiday { background:#DC2626; }
  .hcp-dot-sw { background:#D97706; }
  /* selected banner */
  .hcp-selected-info { display:flex; align-items:center; gap:8px; padding:8px 11px; background:var(--primary-light); border:1px solid #c7d2fe; border-radius:var(--radius); font-size:12.5px; color:var(--primary); }
  .hcp-selected-info i { font-size:13px; flex-shrink:0; }
  .hcp-selected-info span { flex:1; line-height:1.4; }
  .hcp-clear { width:20px; height:20px; border:none; background:transparent; color:var(--primary); cursor:pointer; display:flex; align-items:center; justify-content:center; border-radius:4px; font-size:15px; opacity:0.65; padding:0; }
  .hcp-clear:hover { opacity:1; background:rgba(80,72,229,0.12); }
  /* selectable list */
  .hcp-list { border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; background:var(--surface); }
  .hcp-list-title { font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.07em; padding:7px 10px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:5px; background:var(--bg); }
  .hcp-list-items { display:flex; flex-direction:column; max-height:150px; overflow-y:auto; }
  .hcp-list-items::-webkit-scrollbar { width:3px; }
  .hcp-list-items::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
  .hcp-list-item { display:flex; align-items:center; gap:8px; padding:7px 10px; border:none; background:transparent; text-align:left; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; transition:background 0.1s; border-bottom:1px solid var(--border); }
  .hcp-list-item:last-child { border-bottom:none; }
  .hcp-list-item:hover { background:var(--bg); }
  .hcp-list-selected { background:var(--bg) !important; }
  .hcp-list-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .hcp-list-date { font-weight:700; white-space:nowrap; min-width:88px; }
  .hcp-list-holiday .hcp-list-date { color:#DC2626; }
  .hcp-list-sw .hcp-list-date { color:#D97706; }
  .hcp-list-name { flex:1; color:var(--text-secondary); font-size:11.5px; }
  .hcp-list-check { color:var(--primary); font-size:13px; flex-shrink:0; }
  /* no dates */
  .hcp-empty-month { font-size:12px; color:var(--text-muted); text-align:center; padding:10px; display:flex; align-items:center; justify-content:center; gap:6px; }
  /* legend */
  .hcp-legend { display:flex; gap:14px; flex-wrap:wrap; padding-top:2px; }
  .hcp-legend-item { display:flex; align-items:center; gap:5px; font-size:10.5px; color:var(--text-muted); }
  .hcp-legend-item .hcp-dot { position:static; width:7px; height:7px; }
`;
