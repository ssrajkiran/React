import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import AppLayout from "../../components/layout/AppLayout";
import { fmtDate as fmtDateShared, fmtDateLong as fmtDateLongShared } from "../../utils";

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
  return fmtDateShared(iso);
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
  const [birthdays, setBirthdays] = useState([]);
  const [myBirthday, setMyBirthday] = useState(false);
  const [showBdayModal, setShowBdayModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();

  const confetti = useMemo(() => {
    const colors = ["#EC4899", "#8B5CF6", "#22D3EE", "#FBBF24", "#34D399", "#F472B6"];
    return Array.from({ length: 48 }, (_, i) => ({
      left: `${(i * 37 + 11) % 100}%`,
      width: `${6 + (i % 4) * 3}px`,
      height: `${10 + (i % 3) * 5}px`,
      background: colors[i % colors.length],
      borderRadius: i % 3 === 0 ? "50%" : "2px",
      animationDelay: `-${((i * 0.37) % 4).toFixed(2)}s`,
      animationDuration: `${2.6 + (i % 5) * 0.7}s`,
    }));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setRole(payload.role || "employee");
        if (payload.name) setUserName(payload.name);
        else {
          api.get("/auth/profile")
            .then((r) => { if (r.data?.name) setUserName(r.data.name); })
            .catch(() => {});
        }
      } catch (_) {}
    }
    loadDashboard();
    loadTodos();
    api.get("/auth/birthdays/today")
      .then((res) => {
        setBirthdays(res.data.birthdays || []);
        const mine = !!res.data.mine;
        setMyBirthday(mine);
        if (mine && !sessionStorage.getItem("bdayModalSeen")) {
          sessionStorage.setItem("bdayModalSeen", "1");
          setShowBdayModal(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
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
  const dateStr = fmtDateLongShared(today);

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
  const todayPct = Math.min(((Number(todayHours) || 0) / 8) * 100, 100);

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* ── HEADER ── */}
      <div className="md-head">
        <div className="md-head-left">
          <span className="md-eyebrow">{dateStr}</span>
          <h2 className="md-head-title">{getGreeting()}, {userName.split(" ")[0]}!</h2>
          <p className="md-head-sub">Here is your work snapshot for the day.</p>
        </div>
        <div className="md-head-clock">
          <span className="md-head-clock-time">
            {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
          </span>
          <span className="md-head-clock-label">Local time</span>
        </div>
      </div>

      {/* ── BIRTHDAY STRIP ── */}
      {birthdays.length > 0 && (
        <div className="md-bday-strip">
          <span className="md-bday-strip-icon"><i className="bi bi-gift" /></span>
          <span className="md-bday-strip-label">
            {myBirthday ? "Your birthday today" : "Today's birthdays"}
          </span>
          <span className="md-bday-strip-people">
            {birthdays.map((b) => (
              <span className="md-bday-chip" key={b.id}>
                <span className="md-bday-avatar">
                  {b.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                {b.name}
              </span>
            ))}
          </span>
          {myBirthday && userName !== "User" && (
            <span className="md-bday-strip-wish">Happy birthday, {userName.split(" ")[0]}!</span>
          )}
        </div>
      )}

      {/* ── BIRTHDAY MODAL ── */}
      {showBdayModal && userName !== "User" && (
        <div className="bday-overlay" onClick={() => setShowBdayModal(false)}>
          <div className="bday-confetti" aria-hidden="true">
            {confetti.map((c, i) => (
              <span key={i} className="bday-confetti-piece" style={c} />
            ))}
          </div>
          <div className="bday-orb bday-orb-1" aria-hidden="true" />
          <div className="bday-orb bday-orb-2" aria-hidden="true" />
          <div className="bday-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bday-art">
              <div className="bday-art-ring" />
              <div className="bday-art-ring bday-art-ring-2" />
              <span className="bday-art-badge"><i className="bi bi-gift" /></span>
              <span className="bday-art-date">
                {today.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }).toUpperCase()}
              </span>
              <span className="bday-art-year">{today.getFullYear()}</span>
            </div>
            <div className="bday-body">
              <span className="bday-kicker">Today is your day</span>
              <h2 className="bday-heading">
                Happy Birthday, <span className="bday-name">{userName}</span>!
              </h2>
              <div className="bday-divider" />
              <p className="bday-wish">
                Wishing you a wonderful year ahead — full of success, good health
                and great memories. Cheers to you!
              </p>
              <button className="bday-cta" onClick={() => setShowBdayModal(false)}>
                Cheers! <i className="bi bi-arrow-right" />
              </button>
              <div className="bday-meta">From your team at Voltech</div>
            </div>
          </div>
        </div>
      )}

      {/* ── SNAPSHOT: hero + rail ── */}
      <div className="md-hero-grid">
        <div className="md-hero">
          <div className="md-hero-top">
            <span className="md-hero-label">Today's Hours</span>
            <span className="md-hero-chip">{todayEntries} {todayEntries === 1 ? "entry" : "entries"}</span>
          </div>
          <div className="md-hero-val">{fmtHrs(todayHours)}</div>
          <div className="md-hero-progress">
            <div className="md-hero-bar">
              <span style={{ width: `${todayPct}%` }} />
            </div>
            <span className="md-hero-progress-label">{Math.round(todayPct)}% of 8h target</span>
          </div>
        </div>

        <div className="md-rail">
          <div className="md-rail-tile md-tint-info md-rail-clickable" role="button" tabIndex={0}
            onClick={() => navigate(isAdmin ? "/admin/timesheet" : "/employee/timesheet")}
            onKeyDown={(e) => e.key === "Enter" && navigate(isAdmin ? "/admin/timesheet" : "/employee/timesheet")}>
            <span className="md-rail-icon">
              <i className="bi bi-calendar-week" />
            </span>
            <span className="md-rail-val">{fmtHrs(weekHours)}</span>
            <span className="md-rail-label">This week</span>
            <span className="md-rail-sub">{weekEntries} entries</span>
          </div>
          <div className="md-rail-tile md-tint-warning md-rail-clickable" role="button" tabIndex={0}
            onClick={() => navigate("/tasks")}
            onKeyDown={(e) => e.key === "Enter" && navigate("/tasks")}>
            <span className="md-rail-icon">
              <i className="bi bi-list-task" />
            </span>
            <span className="md-rail-val">{pendingModules}</span>
            <span className="md-rail-label">Active modules</span>
            <span className="md-rail-sub">in progress</span>
          </div>
          <div className="md-rail-tile md-tint-danger md-rail-clickable" role="button" tabIndex={0}
            onClick={() => navigate(isAdmin ? "/admin/leaves?status=pending" : "/employee/leaves?status=pending")}
            onKeyDown={(e) => e.key === "Enter" && navigate(isAdmin ? "/admin/leaves?status=pending" : "/employee/leaves?status=pending")}>
            <span className="md-rail-icon">
              <i className="bi bi-calendar-x" />
            </span>
            <span className="md-rail-val">{pendingLeaves}</span>
            <span className="md-rail-label">Pending leaves</span>
            <span className="md-rail-sub">awaiting approval</span>
          </div>
          {isAdmin && (
            <>
              <div className="md-rail-tile md-tint-success md-rail-clickable" role="button" tabIndex={0}
                onClick={() => navigate("/admin/timesheet")}
                onKeyDown={(e) => e.key === "Enter" && navigate("/admin/timesheet")}>
                <span className="md-rail-icon">
                  <i className="bi bi-people" />
                </span>
                <span className="md-rail-val">{teamToday.active_employees || 0}</span>
                <span className="md-rail-label">Team active today</span>
                <span className="md-rail-sub">{fmtHrs(teamToday.total_hours || 0)} logged</span>
              </div>
              <div className="md-rail-tile md-tint-purple md-rail-clickable" role="button" tabIndex={0}
                onClick={() => navigate("/admin/timesheet")}
                onKeyDown={(e) => e.key === "Enter" && navigate("/admin/timesheet")}>
                <span className="md-rail-icon">
                  <i className="bi bi-bar-chart" />
                </span>
                <span className="md-rail-val">{fmtHrs(teamWeek.total_hours || 0)}</span>
                <span className="md-rail-label">Team this week</span>
                <span className="md-rail-sub">{teamWeek.active_employees || 0} active</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="md-content-grid">

        {/* Left: Recent Activity */}
        <div className="md-card md-card-main">
          <div className="md-section">
            <span className="md-section-label">Recent Activity</span>
            <span className="md-badge" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
              Latest {recentEntries.length}
            </span>
          </div>

          {loading ? (
            <div className="md-loading"><i className="bi bi-arrow-repeat md-spin" /> Laying out your day…</div>
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
                        <span className="md-todo-due">Due: {fmtDate(todo.due_date)}</span>
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
            <div className="md-action-rows">
              <button className="md-action-row" onClick={() => navigate(isAdmin ? "/admin/timesheet" : "/employee/timesheet")}>
                <span className="md-action-row-icon" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                  <i className="bi bi-plus-circle" />
                </span>
                <span className="md-action-row-label">Add Timesheet</span>
                <i className="bi bi-chevron-right md-action-row-chev" />
              </button>
              <button className="md-action-row" onClick={() => navigate(isAdmin ? "/admin/leaves" : "/employee/leaves")}>
                <span className="md-action-row-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                  <i className="bi bi-calendar-plus" />
                </span>
                <span className="md-action-row-label">Apply Leave</span>
                <i className="bi bi-chevron-right md-action-row-chev" />
              </button>
              <button className="md-action-row" onClick={() => navigate("/tasks")}>
                <span className="md-action-row-icon" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
                  <i className="bi bi-list-task" />
                </span>
                <span className="md-action-row-label">Modules</span>
                <i className="bi bi-chevron-right md-action-row-chev" />
              </button>
              <button className="md-action-row" onClick={() => navigate("/todo")}>
                <span className="md-action-row-icon" style={{ background: "var(--info-soft)", color: "var(--info)" }}>
                  <i className="bi bi-check2-square" />
                </span>
                <span className="md-action-row-label">Todo</span>
                <i className="bi bi-chevron-right md-action-row-chev" />
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
                <div className="md-admin-row md-admin-clickable" role="button" tabIndex={0}
                  onClick={() => navigate("/employee/userslist")}
                  onKeyDown={(e) => e.key === "Enter" && navigate("/employee/userslist")}>
                  <span className="md-admin-label">Total Employees</span>
                  <span className="md-admin-val">{totalEmployees} <i className="bi bi-chevron-right" /></span>
                </div>
                <div className="md-admin-row md-admin-clickable" role="button" tabIndex={0}
                  onClick={() => navigate(isAdmin ? "/admin/leaves?status=pending" : "/employee/leaves?status=pending")}
                  onKeyDown={(e) => e.key === "Enter" && navigate(isAdmin ? "/admin/leaves?status=pending" : "/employee/leaves?status=pending")}>
                  <span className="md-admin-label">Pending Approvals</span>
                  <span className="md-admin-val" style={{ color: pendingApprovals > 0 ? "var(--warning)" : "var(--t-muted)" }}>
                    {pendingApprovals} <i className="bi bi-chevron-right" />
                  </span>
                </div>
                <div className="md-admin-row md-admin-clickable" role="button" tabIndex={0}
                  onClick={() => navigate(isAdmin ? "/admin/timesheet" : "/employee/timesheet")}
                  onKeyDown={(e) => e.key === "Enter" && navigate(isAdmin ? "/admin/timesheet" : "/employee/timesheet")}>
                  <span className="md-admin-label">Team Hours (Week)</span>
                  <span className="md-admin-val">{fmtHrs(teamWeek.total_hours || 0)} <i className="bi bi-chevron-right" /></span>
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
  /* ── Borderless canvas ── */
  .page-content { background: var(--bg); }

  /* ── Header ── */
  .md-head {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 16px; margin-bottom: 20px;
  }
  .md-eyebrow {
    display: block; font-size: 11px; font-weight: 700; letter-spacing: 1.6px;
    text-transform: uppercase; color: var(--primary); margin-bottom: 6px;
  }
  .md-head-title { font-size: 24px; font-weight: 800; margin: 0; color: var(--t-base); letter-spacing: -0.02em; }
  .md-head-sub { font-size: 13px; color: var(--t-muted); margin: 5px 0 0; }
  .md-head-clock {
    text-align: right; flex-shrink: 0;
    padding: 10px 16px; border-radius: var(--radius);
    background: var(--bg-card);
    box-shadow: var(--shadow-card), 0 18px 44px -20px rgba(15, 23, 42, 0.18);
  }
  .md-head-clock-time {
    display: block; font-size: 20px; font-weight: 700; color: var(--t-base);
    font-variant-numeric: tabular-nums; letter-spacing: 0.02em; line-height: 1.1;
  }
  .md-head-clock-label {
    display: block; font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; color: var(--t-muted); margin-top: 2px;
  }

  /* ── Birthday strip (corporate) ── */
  .md-bday-strip {
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
    background: linear-gradient(90deg, rgba(236, 72, 153, 0.10), var(--bg-card) 55%);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card), 0 18px 44px -22px rgba(236, 72, 153, 0.30);
    padding: 13px 18px; margin-bottom: 20px;
  }
  .md-bday-strip-icon {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    display: grid; place-items: center; font-size: 16px;
    background: var(--pink-soft); color: var(--pink);
  }
  .md-bday-strip-label {
    font-size: 12px; font-weight: 700; color: var(--t-muted);
    text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap;
  }
  .md-bday-strip-people { display: flex; gap: 8px; flex-wrap: wrap; }
  .md-bday-chip {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 13px; font-weight: 600; color: var(--t-base);
    background: var(--bg-card);
    box-shadow: var(--shadow-sm);
    padding: 4px 12px 4px 5px; border-radius: 999px;
  }
  .md-bday-avatar {
    width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
    display: grid; place-items: center;
    font-size: 10px; font-weight: 700; color: var(--on-primary);
    background: linear-gradient(135deg, var(--primary), #EC4899);
  }
  .md-bday-strip-wish {
    margin-left: auto; font-size: 13px; font-weight: 700; color: var(--pink);
    white-space: nowrap;
  }

  /* ── Birthday modal (split panel) ── */
  .bday-overlay {
    position: fixed; inset: 0; z-index: 9999;
    display: grid; place-items: center; padding: 24px;
    background:
      radial-gradient(1100px 550px at 50% -10%, rgba(139, 92, 246, 0.18), transparent 60%),
      radial-gradient(900px 500px at 85% 110%, rgba(236, 72, 153, 0.14), transparent 55%),
      rgba(2, 6, 23, 0.62);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: bdayFadeIn 0.3s ease;
  }
  .bday-confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .bday-confetti-piece {
    position: absolute; top: -24px; opacity: 0.9;
    animation-name: bdayFall; animation-timing-function: linear;
    animation-iteration-count: infinite;
  }
  .bday-orb { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.35; pointer-events: none; }
  .bday-orb-1 { width: 320px; height: 320px; background: #8B5CF6; top: -90px; left: -70px; animation: bdayOrb 9s ease-in-out infinite alternate; }
  .bday-orb-2 { width: 280px; height: 280px; background: #EC4899; bottom: -80px; right: -60px; animation: bdayOrb 11s ease-in-out infinite alternate-reverse; }
  .bday-modal {
    position: relative; z-index: 2; overflow: hidden;
    display: grid; grid-template-columns: 172px 1fr;
    width: min(640px, 100%);
    background: var(--bg-card);
    border-radius: 20px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45), var(--shadow-lg);
    animation: bdayPop 0.5s cubic-bezier(0.2, 0.9, 0.25, 1.15);
  }
  .bday-art {
    position: relative; overflow: hidden;
    background: linear-gradient(165deg, #EC4899 0%, #8B5CF6 100%);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
    padding: 24px 12px;
  }
  .bday-art::before {
    content: ""; position: absolute; inset: 0;
    background-image: radial-gradient(rgba(255, 255, 255, 0.22) 1.2px, transparent 1.3px);
    background-size: 16px 16px; opacity: 0.5;
  }
  .bday-art-ring {
    position: absolute; width: 130px; height: 130px; border-radius: 50%;
    border: 1.5px dashed rgba(255, 255, 255, 0.35); top: -34px; right: -40px;
    animation: bdaySpin 22s linear infinite;
  }
  .bday-art-ring-2 { width: 90px; height: 90px; top: auto; right: auto; bottom: -26px; left: -30px; animation-direction: reverse; animation-duration: 16s; }
  .bday-art-badge {
    position: relative; z-index: 1;
    width: 72px; height: 72px; border-radius: 50%;
    display: grid; place-items: center; font-size: 30px; color: #fff;
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(4px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    animation: bdayFloat 3s ease-in-out infinite;
  }
  .bday-art-date {
    position: relative; z-index: 1;
    font-size: 13px; font-weight: 800; letter-spacing: 2.5px; color: #fff;
  }
  .bday-art-year {
    position: relative; z-index: 1;
    font-size: 10px; font-weight: 700; letter-spacing: 3px; color: rgba(255, 255, 255, 0.7);
  }
  .bday-body { padding: 32px 34px 28px; display: flex; flex-direction: column; align-items: flex-start; }
  .bday-kicker {
    font-size: 11px; font-weight: 700; letter-spacing: 2.5px;
    text-transform: uppercase; color: var(--pink); margin-bottom: 10px;
  }
  .bday-heading { margin: 0; font-size: 25px; font-weight: 800; line-height: 1.3; color: var(--t-base); letter-spacing: -0.02em; }
  .bday-name {
    background: linear-gradient(90deg, #EC4899, #8B5CF6);
    -webkit-background-clip: text; background-clip: text;
    color: transparent; -webkit-text-fill-color: transparent;
  }
  .bday-divider {
    width: 64px; height: 3px; margin: 16px 0; border-radius: 3px;
    background: linear-gradient(90deg, #EC4899, #8B5CF6);
  }
  .bday-wish { margin: 0 0 22px; font-size: 13.5px; line-height: 1.7; color: var(--t-muted); }
  .bday-cta {
    display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
    border: 0; padding: 12px 28px; border-radius: 999px;
    font-size: 13.5px; font-weight: 700; color: #fff;
    background: linear-gradient(90deg, #EC4899, #8B5CF6);
    box-shadow: 0 10px 26px rgba(139, 92, 246, 0.35);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .bday-cta:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(236, 72, 153, 0.4); }
  .bday-meta {
    margin-top: 18px; font-size: 10px; letter-spacing: 2px;
    text-transform: uppercase; color: var(--t-muted);
  }
  @keyframes bdayFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes bdayPop { from { opacity: 0; transform: scale(0.92) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  @keyframes bdayFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  @keyframes bdayOrb { from { transform: translate(0, 0); } to { transform: translate(40px, 30px); } }
  @keyframes bdaySpin { to { transform: rotate(360deg); } }
  @keyframes bdayFall {
    0% { transform: translateY(-6vh) rotate(0deg); opacity: 1; }
    85% { opacity: 0.9; }
    100% { transform: translateY(112vh) rotate(720deg); opacity: 0; }
  }
  @media (max-width: 560px) {
    .bday-modal { grid-template-columns: 1fr; }
    .bday-art { flex-direction: row; gap: 12px; padding: 18px; }
    .bday-art-badge { width: 52px; height: 52px; font-size: 22px; }
    .bday-art-ring { display: none; }
    .bday-body { padding: 26px 22px 24px; }
    .bday-heading { font-size: 21px; }
    .md-head-clock { display: none; }
    .md-bday-strip-wish { margin-left: 0; }
  }

  /* ── Hero + rail ── */
  .md-hero-grid {
    display: grid; grid-template-columns: minmax(250px, 320px) 1fr;
    gap: 16px; margin-bottom: 20px;
  }
  .md-hero {
    position: relative; overflow: hidden;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 22px 24px;
    color: var(--t-base); display: flex; flex-direction: column; gap: 14px;
    box-shadow: var(--shadow-card);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .md-hero:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
  }
  .md-hero::after {
    content: ""; position: absolute; top: -30px; right: -30px;
    width: 140px; height: 140px; border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--primary) 14%, transparent) 0%, transparent 70%);
    pointer-events: none;
    animation: md-hero-pulse 4s ease-in-out infinite alternate;
  }
  @keyframes md-hero-pulse {
    0% { transform: scale(0.9); opacity: 0.4; }
    100% { transform: scale(1.15); opacity: 0.85; }
  }
  .md-hero-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; position: relative; z-index: 1; }
  .md-hero-label {
    font-size: 11px; font-weight: 700; letter-spacing: 1.6px;
    text-transform: uppercase; color: var(--t-muted);
  }
  .md-hero-chip {
    font-size: 10.5px; font-weight: 600; color: var(--primary);
    background: var(--primary-soft);
    border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
    padding: 3px 10px; border-radius: 999px; white-space: nowrap;
    transition: all 0.2s ease;
  }
  .md-hero-val {
    font-size: 44px; font-weight: 800; line-height: 1;
    letter-spacing: -0.03em; font-variant-numeric: tabular-nums;
    color: var(--t-base);
    position: relative; z-index: 1;
  }
  .md-hero-progress { display: flex; flex-direction: column; gap: 7px; position: relative; z-index: 1; }
  .md-hero-bar {
    height: 7px; border-radius: 6px;
    background: var(--bg-muted);
    border: 1px solid var(--border-soft);
    overflow: hidden;
    position: relative;
  }
  .md-hero-bar span {
    display: block; height: 100%; border-radius: 6px;
    background: linear-gradient(90deg, var(--primary), var(--primary-light), var(--primary));
    background-size: 200% 100%;
    animation: md-bar-shimmer 2.5s ease-in-out infinite;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 10px color-mix(in srgb, var(--primary) 35%, transparent);
  }
  @keyframes md-bar-shimmer {
    0% { background-position: 100% 0; }
    100% { background-position: -100% 0; }
  }
  .md-hero-progress-label { font-size: 11px; color: var(--t-muted); font-variant-numeric: tabular-nums; }

  .md-rail {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }
  .md-rail-tile {
    padding: 16px 18px; border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    display: flex; flex-direction: column; gap: 3px; min-width: 0;
    position: relative; box-shadow: var(--shadow-sm);
    transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
  }
  .md-rail-tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
  .md-rail-tile.md-tint-info { background: var(--info-soft); }
  .md-rail-tile.md-tint-warning { background: var(--warning-soft); }
  .md-rail-tile.md-tint-danger { background: var(--danger-soft); }
  .md-rail-tile.md-tint-success { background: var(--success-soft); }
  .md-rail-tile.md-tint-purple { background: var(--purple-soft); }
  .md-tint-info .md-rail-val, .md-tint-info .md-rail-icon { color: var(--info); }
  .md-tint-warning .md-rail-val, .md-tint-warning .md-rail-icon { color: var(--warning); }
  .md-tint-danger .md-rail-val, .md-tint-danger .md-rail-icon { color: var(--danger); }
  .md-tint-success .md-rail-val, .md-tint-success .md-rail-icon { color: var(--success); }
  .md-tint-purple .md-rail-val, .md-tint-purple .md-rail-icon { color: var(--purple); }
  .md-rail-icon {
    position: absolute; top: 14px; right: 14px;
    width: 28px; height: 28px; border-radius: 8px;
    display: grid; place-items: center; font-size: 13px;
    background: var(--bg-card); box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-soft);
  }
  .md-rail-val {
    font-size: 22px; font-weight: 800;
    line-height: 1.1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums;
    padding-right: 32px;
  }
  .md-rail-label { font-size: 11.5px; font-weight: 700; color: var(--t-base); opacity: 0.75; }
  .md-rail-sub { font-size: 10.5px; color: var(--t-muted); }

  /* ── Content Grid ── */
  .md-content-grid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; }
  @media (max-width: 1200px) { .md-content-grid { grid-template-columns: 1fr; } }

  /* ── Cards ── */
  .md-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 20px; min-width: 0;
    box-shadow: var(--shadow-card);
  }
  .md-section { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .md-section-label {
    display: flex; align-items: center; gap: 9px;
    font-size: 11px; font-weight: 700; letter-spacing: 1.4px;
    text-transform: uppercase; color: var(--t-muted);
  }
  .md-section-label::before { content: ""; width: 3px; height: 13px; border-radius: 2px; background: var(--primary); }
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
    font-size: 11px; font-weight: 700; letter-spacing: 1.4px;
    text-transform: uppercase; color: var(--t-muted); margin-bottom: 14px;
  }
  .md-side-header i { font-size: 14px; }

  /* ── Todos ── */
  .md-todo-list { display: flex; flex-direction: column; gap: 6px; }
  .md-todo-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; border-radius: var(--radius);
    background: var(--bg-muted); transition: background 0.12s;
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
    background: transparent; border: none; border-radius: var(--radius);
    font-size: 12px; font-weight: 600; color: var(--primary); cursor: pointer;
    transition: all 0.15s; font-family: var(--font);
  }
  .md-view-all-btn:hover { background: var(--primary-soft); }

  /* ── Quick actions (rows) ── */
  .md-action-rows { display: flex; flex-direction: column; gap: 6px; }
  .md-action-row {
    display: flex; align-items: center; gap: 11px; width: 100%;
    padding: 9px 12px; background: var(--bg-muted);
    border: none; border-radius: var(--radius);
    cursor: pointer; transition: all 0.15s;
    font-family: var(--font); text-align: left;
  }
  .md-action-row:hover { background: var(--primary-soft); }
  .md-action-row:hover .md-action-row-chev { transform: translateX(2px); color: var(--primary); }
  .md-action-row-icon {
    width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 14px;
  }
  .md-action-row-label { flex: 1; font-size: 12.5px; font-weight: 600; color: var(--t-base); }
  .md-action-row-chev { font-size: 12px; color: var(--t-muted); transition: all 0.15s; }

  /* ── Admin stats ── */
  .md-admin-stats { display: flex; flex-direction: column; gap: 10px; }
  .md-admin-row { display: flex; align-items: center; justify-content: space-between; }
  .md-admin-label { font-size: 12.5px; color: var(--t-muted); }
  .md-admin-val { font-size: 14px; font-weight: 700; color: var(--t-base); }
  .md-admin-val i { font-size: 11px; color: var(--t-muted); margin-left: 2px; }
  .md-admin-clickable { cursor: pointer; border-radius: var(--radius); padding: 7px 8px; margin: -7px -8px; transition: background 0.15s; }
  .md-admin-clickable:hover { background: var(--bg-muted); }
  .md-admin-clickable:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
  .md-rail-clickable { cursor: pointer; }
  .md-rail-clickable:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

  /* ── Empty / Loading ── */
  .md-loading { text-align: center; color: var(--t-muted); padding: 40px 0; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .md-empty-state { text-align: center; padding: 40px 20px; }
  .md-empty-icon { font-size: 36px; color: var(--t-muted); opacity: 0.3; display: block; margin-bottom: 10px; }
  .md-empty-title { font-size: 13px; font-weight: 700; color: var(--t-base); margin: 0 0 4px; }
  .md-empty-sub { font-size: 12px; color: var(--t-muted); margin: 0; }
  .md-empty-mini { text-align: center; color: var(--t-muted); padding: 16px; font-size: 12px; }

  .md-spin { animation: md-spin 0.7s linear infinite; display: inline-block; }
  @keyframes md-spin { to { transform: rotate(360deg); } }

  @media (max-width: 1200px) { .md-hero-grid { grid-template-columns: 1fr; } }
  @media (max-width: 600px) {
    .md-head { flex-direction: column; align-items: flex-start; gap: 12px; }
    .md-head-title { font-size: 20px; }
    .md-hero-val { font-size: 36px; }
    .md-rail { grid-template-columns: repeat(2, 1fr); }
  }

  /* ===== CARD GLOSS (subtle top sheen, theme-aware) ===== */
  .md-card, .md-side-card, .md-rail-tile {
    background: var(--gloss-sheen), var(--bg-card);
    box-shadow: inset 0 1px 0 var(--gloss-hi), var(--shadow-card);
  }
  .md-rail-tile.md-tint-info { background: var(--gloss-sheen), var(--info-soft); }
  .md-rail-tile.md-tint-warning { background: var(--gloss-sheen), var(--warning-soft); }
  .md-rail-tile.md-tint-danger { background: var(--gloss-sheen), var(--danger-soft); }
  .md-rail-tile.md-tint-success { background: var(--gloss-sheen), var(--success-soft); }
  .md-rail-tile.md-tint-purple { background: var(--gloss-sheen), var(--purple-soft); }
`;
