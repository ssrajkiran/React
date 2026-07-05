import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import AppLayoutImport from "../../components/layout/AppLayout";
import api from "../../api";

const AppLayout = AppLayoutImport?.default || AppLayoutImport;

// ── Helper: normalize any date value to "YYYY-MM-DD" string ──
const toDateStr = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
};

export default function EmployeeTimesheetList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [sortField, setSortField] = useState("timesheet_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: "", project: "", task: "", man_hrs: "" });
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState(null); // { msg, type }

  // Auth
  const token = localStorage.getItem("token");
  let loggedUserId = null;
  if (token) {
    try { loggedUserId = JSON.parse(atob(token.split(".")[1])).id; } catch (e) {}
  }
  const authHeader = { Authorization: `Bearer ${token}` };

  // ================= FETCH =================
  useEffect(() => {
    loadData();
    loadProjects();
    if (loggedUserId) setForm((prev) => ({ ...prev, created_by: loggedUserId }));
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/timesheet/employee", { headers: authHeader });
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); setData([]); }
    finally { setLoading(false); }
  };

  const loadProjects = async () => {
    try {
      const res = await api.get("/timesheet/employee/projects", { headers: authHeader });
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  };

  const loadTasks = async (projectId) => {
    try {
      const res = await api.get(`/timesheet/employee/tasks/${projectId}`, { headers: authHeader });
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); setTasks([]); }
  };

  // ================= FORM =================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormError("");
    if (name === "project") {
      setForm((prev) => ({ ...prev, project: value, task: "" }));
      loadTasks(value);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const openModal = () => {
    setForm({ date: "", project: "", task: "", man_hrs: "", created_by: loggedUserId });
    setTasks([]);
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.date || !form.task || !form.man_hrs) {
      setFormError("Please fill all required fields.");
      return;
    }

    // FIX: normalize DB dates before comparing with form.date (plain "YYYY-MM-DD")
    const totalHours = data
      .filter((t) => toDateStr(t.timesheet_date) === form.date)
      .reduce((sum, t) => sum + Number(t.man_hrs), 0);

    if (totalHours + Number(form.man_hrs) > 8) {
      setFormError(`Only ${8 - totalHours} hr${8 - totalHours !== 1 ? "s" : ""} remaining for this date.`);
      return;
    }

    try {
      // FIX: send only the fields the backend expects
      await api.post(
        "/timesheet",
        {
          task: form.task,
          date: form.date,
          man_hrs: form.man_hrs,
          created_by: loggedUserId,
        },
        { headers: authHeader }
      );
      setShowModal(false);
      showToast("Timesheet added successfully.", "success");
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to add timesheet.");
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
      (row.task_status || "").toLowerCase().includes(t)
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

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field) => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("asc"); }
    setPage(1);
  };

  const SortIcon = ({ field }) =>
    sortField === field
      ? <i className={`bi bi-chevron-${sortOrder === "asc" ? "up" : "down"} et-sort-icon`} />
      : null;

  const statusConfig = {
    completed:     { color: "#059669", bg: "#ECFDF5", border: "#6ee7b7", label: "Completed" },
    "in-progress": { color: "#D97706", bg: "#FFFBEB", border: "#FCD34D", label: "In Progress" },
  };

  // FIX: normalize DB dates when computing live hours-used for selected date
  const hoursUsedOnDate = form.date
    ? data
        .filter((t) => toDateStr(t.timesheet_date) === form.date)
        .reduce((s, t) => s + Number(t.man_hrs), 0)
    : 0;
  const hoursRemaining = 8 - hoursUsedOnDate;

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div className={`et-toast et-toast-${toast.type}`}>
          <i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"}`} />
          {toast.msg}
          <button className="et-toast-close" onClick={() => setToast(null)}><i className="bi bi-x" /></button>
        </div>
      )}

      {/* ── PAGE HEADER ── */}
      <div className="et-page-header">
        <div>
          <h5 className="et-page-title">My Timesheets</h5>
          <nav className="et-breadcrumb">
            <Link to="/">Home</Link>
            <i className="bi bi-chevron-right" />
            <span>Employee</span>
            <i className="bi bi-chevron-right" />
            <span>Timesheets</span>
          </nav>
        </div>
        <button className="et-add-btn" onClick={openModal}>
          <i className="bi bi-plus-lg" /> Add Timesheet
        </button>
      </div>

      {/* ── CARD ── */}
      <div className="et-card">
        {/* Toolbar */}
        <div className="et-toolbar">
          <div className="et-search-wrap">
            <i className="bi bi-search et-search-icon" />
            <input
              className="et-search"
              type="text"
              placeholder="Search by task, project, or status…"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            />
            {searchText && (
              <button className="et-search-clear" onClick={() => setSearchText("")}>
                <i className="bi bi-x" />
              </button>
            )}
          </div>
          <span className="et-count">{filtered.length} records</span>
        </div>

        {/* Table */}
        <div className="et-table-wrap">
          <table className="et-table">
            <thead>
              <tr>
                <th className="et-th-sm">#</th>
                {[
                  { key: "timesheet_date", label: "Date" },
                  { key: "project_name",   label: "Project" },
                  { key: "task_name",      label: "Task" },
                  { key: "task_status",    label: "Status" },
                  { key: "man_hrs",        label: "Hours" },
                ].map(({ key, label }) => (
                  <th key={label} className="et-th-sort" onClick={() => handleSort(key)}>
                    {label} <SortIcon field={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="et-state-cell">
                  <div className="et-loading"><i className="bi bi-arrow-repeat et-spin" /> Loading timesheets…</div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="et-state-cell">
                  <div className="et-empty"><i className="bi bi-clock-history" /><span>No timesheets found</span></div>
                </td></tr>
              ) : paginated.map((row, idx) => {
                const sc = statusConfig[(row.task_status || "").toLowerCase()];
                return (
                  <tr key={row.timesheet_id || idx} className="et-tr">
                    <td className="et-td-muted et-center">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="et-td-muted et-nowrap">
                      {row.timesheet_date
                        ? new Date(row.timesheet_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td>
                      {row.project_name
                        ? <span className="et-project-pill">{row.project_name}</span>
                        : <span className="et-td-muted">—</span>}
                    </td>
                    <td className="et-task-cell" title={row.task_name}>{row.task_name || "—"}</td>
                    <td>
                      <span
                        className="et-status-pill"
                        style={sc
                          ? { background: sc.bg, color: sc.color, borderColor: sc.border }
                          : { background: "#F3F4F6", color: "#6B7280", borderColor: "#D1D5DB" }}
                      >
                        {sc ? sc.label : (row.task_status || "Pending")}
                      </span>
                    </td>
                    <td>
                      <span className="et-hrs-pill">
                        <i className="bi bi-stopwatch" />{row.man_hrs || 0} hrs
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="et-pagination">
            <span className="et-page-info">
              Page {page} of {totalPages} · {filtered.length} results
            </span>
            <div className="et-page-btns">
              <button className="et-page-btn" disabled={page === 1} onClick={() => setPage(1)}><i className="bi bi-chevron-double-left" /></button>
              <button className="et-page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}><i className="bi bi-chevron-left" /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={p} className={`et-page-btn ${p === page ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                );
              })}
              <button className="et-page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}><i className="bi bi-chevron-right" /></button>
              <button className="et-page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}><i className="bi bi-chevron-double-right" /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── ADD TIMESHEET MODAL ── */}
      {showModal && (
        <>
          <div className="et-modal-overlay" onClick={() => setShowModal(false)} />
          <div className="et-modal-wrap">
            <div className="et-modal">
              <div className="et-modal-header">
                <div className="et-modal-header-left">
                  <span className="et-modal-badge">
                    <i className="bi bi-plus-circle" /> New
                  </span>
                  <h6 className="et-modal-title">Add Timesheet</h6>
                </div>
                <button className="et-modal-close" onClick={() => setShowModal(false)}><i className="bi bi-x-lg" /></button>
              </div>

              <div className="et-modal-body">
                {/* 8-hour meter */}
                {form.date && (
                  <div className="et-hrs-meter">
                    <div className="et-hrs-meter-top">
                      <span className="et-hrs-meter-label">
                        Hours used on {new Date(form.date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </span>
                      <span className="et-hrs-meter-val" style={{ color: hoursRemaining <= 0 ? "#DC2626" : hoursRemaining <= 2 ? "#D97706" : "#059669" }}>
                        {hoursUsedOnDate} / 8 hrs
                      </span>
                    </div>
                    <div className="et-hrs-bar-bg">
                      <div
                        className="et-hrs-bar-fill"
                        style={{
                          width: `${Math.min(100, (hoursUsedOnDate / 8) * 100)}%`,
                          background: hoursRemaining <= 0 ? "#DC2626" : hoursRemaining <= 2 ? "#D97706" : "#059669",
                        }}
                      />
                    </div>
                    {hoursRemaining <= 0
                      ? <p className="et-hrs-warning">No hours remaining for this date.</p>
                      : <p className="et-hrs-hint">{hoursRemaining} hr{hoursRemaining !== 1 ? "s" : ""} remaining</p>}
                  </div>
                )}

                {/* Error */}
                {formError && (
                  <div className="et-form-error">
                    <i className="bi bi-exclamation-circle" /> {formError}
                  </div>
                )}

                <div className="et-field">
                  <label className="et-label">Date <span className="et-required">*</span></label>
                  <input
                    className="et-input"
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div className="et-field">
                  <label className="et-label">Project</label>
                  <div className="et-select-wrap">
                    <i className="bi bi-folder2 et-select-icon" />
                    <select className="et-select" name="project" value={form.project} onChange={handleChange}>
                      <option value="">— Select Project —</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.project_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="et-field">
                  <label className="et-label">Task <span className="et-required">*</span></label>
                  <div className="et-select-wrap">
                    <i className="bi bi-check2-square et-select-icon" />
                    <select className="et-select" name="task" value={form.task} onChange={handleChange} disabled={!form.project}>
                      <option value="">— Select Task —</option>
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>{t.task}</option>
                      ))}
                    </select>
                  </div>
                  {!form.project && <p className="et-field-hint">Select a project first to load tasks.</p>}
                </div>

                <div className="et-field">
                  <label className="et-label">Man Hours <span className="et-required">*</span></label>
                  <div className="et-hrs-options">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => {
                      const wouldExceed = hoursUsedOnDate + h > 8;
                      return (
                        <button
                          key={h}
                          type="button"
                          disabled={wouldExceed}
                          className={`et-hrs-btn ${form.man_hrs == h ? "active" : ""} ${wouldExceed ? "disabled" : ""}`}
                          onClick={() => !wouldExceed && setForm((prev) => ({ ...prev, man_hrs: h }))}
                        >
                          {h}h
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="et-modal-footer">
                <button className="et-btn et-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="et-btn et-btn-primary" onClick={handleSave}>
                  <i className="bi bi-send" /> Save Timesheet
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
  .et-toast {
    position: fixed; top: 20px; right: 20px; z-index: 999;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: var(--radius-lg);
    font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12); animation: et-fade-in 0.2s ease;
  }
  .et-toast-success { background: #ECFDF5; color: #059669; border: 1px solid #6ee7b7; }
  .et-toast-error   { background: #FEF2F2; color: #DC2626; border: 1px solid #fca5a5; }
  .et-toast-close { margin-left: 6px; background: none; border: none; cursor: pointer; color: inherit; font-size: 15px; display: flex; align-items: center; }

  /* Page header */
  .et-page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
  }
  .et-page-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; letter-spacing: -0.01em; }
  .et-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
  .et-breadcrumb a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .et-breadcrumb a:hover { text-decoration: underline; }
  .et-breadcrumb i { font-size: 10px; opacity: 0.5; }
  .et-add-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 9px 18px; background: var(--primary); color: #fff;
    border: none; border-radius: var(--radius); font-size: 13px; font-weight: 600;
    cursor: pointer; transition: background 0.15s, transform 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .et-add-btn:hover { background: var(--primary-dark); transform: translateY(-1px); }

  /* Card */
  .et-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow); overflow: hidden; }

  /* Toolbar */
  .et-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border); gap: 12px; }
  .et-search-wrap { position: relative; display: flex; align-items: center; flex: 1; max-width: 360px; }
  .et-search-icon { position: absolute; left: 11px; color: var(--text-muted); font-size: 13px; pointer-events: none; }
  .et-search {
    width: 100%; padding: 8px 32px 8px 34px;
    border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 13px; color: var(--text-primary); background: var(--bg);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .et-search:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); background: var(--surface); }
  .et-search-clear { position: absolute; right: 8px; background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px; padding: 2px; display: flex; align-items: center; }
  .et-search-clear:hover { color: var(--text-primary); }
  .et-count { font-size: 12px; font-weight: 600; color: var(--text-muted); background: var(--bg); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; white-space: nowrap; }

  /* Table */
  .et-table-wrap { overflow-x: auto; }
  .et-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .et-table thead tr { border-bottom: 2px solid var(--border); }
  .et-table th { padding: 10px 14px; font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; text-align: left; white-space: nowrap; background: var(--surface); }
  .et-th-sm { width: 48px; text-align: center; }
  .et-th-sort { cursor: pointer; user-select: none; }
  .et-th-sort:hover { color: var(--primary); }
  .et-sort-icon { margin-left: 4px; font-size: 9px; }
  .et-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .et-tr { transition: background 0.1s; }
  .et-tr:hover td { background: #fafbff; }
  .et-tr:last-child td { border-bottom: none; }
  .et-td-muted { color: var(--text-secondary); font-size: 12.5px; }
  .et-center { text-align: center; }
  .et-nowrap { white-space: nowrap; }
  .et-task-cell { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); font-weight: 500; }

  /* Chips */
  .et-project-pill { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 20px; background: #EEF2FF; color: #5048E5; white-space: nowrap; }
  .et-status-pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid; white-space: nowrap; }
  .et-hrs-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; padding: 3px 9px; background: #FFF7ED; color: #C2410C; border-radius: 20px; border: 1px solid #FED7AA; white-space: nowrap; }
  .et-hrs-pill i { font-size: 11px; }

  /* States */
  .et-state-cell { padding: 0 !important; border: none !important; }
  .et-loading, .et-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 56px 20px; color: var(--text-muted); font-size: 13px; }
  .et-empty i { font-size: 28px; opacity: 0.35; }
  .et-spin { animation: et-spin 0.7s linear infinite; display: inline-block; }
  @keyframes et-spin { to { transform: rotate(360deg); } }

  /* Pagination */
  .et-pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 10px; }
  .et-page-info { font-size: 12px; color: var(--text-muted); }
  .et-page-btns { display: flex; gap: 4px; }
  .et-page-btn { width: 30px; height: 30px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; font-family: 'Plus Jakarta Sans', sans-serif; }
  .et-page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
  .et-page-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
  .et-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* Modal */
  .et-modal-overlay { position: fixed; inset: 0; background: rgba(17,24,39,0.45); backdrop-filter: blur(2px); z-index: 200; }
  .et-modal-wrap { position: fixed; inset: 0; z-index: 201; display: flex; align-items: center; justify-content: flex-end; padding: 16px; pointer-events: none; }
  .et-modal {
    width: 440px; max-width: 100%; max-height: calc(100vh - 32px);
    background: var(--surface); border-radius: var(--radius-lg);
    box-shadow: 0 20px 60px rgba(0,0,0,0.18);
    display: flex; flex-direction: column; overflow: hidden;
    pointer-events: all; animation: et-slide-in 0.22s ease;
  }
  @keyframes et-slide-in { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
  .et-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .et-modal-header-left { display: flex; flex-direction: column; gap: 5px; }
  .et-modal-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0; }
  .et-modal-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; padding: 2px 9px; border-radius: 20px; background: #ECFDF5; color: #059669; width: fit-content; }
  .et-modal-close { width: 30px; height: 30px; border: 1px solid var(--border); border-radius: var(--radius); background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); font-size: 13px; transition: all 0.15s; }
  .et-modal-close:hover { background: #FEF2F2; border-color: #fca5a5; color: #DC2626; }
  .et-modal-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
  .et-modal-body::-webkit-scrollbar { width: 4px; }
  .et-modal-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
  .et-modal-footer { display: flex; align-items: center; justify-content: flex-end; padding: 14px 20px; border-top: 1px solid var(--border); flex-shrink: 0; gap: 8px; }

  /* Form fields */
  .et-field { display: flex; flex-direction: column; gap: 6px; }
  .et-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
  .et-required { color: #DC2626; }
  .et-input, .et-select {
    width: 100%; padding: 9px 12px;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface); font-size: 13px; color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .et-input:focus, .et-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }
  .et-input:disabled, .et-select:disabled { background: var(--bg); color: var(--text-muted); cursor: not-allowed; }
  .et-select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;
  }
  .et-select-wrap { position: relative; display: flex; align-items: center; }
  .et-select-icon { position: absolute; left: 11px; color: var(--text-muted); font-size: 13px; pointer-events: none; z-index: 1; }
  .et-select-wrap .et-select { padding-left: 32px; }
  .et-field-hint { font-size: 11.5px; color: var(--text-muted); margin: 0; }
  .et-form-error { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #FEF2F2; color: #DC2626; border: 1px solid #fca5a5; border-radius: var(--radius); font-size: 12.5px; font-weight: 600; }

  /* Hours picker */
  .et-hrs-options { display: flex; gap: 6px; flex-wrap: wrap; }
  .et-hrs-btn {
    width: 44px; height: 36px; border-radius: var(--radius);
    border: 1px solid var(--border); background: var(--bg);
    color: var(--text-secondary); font-size: 12.5px; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .et-hrs-btn:hover:not(.disabled) { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }
  .et-hrs-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
  .et-hrs-btn.disabled { opacity: 0.35; cursor: not-allowed; }

  /* Hours meter */
  .et-hrs-meter { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; display: flex; flex-direction: column; gap: 7px; }
  .et-hrs-meter-top { display: flex; align-items: center; justify-content: space-between; }
  .et-hrs-meter-label { font-size: 11.5px; color: var(--text-secondary); font-weight: 500; }
  .et-hrs-meter-val { font-size: 12px; font-weight: 700; }
  .et-hrs-bar-bg { width: 100%; height: 6px; background: var(--border); border-radius: 6px; overflow: hidden; }
  .et-hrs-bar-fill { height: 100%; border-radius: 6px; transition: width 0.3s ease, background 0.3s ease; }
  .et-hrs-hint { font-size: 11px; color: var(--text-muted); margin: 0; }
  .et-hrs-warning { font-size: 11px; color: #DC2626; font-weight: 600; margin: 0; }

  /* Buttons */
  .et-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; }
  .et-btn-primary { background: var(--primary); color: #fff; }
  .et-btn-primary:hover { background: var(--primary-dark); }
  .et-btn-ghost { background: transparent; border-color: var(--border); color: var(--text-secondary); }
  .et-btn-ghost:hover { background: var(--bg); }

  @keyframes et-fade-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
`;
