// Shared utility functions

export const fmtHrs = (hrs) => {
  const n = Number(hrs) || 0;
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

export const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtDateLong = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const fmtDob = (d) => {
  if (!d) return "—";
  const [y, m, dd] = String(d).split("-");
  if (!y || !m || !dd) return "—";
  return `${dd} ${MONTHS[Number(m) - 1] || m} ${y}`;
};

export const getInitials = (name) => {
  return name?.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2) || "U";
};

export const showToast = (setToast) => (msg, type) => {
  setToast({ msg, type });
  setTimeout(() => setToast(null), 3500);
};
