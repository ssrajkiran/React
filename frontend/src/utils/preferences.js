// ── User appearance preferences (theme / accent / font) ──
// Pure logic — kept framework-free so it can be unit tested.

export const PREFS_KEY = "hrms-prefs";
export const THEME_KEY = "hrms-theme"; // legacy key kept in sync

export const THEME_OPTIONS = [
  { id: "light", label: "Light", icon: "bi-sun" },
  { id: "dark", label: "Dark", icon: "bi-moon-stars" },
];

export const SIDEBAR_OPTIONS = [
  { id: "white", label: "White", icon: "bi-layout-sidebar" },
  { id: "dark", label: "Dark", icon: "bi-layout-sidebar-inset" },
  { id: "themed", label: "Accent", icon: "bi-palette" },
];

export const ACCENT_OPTIONS = [
  { id: "teal", label: "Teal", color: "#0D9488" },
  { id: "blue", label: "Blue", color: "#2563EB" },
  { id: "indigo", label: "Indigo", color: "#4F46E5" },
  { id: "purple", label: "Purple", color: "#7C3AED" },
  { id: "rose", label: "Rose", color: "#E11D48" },
  { id: "emerald", label: "Emerald", color: "#059669" },
  { id: "orange", label: "Orange", color: "#EA580C" },
  { id: "white", label: "White", color: "#FFFFFF" },
];

