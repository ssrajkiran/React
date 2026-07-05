import { useState, useEffect } from "react";
import api from "../../api";
import AppLayout from "../../components/layout/AppLayout";

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [employeeSummary, setEmployeeSummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadRequests();
    loadEmployees();
    loadHolidays();
    loadEmployeeSummary();
  }, []);

  // ================= LOAD DATA =================
  const loadRequests = async () => {
    try {
      const res = await api.get("/leaves/alladmin");
      const normalized = res.data.map(r => ({
        ...r,
        from_date: r.from_date || r.start || null,
        to_date: r.to_date || r.end || r.from_date || r.start || null,
      }));
      setRequests(normalized);
    } catch (err) {
      console.error(err);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await api.get("/leaves/users");
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadHolidays = async () => {
    try {
      const res = await api.get("/holidays/list");
      setHolidays(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadEmployeeSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get("/leaves/employee-summary");
      setEmployeeSummary(res.data);
    } catch (err) {
      console.error(err);
      // Fallback: build summary from existing requests if endpoint not ready
      setEmployeeSummary([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  // ================= HELPERS =================
  const stripTime = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const formatDate = dateStr => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}-${month}-${d.getFullYear()}`;
  };

  const getDayName = dateStr =>
    new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });

  // ================= STATS =================
  const totalEmployees = employees.length;
  const totalRequests = requests.length;
  const approvedRequests = requests.filter(r => r.status === "approved").length;
  const pendingRequests = requests.filter(r => r.status === "pending").length;
  const rejectedRequests = requests.filter(r => r.status === "rejected").length;
  const leaveDaysUsed = requests
    .filter(r => r.status === "approved")
    .reduce((sum, r) => sum + parseFloat(r.days || 0), 0)
    .toFixed(2);

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
    .slice(0, 5);

  // ================= SUMMARY FILTER =================
  const filteredSummary = employeeSummary.filter(e =>
    e.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ================= RENDER =================
  return (
    <AppLayout>
      <style>{dashboardStyles}</style>

      {/* ── STAT CARDS ── */}
      <div className="db-stats-grid">
        <StatCard title="Employees"   value={totalEmployees}   icon="bi-people"            accent="#5048E5" bg="#EEF2FF" />
        <StatCard title="Requests"    value={totalRequests}    icon="bi-file-earmark-text" accent="#6B7280" bg="#F3F4F6" />
        <StatCard title="Approved"    value={approvedRequests} icon="bi-check-circle"      accent="#059669" bg="#ECFDF5" />
        <StatCard title="Pending"     value={pendingRequests}  icon="bi-hourglass-split"   accent="#D97706" bg="#FFFBEB" />
        <StatCard title="Rejected"    value={rejectedRequests} icon="bi-x-circle"          accent="#DC2626" bg="#FEF2F2" />
        <StatCard title="Leave Days"  value={leaveDaysUsed}    icon="bi-calendar2-check"   accent="#0891B2" bg="#ECFEFF" />
      </div>

      {/* ── TODAY'S LEAVES + UPCOMING HOLIDAYS ── */}
      <div className="db-two-col">
        {/* Today's Leaves */}
        <div className="db-card">
          <div className="db-card-header">
            <span className="db-card-dot" style={{ background: "#5048E5" }} />
            <h6 className="db-card-title">Today's Leaves</h6>
            <span className="db-badge" style={{ background: "#EEF2FF", color: "#5048E5" }}>
              {todaysLeaves.length}
            </span>
          </div>
          <table className="db-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {todaysLeaves.length > 0 ? (
                todaysLeaves.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="db-user-cell">
                        <div className="db-avatar">{r.name?.[0]?.toUpperCase() || "?"}</div>
                        {r.name}
                      </div>
                    </td>
                    <td><span className="db-type-pill">{r.type}</span></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={2} className="db-empty">No employees on leave today.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Upcoming Holidays */}
        <div className="db-card">
          <div className="db-card-header">
            <span className="db-card-dot" style={{ background: "#059669" }} />
            <h6 className="db-card-title">Upcoming Holidays</h6>
            <span className="db-badge" style={{ background: "#ECFDF5", color: "#059669" }}>
              {upcomingHolidays.length}
            </span>
          </div>
          {upcomingHolidays.length > 0 ? (
            <table className="db-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Day</th>
                </tr>
              </thead>
              <tbody>
                {upcomingHolidays.map(h => (
                  <tr key={h.id}>
                    <td>{h.name}</td>
                    <td className="db-mono">{formatDate(h.date)}</td>
                    <td className="db-text-muted">{getDayName(h.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="db-empty">No upcoming holidays.</div>
          )}
        </div>
      </div>

      {/* ── EMPLOYEE LEAVE SUMMARY ── */}
      <div className="db-card db-card-full" style={{ marginBottom: "24px" }}>
        <div className="db-card-header">
          <span className="db-card-dot" style={{ background: "#7C3AED" }} />
          <h6 className="db-card-title">Employee Leave Summary</h6>
          <span className="db-badge" style={{ background: "#F5F3FF", color: "#7C3AED" }}>
            {filteredSummary.length} employees
          </span>
          {/* Search */}
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

        {summaryLoading ? (
          <div className="db-empty">
            <i className="bi bi-arrow-repeat db-spin" style={{ fontSize: 22, display: "block", marginBottom: 8 }} />
            Loading summary…
          </div>
        ) : (
          <div className="db-table-scroll">
            <table className="db-table db-summary-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>
                    <span className="db-th-pill" style={{ background: "#EEF2FF", color: "#5048E5" }}>
                      <i className="bi bi-calendar-x" /> Leaves
                    </span>
                  </th>
                  <th>
                    <span className="db-th-pill" style={{ background: "#ECFEFF", color: "#0891B2" }}>
                      <i className="bi bi-arrow-left-right" /> Comp Off
                    </span>
                  </th>
                  <th>
                    <span className="db-th-pill" style={{ background: "#FFFBEB", color: "#D97706" }}>
                      <i className="bi bi-clock" /> Permission
                    </span>
                  </th>
                  <th>
                    <span className="db-th-pill" style={{ background: "#F5F3FF", color: "#7C3AED" }}>
                      <i className="bi bi-person-check" /> Present on Holiday
                    </span>
                  </th>
                  <th>
                    <span className="db-th-pill" style={{ background: "#FEF2F2", color: "#DC2626" }}>
                      <i className="bi bi-bar-chart" /> Total Used
                    </span>
                  </th>
                  <th>
                    <span className="db-th-pill" style={{ background: "#ECFDF5", color: "#059669" }}>
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
                        <td className="db-text-muted db-mono" style={{ width: 36 }}>{idx + 1}</td>
                        <td>
                          <div className="db-user-cell">
                            <div className="db-avatar">{emp.name?.[0]?.toUpperCase() || "?"}</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.name}</div>
                              {emp.department && (
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{emp.department}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="db-summary-val" style={{ color: "#5048E5" }}>
                            {parseFloat(emp.leaves_used || 0).toFixed(1)}
                            <span className="db-summary-unit">days</span>
                          </div>
                          {emp.leaves_pending > 0 && (
                            <div className="db-pending-chip">{emp.leaves_pending} pending</div>
                          )}
                        </td>
                        <td>
                          <div className="db-summary-val" style={{ color: "#0891B2" }}>
                            {parseFloat(emp.compoff_used || 0).toFixed(1)}
                            <span className="db-summary-unit">days</span>
                          </div>
                          {emp.compoff_pending > 0 && (
                            <div className="db-pending-chip">{emp.compoff_pending} pending</div>
                          )}
                        </td>
                        <td>
                          <div className="db-summary-val" style={{ color: "#D97706" }}>
                            {parseFloat(emp.permission_used || 0).toFixed(1)}
                            <span className="db-summary-unit">hrs</span>
                          </div>
                          {emp.permission_pending > 0 && (
                            <div className="db-pending-chip">{emp.permission_pending} pending</div>
                          )}
                        </td>
                        <td>
                          <div className="db-summary-val" style={{ color: "#7C3AED" }}>
                            {parseInt(emp.present_on_holiday || 0)}
                            <span className="db-summary-unit">days</span>
                          </div>
                        </td>
                        <td>
                          <div className="db-summary-val" style={{ color: "#DC2626", fontWeight: 700 }}>
                            {totalUsed.toFixed(1)}
                            <span className="db-summary-unit">days</span>
                          </div>
                        </td>
                        <td>
                          <div
                            className="db-remaining-pill"
                            style={{
                              background: remaining >= 5 ? "#ECFDF5" : remaining >= 2 ? "#FFFBEB" : "#FEF2F2",
                              color: remaining >= 5 ? "#059669" : remaining >= 2 ? "#D97706" : "#DC2626",
                            }}
                          >
                            {remaining >= 0 ? remaining.toFixed(1) : "0.0"}
                          </div>
                        </td>
                        <td>
                          {(emp.total_pending || 0) > 0 ? (
                            <span className="db-pending-badge">{emp.total_pending}</span>
                          ) : (
                            <span className="db-text-muted">—</span>
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

      {/* ── RECENT LEAVE REQUESTS ── */}
      <div className="db-card db-card-full">
        <div className="db-card-header">
          <span className="db-card-dot" style={{ background: "#DC2626" }} />
          <h6 className="db-card-title">Recent Leave Requests</h6>
          <span className="db-badge" style={{ background: "#FEF2F2", color: "#DC2626" }}>
            Latest 5
          </span>
        </div>
         <div className="db-table-scroll">
        <table className="db-table db-summary-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentRequests.length > 0 ? (
              recentRequests.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="db-user-cell">
                      <div className="db-avatar">{r.name?.[0]?.toUpperCase() || "?"}</div>
                      {r.name}
                    </div>
                  </td>
                  <td><span className="db-type-pill">{r.type}</span></td>
                  <td className="db-mono">{formatDate(r.from_date)}</td>
                  <td className="db-mono">{formatDate(r.to_date)}</td>
                  <td className="db-text-muted">
                    {r.type === "permission" ? `${r.hours} hr(s)` : `${r.days} day(s)`}
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="db-empty">No leave history found.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </AppLayout>
  );
}

// ================= STAT CARD =================
function StatCard({ title, value, icon, accent, bg }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="db-stat-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: bg,
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? "0 12px 28px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div
        className="db-stat-icon"
        style={{ background: accent, transform: hovered ? "scale(1.1)" : "scale(1)" }}
      >
        <i className={`bi ${icon}`} />
      </div>
      <div className="db-stat-info">
        <span className="db-stat-label">{title}</span>
        <span className="db-stat-value">{value}</span>
      </div>
    </div>
  );
}

// ================= STATUS BADGE =================
function StatusBadge({ status }) {
  const map = {
    approved: { bg: "#ECFDF5", color: "#059669", label: "Approved" },
    pending:  { bg: "#FFFBEB", color: "#D97706", label: "Pending"  },
    rejected: { bg: "#FEF2F2", color: "#DC2626", label: "Rejected" },
  };
  const s = map[status] || { bg: "#F3F4F6", color: "#6B7280", label: status };
  return (
    <span className="db-status-badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ================= STYLES =================
const dashboardStyles = `
  /* ── Grid layouts ── */
  .db-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
  .db-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }

  /* ── Large desktop (1280px+) ── */
  @media (min-width: 1280px) {
    .db-stats-grid {
      grid-template-columns: repeat(6, 1fr);
    }
  }

  /* ── Desktop (1024px–1279px) ── */
  @media (max-width: 1279px) and (min-width: 1024px) {
    .db-stats-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  /* ── Tablet landscape (768px–1023px) ── */
  @media (max-width: 1023px) and (min-width: 768px) {
    .db-stats-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .db-two-col {
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .db-stat-value { font-size: 20px; }
    .db-search-input { width: 150px; }
  }

  /* ── Tablet portrait (600px–767px) ── */
  @media (max-width: 767px) and (min-width: 600px) {
    .db-stats-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .db-two-col {
      grid-template-columns: 1fr;
      gap: 12px;
    }
    .db-card { padding: 16px; }
    .db-card-header { flex-wrap: wrap; gap: 6px; }
    .db-search-wrap { width: 100%; margin-left: 0; margin-top: 8px; }
    .db-search-input { width: 100%; }
    .db-stat-value { font-size: 19px; }
    .db-summary-table th:nth-child(5),
    .db-summary-table td:nth-child(5),
    .db-summary-table th:nth-child(6),
    .db-summary-table td:nth-child(6) { display: none; }
  }

  /* ── Mobile (below 600px) ── */
  @media (max-width: 599px) {
    .db-stats-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .db-two-col {
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .db-card { padding: 14px 12px; }
    .db-card-header { flex-wrap: wrap; gap: 6px; }
    .db-card-title { font-size: 12.5px; }
    .db-search-wrap { width: 100%; margin-left: 0; margin-top: 8px; }
    .db-search-input { width: 100%; box-sizing: border-box; }

    /* Stat card compact */
    .db-stat-card { padding: 12px 10px; gap: 10px; }
    .db-stat-icon { width: 38px; height: 38px; font-size: 16px; border-radius: 10px; }
    .db-stat-label { font-size: 10.5px; }
    .db-stat-value { font-size: 18px; }

    /* Table font size */
    .db-table { font-size: 12px; }
    .db-table th { font-size: 10px; padding: 6px 8px; }
    .db-table td { padding: 8px; }

    /* Avatar smaller */
    .db-avatar { width: 24px; height: 24px; font-size: 10px; }

    /* Hide less-critical summary columns on small phones */
    .db-summary-table th:nth-child(5),
    .db-summary-table td:nth-child(5),
    .db-summary-table th:nth-child(6),
    .db-summary-table td:nth-child(6),
    .db-summary-table th:nth-child(4),
    .db-summary-table td:nth-child(4) { display: none; }

    .db-remaining-pill { padding: 3px 8px; font-size: 12px; min-width: 44px; }
    .db-summary-val { font-size: 13px; }
  }

  /* ── Very small phones (below 380px) ── */
  @media (max-width: 379px) {
    .db-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .db-stat-card { padding: 10px 8px; gap: 8px; }
    .db-stat-icon { width: 34px; height: 34px; font-size: 15px; }
    .db-stat-value { font-size: 16px; }
    .db-stat-label { font-size: 10px; }
    .db-card { padding: 12px 10px; }

    /* Only show essential summary columns */
    .db-summary-table th:nth-child(3),
    .db-summary-table td:nth-child(3),
    .db-summary-table th:nth-child(7),
    .db-summary-table td:nth-child(7),
    .db-summary-table th:nth-child(8),
    .db-summary-table td:nth-child(8) { display: table-cell; }
  }

  /* ── Stat card ── */
  .db-stat-card {
    display: flex; align-items: center; gap: 14px;
    padding: 18px 16px; border-radius: var(--radius-lg);
    transition: transform 0.25s ease, box-shadow 0.25s ease; cursor: default;
  }
  .db-stat-icon {
    width: 46px; height: 46px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 20px; flex-shrink: 0; transition: transform 0.25s ease;
  }
  .db-stat-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .db-stat-label { font-size: 11.5px; font-weight: 600; color: var(--text-secondary); letter-spacing: 0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .db-stat-value { font-size: 22px; font-weight: 700; color: var(--text-primary); line-height: 1; letter-spacing: -0.02em; }

  /* ── Cards ── */
  .db-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow);
  }
  .db-card-full { margin-bottom: 0; }
  .db-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .db-card-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .db-card-title { font-size: 13.5px; font-weight: 700; color: var(--text-primary); flex: 1; margin: 0; letter-spacing: -0.01em; }
  .db-badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; letter-spacing: 0.02em; white-space: nowrap; }

  /* ── Search ── */
  .db-search-wrap { position: relative; margin-left: auto; }
  .db-search-icon { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--text-muted); pointer-events: none; }
  .db-search-input { padding: 6px 10px 6px 28px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 12.5px; color: var(--text-primary); background: var(--bg); outline: none; width: 180px; font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s; }
  .db-search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }

  /* ── Table ── */
  .db-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .db-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .db-table thead tr { border-bottom: 1px solid var(--border); }
  .db-table th { padding: 8px 12px; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; text-align: left; white-space: nowrap; }
  .db-table td { padding: 10px 12px; color: var(--text-primary); border-bottom: 1px solid var(--border); vertical-align: middle; }
  .db-table tbody tr:last-child td { border-bottom: none; }
  .db-table tbody tr { transition: background 0.12s ease; }
  .db-table tbody tr:hover { background: var(--primary-light); }

  /* ── Summary table specifics ── */
  .db-th-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 6px; font-size: 10.5px; font-weight: 700; white-space: nowrap; }
  .db-th-pill i { font-size: 10px; }
  .db-summary-val { font-size: 14px; font-weight: 700; display: flex; align-items: baseline; gap: 3px; }
  .db-summary-unit { font-size: 10px; font-weight: 500; color: var(--text-muted); }
  .db-pending-chip { display: inline-block; font-size: 10px; font-weight: 600; color: #D97706; background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 10px; padding: 1px 6px; margin-top: 3px; }
  .db-remaining-pill { display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px; min-width: 54px; }
  .db-pending-badge { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: #FFFBEB; color: #D97706; font-size: 11px; font-weight: 700; border: 1px solid #FCD34D; }

  /* ── User cell with avatar ── */
  .db-user-cell { display: flex; align-items: center; gap: 8px; font-weight: 500; }
  .db-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0;
  }

  /* ── Pills & badges ── */
  .db-type-pill { display: inline-block; font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 20px; background: var(--primary-light); color: var(--primary); text-transform: capitalize; }
  .db-status-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.04em; }

  /* ── Utility ── */
  .db-mono { font-variant-numeric: tabular-nums; color: var(--text-secondary); font-size: 12.5px; }
  .db-text-muted { color: var(--text-muted); font-size: 12.5px; }
  .db-empty { text-align: center; color: var(--text-muted); padding: 24px 0; font-size: 13px; }
  .db-spin { animation: db-spin 0.7s linear infinite; display: inline-block; }
  @keyframes db-spin { to { transform: rotate(360deg); } }
`;
