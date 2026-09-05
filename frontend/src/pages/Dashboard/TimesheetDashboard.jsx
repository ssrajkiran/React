import { useState, useEffect, useMemo } from "react";
import api from "../../api";
import AppLayout from "../../components/layout/AppLayout";
import SharedSelect from "../../components/SharedSelect";
import SharedDatePicker from "../../components/SharedDatePicker";

const fmtHrs = (hrs) => {
  const n = Number(hrs) || 0;
  const totalMin = Math.round(n * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const to12h = (h24) => {
  if (!h24) return "";
  const [hh, mm] = h24.split(":").map(Number);
  const ap = hh >= 12 ? "PM" : "AM";
  const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${h12}:${String(mm || 0).padStart(2, "0")} ${ap}`;
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDayLong = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "long" });
};

const fmtDateKey = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const STATUS_MAP = {
  "completed":   { bg: "var(--success-soft)", color: "var(--success)", icon: "bi-check-circle-fill", label: "Completed" },
  "in progress": { bg: "var(--warning-soft)", color: "var(--warning)", icon: "bi-hourglass-split", label: "In Progress" },
  "in-progress": { bg: "var(--warning-soft)", color: "var(--warning)", icon: "bi-hourglass-split", label: "In Progress" },
  "pending":     { bg: "var(--bg-muted)", color: "var(--t-muted)", icon: "bi-clock", label: "Pending" },
};

export default function TimesheetDashboard() {
  const [role, setRole] = useState("employee");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedDays, setExpandedDays] = useState({});
  const [activeTab, setActiveTab] = useState("daily");

  const [dateFrom, setDateFrom] = useState(yesterdayStr());
  const [dateTo, setDateTo] = useState(yesterdayStr());
  const [projectId, setProjectId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setRole(payload.role || "employee");
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [dateFrom, dateTo, projectId, employeeId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (projectId) params.append("projectId", projectId);
      if (employeeId) params.append("employeeId", employeeId);
      params.append("limit", "200");

      const res = await api.get(`/timesheet/dashboard/timesheet?${params.toString()}`);
      setData(res.data);

      if (res.data.projects) setProjects(res.data.projects);
      if (res.data.employees) setEmployees(res.data.employees);

      setExpandedProjects({});
      // Auto-expand all days
      if (res.data.entries) {
        const dayMap = {};
        res.data.entries.forEach((e) => {
          const key = fmtDateKey(e.timesheet_date);
          if (key) dayMap[key] = true;
        });
        setExpandedDays(dayMap);
      }
    } catch (err) {
      console.error("Timesheet dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (pid) => {
    setExpandedProjects((prev) => ({ ...prev, [pid]: !prev[pid] }));
  };

  const toggleDay = (dayKey) => {
    setExpandedDays((prev) => ({ ...prev, [dayKey]: !prev[dayKey] }));
  };

  const clearFilters = () => {
    setDateFrom(yesterdayStr());
    setDateTo(yesterdayStr());
    setProjectId("");
    setEmployeeId("");
  };

  const isAdmin = role === "admin";
  const kpis = data?.kpis || {};
  const hierarchy = data?.hierarchy || [];
  const entries = data?.entries || [];

  const totalProjectHours = hierarchy.reduce((s, p) => s + (p.total_hours || 0), 0);
  const totalModules = hierarchy.reduce((s, p) => s + (p.modules?.length || 0), 0);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const key = fmtDateKey(e.timesheet_date);
      if (!key) return;
      if (!map[key]) map[key] = { date: e.timesheet_date, entries: [], totalHours: 0 };
      map[key].entries.push(e);
      map[key].totalHours += parseFloat(e.man_hrs) || 0;
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [entries]);

  const projectOptions = useMemo(() => [
    { value: "", label: "All Projects" },
    ...projects.map((p) => ({ value: p.id, label: p.project_name })),
  ], [projects]);

  const employeeOptions = useMemo(() => [
    { value: "", label: "All Employees" },
    ...employees.map((e) => ({ value: e.id, label: e.name })),
  ], [employees]);

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* ── PAGE HEADER ── */}
      <div className="td-page-header">
        <div>
          <h5 className="td-page-title">Timesheet Report</h5>
          <nav className="td-breadcrumb">
            <span>Dashboard</span>
            <i className="bi bi-chevron-right" />
            <span>Timesheet Report</span>
          </nav>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="td-kpi-grid">
        <div className="td-kpi-card td-kpi-primary">
          <div className="td-kpi-icon-wrap"><i className="bi bi-clock-history" /></div>
          <div className="td-kpi-body">
            <span className="td-kpi-val">{fmtHrs(kpis.total_hours || 0)}</span>
            <span className="td-kpi-label">Total Hours (7d)</span>
          </div>
        </div>
        <div className="td-kpi-card td-kpi-success">
          <div className="td-kpi-icon-wrap"><i className="bi bi-calendar-check" /></div>
          <div className="td-kpi-body">
            <span className="td-kpi-val">{kpis.active_days || 0}</span>
            <span className="td-kpi-label">Active Days</span>
          </div>
        </div>
        <div className="td-kpi-card td-kpi-warning">
          <div className="td-kpi-icon-wrap"><i className="bi bi-list-task" /></div>
          <div className="td-kpi-body">
            <span className="td-kpi-val">{totalModules}</span>
            <span className="td-kpi-label">Total Modules</span>
          </div>
        </div>
        <div className="td-kpi-card td-kpi-info">
          <div className="td-kpi-icon-wrap"><i className="bi bi-file-earmark-text" /></div>
          <div className="td-kpi-body">
            <span className="td-kpi-val">{entries.length}</span>
            <span className="td-kpi-label">Timesheet Entries</span>
          </div>
        </div>
        {isAdmin && (
          <div className="td-kpi-card td-kpi-purple">
            <div className="td-kpi-icon-wrap"><i className="bi bi-people" /></div>
            <div className="td-kpi-body">
              <span className="td-kpi-val">{kpis.active_employees || 0}</span>
              <span className="td-kpi-label">Active Employees</span>
            </div>
          </div>
        )}
        <div className="td-kpi-card td-kpi-orange">
          <div className="td-kpi-icon-wrap"><i className="bi bi-diagram-3" /></div>
          <div className="td-kpi-body">
            <span className="td-kpi-val">{hierarchy.length}</span>
            <span className="td-kpi-label">Active Projects</span>
          </div>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="td-filter-card">
        <div className="td-filter-row">
          <div className="td-filter-group">
            <label className="td-filter-label">From</label>
            <SharedDatePicker value={dateFrom} onChange={setDateFrom} className="td-filter-input" />
          </div>
          <div className="td-filter-group">
            <label className="td-filter-label">To</label>
            <SharedDatePicker value={dateTo} onChange={setDateTo} className="td-filter-input" />
          </div>
          <div className="td-filter-group">
            <label className="td-filter-label">Project</label>
            <SharedSelect value={projectId} onChange={setProjectId} options={projectOptions} placeholder="All Projects" />
          </div>
          {isAdmin && (
            <div className="td-filter-group">
              <label className="td-filter-label">Employee</label>
              <SharedSelect value={employeeId} onChange={setEmployeeId} options={employeeOptions} placeholder="All Employees" />
            </div>
          )}
          <button className="td-filter-clear" onClick={clearFilters}>
            <i className="bi bi-arrow-counterclockwise" /> Reset
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="td-tabs">
        <button className={`td-tab ${activeTab === "daily" ? "td-tab-active" : ""}`} onClick={() => setActiveTab("daily")}>
          <i className="bi bi-calendar-day" /> Daily View
        </button>
        <button className={`td-tab ${activeTab === "hierarchy" ? "td-tab-active" : ""}`} onClick={() => setActiveTab("hierarchy")}>
          <i className="bi bi-diagram-3" /> Project View
        </button>
        <button className={`td-tab ${activeTab === "entries" ? "td-tab-active" : ""}`} onClick={() => setActiveTab("entries")}>
          <i className="bi bi-table" /> Table View
        </button>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* ── DAILY VIEW ── */}
      {/* ════════════════════════════════════════════ */}
      {activeTab === "daily" && (
        <div className="td-content-grid">
          <div className="td-card td-card-main">
            <div className="td-card-header">
              <div className="td-card-header-left">
                <span className="td-card-dot" style={{ background: "var(--primary)" }} />
                <h6 className="td-card-title">Daily Timesheet</h6>
              </div>
              <div className="td-header-badges">
                <span className="td-badge" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                  {entriesByDate.length} day{entriesByDate.length !== 1 ? "s" : ""}
                </span>
                <span className="td-badge" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                  {entries.length} entries
                </span>
              </div>
            </div>

            {loading ? (
              <div className="td-loading"><i className="bi bi-arrow-repeat td-spin" /> Loading…</div>
            ) : entriesByDate.length > 0 ? (
              <div className="td-daily-list">
                {entriesByDate.map(([dayKey, dayData]) => {
                  const isExpanded = expandedDays[dayKey] !== false;
                  const dayEntries = dayData.entries;
                  const dayHrs = dayData.totalHours;
                  // Group by project within day
                  const byProject = {};
                  dayEntries.forEach((e) => {
                    const pk = e.project_name || "Unknown";
                    if (!byProject[pk]) byProject[pk] = [];
                    byProject[pk].push(e);
                  });

                  return (
                    <div key={dayKey} className="td-day-card">
                      {/* Day header */}
                      <div className="td-day-header" onClick={() => toggleDay(dayKey)}>
                        <i className={`bi bi-chevron-${isExpanded ? "down" : "right"} td-chevron`} />
                        <div className="td-day-date-box">
                          <span className="td-day-num">{new Date(dayData.date).getDate()}</span>
                          <span className="td-day-month">{new Date(dayData.date).toLocaleDateString("en-IN", { month: "short" })}</span>
                        </div>
                        <div className="td-day-info">
                          <span className="td-day-name">{fmtDayLong(dayData.date)}</span>
                          <span className="td-day-meta">{dayEntries.length} entr{dayEntries.length !== 1 ? "ies" : "y"} · {Object.keys(byProject).length} project{Object.keys(byProject).length !== 1 ? "s" : ""}</span>
                        </div>
                        <span className="td-day-hours-badge">{fmtHrs(dayHrs)}</span>
                      </div>

                      {/* Day body */}
                      {isExpanded && (
                        <div className="td-day-body">
                          {Object.entries(byProject).map(([projName, projEntries]) => (
                            <div key={projName} className="td-day-project">
                              <div className="td-day-project-header">
                                <i className="bi bi-folder2" style={{ color: "var(--primary)", fontSize: 13 }} />
                                <span className="td-day-project-name">{projName}</span>
                                <span className="td-day-project-count">{projEntries.length} entries</span>
                              </div>

                              {projEntries.map((entry, i) => {
                                const st = STATUS_MAP[(entry.module_status || "").toLowerCase()];
                                return (
                                  <div key={entry.timesheet_id || i} className="td-day-entry">
                                    <div className="td-day-entry-left">
                                      <div className="td-day-entry-time-block">
                                        <span className="td-day-entry-start">
                                          {entry.start_time ? to12h(entry.start_time.substring(0, 5)) : "—"}
                                        </span>
                                        <div className="td-day-entry-time-line" />
                                        <span className="td-day-entry-end">
                                          {entry.end_time ? to12h(entry.end_time.substring(0, 5)) : "—"}
                                        </span>
                                      </div>
                                      <div className="td-day-entry-line" />
                                    </div>

                                    <div className="td-day-entry-content">
                                      <div className="td-day-entry-top">
                                        <div className="td-day-entry-module">
                                          <i className="bi bi-file-earmark-code" style={{ color: "var(--info)", fontSize: 13 }} />
                                          <span className="td-day-entry-module-name">{entry.module_name || "—"}</span>
                                          {st && (
                                            <span className="td-status-chip" style={{ background: st.bg, color: st.color }}>
                                              <i className={`bi ${st.icon}`} /> {st.label}
                                            </span>
                                          )}
                                        </div>
                                        <span className="td-day-entry-hours">{fmtHrs(entry.man_hrs)}</span>
                                      </div>

                                      {entry.work_description && (
                                        <div className="td-day-entry-desc">
                                          <i className="bi bi-text-left" style={{ fontSize: 11, opacity: 0.4 }} />
                                          <span>{entry.work_description}</span>
                                        </div>
                                      )}

                                      {isAdmin && entry.employee_name && (
                                        <div className="td-day-entry-employee">
                                          <div className="td-day-entry-avatar">{(entry.employee_name || "?")[0]}</div>
                                          <span>{entry.employee_name}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="td-empty-state">
                <i className="bi bi-inbox td-empty-icon" />
                <p className="td-empty-title">No data found</p>
                <p className="td-empty-sub">No timesheet entries match your filters</p>
              </div>
            )}
          </div>

          {/* Side summary */}
          <div className="td-side">
            <div className="td-card td-side-card">
              <div className="td-side-header">
                <i className="bi bi-bar-chart-line" style={{ color: "var(--primary)" }} />
                <span>Hours by Project</span>
              </div>
              {hierarchy.length > 0 ? (
                <div className="td-bar-list">
                  {[...hierarchy].sort((a, b) => b.total_hours - a.total_hours).map((p) => {
                    const pct = totalProjectHours > 0 ? ((p.total_hours / totalProjectHours) * 100).toFixed(0) : 0;
                    return (
                      <div key={p.project_id} className="td-bar-item">
                        <div className="td-bar-top">
                          <span className="td-bar-name">{p.project_name}</span>
                          <span className="td-bar-val">{fmtHrs(p.total_hours)}</span>
                        </div>
                        <div className="td-bar-track">
                          <div className="td-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="td-bar-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="td-empty-side">No data</div>
              )}
            </div>

            <div className="td-card td-side-card">
              <div className="td-side-header">
                <i className="bi bi-pie-chart" style={{ color: "var(--success)" }} />
                <span>Module Status</span>
              </div>
              {hierarchy.length > 0 ? (
                (() => {
                  let completed = 0, inProgress = 0, other = 0;
                  hierarchy.forEach(p => p.modules.forEach(m => {
                    const s = (m.module_status || "").toLowerCase();
                    if (s === "completed") completed++;
                    else if (s.includes("progress")) inProgress++;
                    else other++;
                  }));
                  const total = completed + inProgress + other;
                  return (
                    <div className="td-status-summary">
                      <div className="td-status-row">
                        <span className="td-status-dot" style={{ background: "var(--success)" }} />
                        <span className="td-status-name">Completed</span>
                        <span className="td-status-count">{completed}</span>
                        <span className="td-status-pct">{total > 0 ? ((completed / total) * 100).toFixed(0) : 0}%</span>
                      </div>
                      <div className="td-status-row">
                        <span className="td-status-dot" style={{ background: "var(--warning)" }} />
                        <span className="td-status-name">In Progress</span>
                        <span className="td-status-count">{inProgress}</span>
                        <span className="td-status-pct">{total > 0 ? ((inProgress / total) * 100).toFixed(0) : 0}%</span>
                      </div>
                      <div className="td-status-row">
                        <span className="td-status-dot" style={{ background: "var(--t-muted)" }} />
                        <span className="td-status-name">Other</span>
                        <span className="td-status-count">{other}</span>
                        <span className="td-status-pct">{total > 0 ? ((other / total) * 100).toFixed(0) : 0}%</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="td-empty-side">No data</div>
              )}
            </div>

            <div className="td-card td-side-card">
              <div className="td-side-header">
                <i className="bi bi-calendar3" style={{ color: "var(--info)" }} />
                <span>Daily Breakdown</span>
              </div>
              {entriesByDate.length > 0 ? (
                <div className="td-day-summary-list">
                  {entriesByDate.slice(0, 7).map(([key, d]) => (
                    <div key={key} className="td-day-summary-row">
                      <div className="td-day-summary-date">
                        <span className="td-day-summary-day">{new Date(d.date).getDate()}</span>
                        <span className="td-day-summary-mon">{new Date(d.date).toLocaleDateString("en-IN", { month: "short" })}</span>
                      </div>
                      <div className="td-day-summary-info">
                        <span className="td-day-summary-name">{fmtDayLong(d.date)}</span>
                        <div className="td-day-summary-bar-track">
                          <div className="td-day-summary-bar-fill" style={{
                            width: `${Math.min((d.totalHours / 8) * 100, 100)}%`
                          }} />
                        </div>
                      </div>
                      <span className="td-day-summary-hrs">{fmtHrs(d.totalHours)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="td-empty-side">No data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* ── PROJECT VIEW ── */}
      {/* ════════════════════════════════════════════ */}
      {activeTab === "hierarchy" && (
        <div className="td-card">
          <div className="td-card-header">
            <div className="td-card-header-left">
              <span className="td-card-dot" style={{ background: "var(--primary)" }} />
              <h6 className="td-card-title">Project → Module</h6>
            </div>
            <div className="td-header-badges">
              <span className="td-badge" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                {hierarchy.length} projects
              </span>
              <span className="td-badge" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                {fmtHrs(totalProjectHours)} total
              </span>
            </div>
          </div>

          {loading ? (
            <div className="td-loading"><i className="bi bi-arrow-repeat td-spin" /> Loading…</div>
          ) : hierarchy.length > 0 ? (
            <div className="td-hierarchy">
              {hierarchy.map((project) => {
                const projEntries = entries.filter(e => e.project_name === project.project_name);
                return (
                  <div key={project.project_id} className="td-project-card">
                    <div className="td-project-header" onClick={() => toggleProject(project.project_id)}>
                      <i className={`bi bi-chevron-${expandedProjects[project.project_id] ? "down" : "right"} td-chevron`} />
                      <div className="td-project-icon"><i className="bi bi-folder2-open" /></div>
                      <div className="td-project-info">
                        <span className="td-project-name">{project.project_name}</span>
                        <span className="td-project-meta">{project.modules.length} module{project.modules.length !== 1 ? "s" : ""} · {fmtHrs(project.total_hours)} logged</span>
                      </div>
                      <span className="td-project-hours-badge">{fmtHrs(project.total_hours)}</span>
                    </div>

                    {expandedProjects[project.project_id] && (
                      <div className="td-project-body">
                        {project.modules.length > 0 ? (
                          project.modules.map((mod) => {
                            const modEntries = projEntries.filter(e => e.module_name === mod.module_name);
                            const st = STATUS_MAP[(mod.module_status || "").toLowerCase()];
                            return (
                              <div key={mod.module_id} className="td-module-card">
                                <div className="td-module-row">
                                  <div className="td-module-left">
                                    <i className="bi bi-file-earmark-code td-module-icon" />
                                    <div className="td-module-text">
                                      <span className="td-module-name">{mod.module_name}</span>
                                      <span className="td-module-sub">{modEntries.length} entr{modEntries.length !== 1 ? "ies" : "y"}</span>
                                    </div>
                                  </div>
                                  <div className="td-module-right">
                                    {st && (
                                      <span className="td-status-chip" style={{ background: st.bg, color: st.color }}>
                                        <i className={`bi ${st.icon}`} /> {mod.module_status}
                                      </span>
                                    )}
                                    <span className="td-mod-hours">{fmtHrs(mod.total_hours)}</span>
                                  </div>
                                </div>

                                {modEntries.length > 0 && (
                                  <div className="td-entry-list">
                                    {modEntries.map((entry, i) => (
                                      <div key={entry.timesheet_id || i} className="td-entry-row">
                                        <div className="td-entry-date">
                                          <span className="td-entry-day">{new Date(entry.timesheet_date).toLocaleDateString("en-IN", { weekday: "short" })}</span>
                                          <span className="td-entry-full">{fmtDate(entry.timesheet_date)}</span>
                                        </div>
                                        {isAdmin && (
                                          <div className="td-entry-employee">
                                            <div className="td-entry-avatar">{(entry.employee_name || "?")[0]}</div>
                                            <span>{entry.employee_name}</span>
                                          </div>
                                        )}
                                        <div className="td-entry-time">
                                          {entry.start_time && entry.end_time
                                            ? `${to12h(entry.start_time.substring(0, 5))} – ${to12h(entry.end_time.substring(0, 5))}`
                                            : "—"}
                                        </div>
                                        <div className="td-entry-desc" title={entry.work_description}>{entry.work_description || "—"}</div>
                                        <span className="td-entry-hours">{fmtHrs(entry.man_hrs)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="td-empty-mod">No modules</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="td-empty-state">
              <i className="bi bi-inbox td-empty-icon" />
              <p className="td-empty-title">No data found</p>
              <p className="td-empty-sub">No projects match your filters</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* ── TABLE VIEW ── */}
      {/* ════════════════════════════════════════════ */}
      {activeTab === "entries" && (
        <div className="td-card">
          <div className="td-card-header">
            <div className="td-card-header-left">
              <span className="td-card-dot" style={{ background: "var(--success)" }} />
              <h6 className="td-card-title">All Timesheet Entries</h6>
            </div>
            <span className="td-badge" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
              {entries.length} entries
            </span>
          </div>

          {loading ? (
            <div className="td-loading"><i className="bi bi-arrow-repeat td-spin" /> Loading…</div>
          ) : entries.length > 0 ? (
            <div className="td-table-scroll">
              <table className="td-table">
                <thead>
                  <tr>
                    <th className="td-th-num">#</th>
                    <th>Date</th>
                    {isAdmin && <th>Employee</th>}
                    <th>Project</th>
                    <th>Module</th>
                    <th>Time</th>
                    <th>Hours</th>
                    <th>Work Description</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row, idx) => (
                    <tr key={row.timesheet_id || idx}>
                      <td className="td-td-num">{idx + 1}</td>
                      <td className="td-td-date">
                        <div className="td-date-cell">
                          <span className="td-date-day">{new Date(row.timesheet_date).toLocaleDateString("en-IN", { weekday: "short" })}</span>
                          <span className="td-date-full">{fmtDate(row.timesheet_date)}</span>
                        </div>
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="td-user-cell">
                            <div className="td-avatar">{(row.employee_name || "?")[0]}</div>
                            <span>{row.employee_name}</span>
                          </div>
                        </td>
                      )}
                      <td><span className="td-project-pill">{row.project_name}</span></td>
                      <td className="td-td-module" title={row.module_name}>{row.module_name || "—"}</td>
                      <td className="td-td-time">
                        {row.start_time && row.end_time
                          ? `${to12h(row.start_time.substring(0, 5))} – ${to12h(row.end_time.substring(0, 5))}`
                          : "—"}
                      </td>
                      <td><span className="td-hours-pill">{fmtHrs(row.man_hrs)}</span></td>
                      <td className="td-td-desc" title={row.work_description}>{row.work_description || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="td-empty-state">
              <i className="bi bi-inbox td-empty-icon" />
              <p className="td-empty-title">No entries found</p>
              <p className="td-empty-sub">No timesheet entries match your filters</p>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

const styles = `
  /* ── Page header ── */
  .td-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
  .td-page-title { font-size: 15px; font-weight: 700; color: var(--t-base); margin: 0 0 4px; }
  .td-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--t-muted); }
  .td-breadcrumb i { font-size: 10px; opacity: 0.5; }

  /* ── KPI Grid ── */
  .td-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(185px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .td-kpi-card {
    display: flex; align-items: center; gap: 14px;
    padding: 18px 16px; border-radius: var(--radius-lg);
    background: var(--bg-card); border: 1px solid var(--border);
    box-shadow: var(--shadow); transition: transform 0.2s, box-shadow 0.2s;
  }
  .td-kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .td-kpi-icon-wrap {
    width: 46px; height: 46px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }
  .td-kpi-primary .td-kpi-icon-wrap { background: var(--primary-soft); color: var(--primary); }
  .td-kpi-success .td-kpi-icon-wrap { background: var(--success-soft); color: var(--success); }
  .td-kpi-warning .td-kpi-icon-wrap { background: var(--warning-soft); color: var(--warning); }
  .td-kpi-info .td-kpi-icon-wrap { background: var(--info-soft); color: var(--info); }
  .td-kpi-purple .td-kpi-icon-wrap { background: var(--purple-soft); color: var(--purple); }
  .td-kpi-orange .td-kpi-icon-wrap { background: var(--orange-soft); color: var(--orange); }
  .td-kpi-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .td-kpi-val { font-size: 22px; font-weight: 800; color: var(--t-base); line-height: 1; letter-spacing: -0.02em; }
  .td-kpi-label { font-size: 11px; font-weight: 600; color: var(--t-muted); white-space: nowrap; }

  /* ── Filters ── */
  .td-filter-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 16px 18px; margin-bottom: 20px; box-shadow: var(--shadow);
  }
  .td-filter-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
  .td-filter-group { display: flex; flex-direction: column; gap: 4px; min-width: 150px; flex: 1; }
  .td-filter-label { font-size: 11px; font-weight: 700; color: var(--t-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .td-filter-input { padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; color: var(--t-base); background: var(--bg); outline: none; font-family: var(--font); }
  .td-filter-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }
  .td-filter-clear {
    display: flex; align-items: center; gap: 5px; padding: 8px 14px;
    background: transparent; border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 12px; font-weight: 600; color: var(--t-muted); cursor: pointer;
    transition: all 0.15s; font-family: var(--font); white-space: nowrap;
  }
  .td-filter-clear:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-soft); }

  /* ── Tabs ── */
  .td-tabs { display: flex; gap: 4px; margin-bottom: 20px; background: var(--bg-muted); border-radius: var(--radius); padding: 4px; width: fit-content; }
  .td-tab {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: var(--radius); border: none;
    background: transparent; font-size: 12.5px; font-weight: 600;
    color: var(--t-muted); cursor: pointer; transition: all 0.15s;
    font-family: var(--font);
  }
  .td-tab:hover { color: var(--t-base); }
  .td-tab-active { background: var(--bg-card); color: var(--primary); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

  /* ── Content Grid ── */
  .td-content-grid { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }
  @media (max-width: 1200px) { .td-content-grid { grid-template-columns: 1fr; } }

  /* ── Cards ── */
  .td-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow); min-width: 0;
  }
  .td-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .td-card-header-left { display: flex; align-items: center; gap: 8px; }
  .td-card-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .td-card-title { font-size: 14px; font-weight: 700; color: var(--t-base); margin: 0; }
  .td-header-badges { display: flex; gap: 6px; }
  .td-badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }

  /* ═══════ DAILY VIEW ═══════ */
  .td-daily-list { display: flex; flex-direction: column; gap: 12px; }

  .td-day-card { border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
  .td-day-header {
    display: flex; align-items: center; gap: 12px; padding: 14px 16px;
    cursor: pointer; transition: background 0.12s; user-select: none;
  }
  .td-day-header:hover { background: var(--primary-soft); }
  .td-chevron { font-size: 13px; color: var(--t-muted); flex-shrink: 0; }
  .td-day-date-box {
    width: 48px; height: 48px; border-radius: 10px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--primary), var(--purple));
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: #fff;
  }
  .td-day-num { font-size: 18px; font-weight: 800; line-height: 1; }
  .td-day-month { font-size: 9px; font-weight: 700; text-transform: uppercase; opacity: 0.85; }
  .td-day-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .td-day-name { font-size: 14px; font-weight: 700; color: var(--t-base); }
  .td-day-meta { font-size: 11.5px; color: var(--t-muted); }
  .td-day-hours-badge {
    font-size: 14px; font-weight: 800; color: var(--primary);
    background: var(--primary-soft); padding: 5px 14px; border-radius: 20px;
    white-space: nowrap; flex-shrink: 0;
  }

  .td-day-body { border-top: 1px solid var(--border); padding: 12px; background: var(--bg); }

  /* Project within day */
  .td-day-project { margin-bottom: 10px; }
  .td-day-project:last-child { margin-bottom: 0; }
  .td-day-project-header {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; margin-bottom: 6px;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
  }
  .td-day-project-name { font-size: 12.5px; font-weight: 700; color: var(--primary); }
  .td-day-project-count { font-size: 10.5px; color: var(--t-muted); margin-left: auto; }

  /* Entry within day */
  .td-day-entry {
    display: flex; gap: 12px; padding: 4px 0 4px 8px;
  }
  .td-day-entry-left { display: flex; flex-direction: column; align-items: center; width: 50px; flex-shrink: 0; }
  .td-day-entry-time-block { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .td-day-entry-start, .td-day-entry-end { font-size: 9.5px; font-weight: 700; color: var(--t-muted); font-variant-numeric: tabular-nums; }
  .td-day-entry-time-line { width: 2px; height: 12px; background: var(--border); border-radius: 2px; }
  .td-day-entry-line { width: 2px; flex: 1; background: var(--border); border-radius: 2px; margin-top: 4px; }
  .td-day-entry:last-child .td-day-entry-line { display: none; }

  .td-day-entry-content {
    flex: 1; min-width: 0;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
    padding: 10px 14px; margin-bottom: 6px;
  }
  .td-day-entry:last-child .td-day-entry-content { margin-bottom: 0; }
  .td-day-entry-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
  .td-day-entry-module { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .td-day-entry-module-name { font-size: 12.5px; font-weight: 600; color: var(--t-base); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .td-status-chip {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 700; padding: 2px 7px;
    border-radius: 20px; white-space: nowrap; flex-shrink: 0;
  }
  .td-status-chip i { font-size: 8px; }
  .td-day-entry-hours {
    font-size: 12px; font-weight: 800; color: var(--primary);
    background: var(--primary-soft); padding: 3px 10px; border-radius: 20px;
    white-space: nowrap; flex-shrink: 0;
  }

  .td-day-entry-desc {
    display: flex; align-items: flex-start; gap: 6px;
    font-size: 11.5px; color: var(--t-muted); line-height: 1.4;
    margin-top: 2px;
  }
  .td-day-entry-desc span { flex: 1; }

  .td-day-entry-employee {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; color: var(--t-muted); margin-top: 4px;
  }
  .td-day-entry-avatar {
    width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--primary), var(--purple));
    color: #fff; font-size: 8px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }

  /* ── Side panel ── */
  .td-side { display: flex; flex-direction: column; gap: 16px; }
  .td-side-card { padding: 18px; }
  .td-side-header {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 700; color: var(--t-base); margin-bottom: 14px;
  }
  .td-side-header i { font-size: 16px; }

  /* Bar chart */
  .td-bar-list { display: flex; flex-direction: column; gap: 12px; }
  .td-bar-item { display: flex; flex-direction: column; gap: 4px; }
  .td-bar-top { display: flex; align-items: center; justify-content: space-between; }
  .td-bar-name { font-size: 12px; font-weight: 600; color: var(--t-base); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
  .td-bar-val { font-size: 11.5px; font-weight: 700; color: var(--primary); }
  .td-bar-track { height: 6px; background: var(--bg-muted); border-radius: 10px; overflow: hidden; }
  .td-bar-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--purple)); border-radius: 10px; transition: width 0.4s ease; }
  .td-bar-pct { font-size: 10px; color: var(--t-muted); font-weight: 600; }

  /* Status summary */
  .td-status-summary { display: flex; flex-direction: column; gap: 10px; }
  .td-status-row { display: flex; align-items: center; gap: 8px; }
  .td-status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .td-status-name { font-size: 12.5px; font-weight: 500; color: var(--t-base); flex: 1; }
  .td-status-count { font-size: 13px; font-weight: 700; color: var(--t-base); }
  .td-status-pct { font-size: 11px; font-weight: 600; color: var(--t-muted); min-width: 36px; text-align: right; }

  /* Day summary */
  .td-day-summary-list { display: flex; flex-direction: column; gap: 8px; }
  .td-day-summary-row { display: flex; align-items: center; gap: 10px; }
  .td-day-summary-date {
    width: 40px; height: 40px; border-radius: 8px; flex-shrink: 0;
    background: var(--bg-muted); display: flex; flex-direction: column;
    align-items: center; justify-content: center;
  }
  .td-day-summary-day { font-size: 14px; font-weight: 800; color: var(--t-base); line-height: 1; }
  .td-day-summary-mon { font-size: 8px; font-weight: 700; color: var(--t-muted); text-transform: uppercase; }
  .td-day-summary-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .td-day-summary-name { font-size: 11px; font-weight: 600; color: var(--t-base); }
  .td-day-summary-bar-track { height: 4px; background: var(--bg-muted); border-radius: 10px; overflow: hidden; }
  .td-day-summary-bar-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--purple)); border-radius: 10px; transition: width 0.4s ease; }
  .td-day-summary-hrs { font-size: 11px; font-weight: 700; color: var(--primary); white-space: nowrap; }

  /* ═══════ HIERARCHY VIEW ═══════ */
  .td-hierarchy { display: flex; flex-direction: column; gap: 10px; }
  .td-project-card { border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
  .td-project-header {
    display: flex; align-items: center; gap: 10px; padding: 14px 16px;
    cursor: pointer; transition: background 0.12s; user-select: none;
  }
  .td-project-header:hover { background: var(--primary-soft); }
  .td-project-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: var(--primary-soft); color: var(--primary); font-size: 16px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .td-project-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .td-project-name { font-size: 14px; font-weight: 700; color: var(--t-base); }
  .td-project-meta { font-size: 11.5px; color: var(--t-muted); }
  .td-project-hours-badge {
    font-size: 13px; font-weight: 700; color: var(--primary);
    background: var(--primary-soft); padding: 4px 12px; border-radius: 20px;
    white-space: nowrap; flex-shrink: 0;
  }
  .td-project-body { border-top: 1px solid var(--border); padding: 8px; background: var(--bg); }

  .td-module-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius); margin-bottom: 8px; overflow: hidden;
  }
  .td-module-card:last-child { margin-bottom: 0; }
  .td-module-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px; gap: 12px;
  }
  .td-module-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
  .td-module-icon { font-size: 16px; color: var(--info); flex-shrink: 0; }
  .td-module-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .td-module-name { font-size: 13px; font-weight: 600; color: var(--t-base); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .td-module-sub { font-size: 11px; color: var(--t-muted); }
  .td-module-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .td-mod-hours { font-size: 13px; font-weight: 700; color: var(--primary); white-space: nowrap; }

  .td-entry-list { border-top: 1px solid var(--border); }
  .td-entry-row {
    display: grid; grid-template-columns: 100px auto 140px 1fr auto;
    align-items: center; gap: 12px; padding: 10px 14px;
    border-bottom: 1px solid var(--border); font-size: 12.5px;
  }
  .td-entry-row:last-child { border-bottom: none; }
  .td-entry-row:hover { background: var(--bg); }
  .td-entry-date { display: flex; flex-direction: column; gap: 1px; }
  .td-entry-day { font-size: 11px; font-weight: 700; color: var(--t-muted); text-transform: uppercase; }
  .td-entry-full { font-weight: 600; color: var(--t-base); white-space: nowrap; }
  .td-entry-employee { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
  .td-entry-avatar {
    width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--primary), var(--purple));
    color: #fff; font-size: 10px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .td-entry-time { color: var(--t-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .td-entry-desc { color: var(--t-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; }
  .td-entry-hours {
    font-size: 12px; font-weight: 700; color: var(--primary);
    background: var(--primary-soft); padding: 3px 10px; border-radius: 20px;
    white-space: nowrap;
  }

  /* ═══════ TABLE VIEW ═══════ */
  .td-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .td-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .td-table thead tr { border-bottom: 2px solid var(--border); }
  .td-table th { padding: 10px 14px; font-size: 10.5px; font-weight: 700; color: var(--t-muted); text-transform: uppercase; letter-spacing: 0.06em; text-align: left; white-space: nowrap; background: var(--bg-card); }
  .td-th-num { width: 40px; text-align: center; }
  .td-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .td-table tbody tr:last-child td { border-bottom: none; }
  .td-table tbody tr { transition: background 0.12s; }
  .td-table tbody tr:hover { background: var(--primary-soft); }
  .td-td-num { text-align: center; font-size: 11.5px; font-weight: 600; color: var(--t-muted); }
  .td-date-cell { display: flex; flex-direction: column; gap: 1px; }
  .td-date-day { font-size: 10px; font-weight: 700; color: var(--t-muted); text-transform: uppercase; }
  .td-date-full { font-size: 12px; font-weight: 600; color: var(--t-base); white-space: nowrap; }
  .td-user-cell { display: flex; align-items: center; gap: 7px; font-weight: 500; white-space: nowrap; }
  .td-avatar {
    width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--primary), var(--purple));
    color: #fff; font-size: 10px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .td-td-module { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
  .td-td-time { font-size: 12px; color: var(--t-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .td-td-desc { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--t-muted); font-size: 12px; }
  .td-project-pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; background: var(--primary-soft); color: var(--primary); white-space: nowrap; }
  .td-hours-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; padding: 3px 9px; background: var(--orange-soft); color: var(--orange); border-radius: 20px; border: 1px solid var(--warning-soft); white-space: nowrap; }

  /* ── Empty / Loading ── */
  .td-loading { text-align: center; color: var(--t-muted); padding: 40px 0; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .td-empty-state { text-align: center; padding: 48px 20px; }
  .td-empty-icon { font-size: 40px; color: var(--t-muted); opacity: 0.3; display: block; margin-bottom: 12px; }
  .td-empty-title { font-size: 14px; font-weight: 700; color: var(--t-base); margin: 0 0 4px; }
  .td-empty-sub { font-size: 12.5px; color: var(--t-muted); margin: 0; }
  .td-empty-mod { text-align: center; color: var(--t-muted); padding: 16px; font-size: 12px; }
  .td-empty-side { text-align: center; color: var(--t-muted); padding: 20px; font-size: 12px; }
  .td-spin { animation: td-spin 0.7s linear infinite; display: inline-block; }
  @keyframes td-spin { to { transform: rotate(360deg); } }

  @media (max-width: 1024px) { .td-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 900px) {
    .td-entry-row { grid-template-columns: 1fr; gap: 6px; padding: 10px 12px; }
    .td-entry-employee { display: none; }
    .td-entry-hours { justify-self: start; }
  }
  @media (max-width: 600px) {
    .td-kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .td-filter-row { flex-direction: column; }
    .td-filter-group { min-width: 100%; }
    .td-tabs { width: 100%; }
    .td-tab { flex: 1; justify-content: center; font-size: 11.5px; padding: 8px 10px; }
    .td-day-entry { flex-direction: column; gap: 6px; }
    .td-day-entry-left { flex-direction: row; width: auto; }
    .td-day-entry-line { display: none; }
  }
`;
