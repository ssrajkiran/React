import { useEffect, useState, useMemo } from "react";
import AppLayoutImport from "../../components/layout/AppLayout";
import api from "../../api";
import { Link } from "react-router-dom";
import SelectImport from "react-select";

const AppLayout = AppLayoutImport?.default || AppLayoutImport;
const Select = SelectImport?.default || SelectImport;

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editFormData, setEditFormData] = useState({ task: "", assigned_to: [], project_id: null, status: "In Progress" });
  const [createFormData, setCreateFormData] = useState({ project_id: null, newProjectName: "", tasks: [{ task: "", assigned_to: [] }] });
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const PAGE_SIZE = 10;

  // Auth
  const token = localStorage.getItem("token");
  let isAdmin = false, loggedInUserId = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      isAdmin = payload.role === "admin";
      loggedInUserId = payload.id;
    } catch (e) {}
  }

  // ================= FETCH =================
  useEffect(() => { loadTasks(); fetchUsers(); fetchProjects(); }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tasks-project");
      setTasks(res.data.tasks || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try { const res = await api.get("/list/users"); setUsers(res.data || []); } catch (e) {}
  };

  const fetchProjects = async () => {
    try { const res = await api.get("/tasks-project/projects"); setProjects(res.data || []); } catch (e) {}
  };

  // ================= EDIT =================
  const openEditModal = (task) => {
    setSelectedTask(task);
    const assignedIds = task.assigned_to ? task.assigned_to.split(",").map((id) => parseInt(id.trim())) : [];
    const selectedUsers = users.filter((u) => assignedIds.includes(u.id)).map((u) => ({ value: u.id, label: u.name }));
    setEditFormData({ task: task.task, assigned_to: selectedUsers, project_id: task.project_id, status: task.status || "In Progress" });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!selectedTask) return;
    try {
      await api.put(`/tasks-project/${selectedTask.id}`, {
        task: editFormData.task,
        project_id: selectedTask.project_id,
        assigned_to: editFormData.assigned_to.map((u) => u.value).join(","),
        status: editFormData.status,
      });
      await loadTasks();
      setShowEditModal(false);
    } catch (err) { alert("Failed to update task."); }
  };

  // ================= CREATE =================
  const handleAddTaskRow = () =>
    setCreateFormData({ ...createFormData, tasks: [...createFormData.tasks, { task: "", assigned_to: [] }] });

  const handleRemoveTaskRow = (idx) =>
    setCreateFormData({ ...createFormData, tasks: createFormData.tasks.filter((_, i) => i !== idx) });

  const handleCreateTaskChange = (index, field, value) => {
    const updated = [...createFormData.tasks];
    updated[index][field] = value;
    setCreateFormData({ ...createFormData, tasks: updated });
  };

  const handleCreateSave = async () => {
    try {
      await api.post("/tasks-project/bulk", {
        project_name: isAddingProject ? createFormData.newProjectName : undefined,
        project_id: !isAddingProject ? createFormData.project_id : undefined,
        tasks: createFormData.tasks.map((t) => ({ task: t.task, assigned_to: t.assigned_to.map((u) => u.value) })),
      });
      await loadTasks();
      setShowCreateModal(false);
      setCreateFormData({ project_id: null, newProjectName: "", tasks: [{ task: "", assigned_to: [] }] });
      setIsAddingProject(false);
    } catch (err) { alert("Failed to create tasks."); }
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    try {
      await api.delete(`/tasks-project/${id}`);
      setTasks(tasks.filter((t) => t.id !== id));
      setDeleteConfirm(null);
    } catch (err) { alert("Failed to delete task."); }
  };

  // ================= TABLE =================
  const userOptions = isAdmin
    ? users.map((u) => ({ value: u.id, label: u.name }))
    : users.filter((u) => u.id === loggedInUserId).map((u) => ({ value: u.id, label: u.name }));

  const filtered = useMemo(() => {
    const t = searchText.toLowerCase();
    return tasks.filter((task) =>
      !t ||
      (task.task || "").toLowerCase().includes(t) ||
      (task.project_name || "").toLowerCase().includes(t) ||
      (task.assigned_to_names || "").toLowerCase().includes(t) ||
      (task.created_by_name || "").toLowerCase().includes(t)
    );
  }, [tasks, searchText]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === "created_at") { va = new Date(va); vb = new Date(vb); }
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

  const statusConfig = {
    "In Progress": { color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
    "Completed":   { color: "#059669", bg: "#ECFDF5", border: "#6ee7b7" },
  };

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* ── PAGE HEADER ── */}
      <div className="tl-page-header">
        <div>
          <h5 className="tl-page-title">Task List</h5>
          <nav className="tl-breadcrumb">
            <Link to="/admin/dashboard">Dashboard</Link>
            <i className="bi bi-chevron-right" />
            <span>Tasks</span>
          </nav>
        </div>
        <button className="tl-add-btn" onClick={() => { setCreateFormData({ project_id: null, newProjectName: "", tasks: [{ task: "", assigned_to: [] }] }); setIsAddingProject(false); setShowCreateModal(true); }}>
          <i className="bi bi-plus-lg" /> Add Task
        </button>
      </div>

      {/* ── CARD ── */}
      <div className="tl-card">
        {/* Toolbar */}
        <div className="tl-toolbar">
          <div className="tl-search-wrap">
            <i className="bi bi-search tl-search-icon" />
            <input
              className="tl-search"
              type="text"
              placeholder="Search tasks, projects, assignees…"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            />
            {searchText && (
              <button className="tl-search-clear" onClick={() => setSearchText("")}>
                <i className="bi bi-x" />
              </button>
            )}
          </div>
          <span className="tl-count">{filtered.length} tasks</span>
        </div>

        {/* Table */}
        <div className="tl-table-wrap">
          <table className="tl-table">
            <thead>
              <tr>
                <th className="tl-th-sm">#</th>
                {[
                  { key: "created_at", label: "Date" },
                  { key: "project_name", label: "Project" },
                  { key: "task", label: "Task" },
                  { key: null, label: "Assigned To" },
                  { key: "created_by_name", label: "Created By" },
                  { key: "total_man_hrs", label: "Man Hrs" },
                  { key: "status", label: "Status" },
                ].map(({ key, label }) => (
                  <th
                    key={label}
                    className={key ? "tl-th-sort" : ""}
                    onClick={key ? () => handleSort(key) : undefined}
                  >
                    {label}
                    {key && sortField === key && (
                      <i className={`bi bi-chevron-${sortOrder === "asc" ? "up" : "down"} tl-sort-icon`} />
                    )}
                  </th>
                ))}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="tl-state-cell">
                  <div className="tl-loading"><i className="bi bi-arrow-repeat tl-spin" /> Loading tasks…</div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9} className="tl-state-cell">
                  <div className="tl-empty"><i className="bi bi-inbox" /><span>No tasks found</span></div>
                </td></tr>
              ) : paginated.map((task, idx) => {
                const assignees = task.assigned_to_names ? task.assigned_to_names.split(",").map((u) => u.trim()) : [];
                const canEdit = isAdmin || task.created_by === loggedInUserId;
                const sc = statusConfig[task.status] || statusConfig["In Progress"];
                return (
                  <tr key={task.id} className="tl-tr">
                    <td className="tl-td-muted">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="tl-td-muted tl-nowrap">{new Date(task.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td>
                      <span className="tl-project-pill">{task.project_name || "—"}</span>
                    </td>
                    <td className="tl-task-cell" title={task.task}>{task.task}</td>
                    <td>
                      <div className="tl-assignees">
                        {assignees.slice(0, 3).map((name, i) => (
                          <span key={i} className="tl-assignee-chip">{name}</span>
                        ))}
                        {assignees.length > 3 && (
                          <span className="tl-assignee-more">+{assignees.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="tl-td-muted">{task.created_by_name || "—"}</td>
                    <td className="tl-td-muted tl-nowrap">{task.total_man_hrs || 0} hrs</td>
                    <td>
                      <span className="tl-status-pill" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                        {task.status || "In Progress"}
                      </span>
                    </td>
                    <td>
                      {canEdit && (
                        <div className="tl-actions">
                          <button className="tl-action-btn tl-action-edit" onClick={() => openEditModal(task)} title="Edit">
                            <i className="bi bi-pencil" />
                          </button>
                          <button className="tl-action-btn tl-action-delete" onClick={() => setDeleteConfirm(task)} title="Delete">
                            <i className="bi bi-trash" />
                          </button>
                        </div>
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
          <div className="tl-pagination">
            <span className="tl-page-info">
              Page {page} of {totalPages} · {filtered.length} results
            </span>
            <div className="tl-page-btns">
              <button className="tl-page-btn" disabled={page === 1} onClick={() => setPage(1)}><i className="bi bi-chevron-double-left" /></button>
              <button className="tl-page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}><i className="bi bi-chevron-left" /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={p} className={`tl-page-btn ${p === page ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                );
              })}
              <button className="tl-page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}><i className="bi bi-chevron-right" /></button>
              <button className="tl-page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}><i className="bi bi-chevron-double-right" /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteConfirm && (
        <>
          <div className="tl-modal-overlay" onClick={() => setDeleteConfirm(null)} />
          <div className="tl-modal-wrap tl-modal-center">
            <div className="tl-modal tl-modal-sm">
              <div className="tl-modal-header">
                <div className="tl-modal-header-left">
                  <h6 className="tl-modal-title">Delete Task</h6>
                </div>
                <button className="tl-modal-close" onClick={() => setDeleteConfirm(null)}><i className="bi bi-x-lg" /></button>
              </div>
              <div className="tl-modal-body">
                <div className="tl-delete-warn">
                  <div className="tl-delete-icon"><i className="bi bi-exclamation-triangle" /></div>
                  <p className="tl-delete-msg">Are you sure you want to delete this task?</p>
                  <p className="tl-delete-task">"{deleteConfirm.task}"</p>
                </div>
              </div>
              <div className="tl-modal-footer">
                <button className="tl-btn tl-btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <div className="tl-footer-right">
                  <button className="tl-btn tl-btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>
                    <i className="bi bi-trash" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── EDIT MODAL ── */}
      {showEditModal && selectedTask && (
        <>
          <div className="tl-modal-overlay" onClick={() => setShowEditModal(false)} />
          <div className="tl-modal-wrap">
            <div className="tl-modal">
              <div className="tl-modal-header">
                <div className="tl-modal-header-left">
                  <span className="tl-modal-badge" style={{ background: "#EEF2FF", color: "#5048E5" }}>
                    <i className="bi bi-pencil-square" /> Edit
                  </span>
                  <h6 className="tl-modal-title">Edit Task</h6>
                </div>
                <button className="tl-modal-close" onClick={() => setShowEditModal(false)}><i className="bi bi-x-lg" /></button>
              </div>

              <div className="tl-modal-body">
                <div className="tl-field">
                  <label className="tl-label">Date</label>
                  <input className="tl-input" value={new Date(selectedTask.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} disabled />
                </div>
                <div className="tl-row-2">
                  <div className="tl-field">
                    <label className="tl-label">Project</label>
                    <input className="tl-input" value={selectedTask.project_name} disabled />
                  </div>
                  <div className="tl-field">
                    <label className="tl-label">Created By</label>
                    <input className="tl-input" value={selectedTask.created_by_name} disabled />
                  </div>
                </div>
                <div className="tl-field">
                  <label className="tl-label">Task Description</label>
                  <textarea
                    className="tl-textarea"
                    rows={4}
                    value={editFormData.task}
                    onChange={(e) => setEditFormData({ ...editFormData, task: e.target.value })}
                  />
                </div>
                <div className="tl-field">
                  <label className="tl-label">Assigned To</label>
                  <Select
                    isMulti
                    options={userOptions}
                    value={editFormData.assigned_to}
                    onChange={(sel) => setEditFormData({ ...editFormData, assigned_to: sel })}
                    placeholder="Select users…"
                    styles={selectStyles}
                  />
                </div>
                <div className="tl-field">
                  <label className="tl-label">Status</label>
                  <div className="tl-radio-group">
                    {["In Progress", "Completed"].map((val) => {
                      const sc = statusConfig[val];
                      return (
                        <label
                          key={val}
                          className={`tl-radio-btn ${editFormData.status === val ? "active" : ""}`}
                          style={editFormData.status === val ? { background: sc.bg, color: sc.color, borderColor: sc.border } : {}}
                        >
                          <input type="radio" name="edit_status" value={val} checked={editFormData.status === val}
                            onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })} />
                          {val}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="tl-modal-footer">
                <button className="tl-btn tl-btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
                <div className="tl-footer-right">
                  <button className="tl-btn tl-btn-primary" onClick={handleEditSave}>
                    <i className="bi bi-check-lg" /> Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── CREATE MODAL ── */}
      {showCreateModal && (
        <>
          <div className="tl-modal-overlay" onClick={() => setShowCreateModal(false)} />
          <div className="tl-modal-wrap">
            <div className="tl-modal tl-modal-wide">
              <div className="tl-modal-header">
                <div className="tl-modal-header-left">
                  <span className="tl-modal-badge" style={{ background: "#ECFDF5", color: "#059669" }}>
                    <i className="bi bi-plus-circle" /> New
                  </span>
                  <h6 className="tl-modal-title">Create Tasks</h6>
                </div>
                <button className="tl-modal-close" onClick={() => setShowCreateModal(false)}><i className="bi bi-x-lg" /></button>
              </div>

              <div className="tl-modal-body">
                <div className="tl-row-2">
                  <div className="tl-field">
                    <label className="tl-label">Date</label>
                    <input className="tl-input" value={new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} disabled />
                  </div>
                  <div className="tl-field">
                    <label className="tl-label">Project</label>
                    <div className="tl-project-row">
                      <select
                        className="tl-input tl-select"
                        value={createFormData.project_id || ""}
                        onChange={(e) => setCreateFormData({ ...createFormData, project_id: parseInt(e.target.value) })}
                        disabled={isAddingProject}
                      >
                        <option value="">— Select Project —</option>
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                      </select>
                      <button
                        className={`tl-toggle-new-btn ${isAddingProject ? "cancel" : ""}`}
                        onClick={() => setIsAddingProject(!isAddingProject)}
                      >
                        {isAddingProject ? <i className="bi bi-x" /> : <i className="bi bi-plus" />}
                      </button>
                    </div>
                    {isAddingProject && (
                      <input
                        className="tl-input tl-mt"
                        type="text"
                        placeholder="Enter new project name…"
                        value={createFormData.newProjectName}
                        onChange={(e) => setCreateFormData({ ...createFormData, newProjectName: e.target.value })}
                      />
                    )}
                  </div>
                </div>

                <div className="tl-tasks-section">
                  <div className="tl-tasks-header">
                    <span className="tl-label">Tasks</span>
                    <button className="tl-add-row-btn" onClick={handleAddTaskRow}>
                      <i className="bi bi-plus" /> Add Task
                    </button>
                  </div>

                  {createFormData.tasks.map((t, idx) => (
                    <div key={idx} className="tl-task-block">
                      <div className="tl-task-block-header">
                        <span className="tl-task-num">Task {idx + 1}</span>
                        {createFormData.tasks.length > 1 && (
                          <button className="tl-remove-btn" onClick={() => handleRemoveTaskRow(idx)}>
                            <i className="bi bi-x" />
                          </button>
                        )}
                      </div>
                      <div className="tl-field">
                        <textarea
                          className="tl-textarea"
                          rows={3}
                          placeholder="Describe the task…"
                          value={t.task}
                          onChange={(e) => handleCreateTaskChange(idx, "task", e.target.value)}
                        />
                      </div>
                      <div className="tl-field">
                        <label className="tl-label tl-label-sm">Assigned To</label>
                        <Select
                          isMulti
                          options={userOptions}
                          value={t.assigned_to}
                          onChange={(sel) => handleCreateTaskChange(idx, "assigned_to", sel)}
                          placeholder="Select users…"
                          styles={selectStyles}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tl-modal-footer">
                <button className="tl-btn tl-btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <div className="tl-footer-right">
                  <button className="tl-btn tl-btn-primary" onClick={handleCreateSave}>
                    <i className="bi bi-send" /> Save Tasks
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

// ── React Select custom styles matching design system ──
const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? "#5048E5" : "#E5E7EB",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(80,72,229,0.1)" : "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    minHeight: "38px",
    "&:hover": { borderColor: "#5048E5" },
  }),
  menu: (base) => ({ ...base, borderRadius: "10px", fontSize: "13px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? "#5048E5" : state.isFocused ? "#EEF2FF" : "transparent",
    color: state.isSelected ? "#fff" : "#111827",
    fontWeight: state.isSelected ? 600 : 400,
  }),
  multiValue: (base) => ({ ...base, backgroundColor: "#EEF2FF", borderRadius: "6px" }),
  multiValueLabel: (base) => ({ ...base, color: "#5048E5", fontWeight: 600, fontSize: "12px" }),
  multiValueRemove: (base) => ({ ...base, color: "#5048E5", "&:hover": { backgroundColor: "#5048E5", color: "#fff" } }),
  placeholder: (base) => ({ ...base, color: "#9CA3AF", fontSize: "13px" }),
};

// ================= STYLES =================
const styles = `
  /* Page header */
  .tl-page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
  }
  .tl-page-title {
    font-size: 15px; font-weight: 700; color: var(--text-primary);
    margin: 0 0 4px; letter-spacing: -0.01em;
  }
  .tl-breadcrumb {
    display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted);
  }
  .tl-breadcrumb a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .tl-breadcrumb a:hover { text-decoration: underline; }
  .tl-breadcrumb i { font-size: 10px; opacity: 0.5; }
  .tl-add-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 9px 18px; background: var(--primary); color: #fff;
    border: none; border-radius: var(--radius); font-size: 13px; font-weight: 600;
    cursor: pointer; transition: background 0.15s, transform 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .tl-add-btn:hover { background: var(--primary-dark); transform: translateY(-1px); }

  /* Card */
  .tl-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow); overflow: hidden;
  }

  /* Toolbar */
  .tl-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; border-bottom: 1px solid var(--border); gap: 12px;
  }
  .tl-search-wrap {
    position: relative; display: flex; align-items: center; flex: 1; max-width: 360px;
  }
  .tl-search-icon {
    position: absolute; left: 11px; color: var(--text-muted); font-size: 13px; pointer-events: none;
  }
  .tl-search {
    width: 100%; padding: 8px 32px 8px 34px;
    border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 13px; color: var(--text-primary); background: var(--bg);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .tl-search:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); background: var(--surface); }
  .tl-search-clear {
    position: absolute; right: 8px; background: none; border: none;
    color: var(--text-muted); cursor: pointer; font-size: 14px; padding: 2px;
    display: flex; align-items: center; justify-content: center;
  }
  .tl-search-clear:hover { color: var(--text-primary); }
  .tl-count {
    font-size: 12px; font-weight: 600; color: var(--text-muted);
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 20px; padding: 3px 10px; white-space: nowrap;
  }

  /* Table */
  .tl-table-wrap { overflow-x: auto; }
  .tl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .tl-table thead tr { border-bottom: 2px solid var(--border); }
  .tl-table th {
    padding: 10px 14px; font-size: 10.5px; font-weight: 700;
    color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em;
    text-align: left; white-space: nowrap; background: var(--surface);
  }
  .tl-th-sm { width: 48px; text-align: center; }
  .tl-th-sort { cursor: pointer; user-select: none; }
  .tl-th-sort:hover { color: var(--primary); }
  .tl-sort-icon { margin-left: 4px; font-size: 9px; }
  .tl-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .tl-tr { transition: background 0.1s; }
  .tl-tr:hover td { background: #fafbff; }
  .tl-tr:last-child td { border-bottom: none; }
  .tl-td-muted { color: var(--text-secondary); font-size: 12.5px; }
  .tl-nowrap { white-space: nowrap; }
  .tl-task-cell { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); font-weight: 500; }

  /* Chips */
  .tl-project-pill {
    display: inline-block; font-size: 11.5px; font-weight: 700;
    padding: 3px 10px; border-radius: 20px;
    background: #EEF2FF; color: #5048E5; white-space: nowrap;
  }
  .tl-assignees { display: flex; flex-wrap: wrap; gap: 4px; }
  .tl-assignee-chip {
    font-size: 11px; font-weight: 600; padding: 2px 8px;
    background: #ECFEFF; color: #0891B2; border-radius: 20px; white-space: nowrap;
  }
  .tl-assignee-more {
    font-size: 11px; font-weight: 700; padding: 2px 7px;
    background: var(--bg); color: var(--text-muted); border-radius: 20px;
    border: 1px solid var(--border);
  }
  .tl-status-pill {
    display: inline-block; font-size: 11px; font-weight: 700;
    padding: 3px 10px; border-radius: 20px; border: 1px solid; white-space: nowrap;
  }

  /* Actions */
  .tl-actions { display: flex; gap: 6px; }
  .tl-action-btn {
    width: 30px; height: 30px; border-radius: var(--radius);
    border: 1px solid; display: flex; align-items: center; justify-content: center;
    font-size: 12px; cursor: pointer; transition: all 0.15s;
  }
  .tl-action-edit { background: #EEF2FF; color: #5048E5; border-color: #c7d2fe; }
  .tl-action-edit:hover { background: #5048E5; color: #fff; }
  .tl-action-delete { background: #FEF2F2; color: #DC2626; border-color: #fca5a5; }
  .tl-action-delete:hover { background: #DC2626; color: #fff; }

  /* States */
  .tl-state-cell { padding: 0 !important; border: none !important; }
  .tl-loading, .tl-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; padding: 56px 20px; color: var(--text-muted); font-size: 13px;
  }
  .tl-empty i { font-size: 28px; opacity: 0.35; }
  .tl-spin { animation: tl-spin 0.7s linear infinite; display: inline-block; }
  @keyframes tl-spin { to { transform: rotate(360deg); } }

  /* Pagination */
  .tl-pagination {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 20px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 10px;
  }
  .tl-page-info { font-size: 12px; color: var(--text-muted); }
  .tl-page-btns { display: flex; gap: 4px; }
  .tl-page-btn {
    width: 30px; height: 30px; border-radius: var(--radius); border: 1px solid var(--border);
    background: var(--surface); color: var(--text-secondary);
    font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .tl-page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
  .tl-page-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
  .tl-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* ── MODALS ── */
  .tl-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(17,24,39,0.45); backdrop-filter: blur(2px); z-index: 200;
  }
  .tl-modal-wrap {
    position: fixed; inset: 0; z-index: 201;
    display: flex; align-items: center; justify-content: flex-end;
    padding: 16px; pointer-events: none;
  }
  .tl-modal-center { justify-content: center; }
  .tl-modal {
    width: 460px; max-width: 100%; max-height: calc(100vh - 32px);
    background: var(--surface); border-radius: var(--radius-lg);
    box-shadow: 0 20px 60px rgba(0,0,0,0.18);
    display: flex; flex-direction: column; overflow: hidden;
    pointer-events: all; animation: tl-slide-in 0.22s ease;
  }
  .tl-modal-sm { width: 380px; }
  .tl-modal-wide { width: 560px; }
  @keyframes tl-slide-in {
    from { opacity: 0; transform: translateX(24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .tl-modal-center .tl-modal {
    animation: tl-fade-in 0.2s ease;
  }
  @keyframes tl-fade-in {
    from { opacity: 0; transform: scale(0.97); }
    to   { opacity: 1; transform: scale(1); }
  }

  .tl-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 20px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .tl-modal-header-left { display: flex; flex-direction: column; gap: 5px; }
  .tl-modal-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0; letter-spacing: -0.01em; }
  .tl-modal-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 10.5px; font-weight: 700; padding: 2px 9px;
    border-radius: 20px; width: fit-content; letter-spacing: 0.03em;
  }
  .tl-modal-close {
    width: 30px; height: 30px; border: 1px solid var(--border); border-radius: var(--radius);
    background: transparent; display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-muted); font-size: 13px; transition: all 0.15s; flex-shrink: 0;
  }
  .tl-modal-close:hover { background: #FEF2F2; border-color: #fca5a5; color: #DC2626; }

  .tl-modal-body {
    flex: 1; overflow-y: auto; padding: 20px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .tl-modal-body::-webkit-scrollbar { width: 4px; }
  .tl-modal-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

  .tl-modal-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; border-top: 1px solid var(--border); flex-shrink: 0; gap: 8px;
  }
  .tl-footer-right { display: flex; gap: 8px; margin-left: auto; }

  /* Form fields */
  .tl-field { display: flex; flex-direction: column; gap: 6px; }
  .tl-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .tl-label {
    font-size: 11px; font-weight: 700; color: var(--text-secondary);
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .tl-label-sm { font-size: 10.5px; }
  .tl-input, .tl-textarea, .tl-select {
    width: 100%; padding: 9px 12px;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface); font-size: 13px; color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .tl-input:focus, .tl-textarea:focus, .tl-select:focus {
    border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1);
  }
  .tl-input:disabled { background: var(--bg); color: var(--text-muted); cursor: default; }
  .tl-textarea { resize: none; line-height: 1.5; }
  .tl-select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; cursor: pointer;
  }
  .tl-select:disabled { background-color: var(--bg); color: var(--text-muted); cursor: default; }
  .tl-mt { margin-top: 8px; }

  /* Project row */
  .tl-project-row { display: flex; gap: 6px; }
  .tl-project-row .tl-select { flex: 1; }
  .tl-toggle-new-btn {
    width: 38px; height: 38px; border-radius: var(--radius); border: 1px solid #6ee7b7;
    background: #ECFDF5; color: #059669; font-size: 16px; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; flex-shrink: 0;
  }
  .tl-toggle-new-btn.cancel { background: #FEF2F2; border-color: #fca5a5; color: #DC2626; }
  .tl-toggle-new-btn:hover { filter: brightness(0.92); }

  /* Radio group */
  .tl-radio-group { display: flex; gap: 8px; flex-wrap: wrap; }
  .tl-radio-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 14px; border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 12.5px; font-weight: 500; color: var(--text-secondary);
    cursor: pointer; transition: all 0.15s; user-select: none;
  }
  .tl-radio-btn input[type="radio"] { display: none; }
  .tl-radio-btn.active { font-weight: 700; }

  /* Tasks section */
  .tl-tasks-section { display: flex; flex-direction: column; gap: 10px; }
  .tl-tasks-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 2px;
  }
  .tl-task-block {
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 14px; background: var(--bg); display: flex; flex-direction: column; gap: 10px;
  }
  .tl-task-block-header {
    display: flex; align-items: center; justify-content: space-between;
  }
  .tl-task-num { font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.06em; }
  .tl-add-row-btn {
    display: flex; align-items: center; gap: 5px;
    padding: 5px 12px; border: 1px solid #6ee7b7;
    background: #ECFDF5; color: #059669; border-radius: var(--radius);
    font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .tl-add-row-btn:hover { background: #059669; color: #fff; }
  .tl-remove-btn {
    width: 24px; height: 24px; border-radius: 6px;
    border: 1px solid #fca5a5; background: #FEF2F2; color: #DC2626;
    font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
  }
  .tl-remove-btn:hover { background: #DC2626; color: #fff; }

  /* Delete confirm */
  .tl-delete-warn { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 8px 0; text-align: center; }
  .tl-delete-icon { width: 52px; height: 52px; border-radius: 50%; background: #FEF2F2; color: #DC2626; font-size: 22px; display: flex; align-items: center; justify-content: center; }
  .tl-delete-msg { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0; }
  .tl-delete-task { font-size: 12.5px; color: var(--text-muted); margin: 0; max-width: 280px; overflow: hidden; text-overflow: ellipsis; }

  /* Buttons */
  .tl-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: var(--radius);
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: all 0.15s; border: 1px solid transparent;
    font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap;
  }
  .tl-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .tl-btn-primary { background: var(--primary); color: #fff; }
  .tl-btn-primary:hover:not(:disabled) { background: var(--primary-dark); }
  .tl-btn-ghost { background: transparent; border-color: var(--border); color: var(--text-secondary); }
  .tl-btn-ghost:hover { background: var(--bg); }
  .tl-btn-danger { background: #FEF2F2; color: #DC2626; border-color: #fca5a5; }
  .tl-btn-danger:hover:not(:disabled) { background: #DC2626; color: #fff; }
`;
