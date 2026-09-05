import { useState, useEffect } from "react";
import api from "../../api";
import AppLayout from "../../components/layout/AppLayout";

const fmtDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const fmtDay = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", { weekday: "short" });
};

const getDayName = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });

const STATUS_MAP = {
  approved: { bg: "var(--success-soft)", color: "var(--success)", label: "Approved", icon: "bi-check-circle-fill" },
  pending:  { bg: "var(--warning-soft)", color: "var(--warning)", label: "Pending", icon: "bi-hourglass-split" },
  rejected: { bg: "var(--danger-soft)", color: "var(--danger)", label: "Rejected", icon: "bi-x-circle-fill" },
};

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [employeeSummary, setEmployeeSummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadRequests();
    loadEmployees();
    loadHolidays();
    loadEmployeeSummary();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await api.get("/leaves/alladmin");
      const normalized = res.data.map(r => ({
        ...r,
        from_date: r.from_date || r.start || null,
        to_date: r.to_date || r.end || r.from_date || r.start || null,
      }));
      setRequests(normalized);
    } catch (err) { console.error(err); }
  };

  const loadEmployees = async () => {
    try {
      const res = await api.get("/leaves/users");
      setEmployees(res.data);
    } catch (err) { console.error(err); }
  };

  const loadHolidays = async () => {
    try {
      const res = await api.get("/holidays/list");
      setHolidays(res.data);
    } catch (err) { console.error(err); }
  };

  const loadEmployeeSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get("/leaves/employee-summary");
      setEmployeeSummary(res.data);
    } catch (err) { console.error(err); setEmployeeSummary([]); }
    finally { setSummaryLoading(false); }
  };

  const stripTime = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Stats
  const totalEmployees = employees.length;
  const totalRequests = requests.length;
  const approvedRequests = requests.filter(r => r.status === "approved").length;
  const pendingRequests = requests.filter(r => r.status === "pending").length;
  const rejectedRequests = requests.filter(r => r.status === "rejected").length;
  const leaveDaysUsed = requests
    .filter(r => r.status === "approved")
    .reduce((sum, r) => sum + parseFloat(r.days || 0), 0)
    .toFixed(1);

  const todayDate = stripTime(new Date());
  const todaysLeaves = requests.filter(r => {
    const start = stripTime(new Date(r.from_date));
    const end = r.to_date ? stripTime(new Date(r.to_date)) : start;
    return start <= todayDate && todayDate <= end && r.status === "approved";
  });

  const upcomingHolidays = holidays
    .filter(h => stripTime(new Date(h.date)) >= todayDate)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.from_date) - new Date(a.from_date))
    .slice(0, 8);

  const filteredSummary = employeeSummary.filter(e =>
    e.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* ── PAGE HEADER ── */}
      <div className="db-page-header">
        <div>
          <h5 className="db-page-title">Leave Dashboard</h5>
          <nav className="db-breadcrumb">
            <span>Dashboard</span>
            <i className="bi bi-chevron-right" />
            <span>Leave Dashboard</span>
          </nav>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="db-kpi-grid">
        <div className="db-kpi-card db-kpi-primary">
          <div className="db-kpi-icon-wrap"><i className="bi bi-people" /></div>
          <div className="db-kpi-body">
            <span className="db-kpi-val">{totalEmployees}</span>
            <span className="db-kpi-label">Total Employees</span>
          </div>
        </div>
        <div className="db-kpi-card db-kpi-info">
          <div className="db-kpi-icon-wrap"><i className="bi bi-file-earmark-text" /></div>
          <div className="db-kpi-body">
            <span className="db-kpi-val">{totalRequests}</span>
            <span className="db-kpi-label">Total Requests</span>
          </div>
        </div>
        <div className="db-kpi-card db-kpi-success">
          <div className="db-kpi-icon-wrap"><i className="bi bi-check-circle" /></div>
          <div className="db-kpi-body">
            <span className="db-kpi-val">{approvedRequests}</span>
            <span className="db-kpi-label">Approved</span>
          </div>
        </div>
        <div className="db-kpi-card db-kpi-warning">
          <div className="db-kpi-icon-wrap"><i className="bi bi-hourglass-split" /></div>
          <div className="db-kpi-body">
            <span className="db-kpi-val">{pendingRequests}</span>
            <span className="db-kpi-label">Pending</span>
          </div>
        </div>
        <div className="db-kpi-card db-kpi-danger">
          <div className="db-kpi-icon-wrap"><i className="bi bi-x-circle" /></div>
          <div className="db-kpi-body">
            <span className="db-kpi-val">{rejectedRequests}</span>
            <span className="db-kpi-label">Rejected</span>
          </div>
        </div>
        <div className="db-kpi-card db-kpi-purple">
          <div className="db-kpi-icon-wrap"><i className="bi bi-calendar2-check" /></div>
          <div className="db-kpi-body">
            <span className="db-kpi-val">{leaveDaysUsed}</span>
            <span className="db-kpi-label">Leave Days Used</span>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="db-tabs">
        <button className={`db-tab ${activeTab === "overview" ? "db-tab-active" : ""}`} onClick={() => setActiveTab("overview")}>
          <i className="bi bi-grid" /> Overview
        </button>
        <button className={`db-tab ${activeTab === "summary" ? "db-tab-active" : ""}`} onClick={() => setActiveTab("summary")}>
          <i className="bi bi-table" /> Employee Summary
        </button>
        <button className={`db-tab ${activeTab === "recent" ? "db-tab-active" : ""}`} onClick={() => setActiveTab("recent")}>
          <i className="bi bi-clock-history" /> Recent Requests
        </button>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="db-content-grid">
          {/* Today's Leaves */}
          <div className="db-card">
            <div className="db-card-header">
              <div className="db-card-header-left">
                <span className="db-card-dot" style={{ background: "var(--primary)" }} />
                <h6 className="db-card-title">Today's Leaves</h6>
              </div>
              <span className="db-badge" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                {todaysLeaves.length}
              </span>
            </div>
            {todaysLeaves.length > 0 ? (
              <div className="db-leave-list">
                {todaysLeaves.map(r => (
                  <div key={r.id} className="db-leave-item">
                    <div className="db-leave-avatar">{r.name?.[0]?.toUpperCase() || "?"}</div>
                    <div className="db-leave-info">
                      <span className="db-leave-name">{r.name}</span>
                      <span className="db-leave-type">{r.type}</span>
                    </div>
                    <span className="db-leave-badge" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                      {r.type === "permission" ? `${r.hours}h` : `${r.days}d`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="db-empty-state">
                <i className="bi bi-calendar-check db-empty-icon" />
                <p className="db-empty-title">No leaves today</p>
                <p className="db-empty-sub">All employees are present</p>
              </div>
            )}
          </div>

          {/* Upcoming Holidays */}
          <div className="db-card">
            <div className="db-card-header">
              <div className="db-card-header-left">
                <span className="db-card-dot" style={{ background: "var(--success)" }} />
                <h6 className="db-card-title">Upcoming Holidays</h6>
              </div>
              <span className="db-badge" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                {upcomingHolidays.length}
              </span>
            </div>
            {upcomingHolidays.length > 0 ? (
              <div className="db-holiday-list">
                {upcomingHolidays.map(h => (
                  <div key={h.id} className="db-holiday-item">
                    <div className="db-holiday-date-box">
                      <span className="db-holiday-day">{new Date(h.date).getDate()}</span>
                      <span className="db-holiday-month">{new Date(h.date).toLocaleDateString("en-IN", { month: "short" })}</span>
                    </div>
                    <div className="db-holiday-info">
                      <span className="db-holiday-name">{h.name}</span>
                      <span className="db-holiday-weekday">{getDayName(h.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="db-empty-state">
                <i className="bi bi-calendar-event db-empty-icon" />
                <p className="db-empty-title">No upcoming holidays</p>
              </div>
            )}
          </div>

          {/* Status Distribution */}
          <div className="db-card">
            <div className="db-card-header">
              <div className="db-card-header-left">
                <span className="db-card-dot" style={{ background: "var(--info)" }} />
                <h6 className="db-card-title">Request Breakdown</h6>
              </div>
            </div>
            <div className="db-breakdown">
              <div className="db-breakdown-row">
                <div className="db-breakdown-left">
                  <span className="db-breakdown-dot" style={{ background: "var(--success)" }} />
                  <span className="db-breakdown-name">Approved</span>
                </div>
                <div className="db-breakdown-right">
                  <div className="db-breakdown-track">
                    <div className="db-breakdown-fill" style={{ width: totalRequests > 0 ? `${(approvedRequests / totalRequests * 100).toFixed(0)}%` : "0%", background: "var(--success)" }} />
                  </div>
                  <span className="db-breakdown-val">{approvedRequests}</span>
                  <span className="db-breakdown-pct">{totalRequests > 0 ? (approvedRequests / totalRequests * 100).toFixed(0) : 0}%</span>
                </div>
              </div>
              <div className="db-breakdown-row">
                <div className="db-breakdown-left">
                  <span className="db-breakdown-dot" style={{ background: "var(--warning)" }} />
                  <span className="db-breakdown-name">Pending</span>
                </div>
                <div className="db-breakdown-right">
                  <div className="db-breakdown-track">
                    <div className="db-breakdown-fill" style={{ width: totalRequests > 0 ? `${(pendingRequests / totalRequests * 100).toFixed(0)}%` : "0%", background: "var(--warning)" }} />
                  </div>
                  <span className="db-breakdown-val">{pendingRequests}</span>
                  <span className="db-breakdown-pct">{totalRequests > 0 ? (pendingRequests / totalRequests * 100).toFixed(0) : 0}%</span>
                </div>
              </div>
              <div className="db-breakdown-row">
                <div className="db-breakdown-left">
                  <span className="db-breakdown-dot" style={{ background: "var(--danger)" }} />
                  <span className="db-breakdown-name">Rejected</span>
                </div>
                <div className="db-breakdown-right">
                  <div className="db-breakdown-track">
                    <div className="db-breakdown-fill" style={{ width: totalRequests > 0 ? `${(rejectedRequests / totalRequests * 100).toFixed(0)}%` : "0%", background: "var(--danger)" }} />
                  </div>
                  <span className="db-breakdown-val">{rejectedRequests}</span>
                  <span className="db-breakdown-pct">{totalRequests > 0 ? (rejectedRequests / totalRequests * 100).toFixed(0) : 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EMPLOYEE SUMMARY TAB ── */}
      {activeTab === "summary" && (
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-header-left">
              <span className="db-card-dot" style={{ background: "var(--purple)" }} />
              <h6 className="db-card-title">Employee Leave Summary</h6>
            </div>
            <div className="db-header-right">
              <span className="db-badge" style={{ background: "var(--purple-soft)", color: "var(--purple)" }}>
                {filteredSummary.length} employees
              </span>
              <div className="db-search-wrap">
                <i className="bi bi-search db-search-icon" />
                <input
                  className="db-search-input"
                  placeholder="Search employee…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {summaryLoading ? (
            <div className="db-loading"><i className="bi bi-arrow-repeat db-spin" /> Loading summary…</div>
          ) : (
            <div className="db-table-scroll">
              <table className="db-table">
                <thead>
                  <tr>
                    <th className="db-th-num">#</th>
                    <th>Employee</th>
                    <th>
                      <span className="db-th-pill" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                        <i className="bi bi-calendar-x" /> Leaves
                      </span>
                    </th>
                    <th>
                      <span className="db-th-pill" style={{ background: "var(--info-soft)", color: "var(--info)" }}>
                        <i className="bi bi-arrow-left-right" /> Comp Off
                      </span>
                    </th>
                    <th>
                      <span className="db-th-pill" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
                        <i className="bi bi-clock" /> Permission
                      </span>
                    </th>
                    <th>
                      <span className="db-th-pill" style={{ background: "var(--purple-soft)", color: "var(--purple)" }}>
                        <i className="bi bi-person-check" /> Holiday
                      </span>
                    </th>
                    <th>
                      <span className="db-th-pill" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                        <i className="bi bi-bar-chart" /> Used
                      </span>
                    </th>
                    <th>
                      <span className="db-th-pill" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                        <i className="bi bi-check2-circle" /> Remaining
                      </span>
                    </th>
                    <th>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummary.length > 0 ? (
                    filteredSummary.map((emp, idx) => {
                      const totalUsed = parseFloat(emp.leaves_used || 0) + parseFloat(emp.compoff_used || 0);
                      const remaining = parseFloat(emp.leave_balance || 0);
                      return (
                        <tr key={emp.id || idx}>
                          <td className="db-td-num">{idx + 1}</td>
                          <td>
                            <div className="db-user-cell">
                              <div className="db-avatar">{emp.name?.[0]?.toUpperCase() || "?"}</div>
                              <div>
                                <div className="db-user-name">{emp.name}</div>
                                {emp.department && <div className="db-user-dept">{emp.department}</div>}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="db-val-cell" style={{ color: "var(--primary)" }}>
                              {parseFloat(emp.leaves_used || 0).toFixed(1)}
                              <span className="db-val-unit">days</span>
                            </div>
                            {emp.leaves_pending > 0 && <div className="db-pending-chip">{emp.leaves_pending} pending</div>}
                          </td>
                          <td>
                            <div className="db-val-cell" style={{ color: "var(--info)" }}>
                              {parseFloat(emp.compoff_used || 0).toFixed(1)}
                              <span className="db-val-unit">days</span>
                            </div>
                            {emp.compoff_pending > 0 && <div className="db-pending-chip">{emp.compoff_pending} pending</div>}
                          </td>
                          <td>
                            <div className="db-val-cell" style={{ color: "var(--warning)" }}>
                              {parseFloat(emp.permission_used || 0).toFixed(1)}
                              <span className="db-val-unit">hrs</span>
                            </div>
                            {emp.permission_pending > 0 && <div className="db-pending-chip">{emp.permission_pending} pending</div>}
                          </td>
                          <td>
                            <div className="db-val-cell" style={{ color: "var(--purple)" }}>
                              {parseInt(emp.present_on_holiday || 0)}
                              <span className="db-val-unit">days</span>
                            </div>
                          </td>
                          <td>
                            <div className="db-val-cell" style={{ color: "var(--danger)", fontWeight: 700 }}>
                              {totalUsed.toFixed(1)}
                              <span className="db-val-unit">days</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className="db-remaining-pill"
                              style={{
                                background: remaining >= 5 ? "var(--success-soft)" : remaining >= 2 ? "var(--warning-soft)" : "var(--danger-soft)",
                                color: remaining >= 5 ? "var(--success)" : remaining >= 2 ? "var(--warning)" : "var(--danger)",
                              }}
                            >
                              {remaining >= 0 ? remaining.toFixed(1) : "0.0"}
                            </span>
                          </td>
                          <td>
                            {(emp.total_pending || 0) > 0 ? (
                              <span className="db-pending-badge">{emp.total_pending}</span>
                            ) : (
                              <span className="db-td-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="db-empty">
                        {searchQuery ? "No employees match your search." : "No employee data found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── RECENT REQUESTS TAB ── */}
      {activeTab === "recent" && (
        <div className="db-card">
          <div className="db-card-header">
            <div className="db-card-header-left">
              <span className="db-card-dot" style={{ background: "var(--danger)" }} />
              <h6 className="db-card-title">Recent Leave Requests</h6>
            </div>
            <span className="db-badge" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              Latest {recentRequests.length}
            </span>
          </div>
          <div className="db-table-scroll">
            <table className="db-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.length > 0 ? (
                  recentRequests.map(r => {
                    const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="db-user-cell">
                            <div className="db-avatar">{r.name?.[0]?.toUpperCase() || "?"}</div>
                            <span className="db-user-name">{r.name}</span>
                          </div>
                        </td>
                        <td><span className="db-type-pill">{r.type}</span></td>
                        <td className="db-td-date">
                          <span className="db-date-day">{fmtDay(r.from_date)}</span>
                          <span className="db-date-full">{fmtDate(r.from_date)}</span>
                        </td>
                        <td className="db-td-date">
                          <span className="db-date-day">{fmtDay(r.to_date)}</span>
                          <span className="db-date-full">{fmtDate(r.to_date)}</span>
                        </td>
                        <td className="db-td-duration">
                          {r.type === "permission" ? `${r.hours} hr(s)` : `${r.days} day(s)`}
                        </td>
                        <td className="db-td-reason" title={r.reason}>{r.reason || "—"}</td>
                        <td>
                          <span className="db-status-chip" style={{ background: st.bg, color: st.color }}>
                            <i className={`bi ${st.icon}`} /> {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={7} className="db-empty">No leave history found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

const styles = `
  /* ── Page header ── */
  .db-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
  .db-page-title { font-size: 15px; font-weight: 700; color: var(--t-base); margin: 0 0 4px; }
  .db-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--t-muted); }
  .db-breadcrumb i { font-size: 10px; opacity: 0.5; }

  /* ── KPI Grid ── */
  .db-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .db-kpi-card {
    display: flex; align-items: center; gap: 14px;
    padding: 18px 16px; border-radius: var(--radius-lg);
    background: var(--bg-card); border: 1px solid var(--border);
    box-shadow: var(--shadow); transition: transform 0.2s, box-shadow 0.2s;
  }
  .db-kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .db-kpi-icon-wrap {
    width: 46px; height: 46px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }
  .db-kpi-primary .db-kpi-icon-wrap { background: var(--primary-soft); color: var(--primary); }
  .db-kpi-info .db-kpi-icon-wrap { background: var(--info-soft); color: var(--info); }
  .db-kpi-success .db-kpi-icon-wrap { background: var(--success-soft); color: var(--success); }
  .db-kpi-warning .db-kpi-icon-wrap { background: var(--warning-soft); color: var(--warning); }
  .db-kpi-danger .db-kpi-icon-wrap { background: var(--danger-soft); color: var(--danger); }
  .db-kpi-purple .db-kpi-icon-wrap { background: var(--purple-soft); color: var(--purple); }
  .db-kpi-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .db-kpi-val { font-size: 22px; font-weight: 800; color: var(--t-base); line-height: 1; letter-spacing: -0.02em; }
  .db-kpi-label { font-size: 11px; font-weight: 600; color: var(--t-muted); white-space: nowrap; }

  /* ── Tabs ── */
  .db-tabs { display: flex; gap: 4px; margin-bottom: 20px; background: var(--bg-muted); border-radius: var(--radius); padding: 4px; width: fit-content; }
  .db-tab {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: var(--radius); border: none;
    background: transparent; font-size: 12.5px; font-weight: 600;
    color: var(--t-muted); cursor: pointer; transition: all 0.15s;
    font-family: var(--font);
  }
  .db-tab:hover { color: var(--t-base); }
  .db-tab-active { background: var(--bg-card); color: var(--primary); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

  /* ── Content Grid ── */
  .db-content-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  @media (max-width: 1200px) { .db-content-grid { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 768px) { .db-content-grid { grid-template-columns: 1fr; } }

  /* ── Cards ── */
  .db-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow); min-width: 0;
  }
  .db-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .db-card-header-left { display: flex; align-items: center; gap: 8px; }
  .db-card-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .db-card-title { font-size: 14px; font-weight: 700; color: var(--t-base); margin: 0; }
  .db-badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
  .db-header-right { display: flex; align-items: center; gap: 8px; }

  /* ── Leave list ── */
  .db-leave-list { display: flex; flex-direction: column; gap: 8px; }
  .db-leave-item { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: var(--radius); border: 1px solid var(--border); }
  .db-leave-item:hover { background: var(--primary-soft); }
  .db-leave-avatar {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--primary), var(--purple));
    color: #fff; font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .db-leave-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
  .db-leave-name { font-size: 12.5px; font-weight: 600; color: var(--t-base); }
  .db-leave-type { font-size: 11px; color: var(--t-muted); text-transform: capitalize; }
  .db-leave-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 10px; white-space: nowrap; }

  /* ── Holiday list ── */
  .db-holiday-list { display: flex; flex-direction: column; gap: 8px; }
  .db-holiday-item { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: var(--radius); border: 1px solid var(--border); }
  .db-holiday-date-box {
    width: 46px; height: 46px; border-radius: 10px; flex-shrink: 0;
    background: var(--success-soft); display: flex; flex-direction: column;
    align-items: center; justify-content: center;
  }
  .db-holiday-day { font-size: 16px; font-weight: 800; color: var(--success); line-height: 1; }
  .db-holiday-month { font-size: 9px; font-weight: 700; color: var(--success); text-transform: uppercase; }
  .db-holiday-info { display: flex; flex-direction: column; gap: 1px; }
  .db-holiday-name { font-size: 12.5px; font-weight: 600; color: var(--t-base); }
  .db-holiday-weekday { font-size: 11px; color: var(--t-muted); }

  /* ── Breakdown ── */
  .db-breakdown { display: flex; flex-direction: column; gap: 14px; }
  .db-breakdown-row { display: flex; align-items: center; gap: 12px; }
  .db-breakdown-left { display: flex; align-items: center; gap: 8px; min-width: 90px; }
  .db-breakdown-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .db-breakdown-name { font-size: 12px; font-weight: 600; color: var(--t-base); }
  .db-breakdown-right { display: flex; align-items: center; gap: 8px; flex: 1; }
  .db-breakdown-track { flex: 1; height: 6px; background: var(--bg-muted); border-radius: 10px; overflow: hidden; }
  .db-breakdown-fill { height: 100%; border-radius: 10px; transition: width 0.4s ease; }
  .db-breakdown-val { font-size: 13px; font-weight: 700; color: var(--t-base); min-width: 24px; text-align: right; }
  .db-breakdown-pct { font-size: 11px; font-weight: 600; color: var(--t-muted); min-width: 32px; text-align: right; }

  /* ── Search ── */
  .db-search-wrap { position: relative; }
  .db-search-icon { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--t-muted); pointer-events: none; }
  .db-search-input { padding: 6px 10px 6px 28px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 12.5px; color: var(--t-base); background: var(--bg); outline: none; width: 180px; font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s; }
  .db-search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }

  /* ── Table ── */
  .db-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .db-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .db-table thead tr { border-bottom: 2px solid var(--border); }
  .db-table th { padding: 10px 14px; font-size: 10.5px; font-weight: 700; color: var(--t-muted); text-transform: uppercase; letter-spacing: 0.06em; text-align: left; white-space: nowrap; background: var(--bg-card); }
  .db-th-num { width: 40px; text-align: center; }
  .db-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .db-table tbody tr:last-child td { border-bottom: none; }
  .db-table tbody tr { transition: background 0.12s; }
  .db-table tbody tr:hover { background: var(--primary-soft); }

  .db-td-num { text-align: center; font-size: 11.5px; font-weight: 600; color: var(--t-muted); }
  .db-td-date { white-space: nowrap; }
  .db-date-day { display: block; font-size: 10px; font-weight: 700; color: var(--t-muted); text-transform: uppercase; }
  .db-date-full { display: block; font-size: 12px; font-weight: 600; color: var(--t-base); }
  .db-td-duration { font-size: 12px; color: var(--t-muted); white-space: nowrap; }
  .db-td-reason { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--t-muted); font-size: 12px; }
  .db-td-muted { color: var(--t-muted); }

  /* ── User cell ── */
  .db-user-cell { display: flex; align-items: center; gap: 8px; }
  .db-avatar {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--primary), var(--purple));
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: #fff;
  }
  .db-user-name { font-size: 12.5px; font-weight: 600; color: var(--t-base); }
  .db-user-dept { font-size: 10.5px; color: var(--t-muted); }

  /* ── Pills ── */
  .db-th-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 6px; font-size: 10.5px; font-weight: 700; white-space: nowrap; }
  .db-th-pill i { font-size: 10px; }
  .db-type-pill { display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; background: var(--primary-soft); color: var(--primary); text-transform: capitalize; }
  .db-status-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
  .db-status-chip i { font-size: 10px; }
  .db-val-cell { font-size: 14px; font-weight: 700; display: flex; align-items: baseline; gap: 3px; }
  .db-val-unit { font-size: 10px; font-weight: 500; color: var(--t-muted); }
  .db-pending-chip { display: inline-block; font-size: 10px; font-weight: 600; color: var(--warning); background: var(--warning-soft); border: 1px solid var(--warning); border-radius: 10px; padding: 1px 6px; margin-top: 3px; }
  .db-remaining-pill { display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px; min-width: 54px; }
  .db-pending-badge { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--warning-soft); color: var(--warning); font-size: 11px; font-weight: 700; border: 1px solid var(--warning); }

  /* ── Empty / Loading ── */
  .db-loading { text-align: center; color: var(--t-muted); padding: 40px 0; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .db-empty-state { text-align: center; padding: 32px 16px; }
  .db-empty-icon { font-size: 32px; color: var(--t-muted); opacity: 0.3; display: block; margin-bottom: 8px; }
  .db-empty-title { font-size: 13px; font-weight: 700; color: var(--t-base); margin: 0 0 2px; }
  .db-empty-sub { font-size: 11.5px; color: var(--t-muted); margin: 0; }
  .db-empty { text-align: center; color: var(--t-muted); padding: 24px 0; font-size: 13px; }

  .db-spin { animation: db-spin 0.7s linear infinite; display: inline-block; }
  @keyframes db-spin { to { transform: rotate(360deg); } }

  @media (max-width: 1024px) { .db-kpi-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 600px) {
    .db-kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .db-tabs { width: 100%; }
    .db-tab { flex: 1; justify-content: center; font-size: 11.5px; padding: 8px 10px; }
    .db-search-input { width: 100%; }
    .db-header-right { width: 100%; flex-wrap: wrap; }
  }
`;
