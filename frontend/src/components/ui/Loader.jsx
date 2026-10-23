export function Skeleton({ lines = 3, height = 12, gap = 10, lastWidth = "60%", style }) {
  return (
    <div className="skel" style={{ display: "flex", flexDirection: "column", gap, ...style }} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <span
          className="skel-bar"
          key={i}
          style={{ height, width: i === lines - 1 ? lastWidth : "100%" }}
        />
      ))}
    </div>
  );
}

export function InlineLoader({ message = "Loading", className = "" }) {
  return (
    <span className={`inline-loader ${className}`}>
      <i className="bi bi-arrow-repeat" />
      <span>
        {message}
        <span className="loading-dots" />
      </span>
    </span>
  );
}

export function PageLoader({ message = "Loading" }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="page-loader-mark">
        <span className="page-loader-ring" />
        <span className="page-loader-ring page-loader-ring-2" />
        <span className="page-loader-core">V</span>
      </div>
      <p className="page-loader-text">
        {message}
        <span className="loading-dots" />
      </p>
      <div className="page-loader-bar"><span /></div>
    </div>
  );
}
