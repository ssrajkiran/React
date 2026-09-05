import { useState, useEffect } from "react";
import api from "../../api";
import StatusBadge from "../ui/StatusBadge";
import EmptyState from "../ui/EmptyState";
import { fmtHrs, fmtDateLong, getInitials } from "../../utils";

export default function TimesheetDetailModal({ timesheetId, onClose, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (timesheetId) loadDetail(); }, [timesheetId]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/timesheet/detail/${timesheetId}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!timesheetId) return null;

  return (
    <div className="ul-overlay" onClick={onClose}>
      <div className="ul-modal ul-modal-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ul-modal-header">
          <div className="ul-modal-header-left">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--info-soft, #DBEAFE)", color: "var(--info, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              {loading ? <i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> : <i className="bi bi-clock-history" />}
            </div>
            <div>
              <h6 className="ul-modal-title">{loading ? "Loading…" : `Timesheet Entry #${data?.id || ""}`}</h6>
              <p className="ul-modal-sub">{data?.employee_name} • {fmtDateLong(data?.date)}</p>
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

        {!loading && !data && (
          <div className="ul-modal-body">
            <EmptyState icon="bi-clock-history" title="Timesheet not found" text="The timesheet entry could not be loaded." />
          </div>
        )}

        {!loading && data && (
          <div className="ul-modal-body">
            {/* Entry Details */}
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Entry Details</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
                {[
                  { label: "Date", value: fmtDateLong(data.date) },
                  { label: "Hours", value: fmtHrs(data.man_hrs) },
                  data.start_time && { label: "Start Time", value: data.start_time?.substring(0,5) },
                  data.end_time && { label: "End Time", value: data.end_time?.substring(0,5) },
                ].filter(Boolean).map((item) => (
                  <div key={item.label}>
                    <span style={{ fontSize: 11, color: "var(--t-muted)" }}>{item.label}</span>
                    <p style={{ margin: "2px 0 0", fontWeight: 600, fontSize: 13 }}>{item.value}</p>
                  </div>
                ))}
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ fontSize: 11, color: "var(--t-muted)" }}>Description</span>
                  <p style={{ margin: "2px 0 0", fontSize: 13 }}>{data.work_description || "No description provided"}</p>
                </div>
              </div>
            </div>

            <div className="ul-modal-divider" />

            {/* Related Information */}
            <div style={{ marginTop: 16 }}>
              <span style={{ fontSize: 11, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Related Information</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
                <div>
                  <span style={{ fontSize: 11, color: "var(--t-muted)" }}>Employee</span>
                  <p
                    style={{ margin: "2px 0 0", fontWeight: 600, fontSize: 13, color: "var(--primary)", cursor: "pointer" }}
                    onClick={() => data.created_by && onNavigate?.("user", data.created_by)}
                  >
                    {data.employee_name || "—"}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "var(--t-muted)" }}>Email</span>
                  <p style={{ margin: "2px 0 0", fontSize: 13 }}>{data.employee_email || "—"}</p>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "var(--t-muted)" }}>Project</span>
                  <p
                    style={{ margin: "2px 0 0", fontWeight: 600, fontSize: 13, color: "var(--primary)", cursor: "pointer" }}
                    onClick={() => data.project_id && onNavigate?.("project", data.project_id)}
                  >
                    {data.project_name || "Permission"}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "var(--t-muted)" }}>Module</span>
                  <p
                    style={{ margin: "2px 0 0", fontWeight: 600, fontSize: 13, color: "var(--primary)", cursor: "pointer" }}
                    onClick={() => data.module_id && onNavigate?.("module", data.module_id)}
                  >
                    {data.module_name || "—"}
                  </p>
                </div>
                {data.module_status && (
                  <div>
                    <span style={{ fontSize: 11, color: "var(--t-muted)" }}>Module Status</span>
                    <p style={{ margin: "2px 0 0" }}><StatusBadge status={data.module_status} /></p>
                  </div>
                )}
                <div>
                  <span style={{ fontSize: 11, color: "var(--t-muted)" }}>Created At</span>
                  <p style={{ margin: "2px 0 0", fontSize: 13 }}>{data.created_at ? new Date(data.created_at).toLocaleString() : "—"}</p>
                </div>
              </div>
            </div>
          </div>
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
