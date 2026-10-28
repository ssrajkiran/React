// Shared utility functions

export const fmtHrs = (hrs) => {
  const n = Number(hrs) || 0;
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// Parse any incoming date value into { y, m, d } WITHOUT timezone shifts.
// - Date instances / ISO strings with zone (…Z or ±hh:mm) → convert to local time first
// - "YYYY-MM-DD" and "YYYY-MM-DD HH:MM:SS" (MySQL, wall-clock) → take the date part as-is
const parseDateParts = (input) => {
  if (input instanceof Date) {
    if (isNaN(input)) return null;
    return { y: input.getFullYear(), m: input.getMonth() + 1, d: input.getDate() };
  }
  const s = String(input).trim();
  if (!s) return null;
  if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const dt = new Date(s);
    if (isNaN(dt)) return null;
    return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  const dt = new Date(s);
  if (isNaN(dt)) return null;
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
};

const pad2 = (n) => String(n).padStart(2, "0");

export const fmtDate = (d) => {
  const p = parseDateParts(d);
  if (!p) return "—";
  return `${pad2(p.d)}-${pad2(p.m)}-${p.y}`;
};

export const fmtDateLong = (d) => {
  const p = parseDateParts(d);
  if (!p) return "—";
  const dt = new Date(p.y, p.m - 1, p.d);
  const weekday = dt.toLocaleDateString("en-IN", { weekday: "long" });
  return `${weekday}, ${pad2(p.d)}-${pad2(p.m)}-${p.y}`;
};

export const fmtDateTime = (d) => {
  if (!d) return "—";
  const p = parseDateParts(d);
  if (!p) return "—";
  let time = "";
  if (d instanceof Date) {
    time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  } else {
    const s = String(d);
    if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(s)) {
      const dt = new Date(s);
      if (!isNaN(dt)) time = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
    } else {
      const t = s.match(/\b(\d{2}):(\d{2})/);
      if (t) time = `${t[1]}:${t[2]}`;
    }
  }
  return time
    ? `${pad2(p.d)}-${pad2(p.m)}-${p.y} ${time}`
    : `${pad2(p.d)}-${pad2(p.m)}-${p.y}`;
};

export const fmtDob = (d) => fmtDate(d);

// "2.00" / 2 / "2" → "2 days"; 1 → "1 day"; 0.5 → "0.5 days"
export const fmtDays = (d) => {
  const n = Number(d);
  if (!Number.isFinite(n)) return "—";
  const r = Math.round(n * 100) / 100;
  const val = Number.isInteger(r) ? r : String(r);
  return `${val} day${r === 1 ? "" : "s"}`;
};

// "2.00" / 2.5 → "2" / "2.5" (trim trailing zeros)
export const fmtNum = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return String(Math.round(v * 100) / 100);
};

export const getInitials = (name) => {
  return name?.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2) || "U";
};

export const showToast = (setToast) => (msg, type) => {
  setToast({ msg, type });
  setTimeout(() => setToast(null), 3500);
};

// First-click sort direction for a column: date/id/hour-like columns start
// descending (newest / highest on top), everything else ascending.
export const defaultSortOrderFor = (field) =>
  /(^|_)(date|days?|start|end|created)$|_at$|^id$|hrs|hours|count/i.test(String(field || ""))
    ? "desc"
    : "asc";
