import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import AppLayout from "../../components/layout/AppLayout";
import SharedSelect from "../../components/SharedSelect";

export default function TaskReport() {
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    project_id: "",
    assigned_to: "",
    status: "",
  });

  const [expandedProjects, setExpandedProjects] = useState({});
  const [searchText, setSearchText] = useState("");

  // ================= FETCH =================
  const fetchEntries = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tasks_report/report/timesheet", { params: filters });
      setEntries(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Report fetch error:", err);
      setEntries([]);
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
    fetchEntries();
  }, [filters]);

  const handleFilter = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleClearFilters = () => {
    setFilters({ project_id: "", assigned_to: "", status: "" });
    setSearchText("");
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // ================= GROUP BY PROJECT =================
  const filtered = useMemo(() => {
    const t = searchText.toLowerCase();
    return entries.filter(
      (e) =>
        !t ||
        (e.project_name || "").toLowerCase().includes(t) ||
        (e.module_name || "").toLowerCase().includes(t) ||
        (e.work_description || "").toLowerCase().includes(t) ||
        (e.user_name || "").toLowerCase().includes(t)
    );
  }, [entries, searchText]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((entry) => {
      const key = entry.project_name || "Unknown";
      if (!groups[key]) {
        groups[key] = { project_name: key, project_id: entry.project_id, entries: [] };
      }
      groups[key].entries.push(entry);
    });
    return Object.values(groups).sort((a, b) => a.project_name.localeCompare(b.project_name));
  }, [filtered]);

  const totalHours = useMemo(
    () => filtered.reduce((sum, e) => sum + (parseFloat(e.man_hrs) || 0), 0),
    [filtered]
  );

  const toggleProject = (name) => {
    setExpandedProjects((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleAll = () => {
    const allExpanded = grouped.every((g) => expandedProjects[g.project_name]);
    const next = {};
    if (!allExpanded) {
      grouped.forEach((g) => { next[g.project_name] = true; });
    }
    setExpandedProjects(next);
  };

  const statusConfig = {
    "In Progress": { color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
    Completed: { color: "#059669", bg: "#ECFDF5", border: "#6ee7b7" },
    Pending: { color: "#6B7280", bg: "#F3F4F6", border: "#D1D5DB" },
  };

  const formatDate = (d) => {
    if (!d) return "-";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* PAGE HEADER */}
      <div className="tr-page-header">
        <div>
          <h5 className="tr-page-title">Module Report</h5>
          <nav className="tr-breadcrumb">
            <Link to="/admin">Dashboard</Link>
            <i className="bi bi-chevron-right" />
            <span>Module Report</span>
          </nav>
        </div>
      </div>

      {/* FILTER CARD */}
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
            <SharedSelect
              value={filters.project_id}
              onChange={(val) => setFilters({ ...filters, project_id: val })}
              options={projects.map((p) => ({ value: p.id, label: p.project_name }))}
              placeholder="All Projects"
            />
          </div>

          <div className="tr-filter-field">
            <label className="tr-label">Assigned To</label>
            <SharedSelect
              value={filters.assigned_to}
              onChange={(val) => setFilters({ ...filters, assigned_to: val })}
              options={users.map((u) => ({ value: u.id, label: u.name }))}
              placeholder="All Users"
            />
          </div>

          <div className="tr-filter-field">
            <label className="tr-label">Status</label>
            <SharedSelect
              value={filters.status}
              onChange={(val) => setFilters({ ...filters, status: val })}
              options={[
                { value: "In Progress", label: "In Progress" },
                { value: "Completed", label: "Completed" },
              ]}
              placeholder="All Statuses"
            />
          </div>
        </div>
      </div>

      {/* DATA CARD */}
      <div className="tr-card">
        {/* Toolbar */}
        <div className="tr-toolbar">
          <div className="tr-search-wrap">
            <i className="bi bi-search tr-search-icon" />
            <input
              className="tr-search"
              type="text"
              placeholder="Search projects, modules, work..."
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); }}
            />
            {searchText && (
              <button className="tr-search-clear" onClick={() => setSearchText("")}>
                <i className="bi bi-x" />
              </button>
            )}
          </div>
          <div className="tr-toolbar-right">
            <span className="tr-count">{filtered.length} entries</span>
            <span className="tr-total-hours">
              <i className="bi bi-clock-history"></i> {totalHours.toFixed(1)}h total
            </span>
            {grouped.length > 1 && (
              <button className="tr-expand-toggle" onClick={toggleAll}>
                <i className={`bi ${grouped.every((g) => expandedProjects[g.project_name]) ? "bi-arrows-collapse" : "bi-arrows-expand"}`}></i>
                {grouped.every((g) => expandedProjects[g.project_name]) ? "Collapse All" : "Expand All"}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="tr-content">
          {loading ? (
            <div className="tr-loading">
              <i className="bi bi-arrow-repeat tr-spin" /> Loading report...
            </div>
          ) : grouped.length === 0 ? (
            <div className="tr-empty">
              <i className="bi bi-inbox" />
              <span>No entries found</span>
              {(activeFilterCount > 0 || searchText) && (
                <button className="tr-empty-reset" onClick={handleClearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            grouped.map((group) => {
              const isExpanded = !!expandedProjects[group.project_name];
              const groupHours = group.entries.reduce((s, e) => s + (parseFloat(e.man_hrs) || 0), 0);
              return (
                <div key={group.project_name} className="tr-project-group">
                  {/* Project Header */}
                  <button
                    className={`tr-project-header ${isExpanded ? "expanded" : ""}`}
                    onClick={() => toggleProject(group.project_name)}
                  >
                    <div className="tr-project-header-left">
                      <i className={`bi bi-chevron-right tr-chevron ${isExpanded ? "rotated" : ""}`}></i>
                      <span className="tr-project-name">{group.project_name}</span>
                      <span className="tr-project-count">{group.entries.length} entries</span>
                    </div>
                    <div className="tr-project-header-right">
                      <span className="tr-project-hours">{groupHours.toFixed(1)}h</span>
                    </div>
                  </button>

                  {/* Project Table */}
                  {isExpanded && (
                    <div className="tr-project-table-wrap">
                      <table className="tr-table">
                        <thead>
                          <tr>
                            <th className="tr-th-sm">#</th>
                            <th>Date</th>
                            <th>Module</th>
                            <th>Work Description</th>
                            <th>Status</th>
                            <th className="tr-th-right">Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.entries.map((entry, idx) => {
                            const sc = statusConfig[entry.module_status] || statusConfig["Pending"];
                            return (
                              <tr key={entry.id} className="tr-tr">
                                <td className="tr-td-muted tr-center">{idx + 1}</td>
                                <td className="tr-date-cell">
                                  <i className="bi bi-calendar3 tr-date-icon"></i>
                                  {formatDate(entry.date)}
                                </td>
                                <td className="tr-task-cell" title={entry.module_name}>
                                  <span className="tr-module-pill">{entry.module_name}</span>
                                </td>
                                <td className="tr-desc-cell" title={entry.work_description}>
                                  {entry.work_description}
                                </td>
                                <td>
                                  <span
                                    className="tr-status-pill"
                                    style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}
                                  >
                                    {entry.module_status}
                                  </span>
                                </td>
                                <td className="tr-td-right">
                                  <span className="tr-hours-badge">
                                    {entry.man_hrs ? `${entry.man_hrs}h` : "-"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
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
    font-size: 15px; font-weight: 700; color: var(--t-base);
    margin: 0 0 4px; letter-spacing: -0.01em;
  }
  .tr-breadcrumb {
    display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--t-muted);
  }
  .tr-breadcrumb a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .tr-breadcrumb a:hover { text-decoration: underline; }
  .tr-breadcrumb i { font-size: 10px; opacity: 0.5; }

  /* Filter card */
  .tr-filter-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);
    padding: 16px 20px; margin-bottom: 16px;
  }
  .tr-filter-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px;
  }
  .tr-filter-header-left { display: flex; align-items: center; gap: 8px; }
  .tr-filter-icon { color: var(--t-muted); font-size: 13px; }
  .tr-filter-title { font-size: 12px; font-weight: 700; color: var(--t-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .tr-filter-badge {
    font-size: 10.5px; font-weight: 700; padding: 2px 8px;
    background: var(--primary-soft); color: var(--primary); border-radius: 20px;
  }
  .tr-clear-btn {
    display: flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 600; color: var(--danger);
    background: var(--danger-soft); border: 1px solid #fca5a5;
    border-radius: var(--radius); padding: 4px 12px;
    cursor: pointer; transition: all 0.15s; font-family: var(--font);
  }
  .tr-clear-btn:hover { background: var(--danger); color: #fff; }
  .tr-filter-row {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
  }
  @media (max-width: 640px) { .tr-filter-row { grid-template-columns: 1fr; } }
  .tr-filter-field { display: flex; flex-direction: column; gap: 6px; }
  .tr-label {
    font-size: 11px; font-weight: 700; color: var(--t-muted);
    text-transform: uppercase; letter-spacing: 0.05em;
  }

  /* Main card */
  .tr-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); overflow: hidden;
  }

  /* Toolbar */
  .tr-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; border-bottom: 1px solid var(--border); gap: 12px;
    flex-wrap: wrap;
  }
  .tr-search-wrap {
    position: relative; display: flex; align-items: center; flex: 1; max-width: 360px;
  }
  .tr-search-icon {
    position: absolute; left: 11px; color: var(--t-muted); font-size: 13px; pointer-events: none;
  }
  .tr-search {
    width: 100%; padding: 8px 32px 8px 34px;
    border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 13px; color: var(--t-base); background: var(--bg);
    font-family: var(--font); outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .tr-search:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); background: var(--bg-card); }
  .tr-search-clear {
    position: absolute; right: 8px; background: none; border: none;
    color: var(--t-muted); cursor: pointer; font-size: 14px; padding: 2px;
    display: flex; align-items: center; justify-content: center;
  }
  .tr-search-clear:hover { color: var(--t-base); }
  .tr-toolbar-right { display: flex; align-items: center; gap: 8px; }
  .tr-count {
    font-size: 12px; font-weight: 600; color: var(--t-muted);
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 20px; padding: 3px 10px; white-space: nowrap;
  }
  .tr-total-hours {
    font-size: 12px; font-weight: 700; color: var(--primary);
    background: var(--primary-soft); border: 1px solid var(--primary-ring);
    border-radius: 20px; padding: 3px 10px; white-space: nowrap;
    display: flex; align-items: center; gap: 4px;
  }
  .tr-expand-toggle {
    display: flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 600; color: var(--t-muted);
    background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 5px 12px;
    cursor: pointer; transition: all 0.15s; font-family: var(--font);
  }
  .tr-expand-toggle:hover { border-color: var(--primary); color: var(--primary); }

  /* Content area */
  .tr-content { min-height: 200px; }

  /* Project group */
  .tr-project-group { border-bottom: 1px solid var(--border); }
  .tr-project-group:last-child { border-bottom: none; }

  .tr-project-header {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; padding: 14px 20px;
    background: var(--bg); border: none;
    cursor: pointer; transition: background 0.15s;
    font-family: var(--font); text-align: left;
  }
  .tr-project-header:hover { background: var(--bg-hover); }
  .tr-project-header.expanded { background: var(--primary-soft); }
  .tr-project-header-left { display: flex; align-items: center; gap: 10px; }
  .tr-chevron {
    font-size: 12px; color: var(--t-muted);
    transition: transform 0.2s ease;
  }
  .tr-chevron.rotated { transform: rotate(90deg); }
  .tr-project-name { font-size: 14px; font-weight: 700; color: var(--t-base); }
  .tr-project-count {
    font-size: 11px; font-weight: 600; color: var(--t-muted);
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 20px; padding: 2px 8px;
  }
  .tr-project-header-right { display: flex; align-items: center; gap: 8px; }
  .tr-project-hours {
    font-size: 13px; font-weight: 700; color: var(--primary);
  }

  /* Project table */
  .tr-project-table-wrap { overflow-x: auto; }
  .tr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .tr-table thead tr { border-bottom: 2px solid var(--border); }
  .tr-table th {
    padding: 10px 14px; font-size: 10.5px; font-weight: 700;
    color: var(--t-muted); text-transform: uppercase; letter-spacing: 0.06em;
    text-align: left; white-space: nowrap; background: var(--bg-card);
  }
  .tr-th-sm { width: 48px; text-align: center; }
  .tr-th-right { text-align: right; }
  .tr-table td { padding: 11px 14px; border-bottom: 1px solid var(--border-soft); vertical-align: middle; }
  .tr-tr { transition: background 0.1s; }
  .tr-tr:hover td { background: var(--bg-hover); }
  .tr-tr:last-child td { border-bottom: none; }
  .tr-td-muted { color: var(--t-muted); font-size: 12.5px; }
  .tr-center { text-align: center; }
  .tr-td-right { text-align: right; }
  .tr-date-cell {
    font-size: 12.5px; color: var(--t-base); white-space: nowrap;
    display: flex; align-items: center; gap: 6px;
  }
  .tr-date-icon { font-size: 11px; color: var(--t-light); }
  .tr-task-cell { max-width: 200px; }
  .tr-desc-cell {
    max-width: 280px; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; color: var(--t-muted); font-size: 12.5px;
  }
  .tr-module-pill {
    display: inline-block; font-size: 11.5px; font-weight: 600;
    padding: 3px 10px; border-radius: 20px;
    background: var(--primary-soft); color: var(--primary); white-space: nowrap;
  }
  .tr-hours-badge {
    font-size: 12px; font-weight: 700; color: var(--success);
    background: var(--success-soft); padding: 3px 10px;
    border-radius: 20px; white-space: nowrap;
  }
  .tr-status-pill {
    display: inline-block; font-size: 11px; font-weight: 700;
    padding: 3px 10px; border-radius: 20px; border: 1px solid; white-space: nowrap;
  }

  /* States */
  .tr-loading, .tr-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; padding: 56px 20px; color: var(--t-muted); font-size: 13px;
  }
  .tr-empty i { font-size: 28px; opacity: 0.35; }
  .tr-empty-reset {
    margin-top: 4px; font-size: 12px; font-weight: 600;
    color: var(--primary); background: var(--primary-soft); border: 1px solid var(--primary-ring);
    border-radius: var(--radius); padding: 5px 14px; cursor: pointer;
    font-family: var(--font); transition: all 0.15s;
  }
  .tr-empty-reset:hover { background: var(--primary); color: #fff; }
  .tr-spin { animation: tr-spin 0.7s linear infinite; display: inline-block; }
  @keyframes tr-spin { to { transform: rotate(360deg); } }
`;
