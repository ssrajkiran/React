import { describe, it, expect, beforeEach } from "vitest";
import {
  PREFS_KEY,
  THEME_KEY,
  THEME_OPTIONS,
  ACCENT_OPTIONS,
  FONT_OPTIONS,
  DEFAULT_PREFS,
  sanitizePrefs,
  loadPrefs,
  savePrefs,
  applyPrefs,
  readPrefsFromDom,
  normalizeHex,
  hexToRgb,
  mix,
  luminance,
  onColorFor,
  customAccentVars,
} from "./preferences";

const makeStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  };
};

describe("option constants", () => {
  it("exposes 2 themes, 7 accents, 5 fonts", () => {
    expect(THEME_OPTIONS.map((t) => t.id)).toEqual(["light", "dark"]);
    expect(ACCENT_OPTIONS).toHaveLength(7);
    expect(FONT_OPTIONS).toHaveLength(5);
  });

  it("defaults to light + teal + poppins", () => {
    expect(DEFAULT_PREFS).toEqual({
      theme: "light",
      accent: "teal",
      accentColor: "#0D9488",
      font: "poppins",
    });
  });

  it("every accent has a label and hex color", () => {
    ACCENT_OPTIONS.forEach((a) => {
      expect(a.label).toBeTruthy();
      expect(a.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe("sanitizePrefs", () => {
  it("returns defaults for null / non-object input", () => {
    expect(sanitizePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs("dark")).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs(42)).toEqual(DEFAULT_PREFS);
  });

  it("rejects unknown ids per-field, keeps valid ones", () => {
    expect(sanitizePrefs({ theme: "solarized", accent: "neon", font: "comic" }))
      .toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs({ theme: "dark", accent: "bogus", font: 9 }))
      .toEqual({ theme: "dark", accent: "teal", accentColor: "#0D9488", font: "poppins" });
  });

  it("fills missing fields from defaults", () => {
    expect(sanitizePrefs({ accent: "rose" })).toEqual({
      theme: "light",
      accent: "rose",
      accentColor: "#0D9488",
      font: "poppins",
    });
  });

  it("accepts the custom accent + a valid hex, rejects bad hex", () => {
    expect(sanitizePrefs({ accent: "custom", accentColor: "#abcdef" })).toEqual({
      theme: "light",
      accent: "custom",
      accentColor: "#ABCDEF",
      font: "poppins",
    });
    // invalid hex falls back to the default color; the custom accent is kept
    expect(sanitizePrefs({ accent: "custom", accentColor: "red" }).accentColor).toBe("#0D9488");
    expect(sanitizePrefs({ accent: "custom", accentColor: "#12345" }).accentColor).toBe("#0D9488");
    expect(sanitizePrefs({ accentColor: "not-an-accent" }).accent).toBe("teal");
  });
});

describe("loadPrefs / savePrefs", () => {
  let storage;

  beforeEach(() => {
    storage = makeStorage();
  });

  it("returns defaults when storage is empty", () => {
    expect(loadPrefs(storage)).toEqual(DEFAULT_PREFS);
  });

  it("round-trips saved prefs", () => {
    savePrefs({ theme: "dark", accent: "orange", font: "inter" }, storage);
    expect(loadPrefs(storage)).toEqual({
      theme: "dark",
      accent: "orange",
      accentColor: "#0D9488",
      font: "inter",
    });
  });

  it("round-trips a custom accent color", () => {
    savePrefs({ accent: "custom", accentColor: "#123456" }, storage);
    expect(loadPrefs(storage)).toEqual({
      theme: "light",
      accent: "custom",
      accentColor: "#123456",
      font: "poppins",
    });
  });

  it("sanitizes before saving", () => {
    savePrefs({ theme: "invalid", accent: "blue" }, storage);
    expect(loadPrefs(storage)).toEqual({
      theme: "light",
      accent: "blue",
      accentColor: "#0D9488",
      font: "poppins",
    });
  });

  it("keeps legacy hrms-theme key in sync", () => {
    savePrefs({ theme: "dark" }, storage);
    expect(storage.getItem(THEME_KEY)).toBe("dark");
    expect(storage.getItem(PREFS_KEY)).toContain('"dark"');
  });

  it("migrates legacy hrms-theme when new key absent", () => {
    storage.setItem(THEME_KEY, "dark");
    expect(loadPrefs(storage).theme).toBe("dark");
  });

  it("migrated legacy value still gets sanitized", () => {
    storage.setItem(THEME_KEY, "neon");
    expect(loadPrefs(storage).theme).toBe("light");
  });
});

describe("applyPrefs", () => {
  it("sets data-theme, data-accent, data-font on <html>", () => {
    applyPrefs({ theme: "dark", accent: "purple", font: "roboto" });
    const root = document.documentElement;
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(root.getAttribute("data-accent")).toBe("purple");
    expect(root.getAttribute("data-font")).toBe("roboto");
    applyPrefs(DEFAULT_PREFS);
  });

  it("sanitizes invalid values before applying", () => {
    applyPrefs({ theme: "neon" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-accent")).toBe("teal");
    applyPrefs(DEFAULT_PREFS);
  });
});

describe("readPrefsFromDom", () => {
  it("reads back applied attributes", () => {
    applyPrefs({ theme: "dark", accent: "rose", font: "nunito" });
    expect(readPrefsFromDom()).toEqual({
      theme: "dark",
      accent: "rose",
      accentColor: "#0D9488",
      font: "nunito",
    });
    applyPrefs(DEFAULT_PREFS);
  });

  it("falls back to defaults when attributes missing", () => {
    const root = document.documentElement;
    root.removeAttribute("data-theme");
    root.removeAttribute("data-accent");
    root.removeAttribute("data-font");
    expect(readPrefsFromDom()).toEqual(DEFAULT_PREFS);
  });
});

describe("color utilities", () => {
  it("normalizeHex validates and uppercases 6-digit hex", () => {
    expect(normalizeHex("#abcdef")).toBe("#ABCDEF");
    expect(normalizeHex("red")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex(null)).toBeNull();
  });

  it("hexToRgb parses channels", () => {
    expect(hexToRgb("#FF0000")).toEqual([255, 0, 0]);
    expect(hexToRgb("bogus")).toBeNull();
  });

  it("mix interpolates between two colors", () => {
    expect(mix("#000000", "#FFFFFF", 0)).toBe("#000000");
    expect(mix("#000000", "#FFFFFF", 1)).toBe("#FFFFFF");
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });

  it("luminance: black 0, white 1", () => {
    expect(luminance("#000000")).toBeCloseTo(0, 5);
    expect(luminance("#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("onColorFor keeps white on dark colors, flips on bright ones", () => {
    expect(onColorFor("#0D9488")).toBe("#FFFFFF"); // light-theme teal — design preserved
    expect(onColorFor("#2563EB")).toBe("#FFFFFF"); // light-theme blue
    expect(onColorFor("#2DD4BF")).toBe("#0B1120"); // dark-theme teal — was unreadable white
    expect(onColorFor("#FFFF00")).toBe("#0B1120"); // bright custom color
    expect(onColorFor("#000000")).toBe("#FFFFFF");
  });
});

describe("customAccentVars", () => {
  it("derives the full token set from a hex", () => {
    const vars = customAccentVars("#123456", "light");
    expect(vars["--primary"]).toBe("#123456");
    expect(vars["--primary-light"]).toMatch(/^#[0-9A-F]{6}$/);
    expect(vars["--primary-dark"]).toMatch(/^#[0-9A-F]{6}$/);
    expect(vars["--primary-soft"]).toMatch(/^#[0-9A-F]{6}$/);
    expect(vars["--primary-ring"]).toMatch(/^rgba\(/);
    expect(vars["--sidebar-grad"]).toContain("linear-gradient");
  });

  it("dark theme lifts near-black picks so they stay visible", () => {
    expect(customAccentVars("#3B82F6", "dark")["--primary"]).toBe("#3B82F6"); // visible → kept
    expect(customAccentVars("#123456", "dark")["--primary"]).not.toBe("#123456"); // 1.5:1 on dark bg → lifted
    expect(customAccentVars("#000000", "dark")["--primary"]).not.toBe("#000000");
  });
});

describe("applyPrefs derived vars", () => {
  it("light preset → white on-primary", () => {
    applyPrefs({ theme: "light", accent: "teal" });
    expect(document.documentElement.style.getPropertyValue("--on-primary")).toBe("#FFFFFF");
  });

  it("dark preset → dark on-primary (readable on light primaries)", () => {
    applyPrefs({ theme: "dark", accent: "orange" });
    expect(document.documentElement.style.getPropertyValue("--on-primary")).toBe("#0B1120");
    applyPrefs(DEFAULT_PREFS);
  });

  it("custom accent writes inline primary vars and cleans them up for presets", () => {
    applyPrefs({ accent: "custom", accentColor: "#123456" });
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--primary")).toBe("#123456");
    expect(style.getPropertyValue("--on-primary")).toBe("#FFFFFF");
    applyPrefs(DEFAULT_PREFS);
    expect(style.getPropertyValue("--primary")).toBe("");
  });
});

describe("storage keys", () => {
  it("uses hrms-prefs / hrms-theme", () => {
    expect(PREFS_KEY).toBe("hrms-prefs");
    expect(THEME_KEY).toBe("hrms-theme");
  });
});
