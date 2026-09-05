export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs-list">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`tab-item ${active === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.icon && <i className={`bi ${tab.icon}`} style={{ marginRight: 6 }}></i>}
          {tab.label}
          {tab.count !== undefined && (
            <span style={{
              marginLeft: 6, padding: '1px 7px', borderRadius: 10,
              fontSize: 10, fontWeight: 700,
              background: active === tab.key ? 'var(--primary-soft)' : 'var(--bg-muted)',
              color: active === tab.key ? 'var(--primary)' : 'var(--t-light)',
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
