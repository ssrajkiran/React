import { useState, useEffect } from "react";
import api from "../../api";
import StatusBadge from "../ui/StatusBadge";
import EmptyState from "../ui/EmptyState";
import { fmtHrs, fmtDate, getInitials } from "../../utils";

export default function UserDetailModal({ userId, onClose, onNavigate }) {
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (userId) loadDetail(); }, [userId]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/timesheet/detail/user/${userId}`);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load user detail:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return null;

  const tabs = [
    { key: "overview", label: "Overview", icon: "bi-person" },
    { key: "projects", label: "Projects", icon: "bi-folder", count: data?.projects?.length },
    { key: "modules", label: "Modules", icon: "bi-list-task", count: data?.modules?.length },
    { key: "timesheet", label: "Timesheet", icon: "bi-clock-history", count: data?.timesheet?.length },
    { key: "leaves", label: "Leaves", icon: "bi-calendar-x", count: data?.leaves?.length },
  ];

  const { user, projects, modules, timesheet, leaves, stats } = data || {};
  const initials = getInitials(user?.name);

  return (
    <div className="ul-overlay" onClick={onClose}>
      <div className="ul-modal ul-modal-xl" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div className="ul-modal-header">
          <div className="ul-modal-header-left">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(160deg, #0C0B2E 0%, #161452 40%, #2D28A0 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>
              {loading ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : initials}
            </div>
            <div>
              <h6 className="ul-modal-title">{loading ? "Loading…" : user?.name || "User Details"}</h6>
              <p className="ul-modal-sub">{user?.email} • {user?.role}</p>
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

        {!loading && !user && (
          <div className="ul-modal-body">
            <EmptyState icon="bi-person-x" title="User not found" text="The user could not be loaded." />
          </div>
        )}

        {!loading && user && (
          <>
            {/* Stats */}
            <div className="ul-modal-body" style={{ paddingBottom: 0 }}>
              <div className="modal-stat-grid">
                {[
                  { label: "Total Hours", value: fmtHrs(stats?.total_hours), icon: "bi-clock" },
                  { label: "Active Days", value: stats?.active_days || 0, icon: "bi-calendar-check" },
                  { label: "Projects", value: projects?.length || 0, icon: "bi-folder" },
                  { label: "Modules", value: modules?.length || 0, icon: "bi-list-task" },
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
                    { label: "Name", value: user.name },
                    { label: "Email", value: user.email },
                    { label: "Role", value: user.role },
                    { label: "Total Hours", value: fmtHrs(stats?.total_hours) },
                    { label: "Active Days", value: stats?.active_days || 0 },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="modal-detail-label">{item.label}</div>
                      <div className="modal-detail-value">{item.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "projects" && (
                projects?.length > 0 ? (
                  <table className="data-table">
                    <thead><tr><th>Project</th><th>Module Status</th></tr></thead>
                    <tbody>
                      {projects.map((p) => (
                        <tr key={p.id} className="data-table-clickable" onClick={() => onNavigate?.("project", p.id)}>
                          <td style={{ fontWeight: 600 }}>{p.project_name}</td>
                          <td><StatusBadge status={p.module_status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <EmptyState icon="bi-folder" title="No projects" text="No projects assigned yet." />
              )}

              {tab === "modules" && (
                modules?.length > 0 ? (
                  <table className="data-table">
                    <thead><tr><th>Module</th><th>Project</th><th>Status</th></tr></thead>
                    <tbody>
                      {modules.map((m) => (
                        <tr key={m.id} className="data-table-clickable" onClick={() => onNavigate?.("module", m.id)}>
                          <td style={{ fontWeight: 600 }}>{m.module_name}</td>
                          <td>{m.project_name}</td>
                          <td><StatusBadge status={m.module_status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <EmptyState icon="bi-list-task" title="No modules" text="No modules assigned yet." />
              )}

              {tab === "timesheet" && (
                timesheet?.length > 0 ? (
                  <table className="data-table">
                    <thead><tr><th>Date</th><th>Module</th><th>Project</th><th>Hours</th><th>Time</th></tr></thead>
                    <tbody>
                      {timesheet.map((t) => (
                        <tr key={t.id}>
                          <td>{fmtDate(t.date)}</td>
                          <td style={{ fontWeight: 500 }}>{t.module_name}</td>
                          <td>{t.project_name}</td>
                          <td><span className="ul-badge ul-badge-info">{fmtHrs(t.man_hrs)}</span></td>
                          <td style={{ color: "var(--t-muted)", fontSize: 12 }}>{t.start_time?.substring(0,5)} - {t.end_time?.substring(0,5)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <EmptyState icon="bi-clock-history" title="No timesheet entries" text="No timesheet entries yet." />
              )}

              {tab === "leaves" && (
                leaves?.length > 0 ? (
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
                ) : <EmptyState icon="bi-calendar-x" title="No leaves" text="No leave records yet." />
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
