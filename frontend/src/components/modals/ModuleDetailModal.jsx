import { useState, useEffect } from "react";
import api from "../../api";
import StatusBadge from "../ui/StatusBadge";
import EmptyState from "../ui/EmptyState";
import { fmtHrs, fmtDate, getInitials } from "../../utils";

export default function ModuleDetailModal({ moduleId, onClose, onNavigate }) {
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (moduleId) loadDetail(); }, [moduleId]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/timesheet/detail/module/${moduleId}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!moduleId) return null;

  const tabs = [
    { key: "overview", label: "Overview", icon: "bi-info-circle" },
    { key: "team", label: "Team", icon: "bi-people", count: data?.team?.length },
    { key: "timesheet", label: "Timesheet", icon: "bi-clock-history", count: data?.timesheet?.length },
  ];

  const { module: mod, team, timesheet, stats } = data || {};

  return (
    <div className="ul-overlay" onClick={onClose}>
      <div className="ul-modal ul-modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div className="ul-modal-header">
          <div className="ul-modal-header-left">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--warning-soft, #FEF3C7)", color: "var(--warning, #D97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              {loading ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-list-task" />}
            </div>
            <div>
              <h6 className="ul-modal-title">{loading ? "Loading…" : mod?.module_name || "Module Details"}</h6>
              <p className="ul-modal-sub">
                {mod?.project_name && <><i className="bi bi-folder" style={{ marginRight: 4 }} />{mod.project_name}</>}
                {mod?.module_status && <> • <StatusBadge status={mod.module_status} /></>}
                {stats?.total_hours && <> • {fmtHrs(stats.total_hours)} logged</>}
              </p>
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

        {!loading && !mod && (
          <div className="ul-modal-body">
            <EmptyState icon="bi-list-task" title="Module not found" text="The module could not be loaded." />
          </div>
        )}

        {!loading && mod && (
          <>
            {/* Stats */}
            <div className="ul-modal-body" style={{ paddingBottom: 0 }}>
              <div className="modal-stat-grid">
                {[
                  { label: "Contributors", value: stats?.contributor_count || 0, icon: "bi-people" },
                  { label: "Total Hours", value: fmtHrs(stats?.total_hours), icon: "bi-clock" },
                  { label: "Entries", value: stats?.entry_count || 0, icon: "bi-journal-text" },
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
                    { label: "Module Name", value: mod.module_name },
                    { label: "Project", value: mod.project_name, clickable: true, onClick: () => onNavigate?.("project", mod.project_id) },
                    { label: "Status", value: <StatusBadge status={mod.module_status} /> },
                    { label: "Total Hours Logged", value: fmtHrs(stats?.total_hours) },
                    { label: "Total Entries", value: stats?.entry_count || 0 },
                    { label: "Team Size", value: stats?.contributor_count || 0 },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="modal-detail-label">{item.label}</div>
                      <div
                        className="modal-detail-value"
                        style={{
                          color: item.clickable ? "var(--primary)" : "var(--text)",
                          cursor: item.clickable ? "pointer" : "default",
                        }}
                        onClick={item.onClick}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "team" && (
                team?.length > 0 ? (
                  <table className="data-table">
                    <thead><tr><th>Member</th><th>Email</th><th>Entries</th><th>Hours</th></tr></thead>
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
                          <td>{m.entry_count}</td>
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
                    <thead><tr><th>Date</th><th>Employee</th><th>Hours</th><th>Time</th><th>Description</th></tr></thead>
                    <tbody>
                      {timesheet.map((t) => (
                        <tr key={t.id}>
                          <td>{fmtDate(t.date)}</td>
                          <td style={{ fontWeight: 500 }}>{t.employee_name}</td>
                          <td><span className="ul-badge ul-badge-info">{fmtHrs(t.man_hrs)}</span></td>
                          <td style={{ color: "var(--t-muted)", fontSize: 12 }}>{t.start_time?.substring(0,5)} - {t.end_time?.substring(0,5)}</td>
                          <td style={{ color: "var(--t-muted)", fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.work_description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <EmptyState icon="bi-clock-history" title="No timesheet entries" text="No timesheet entries for this module yet." />
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
