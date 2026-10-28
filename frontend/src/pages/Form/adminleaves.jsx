import { useState, useEffect, useMemo } from "react";
import api from "../../api";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import AppLayout from "../../components/layout/AppLayout";
import { Link, useSearchParams } from "react-router-dom";
import {
  format, parse, startOfWeek, getDay,
  startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isToday,
} from "date-fns";
import enUS from "date-fns/locale/en-US";
import SharedDatePicker from "../../components/SharedDatePicker";
import SharedSelect from "../../components/SharedSelect";
import SummaryPeriodFilter, { defaultSummaryPeriod } from "../../components/SummaryPeriodFilter";
import { fmtDate, fmtDays, fmtNum, defaultSortOrderFor } from "../../utils";

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
        <button className="hcp-nav-btn" title="Previous month" onClick={() => setViewDate(subMonths(viewDate, 1))}>
          <i className="bi bi-chevron-left" />
        </button>
        <span className="hcp-month-label">{format(viewDate, "MMMM yyyy")}</span>
        <button className="hcp-nav-btn" title="Next month" onClick={() => setViewDate(addMonths(viewDate, 1))}>
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
            <strong>{format(new Date(value + "T00:00:00"), "dd-MM-yyyy")}</strong>
            {holidayMap[value]
              ? ` — ${holidayMap[value]}`
              : ` — ${specialWeekendLabel(new Date(value + "T00:00:00"))}`}
          </span>
          <button className="hcp-clear" title="Clear date" onClick={() => onChange("")}>
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
                  <span className="hcp-list-date">{format(d, "EEE, dd-MM")}</span>
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
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [viewMode, setViewMode] = useState("list");
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
  const [canDelete] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      const role = token ? JSON.parse(atob(token.split(".")[1])).role : "employee";
      if (role === "admin") return true;
      const stored = localStorage.getItem("permissions");
      if (stored) {
        const arr = JSON.parse(stored);
        const p = arr.find((x) => x.menu_key === "attendance");
        return !!p?.can_delete;
      }
    } catch { /* ignore */ }
    return false;
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── STATUS FILTER (deep-linkable: /admin/leaves?status=pending) ────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = searchParams.get("status");
  const statusFilter = ["pending", "approved", "rejected"].includes(rawStatus) ? rawStatus : "all";
  const setStatusFilter = (s) => {
    const p = new URLSearchParams(searchParams);
    if (s === "all") p.delete("status");
    else p.set("status", s);
    setSearchParams(p, { replace: true });
  };
  const [searchQuery, setSearchQuery] = useState("");

  const [summaryPeriod, setSummaryPeriod] = useState(defaultSummaryPeriod);
  const [summarySearch, setSummarySearch] = useState("");

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchEmployees(); fetchAllLeaves(); fetchHolidays(); }, []);

  useEffect(() => {
    if (applyForm.leave_type === "compoff" && applyForm.user_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApplyForm((prev) => ({
      ...prev,
      days: (applyForm.start_date === applyForm.end_date && applyForm.half_day_type !== "full") ? 0.5 : total,
    }));
  }, [applyForm.start_date, applyForm.end_date, applyForm.half_day_type, applyForm.leave_type]);

  // ── COMPOFF HALF-SLOT GUARD ──────────────────────────────────────────────
  // One worked holiday = one full day OR first-half + second-half. If a slot is
  // already availed, keep the form on the remaining half and hide the used one.
  const compoffSlot = applyForm.leave_type === "compoff" && applyForm.compoff_date
    ? compoffEligible.find((h) => h.date_str === applyForm.compoff_date)
    : null;
  const compoffAvail = compoffSlot
    ? {
        full: !compoffSlot.first_taken && !compoffSlot.second_taken,
        first_half: !compoffSlot.first_taken,
        second_half: !compoffSlot.second_taken,
      }
    : { full: true, first_half: true, second_half: true };

  useEffect(() => {
    if (applyForm.leave_type !== "compoff" || !applyForm.compoff_date) return;
    const slot = compoffEligible.find((h) => h.date_str === applyForm.compoff_date);
    if (!slot) return;
    const avail = {
      full: !slot.first_taken && !slot.second_taken,
      first_half: !slot.first_taken,
      second_half: !slot.second_taken,
    };
    if (avail[applyForm.half_day_type]) return;
    const next = !avail.first_half ? "second_half" : !avail.second_half ? "first_half" : "full";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApplyForm((prev) => ({ ...prev, half_day_type: next }));
  }, [applyForm.leave_type, applyForm.compoff_date, applyForm.half_day_type, compoffEligible]);

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

  // ── DELETE (admin) ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/leaves/delete/${deleteTarget.id}?type=${deleteTarget.type}`);
      setDeleting(false);
      setShowDeleteConfirm(false);
      setShowModal(false);
      setDeleteTarget(null);
      fetchAllLeaves();
      alert("Record deleted successfully");
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting record");
      setDeleting(false);
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
        payload = { ...payload, from_date: applyForm.start_date, type: "compoff", comp_off_date: applyForm.compoff_date, days: applyForm.half_day_type !== "full" ? 0.5 : 1, half_day_type: applyForm.half_day_type, remarks: applyForm.reason || null };
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
  const generateSummary = async (period) => {
    const p = period || summaryPeriod;
    try {
      setSummaryLoading(true);
      // Same endpoint as Admin Dashboard → Employee Leave Summary (single source of truth)
      const res = await api.get("/leaves/employee-summary", { params: { from: p.from, to: p.to } });
      const result = (res.data || []).map((emp) => {
        const leavesUsed    = parseFloat(emp.leaves_used || 0);
        const compoffUsed   = parseFloat(emp.compoff_used || 0);
        const permUsed      = parseFloat(emp.permission_used || 0);
        const permAllocated = parseFloat(emp.permission_allocated || 0);
        const leaveBalance  = parseFloat(emp.leave_balance || 0);
        return {
          name:           emp.name,
          leaveTaken:     leavesUsed,
          compOff:        compoffUsed,
          permUsed:       permUsed,
          permAllocated:  permAllocated,
          permLeft:       Math.max(0, permAllocated - permUsed),
          holiday:        parseInt(emp.present_on_holiday || 0, 10),
          pending:        Number(emp.total_pending || 0),
          totalUsed:      leavesUsed + compoffUsed,
          remaining:      leaveBalance,
        };
      });
      setSummaryData(result);
      setSummarySearch("");
      setShowSummaryModal(true);
    } catch (err) {
      console.error(err);
      alert("Failed to load summary. Please try again.");
    } finally {
      setSummaryLoading(false);
    }
  };

  // ── CONFIG ─────────────────────────────────────────────────────────────────
  const typeConfig = useMemo(() => ({
    leave:      { label: "Leave",      color: "var(--primary)", bg: "var(--primary-soft)" },
    compoff:    { label: "Comp Off",   color: "var(--info)", bg: "var(--info-soft)" },
    permission: { label: "Permission", color: "var(--warning)", bg: "var(--warning-soft)" },
    present:    { label: "Present",    color: "var(--success)", bg: "var(--success-soft)" },
  }), []);

  const statusConfig = useMemo(() => ({
    approved: { label: "Approved", color: "var(--success)", bg: "var(--success-soft)" },
    pending:  { label: "Pending",  color: "var(--warning)", bg: "var(--warning-soft)" },
    rejected: { label: "Rejected", color: "var(--danger)", bg: "var(--danger-soft)" },
  }), []);

  // ── SORT (over status/search-filtered set) ─────────────────────────────────
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      if (statusFilter !== "all" && ev.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        ev.name, ev.email,
        typeConfig[ev.type]?.label, ev.type,
        statusConfig[ev.status]?.label, ev.status,
        ev.remarks, ev.holiday_name, ev.half_day_type, ev.slot,
        format(ev.start, "dd-MM-yyyy"), format(ev.end, "dd-MM-yyyy"),
        ev.comp_off_date ? fmtDate(ev.comp_off_date) : "",
        ev.hours ?? "",
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [events, statusFilter, searchQuery, typeConfig, statusConfig]);
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (sortField === "start" || sortField === "end") { valA = new Date(valA); valB = new Date(valB); }
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder(defaultSortOrderFor(field)); }
  };

  const countByStatus = (s) => events.filter((ev) => ev.status === s).length;
  const infolets = [
    { key: "all",       label: "Total",     value: events.length,           icon: "bi-inbox",          color: "var(--primary)", bg: "var(--primary-soft)" },
    { key: "pending",   label: "Pending",   value: countByStatus("pending"), icon: "bi-hourglass-split", color: "var(--warning)", bg: "var(--warning-soft)" },
    { key: "approved",  label: "Approved",  value: countByStatus("approved"), icon: "bi-check-circle",   color: "var(--success)", bg: "var(--success-soft)" },
    { key: "rejected",  label: "Rejected",  value: countByStatus("rejected"), icon: "bi-x-circle",       color: "var(--danger)",  bg: "var(--danger-soft)" },
  ];

  const handleSummaryPeriodChange = (p) => {
    setSummaryPeriod(p);
    generateSummary(p);
  };

  const summaryQuery = summarySearch.trim().toLowerCase();
  const visibleSummary = summaryQuery
    ? summaryData.filter((r) => (r.name || "").toLowerCase().includes(summaryQuery))
    : summaryData;
  const summaryTotals = visibleSummary.reduce(
    (acc, r) => ({
      leaveTaken: acc.leaveTaken + (r.leaveTaken || 0),
      compOff: acc.compOff + (r.compOff || 0),
      permUsed: acc.permUsed + (r.permUsed || 0),
      permAllocated: acc.permAllocated + (r.permAllocated || 0),
      holiday: acc.holiday + (r.holiday || 0),
      pending: acc.pending + (r.pending || 0),
      totalUsed: acc.totalUsed + (r.totalUsed || 0),
      remaining: acc.remaining + (r.remaining || 0),
    }),
    { leaveTaken: 0, compOff: 0, permUsed: 0, permAllocated: 0, holiday: 0, pending: 0, totalUsed: 0, remaining: 0 }
  );

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
          <button className="al-summary-btn" onClick={() => generateSummary()} disabled={summaryLoading}>
            <i className={`bi ${summaryLoading ? "bi-arrow-repeat al-spin" : "bi-bar-chart-line"}`} /> Summary
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

      {/* STATUS INFOLETS (click to filter) */}
      <div className="al-infolets">
        {infolets.map((it) => (
          <button
            key={it.key}
            className={`al-infolet ${statusFilter === it.key ? "al-infolet-active" : ""}`}
            onClick={() => setStatusFilter(it.key)}
            title={`Show ${it.label.toLowerCase()} requests`}
          >
            <span className="al-infolet-icon" style={{ color: it.color, background: it.bg }}>
              <i className={`bi ${it.icon}`} />
            </span>
            <span className="al-infolet-body">
              <span className="al-infolet-value">{it.value}</span>
              <span className="al-infolet-label">{it.label}</span>
            </span>
          </button>
        ))}
      </div>

      {/* MAIN CARD */}
      <div className="al-card">
        <div className="al-toolbar">
          <div className="al-view-toggle">
            <button className={`al-toggle-btn ${viewMode === "calendar" ? "active" : ""}`} onClick={() => setViewMode("calendar")}>
              <i className="bi bi-calendar3" /> Calendar
            </button>
            <button className={`al-toggle-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>
              <i className="bi bi-list-ul" /> List
            </button>
          </div>
          <div className="al-toolbar-right">
            <div className="al-search">
              <i className="bi bi-search" />
              <input
                type="text"
                placeholder="Search employee, type, reason, date…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="al-search-clear" title="Clear search" onClick={() => setSearchQuery("")}>
                  <i className="bi bi-x-lg" />
                </button>
              )}
            </div>
            <span className="al-count">{filteredEvents.length} record{filteredEvents.length === 1 ? "" : "s"}{statusFilter !== "all" && ` of ${events.length}`}</span>
          </div>
        </div>
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
            <div className="al-calendar-wrap">
            <Calendar
              selectable={false}
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 620 }}
              onSelectEvent={handleSelectEvent}
              tooltipAccessor={(ev) => `${ev.name} — ${ev.type.toUpperCase()} (${ev.status})${ev.half_day_type && ev.half_day_type !== "full" ? ` · ${ev.half_day_type === "first_half" ? "1st Half" : "2nd Half"}` : ""}`}
              eventPropGetter={() => ({
                style: { backgroundColor: "transparent", border: "none", padding: 0, margin: 0 },
              })}
              components={{
                event: ({ event }) => {
                  const s = statusConfig[event.status] || { color: "var(--t-muted)", bg: "var(--bg-muted)" };
                  const t = typeConfig[event.type] || {};
                  const half = (event.type === "leave" || event.type === "compoff") && event.half_day_type && event.half_day_type !== "full";
                  return (
                    <div className="al-cal-event">
                      <span className="al-cal-dot" style={{ background: s.color }} />
                      <span className="al-cal-name">{event.name}</span>
                      {half && (
                        <span
                          className="al-cal-half"
                          title={event.half_day_type === "first_half" ? "First Half" : "Second Half"}
                        >
                          ½
                        </span>
                      )}
                      <span className="al-cal-type" style={{ color: t.color, background: t.bg }}>
                        {event.type === "compoff" ? "CO" : event.type === "permission" ? "PM" : event.type === "present" ? "PR" : "LV"}
                      </span>
                    </div>
                  );
                },
              }}
            />
            </div>
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedEvents.length === 0 ? (
                  <tr><td colSpan={8} className="al-empty">
                    {events.length === 0
                      ? "No records found"
                      : `No records match${statusFilter !== "all" ? ` ${statusFilter}` : ""}${searchQuery ? ` “${searchQuery}”` : ""}`}
                  </td></tr>
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
                    <td className="al-date">
                      {format(ev.start, "dd-MM-yyyy")}
                      {ev.type === "compoff" && ev.comp_off_date && (
                        <span className="al-date-sub">Worked: {fmtDate(ev.comp_off_date)}</span>
                      )}
                    </td>
                    <td className="al-date">{format(ev.end, "dd-MM-yyyy")}</td>
                    <td>
                      <div className="al-days-cell">
                        <span className="al-days-main">
                          {ev.type === "permission" ? `${ev.hours || "-"}h`
                            : ev.type === "present" ? "Full Day"
                            : fmtDays(ev.days || 1)}
                        </span>
                        {(ev.type === "leave" || ev.type === "compoff") && ev.half_day_type && ev.half_day_type !== "full" && (
                          <span className="al-days-sub">
                            {ev.half_day_type === "first_half" ? "1st Half" : "2nd Half"}
                          </span>
                        )}
                        {ev.type === "permission" && ev.slot && (
                          <span className="al-days-sub" style={{ textTransform: "capitalize" }}>{ev.slot}</span>
                        )}
                      </div>
                    </td>
                    <td className="al-reason">{ev.remarks || <span className="al-muted">—</span>}</td>
                    <td>
                      <span className="al-status-pill" style={{ background: statusConfig[ev.status]?.bg, color: statusConfig[ev.status]?.color }}>
                        {statusConfig[ev.status]?.label || ev.status}
                      </span>
                    </td>
                    <td>
                      <div className="al-actions">
                        <button
                          className="al-action-btn al-action-view"
                          title="View & Manage"
                          onClick={(e) => { e.stopPropagation(); handleSelectEvent(ev); }}
                        >
                          <i className="bi bi-eye" />
                        </button>
                        {canDelete && (
                          <button
                            className="al-action-btn al-action-delete"
                            title="Delete"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(ev); setShowDeleteConfirm(true); }}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── VIEW / APPROVE MODAL ── */}
      {showModal && (
        <div className="ul-overlay" onClick={() => setShowModal(false)}>
          <div className="ul-modal ul-modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="ul-modal-header">
              <div className="ul-modal-header-left">
                {formData.status && (
                  <span className={`ul-badge ${formData.status === "approved" ? "ul-badge-success" : formData.status === "rejected" ? "ul-badge-danger" : "ul-badge-warning"}`}>
                    {statusConfig[formData.status]?.label}
                  </span>
                )}
                <div>
                  <h6 className="ul-modal-title">Request Details</h6>
                  <p className="ul-modal-sub">View and manage leave request</p>
                </div>
              </div>
              <button className="ul-modal-close" title="Close" onClick={() => setShowModal(false)}><i className="bi bi-x-lg" /></button>
            </div>

            <div className="ul-modal-divider" />

            <div className="ul-modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Employee</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary)", color: "var(--on-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{formData.name?.charAt(0).toUpperCase()}</div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{formData.name}</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Type</span>
                  <div style={{ marginTop: 4 }}>
                    <span className={`ul-badge ${formData.type === "leave" ? "ul-badge-danger" : formData.type === "permission" ? "ul-badge-warning" : formData.type === "compoff" ? "ul-badge-primary" : "ul-badge-success"}`}>
                      <i className={`bi ${formData.type === "permission" ? "bi-clock" : formData.type === "compoff" ? "bi-arrow-left-right" : formData.type === "present" ? "bi-person-check" : "bi-calendar-x"}`} />
                      {typeConfig[formData.type]?.label || formData.type}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Date</span>
                  <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 13 }}>{fmtDate(formData.start_date)}</p>
                </div>
                {formData.type === "leave" && (
                  <>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>To</span>
                      <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 13 }}>{fmtDate(formData.end_date)}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Days</span>
                      <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 13 }}>{fmtDays(formData.days || 1)}</p>
                    </div>
                    {formData.half_day_type && formData.half_day_type !== "full" && (
                      <div>
                        <span style={{ fontSize: 11, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Duration</span>
                        <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 13 }}>
                          {formData.half_day_type === "first_half" ? "First Half" : "Second Half"}
                        </p>
                      </div>
                    )}
                  </>
                )}
                {formData.type === "permission" && (
                  <>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Hours</span>
                      <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 13 }}>{formData.hours}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Slot</span>
                      <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 13, textTransform: "capitalize" }}>{formData.slot}</p>
                    </div>
                  </>
                )}
                {formData.type === "compoff" && (
                  <>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Holiday Worked</span>
                      <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 13 }}>{fmtDate(formData.compoff_date)}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Duration</span>
                      <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 13 }}>
                        {formData.half_day_type === "first_half" ? "1st Half" : formData.half_day_type === "second_half" ? "2nd Half" : "Full Day"}
                      </p>
                    </div>
                  </>
                )}
                {formData.type === "present" && formData.holiday_name && (
                  <div>
                    <span style={{ fontSize: 11, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Holiday</span>
                    <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 13 }}>{formData.holiday_name}</p>
                  </div>
                )}
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ fontSize: 11, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Reason</span>
                  <p style={{ margin: "4px 0 0", fontSize: 13 }}>{formData.reason || <span style={{ color: "var(--t-muted)" }}>—</span>}</p>
                </div>
              </div>
            </div>

            <div className="ul-modal-divider" />

            <div className="ul-modal-footer">
              {canDelete ? (
                <button className="ul-btn ul-btn-danger" onClick={() => { setDeleteTarget(formData); setShowDeleteConfirm(true); }} disabled={loading}>
                  <i className="bi bi-trash" /> Delete
                </button>
              ) : <span />}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="ul-btn ul-btn-ghost" onClick={() => setShowModal(false)}>Close</button>
                {formData.status === "pending" && (
                  <>
                    <button className="ul-btn ul-btn-danger" onClick={() => handleUpdateStatus("rejected")} disabled={loading}>
                      <i className="bi bi-x-circle" /> {loading ? "…" : "Reject"}
                    </button>
                    <button className="ul-btn ul-btn-success" onClick={() => handleUpdateStatus("approved")} disabled={loading}>
                      <i className="bi bi-check-circle" /> {loading ? "…" : "Approve"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── APPLY LEAVE MODAL ── */}
      {showApplyModal && (
        <div className="ul-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="ul-modal ul-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="ul-modal-header">
              <div className="ul-modal-header-left">
                <div className="ul-modal-icon ul-modal-icon-primary"><i className="bi bi-calendar-plus" /></div>
                <div>
                  <h6 className="ul-modal-title">Apply Leave on Behalf</h6>
                  <p className="ul-modal-sub">Submit a leave request for an employee</p>
                </div>
              </div>
              <button className="ul-modal-close" title="Close" onClick={() => setShowApplyModal(false)}><i className="bi bi-x-lg" /></button>
            </div>

            <div className="ul-modal-divider" />

              <div className="ul-modal-body">
                {/* Employee */}
                <div className="al-field">
                  <label className="al-label">Employee</label>
                  <SharedSelect
                    value={applyForm.user_id}
                    onChange={(val) => setApplyForm({ ...applyForm, user_id: val })}
                    options={employees.map((emp) => ({ value: emp.id, label: emp.name }))}
                    placeholder="— Select Employee —"
                  />
                </div>

                {/* Request Type — dropdown */}
                <div className="al-field">
                  <label className="al-label">Request Type</label>
                  <SharedSelect
                    value={applyForm.leave_type}
                    onChange={(val) => setApplyForm({ ...applyForm, leave_type: val, start_date: "", end_date: "", compoff_date: "", half_day_type: "full" })}
                    options={Object.entries(typeConfig).map(([key, cfg]) => ({ value: key, label: cfg.label }))}
                    placeholder="Select request type…"
                  />
                </div>

                {/* ── LEAVE ── */}
                {applyForm.leave_type === "leave" && (
                  <>
                    <div className="al-row-2">
                      <div className="al-field">
                        <label className="al-label">Start Date</label>
                        <SharedDatePicker
                          value={applyForm.start_date}
                          onChange={(val) => setApplyForm({ ...applyForm, start_date: val })}
                          className="al-input"
                        />
                      </div>
                      <div className="al-field">
                        <label className="al-label">End Date</label>
                        <SharedDatePicker
                          value={applyForm.end_date}
                          onChange={(val) => setApplyForm({ ...applyForm, end_date: val })}
                          className="al-input"
                        />
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
                      <SharedDatePicker
                        value={applyForm.start_date}
                        onChange={(val) => setApplyForm({ ...applyForm, start_date: val })}
                        className="al-input"
                      />
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
                        <SharedSelect
                          value={applyForm.compoff_date}
                          onChange={(val) => setApplyForm({ ...applyForm, compoff_date: val })}
                          options={compoffEligible.map((h) => ({
                            value: h.date_str,
                            label: `${h.holiday_name} — ${fmtDate(h.date_str)}${h.first_taken ? " · 2nd half only" : h.second_taken ? " · 1st half only" : ""}`,
                          }))}
                          placeholder="— Select Holiday Worked —"
                        />
                      )}
                    </div>
                    <div className="al-field">
                      <label className="al-label">Duration</label>
                      <div className="al-radio-group">
                        {[["full", "Full Day"], ["first_half", "1st Half"], ["second_half", "2nd Half"]].map(([val, lbl]) => {
                          const unavailable = !compoffAvail[val];
                          return (
                            <label key={val} className={`al-radio-btn ${applyForm.half_day_type === val ? "active" : ""}${unavailable ? " disabled" : ""}`}>
                              <input type="radio" name="compoff_half" value={val} checked={applyForm.half_day_type === val}
                                disabled={unavailable}
                                title={unavailable ? "Already availed for this holiday" : ""}
                                onChange={(e) => setApplyForm({ ...applyForm, half_day_type: e.target.value })} />
                              {lbl}
                            </label>
                          );
                        })}
                      </div>
                      {compoffSlot && !compoffAvail.full && (
                        <p className="al-hint-text">
                          <i className="bi bi-exclamation-circle" />
                          {!compoffAvail.first_half
                            ? "1st half already availed for this holiday — only 2nd half is available."
                            : "2nd half already availed for this holiday — only 1st half is available."}
                        </p>
                      )}
                      {applyForm.half_day_type !== "full" && (
                        <p className="al-hint-text"><i className="bi bi-info-circle" /> Half day comp off consumes 0.5 day.</p>
                      )}
                    </div>
                  </>
                )}

                {/* ── PERMISSION ── */}
                {applyForm.leave_type === "permission" && (
                  <>
                    <div className="al-field">
                      <label className="al-label">Date</label>
                      <SharedDatePicker
                        value={applyForm.start_date}
                        onChange={(val) => setApplyForm({ ...applyForm, start_date: val })}
                        className="al-input"
                      />
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

              <div className="ul-modal-footer">
                <button className="ul-btn ul-btn-ghost" onClick={() => setShowApplyModal(false)}>Cancel</button>
                <button className="ul-btn ul-btn-primary" onClick={handleApplyLeave} disabled={applyLoading}>
                  {applyLoading
                    ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Submitting…</>
                    : <><i className="bi bi-send" /> Submit</>}
                </button>
              </div>
            </div>
          </div>
      )}

      {/* ── SUMMARY MODAL ── */}
      {showSummaryModal && (
        <div className="ul-overlay" onClick={() => setShowSummaryModal(false)}>
          <div className="ul-modal ul-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="ul-modal-header">
              <div className="ul-modal-header-left">
                <div className="ul-modal-icon ul-modal-icon-primary"><i className="bi bi-bar-chart" /></div>
                <div>
                  <h6 className="ul-modal-title">Employee Leave Summary</h6>
                  <p className="ul-modal-sub">
                    {summaryPeriod.mode === "fy" ? "Financial Year" : "Date Range"} {fmtDate(summaryPeriod.from)} – {fmtDate(summaryPeriod.to)}
                  </p>
                </div>
              </div>
              <button className="ul-modal-close" title="Close" onClick={() => setShowSummaryModal(false)}><i className="bi bi-x-lg" /></button>
            </div>

            <div className="ul-modal-divider" />

            <div className="ul-modal-body">
              <div className="al-summary-filter">
                <SummaryPeriodFilter value={summaryPeriod} onChange={handleSummaryPeriodChange} />
                <div className="al-summary-search">
                  <i className="bi bi-search" />
                  <input
                    type="text"
                    placeholder="Search employee…"
                    value={summarySearch}
                    onChange={(e) => setSummarySearch(e.target.value)}
                  />
                  {summarySearch && (
                    <button className="al-summary-search-clear" title="Clear search" onClick={() => setSummarySearch("")}>
                      <i className="bi bi-x-lg" />
                    </button>
                  )}
                </div>
                <span className="al-summary-count">
                  {visibleSummary.length}{visibleSummary.length !== summaryData.length && ` of ${summaryData.length}`} employees
                </span>
              </div>
              {summaryLoading ? (
                <div className="al-summary-loading"><i className="bi bi-arrow-repeat al-spin" /> Loading summary…</div>
              ) : (
              <div className="ul-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th><th>Leaves (days)</th><th>Comp Off (days)</th>
                      <th>Permission (hrs)</th><th>Holiday (days)</th>
                      <th>Total Used (days)</th><th>Pending</th><th>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSummary.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--t-muted)" }}>
                        {summaryData.length > 0 ? `No results for “${summarySearch}”` : "No data available for this period"}
                      </td></tr>
                    ) : visibleSummary.map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)", color: "var(--on-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>{row.name?.charAt(0).toUpperCase()}</div>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{row.name}</span>
                          </div>
                        </td>
                        <td>{fmtNum(row.leaveTaken)}</td>
                        <td>{fmtNum(row.compOff)}</td>
                        <td>{fmtNum(row.permUsed)} / {fmtNum(row.permAllocated)}</td>
                        <td>{row.holiday}</td>
                        <td><strong>{fmtNum(row.totalUsed)}</strong></td>
                        <td>
                          {row.pending > 0
                            ? <span className="al-pending-chip">{row.pending} pending</span>
                            : <span style={{ color: "var(--t-muted)" }}>—</span>}
                        </td>
                        <td>
                          <span className={`ul-badge ${Number(row.remaining) < 5 ? "ul-badge-danger" : "ul-badge-success"}`}>
                            {fmtNum(row.remaining)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {visibleSummary.length > 0 && (
                    <tfoot>
                      <tr className="al-summary-total-row">
                        <td>Total ({visibleSummary.length})</td>
                        <td>{fmtNum(summaryTotals.leaveTaken)}</td>
                        <td>{fmtNum(summaryTotals.compOff)}</td>
                        <td>{fmtNum(summaryTotals.permUsed)} / {fmtNum(summaryTotals.permAllocated)}</td>
                        <td>{summaryTotals.holiday}</td>
                        <td><strong>{fmtNum(summaryTotals.totalUsed)}</strong></td>
                        <td>{summaryTotals.pending}</td>
                        <td>{fmtNum(summaryTotals.remaining)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              )}
            </div>

            <div className="ul-modal-divider" />

            <div className="ul-modal-footer">
              <button className="ul-btn ul-btn-ghost" onClick={() => setShowSummaryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* ── DELETE CONFIRM MODAL ── */}
      {showDeleteConfirm && deleteTarget && (
        <div className="ul-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="ul-modal ul-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="ul-modal-icon ul-modal-icon-danger">
              <i className="bi bi-trash" />
            </div>
            <h6 className="ul-modal-title">Confirm Delete</h6>
            <p className="ul-modal-sub">
              Are you sure you want to delete this {deleteTarget.type} request for {deleteTarget.name}? This action cannot be undone.
            </p>
            <div className="ul-modal-divider" />
            <div className="ul-modal-footer">
              <button className="ul-btn ul-btn-ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="ul-btn ul-btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting
                  ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Deleting…</>
                  : <><i className="bi bi-trash" /> Delete</>}
              </button>
            </div>
          </div>
        </div>
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
  .al-page-title { font-size:24px; font-weight:800; color:var(--t-base); margin:0; letter-spacing:-0.02em; }
  .al-breadcrumb { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--t-muted); margin-top:6px; }

  /* ── status infolets ── */
  .al-infolets { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-bottom:20px; }
  .al-infolet {
    display:flex; align-items:center; gap:12px; padding:14px 16px;
    background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius);
    cursor:pointer; font-family:var(--font); text-align:left; transition:all 0.15s;
  }
  .al-infolet:hover { border-color:var(--primary); transform:translateY(-2px); box-shadow:var(--shadow-sm); }
  .al-infolet-active { border-color:var(--primary); background:var(--primary-soft); box-shadow:0 0 0 2px var(--primary-soft); }
  .al-infolet-icon {
    display:flex; align-items:center; justify-content:center;
    width:40px; height:40px; border-radius:var(--radius); font-size:18px; flex-shrink:0;
  }
  .al-infolet-body { display:flex; flex-direction:column; min-width:0; }
  .al-infolet-value { font-size:20px; font-weight:800; color:var(--t-base); line-height:1.1; }
  .al-infolet-label { font-size:11.5px; font-weight:600; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.4px; }
  @media (max-width: 768px) { .al-infolets { grid-template-columns:repeat(2, 1fr); } }

  /* ── calendar half-day badge ── */
  .al-cal-half {
    display:inline-flex; align-items:center; justify-content:center;
    min-width:16px; height:16px; padding:0 4px; border-radius:8px;
    background:var(--warning); color:#fff; font-size:10px; font-weight:800; line-height:1;
  }

  /* ── list: comp-off worked date ── */
  .al-date-sub { display:block; font-size:10px; color:var(--t-muted); margin-top:2px; white-space:nowrap; }

  /* ── summary modal period filter ── */
  .al-summary-filter { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
  .al-summary-search {
    display: flex; align-items: center; gap: 7px;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 20px; padding: 6px 12px; min-width: 170px; flex: 1; max-width: 260px;
    transition: border-color 0.15s;
  }
  .al-summary-search:focus-within { border-color: var(--primary); }
  .al-summary-search > i { font-size: 11px; color: var(--t-muted); }
  .al-summary-search input {
    flex: 1; min-width: 0; border: none; outline: none; background: transparent;
    font-family: var(--font); font-size: 12.5px; color: var(--t-base);
  }
  .al-summary-search input::placeholder { color: var(--t-muted); }
  .al-summary-search-clear {
    display: flex; align-items: center; justify-content: center; border: none; background: var(--bg-muted);
    color: var(--t-muted); width: 16px; height: 16px; border-radius: 50%; font-size: 8px; cursor: pointer; padding: 0;
  }
  .al-summary-search-clear:hover { background: var(--danger-soft); color: var(--danger); }
  .al-summary-count {
    font-size: 12px; font-weight: 600; color: var(--t-muted);
    background: var(--bg-card); box-shadow: var(--shadow-sm);
    border-radius: 20px; padding: 4px 11px; white-space: nowrap;
  }
  .al-summary-loading {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 36px 16px; font-size: 13px; color: var(--t-muted);
  }
  .al-pending-chip {
    display: inline-block; font-size: 11px; font-weight: 700;
    background: var(--warning-soft); color: var(--warning);
    border-radius: 20px; padding: 2px 9px; white-space: nowrap;
  }
  .al-summary-total-row td {
    background: var(--bg-muted); font-weight: 700; font-size: 12.5px;
    border-top: 2px solid var(--border); white-space: nowrap;
  }
  .al-breadcrumb a { color:var(--primary); text-decoration:none; font-weight:500; }
  .al-breadcrumb a:hover { text-decoration:underline; }
  .al-breadcrumb i { font-size:10px; opacity:0.5; }
  .al-header-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .al-view-toggle { display:flex; background:var(--bg-muted); border-radius:var(--radius); padding:3px; gap:4px; }
  .al-toggle-btn { display:flex; align-items:center; gap:6px; padding:6px 14px; border:none; border-radius:6px; font-size:12.5px; font-weight:600; color:var(--t-muted); background:transparent; cursor:pointer; transition:all 0.15s; font-family:var(--font); }
  .al-toggle-btn.active { background:var(--primary); color: var(--on-primary); box-shadow:var(--shadow-sm); }
  .al-toggle-btn:hover:not(.active) { color:var(--primary); background:var(--bg-hover); }
  .al-apply-btn, .al-summary-btn { display:flex; align-items:center; gap:7px; padding:9px 18px; border:none; border-radius:var(--radius); font-size:13px; font-weight:600; cursor:pointer; transition:background 0.15s,transform 0.15s; letter-spacing:0.01em; font-family:var(--font); }
  .al-apply-btn { background:var(--primary); color: var(--on-primary); }
  .al-apply-btn:hover { background:var(--primary-dark); transform:translateY(-1px); }
  .al-summary-btn { background:var(--bg-muted); color:var(--t-muted); }
  .al-summary-btn:hover { background:var(--bg-card); color:var(--t-base); }
  /* Card — module-wise layout (full-bleed card + toolbar strip) */
  .al-card { background:var(--bg-card); border-radius:var(--radius-lg); box-shadow:var(--shadow-card), 0 24px 60px -30px rgba(15, 23, 42, 0.20); overflow:hidden; }
  .al-toolbar { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-bottom:1px solid var(--border-soft); gap:12px; flex-wrap:wrap; }
  .al-toolbar-right { display:flex; align-items:center; gap:12px; margin-left:auto; flex-wrap:wrap; }
  .al-search {
    display:flex; align-items:center; gap:7px; min-width:240px;
    background:var(--bg-card); border:1px solid var(--border); border-radius:20px;
    padding:6px 12px; box-shadow:var(--shadow-sm); transition:border-color 0.15s;
  }
  .al-search:focus-within { border-color:var(--primary); }
  .al-search i { font-size:12px; color:var(--t-muted); }
  .al-search input {
    flex:1; min-width:0; border:none; outline:none; background:transparent;
    font-family:var(--font); font-size:12.5px; color:var(--t-base);
  }
  .al-search input::placeholder { color:var(--t-muted); }
  .al-search-clear {
    display:flex; align-items:center; justify-content:center; border:none; background:var(--bg-muted);
    color:var(--t-muted); width:16px; height:16px; border-radius:50%; font-size:9px; cursor:pointer; padding:0;
  }
  .al-search-clear:hover { background:var(--danger-soft); color:var(--danger); }
  @media (max-width: 768px) { .al-search { min-width:160px; flex:1; } }
  .al-count { font-size:12px; font-weight:600; color:var(--t-muted); background:var(--bg-card); box-shadow:var(--shadow-sm); border-radius:20px; padding:3px 10px; white-space:nowrap; }
  .al-calendar-wrap { padding:14px 20px 20px; }
  /* ── legend ── */
  .al-legend { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:1px solid var(--border-soft); flex-wrap:wrap; }
  .al-legend-item { display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--t-muted); font-weight:500; }
  .al-legend-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
  .al-legend-sep { flex:1; }
  .al-legend-hint { font-size:11.5px; color:var(--t-muted); display:flex; align-items:center; gap:5px; }
  /* ── calendar events ── */
  .al-cal-event { display:flex; align-items:center; gap:4px; padding:1px 2px; overflow:hidden; }
  .al-cal-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .al-cal-name { font-size:11.5px; font-weight:600; color:var(--t-base); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; }
  .al-cal-type { font-size:9px; font-weight:800; padding:1px 5px; border-radius:4px; flex-shrink:0; letter-spacing:0.04em; }
  /* ── rbc overrides ── */
  .rbc-calendar { font-family:var(--font) !important; }
  .rbc-toolbar button { border-radius:var(--radius) !important; font-size:12.5px !important; font-weight:600 !important; color:var(--t-muted) !important; border-color:transparent !important; background:var(--bg-muted) !important; }
  .rbc-toolbar button.rbc-active, .rbc-toolbar button:hover { background:var(--primary-soft) !important; color:var(--primary) !important; border-color:transparent !important; box-shadow:none !important; }
  .rbc-toolbar-label { font-size:14px !important; font-weight:700 !important; color:var(--t-base) !important; }
  .rbc-header { font-size:11px !important; font-weight:700 !important; color:var(--t-muted) !important; text-transform:uppercase !important; letter-spacing:0.06em !important; padding:8px 0 !important; border-color:var(--border-soft) !important; }
  .rbc-today { background:var(--primary-soft) !important; }
  .rbc-off-range-bg { background:var(--bg-muted) !important; }
  .rbc-date-cell { font-size:12px !important; color:var(--t-muted) !important; font-weight:500 !important; }
  .rbc-date-cell.rbc-now a { color:var(--primary) !important; font-weight:700 !important; }
  .rbc-month-row, .rbc-month-view, .rbc-day-bg, .rbc-header { border-color:var(--border-soft) !important; }
  /* ── table ── */
  .al-table-wrap { overflow-x:auto; }
  .al-table { width:100%; border-collapse:collapse; font-size:13px; }
  .al-table thead tr { border-bottom:1px solid var(--border-soft); }
  .al-table th { padding:10px 14px; font-size:10.5px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.06em; text-align:left; white-space:nowrap; background:var(--bg-card); }
  .al-th-sortable { cursor:pointer; user-select:none; }
  .al-th-sortable:hover { color:var(--primary); }
  .al-sort-icon { margin-left:4px; font-size:9px; }
  .al-table td { padding:11px 14px; border-bottom:1px solid var(--border-soft); vertical-align:middle; color:var(--t-base); }
  .al-tr { cursor:pointer; transition:background 0.1s; }
  .al-tr:hover td { background:var(--bg-hover); }
  .al-tr:last-child td { border-bottom:none; }
  .al-empty { text-align:center; color:var(--t-muted); padding:32px; }
  /* ── action buttons (module-wise) ── */
  .al-actions { display:flex; align-items:center; gap:6px; }
  .al-action-btn { width:30px; height:30px; border:none; border-radius:var(--radius); display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px; transition:all 0.15s; }
  .al-action-view { background:var(--primary-soft); color:var(--primary); }
  .al-action-view:hover { background:var(--primary); color: var(--on-primary); }
  .al-action-delete { background:var(--danger-soft); color:var(--danger); }
  .al-action-delete:hover { background:var(--danger); color:#fff; }
  .al-days-cell { display:flex; flex-direction:column; gap:2px; }
  .al-days-main { font-size:13px; font-weight:600; color:var(--t-base); }
  .al-days-sub { font-size:10.5px; font-weight:600; color:var(--warning); }
  /* ── shared atoms ── */
  .al-emp-cell { display:flex; align-items:center; gap:9px; }
  .al-avatar { width:30px; height:30px; border-radius:50%; background:var(--primary-soft); color:var(--primary); font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .al-avatar-lg { width:36px; height:36px; font-size:14px; }
  .al-date { font-size:12.5px; color:var(--t-muted); font-variant-numeric:tabular-nums; }
  .al-reason { max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--t-muted); }
  .al-muted { color:var(--t-muted); }
  .al-type-pill { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:700; padding:3px 10px; border-radius:20px; white-space:nowrap; }
  .al-status-pill { display:inline-block; font-size:10.5px; font-weight:700; padding:2px 9px; border-radius:20px; letter-spacing:0.04em; width:fit-content; }
  /* ── modal ── */
  .ul-modal { border:none; box-shadow:var(--shadow-card), 0 24px 60px -30px rgba(15, 23, 42, 0.20); }
  .al-modal-overlay { position:fixed; inset:0; background:rgba(17,24,39,0.45); backdrop-filter:blur(2px); z-index:200; }
  .al-modal-wrap { position:fixed; inset:0; z-index:201; display:flex; align-items:center; justify-content:center; padding:16px; pointer-events:none; }
  .al-modal { width:80%; max-width:720px; max-height:calc(100vh - 32px); background:var(--bg-card); border-radius:var(--radius-lg); box-shadow:var(--shadow-card), 0 24px 60px -30px rgba(15, 23, 42, 0.20); display:flex; flex-direction:column; overflow:hidden; pointer-events:all; animation:al-modal-center-in 0.22s ease; }
  .al-modal-lg { max-width:720px; }
  @keyframes al-modal-center-in { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
  .al-modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 20px 16px; border-bottom:1px solid var(--border-soft); flex-shrink:0; }
  .al-modal-header-left { display:flex; flex-direction:column; gap:5px; }
  .al-modal-title { font-size:14px; font-weight:700; color:var(--t-base); margin:0; letter-spacing:-0.01em; }
  .al-modal-close { width:30px; height:30px; border-radius:var(--radius); background:var(--bg-muted); display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--t-muted); font-size:13px; transition:all 0.15s; flex-shrink:0; }
  .al-modal-close:hover { background: var(--danger-soft); color: var(--danger); }
  .al-modal-body { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px; }
  .al-modal-body::-webkit-scrollbar { width:4px; }
  .al-modal-body::-webkit-scrollbar-track { background:transparent; }
  .al-modal-body::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
  .al-modal-footer { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-top:1px solid var(--border-soft); flex-shrink:0; gap:8px; }
  .al-footer-right { display:flex; gap:8px; margin-left:auto; }
  /* ── detail rows ── */
  .al-detail-grid { display:flex; flex-direction:column; gap:0; }
  .al-detail-row { display:flex; align-items:center; justify-content:space-between; padding:11px 0; border-bottom:1px solid var(--border-soft); gap:12px; }
  .al-detail-row:last-child { border-bottom:none; }
  .al-detail-label { font-size:11.5px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.05em; flex-shrink:0; }
  .al-detail-value { font-size:13px; font-weight:500; color:var(--t-base); text-align:right; }
  .al-detail-emp { display:flex; align-items:center; gap:9px; }
  /* ── form ── */
  .al-field { display:flex; flex-direction:column; gap:6px; }
  .al-row-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .al-label { font-size:11.5px; font-weight:700; color:var(--t-muted); letter-spacing:0.04em; text-transform:uppercase; display:flex; align-items:center; gap:5px; }
  .al-label-hint { font-size:10.5px; font-weight:500; color:var(--t-muted); text-transform:none; letter-spacing:0; }
  .al-input, .al-textarea { width:100%; padding:10px 12px; border:none; border-radius:var(--radius); background:var(--bg-muted); font-size:14px; color:var(--t-base); font-family:var(--font); transition:box-shadow 0.15s; outline:none; box-sizing:border-box; }
  .al-input:focus, .al-textarea:focus { box-shadow:0 0 0 3px var(--primary-ring); }
  .al-textarea { resize:none; line-height:1.5; }
  .al-radio-group { display:flex; gap:8px; flex-wrap:wrap; }
  .al-radio-btn { display:flex; align-items:center; gap:6px; padding:7px 12px; border-radius:var(--radius); background:var(--bg-muted); font-size:12.5px; font-weight:500; color:var(--t-muted); cursor:pointer; transition:all 0.15s; user-select:none; }
  .al-radio-btn:has(input:disabled) { opacity:0.5; cursor:default; }
  .al-radio-btn input[type="radio"] { display:none; }
  .al-radio-btn.active { background:var(--primary-light); color:var(--primary); font-weight:600; }
  .al-days-display { display:flex; align-items:center; gap:8px; padding:9px 12px; background:var(--primary-light); border-radius:var(--radius); font-size:13px; font-weight:700; color:var(--primary); }
  /* ── buttons ── */
  .al-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:var(--radius); font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s; border:1px solid transparent; font-family:var(--font); white-space:nowrap; }
  .al-btn:disabled { opacity:0.6; cursor:not-allowed; }
  .al-btn-primary { background:var(--primary); color: var(--on-primary); }
  .al-btn-primary:hover:not(:disabled) { background:var(--primary-dark); }
  .al-btn-ghost { background:var(--bg-muted); border-color:transparent; color:var(--t-muted); }
  .al-btn-ghost:hover { background:var(--bg); }
  .al-btn-success { background:var(--success-soft); color:var(--success); }
  .al-btn-success:hover:not(:disabled) { background:var(--success); color:#fff; }
  .al-btn-danger { background:var(--danger-soft); color:var(--danger); }
  .al-btn-danger:hover:not(:disabled) { background:var(--danger); color:#fff; }
  /* ── misc ── */
  .al-spin { animation:al-spin 0.7s linear infinite; display:inline-block; }
  @keyframes al-spin { to { transform:rotate(360deg); } }
  .al-info-text { font-size:12.5px; color:var(--t-muted); margin:0; display:flex; align-items:center; gap:6px; }
  .al-hint-text { font-size:11.5px; color:var(--info); margin:0; display:flex; align-items:center; gap:5px; background:var(--info-soft); padding:8px 10px; border-radius:var(--radius); }
  .al-empty-compoff { display:flex; align-items:flex-start; gap:10px; padding:12px; background:var(--warning-soft); border-radius:var(--radius); font-size:12.5px; color:var(--warning); line-height:1.5; }
  .al-empty-compoff i { font-size:16px; margin-top:1px; flex-shrink:0; color:var(--warning); }

  /* ════════════════════════════════════════════════
     HOLIDAY CALENDAR PICKER
  ════════════════════════════════════════════════ */
  .hcp-root { display:flex; flex-direction:column; gap:10px; border-radius:var(--radius-lg); padding:14px; background:var(--bg); box-shadow:var(--shadow-card), 0 24px 60px -30px rgba(15, 23, 42, 0.20); }
  /* nav */
  .hcp-nav { display:flex; align-items:center; justify-content:space-between; }
  .hcp-nav-btn { width:28px; height:28px; border-radius:var(--radius); background:var(--bg-muted); color:var(--t-muted); font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; flex-shrink:0; }
  .hcp-nav-btn:hover { background:var(--primary-light); color:var(--primary); }
  .hcp-month-label { font-size:13px; font-weight:700; color:var(--t-base); }
  /* grid */
  .hcp-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
  .hcp-weekday { font-size:9.5px; font-weight:700; color:var(--t-muted); text-align:center; padding:5px 0 3px; text-transform:uppercase; letter-spacing:0.05em; }
  .hcp-day { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; height:34px; border-radius:var(--radius); font-size:12px; font-weight:500; transition:all 0.12s; user-select:none; }
  .hcp-blank { background:transparent !important; }
  .hcp-normal { color:var(--t-muted); }
  .hcp-regular-weekend { color:#d1d5db; }
  .hcp-selectable { cursor:pointer; }
  /* holiday = red tint */
  .hcp-holiday { background:var(--danger-soft); color:var(--danger); font-weight:700; }
  .hcp-holiday.hcp-selectable:hover { background:var(--danger); color:#fff; }
  /* special weekend = amber tint */
  .hcp-special-weekend { background:var(--warning-soft); color:var(--warning); font-weight:700; }
  .hcp-special-weekend.hcp-selectable:hover { background:var(--warning); color:#fff; }
  /* selected ring */
  .hcp-selected.hcp-holiday { background:var(--danger) !important; color:#fff !important; outline:2.5px solid var(--danger); outline-offset:2px; }
  .hcp-selected.hcp-special-weekend { background:var(--warning) !important; color:#fff !important; outline:2.5px solid var(--warning); outline-offset:2px; }
  /* today underline */
  .hcp-today .hcp-day-num { text-decoration:underline; text-underline-offset:2px; }
  .hcp-day-num { position:relative; line-height:1; }
  /* dots */
  .hcp-dot { width:4px; height:4px; border-radius:50%; position:absolute; bottom:3px; }
  .hcp-dot-holiday { background:var(--danger); }
  .hcp-dot-sw { background:var(--warning); }
  /* selected banner */
  .hcp-selected-info { display:flex; align-items:center; gap:8px; padding:8px 11px; background:var(--primary-light); border-radius:var(--radius); font-size:12.5px; color:var(--primary); }
  .hcp-selected-info i { font-size:13px; flex-shrink:0; }
  .hcp-selected-info span { flex:1; line-height:1.4; }
  .hcp-clear { width:20px; height:20px; border:none; background:transparent; color:var(--primary); cursor:pointer; display:flex; align-items:center; justify-content:center; border-radius:4px; font-size:15px; opacity:0.65; padding:0; }
  .hcp-clear:hover { opacity:1; background:color-mix(in srgb, var(--primary) 12%, transparent); }
  /* selectable list */
  .hcp-list { border-radius:var(--radius); overflow:hidden; background:var(--bg-card); box-shadow:var(--shadow-card), 0 24px 60px -30px rgba(15, 23, 42, 0.20); }
  .hcp-list-title { font-size:10px; font-weight:700; color:var(--t-muted); text-transform:uppercase; letter-spacing:0.07em; padding:7px 10px; display:flex; align-items:center; gap:5px; background:var(--bg-muted); }
  .hcp-list-items { display:flex; flex-direction:column; max-height:150px; overflow-y:auto; }
  .hcp-list-items::-webkit-scrollbar { width:3px; }
  .hcp-list-items::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
  .hcp-list-item { display:flex; align-items:center; gap:8px; padding:7px 10px; border:none; background:transparent; text-align:left; cursor:pointer; font-family:var(--font); font-size:12px; transition:background 0.1s; border-bottom:1px solid var(--border-soft); }
  .hcp-list-item:last-child { border-bottom:none; }
  .hcp-list-item:hover { background:var(--bg); }
  .hcp-list-selected { background:var(--bg) !important; }
  .hcp-list-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .hcp-list-date { font-weight:700; white-space:nowrap; min-width:88px; }
  .hcp-list-holiday .hcp-list-date { color:var(--danger); }
  .hcp-list-sw .hcp-list-date { color:var(--warning); }
  .hcp-list-name { flex:1; color:var(--t-muted); font-size:11.5px; }
  .hcp-list-check { color:var(--primary); font-size:13px; flex-shrink:0; }
  /* no dates */
  .hcp-empty-month { font-size:12px; color:var(--t-muted); text-align:center; padding:10px; display:flex; align-items:center; justify-content:center; gap:6px; }
  /* legend */
  .hcp-legend { display:flex; gap:14px; flex-wrap:wrap; padding-top:2px; }
  .hcp-legend-item { display:flex; align-items:center; gap:5px; font-size:10.5px; color:var(--t-muted); }
  .hcp-legend-item .hcp-dot { position:static; width:7px; height:7px; }
`;
