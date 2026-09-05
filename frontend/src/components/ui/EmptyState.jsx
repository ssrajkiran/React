export default function EmptyState({ icon = 'bi-inbox', title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <i className={`bi ${icon}`}></i>
      </div>
      {title && <h4 className="empty-state-title">{title}</h4>}
      {text && <p className="empty-state-text">{text}</p>}
      {action}
    </div>
  );
}
