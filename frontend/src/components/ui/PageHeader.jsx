export default function PageHeader({ title, subtitle, actions, backTo }) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        {backTo && (
          <a href={backTo} className="back-link">
            <i className="bi bi-arrow-left"></i> Back
          </a>
        )}
        {title && <h3 className="page-header-title">{title}</h3>}
        {subtitle && <p className="page-header-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