export const FONT_OPTIONS = [
  { id: "poppins", label: "Poppins", stack: "'Poppins', sans-serif" },
  { id: "inter", label: "Inter", stack: "'Inter', 'Inter Tight', sans-serif" },
  { id: "nunito", label: "Nunito", stack: "'Nunito', sans-serif" },
  { id: "roboto", label: "Roboto", stack: "'Roboto', sans-serif" },
  { id: "system", label: "System", stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
];

// Custom accent: the user picks an arbitrary hex with the color picker.
export const CUSTOM_ACCENT = "custom";
export const DEFAULT_ACCENT_COLOR = "#0D9488";
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Fallback primary per accent/theme (used when computed styles are unavailable,
// e.g. tests — browsers resolve the real value from App.css).
const PRESET_PRIMARY = {
  light: {
    teal: "#0D9488", blue: "#2563EB", indigo: "#4F46E5", purple: "#7C3AED",
    rose: "#E11D48", emerald: "#059669", orange: "#EA580C", white: "#FFFFFF",
  },
  dark: {
    teal: "#2DD4BF", blue: "#60A5FA", indigo: "#818CF8", purple: "#A78BFA",
    rose: "#FB7185", emerald: "#34D399", orange: "#FB923C", white: "#FFFFFF",
  },
};

export const DEFAULT_PREFS = {
  theme: "light",
  sidebar: "white",
  accent: "teal",
  accentColor: DEFAULT_ACCENT_COLOR,
  font: "poppins",
};

// ── Color utilities (pure, testable) ──────────────────────────────────────

export const normalizeHex = (v) =>
  typeof v === "string" && HEX_RE.test(v.trim()) ? v.trim().toUpperCase() : null;

export const hexToRgb = (hex) => {
  const h = normalizeHex(hex);
  if (!h) return null;
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
};

export const rgbToHex = (r, g, b) =>
  "#" +
  [r, g, b]
    .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

// mix(a, b, t): t = 0 → a, t = 1 → b
export const mix = (a, b, t) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  if (!A || !B) return normalizeHex(a) || DEFAULT_ACCENT_COLOR;
  return rgbToHex(
    A[0] + (B[0] - A[0]) * t,
    A[1] + (B[1] - A[1]) * t,
    A[2] + (B[2] - A[2]) * t
  );
};

// WCAG relative luminance (0 = black, 1 = white); null-safe.
export const luminance = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Text color that belongs on a surface of `hex`:
// keeps white while it is still readable (≥ 3:1), otherwise picks whichever of
// white / near-black gives the better contrast. Keeps existing light-theme
// design intact while making dark mode and light/pastel picks readable.
export const onColorFor = (hex) => {
  const L = luminance(hex);
  const whiteContrast = 1.05 / (L + 0.05);
  if (whiteContrast >= 3) return "#FFFFFF";
  const darkL = luminance("#0B1120");
  const darkContrast = (L + 0.05) / (darkL + 0.05);
  return darkContrast > whiteContrast ? "#0B1120" : "#FFFFFF";
};

// CSS custom properties derived from an arbitrary accent hex.
export const customAccentVars = (hex, theme = "light") => {
  const base = normalizeHex(hex) || DEFAULT_ACCENT_COLOR;
  const isDark = theme === "dark";
  // In dark mode a near-black pick would vanish against the dark surface.
  const primary = isDark && luminance(base) < 0.045 ? mix(base, "#FFFFFF", 0.45) : base;
  const [r, g, b] = hexToRgb(primary);
  const isLightAccent = !isDark && luminance(primary) > 0.85;
  return {
    "--primary": primary,
    "--primary-light": mix(primary, "#FFFFFF", isDark ? 0.3 : 0.18),
    "--primary-dark": mix(primary, "#000000", 0.2),
    "--primary-soft": isLightAccent ? mix(primary, "#000000", 0.08) : mix(primary, isDark ? "#000000" : "#FFFFFF", isDark ? 0.87 : 0.92),
    "--primary-ring": `rgba(${r}, ${g}, ${b}, ${isDark ? 0.24 : 0.18})`,
    "--sidebar-accent": isLightAccent ? "#0F172A" : (isDark ? primary : mix(primary, "#FFFFFF", 0.35)),
    "--sidebar-grad": isLightAccent
      ? "#FFFFFF"
      : `linear-gradient(160deg, ${mix(primary, "#000000", isDark ? 0.8 : 0.72)} 0%, ${mix(primary, "#000000", isDark ? 0.55 : 0.35)} 40%, ${primary} 100%)`,
  };
};

export const ACCENT_VAR_KEYS = [
  "--primary",
  "--primary-light",
  "--primary-dark",
  "--primary-soft",
  "--primary-ring",
  "--sidebar-accent",
  "--sidebar-grad",
];

const presetPrimary = (accent, theme) =>
  PRESET_PRIMARY[theme === "dark" ? "dark" : "light"][accent] || PRESET_PRIMARY.light.teal;

// ── Sanitize / load / save ────────────────────────────────────────────────

export const sanitizePrefs = (raw) => {
  const src = raw && typeof raw === "object" ? raw : {};
  const accentValid =
    ACCENT_OPTIONS.some((a) => a.id === src.accent) || src.accent === CUSTOM_ACCENT;
  return {
    theme: THEME_OPTIONS.some((t) => t.id === src.theme) ? src.theme : DEFAULT_PREFS.theme,
    sidebar: SIDEBAR_OPTIONS.some((s) => s.id === src.sidebar) ? src.sidebar : DEFAULT_PREFS.sidebar,
    accent: accentValid ? src.accent : DEFAULT_PREFS.accent,
    accentColor: normalizeHex(src.accentColor) || DEFAULT_PREFS.accentColor,
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

// ── Apply to <html> ───────────────────────────────────────────────────────

// Derives accent custom properties + the text color for primary surfaces
// (--on-primary) from the effective accent color.
export const applyAccentVars = (clean, root, doc = globalThis.document) => {
  if (!root || !root.style) return;
  try {
    if (clean.accent === CUSTOM_ACCENT) {
      const vars = customAccentVars(clean.accentColor, clean.theme);
      ACCENT_VAR_KEYS.forEach((k) => root.style.setProperty(k, vars[k]));
    } else {
      ACCENT_VAR_KEYS.forEach((k) => root.style.removeProperty(k));
    }

    // Effective primary: inline custom vars win, otherwise App.css presets.
    let primary = "";
    const view = doc?.defaultView;
    if (view?.getComputedStyle) {
      primary = view.getComputedStyle(root).getPropertyValue("--primary").trim();
    }
    if (!normalizeHex(primary)) {
      primary =
        clean.accent === CUSTOM_ACCENT
          ? normalizeHex(clean.accentColor) || DEFAULT_ACCENT_COLOR
          : presetPrimary(clean.accent, clean.theme);
    }
    root.style.setProperty("--on-primary", onColorFor(primary));
  } catch { /* environments without style support */ }
};

// Applies prefs to <html> attributes consumed by App.css token overrides.
export const applyPrefs = (prefs, doc = globalThis.document) => {
  const clean = sanitizePrefs(prefs);
  const root = doc?.documentElement;
  if (!root) return clean;
  root.setAttribute("data-theme", clean.theme);
  root.setAttribute("data-sidebar", clean.sidebar);
  root.setAttribute("data-accent", clean.accent);
  root.setAttribute("data-font", clean.font);
  root.setAttribute("data-accent-color", clean.accentColor);
  applyAccentVars(clean, root, doc);
  return clean;
};

export const readPrefsFromDom = (doc = globalThis.document) => {
  const root = doc?.documentElement;
  return sanitizePrefs({
    theme: root?.getAttribute("data-theme") || DEFAULT_PREFS.theme,
    sidebar: root?.getAttribute("data-sidebar") || DEFAULT_PREFS.sidebar,
    accent: root?.getAttribute("data-accent") || DEFAULT_PREFS.accent,
    accentColor: root?.getAttribute("data-accent-color") || DEFAULT_PREFS.accentColor,
    font: root?.getAttribute("data-font") || DEFAULT_PREFS.font,
  });
};
