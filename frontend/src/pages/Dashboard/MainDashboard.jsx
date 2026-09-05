import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import AppLayout from "../../components/layout/AppLayout";

const fmtHrs = (hrs) => {
  const n = Number(hrs) || 0;
  const totalMin = Math.round(n * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDay = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short" });
};

const to12h = (h24) => {
  if (!h24) return "";
  const [hh, mm] = h24.split(":").map(Number);
  const ap = hh >= 12 ? "PM" : "AM";
  const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${h12}:${String(mm || 0).padStart(2, "0")} ${ap}`;
};

const STATUS_MAP = {
  approved: { bg: "var(--success-soft)", color: "var(--success)", label: "Approved" },
  pending:  { bg: "var(--warning-soft)", color: "var(--warning)", label: "Pending" },
  rejected: { bg: "var(--danger-soft)", color: "var(--danger)", label: "Rejected" },
};

export default function MainDashboard() {
  const [userName, setUserName] = useState("User");
  const [role, setRole] = useState("employee");
  const [summary, setSummary] = useState(null);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setRole(payload.role || "employee");
        if (payload.name) setUserName(payload.name);
      } catch (_) {}
    }
    loadDashboard();
    loadTodos();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get("/timesheet/dashboard/summary");
      setSummary(res.data);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTodos = async () => {
    try {
      const res = await api.get("/todos", { params: { filter: "Active", search: "" } });
      setTodos((res.data.data || []).slice(0, 5));
    } catch (err) {
      console.error("Todos load error:", err);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const isAdmin = role === "admin";
  const todayHours = summary?.todayHours?.total_hours || 0;
  const todayEntries = summary?.todayHours?.entry_count || 0;
  const weekHours = summary?.weekHours?.total_hours || 0;
  const weekEntries = summary?.weekHours?.entry_count || 0;
  const pendingModules = summary?.pendingModules?.count || 0;
  const pendingLeaves = summary?.pendingLeaves?.count || 0;
  const todoCount = summary?.todoCount?.count || 0;
  const recentEntries = summary?.recentEntries || [];
  const teamToday = summary?.teamTodayHours || {};
  const teamWeek = summary?.teamWeekHours || {};
  const totalEmployees = summary?.totalEmployees?.count || 0;
  const pendingApprovals = summary?.pendingApprovals?.count || 0;

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* ── GREETING ── */}
      <div className="md-greeting-card">
        <div className="md-greeting-text">
          <h2 className="md-greeting-title">{getGreeting()}, {userName.split(" ")[0]}!</h2>
          <p className="md-greeting-date">{dateStr}</p>
        </div>
        <div className="md-greeting-icon">
          <i className="bi bi-speedometer2" />
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="md-kpi-grid">
        <div className="md-kpi-card md-kpi-primary">
          <div className="md-kpi-icon-wrap"><i className="bi bi-clock" /></div>
          <div className="md-kpi-body">
            <span className="md-kpi-val">{fmtHrs(todayHours)}</span>
            <span className="md-kpi-label">Today's Hours</span>
            <span className="md-kpi-sub">{todayEntries} entries</span>
          </div>
        </div>
        <div className="md-kpi-card md-kpi-info">
          <div className="md-kpi-icon-wrap"><i className="bi bi-calendar-week" /></div>
          <div className="md-kpi-body">
            <span className="md-kpi-val">{fmtHrs(weekHours)}</span>
            <span className="md-kpi-label">This Week</span>
            <span className="md-kpi-sub">{weekEntries} entries</span>
          </div>
        </div>
        <div className="md-kpi-card md-kpi-warning">
          <div className="md-kpi-icon-wrap"><i className="bi bi-list-task" /></div>
          <div className="md-kpi-body">
            <span className="md-kpi-val">{pendingModules}</span>
            <span className="md-kpi-label">Active Modules</span>
            <span className="md-kpi-sub">in progress</span>
          </div>
        </div>
        <div className="md-kpi-card md-kpi-danger">
          <div className="md-kpi-icon-wrap"><i className="bi bi-calendar-x" /></div>
          <div className="md-kpi-body">
            <span className="md-kpi-val">{pendingLeaves}</span>
            <span className="md-kpi-label">Pending Leaves</span>
            <span className="md-kpi-sub">awaiting approval</span>
          </div>
        </div>
        {isAdmin && (
          <>
            <div className="md-kpi-card md-kpi-success">
              <div className="md-kpi-icon-wrap"><i className="bi bi-people" /></div>
              <div className="md-kpi-body">
                <span className="md-kpi-val">{teamToday.active_employees || 0}</span>
                <span className="md-kpi-label">Team Active Today</span>
                <span className="md-kpi-sub">{fmtHrs(teamToday.total_hours || 0)} logged</span>
              </div>
            </div>
            <div className="md-kpi-card md-kpi-purple">
              <div className="md-kpi-icon-wrap"><i className="bi bi-bar-chart" /></div>
              <div className="md-kpi-body">
                <span className="md-kpi-val">{fmtHrs(teamWeek.total_hours || 0)}</span>
                <span className="md-kpi-label">Team This Week</span>
                <span className="md-kpi-sub">{teamWeek.active_employees || 0} active</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="md-content-grid">

        {/* Left: Recent Activity */}
        <div className="md-card md-card-main">
          <div className="md-card-header">
            <div className="md-card-header-left">
              <span className="md-card-dot" style={{ background: "var(--primary)" }} />
              <h6 className="md-card-title">Recent Activity</h6>
            </div>
            <span className="md-badge" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
              Latest {recentEntries.length}
            </span>
          </div>

          {loading ? (
            <div className="md-loading"><i className="bi bi-arrow-repeat md-spin" /> Loading…</div>
          ) : recentEntries.length > 0 ? (
            <div className="md-activity-list">
              {recentEntries.map((entry, idx) => (
                <div key={entry.id || idx} className="md-activity-item">
                  <div className="md-activity-left">
                    <div className="md-activity-avatar">{(entry.project_name || "P")[0]}</div>
                    <div className="md-activity-line" />
                  </div>
                  <div className="md-activity-content">
                    <div className="md-activity-top">
                      <span className="md-activity-task">{entry.task_name || entry.work_description || "Permission"}</span>
                      <span className="md-activity-hours">{fmtHrs(entry.man_hrs)}</span>
                    </div>
                    <div className="md-activity-meta">
                      <span className="md-activity-project">{entry.project_name}</span>
                      <span className="md-activity-sep">·</span>
                      <span>{fmtDay(entry.date)}, {fmtDate(entry.date)}</span>
                      {entry.start_time && entry.end_time && (
                        <>
                          <span className="md-activity-sep">·</span>
                          <span>{to12h(entry.start_time?.substring(0, 5))} – {to12h(entry.end_time?.substring(0, 5))}</span>
                        </>
                      )}
                    </div>
                    {entry.work_description && entry.task_name !== entry.work_description && (
                      <div className="md-activity-desc">{entry.work_description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="md-empty-state">
              <i className="bi bi-inbox md-empty-icon" />
              <p className="md-empty-title">No activity yet</p>
              <p className="md-empty-sub">Your recent timesheet entries will appear here</p>
            </div>
          )}
        </div>

        {/* Right: Todos + Quick Actions */}
        <div className="md-side">
          {/* Todos */}
          <div className="md-card md-side-card">
            <div className="md-side-header">
              <i className="bi bi-check2-square" style={{ color: "var(--warning)" }} />
              <span>My Todos</span>
              <span className="md-badge" style={{ background: "var(--warning-soft)", color: "var(--warning)", marginLeft: "auto" }}>
                {todoCount}
              </span>
            </div>
            {todos.length > 0 ? (
              <div className="md-todo-list">
                {todos.map((todo) => (
                  <div key={todo.id} className="md-todo-item">
                    <div className="md-todo-dot" style={{
                      background: (todo.priority || "").toLowerCase() === "high" ? "var(--danger)" :
                                  (todo.priority || "").toLowerCase() === "medium" ? "var(--warning)" : "var(--success)"
                    }} />
                    <div className="md-todo-content">
                      <span className="md-todo-title">{todo.title}</span>
                      {todo.due_date && (
                        <span className="md-todo-due">Due: {new Date(todo.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                      )}
                    </div>
                    <span className={`md-todo-priority md-todo-priority-${(todo.priority || "").toLowerCase()}`}>
                      {todo.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="md-empty-mini">No active todos</div>
            )}
            <button className="md-view-all-btn" onClick={() => navigate("/todo")}>
              View All <i className="bi bi-arrow-right" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="md-card md-side-card">
            <div className="md-side-header">
              <i className="bi bi-lightning-charge" style={{ color: "var(--primary)" }} />
              <span>Quick Actions</span>
            </div>
            <div className="md-actions-grid">
              <button className="md-action-btn" onClick={() => navigate(isAdmin ? "/admin/timesheet" : "/employee/timesheet")}>
                <div className="md-action-icon" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                  <i className="bi bi-plus-circle" />
                </div>
                <span>Add Timesheet</span>
              </button>
              <button className="md-action-btn" onClick={() => navigate(isAdmin ? "/admin/leaves" : "/employee/leaves")}>
                <div className="md-action-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                  <i className="bi bi-calendar-plus" />
                </div>
                <span>Apply Leave</span>
              </button>
              <button className="md-action-btn" onClick={() => navigate("/tasks")}>
                <div className="md-action-icon" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
                  <i className="bi bi-list-task" />
                </div>
                <span>Modules</span>
              </button>
              <button className="md-action-btn" onClick={() => navigate("/todo")}>
                <div className="md-action-icon" style={{ background: "var(--info-soft)", color: "var(--info)" }}>
                  <i className="bi bi-check2-square" />
                </div>
                <span>Todo</span>
              </button>
            </div>
          </div>

          {/* Admin Quick Stats */}
          {isAdmin && (
            <div className="md-card md-side-card">
              <div className="md-side-header">
                <i className="bi bi-graph-up" style={{ color: "var(--success)" }} />
                <span>Admin Overview</span>
              </div>
              <div className="md-admin-stats">
                <div className="md-admin-row">
                  <span className="md-admin-label">Total Employees</span>
                  <span className="md-admin-val">{totalEmployees}</span>
                </div>
                <div className="md-admin-row">
                  <span className="md-admin-label">Pending Approvals</span>
                  <span className="md-admin-val" style={{ color: pendingApprovals > 0 ? "var(--warning)" : "var(--t-muted)" }}>
                    {pendingApprovals}
                  </span>
                </div>
                <div className="md-admin-row">
                  <span className="md-admin-label">Team Hours (Week)</span>
                  <span className="md-admin-val">{fmtHrs(teamWeek.total_hours || 0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

const styles = `
  /* ── Greeting ── */
  .md-greeting-card {
    display: flex; align-items: center; justify-content: space-between;
    background: linear-gradient(135deg, var(--primary) 0%, var(--purple) 100%);
    border-radius: var(--radius-lg); padding: 28px 24px;
    margin-bottom: 20px; color: #fff;
  }
  .md-greeting-title { font-size: 20px; font-weight: 700; margin: 0 0 4px; color: #fff; }
  .md-greeting-date { font-size: 13px; opacity: 0.85; margin: 0; color: #fff; }
  .md-greeting-icon { font-size: 42px; opacity: 0.2; }

  /* ── KPI Grid ── */
  .md-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(185px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .md-kpi-card {
    display: flex; align-items: center; gap: 14px;
    padding: 18px 16px; border-radius: var(--radius-lg);
    background: var(--bg-card); border: 1px solid var(--border);
    box-shadow: var(--shadow); transition: transform 0.2s, box-shadow 0.2s;
  }
  .md-kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .md-kpi-icon-wrap {
    width: 46px; height: 46px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }
  .md-kpi-primary .md-kpi-icon-wrap { background: var(--primary-soft); color: var(--primary); }
  .md-kpi-info .md-kpi-icon-wrap { background: var(--info-soft); color: var(--info); }
  .md-kpi-warning .md-kpi-icon-wrap { background: var(--warning-soft); color: var(--warning); }
  .md-kpi-danger .md-kpi-icon-wrap { background: var(--danger-soft); color: var(--danger); }
  .md-kpi-success .md-kpi-icon-wrap { background: var(--success-soft); color: var(--success); }
  .md-kpi-purple .md-kpi-icon-wrap { background: var(--purple-soft); color: var(--purple); }
  .md-kpi-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .md-kpi-val { font-size: 22px; font-weight: 800; color: var(--t-base); line-height: 1; letter-spacing: -0.02em; }
  .md-kpi-label { font-size: 11px; font-weight: 600; color: var(--t-muted); white-space: nowrap; }
  .md-kpi-sub { font-size: 10.5px; color: var(--t-muted); opacity: 0.7; white-space: nowrap; }

  /* ── Content Grid ── */
  .md-content-grid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; }
  @media (max-width: 1200px) { .md-content-grid { grid-template-columns: 1fr; } }

  /* ── Cards ── */
  .md-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow); min-width: 0;
  }
  .md-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .md-card-header-left { display: flex; align-items: center; gap: 8px; }
  .md-card-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .md-card-title { font-size: 14px; font-weight: 700; color: var(--t-base); margin: 0; }
  .md-badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }

  /* ── Activity List ── */
  .md-activity-list { display: flex; flex-direction: column; }
  .md-activity-item { display: flex; gap: 12px; }
  .md-activity-left { display: flex; flex-direction: column; align-items: center; }
  .md-activity-avatar {
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: var(--primary-soft); color: var(--primary);
    font-size: 13px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .md-activity-line { width: 2px; flex: 1; background: var(--border); margin: 4px 0; border-radius: 2px; }
  .md-activity-item:last-child .md-activity-line { display: none; }
  .md-activity-content { flex: 1; min-width: 0; padding-bottom: 16px; }
  .md-activity-item:last-child .md-activity-content { padding-bottom: 0; }
  .md-activity-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .md-activity-task { font-size: 13px; font-weight: 600; color: var(--t-base); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .md-activity-hours { font-size: 12px; font-weight: 700; color: var(--primary); background: var(--primary-soft); padding: 3px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0; }
  .md-activity-meta { font-size: 11.5px; color: var(--t-muted); display: flex; gap: 4px; margin-top: 3px; flex-wrap: wrap; align-items: center; }
  .md-activity-project { font-weight: 600; color: var(--primary); }
  .md-activity-sep { opacity: 0.4; }
  .md-activity-desc { font-size: 11.5px; color: var(--t-muted); margin-top: 4px; line-height: 1.4; }

  /* ── Side panel ── */
  .md-side { display: flex; flex-direction: column; gap: 16px; }
  .md-side-card { padding: 18px; }
  .md-side-header {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 700; color: var(--t-base); margin-bottom: 14px;
  }
  .md-side-header i { font-size: 16px; }

  /* ── Todos ── */
  .md-todo-list { display: flex; flex-direction: column; gap: 6px; }
  .md-todo-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: var(--radius);
    border: 1px solid var(--border); transition: background 0.12s;
  }
  .md-todo-item:hover { background: var(--primary-soft); }
  .md-todo-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .md-todo-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .md-todo-title { font-size: 12.5px; font-weight: 600; color: var(--t-base); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .md-todo-due { font-size: 10.5px; color: var(--t-muted); }
  .md-todo-priority { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; white-space: nowrap; flex-shrink: 0; }
  .md-todo-priority-high { background: var(--danger-soft); color: var(--danger); }
  .md-todo-priority-medium { background: var(--orange-soft); color: var(--orange); }
  .md-todo-priority-low { background: var(--success-soft); color: var(--success); }

  .md-view-all-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    width: 100%; padding: 8px; margin-top: 10px;
    background: transparent; border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 12px; font-weight: 600; color: var(--primary); cursor: pointer;
    transition: all 0.15s; font-family: var(--font);
  }
  .md-view-all-btn:hover { background: var(--primary-soft); border-color: var(--primary); }

  /* ── Quick Actions ── */
  .md-actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .md-action-btn {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 14px 8px; background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--radius); cursor: pointer; transition: all 0.15s;
    font-family: var(--font);
  }
  .md-action-btn:hover { border-color: var(--primary); background: var(--primary-soft); }
  .md-action-btn span { font-size: 11.5px; font-weight: 600; color: var(--t-base); }
  .md-action-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; font-size: 16px;
  }

  /* ── Admin stats ── */
  .md-admin-stats { display: flex; flex-direction: column; gap: 10px; }
  .md-admin-row { display: flex; align-items: center; justify-content: space-between; }
  .md-admin-label { font-size: 12.5px; color: var(--t-muted); }
  .md-admin-val { font-size: 14px; font-weight: 700; color: var(--t-base); }

  /* ── Empty / Loading ── */
  .md-loading { text-align: center; color: var(--t-muted); padding: 40px 0; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .md-empty-state { text-align: center; padding: 40px 20px; }
  .md-empty-icon { font-size: 36px; color: var(--t-muted); opacity: 0.3; display: block; margin-bottom: 10px; }
  .md-empty-title { font-size: 13px; font-weight: 700; color: var(--t-base); margin: 0 0 4px; }
  .md-empty-sub { font-size: 12px; color: var(--t-muted); margin: 0; }
  .md-empty-mini { text-align: center; color: var(--t-muted); padding: 16px; font-size: 12px; }

  .md-spin { animation: md-spin 0.7s linear infinite; display: inline-block; }
  @keyframes md-spin { to { transform: rotate(360deg); } }

  @media (max-width: 1024px) { .md-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 600px) {
    .md-kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .md-greeting-card { padding: 20px 16px; }
    .md-greeting-title { font-size: 17px; }
    .md-actions-grid { grid-template-columns: 1fr 1fr; }
  }
`;
