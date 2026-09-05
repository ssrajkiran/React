import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";
import SharedDatePicker from "../../components/SharedDatePicker";
import SharedSelect from "../../components/SharedSelect";
import TimesheetDetailModal from "../../components/modals/TimesheetDetailModal";

// ── Helper: normalize any date value to "YYYY-MM-DD" (IST-safe) ──
const toDateStr = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

// ── AM/PM helpers ──
const to12h = (h24) => {
  if (!h24) return { h: 12, m: 0, ap: "AM" };
  const [hh, mm] = h24.split(":").map(Number);
  const ap = hh >= 12 ? "PM" : "AM";
  const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return { h: h12, m: mm || 0, ap };
};

const to24h = (h12, m, ap) => {
  let hh = Number(h12);
  if (ap === "AM" && hh === 12) hh = 0;
  else if (ap === "PM" && hh !== 12) hh += 12;
  return `${String(hh).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
};

const formatAMPM = (time24) => {
  if (!time24) return "";
  const { h, m, ap } = to12h(time24.substring(0, 5));
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
};

// ── Human-readable hours: 1.5 → "1h 30m", 0.5 → "30m", 2 → "2h" ──
const fmtHrs = (hrs) => {
  const n = Number(hrs) || 0;
  const totalMin = Math.round(n * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// ── Inline AM/PM Time Picker ──
function AmpmTimePicker({ value, onChange, minTime, disabled }) {
  const { h, m, ap } = to12h(value);
  const set = (hh, mm, aa) => onChange(to24h(hh, mm, aa));

  // Convert minTime to 12h format for comparison
  const min12 = minTime ? to12h(minTime) : null;

  // Filter hours: if same AM/PM as min, only show hours >= min hour
  const hours = [12,1,2,3,4,5,6,7,8,9,10,11].filter((n) => {
    if (!min12 || ap !== min12.ap) return true;
    return n >= min12.h;
  });

  // Filter minutes: if same hour as min, only show minutes > min minute
  const minutes = [0,5,10,15,20,25,30,35,40,45,50,55].filter((n) => {
    if (!min12 || ap !== min12.ap || h !== min12.h) return true;
    return n > min12.m;
  });

  const disStyle = disabled ? { opacity: 0.5, pointerEvents: "none" } : {};

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", ...disStyle }}>
      <select
        value={h}
        onChange={(e) => set(e.target.value, m, ap)}
        className="ts-input"
        style={{ width: 64, padding: "7px 4px", textAlign: "center" }}
        disabled={disabled}
      >
        {hours.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <span style={{ fontWeight: 700, color: "var(--t-muted)" }}>:</span>
      <select
        value={m}
        onChange={(e) => set(h, e.target.value, ap)}
        className="ts-input"
        style={{ width: 64, padding: "7px 4px", textAlign: "center" }}
        disabled={disabled}
      >
        {minutes.map((n) => (
          <option key={n} value={n}>{String(n).padStart(2, "0")}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => set(h, m, ap === "AM" ? "PM" : "AM")}
        disabled={disabled}
        style={{
          width: 52, height: 36, borderRadius: "var(--radius)", border: "1px solid var(--border)",
          background: ap === "AM" ? "#EEF2FF" : "#FFF7ED",
          color: ap === "AM" ? "#5048E5" : "#C2410C",
          fontSize: 12, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "var(--font)", opacity: disabled ? 0.5 : 1,
        }}
      >
        {ap}
      </button>
    </div>
  );
}

export default function AdminTimesheetList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillTaskId = searchParams.get("task");
  const [data, setData]               = useState([]);
  const [loading, setLoading]         = useState(false);
  const [searchText, setSearchText]   = useState("");
  const [sortField, setSortField]     = useState("timesheet_date");
  const [sortOrder, setSortOrder]     = useState("desc");
  const [page, setPage]               = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [detailTimesheetId, setDetailTimesheetId] = useState(null);
  const [toast, setToast]             = useState(null);

  // Modal
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState({ user: "", date: "", project: "", task: "", start_time: "", end_time: "" });
  const [users, setUsers]           = useState([]);
  const [projects, setProjects]     = useState([]);
  const [tasks, setTasks]           = useState([]);
  const [formError, setFormError]   = useState("");
  // hours already logged for selected user+date (fetched from full data)
  const [userDayHrs, setUserDayHrs] = useState(0);

  const PAGE_SIZE = 10;

  // Helper: compute hours from start/end time strings (HH:MM or HH:MM:SS)
  const calcHoursFromTimes = (start, end) => {
    if (!start || !end) return 0;
    const [sh, sm] = start.substring(0, 5).split(":").map(Number);
    const [eh, em] = end.substring(0, 5).split(":").map(Number);
    const diffMin = (eh * 60 + em) - (sh * 60 + sm);
    return diffMin > 0 ? diffMin / 60 : 0;
  };

  // Compute hours for a single entry (time-based or legacy)
  const hoursForEntry = (t) => {
    if (t.start_time && t.end_time) {
      return calcHoursFromTimes(
        t.start_time.substring(0, 5),
        t.end_time.substring(0, 5)
      );
    }
    return Number(t.man_hrs) || 0;
  };

  // Auth
  const token = localStorage.getItem("token");
  let role = "", loggedUserId = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      role = payload.role;
      loggedUserId = payload.id;
    } catch (e) {}
  }
  const authHeader = { Authorization: `Bearer ${token}` };

  // ================= FETCH =================
  useEffect(() => { loadData(); loadUsers(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/timesheet/admin", { headers: authHeader });
      const result = Array.isArray(res.data?.data) ? res.data.data
        : Array.isArray(res.data) ? res.data : [];
      setData(result);
    } catch (err) {
      console.error("Load error:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get("/timesheet/list/users", { headers: authHeader });
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  // Load projects assigned to selected user
  const loadProjects = async (userId) => {
    try {
      const res = await api.get(`/timesheet/admin/projects/${userId}`, { headers: authHeader });
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); setProjects([]); }
  };

  // Load tasks for selected project assigned to selected user
  const loadTasks = async (projectId, userId) => {
    try {
      const res = await api.get(`/timesheet/admin/tasks/${projectId}/${userId}`, { headers: authHeader });
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); setTasks([]); }
  };

  // Recompute hours used whenever user or date changes
  const recomputeHours = (userId, date, currentData) => {
    if (!userId || !date) { setUserDayHrs(0); return; }
    const used = (currentData || data)
      .filter((t) => String(t.timesheet_created_by) === String(userId) && toDateStr(t.timesheet_date) === date)
      .reduce((s, t) => s + hoursForEntry(t), 0);
    setUserDayHrs(used);
  };

  // Live overlap check when time changes
  const checkOverlapLive = (userId, date, startTime, endTime) => {
    if (!userId || !date || !startTime || !endTime) { setFormError(""); return; }
    const newStart = startTime.substring(0, 5);
    const newEnd = endTime.substring(0, 5);
    const overlapEntry = data.find((t) => {
      if (String(t.timesheet_created_by) !== String(userId)) return false;
      if (toDateStr(t.timesheet_date) !== date) return false;
      if (!t.start_time || !t.end_time) return false;
      const existStart = t.start_time.substring(0, 5);
      const existEnd = t.end_time.substring(0, 5);
      return existStart < newEnd && existEnd > newStart;
    });
    if (overlapEntry) {
      const oStart = formatAMPM(overlapEntry.start_time);
      const oEnd = formatAMPM(overlapEntry.end_time);
      setFormError(`Time overlap! Entry already exists from ${oStart} to ${oEnd}. Choose a different time.`);
    } else {
      setFormError("");
    }
  };

  // ================= FORM HANDLERS =================
  const openModal = (prefillTaskIdFromUrl) => {
    setForm({ user: "", date: "", entry_type: "project", project: "", task: prefillTaskIdFromUrl || "", start_time: "", end_time: "", work_description: "" });
    setProjects([]); setTasks([]);
    setUserDayHrs(0); setFormError("");
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormError("");

    if (name === "user") {
      setForm((prev) => ({ ...prev, user: value, project: "", task: "" }));
      setProjects([]); setTasks([]);
      if (value) loadProjects(value);
      recomputeHours(value, form.date, data);

    } else if (name === "date") {
      setForm((prev) => ({ ...prev, date: value }));
      recomputeHours(form.user, value, data);

    } else if (name === "project") {
      setForm((prev) => ({ ...prev, project: value, task: "" }));
      setTasks([]);
      if (value && form.user) loadTasks(value, form.user);

    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    const isPermission = form.entry_type === "permission";

    if (!form.user) {
      setFormError("Please select a user.");
      return;
    }
    if (!form.date) {
      setFormError("Please select a date.");
      return;
    }
    if (!isPermission && !form.project) {
      setFormError("Please select a project.");
      return;
    }
    if (!isPermission && !form.task) {
      setFormError("Please select a module.");
      return;
    }
    if (!form.start_time || !form.end_time) {
      setFormError("Please select start and end times.");
      return;
    }

    const hoursToAdd = calcHoursFromTimes(form.start_time, form.end_time);
    if (hoursToAdd <= 0) {
      setFormError("End time must be after start time.");
      return;
    }
    if (userDayHrs + hoursToAdd > 8) {
      setFormError(`Only ${fmtHrs(8 - userDayHrs)} remaining for this user on this date.`);
      return;
    }

    // Check for overlapping time entries on same date for same user
    if (form.start_time && form.end_time && form.user && form.date) {
      const newStart = form.start_time.substring(0, 5);
      const newEnd = form.end_time.substring(0, 5);
      const overlapEntry = data.find((t) => {
        if (String(t.timesheet_created_by) !== String(form.user)) return false;
        if (toDateStr(t.timesheet_date) !== form.date) return false;
        if (!t.start_time || !t.end_time) return false;
        const existStart = t.start_time.substring(0, 5);
        const existEnd = t.end_time.substring(0, 5);
        return existStart < newEnd && existEnd > newStart;
      });
      if (overlapEntry) {
        const oStart = formatAMPM(overlapEntry.start_time);
        const oEnd = formatAMPM(overlapEntry.end_time);
        setFormError(`Time overlap! Entry already exists from ${oStart} to ${oEnd}. Choose a different time.`);
        return;
      }
    }
    try {
      await api.post("/timesheet",
        {
          task: isPermission ? null : form.task,
          entry_type: form.entry_type,
          date: form.date,
          start_time: form.start_time,
          end_time: form.end_time,
          work_description: isPermission ? "Permission" : form.work_description,
          created_by: form.user,
        },
        { headers: authHeader }
      );
      setShowModal(false);
      showToast("Timesheet added successfully.", "success");
      loadData();
    } catch (err) {
      console.error("Add timesheet error:", err);
      setFormError(err.response?.data?.message || "Failed to add timesheet.");
    }
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    try {
      await api.delete(`/timesheet/delete/${id}`, { headers: authHeader });
      setData((prev) => prev.filter((t) => t.timesheet_id !== id));
      setDeleteConfirm(null);
      showToast("Timesheet deleted successfully.", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete timesheet.", "error");
    }
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ================= TABLE =================
  const filtered = useMemo(() => {
    const t = searchText.toLowerCase();
    return data.filter((row) =>
      !t ||
      (row.task_name || "").toLowerCase().includes(t) ||
      (row.project_name || "").toLowerCase().includes(t) ||
      (row.created_by_name || "").toLowerCase().includes(t)
    );
  }, [data, searchText]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === "timesheet_date") { va = new Date(va); vb = new Date(vb); }
      else { va = (va || "").toString().toLowerCase(); vb = (vb || "").toString().toLowerCase(); }
      if (va < vb) return sortOrder === "asc" ? -1 : 1;
      if (va > vb) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortOrder]);

  const totalPages  = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field) => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("asc"); }
    setPage(1);
  };

  const SortIcon = ({ field }) =>
    sortField === field
      ? <i className={`bi bi-chevron-${sortOrder === "asc" ? "up" : "down"} ts-sort-icon`} />
      : null;

  const hoursRemaining = 8 - userDayHrs;

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div className={`ts-toast ts-toast-${toast.type}`}>
          <i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"}`} />
          {toast.msg}
          <button className="ts-toast-close" onClick={() => setToast(null)}>
            <i className="bi bi-x" />
          </button>
        </div>
      )}

      {/* ── PAGE HEADER ── */}
      <div className="ts-page-header">
        <div>
          <h5 className="ts-page-title">Timesheet List</h5>
          <nav className="ts-breadcrumb">
            <Link to="/">Home</Link>
            <i className="bi bi-chevron-right" />
            <span>Timesheets</span>
          </nav>
        </div>
        <button className="ts-add-btn" onClick={() => openModal(prefillTaskId)}>
          <i className="bi bi-plus-lg" /> Add Timesheet
        </button>
      </div>

      {/* ── CARD ── */}
      <div className="ts-card">
        {/* Toolbar */}
        <div className="ts-toolbar">
          <div className="ts-search-wrap">
            <i className="bi bi-search ts-search-icon" />
            <input
              className="ts-search"
              type="text"
              placeholder="Search by module, project, or user…"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            />
            {searchText && (
              <button className="ts-search-clear" onClick={() => setSearchText("")}>
                <i className="bi bi-x" />
              </button>
            )}
          </div>
          <span className="ts-count">{filtered.length} records</span>
        </div>

        {/* Table */}
        <div className="ts-table-wrap">
          <table className="ts-table">
            <thead>
              <tr>
                <th className="ts-th-sm">#</th>
                {[
                  { key: "timesheet_date",  label: "Date" },
                  { key: "created_by_name", label: "User" },
                  { key: "project_name",    label: "Project" },
                  { key: "task_name",       label: "Module" },
                  { key: "work_description", label: "Work Description" },
                  { key: "man_hrs",         label: "Time" },
                  { key: "man_hrs",         label: "Hours" },
                ].map(({ key, label }, i) => (
                  <th key={`${label}-${i}`} className="ts-th-sort" onClick={() => handleSort(key)}>
                    {label} <SortIcon field={key} />
                  </th>
                ))}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="ts-state-cell">
                  <div className="ts-loading"><i className="bi bi-arrow-repeat ts-spin" /> Loading timesheets…</div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9} className="ts-state-cell">
                  <div className="ts-empty"><i className="bi bi-clock-history" /><span>No timesheets found</span></div>
                </td></tr>
              ) : paginated.map((row, idx) => {
                const canDelete = role === "admin" || row.timesheet_created_by === loggedUserId;
                const rowHours = hoursForEntry(row);
                const startTime = row.start_time ? formatAMPM(row.start_time) : null;
                const endTime = row.end_time ? formatAMPM(row.end_time) : null;
                return (
                  <tr key={row.timesheet_id} className="ts-tr" style={{ cursor: "pointer" }} onClick={() => setDetailTimesheetId(row.timesheet_id)}>
                    <td className="ts-td-muted ts-center">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="ts-td-muted ts-nowrap">
                      {row.timesheet_date
                        ? new Date(row.timesheet_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td>
                      {row.created_by_name
                        ? <span className="ts-user-chip"><i className="bi bi-person-fill" />{row.created_by_name}</span>
                        : <span className="ts-td-muted">—</span>}
                    </td>
                    <td>
                      {row.project_name
                        ? <span className="ts-project-pill">{row.project_name}</span>
                        : <span className="ts-td-muted">—</span>}
                    </td>
                    <td className="ts-task-cell" title={row.task_name || row.work_description}>
                      {row.task_name || row.work_description || "—"}
                    </td>
                    <td className="ts-td-muted" title={row.work_description} style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12px" }}>
                      {row.work_description || "—"}
                    </td>
                    <td className="ts-td-muted ts-nowrap" style={{ fontSize: "12px" }}>
                      {startTime && endTime ? `${startTime} – ${endTime}` : "—"}
                    </td>
                    <td>
                      <span className="ts-hrs-pill">
                        <i className="bi bi-stopwatch" />{fmtHrs(rowHours)}
                      </span>
                    </td>
                    <td>
                      {canDelete && (
                        <button
                          className="ts-action-btn ts-action-delete"
                          onClick={() => setDeleteConfirm(row)}
                          title="Delete"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="ts-pagination">
            <span className="ts-page-info">
              Page {page} of {totalPages} · {filtered.length} results
            </span>
            <div className="ts-page-btns">
              <button className="ts-page-btn" disabled={page === 1} onClick={() => setPage(1)}><i className="bi bi-chevron-double-left" /></button>
              <button className="ts-page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}><i className="bi bi-chevron-left" /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={p} className={`ts-page-btn ${p === page ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                );
              })}
              <button className="ts-page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}><i className="bi bi-chevron-right" /></button>
              <button className="ts-page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}><i className="bi bi-chevron-double-right" /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD TIMESHEET MODAL ── */}
      {showModal && (
        <div className="ul-overlay" onClick={() => setShowModal(false)}>
          <div className="ul-modal ul-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="ul-modal-header">
              <div className="ul-modal-header-left">
                <div className="ul-modal-icon ul-modal-icon-success"><i className="bi bi-plus-circle" /></div>
                <div>
                  <h6 className="ul-modal-title">Add Timesheet</h6>
                  <p className="ul-modal-sub">Log work hours for a user</p>
                </div>
              </div>
              <button className="ul-modal-close" onClick={() => setShowModal(false)}><i className="bi bi-x-lg" /></button>
            </div>

            <div className="ul-modal-divider" />

              <div className="ul-modal-body">

                {/* Hours meter — show once user + date both selected */}
                {form.user && form.date && (
                  <div className="ts-hrs-meter">
                    <div className="ts-hrs-meter-top">
                      <span className="ts-hrs-meter-label">
                        Hours used on {new Date(form.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        {form.user && users.find(u => String(u.id) === String(form.user)) &&
                          <> · <strong>{users.find(u => String(u.id) === String(form.user)).name}</strong></>}
                      </span>
                      <span className="ts-hrs-meter-val" style={{ color: hoursRemaining <= 0 ? "#DC2626" : hoursRemaining <= 2 ? "#D97706" : "#059669" }}>
                        {fmtHrs(userDayHrs)} / 8 hrs
                      </span>
                    </div>
                    <div className="ts-hrs-bar-bg">
                      <div
                        className="ts-hrs-bar-fill"
                        style={{
                          width: `${Math.min(100, (userDayHrs / 8) * 100)}%`,
                          background: hoursRemaining <= 0 ? "#DC2626" : hoursRemaining <= 2 ? "#D97706" : "#059669",
                        }}
                      />
                    </div>
                    {hoursRemaining <= 0
                      ? <p className="ts-hrs-warning">No hours remaining for this user on this date.</p>
                      : <p className="ts-hrs-hint">{fmtHrs(hoursRemaining)} remaining</p>}
                  </div>
                )}

                {/* Error */}
                {formError && (
                  <div className="ts-form-error">
                    <i className="bi bi-exclamation-circle" /> {formError}
                  </div>
                )}

                <div className="ts-form-grid">
                  {/* User */}
                  <div className="ts-field">
                    <label className="ts-label">User <span className="ts-required">*</span></label>
                    <SharedSelect
                      value={form.user}
                      onChange={(val) => {
                        setForm((prev) => ({ ...prev, user: val, project: "", task: "" }));
                        setProjects([]); setTasks([]);
                        if (val) loadProjects(val);
                        recomputeHours(val, form.date, data);
                      }}
                      options={users.map((u) => ({ value: u.id, label: u.name }))}
                      placeholder="— Select User —"
                    />
                  </div>

                  {/* Date */}
                  <div className="ts-field">
                    <label className="ts-label">Date <span className="ts-required">*</span></label>
                    <SharedDatePicker
                      value={form.date}
                      onChange={(val) => {
                        setForm((prev) => ({ ...prev, date: val }));
                        recomputeHours(form.user, val, data);
                      }}
                      max={new Date().toISOString().split("T")[0]}
                      className="ts-input"
                    />
                  </div>

                  {/* Type */}
                  <div className="ts-field">
                    <label className="ts-label">Type <span className="ts-required">*</span></label>
                    <select
                      className="ts-input"
                      value={form.entry_type}
                      onChange={(e) => {
                        const val = e.target.value;
                        let autoStart = "";
                        let autoEnd = "";
                        if (val === "permission") {
                          const now = new Date();
                          const roundMin = Math.ceil(now.getMinutes() / 5) * 5;
                          let sh = now.getHours(), sm = roundMin;
                          if (sm >= 60) { sh += 1; sm = 0; }
                          autoStart = `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
                          const endMin = sh * 60 + sm + 15;
                          const eh = Math.floor(endMin / 60);
                          const em = endMin % 60;
                          autoEnd = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
                        }
                        setForm((prev) => ({
                          ...prev,
                          entry_type: val,
                          project: "",
                          task: "",
                          work_description: "",
                          start_time: autoStart,
                          end_time: autoEnd,
                        }));
                        setTasks([]);
                        setFormError("");
                      }}
                    >
                      <option value="project">Project</option>
                      <option value="permission">Permission</option>
                    </select>
                  </div>

                  {/* Project */}
                  {form.entry_type === "project" && (
                    <div className="ts-field">
                      <label className="ts-label">Project</label>
                      <SharedSelect
                        value={form.project}
                        onChange={(val) => {
                          setForm((prev) => ({ ...prev, project: val, task: "" }));
                          setTasks([]);
                          if (val && form.user) loadTasks(val, form.user);
                        }}
                        options={projects.map((p) => ({ value: p.id, label: p.project_name }))}
                        placeholder="— Select Project —"
                        isDisabled={!form.user}
                      />
                      {!form.user && <p className="ts-field-hint">Select a user first to load their projects.</p>}
                    </div>
                  )}

                  {/* Module */}
                  {form.entry_type === "project" && (
                    <div className="ts-field">
                      <label className="ts-label">Module <span className="ts-required">*</span></label>
                      <SharedSelect
                        value={form.task}
                        onChange={(val) => setForm({ ...form, task: val })}
                        options={tasks.map((t) => ({ value: t.id, label: t.task }))}
                        placeholder="— Select Module —"
                        isDisabled={!form.project}
                      />
                      {form.user && !form.project && <p className="ts-field-hint">Select a project first to load modules.</p>}
                    </div>
                  )}

                  {/* Start Time */}
                  <div className="ts-field">
                    <label className="ts-label">Start Time <span className="ts-required">*</span></label>
                    <AmpmTimePicker
                      value={form.start_time}
                      onChange={(val) => {
                        const newForm = { ...form, start_time: val };
                        if (form.entry_type === "permission" && val) {
                          const [h, m] = val.split(":").map(Number);
                          let endMin = h * 60 + m + 15;
                          if (endMin >= 24 * 60) endMin = 24 * 60 - 1;
                          const eh = Math.floor(endMin / 60);
                          const em = endMin % 60;
                          newForm.end_time = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
                        }
                        setForm(newForm);
                        checkOverlapLive(form.user, form.date, val, newForm.end_time);
                      }}
                    />
                  </div>

                  {/* End Time */}
                  <div className="ts-field">
                    <label className="ts-label">End Time <span className="ts-required">*</span></label>
                    <AmpmTimePicker
                      value={form.end_time}
                      onChange={(val) => {
                        setForm((prev) => ({ ...prev, end_time: val }));
                        checkOverlapLive(form.user, form.date, form.start_time, val);
                      }}
                      minTime={form.start_time}
                      disabled={form.entry_type === "permission"}
                    />
                    {form.entry_type === "permission" && form.start_time && (
                      <span style={{ fontSize: "11px", color: "#5048E5", fontWeight: 600 }}>
                        Auto: Start + 15 min
                      </span>
                    )}
                  </div>
                </div>

                {form.entry_type === "project" && (
                  <div className="ts-field">
                    <label className="ts-label">Work Description</label>
                    <textarea
                      className="ts-textarea"
                      rows={3}
                      placeholder="Describe what was worked on..."
                      value={form.work_description}
                      onChange={(e) => setForm((prev) => ({ ...prev, work_description: e.target.value }))}
                    />
                  </div>
                )}

                {form.entry_type === "permission" && (
                  <div className="ts-field-hint" style={{ color: "#5048E5", fontWeight: 600, fontSize: "12px" }}>
                    <i className="bi bi-info-circle" /> Permission mode: 15 minutes auto-assigned
                  </div>
                )}

                {form.start_time && form.end_time && (
                  <div style={{ fontSize: "12px", color: calcHoursFromTimes(form.start_time, form.end_time) > 0 ? "#059669" : "#DC2626", fontWeight: 600 }}>
                    <i className="bi bi-clock" /> {fmtHrs(calcHoursFromTimes(form.start_time, form.end_time))} will be logged
                  </div>
                )}

                {(!form.user || !form.date) && (
                  <p className="ts-field-hint">Select user and date first to see available hours.</p>
                )}
              </div>

              <div className="ul-modal-footer">
                <button className="ul-btn ul-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="ul-btn ul-btn-primary" onClick={handleSave}>
                  <i className="bi bi-send" /> Save Timesheet
                </button>
              </div>
            </div>
          </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteConfirm && (
        <div className="ul-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="ul-modal ul-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="ul-modal-icon ul-modal-icon-danger">
              <i className="bi bi-trash" />
            </div>
            <h6 className="ul-modal-title">Delete Timesheet</h6>
            <p className="ul-modal-sub">Are you sure you want to delete this timesheet?</p>
            <p className="ul-modal-sub" style={{ marginTop: 4 }}>
              <strong>{deleteConfirm.task_name}</strong>
              {deleteConfirm.project_name && <> — {deleteConfirm.project_name}</>}
            </p>
            <div className="ul-modal-divider" />
            <div className="ul-modal-footer">
              <button className="ul-btn ul-btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="ul-btn ul-btn-danger" onClick={() => handleDelete(deleteConfirm.timesheet_id)}>
                <i className="bi bi-trash" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timesheet Detail Modal */}
      {detailTimesheetId && (
        <TimesheetDetailModal
          timesheetId={detailTimesheetId}
          onClose={() => setDetailTimesheetId(null)}
          onNavigate={(type, id) => {
            setDetailTimesheetId(null);
            if (type === "project") navigate(`/admin/projects/${id}`);
            else if (type === "module") navigate(`/admin/modules/${id}`);
            else if (type === "user") navigate(`/admin/users/${id}`);
          }}
        />
      )}
    </AppLayout>
  );
}

// ================= STYLES =================
const styles = `
  /* Toast */
  .ts-toast {
    position: fixed; top: 20px; right: 20px; z-index: 999;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: var(--radius-lg);
    font-size: 13px; font-weight: 600; font-family: var(--font);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12); animation: ts-fade-in 0.2s ease;
  }
  .ts-toast-success { background: #ECFDF5; color: #059669; border: 1px solid #6ee7b7; }
  .ts-toast-error   { background: #FEF2F2; color: #DC2626; border: 1px solid #fca5a5; }
  .ts-toast-close { margin-left: 6px; background: none; border: none; cursor: pointer; color: inherit; font-size: 15px; display: flex; align-items: center; }

  /* Page header */
  .ts-page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
  }
  .ts-page-title { font-size: 15px; font-weight: 700; color: var(--t-base); margin: 0 0 4px; letter-spacing: -0.01em; }
  .ts-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--t-muted); }
  .ts-breadcrumb a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .ts-breadcrumb a:hover { text-decoration: underline; }
  .ts-breadcrumb i { font-size: 10px; opacity: 0.5; }
  .ts-add-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 9px 18px; background: var(--primary); color: #fff;
    border: none; border-radius: var(--radius); font-size: 13px; font-weight: 600;
    cursor: pointer; transition: background 0.15s, transform 0.15s;
    font-family: var(--font);
  }
  .ts-add-btn:hover { background: var(--primary-dark); transform: translateY(-1px); }

  /* Card */
  .ts-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow); overflow: hidden; }

  /* Toolbar */
  .ts-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border); gap: 12px; }
  .ts-search-wrap { position: relative; display: flex; align-items: center; flex: 1; max-width: 360px; }
  .ts-search-icon { position: absolute; left: 11px; color: var(--t-muted); font-size: 13px; pointer-events: none; }
  .ts-search {
    width: 100%; padding: 8px 32px 8px 34px;
    border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 13px; color: var(--t-base); background: var(--bg);
    font-family: var(--font); outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ts-search:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); background: var(--bg-card); }
  .ts-search-clear { position: absolute; right: 8px; background: none; border: none; color: var(--t-muted); cursor: pointer; font-size: 14px; padding: 2px; display: flex; align-items: center; }
  .ts-search-clear:hover { color: var(--t-base); }
  .ts-count { font-size: 12px; font-weight: 600; color: var(--t-muted); background: var(--bg); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; white-space: nowrap; }

  /* Table */
  .ts-table-wrap { overflow-x: auto; }
  .ts-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .ts-table thead tr { border-bottom: 2px solid var(--border); }
  .ts-table th { padding: 10px 14px; font-size: 10.5px; font-weight: 700; color: var(--t-muted); text-transform: uppercase; letter-spacing: 0.06em; text-align: left; white-space: nowrap; background: var(--bg-card); }
  .ts-th-sm { width: 48px; text-align: center; }
  .ts-th-sort { cursor: pointer; user-select: none; }
  .ts-th-sort:hover { color: var(--primary); }
  .ts-sort-icon { margin-left: 4px; font-size: 9px; }
  .ts-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .ts-tr { transition: background 0.1s; }
  .ts-tr:hover td { background: #fafbff; }
  .ts-tr:last-child td { border-bottom: none; }
  .ts-td-muted { color: var(--t-muted); font-size: 12.5px; }
  .ts-center { text-align: center; }
  .ts-nowrap { white-space: nowrap; }
  .ts-task-cell { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--t-base); font-weight: 500; }

  /* Chips */
  .ts-project-pill { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 20px; background: #EEF2FF; color: #5048E5; white-space: nowrap; }
  .ts-user-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; padding: 3px 9px; background: #F0FDF4; color: #15803D; border-radius: 20px; white-space: nowrap; }
  .ts-user-chip i { font-size: 11px; }
  .ts-hrs-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; padding: 3px 9px; background: #FFF7ED; color: #C2410C; border-radius: 20px; border: 1px solid #FED7AA; white-space: nowrap; }
  .ts-hrs-pill i { font-size: 11px; }

  /* Actions */
  .ts-action-btn { width: 30px; height: 30px; border-radius: var(--radius); border: 1px solid; display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer; transition: all 0.15s; }
  .ts-action-delete { background: #FEF2F2; color: #DC2626; border-color: #fca5a5; }
  .ts-action-delete:hover { background: #DC2626; color: #fff; }

  /* States */
  .ts-state-cell { padding: 0 !important; border: none !important; }
  .ts-loading, .ts-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 56px 20px; color: var(--t-muted); font-size: 13px; }
  .ts-empty i { font-size: 28px; opacity: 0.35; }
  .ts-spin { animation: ts-spin 0.7s linear infinite; display: inline-block; }
  @keyframes ts-spin { to { transform: rotate(360deg); } }

  /* Pagination */
  .ts-pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 10px; }
  .ts-page-info { font-size: 12px; color: var(--t-muted); }
  .ts-page-btns { display: flex; gap: 4px; }
  .ts-page-btn { width: 30px; height: 30px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg-card); color: var(--t-muted); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; font-family: var(--font); }
  .ts-page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
  .ts-page-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
  .ts-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }


  /* Form */
  .ts-field { display: flex; flex-direction: column; gap: 6px; }
  .ts-form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px 20px; }
  @media (max-width: 560px) { .ts-form-grid { grid-template-columns: 1fr; } }
  .ts-label { font-size: 11px; font-weight: 700; color: var(--t-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .ts-required { color: #DC2626; }
  .ts-input, .ts-select {
    width: 100%; padding: 9px 12px;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--bg-card); font-size: 13px; color: var(--t-base);
    font-family: var(--font); outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ts-input:focus, .ts-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }
  .ts-input:disabled, .ts-select:disabled { background: var(--bg); color: var(--t-muted); cursor: not-allowed; opacity: 0.6; }
  .ts-textarea {
    width: 100%; padding: 9px 12px;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--bg-card); font-size: 13px; color: var(--t-base);
    font-family: var(--font); outline: none;
    transition: border-color 0.15s, box-shadow 0.15s; resize: none; line-height: 1.5;
  }
  .ts-textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }
  .ts-select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;
  }
  .ts-select-wrap { position: relative; display: flex; align-items: center; }
  .ts-select-icon { position: absolute; left: 11px; color: var(--t-muted); font-size: 13px; pointer-events: none; z-index: 1; }
  .ts-select-wrap .ts-select { padding-left: 32px; }
  .ts-field-hint { font-size: 11.5px; color: var(--t-muted); margin: 0; }
  .ts-form-error { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #FEF2F2; color: #DC2626; border: 1px solid #fca5a5; border-radius: var(--radius); font-size: 12.5px; font-weight: 600; }

  /* Hours picker */
  .ts-hrs-options { display: flex; gap: 6px; flex-wrap: wrap; }
  .ts-hrs-btn {
    width: 44px; height: 36px; border-radius: var(--radius);
    border: 1px solid var(--border); background: var(--bg);
    color: var(--t-muted); font-size: 12.5px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; font-family: var(--font);
  }
  .ts-hrs-btn:hover:not(.disabled) { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }
  .ts-hrs-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
  .ts-hrs-btn.disabled { opacity: 0.35; cursor: not-allowed; }

  /* Hours meter */
  .ts-hrs-meter { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; display: flex; flex-direction: column; gap: 7px; }
  .ts-hrs-meter-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .ts-hrs-meter-label { font-size: 11.5px; color: var(--t-muted); font-weight: 500; }
  .ts-hrs-meter-val { font-size: 12px; font-weight: 700; white-space: nowrap; }
  .ts-hrs-bar-bg { width: 100%; height: 6px; background: var(--border); border-radius: 6px; overflow: hidden; }
  .ts-hrs-bar-fill { height: 100%; border-radius: 6px; transition: width 0.3s ease, background 0.3s ease; }
  .ts-hrs-hint { font-size: 11px; color: var(--t-muted); margin: 0; }
  .ts-hrs-warning { font-size: 11px; color: #DC2626; font-weight: 600; margin: 0; }


  /* Delete confirm */
  .ts-delete-warn { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 8px 0; text-align: center; }
  .ts-delete-icon { width: 52px; height: 52px; border-radius: 50%; background: #FEF2F2; color: #DC2626; font-size: 22px; display: flex; align-items: center; justify-content: center; }
  .ts-delete-msg { font-size: 14px; font-weight: 600; color: var(--t-base); margin: 0; }
  .ts-delete-detail { font-size: 12.5px; color: var(--t-muted); margin: 0; max-width: 280px; }

  @keyframes ts-fade-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
`;
