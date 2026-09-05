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

export default function ModuleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDetail(); }, [id]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/timesheet/detail/module/${id}`);
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

  if (!data?.module) {
    return (
      <AppLayout>
        <EmptyState icon="bi-list-task" title="Module not found" text="The module could not be loaded." action={<button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>} />
      </AppLayout>
    );
  }

  const { module: mod, team, timesheet, stats } = data;

  const tabs = [
    { key: "overview", label: "Overview", icon: "bi-info-circle" },
    { key: "team", label: "Team", icon: "bi-people", count: team?.length },
    { key: "timesheet", label: "Timesheet", icon: "bi-clock-history", count: timesheet?.length },
  ];

  return (
    <AppLayout>
      <div className="detail-page">
        <div className="detail-hero">
          <div className="detail-hero-icon" style={{ background: "var(--warning-light)", color: "var(--warning)" }}>
            <i className="bi bi-list-task"></i>
          </div>
          <div className="detail-hero-info">
            <h2 className="detail-hero-title">{mod.module_name}</h2>
            <div className="detail-hero-meta">
              <span><i className="bi bi-folder"></i> {mod.project_name}</span>
              <span><StatusBadge status={mod.module_status} /></span>
              <span><i className="bi bi-clock"></i> {fmtHrs(stats?.total_hours)} logged</span>
              <span><i className="bi bi-people"></i> {stats?.contributor_count || 0} contributors</span>
            </div>
          </div>
          <div className="detail-hero-actions">
            <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>
              <i className="bi bi-arrow-left"></i> Back
            </button>
          </div>
        </div>

        <div className="grid-cols-4">
          <div className="kpi-card"><div className="kpi-card-label">Contributors</div><div className="kpi-card-value">{stats?.contributor_count || 0}</div></div>
          <div className="kpi-card"><div className="kpi-card-label">Total Hours</div><div className="kpi-card-value">{fmtHrs(stats?.total_hours)}</div></div>
          <div className="kpi-card"><div className="kpi-card-label">Entries</div><div className="kpi-card-value">{stats?.entry_count || 0}</div></div>
          <div className="kpi-card"><div className="kpi-card-label">Active Days</div><div className="kpi-card-value">{stats?.active_days || 0}</div></div>
        </div>

        <Tabs tabs={tabs} active={tab} onChange={setTab} />

        {tab === "overview" && (
          <div className="card">
            <h4 style={{ margin: "0 0 16px" }}>Module Details</h4>
            <div className="info-grid">
              <div className="info-item"><div className="info-label">Module Name</div><div className="info-value">{mod.module_name}</div></div>
              <div className="info-item"><div className="info-label">Project</div><div className="info-value" style={{ cursor: "pointer", color: "var(--primary)" }} onClick={() => navigate(`/admin/projects/${mod.project_id}`)}>{mod.project_name}</div></div>
              <div className="info-item"><div className="info-label">Status</div><div className="info-value"><StatusBadge status={mod.module_status} /></div></div>
              <div className="info-item"><div className="info-label">Total Hours Logged</div><div className="info-value">{fmtHrs(stats?.total_hours)}</div></div>
              <div className="info-item"><div className="info-label">Total Entries</div><div className="info-value">{stats?.entry_count || 0}</div></div>
              <div className="info-item"><div className="info-label">Team Size</div><div className="info-value">{stats?.contributor_count || 0}</div></div>
            </div>
          </div>
        )}

        {tab === "team" && (
          <div className="card">
            {team?.length > 0 ? (
              <table className="data-table">
                <thead><tr><th>Member</th><th>Email</th><th>Entries</th><th>Hours</th></tr></thead>
                <tbody>
                  {team.map((m) => (
                    <tr key={m.id} className="data-table-clickable" onClick={() => navigate(`/admin/users/${m.id}`)}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="ui-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                            {m.name?.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <span style={{ fontWeight: 600 }}>{m.name}</span>
                        </div>
                      </td>
                      <td style={{ color: "var(--t-muted)", fontSize: 12 }}>{m.email}</td>
                      <td>{m.entry_count}</td>
                      <td><span className="badge-status badge-info">{fmtHrs(m.total_hours)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState icon="bi-people" title="No team members" text="No team members assigned yet." />}
          </div>
        )}

        {tab === "timesheet" && (
          <div className="card">
            {timesheet?.length > 0 ? (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Employee</th><th>Hours</th><th>Time</th><th>Description</th></tr></thead>
                <tbody>
                  {timesheet.map((t) => (
                    <tr key={t.id}>
                      <td>{fmtDate(t.date)}</td>
                      <td style={{ fontWeight: 500 }}>{t.employee_name}</td>
                      <td><span className="badge-status badge-info">{fmtHrs(t.man_hrs)}</span></td>
                      <td style={{ color: "var(--t-muted)", fontSize: 12 }}>{t.start_time?.substring(0,5)} - {t.end_time?.substring(0,5)}</td>
                      <td style={{ color: "var(--t-muted)", fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.work_description || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState icon="bi-clock-history" title="No timesheet entries" text="No timesheet entries for this module yet." />}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
