import { useState, useEffect } from "react";
import api from "../../api";
import AppLayout from "../../components/layout/AppLayout";

export default function EmployeeDashboard() {
  const [history, setHistory] = useState([]);
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    api.get("/leaves/my").then((r) => {
      const normalized = r.data.map((h) => {
        if (h.type === "permission") {
          return {
            id: h.id,
            type: "Permission",
            from_date: h.start,
            to_date: h.start,
            days: h.hours + " hr(s)",
            raw_days: 0,
            status: h.status,
            slot: h.slot,
          };
        } else if (h.type === "compoff") {
          return {
            id: h.id,
            type: "Comp Off",
            from_date: h.start,
            to_date: h.start,
            days: "1 day",
            raw_days: 1,
            status: h.status,
          };
        } else if (h.type === "present") {
          return {
            id: h.id,
            type: "Present",
            from_date: h.start,
            to_date: h.start,
            days: "1 day",
            raw_days: 1,
            status: h.status,
          };
        } else {
          return {
            id: h.id,
            type: "Leave",
            from_date: h.start,
            to_date: h.end,
            days: h.days + " day(s)",
            raw_days: parseFloat(h.days) || 0,
            status: h.status,
            half_day_type: h.half_day_type,
          };
        }
      });
      setHistory(normalized);
    });

    api.get("/holidays/list").then((res) => setHolidays(res.data));
  }, []);

  // ================= STATS =================
  const currentMonth  = new Date().getMonth() + 1;
  const monthsAccrued = currentMonth >= 4 ? currentMonth - 3 : currentMonth + 9;
  const totalLeaveDays = parseFloat((monthsAccrued * 2.5).toFixed(1));

  const leavesUsed = history
    .filter((h) => h.type === "Leave" && h.status === "approved")
    .reduce((sum, h) => sum + (h.raw_days || 0), 0);

  const compoffUsed  = history.filter((h) => h.type === "Comp Off" && h.status === "approved").length;
  const presentBonus = history.filter((h) => h.type === "Present"  && h.status === "approved").length;

  const balance = parseFloat(
    (totalLeaveDays + presentBonus - leavesUsed - compoffUsed).toFixed(1)
  );

  const applied  = history.length;
  const approved = history.filter((h) => h.status === "approved").length;
  const pending  = history.filter((h) => h.status === "pending").length;
  const rejected = history.filter((h) => h.status === "rejected").length;

  const totalUsed = leavesUsed + compoffUsed;
  const totalPool = totalLeaveDays + presentBonus;
  const usedPct   = totalPool > 0 ? Math.min(Math.round((totalUsed / totalPool) * 100), 100) : 0;

  // ================= HELPERS =================
  const stripTime = (date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const getDayName = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });

  const todayDate = stripTime(new Date());

  const upcomingHolidays = holidays
    .filter((h) => stripTime(new Date(h.date)) >= todayDate)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const recentHistory = history.slice(0, 5);

  // ================= RENDER =================
  return (
    <AppLayout>
      <style>{styles}</style>

      {/* ── STAT CARDS ── */}
      <div className="db-stats-grid">
        <StatCard title="Applied"  value={applied}  icon="bi-file-earmark-text" accent="#5048E5" bg="#EEF2FF" />
        <StatCard title="Approved" value={approved}  icon="bi-check-circle"       accent="#059669" bg="#ECFDF5" />
        <StatCard title="Pending"  value={pending}   icon="bi-hourglass-split"    accent="#D97706" bg="#FFFBEB" />
        <StatCard title="Rejected" value={rejected}  icon="bi-x-circle"           accent="#DC2626" bg="#FEF2F2" />
      </div>

      {/* ── LEAVE BALANCE ── */}
      <div className="db-card db-balance-card">
        <div className="db-balance-header">
          <span className="db-card-title">Leave Balance</span>
          <span className="db-balance-pct">{usedPct}%</span>
        </div>
        <div className="db-progress-track">
          <div className="db-progress-fill" style={{ width: `${usedPct}%` }} />
        </div>
        <div className="db-balance-meta-row">
          <span className="db-balance-sub">
            {leavesUsed} leave
            {compoffUsed > 0 && ` + ${compoffUsed} comp off`}
            {" "}used
          </span>
          <span className="db-balance-sub">
            <strong>{balance}</strong> remaining of {totalPool} days
            {presentBonus > 0 && (
              <span className="db-balance-accrual"> (+{presentBonus} bonus)</span>
            )}
            <span className="db-balance-accrual"> (2.5/mo from Apr)</span>
          </span>
        </div>
      </div>

      {/* ── HISTORY + HOLIDAYS ── */}
      <div className="db-two-col">
        {/* Leave / Permission History */}
        <div className="db-card">
          <div className="db-card-header">
            <span className="db-card-dot" style={{ background: "#5048E5" }} />
            <h6 className="db-card-title">Leave / Permission History</h6>
            <span className="db-badge" style={{ background: "#EEF2FF", color: "#5048E5" }}>
              {history.length}
            </span>
          </div>
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentHistory.length > 0 ? (
                  recentHistory.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <span className="db-type-pill">{h.type}</span>
                      </td>
                      <td className="db-mono">{formatDate(h.from_date)}</td>
                      <td className="db-mono">{formatDate(h.to_date)}</td>
                      <td className="db-text-muted">{h.days}</td>
                      <td>
                        <StatusBadge status={h.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="db-empty">No history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
            <div className="db-table-wrap">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Date</th>
                    <th>Day</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingHolidays.map((h) => (
                    <tr key={h.id}>
                      <td>{h.name}</td>
                      <td className="db-mono">{formatDate(h.date)}</td>
                      <td className="db-text-muted">{getDayName(h.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="db-empty">No upcoming holidays.</div>
          )}
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
        boxShadow: hovered
          ? "0 12px 28px rgba(0,0,0,0.12)"
          : "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div
        className="db-stat-icon"
        style={{
          background: accent,
          transform: hovered ? "scale(1.1)" : "scale(1)",
        }}
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
const styles = `
  /* ── Stat grid ── */
  .db-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 16px;
  }

  /* ── Two-col layout ── */
  .db-two-col {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 16px;
  }

  /* ── Stat card ── */
  .db-stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 14px;
    border-radius: var(--radius-lg);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    cursor: default;
    min-width: 0;
  }
  .db-stat-icon {
    width: 44px;
    height: 44px;
    min-width: 44px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 18px;
    flex-shrink: 0;
    transition: transform 0.25s ease;
  }
  .db-stat-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .db-stat-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.01em;
    white-space: nowrap;
  }
  .db-stat-value {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
    letter-spacing: -0.02em;
  }

  /* ── Card base ── */
  .db-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 18px;
    box-shadow: var(--shadow);
    min-width: 0;
  }
  .db-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }
  .db-card-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .db-card-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    flex: 1;
    margin: 0;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .db-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 20px;
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }

  /* ── Balance card ── */
  .db-balance-card {
    margin-bottom: 16px;
    padding: 14px 18px;
  }
  .db-balance-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    gap: 8px;
  }
  .db-balance-meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 6px;
    flex-wrap: wrap;
  }
  .db-balance-sub {
    font-size: 11.5px;
    color: var(--text-muted);
    font-weight: 500;
  }
  .db-balance-sub strong {
    color: var(--text-primary);
    font-weight: 700;
  }
  .db-balance-accrual {
    font-size: 11px;
    color: var(--text-muted);
    opacity: 0.75;
  }
  .db-balance-pct {
    font-size: 12px;
    font-weight: 700;
    color: var(--primary);
    background: var(--primary-light);
    padding: 3px 10px;
    border-radius: 20px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .db-progress-track {
    height: 6px;
    background: var(--border);
    border-radius: 99px;
    overflow: hidden;
  }
  .db-progress-fill {
    height: 100%;
    background: var(--primary);
    border-radius: 99px;
    transition: width 0.6s ease;
  }

  /* ── Table ── */
  .db-table-wrap {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .db-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    min-width: 420px;
  }
  .db-table thead tr { border-bottom: 1px solid var(--border); }
  .db-table th {
    padding: 7px 10px;
    font-size: 10.5px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: left;
    white-space: nowrap;
  }
  .db-table td {
    padding: 9px 10px;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
    white-space: nowrap;
  }
  .db-table tbody tr:last-child td { border-bottom: none; }
  .db-table tbody tr { transition: background 0.12s ease; }
  .db-table tbody tr:hover { background: var(--primary-light); }

  /* ── Type pill ── */
  .db-type-pill {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 20px;
    background: var(--primary-light);
    color: var(--primary);
    white-space: nowrap;
  }

  /* ── Status badge ── */
  .db-status-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 20px;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }

  /* ── Utility ── */
  .db-mono {
    font-variant-numeric: tabular-nums;
    color: var(--text-secondary);
    font-size: 12.5px;
  }
  .db-text-muted { color: var(--text-muted); font-size: 12.5px; }
  .db-empty {
    text-align: center;
    color: var(--text-muted);
    padding: 24px 0;
    font-size: 13px;
  }

  /* ===================================================
     RESPONSIVE BREAKPOINTS
  =================================================== */

  /* Tablet landscape: 4 stat cols → 2x2 */
  @media (max-width: 1024px) {
    .db-stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .db-two-col {
      grid-template-columns: 1fr 1fr;
    }
  }

  /* Tablet portrait */
  @media (max-width: 900px) {
    .db-two-col {
      grid-template-columns: 1fr;
    }
  }

  /* Mobile large */
  @media (max-width: 600px) {
    .db-stats-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .db-stat-card {
      padding: 13px 12px;
      gap: 10px;
    }
    .db-stat-icon {
      width: 38px;
      height: 38px;
      min-width: 38px;
      font-size: 16px;
      border-radius: 9px;
    }
    .db-stat-value { font-size: 20px; }
    .db-stat-label { font-size: 10.5px; }

    .db-card { padding: 14px; }
    .db-balance-card { padding: 12px 14px; }

    .db-balance-meta-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
  }

  /* Mobile small */
  @media (max-width: 400px) {
    .db-stats-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .db-stat-card {
      flex-direction: column;
      align-items: flex-start;
      padding: 12px;
      gap: 8px;
    }
    .db-stat-value { font-size: 22px; }
  }
`;
