// ── User appearance preferences (theme / accent / font) ──
// Pure logic — kept framework-free so it can be unit tested.

export const PREFS_KEY = "hrms-prefs";
export const THEME_KEY = "hrms-theme"; // legacy key kept in sync

export const THEME_OPTIONS = [
  { id: "light", label: "Light", icon: "bi-sun" },
  { id: "dark", label: "Dark", icon: "bi-moon-stars" },
];

export const ACCENT_OPTIONS = [
  { id: "teal", label: "Teal", color: "#0D9488" },
  { id: "blue", label: "Blue", color: "#2563EB" },
  { id: "indigo", label: "Indigo", color: "#4F46E5" },
  { id: "purple", label: "Purple", color: "#7C3AED" },
  { id: "rose", label: "Rose", color: "#E11D48" },
  { id: "emerald", label: "Emerald", color: "#059669" },
  { id: "orange", label: "Orange", color: "#EA580C" },
];

export const FONT_OPTIONS = [
  { id: "poppins", label: "Poppins", stack: "'Poppins', sans-serif" },
  { id: "inter", label: "Inter", stack: "'Inter', 'Inter Tight', sans-serif" },
  { id: "nunito", label: "Nunito", stack: "'Nunito', sans-serif" },
  { id: "roboto", label: "Roboto", stack: "'Roboto', sans-serif" },
  { id: "system", label: "System", stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
];

export const DEFAULT_PREFS = { theme: "light", accent: "teal", font: "poppins" };

export const sanitizePrefs = (raw) => {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    theme: THEME_OPTIONS.some((t) => t.id === src.theme) ? src.theme : DEFAULT_PREFS.theme,
    accent: ACCENT_OPTIONS.some((a) => a.id === src.accent) ? src.accent : DEFAULT_PREFS.accent,
    font: FONT_OPTIONS.some((f) => f.id === src.font) ? src.font : DEFAULT_PREFS.font,
  };
};

export const loadPrefs = (storage = globalThis.localStorage) => {
  try {
    const stored = JSON.parse(storage?.getItem(PREFS_KEY) || "null");
    const prefs = sanitizePrefs(stored);
    // migrate legacy single-key theme storage
    const legacy = storage?.getItem(THEME_KEY);
    if (!stored && (legacy === "light" || legacy === "dark")) prefs.theme = legacy;
    return prefs;
  } catch {
    return { ...DEFAULT_PREFS };
  }
};

export const savePrefs = (prefs, storage = globalThis.localStorage) => {
  const clean = sanitizePrefs(prefs);
  try {
    storage?.setItem(PREFS_KEY, JSON.stringify(clean));
    storage?.setItem(THEME_KEY, clean.theme); // legacy sync
  } catch { /* quota / private mode */ }
  return clean;
};

// Applies prefs to <html> attributes consumed by App.css token overrides.
export const applyPrefs = (prefs, doc = globalThis.document) => {
  const clean = sanitizePrefs(prefs);
  const root = doc?.documentElement;
  if (!root) return clean;
  root.setAttribute("data-theme", clean.theme);
  root.setAttribute("data-accent", clean.accent);
  root.setAttribute("data-font", clean.font);
  return clean;
};

export const readPrefsFromDom = (doc = globalThis.document) => {
  const root = doc?.documentElement;
  return sanitizePrefs({
    theme: root?.getAttribute("data-theme") || DEFAULT_PREFS.theme,
    accent: root?.getAttribute("data-accent") || DEFAULT_PREFS.accent,
    font: root?.getAttribute("data-font") || DEFAULT_PREFS.font,
  });
};
