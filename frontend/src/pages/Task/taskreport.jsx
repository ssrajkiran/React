import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import AppLayout from "../../components/layout/AppLayout";

export default function TaskReport() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    project_id: "",
    assigned_to: "",
    status: "",
  });

  const [sortField, setSortField] = useState("project_name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const PAGE_SIZE = 10;

  // ================= FETCH =================
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tasks_report/report", { params: filters });
      const data = Array.isArray(res.data) ? res.data : [];
      setTasks(
        data.map((t) => ({
          project_name: t?.project_name || "-",
          task: t?.task || "-",
          status: t?.status || "Pending",
          assigned_to_names: t?.assigned_to_names || "-",
        }))
      );
    } catch (err) {
      console.error("Task fetch error:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get("/tasks_report/projects");
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch {
      setProjects([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/tasks_report/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchTasks();
    setPage(1);
  }, [filters]);

  const handleFilter = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleClearFilters = () => {
    setFilters({ project_id: "", assigned_to: "", status: "" });
    setSearchText("");
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // ================= TABLE LOGIC =================
  const filtered = useMemo(() => {
    const t = searchText.toLowerCase();
    return tasks.filter(
      (task) =>
        !t ||
        (task.task || "").toLowerCase().includes(t) ||
        (task.project_name || "").toLowerCase().includes(t) ||
        (task.assigned_to_names || "").toLowerCase().includes(t)
    );
  }, [tasks, searchText]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = (a[sortField] || "").toLowerCase();
      const vb = (b[sortField] || "").toLowerCase();
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
    Completed:     { color: "#059669", bg: "#ECFDF5", border: "#6ee7b7" },
    Pending:       { color: "#6B7280", bg: "#F3F4F6", border: "#D1D5DB" },
  };

  const SortIcon = ({ field }) =>
    sortField === field ? (
      <i className={`bi bi-chevron-${sortOrder === "asc" ? "up" : "down"} tr-sort-icon`} />
    ) : null;

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* ── PAGE HEADER ── */}
      <div className="tr-page-header">
        <div>
          <h5 className="tr-page-title">Task Report</h5>
          <nav className="tr-breadcrumb">
            <Link to="/admin/dashboard">Dashboard</Link>
            <i className="bi bi-chevron-right" />
            <span>Task Report</span>
          </nav>
        </div>
      </div>

      {/* ── FILTER CARD ── */}
      <div className="tr-filter-card">
        <div className="tr-filter-header">
          <div className="tr-filter-header-left">
            <i className="bi bi-funnel tr-filter-icon" />
            <span className="tr-filter-title">Filters</span>
            {activeFilterCount > 0 && (
              <span className="tr-filter-badge">{activeFilterCount} active</span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button className="tr-clear-btn" onClick={handleClearFilters}>
              <i className="bi bi-x-circle" /> Clear all
            </button>
          )}
        </div>

        <div className="tr-filter-row">
          <div className="tr-filter-field">
            <label className="tr-label">Project</label>
            <div className="tr-select-wrap">
              <i className="bi bi-folder2 tr-select-icon" />
              <select
                className="tr-select"
                name="project_id"
                value={filters.project_id}
                onChange={handleFilter}
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.project_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="tr-filter-field">
            <label className="tr-label">Assigned To</label>
            <div className="tr-select-wrap">
              <i className="bi bi-person tr-select-icon" />
              <select
                className="tr-select"
                name="assigned_to"
                value={filters.assigned_to}
                onChange={handleFilter}
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="tr-filter-field">
            <label className="tr-label">Status</label>
            <div className="tr-select-wrap">
              <i className="bi bi-circle-half tr-select-icon" />
              <select
                className="tr-select"
                name="status"
                value={filters.status}
                onChange={handleFilter}
              >
                <option value="">All Statuses</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── DATA CARD ── */}
      <div className="tr-card">
        {/* Toolbar */}
        <div className="tr-toolbar">
          <div className="tr-search-wrap">
            <i className="bi bi-search tr-search-icon" />
            <input
              className="tr-search"
              type="text"
              placeholder="Search tasks, projects, assignees…"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            />
            {searchText && (
              <button className="tr-search-clear" onClick={() => setSearchText("")}>
                <i className="bi bi-x" />
              </button>
            )}
          </div>
          <span className="tr-count">{filtered.length} tasks</span>
        </div>

        {/* Table */}
        <div className="tr-table-wrap">
          <table className="tr-table">
            <thead>
              <tr>
                <th className="tr-th-sm">#</th>
                {[
                  { key: "project_name", label: "Project" },
                  { key: "task",         label: "Task" },
                  { key: "assigned_to_names", label: "Assigned To" },
                  { key: "status",       label: "Status" },
                ].map(({ key, label }) => (
                  <th key={label} className="tr-th-sort" onClick={() => handleSort(key)}>
                    {label} <SortIcon field={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="tr-state-cell">
                    <div className="tr-loading">
                      <i className="bi bi-arrow-repeat tr-spin" /> Loading tasks…
                    </div>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="tr-state-cell">
                    <div className="tr-empty">
                      <i className="bi bi-inbox" />
                      <span>No tasks found</span>
                      {(activeFilterCount > 0 || searchText) && (
                        <button className="tr-empty-reset" onClick={handleClearFilters}>
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((task, idx) => {
                  const assignees = task.assigned_to_names
                    ? task.assigned_to_names.split(",").map((u) => u.trim())
                    : [];
                  const sc = statusConfig[task.status] || statusConfig["Pending"];
                  return (
                    <tr key={idx} className="tr-tr">
                      <td className="tr-td-muted tr-center">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td>
                        <span className="tr-project-pill">{task.project_name}</span>
                      </td>
                      <td className="tr-task-cell" title={task.task}>{task.task}</td>
                      <td>
                        <div className="tr-assignees">
                          {assignees.slice(0, 3).map((name, i) => (
                            <span key={i} className="tr-assignee-chip">{name}</span>
                          ))}
                          {assignees.length > 3 && (
                            <span className="tr-assignee-more">+{assignees.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className="tr-status-pill"
                          style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}
                        >
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="tr-pagination">
            <span className="tr-page-info">
              Page {page} of {totalPages} · {filtered.length} results
            </span>
            <div className="tr-page-btns">
              <button className="tr-page-btn" disabled={page === 1} onClick={() => setPage(1)}>
                <i className="bi bi-chevron-double-left" />
              </button>
              <button className="tr-page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <i className="bi bi-chevron-left" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={p}
                    className={`tr-page-btn ${p === page ? "active" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button className="tr-page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                <i className="bi bi-chevron-right" />
              </button>
              <button className="tr-page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
                <i className="bi bi-chevron-double-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ================= STYLES =================
const styles = `
  /* Page header */
  .tr-page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
  }
  .tr-page-title {
    font-size: 15px; font-weight: 700; color: var(--text-primary);
    margin: 0 0 4px; letter-spacing: -0.01em;
  }
  .tr-breadcrumb {
    display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted);
  }
  .tr-breadcrumb a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .tr-breadcrumb a:hover { text-decoration: underline; }
  .tr-breadcrumb i { font-size: 10px; opacity: 0.5; }

  /* Filter card */
  .tr-filter-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    padding: 16px 20px; margin-bottom: 16px;
  }
  .tr-filter-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px;
  }
  .tr-filter-header-left { display: flex; align-items: center; gap: 8px; }
  .tr-filter-icon { color: var(--text-muted); font-size: 13px; }
  .tr-filter-title { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
  .tr-filter-badge {
    font-size: 10.5px; font-weight: 700; padding: 2px 8px;
    background: #EEF2FF; color: #5048E5; border-radius: 20px;
  }
  .tr-clear-btn {
    display: flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 600; color: #DC2626;
    background: #FEF2F2; border: 1px solid #fca5a5;
    border-radius: var(--radius); padding: 4px 12px;
    cursor: pointer; transition: all 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .tr-clear-btn:hover { background: #DC2626; color: #fff; }
  .tr-filter-row {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
  }
  @media (max-width: 640px) { .tr-filter-row { grid-template-columns: 1fr; } }
  .tr-filter-field { display: flex; flex-direction: column; gap: 6px; }
  .tr-label {
    font-size: 11px; font-weight: 700; color: var(--text-secondary);
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .tr-select-wrap { position: relative; display: flex; align-items: center; }
  .tr-select-icon {
    position: absolute; left: 11px; color: var(--text-muted);
    font-size: 13px; pointer-events: none; z-index: 1;
  }
  .tr-select {
    width: 100%; padding: 9px 12px 9px 32px;
    border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface); font-size: 13px; color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center;
    padding-right: 32px; cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .tr-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }

  /* Main card */
  .tr-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow); overflow: hidden;
  }

  /* Toolbar */
  .tr-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; border-bottom: 1px solid var(--border); gap: 12px;
  }
  .tr-search-wrap {
    position: relative; display: flex; align-items: center; flex: 1; max-width: 360px;
  }
  .tr-search-icon {
    position: absolute; left: 11px; color: var(--text-muted); font-size: 13px; pointer-events: none;
  }
  .tr-search {
    width: 100%; padding: 8px 32px 8px 34px;
    border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 13px; color: var(--text-primary); background: var(--bg);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .tr-search:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); background: var(--surface); }
  .tr-search-clear {
    position: absolute; right: 8px; background: none; border: none;
    color: var(--text-muted); cursor: pointer; font-size: 14px; padding: 2px;
    display: flex; align-items: center; justify-content: center;
  }
  .tr-search-clear:hover { color: var(--text-primary); }
  .tr-count {
    font-size: 12px; font-weight: 600; color: var(--text-muted);
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 20px; padding: 3px 10px; white-space: nowrap;
  }

  /* Table */
  .tr-table-wrap { overflow-x: auto; }
  .tr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .tr-table thead tr { border-bottom: 2px solid var(--border); }
  .tr-table th {
    padding: 10px 14px; font-size: 10.5px; font-weight: 700;
    color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em;
    text-align: left; white-space: nowrap; background: var(--surface);
  }
  .tr-th-sm { width: 48px; text-align: center; }
  .tr-th-sort { cursor: pointer; user-select: none; }
  .tr-th-sort:hover { color: var(--primary); }
  .tr-sort-icon { margin-left: 4px; font-size: 9px; }
  .tr-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .tr-tr { transition: background 0.1s; }
  .tr-tr:hover td { background: #fafbff; }
  .tr-tr:last-child td { border-bottom: none; }
  .tr-td-muted { color: var(--text-secondary); font-size: 12.5px; }
  .tr-center { text-align: center; }
  .tr-task-cell { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); font-weight: 500; }

  /* Chips */
  .tr-project-pill {
    display: inline-block; font-size: 11.5px; font-weight: 700;
    padding: 3px 10px; border-radius: 20px;
    background: #EEF2FF; color: #5048E5; white-space: nowrap;
  }
  .tr-assignees { display: flex; flex-wrap: wrap; gap: 4px; }
  .tr-assignee-chip {
    font-size: 11px; font-weight: 600; padding: 2px 8px;
    background: #ECFEFF; color: #0891B2; border-radius: 20px; white-space: nowrap;
  }
  .tr-assignee-more {
    font-size: 11px; font-weight: 700; padding: 2px 7px;
    background: var(--bg); color: var(--text-muted); border-radius: 20px;
    border: 1px solid var(--border);
  }
  .tr-status-pill {
    display: inline-block; font-size: 11px; font-weight: 700;
    padding: 3px 10px; border-radius: 20px; border: 1px solid; white-space: nowrap;
  }

  /* States */
  .tr-state-cell { padding: 0 !important; border: none !important; }
  .tr-loading, .tr-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; padding: 56px 20px; color: var(--text-muted); font-size: 13px;
  }
  .tr-empty i { font-size: 28px; opacity: 0.35; }
  .tr-empty-reset {
    margin-top: 4px; font-size: 12px; font-weight: 600;
    color: var(--primary); background: #EEF2FF; border: 1px solid #c7d2fe;
    border-radius: var(--radius); padding: 5px 14px; cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.15s;
  }
  .tr-empty-reset:hover { background: var(--primary); color: #fff; }
  .tr-spin { animation: tr-spin 0.7s linear infinite; display: inline-block; }
  @keyframes tr-spin { to { transform: rotate(360deg); } }

  /* Pagination */
  .tr-pagination {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 20px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 10px;
  }
  .tr-page-info { font-size: 12px; color: var(--text-muted); }
  .tr-page-btns { display: flex; gap: 4px; }
  .tr-page-btn {
    width: 30px; height: 30px; border-radius: var(--radius); border: 1px solid var(--border);
    background: var(--surface); color: var(--text-secondary);
    font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .tr-page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
  .tr-page-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
  .tr-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
`;
