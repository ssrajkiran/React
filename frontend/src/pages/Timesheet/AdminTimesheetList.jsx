import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";

// ── Helper: normalize any date value to "YYYY-MM-DD" (IST-safe) ──
const toDateStr = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

export default function AdminTimesheetList() {
  const [data, setData]               = useState([]);
  const [loading, setLoading]         = useState(false);
  const [searchText, setSearchText]   = useState("");
  const [sortField, setSortField]     = useState("timesheet_date");
  const [sortOrder, setSortOrder]     = useState("desc");
  const [page, setPage]               = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast]             = useState(null);

  // Modal
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState({ user: "", date: "", project: "", task: "", man_hrs: "" });
  const [users, setUsers]           = useState([]);
  const [projects, setProjects]     = useState([]);
  const [tasks, setTasks]           = useState([]);
  const [formError, setFormError]   = useState("");
  // hours already logged for selected user+date (fetched from full data)
  const [userDayHrs, setUserDayHrs] = useState(0);

  const PAGE_SIZE = 10;

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
      .reduce((s, t) => s + Number(t.man_hrs), 0);
    setUserDayHrs(used);
  };

  // ================= FORM HANDLERS =================
  const openModal = () => {
    setForm({ user: "", date: "", project: "", task: "", man_hrs: "" });
    setProjects([]); setTasks([]);
    setUserDayHrs(0); setFormError("");
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormError("");

    if (name === "user") {
      setForm((prev) => ({ ...prev, user: value, project: "", task: "", man_hrs: "" }));
      setProjects([]); setTasks([]);
      if (value) loadProjects(value);
      recomputeHours(value, form.date, data);

    } else if (name === "date") {
      setForm((prev) => ({ ...prev, date: value, man_hrs: "" }));
      recomputeHours(form.user, value, data);

    } else if (name === "project") {
      setForm((prev) => ({ ...prev, project: value, task: "", man_hrs: "" }));
      setTasks([]);
      if (value && form.user) loadTasks(value, form.user);

    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (!form.user || !form.date || !form.task || !form.man_hrs) {
      setFormError("Please fill all required fields.");
      return;
    }
    if (userDayHrs + Number(form.man_hrs) > 8) {
      setFormError(`Only ${8 - userDayHrs} hr${8 - userDayHrs !== 1 ? "s" : ""} remaining for this user on this date.`);
      return;
    }
    try {
      await api.post("/timesheet",
        { task: form.task, date: form.date, man_hrs: form.man_hrs, created_by: form.user },
        { headers: authHeader }
      );
      setShowModal(false);
      showToast("Timesheet added successfully.", "success");
      loadData();
    } catch (err) {
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
        <button className="ts-add-btn" onClick={openModal}>
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
              placeholder="Search by task, project, or user…"
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
                  { key: "task_name",       label: "Task" },
                  { key: "man_hrs",         label: "Hours" },
                ].map(({ key, label }) => (
                  <th key={label} className="ts-th-sort" onClick={() => handleSort(key)}>
                    {label} <SortIcon field={key} />
                  </th>
                ))}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="ts-state-cell">
                  <div className="ts-loading"><i className="bi bi-arrow-repeat ts-spin" /> Loading timesheets…</div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="ts-state-cell">
                  <div className="ts-empty"><i className="bi bi-clock-history" /><span>No timesheets found</span></div>
                </td></tr>
              ) : paginated.map((row, idx) => {
                const canDelete = role === "admin" || row.timesheet_created_by === loggedUserId;
                return (
                  <tr key={row.timesheet_id} className="ts-tr">
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
                    <td className="ts-task-cell" title={row.task_name}>{row.task_name || "—"}</td>
                    <td>
                      <span className="ts-hrs-pill">
                        <i className="bi bi-stopwatch" />{row.man_hrs || 0} hrs
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
        <>
          <div className="ts-modal-overlay" onClick={() => setShowModal(false)} />
          <div className="ts-modal-wrap">
            <div className="ts-modal">
              <div className="ts-modal-header">
                <div className="ts-modal-header-left">
                  <span className="ts-modal-badge"><i className="bi bi-plus-circle" /> New</span>
                  <h6 className="ts-modal-title">Add Timesheet</h6>
                </div>
                <button className="ts-modal-close" onClick={() => setShowModal(false)}><i className="bi bi-x-lg" /></button>
              </div>

              <div className="ts-modal-body">

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
                        {userDayHrs} / 8 hrs
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
                      : <p className="ts-hrs-hint">{hoursRemaining} hr{hoursRemaining !== 1 ? "s" : ""} remaining</p>}
                  </div>
                )}

                {/* Error */}
                {formError && (
                  <div className="ts-form-error">
                    <i className="bi bi-exclamation-circle" /> {formError}
                  </div>
                )}

                {/* User */}
                <div className="ts-field">
                  <label className="ts-label">User <span className="ts-required">*</span></label>
                  <div className="ts-select-wrap">
                    <i className="bi bi-person ts-select-icon" />
                    <select className="ts-select" name="user" value={form.user} onChange={handleChange}>
                      <option value="">— Select User —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date */}
                <div className="ts-field">
                  <label className="ts-label">Date <span className="ts-required">*</span></label>
                  <input
                    className="ts-input"
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>

                {/* Project */}
                <div className="ts-field">
                  <label className="ts-label">Project</label>
                  <div className="ts-select-wrap">
                    <i className="bi bi-folder2 ts-select-icon" />
                    <select className="ts-select" name="project" value={form.project} onChange={handleChange} disabled={!form.user}>
                      <option value="">— Select Project —</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.project_name}</option>
                      ))}
                    </select>
                  </div>
                  {!form.user && <p className="ts-field-hint">Select a user first to load their projects.</p>}
                </div>

                {/* Task */}
                <div className="ts-field">
                  <label className="ts-label">Task <span className="ts-required">*</span></label>
                  <div className="ts-select-wrap">
                    <i className="bi bi-check2-square ts-select-icon" />
                    <select className="ts-select" name="task" value={form.task} onChange={handleChange} disabled={!form.project}>
                      <option value="">— Select Task —</option>
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>{t.task}</option>
                      ))}
                    </select>
                  </div>
                  {form.user && !form.project && <p className="ts-field-hint">Select a project first to load tasks.</p>}
                </div>

                {/* Man Hours */}
                <div className="ts-field">
                  <label className="ts-label">Man Hours <span className="ts-required">*</span></label>
                  <div className="ts-hrs-options">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => {
                      const wouldExceed = userDayHrs + h > 8;
                      return (
                        <button
                          key={h}
                          type="button"
                          disabled={wouldExceed}
                          className={`ts-hrs-btn ${form.man_hrs == h ? "active" : ""} ${wouldExceed ? "disabled" : ""}`}
                          onClick={() => !wouldExceed && setForm((prev) => ({ ...prev, man_hrs: h }))}
                        >
                          {h}h
                        </button>
                      );
                    })}
                  </div>
                  {(!form.user || !form.date) && (
                    <p className="ts-field-hint">Select user and date first to see available hours.</p>
                  )}
                </div>
              </div>

              <div className="ts-modal-footer">
                <button className="ts-btn ts-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="ts-btn ts-btn-primary" onClick={handleSave}>
                  <i className="bi bi-send" /> Save Timesheet
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteConfirm && (
        <>
          <div className="ts-modal-overlay" onClick={() => setDeleteConfirm(null)} />
          <div className="ts-modal-wrap ts-modal-center">
            <div className="ts-modal ts-modal-sm">
              <div className="ts-modal-header">
                <h6 className="ts-modal-title">Delete Timesheet</h6>
                <button className="ts-modal-close" onClick={() => setDeleteConfirm(null)}><i className="bi bi-x-lg" /></button>
              </div>
              <div className="ts-modal-body">
                <div className="ts-delete-warn">
                  <div className="ts-delete-icon"><i className="bi bi-exclamation-triangle" /></div>
                  <p className="ts-delete-msg">Are you sure you want to delete this timesheet?</p>
                  <p className="ts-delete-detail">
                    <strong>{deleteConfirm.task_name}</strong>
                    {deleteConfirm.project_name && <> — {deleteConfirm.project_name}</>}
                  </p>
                </div>
              </div>
              <div className="ts-modal-footer">
                <button className="ts-btn ts-btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="ts-btn ts-btn-danger" onClick={() => handleDelete(deleteConfirm.timesheet_id)}>
                  <i className="bi bi-trash" /> Delete
                </button>
              </div>
            </div>
          </div>
        </>
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
    font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif;
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
  .ts-page-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; letter-spacing: -0.01em; }
  .ts-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
  .ts-breadcrumb a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .ts-breadcrumb a:hover { text-decoration: underline; }
  .ts-breadcrumb i { font-size: 10px; opacity: 0.5; }
  .ts-add-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 9px 18px; background: var(--primary); color: #fff;
    border: none; border-radius: var(--radius); font-size: 13px; font-weight: 600;
    cursor: pointer; transition: background 0.15s, transform 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .ts-add-btn:hover { background: var(--primary-dark); transform: translateY(-1px); }

  /* Card */
  .ts-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow); overflow: hidden; }

  /* Toolbar */
  .ts-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border); gap: 12px; }
  .ts-search-wrap { position: relative; display: flex; align-items: center; flex: 1; max-width: 360px; }
  .ts-search-icon { position: absolute; left: 11px; color: var(--text-muted); font-size: 13px; pointer-events: none; }
  .ts-search {
    width: 100%; padding: 8px 32px 8px 34px;
    border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 13px; color: var(--text-primary); background: var(--bg);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ts-search:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); background: var(--surface); }
  .ts-search-clear { position: absolute; right: 8px; background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px; padding: 2px; display: flex; align-items: center; }
  .ts-search-clear:hover { color: var(--text-primary); }
  .ts-count { font-size: 12px; font-weight: 600; color: var(--text-muted); background: var(--bg); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; white-space: nowrap; }

  /* Table */
  .ts-table-wrap { overflow-x: auto; }
  .ts-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .ts-table thead tr { border-bottom: 2px solid var(--border); }
  .ts-table th { padding: 10px 14px; font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; text-align: left; white-space: nowrap; background: var(--surface); }
  .ts-th-sm { width: 48px; text-align: center; }
  .ts-th-sort { cursor: pointer; user-select: none; }
  .ts-th-sort:hover { color: var(--primary); }
  .ts-sort-icon { margin-left: 4px; font-size: 9px; }
  .ts-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .ts-tr { transition: background 0.1s; }
  .ts-tr:hover td { background: #fafbff; }
  .ts-tr:last-child td { border-bottom: none; }
  .ts-td-muted { color: var(--text-secondary); font-size: 12.5px; }
  .ts-center { text-align: center; }
  .ts-nowrap { white-space: nowrap; }
  .ts-task-cell { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); font-weight: 500; }

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
  .ts-loading, .ts-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 56px 20px; color: var(--text-muted); font-size: 13px; }
  .ts-empty i { font-size: 28px; opacity: 0.35; }
  .ts-spin { animation: ts-spin 0.7s linear infinite; display: inline-block; }
  @keyframes ts-spin { to { transform: rotate(360deg); } }

  /* Pagination */
  .ts-pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 10px; }
  .ts-page-info { font-size: 12px; color: var(--text-muted); }
  .ts-page-btns { display: flex; gap: 4px; }
  .ts-page-btn { width: 30px; height: 30px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; font-family: 'Plus Jakarta Sans', sans-serif; }
  .ts-page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
  .ts-page-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
  .ts-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* Modal */
  .ts-modal-overlay { position: fixed; inset: 0; background: rgba(17,24,39,0.45); backdrop-filter: blur(2px); z-index: 200; }
  .ts-modal-wrap { position: fixed; inset: 0; z-index: 201; display: flex; align-items: center; justify-content: flex-end; padding: 16px; pointer-events: none; }
  .ts-modal-center { justify-content: center; }
  .ts-modal { width: 440px; max-width: 100%; max-height: calc(100vh - 32px); background: var(--surface); border-radius: var(--radius-lg); box-shadow: 0 20px 60px rgba(0,0,0,0.18); display: flex; flex-direction: column; overflow: hidden; pointer-events: all; animation: ts-slide-in 0.22s ease; }
  .ts-modal-sm { width: 380px; }
  @keyframes ts-slide-in { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
  .ts-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .ts-modal-header-left { display: flex; flex-direction: column; gap: 5px; }
  .ts-modal-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0; }
  .ts-modal-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; padding: 2px 9px; border-radius: 20px; background: #ECFDF5; color: #059669; width: fit-content; }
  .ts-modal-close { width: 30px; height: 30px; border: 1px solid var(--border); border-radius: var(--radius); background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); font-size: 13px; transition: all 0.15s; }
  .ts-modal-close:hover { background: #FEF2F2; border-color: #fca5a5; color: #DC2626; }
  .ts-modal-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
  .ts-modal-body::-webkit-scrollbar { width: 4px; }
  .ts-modal-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
  .ts-modal-footer { display: flex; align-items: center; justify-content: flex-end; padding: 14px 20px; border-top: 1px solid var(--border); flex-shrink: 0; gap: 8px; }

  /* Form */
  .ts-field { display: flex; flex-direction: column; gap: 6px; }
  .ts-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
  .ts-required { color: #DC2626; }
  .ts-input, .ts-select {
    width: 100%; padding: 9px 12px;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface); font-size: 13px; color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ts-input:focus, .ts-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }
  .ts-input:disabled, .ts-select:disabled { background: var(--bg); color: var(--text-muted); cursor: not-allowed; opacity: 0.6; }
  .ts-select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;
  }
  .ts-select-wrap { position: relative; display: flex; align-items: center; }
  .ts-select-icon { position: absolute; left: 11px; color: var(--text-muted); font-size: 13px; pointer-events: none; z-index: 1; }
  .ts-select-wrap .ts-select { padding-left: 32px; }
  .ts-field-hint { font-size: 11.5px; color: var(--text-muted); margin: 0; }
  .ts-form-error { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #FEF2F2; color: #DC2626; border: 1px solid #fca5a5; border-radius: var(--radius); font-size: 12.5px; font-weight: 600; }

  /* Hours picker */
  .ts-hrs-options { display: flex; gap: 6px; flex-wrap: wrap; }
  .ts-hrs-btn {
    width: 44px; height: 36px; border-radius: var(--radius);
    border: 1px solid var(--border); background: var(--bg);
    color: var(--text-secondary); font-size: 12.5px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .ts-hrs-btn:hover:not(.disabled) { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }
  .ts-hrs-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
  .ts-hrs-btn.disabled { opacity: 0.35; cursor: not-allowed; }

  /* Hours meter */
  .ts-hrs-meter { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; display: flex; flex-direction: column; gap: 7px; }
  .ts-hrs-meter-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .ts-hrs-meter-label { font-size: 11.5px; color: var(--text-secondary); font-weight: 500; }
  .ts-hrs-meter-val { font-size: 12px; font-weight: 700; white-space: nowrap; }
  .ts-hrs-bar-bg { width: 100%; height: 6px; background: var(--border); border-radius: 6px; overflow: hidden; }
  .ts-hrs-bar-fill { height: 100%; border-radius: 6px; transition: width 0.3s ease, background 0.3s ease; }
  .ts-hrs-hint { font-size: 11px; color: var(--text-muted); margin: 0; }
  .ts-hrs-warning { font-size: 11px; color: #DC2626; font-weight: 600; margin: 0; }

  /* Buttons */
  .ts-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; }
  .ts-btn-primary { background: var(--primary); color: #fff; border-color: var(--primary); }
  .ts-btn-primary:hover { background: var(--primary-dark); }
  .ts-btn-ghost { background: transparent; border-color: var(--border); color: var(--text-secondary); }
  .ts-btn-ghost:hover { background: var(--bg); }
  .ts-btn-danger { background: #FEF2F2; color: #DC2626; border-color: #fca5a5; }
  .ts-btn-danger:hover { background: #DC2626; color: #fff; }

  /* Delete confirm */
  .ts-delete-warn { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 8px 0; text-align: center; }
  .ts-delete-icon { width: 52px; height: 52px; border-radius: 50%; background: #FEF2F2; color: #DC2626; font-size: 22px; display: flex; align-items: center; justify-content: center; }
  .ts-delete-msg { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0; }
  .ts-delete-detail { font-size: 12.5px; color: var(--text-muted); margin: 0; max-width: 280px; }

  @keyframes ts-fade-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
`;
