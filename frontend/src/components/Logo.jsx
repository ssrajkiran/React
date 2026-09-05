export default function Logo({ size = 34, className = "" }) {
  return (
    <img
      src="/logo.png"
      alt="Voltech Logo"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: 2, objectFit: "contain", flexShrink: 0 ,    width: 40 }}
      onError={(e) => { e.target.style.display = "none"; }}
    />
  );
}
