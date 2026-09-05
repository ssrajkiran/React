import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api";
import AppLayout from "../../components/layout/AppLayout";
import Tabs from "../../components/ui/Tabs";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";

const fmtHrs = (hrs) => {
  const n = Number(hrs) || 0;
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDetail(); }, [id]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/timesheet/detail/user/${id}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="empty-state"><div className="empty-state-icon"><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }}></i></div></div>
      </AppLayout>
    );
  }

  if (!data?.user) {
    return (
      <AppLayout>
        <EmptyState icon="bi-person-x" title="User not found" text="The user could not be loaded." action={<button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>} />
      </AppLayout>
    );
  }

  const { user, projects, modules, timesheet, leaves, stats } = data;
  const initials = user.name?.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2) || "U";

  const tabs = [
    { key: "overview", label: "Overview", icon: "bi-person" },
    { key: "projects", label: "Projects", icon: "bi-folder", count: projects?.length },
    { key: "modules", label: "Modules", icon: "bi-list-task", count: modules?.length },
    { key: "timesheet", label: "Timesheet", icon: "bi-clock-history", count: timesheet?.length },
    { key: "leaves", label: "Leaves", icon: "bi-calendar-x", count: leaves?.length },
  ];

  return (
    <AppLayout>
      {/* Hero */}
      <div className="detail-page">
        <div className="detail-hero">
          <div className="detail-hero-icon" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "#fff", fontSize: 20 }}>
            {initials}
          </div>
          <div className="detail-hero-info">
            <h2 className="detail-hero-title">{user.name}</h2>
            <div className="detail-hero-meta">
              <span><i className="bi bi-envelope"></i> {user.email}</span>
              <span><i className="bi bi-shield"></i> {user.role}</span>
              {user.department && <span><i className="bi bi-building"></i> {user.department}</span>}
            </div>
          </div>
          <div className="detail-hero-actions">
            <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>
              <i className="bi bi-arrow-left"></i> Back
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-cols-4">
          <div className="kpi-card">
            <div className="kpi-card-label">Total Hours</div>
            <div className="kpi-card-value">{fmtHrs(stats?.total_hours)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-label">Active Days</div>
            <div className="kpi-card-value">{stats?.active_days || 0}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-label">Projects</div>
            <div className="kpi-card-value">{projects?.length || 0}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-label">Modules</div>
            <div className="kpi-card-value">{modules?.length || 0}</div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} active={tab} onChange={setTab} />

        {/* Tab Content */}
        {tab === "overview" && (
          <div className="card">
            <h4 style={{ margin: "0 0 16px" }}>Overview</h4>
            <div className="info-grid">
              <div className="info-item"><div className="info-label">Name</div><div className="info-value">{user.name}</div></div>
              <div className="info-item"><div className="info-label">Email</div><div className="info-value">{user.email}</div></div>
              <div className="info-item"><div className="info-label">Role</div><div className="info-value">{user.role}</div></div>
              <div className="info-item"><div className="info-label">Department</div><div className="info-value">{user.department || "—"}</div></div>
              <div className="info-item"><div className="info-label">Total Hours</div><div className="info-value">{fmtHrs(stats?.total_hours)}</div></div>
              <div className="info-item"><div className="info-label">Active Days</div><div className="info-value">{stats?.active_days || 0}</div></div>
            </div>
          </div>
        )}

        {tab === "projects" && (
          <div className="card">
            {projects?.length > 0 ? (
              <table className="data-table">
                <thead><tr><th>Project</th><th>Module Status</th></tr></thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="data-table-clickable" onClick={() => navigate(`/admin/projects/${p.id}`)}>
                      <td style={{ fontWeight: 600 }}>{p.project_name}</td>
                      <td><StatusBadge status={p.module_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState icon="bi-folder" title="No projects" text="No projects assigned yet." />}
          </div>
        )}

        {tab === "modules" && (
          <div className="card">
            {modules?.length > 0 ? (
              <table className="data-table">
                <thead><tr><th>Module</th><th>Project</th><th>Status</th></tr></thead>
                <tbody>
                  {modules.map((m) => (
                    <tr key={m.id} className="data-table-clickable" onClick={() => navigate(`/admin/modules/${m.id}`)}>
                      <td style={{ fontWeight: 600 }}>{m.module_name}</td>
                      <td>{m.project_name}</td>
                      <td><StatusBadge status={m.module_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState icon="bi-list-task" title="No modules" text="No modules assigned yet." />}
          </div>
        )}

        {tab === "timesheet" && (
          <div className="card">
            {timesheet?.length > 0 ? (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Module</th><th>Project</th><th>Hours</th><th>Time</th></tr></thead>
                <tbody>
                  {timesheet.map((t) => (
                    <tr key={t.id}>
                      <td>{fmtDate(t.date)}</td>
                      <td style={{ fontWeight: 500 }}>{t.module_name}</td>
                      <td>{t.project_name}</td>
                      <td><span className="badge-status badge-info">{fmtHrs(t.man_hrs)}</span></td>
                      <td style={{ color: "var(--t-muted)", fontSize: 12 }}>{t.start_time?.substring(0,5)} - {t.end_time?.substring(0,5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState icon="bi-clock-history" title="No timesheet entries" text="No timesheet entries yet." />}
          </div>
        )}

        {tab === "leaves" && (
          <div className="card">
            {leaves?.length > 0 ? (
              <table className="data-table">
                <thead><tr><th>Type</th><th>From</th><th>To</th><th>Duration</th><th>Status</th></tr></thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l.id}>
                      <td style={{ textTransform: "capitalize" }}>{l.type}</td>
                      <td>{fmtDate(l.start)}</td>
                      <td>{fmtDate(l.end)}</td>
                      <td>{l.type === "permission" ? `${l.hours} hr(s)` : `${l.days} day(s)`}</td>
                      <td><StatusBadge status={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState icon="bi-calendar-x" title="No leaves" text="No leave records yet." />}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
