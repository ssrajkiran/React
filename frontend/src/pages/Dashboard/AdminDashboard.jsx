import { useState, useEffect } from "react";
import api from "../../api";
import AppLayout from "../../components/layout/AppLayout";

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    loadRequests();
    loadEmployees();
    loadHolidays();
  }, []);

  // ================= LOAD DATA =================
  const loadRequests = async () => {
    try {
      const res = await api.get("/leaves/alladmin");

      // Normalize leaves & permissions
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

  // ================= HELPERS =================
  const stripTime = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const formatDate = dateStr => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getDayName = dateStr => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "long" });
  };

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

  // ================= RENDER =================
  return (
    <AppLayout>
      {/* ================= STATS ================= */}
      <div className="row g-3 mb-4">
        <Stat title="Employees" value={totalEmployees} icon="bi-people" color="primary" />
        <Stat title="Requests" value={totalRequests} icon="bi-file-earmark-text" color="secondary" />
        <Stat title="Approved" value={approvedRequests} icon="bi-check-circle" color="success" />
        <Stat title="Pending" value={pendingRequests} icon="bi-hourglass-split" color="warning" />
        <Stat title="Rejected" value={rejectedRequests} icon="bi-x-circle" color="danger" />
        <Stat title="Leave Days" value={leaveDaysUsed} icon="bi-calendar2-check" color="info" />
      </div>

      {/* ================= TODAY'S LEAVE + HOLIDAYS ================= */}
      <div className="row g-3 mb-4">
        <div className="col-lg-8 col-12">
          <div className="card border-0 shadow-sm rounded-4 p-3 hover-shadow">
            <h6 className="fw-semibold mb-3 text-primary">Today's Leaves</h6>
            <table className="table table-hover table-sm mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {todaysLeaves.length > 0 ? (
                  todaysLeaves.map(r => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td className="text-capitalize">{r.type}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="text-center text-muted">
                      No employees on leave today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-lg-4 col-12">
          <div className="card border-0 shadow-sm rounded-4 p-3 hover-shadow">
            <h6 className="fw-semibold mb-3 text-success">Upcoming Holidays</h6>
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
                  {upcomingHolidays.map(h => (
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

      {/* ================= LEAVE HISTORY (PAST + UPCOMING) ================= */}
      <div className="row g-3">
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-4 p-3 hover-shadow">
            <h6 className="fw-semibold mb-3 text-danger">Leave Recent</h6>
            <table className="table table-hover table-sm mb-0">
              <thead className="table-light">
                <tr>
                  <th>User</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days/Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.length > 0 ? (
                  requests
                    .sort((a, b) => new Date(b.from_date) - new Date(a.from_date)) // newest first
                    .slice(0, 5) // latest 5
                    .map(r => (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td className="text-capitalize">{r.type}</td>
                        <td>{formatDate(r.from_date)}</td>
                        <td>{formatDate(r.to_date)}</td>
                        <td>{r.type === "permission" ? r.hours + " hr(s)" : r.days + " day(s)"}</td>
                        <td>
                          <span
                            className={`badge rounded-pill bg-${
                              r.status === "approved"
                                ? "success"
                                : r.status === "rejected"
                                ? "danger"
                                : "warning"
                            }`}
                          >
                            {r.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted">
                      No leave history.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ================= STAT CARD =================
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
          transform: hovered ? "translateY(-6px)" : "translateY(0)",
          boxShadow: hovered
            ? "0 12px 25px rgba(0,0,0,0.15)"
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
              transform: hovered ? "scale(1.15)" : "scale(1)",
            }}
          >
            <i className={`bi ${icon} fs-4`}></i>
          </div>
          <div>
            <h6 className="mb-1 fw-semibold text-dark">{title}</h6>
            <h3 className="mb-0 text-muted">{value}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
