export default function KPICard({ icon, iconBg, label, value, meta, trend }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-header">
        <div className="kpi-card-label">{label}</div>
        {icon && (
          <div className="kpi-card-icon" style={{ background: iconBg || 'var(--primary-soft)', color: iconBg ? 'inherit' : 'var(--primary)' }}>
            <i className={`bi ${icon}`}></i>
          </div>
        )}
      </div>
      <div className="kpi-card-value">{value}</div>
      {meta && <div className="kpi-card-meta">{meta}</div>}
      {trend && (
        <div className={`kpi-card-meta ${trend > 0 ? 'badge-up' : 'badge-down'}`}>
          <i className={`bi bi-arrow-${trend > 0 ? 'up' : 'down'}`}></i>
          {Math.abs(trend)}% vs last period
        </div>
      )}
    </div>
  );
}
