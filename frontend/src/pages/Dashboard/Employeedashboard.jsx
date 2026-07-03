import { useState, useEffect } from "react";
import api from "../../api";
import AppLayout from "../../components/layout/AppLayout";

export default function Employeedashboard() {
  const [history, setHistory] = useState([]);
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    // Load user leave history
    api.get("/leaves/my").then((r) => {
      const normalized = r.data.map((h) => {
        if (h.type === "permission") {
          return {
            id: h.id,
            type: "Permission",
            from_date: h.start,
            to_date: h.start,
            days: h.hours + " hr(s)",
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
            status: h.status,
          };
        } else {
          return {
            id: h.id,
            type: "Leave",
            from_date: h.start,
            to_date: h.end,
            days: h.days + " day(s)",
            status: h.status,
            half_day_type: h.half_day_type,
          };
        }
      });
      setHistory(normalized);
    });

    // Load holidays from backend
    api.get("/holidays/list").then((res) => setHolidays(res.data));
  }, []);

  const totalLeaveDays = 12; // total yearly leave
  const applied = history.length;
  const approved = history.filter((h) => h.status === "approved").length;
  const pending = history.filter((h) => h.status === "pending").length;
  const rejected = history.filter((h) => h.status === "rejected").length;
  const balance = totalLeaveDays - approved;

  const stripTime = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getDayName = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "long" });
  };

  const todayDate = stripTime(new Date());

  // Show upcoming 5 holidays from today
  const upcomingHolidays = holidays
    .filter((h) => stripTime(new Date(h.date)) >= todayDate)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  return (
    <AppLayout>
      {/* ================= STATS ================= */}
      <div className="row g-4 mb-4">
        <Stat title="Applied" value={applied} icon="bi-file-earmark-text" color="primary" />
        <Stat title="Approved" value={approved} icon="bi-check-circle" color="success" />
        <Stat title="Pending" value={pending} icon="bi-hourglass-split" color="warning" />
        <Stat title="Rejected" value={rejected} icon="bi-x-circle" color="danger" />
      </div>

      {/* ================= HISTORY + HOLIDAYS ================= */}
      <div className="row g-4">
        {/* Leave / Permission History */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <h5 className="fw-semibold mb-3 text-primary">Leave / Permission History</h5>
              <table className="table align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Days / Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 5).map((h) => (
                    <tr key={h.id}>
                      <td>{h.type}</td>
                      <td>{formatDate(h.from_date)}</td>
                      <td>{formatDate(h.to_date)}</td>
                      <td>{h.days}</td>
                      <td>
                        <span
                          className={`badge rounded-pill px-3 bg-${
                            h.status === "approved"
                              ? "success"
                              : h.status === "rejected"
                              ? "danger"
                              : "warning"
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted">
                        No history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Upcoming Holidays */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body">
              <h5 className="fw-semibold mb-3 text-success">Upcoming Holidays</h5>
              {upcomingHolidays.length > 0 ? (
                <table className="table table-sm mb-0">
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
                        <td>{formatDate(h.date)}</td>
                        <td>{getDayName(h.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-muted">No upcoming holidays.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
/* ================= STAT CARD ================= */
function Stat({ title, value, icon, color }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="col-md-3">
      <div
        className={`card border-0 rounded-4 bg-${color}-subtle`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          transition: "all 0.3s ease",
          transform: hovered ? "translateY(-5px)" : "translateY(0)",
          boxShadow: hovered
            ? "0 8px 20px rgba(0,0,0,0.15)"
            : "0 4px 12px rgba(0,0,0,0.08)",
          cursor: "pointer",
        }}
      >
        <div className="card-body d-flex align-items-center gap-3">
          <div
            className={`bg-${color} text-white rounded-circle d-flex align-items-center justify-content-center`}
            style={{
              width: "50px",
              height: "50px",
              transition: "all 0.3s ease",
              transform: hovered ? "scale(1.1)" : "scale(1)",
            }}
          >
            <i className={`bi ${icon} fs-4`}></i>
          </div>
          <div>
            <h6 className="mb-1">{title}</h6>
            <h3 className="mb-0">{value}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
