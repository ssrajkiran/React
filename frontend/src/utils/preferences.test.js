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
    expect(DEFAULT_PREFS).toEqual({ theme: "light", accent: "teal", font: "poppins" });
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
      .toEqual({ theme: "dark", accent: "teal", font: "poppins" });
  });

  it("fills missing fields from defaults", () => {
    expect(sanitizePrefs({ accent: "rose" })).toEqual({
      theme: "light",
      accent: "rose",
      font: "poppins",
    });
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
    expect(loadPrefs(storage)).toEqual({ theme: "dark", accent: "orange", font: "inter" });
  });

  it("sanitizes before saving", () => {
    savePrefs({ theme: "invalid", accent: "blue" }, storage);
    expect(loadPrefs(storage)).toEqual({ theme: "light", accent: "blue", font: "poppins" });
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
    expect(readPrefsFromDom()).toEqual({ theme: "dark", accent: "rose", font: "nunito" });
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

describe("storage keys", () => {
  it("uses hrms-prefs / hrms-theme", () => {
    expect(PREFS_KEY).toBe("hrms-prefs");
    expect(THEME_KEY).toBe("hrms-theme");
  });
});
