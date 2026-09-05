import { useState, useEffect } from "react";
import api from "../../api";
import StatusBadge from "../ui/StatusBadge";
import EmptyState from "../ui/EmptyState";
import { fmtHrs, fmtDate, getInitials } from "../../utils";

export default function ProjectDetailModal({ projectId, onClose, onNavigate }) {
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (projectId) loadDetail(); }, [projectId]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/timesheet/detail/project/${projectId}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) return null;

  const tabs = [
    { key: "overview", label: "Overview", icon: "bi-info-circle" },
    { key: "modules", label: "Modules", icon: "bi-list-task", count: data?.modules?.length },
    { key: "team", label: "Team", icon: "bi-people", count: data?.team?.length },
    { key: "timesheet", label: "Timesheet", icon: "bi-clock-history", count: data?.timesheet?.length },
  ];

  const { project, modules, team, timesheet, stats } = data || {};

  return (
    <div className="ul-overlay" onClick={onClose}>
      <div className="ul-modal ul-modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div className="ul-modal-header">
          <div className="ul-modal-header-left">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--primary-soft)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              {loading ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-folder2-open" />}
            </div>
            <div>
              <h6 className="ul-modal-title">{loading ? "Loading…" : project?.project_name || "Project Details"}</h6>
              <p className="ul-modal-sub">{stats?.module_count || 0} modules • {stats?.contributor_count || 0} contributors • {fmtHrs(stats?.total_hours)} total</p>
            </div>
          </div>
          <button className="ul-modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        <div className="ul-modal-divider" />

        {/* Loading */}
        {loading && (
          <div className="ul-modal-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
            <i className="bi bi-arrow-repeat" style={{ fontSize: 24, color: "var(--primary)", animation: "spin 1s linear infinite" }} />
          </div>
        )}

        {!loading && !project && (
          <div className="ul-modal-body">
            <EmptyState icon="bi-folder-x" title="Project not found" text="The project could not be loaded." />
          </div>
        )}

        {!loading && project && (
          <>
            {/* Stats */}
            <div className="ul-modal-body" style={{ paddingBottom: 0 }}>
              <div className="modal-stat-grid">
                {[
                  { label: "Modules", value: stats?.module_count || 0, icon: "bi-list-task" },
                  { label: "Contributors", value: stats?.contributor_count || 0, icon: "bi-people" },
                  { label: "Total Hours", value: fmtHrs(stats?.total_hours), icon: "bi-clock" },
                  { label: "Active Days", value: stats?.active_days || 0, icon: "bi-calendar-check" },
                ].map((s) => (
                  <div key={s.label} className="modal-stat-card">
                    <div className="modal-stat-icon">
                      <i className={`bi ${s.icon}`} />
                      <span className="modal-stat-label">{s.label}</span>
                    </div>
                    <div className="modal-stat-value">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="ul-modal-body" style={{ paddingTop: 12, paddingBottom: 0 }}>
              <div className="modal-tab-bar">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`modal-tab-btn ${tab === t.key ? "active" : ""}`}
                  >
                    <i className={`bi ${t.icon}`} style={{ marginRight: 5 }} />
                    {t.label}
                    {t.count !== undefined && (
                      <span className="modal-tab-count">{t.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="ul-modal-body" style={{ flex: 1, overflowY: "auto" }}>
              {tab === "overview" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Project Name", value: project.project_name },
                    { label: "Total Modules", value: stats?.module_count || 0 },
                    { label: "Team Size", value: stats?.contributor_count || 0 },
                    { label: "Total Hours Logged", value: fmtHrs(stats?.total_hours) },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="modal-detail-label">{item.label}</div>
                      <div className="modal-detail-value">{item.value}</div>
                      <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 13 }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {tab === "modules" && (
                modules?.length > 0 ? (
                  <table className="data-table">
                    <thead><tr><th>Module</th><th>Status</th><th>Assigned To</th><th>Hours</th></tr></thead>
                    <tbody>
                      {modules.map((m) => (
                        <tr key={m.id} className="data-table-clickable" onClick={() => onNavigate?.("module", m.id)}>
                          <td style={{ fontWeight: 600 }}>{m.module_name}</td>
                          <td><StatusBadge status={m.module_status} /></td>
                          <td style={{ fontSize: 12, color: "var(--t-muted)" }}>{m.assigned_names || "—"}</td>
                          <td><span className="ul-badge ul-badge-info">{fmtHrs(m.total_hours)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <EmptyState icon="bi-list-task" title="No modules" text="No modules in this project yet." />
              )}

              {tab === "team" && (
                team?.length > 0 ? (
                  <table className="data-table">
                    <thead><tr><th>Member</th><th>Email</th><th>Modules</th><th>Hours</th></tr></thead>
                    <tbody>
                      {team.map((m) => (
                        <tr key={m.id} className="data-table-clickable" onClick={() => onNavigate?.("user", m.id)}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>
                                {m.name?.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                            </div>
                          </td>
                          <td style={{ color: "var(--t-muted)", fontSize: 12 }}>{m.email}</td>
                          <td>{m.module_count}</td>
                          <td><span className="ul-badge ul-badge-info">{fmtHrs(m.total_hours)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <EmptyState icon="bi-people" title="No team members" text="No team members assigned yet." />
              )}

              {tab === "timesheet" && (
                timesheet?.length > 0 ? (
                  <table className="data-table">
                    <thead><tr><th>Date</th><th>Employee</th><th>Module</th><th>Hours</th><th>Time</th></tr></thead>
                    <tbody>
                      {timesheet.map((t) => (
                        <tr key={t.id}>
                          <td>{fmtDate(t.date)}</td>
                          <td style={{ fontWeight: 500 }}>{t.employee_name}</td>
                          <td>{t.module_name}</td>
                          <td><span className="ul-badge ul-badge-info">{fmtHrs(t.man_hrs)}</span></td>
                          <td style={{ color: "var(--t-muted)", fontSize: 12 }}>{t.start_time?.substring(0,5)} - {t.end_time?.substring(0,5)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <EmptyState icon="bi-clock-history" title="No timesheet entries" text="No timesheet entries for this project yet." />
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="ul-modal-divider" />
        <div className="ul-modal-footer">
          <button className="ul-btn ul-btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
