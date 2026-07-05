import { useState, useEffect } from "react";
import api from "../../api";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import AppLayout from "../../components/layout/AppLayout";
import { Link } from "react-router-dom";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// ── Constants ────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function pad(n) { return String(n).padStart(2, "0"); }
function toDS(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

function is2ndOr4thSat(y, m, d) {
  if (new Date(y, m, d).getDay() !== 6) return false;
  let count = 0;
  for (let i = 1; i <= d; i++) if (new Date(y, m, i).getDay() === 6) count++;
  return count === 2 || count === 4;
}

// ── HolidayCalendar Component ────────────────────────────
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
    setMonth(m);
    setYear(y);
  };

  const getDayMeta = (y, m, d) => {
    const ds = toDS(y, m, d);
    const dow = new Date(y, m, d).getDay();
    if (holidayMap[ds]) return { type: "holiday", label: holidayMap[ds], ds };
    if (dow === 0)       return { type: "sunday",  label: "Sunday", ds };
    if (is2ndOr4thSat(y, m, d)) return { type: "saturday-off", label: "2nd/4th Saturday", ds };
    return { type: "workday", ds };
  };

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, otherMonth: true, disabled: true });
  for (let d = 1; d <= daysInMonth; d++) {
    const meta = getDayMeta(year, month, d);
    cells.push({ day: d, ...meta, disabled: meta.type === "workday" });
  }
  const rem = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let i = 1; i <= rem; i++)
    cells.push({ day: i, otherMonth: true, disabled: true });

  const TYPE_STYLE = {
    holiday:        { bg: "#ECFDF5", color: "#059669", dot: "#059669" },
    sunday:         { bg: "#FEF2F2", color: "#DC2626", dot: "#DC2626" },
    "saturday-off": { bg: "#FFFBEB", color: "#D97706", dot: "#D97706" },
    workday:        { bg: "transparent", color: "#D1D5DB", dot: null },
  };

  return (
    <div className="hcal">
      {/* Nav */}
      <div className="hcal-nav">
        <button className="hcal-nav-btn" onClick={() => navigate(-1)}>
          <i className="bi bi-chevron-left" />
        </button>
        <span className="hcal-title">{MONTHS[month]} {year}</span>
        <button className="hcal-nav-btn" onClick={() => navigate(1)}>
          <i className="bi bi-chevron-right" />
        </button>
      </div>

      <div className="hcal-grid">
        {/* Day-of-week headers */}
        <div className="hcal-dow">
          {DAYS_SHORT.map((d, i) => (
            <div
              key={d}
              className={`hcal-dow-cell${i === 0 ? " hcal-dow-sun" : i === 6 ? " hcal-dow-sat" : ""}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="hcal-days">
          {cells.map((c, i) => {
            const ts = TYPE_STYLE[c.type] || TYPE_STYLE.workday;
            const isSelected = !c.otherMonth && c.ds === selected;
            const clickable  = !c.disabled && !c.otherMonth;

            return (
              <div
                key={i}
                className={[
                  "hcal-day-cell",
                  c.otherMonth || c.disabled ? "hcal-disabled" : "",
                  isSelected ? "hcal-selected" : "",
                ].join(" ").trim()}
                style={
                  isSelected
                    ? {}
                    : { background: c.otherMonth ? "transparent" : ts.bg, color: c.otherMonth ? "#E5E7EB" : ts.color }
                }
                title={c.label || ""}
                onClick={() => clickable && onSelect(c.ds === selected ? "" : c.ds)}
              >
                {c.day}
                {ts.dot && !c.otherMonth && !isSelected && (
                  <span className="hcal-dot" style={{ background: ts.dot }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="hcal-legend">
        <div className="hcal-leg-item">
          <span className="hcal-leg-dot" style={{ background: "#059669" }} /> Public Holiday
        </div>
        <div className="hcal-leg-item">
          <span className="hcal-leg-dot" style={{ background: "#DC2626" }} /> Sunday
        </div>
        <div className="hcal-leg-item">
          <span className="hcal-leg-dot" style={{ background: "#D97706" }} /> 2nd / 4th Sat
        </div>
      </div>
    </div>
  );
}

// ── Main Leaves Component ────────────────────────────────
export default function Leaves() {
  const [events, setEvents]                     = useState([]);
  const [holidays, setHolidays]                 = useState([]);
  const [showModal, setShowModal]               = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [isViewMode, setIsViewMode]             = useState(false);
  const [permissionRemaining, setPermissionRemaining] = useState(2);

  const [compoffEligible, setCompoffEligible]   = useState([]);
  const [compoffLoading, setCompoffLoading]     = useState(false);

  const [formData, setFormData] = useState({
    id: null,
    leave_type: "leave",
    start_date: "",
    end_date: "",
    reason: "",
    days: 0,
    compoff_date: "",
    half_day_type: "full",
    hours: 0,
    slot: "morning",
    status: "",
    holiday_name: "",
  });

  // ── Fetch ──────────────────────────────────────────────
  const fetchLeaves = async () => {
    try {
      const res = await api.get("/leaves/my");
      setEvents(
        res.data.map((ev) => ({ ...ev, start: new Date(ev.start), end: new Date(ev.end) }))
      );
    } catch (err) { console.error(err); }
  };

  const fetchPermissionRemaining = async () => {
    try {
      const res = await api.get("/leaves/permission-remaining");
      setPermissionRemaining(res.data.remaining || 0);
    } catch { setPermissionRemaining(0); }
  };

  const fetchHolidays = async () => {
    try {
      const res = await api.get("/leaves/holidays");
      setHolidays(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchCompoffEligible = async () => {
    setCompoffLoading(true);
    try {
      const res = await api.get("/leaves/compoff-eligible");
      setCompoffEligible(res.data);
    } catch (err) {
      console.error(err);
      setCompoffEligible([]);
    } finally {
      setCompoffLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchPermissionRemaining();
    fetchHolidays();
  }, []);

  useEffect(() => {
    if (formData.leave_type === "compoff" && !formData.id) {
      fetchCompoffEligible();
      setFormData((prev) => ({ ...prev, compoff_date: "" }));
    }
  }, [formData.leave_type]);

  // ── Helpers ────────────────────────────────────────────
  const toCalendarDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start); s.setHours(0, 0, 0, 0);
    const e = new Date(end);   e.setHours(0, 0, 0, 0);
    return (e - s) / (1000 * 60 * 60 * 24) + 1;
  };

  const blankForm = (overrides = {}) => ({
    id: null,
    leave_type: "leave",
    start_date: "",
    end_date: "",
    reason: "",
    days: 0,
    compoff_date: "",
    half_day_type: "full",
    hours: permissionRemaining,
    slot: "morning",
    status: "pending",
    holiday_name: "",
    ...overrides,
  });

  // ── Delete ─────────────────────────────────────────────
  const handleDelete = async () => {
    if (!formData.id || !window.confirm("Are you sure you want to delete this entry?")) return;
    try {
      setLoading(true);
      await api.delete(`/leaves/delete/${formData.id}?type=${formData.leave_type}`);
      setLoading(false);
      setShowModal(false);
      fetchLeaves();
      fetchPermissionRemaining();
      alert(
        `${formData.leave_type.charAt(0).toUpperCase() + formData.leave_type.slice(1)} deleted successfully!`
      );
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Something went wrong while deleting.");
      setLoading(false);
    }
  };

  // ── Slot select ────────────────────────────────────────
  const handleSelectSlot = (slotInfo) => {
    const startDate = new Date(slotInfo.start);
    const endDate   = new Date(slotInfo.end);
    if (startDate.getTime() !== endDate.getTime()) endDate.setDate(endDate.getDate() - 1);

    const overlapping = events.some((ev) => {
      if (ev.type !== "leave" && ev.type !== "compoff") return false;
      return startDate <= new Date(ev.end) && endDate >= new Date(ev.start);
    });

    if (overlapping) { alert("Leave already exists for selected date(s)."); return; }

    setFormData(
      blankForm({
        start_date: toCalendarDate(startDate),
        end_date:   toCalendarDate(endDate),
        days:       calculateDays(startDate, endDate),
      })
    );
    setIsViewMode(false);
    setShowModal(true);
  };

  // ── Event click ────────────────────────────────────────
  const handleSelectEvent = (event) => {
    const viewOnly = event.status === "approved";

    setFormData({
      id:            event.id,
      leave_type:    event.type || "leave",
      start_date:    toCalendarDate(event.start),
      end_date:      toCalendarDate(event.end),
      reason:        event.remarks || "",
      days:          calculateDays(event.start, event.end),
      compoff_date:  event.comp_off_date || "",
      half_day_type: event.half_day_type || "full",
      hours:         event.hours || permissionRemaining,
      slot:          event.slot || "morning",
      status:        event.status,
      holiday_name:  event.holiday_name || "",
    });

    if (event.type === "compoff" && event.status !== "approved") {
      fetchCompoffEligible();
    }

    setIsViewMode(viewOnly);
    setShowModal(true);
  };

  // ── Auto-days ──────────────────────────────────────────
  useEffect(() => {
    if (formData.leave_type !== "leave") return;
    const total = calculateDays(formData.start_date, formData.end_date);
    setFormData((prev) => ({
      ...prev,
      days:
        formData.start_date === formData.end_date && formData.half_day_type !== "full"
          ? 0.5
          : total,
    }));
  }, [formData.start_date, formData.end_date, formData.half_day_type, formData.leave_type]);

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async () => {
    if (isViewMode) return;
    setLoading(true);
    try {
      let payload = { id: formData.id };

      if (formData.leave_type === "permission") {
        if (!formData.start_date || !formData.hours || !formData.slot) {
          alert("Please fill all fields for permission."); setLoading(false); return;
        }
        if (formData.hours > permissionRemaining) {
          alert(`You only have ${permissionRemaining} hour(s) remaining.`); setLoading(false); return;
        }
        payload = {
          ...payload,
          from_date: formData.start_date,
          type: "permission",
          hours: formData.hours,
          slot: formData.slot,
          remarks: formData.reason || null,
        };
      } else if (formData.leave_type === "compoff") {
        if (!formData.start_date || !formData.compoff_date) {
          alert("Please fill all fields for comp off."); setLoading(false); return;
        }
        payload = {
          ...payload,
          from_date: formData.start_date,
          type: "compoff",
          comp_off_date: formData.compoff_date,
          remarks: formData.reason || null,
        };
      } else if (formData.leave_type === "present") {
        if (!formData.start_date) {
          alert("Please select a holiday date."); setLoading(false); return;
        }
        // Derive holiday name — check public holidays list first, then weekend labels
        const selectedHoliday = holidays.find((h) => h.date === formData.start_date);
        let holidayName = selectedHoliday?.name || null;
        if (!holidayName) {
          const dow = new Date(formData.start_date).getDay();
          if (dow === 0) holidayName = "Sunday";
          else if (is2ndOr4thSat(...formData.start_date.split("-").map((v, i) => i === 1 ? Number(v) - 1 : Number(v))))
            holidayName = "2nd/4th Saturday";
        }
        payload = {
          ...payload,
          from_date: formData.start_date,
          type: "present",
          holiday_name: holidayName,
          remarks: formData.reason || null,
        };
      } else {
        if (!formData.start_date || !formData.end_date) {
          alert("Please select start and end date."); setLoading(false); return;
        }
        payload = {
          ...payload,
          from_date: formData.start_date,
          to_date: formData.end_date,
          type: "leave",
          days: formData.days,
          half_day_type: formData.half_day_type,
          remarks: formData.reason || null,
        };
      }

      await api.post("/leaves", payload);
      setLoading(false);
      setShowModal(false);
      fetchLeaves();
      fetchPermissionRemaining();
    } catch (err) {
      alert(err.response?.data?.error || "Something went wrong");
      setLoading(false);
    }
  };

  // ── Config ─────────────────────────────────────────────
  const typeConfig = {
    leave:      { label: "Leave",              color: "#5048E5", bg: "#EEF2FF" },
    compoff:    { label: "Comp Off",           color: "#0891B2", bg: "#ECFEFF" },
    permission: { label: "Permission",         color: "#D97706", bg: "#FFFBEB" },
    present:    { label: "Present on Holiday", color: "#059669", bg: "#ECFDF5" },
  };

  const statusConfig = {
    approved: { label: "Approved", color: "#059669", bg: "#ECFDF5" },
    pending:  { label: "Pending",  color: "#D97706", bg: "#FFFBEB" },
    rejected: { label: "Rejected", color: "#DC2626", bg: "#FEF2F2" },
  };

  const typeIcons = {
    leave:      "bi-calendar-x",
    compoff:    "bi-arrow-left-right",
    permission: "bi-clock",
    present:    "bi-person-check",
  };

  const modalTitle = isViewMode
    ? `${typeConfig[formData.leave_type]?.label || "Leave"} Details`
    : formData.id ? "Edit Request" : "Apply Leave / Permission";

  // ── Selected holiday label for view mode ───────────────
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

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* ── PAGE HEADER ── */}
      <div className="lv-page-header">
        <div>
          <h5 className="lv-page-title">My Leave Calendar</h5>
          <nav className="lv-breadcrumb">
            <Link to="/employee/dashboard">Dashboard</Link>
            <i className="bi bi-chevron-right" />
            <span>Leaves</span>
          </nav>
        </div>
        <button
          className="lv-apply-btn"
          onClick={() => {
            setFormData(blankForm());
            setCompoffEligible([]);
            setIsViewMode(false);
            setShowModal(true);
          }}
        >
          <i className="bi bi-plus-lg" /> Apply Leave
        </button>
      </div>

      {/* ── CALENDAR CARD ── */}
      <div className="lv-card">
        <div className="lv-legend">
          {Object.entries(statusConfig).map(([key, s]) => (
            <div key={key} className="lv-legend-item">
              <span className="lv-legend-dot" style={{ background: s.color }} />
              <span>{s.label}</span>
            </div>
          ))}
          <div className="lv-legend-sep" />
          <span className="lv-legend-hint">
            <i className="bi bi-info-circle" /> Click a date to apply · Click an event to view
          </span>
        </div>

        <Calendar
          selectable
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={(event) => {
            const color =
              event.status === "approved"
                ? "#059669"
                : event.status === "rejected"
                ? "#DC2626"
                : "#D97706";
            return {
              style: {
                backgroundColor: color,
                color: "#fff",
                borderRadius: "6px",
                border: "none",
                fontSize: "12px",
                fontWeight: 600,
              },
            };
          }}
        />
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <>
          <div className="lv-modal-overlay" onClick={() => setShowModal(false)} />
          <div className="lv-modal-wrap">
            <div className="lv-modal">

              {/* Modal header */}
              <div className="lv-modal-header">
                <div className="lv-modal-header-left">
                  {formData.status && (
                    <span
                      className="lv-status-pill"
                      style={{
                        background: statusConfig[formData.status]?.bg || "#F3F4F6",
                        color:      statusConfig[formData.status]?.color || "#6B7280",
                      }}
                    >
                      {statusConfig[formData.status]?.label || formData.status}
                    </span>
                  )}
                  <h6 className="lv-modal-title">{modalTitle}</h6>
                </div>
                <button className="lv-modal-close" onClick={() => setShowModal(false)}>
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              {/* Modal body */}
              <div className="lv-modal-body">

                {/* Type selector */}
                <div className="lv-field">
                  <label className="lv-label">Request Type</label>
                  {isViewMode || formData.id ? (
                    <div
                      className="lv-type-badge"
                      style={{
                        background: typeConfig[formData.leave_type]?.bg,
                        color:      typeConfig[formData.leave_type]?.color,
                      }}
                    >
                      <i className={`bi ${typeIcons[formData.leave_type] || "bi-calendar-x"}`} />
                      {typeConfig[formData.leave_type]?.label}
                    </div>
                  ) : (
                    <div className="lv-type-tabs">
                      {Object.entries(typeConfig).map(([key, cfg]) => (
                        <button
                          key={key}
                          className={`lv-type-tab ${formData.leave_type === key ? "active" : ""}`}
                          style={
                            formData.leave_type === key
                              ? { background: cfg.bg, color: cfg.color, borderColor: cfg.color }
                              : {}
                          }
                          onClick={() =>
                            setFormData({
                              ...formData,
                              leave_type: key,
                              start_date: "",
                              end_date: "",
                              compoff_date: "",
                            })
                          }
                        >
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── LEAVE ── */}
                {formData.leave_type === "leave" && (
                  <>
                    <div className="lv-row-2">
                      <div className="lv-field">
                        <label className="lv-label">Start Date</label>
                        <input
                          type="date" className="lv-input"
                          value={formData.start_date} disabled={isViewMode}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        />
                      </div>
                      <div className="lv-field">
                        <label className="lv-label">End Date</label>
                        <input
                          type="date" className="lv-input"
                          value={formData.end_date} disabled={isViewMode}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                      </div>
                    </div>

                    {formData.start_date === formData.end_date && formData.start_date && (
                      <div className="lv-field">
                        <label className="lv-label">Duration</label>
                        <div className="lv-radio-group">
                          {[
                            ["full",        "Full Day"],
                            ["first_half",  "First Half"],
                            ["second_half", "Second Half"],
                          ].map(([val, lbl]) => (
                            <label
                              key={val}
                              className={`lv-radio-btn ${formData.half_day_type === val ? "active" : ""}`}
                            >
                              <input
                                type="radio" name="half_day_type" value={val}
                                checked={formData.half_day_type === val}
                                disabled={isViewMode}
                                onChange={(e) => setFormData({ ...formData, half_day_type: e.target.value })}
                              />
                              {lbl}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="lv-field">
                      <label className="lv-label">Number of Days</label>
                      <div className="lv-days-display">
                        <i className="bi bi-calendar-check" />
                        <span>{formData.days} {formData.days === 1 ? "day" : "days"}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* ── COMP OFF ── */}
                {formData.leave_type === "compoff" && (
                  <>
                    <div className="lv-field">
                      <label className="lv-label">
                        Leave Date <span className="lv-label-hint">(day off to take)</span>
                      </label>
                      <input
                        type="date" className="lv-input"
                        value={formData.start_date} disabled={isViewMode}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>

                    <div className="lv-field">
                      <label className="lv-label">
                        Holiday Worked{" "}
                        <span className="lv-label-hint">(must be approved present)</span>
                      </label>
                      {isViewMode ? (
                        <div className="lv-input lv-input-readonly">{formData.compoff_date || "—"}</div>
                      ) : compoffLoading ? (
                        <p className="lv-info-text">
                          <i className="bi bi-arrow-repeat lv-spin" /> Loading eligible dates…
                        </p>
                      ) : compoffEligible.length === 0 ? (
                        <div className="lv-empty-compoff">
                          <i className="bi bi-calendar-x" />
                          <span>
                            No eligible holidays found. You must be marked{" "}
                            <strong>Present on Holiday</strong> and approved first.
                          </span>
                        </div>
                      ) : (
                        <select
                          className="lv-select"
                          value={formData.compoff_date}
                          onChange={(e) => setFormData({ ...formData, compoff_date: e.target.value })}
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

                {/* ── PRESENT ON HOLIDAY ── */}
                {formData.leave_type === "present" && (
                  <div className="lv-field">
                    <label className="lv-label">Holiday Date</label>

                    {isViewMode ? (
                      /* View mode: show date + holiday name as read-only fields */
                      <div className="lv-row-2">
                        <div className="lv-field">
                          <label className="lv-label" style={{ fontSize: "10px" }}>Date</label>
                          <div className="lv-input lv-input-readonly">{formData.start_date || "—"}</div>
                        </div>
                        <div className="lv-field">
                          <label className="lv-label" style={{ fontSize: "10px" }}>Holiday</label>
                          <div className="lv-input lv-input-readonly">{selectedHolidayName}</div>
                        </div>
                      </div>
                    ) : (
                      /* Apply / Edit mode: inline calendar picker */
                      <>
                        <HolidayCalendar
                          holidays={holidays}
                          selected={formData.start_date}
                          onSelect={(date) => setFormData({ ...formData, start_date: date })}
                        />

                        {/* Show selected date chip */}
                        {formData.start_date && (
                          <div className="lv-selected-date-chip">
                            <i className="bi bi-calendar-check" />
                            <span>
                              {new Date(formData.start_date).toLocaleDateString("en-IN", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                              {selectedHolidayName !== "—" && ` — ${selectedHolidayName}`}
                            </span>
                          </div>
                        )}

                        <p className="lv-hint-text">
                          <i className="bi bi-info-circle" /> Once approved by admin, you can apply
                          Comp Off for this day.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* ── PERMISSION ── */}
                {formData.leave_type === "permission" && (
                  <>
                    <div className="lv-field">
                      <label className="lv-label">Date</label>
                      <input
                        type="date" className="lv-input"
                        value={formData.start_date} disabled={isViewMode}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div className="lv-row-2">
                      <div className="lv-field">
                        <label className="lv-label">
                          Hours
                          {!isViewMode && (
                            <span className="lv-label-hint">({permissionRemaining}h remaining)</span>
                          )}
                        </label>
                        <input
                          type="number" className="lv-input"
                          min={0.5} max={permissionRemaining} step={0.5}
                          value={formData.hours}
                          disabled={isViewMode || permissionRemaining === 0}
                          onChange={(e) => setFormData({ ...formData, hours: Number(e.target.value) })}
                        />
                      </div>
                      <div className="lv-field">
                        <label className="lv-label">Slot</label>
                        <div className="lv-radio-group">
                          {[["morning", "Morning"], ["evening", "Evening"]].map(([val, lbl]) => (
                            <label
                              key={val}
                              className={`lv-radio-btn ${formData.slot === val ? "active" : ""}`}
                            >
                              <input
                                type="radio" name="slot" value={val}
                                checked={formData.slot === val}
                                disabled={isViewMode || permissionRemaining === 0}
                                onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                              />
                              {lbl}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── REASON ── */}
                <div className="lv-field">
                  <label className="lv-label">
                    Reason <span className="lv-label-hint">(optional)</span>
                  </label>
                  <textarea
                    className="lv-textarea" rows={3}
                    value={formData.reason} disabled={isViewMode}
                    placeholder={isViewMode ? "" : "Enter reason for leave..."}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>

              </div>

              {/* Modal footer */}
              <div className="lv-modal-footer">
                {formData.id && formData.status === "pending" && (
                  <button className="lv-btn lv-btn-danger" onClick={handleDelete} disabled={loading}>
                    <i className="bi bi-trash" /> {loading ? "Deleting…" : "Delete"}
                  </button>
                )}
                <div className="lv-footer-right">
                  <button className="lv-btn lv-btn-ghost" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  {!isViewMode && (
                    <button className="lv-btn lv-btn-primary" onClick={handleSubmit} disabled={loading}>
                      {loading ? (
                        <><i className="bi bi-arrow-repeat lv-spin" /> Submitting…</>
                      ) : (
                        <><i className="bi bi-send" /> Submit</>
                      )}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

// ── Styles ───────────────────────────────────────────────
const styles = `
  /* Page */
  .lv-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; }
  .lv-page-title { font-size:15px; font-weight:700; color:var(--text-primary); margin:0 0 4px; letter-spacing:-0.01em; }
  .lv-breadcrumb { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-muted); }
  .lv-breadcrumb a { color:var(--primary); text-decoration:none; font-weight:500; }
  .lv-breadcrumb a:hover { text-decoration:underline; }
  .lv-breadcrumb i { font-size:10px; opacity:0.5; }
  .lv-apply-btn { display:flex; align-items:center; gap:7px; padding:9px 18px; background:var(--primary); color:#fff; border:none; border-radius:var(--radius); font-size:13px; font-weight:600; cursor:pointer; transition:background 0.15s,transform 0.15s; letter-spacing:0.01em; font-family:'Plus Jakarta Sans',sans-serif; }
  .lv-apply-btn:hover { background:var(--primary-dark); transform:translateY(-1px); }
  .lv-apply-btn i { font-size:14px; }

  /* Card */
  .lv-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px; box-shadow:var(--shadow); }
  .lv-legend { display:flex; align-items:center; gap:16px; margin-bottom:16px; flex-wrap:wrap; }
  .lv-legend-item { display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--text-secondary); font-weight:500; }
  .lv-legend-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
  .lv-legend-sep { flex:1; }
  .lv-legend-hint { font-size:11.5px; color:var(--text-muted); display:flex; align-items:center; gap:5px; }

  /* Big Calendar overrides */
  .rbc-calendar { font-family:'Plus Jakarta Sans',sans-serif !important; }
  .rbc-toolbar button { border-radius:var(--radius) !important; font-size:12.5px !important; font-weight:600 !important; color:var(--text-secondary) !important; border-color:var(--border) !important; }
  .rbc-toolbar button.rbc-active, .rbc-toolbar button:hover { background:var(--primary-light) !important; color:var(--primary) !important; border-color:#c7d2fe !important; box-shadow:none !important; }
  .rbc-toolbar-label { font-size:14px !important; font-weight:700 !important; color:var(--text-primary) !important; }
  .rbc-header { font-size:11px !important; font-weight:700 !important; color:var(--text-muted) !important; text-transform:uppercase !important; letter-spacing:0.06em !important; padding:8px 0 !important; border-color:var(--border) !important; }
  .rbc-today { background:var(--primary-light) !important; }
  .rbc-off-range-bg { background:#fafafa !important; }
  .rbc-date-cell { font-size:12px !important; color:var(--text-secondary) !important; font-weight:500 !important; }
  .rbc-date-cell.rbc-now a { color:var(--primary) !important; font-weight:700 !important; }
  .rbc-day-bg:hover { background:#f5f6ff !important; cursor:pointer; }
  .rbc-month-row, .rbc-month-view, .rbc-day-bg, .rbc-header { border-color:var(--border) !important; }

  /* Modal overlay & wrapper */
  .lv-modal-overlay { position:fixed; inset:0; background:rgba(17,24,39,0.45); backdrop-filter:blur(2px); z-index:200; }
  .lv-modal-wrap { position:fixed; inset:0; z-index:201; display:flex; align-items:center; justify-content:flex-end; padding:16px; pointer-events:none; }
  .lv-modal { width:440px; max-width:100%; max-height:calc(100vh - 32px); background:var(--surface); border-radius:var(--radius-lg); box-shadow:0 20px 60px rgba(0,0,0,0.18); display:flex; flex-direction:column; overflow:hidden; pointer-events:all; animation:lv-slide-in 0.22s ease; }
  @keyframes lv-slide-in { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }

  /* Modal sections */
  .lv-modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 20px 16px; border-bottom:1px solid var(--border); flex-shrink:0; }
  .lv-modal-header-left { display:flex; flex-direction:column; gap:5px; }
  .lv-modal-title { font-size:14px; font-weight:700; color:var(--text-primary); margin:0; letter-spacing:-0.01em; }
  .lv-status-pill { display:inline-block; font-size:10.5px; font-weight:700; padding:2px 9px; border-radius:20px; letter-spacing:0.04em; width:fit-content; }
  .lv-modal-close { width:30px; height:30px; border:1px solid var(--border); border-radius:var(--radius); background:transparent; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-muted); font-size:13px; transition:all 0.15s; flex-shrink:0; }
  .lv-modal-close:hover { background:#FEF2F2; border-color:#fca5a5; color:#DC2626; }
  .lv-modal-body { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px; }
  .lv-modal-body::-webkit-scrollbar { width:4px; }
  .lv-modal-body::-webkit-scrollbar-track { background:transparent; }
  .lv-modal-body::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
  .lv-modal-footer { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-top:1px solid var(--border); flex-shrink:0; gap:8px; }
  .lv-footer-right { display:flex; gap:8px; margin-left:auto; }

  /* Form elements */
  .lv-field { display:flex; flex-direction:column; gap:6px; }
  .lv-row-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .lv-label { font-size:11.5px; font-weight:700; color:var(--text-secondary); letter-spacing:0.04em; text-transform:uppercase; display:flex; align-items:center; gap:5px; }
  .lv-label-hint { font-size:10.5px; font-weight:500; color:var(--text-muted); text-transform:none; letter-spacing:0; }
  .lv-input, .lv-textarea, .lv-select { width:100%; padding:9px 12px; border:1px solid var(--border); border-radius:var(--radius); background:var(--surface); font-size:13px; color:var(--text-primary); font-family:'Plus Jakarta Sans',sans-serif; transition:border-color 0.15s,box-shadow 0.15s; outline:none; box-sizing:border-box; }
  .lv-input:focus, .lv-textarea:focus, .lv-select:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(80,72,229,0.1); }
  .lv-input:disabled, .lv-textarea:disabled { background:var(--bg); color:var(--text-muted); cursor:default; }
  .lv-input-readonly { background:var(--bg); color:var(--text-secondary); cursor:default; }
  .lv-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; cursor:pointer; }
  .lv-textarea { resize:none; line-height:1.5; }

  /* Type tabs & badge */
  .lv-type-tabs { display:flex; gap:8px; flex-wrap:wrap; }
  .lv-type-tab { flex:1; min-width:90px; padding:8px 10px; border:1px solid var(--border); border-radius:var(--radius); background:var(--surface); font-size:12px; font-weight:600; color:var(--text-secondary); cursor:pointer; transition:all 0.15s; font-family:'Plus Jakarta Sans',sans-serif; text-align:center; }
  .lv-type-tab:hover { background:var(--primary-light); color:var(--primary); border-color:#c7d2fe; }
  .lv-type-badge { display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:600; padding:8px 14px; border-radius:var(--radius); width:fit-content; }

  /* Radio buttons */
  .lv-radio-group { display:flex; gap:8px; flex-wrap:wrap; }
  .lv-radio-btn { display:flex; align-items:center; gap:6px; padding:7px 12px; border:1px solid var(--border); border-radius:var(--radius); font-size:12.5px; font-weight:500; color:var(--text-secondary); cursor:pointer; transition:all 0.15s; user-select:none; }
  .lv-radio-btn input[type="radio"] { display:none; }
  .lv-radio-btn.active { background:var(--primary-light); color:var(--primary); border-color:#c7d2fe; font-weight:600; }
  .lv-radio-btn:has(input:disabled) { opacity:0.5; cursor:default; }

  /* Misc display elements */
  .lv-days-display { display:flex; align-items:center; gap:8px; padding:9px 12px; background:var(--primary-light); border:1px solid #c7d2fe; border-radius:var(--radius); font-size:13px; font-weight:700; color:var(--primary); }
  .lv-info-text { font-size:12.5px; color:var(--text-muted); margin:0; display:flex; align-items:center; gap:6px; }
  .lv-hint-text { font-size:11.5px; color:#0891B2; margin:0; display:flex; align-items:center; gap:5px; background:#ECFEFF; padding:8px 10px; border-radius:var(--radius); border:1px solid #a5f3fc; }
  .lv-empty-compoff { display:flex; align-items:flex-start; gap:10px; padding:12px; background:#FFFBEB; border:1px solid #fcd34d; border-radius:var(--radius); font-size:12.5px; color:#92400E; line-height:1.5; }
  .lv-empty-compoff i { font-size:16px; margin-top:1px; flex-shrink:0; color:#D97706; }

  /* Buttons */
  .lv-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:var(--radius); font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s; border:1px solid transparent; font-family:'Plus Jakarta Sans',sans-serif; white-space:nowrap; }
  .lv-btn:disabled { opacity:0.6; cursor:not-allowed; }
  .lv-btn-primary { background:var(--primary); color:#fff; }
  .lv-btn-primary:hover:not(:disabled) { background:var(--primary-dark); }
  .lv-btn-ghost { background:transparent; border-color:var(--border); color:var(--text-secondary); }
  .lv-btn-ghost:hover { background:var(--bg); }
  .lv-btn-danger { background:#FEF2F2; color:#DC2626; border-color:#fca5a5; }
  .lv-btn-danger:hover:not(:disabled) { background:#DC2626; color:#fff; }

  /* Spin */
  .lv-spin { animation:spin 0.7s linear infinite; display:inline-block; }
  @keyframes spin { to { transform:rotate(360deg); } }

  /* ── Holiday Calendar Picker ── */
  .hcal { border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; }
  .hcal-nav { display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:var(--bg); border-bottom:1px solid var(--border); }
  .hcal-nav-btn { width:28px; height:28px; border:1px solid var(--border); border-radius:6px; background:var(--surface); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:12px; color:var(--text-muted); transition:all 0.12s; }
  .hcal-nav-btn:hover { background:var(--primary-light); border-color:#C7D2FE; color:var(--primary); }
  .hcal-title { font-size:13px; font-weight:700; color:var(--text-primary); }
  .hcal-grid { padding:10px; }
  .hcal-dow { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; margin-bottom:4px; }
  .hcal-dow-cell { text-align:center; font-size:9.5px; font-weight:700; color:#9CA3AF; letter-spacing:0.05em; padding:3px 0; text-transform:uppercase; }
  .hcal-dow-sun { color:#EF4444; }
  .hcal-dow-sat { color:#F59E0B; }
  .hcal-days { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
  .hcal-day-cell { aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:7px; font-size:12px; font-weight:500; cursor:pointer; transition:all 0.12s; gap:2px; }
  .hcal-day-cell:hover:not(.hcal-disabled):not(.hcal-selected) { filter:brightness(0.92); transform:scale(1.06); }
  .hcal-disabled { cursor:default !important; }
  .hcal-selected { background:var(--primary) !important; color:#fff !important; font-weight:700 !important; box-shadow:0 2px 8px rgba(80,72,229,0.3); transform:scale(1.06); }
  .hcal-dot { width:4px; height:4px; border-radius:50%; flex-shrink:0; }
  .hcal-legend { display:flex; gap:12px; flex-wrap:wrap; padding:8px 12px; border-top:1px solid var(--border); background:var(--bg); }
  .hcal-leg-item { display:flex; align-items:center; gap:5px; font-size:10.5px; color:var(--text-muted); font-weight:500; }
  .hcal-leg-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

  /* Selected date chip */
  .lv-selected-date-chip { display:flex; align-items:center; gap:8px; padding:9px 12px; background:var(--primary-light); border:1px solid #C7D2FE; border-radius:var(--radius); font-size:12.5px; font-weight:600; color:var(--primary); }
`;
