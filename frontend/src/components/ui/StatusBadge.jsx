const VARIANTS = {
  success: { bg: 'var(--success-soft)', color: 'var(--success)' },
  danger:  { bg: 'var(--danger-soft)', color: 'var(--danger)' },
  warning: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  info:    { bg: 'var(--info-soft)', color: 'var(--info)' },
  neutral: { bg: 'var(--bg-muted)', color: 'var(--t-muted)' },
};

const STATUS_MAP = {
  completed: 'success',
  active: 'success',
  approved: 'success',
  present: 'success',
  'in progress': 'warning',
  'in-progress': 'warning',
  pending: 'warning',
  rejected: 'danger',
  inactive: 'danger',
  cancelled: 'danger',
  break: 'info',
  permission: 'info',
  meeting: 'success',
};

export default function StatusBadge({ status, variant, dot = true, children }) {
  const norm = String(status || '').trim().toLowerCase();
  const v = variant || STATUS_MAP[norm] || (VARIANTS[norm] ? norm : 'neutral');
  const style = VARIANTS[v] || VARIANTS.neutral;

  return (
    <span
      className="badge-status"
      style={{ background: style.bg, color: style.color }}
    >
      {dot && <span className="dot" style={{ background: style.color }}></span>}
      {children || status}
    </span>
  );
}
