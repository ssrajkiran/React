import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api";
import AppLayout from "../../components/layout/AppLayout";
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
  return new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
};

export default function TimesheetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDetail(); }, [id]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/timesheet/detail/${id}`);
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

  if (!data) {
    return (
      <AppLayout>
        <EmptyState icon="bi-clock-history" title="Timesheet not found" text="The timesheet entry could not be loaded." action={<button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="detail-page">
        <div className="detail-hero">
          <div className="detail-hero-icon" style={{ background: "var(--info-light)", color: "var(--info)" }}>
            <i className="bi bi-clock-history"></i>
          </div>
          <div className="detail-hero-info">
            <h2 className="detail-hero-title">Timesheet Entry #{data.id}</h2>
            <div className="detail-hero-meta">
              <span><i className="bi bi-calendar3"></i> {fmtDate(data.date)}</span>
              <span><i className="bi bi-clock"></i> {fmtHrs(data.man_hrs)}</span>
              {data.start_time && <span>{data.start_time?.substring(0,5)} - {data.end_time?.substring(0,5)}</span>}
            </div>
          </div>
          <div className="detail-hero-actions">
            <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>
              <i className="bi bi-arrow-left"></i> Back
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Timesheet Info */}
          <div className="card">
            <h4 style={{ margin: "0 0 16px" }}>Entry Details</h4>
            <div className="info-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="info-item"><div className="info-label">Date</div><div className="info-value">{fmtDate(data.date)}</div></div>
              <div className="info-item"><div className="info-label">Hours</div><div className="info-value">{fmtHrs(data.man_hrs)}</div></div>
              {data.start_time && <div className="info-item"><div className="info-label">Start Time</div><div className="info-value">{data.start_time?.substring(0,5)}</div></div>}
              {data.end_time && <div className="info-item"><div className="info-label">End Time</div><div className="info-value">{data.end_time?.substring(0,5)}</div></div>}
              <div className="info-item" style={{ gridColumn: "1 / -1" }}>
                <div className="info-label">Description</div>
                <div className="info-value">{data.work_description || "No description provided"}</div>
              </div>
            </div>
          </div>

          {/* Related Info */}
          <div className="card">
            <h4 style={{ margin: "0 0 16px" }}>Related Information</h4>
            <div className="info-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="info-item">
                <div className="info-label">Employee</div>
                <div className="info-value" style={{ cursor: "pointer", color: "var(--primary)" }} onClick={() => data.created_by && navigate(`/admin/users/${data.created_by}`)}>
                  {data.employee_name || "—"}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">Email</div>
                <div className="info-value">{data.employee_email || "—"}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Project</div>
                <div className="info-value" style={{ cursor: "pointer", color: "var(--primary)" }} onClick={() => data.project_id && navigate(`/admin/projects/${data.project_id}`)}>
                  {data.project_name || "Permission"}
                </div>
              </div>
              <div className="info-item">
                <div className="info-label">Module</div>
                <div className="info-value" style={{ cursor: "pointer", color: "var(--primary)" }} onClick={() => data.module_id && navigate(`/admin/modules/${data.module_id}`)}>
                  {data.module_name || "—"}
                </div>
              </div>
              {data.module_status && (
                <div className="info-item">
                  <div className="info-label">Module Status</div>
                  <div className="info-value"><StatusBadge status={data.module_status} /></div>
                </div>
              )}
              <div className="info-item">
                <div className="info-label">Created At</div>
                <div className="info-value">{data.created_at ? new Date(data.created_at).toLocaleString() : "—"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
