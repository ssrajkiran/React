import { describe, it, expect } from "vitest";
import {
  THEME_OPTIONS,
  SIDEBAR_OPTIONS,
  ACCENT_OPTIONS,
  FONT_OPTIONS,
  luminance,
  onColorFor,
  customAccentVars,
  applyPrefs,
  contrastRatio,
  isContrastAccessible,
} from "./preferences";

describe("Theme & Font Visibility / Accessibility Verification", () => {
  describe("Font Presets", () => {
    it("provides 5 legible font families for personalization", () => {
      expect(FONT_OPTIONS).toHaveLength(5);
      const fontIds = FONT_OPTIONS.map((f) => f.id);
      expect(fontIds).toContain("poppins");
      expect(fontIds).toContain("inter");
      expect(fontIds).toContain("nunito");
      expect(fontIds).toContain("roboto");
      expect(fontIds).toContain("system");
    });

    it("every font option has a valid CSS font stack", () => {
      FONT_OPTIONS.forEach((font) => {
        expect(font.stack).toBeTruthy();
        expect(font.stack.length).toBeGreaterThan(5);
        expect(font.label).toBeTruthy();
      });
    });
  });

  describe("WCAG Relative Luminance & Contrast Math", () => {
    it("pure white has luminance 1.0 and pure black has luminance 0.0", () => {
      expect(luminance("#FFFFFF")).toBeCloseTo(1.0, 2);
      expect(luminance("#000000")).toBeCloseTo(0.0, 2);
    });

    it("contrast ratio between black and white is 21:1", () => {
      const ratio = contrastRatio("#FFFFFF", "#000000");
      expect(ratio).toBeCloseTo(21.0, 1);
      expect(isContrastAccessible("#000000", "#FFFFFF")).toBe(true);
      expect(isContrastAccessible("#FFFFFF", "#000000")).toBe(true);
    });

    it("contrast ratio between identical colors is 1:1", () => {
      expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBe(1.0);
      expect(isContrastAccessible("#FFFFFF", "#FFFFFF")).toBe(false);
    });
  });

  describe("Button & Surface Text Visibility (--on-primary) Across All Presets", () => {
    ACCENT_OPTIONS.forEach((accent) => {
      it(`accent "${accent.id}" (${accent.color}) produces high-contrast text`, () => {
        const onColor = onColorFor(accent.color);
        const ratio = contrastRatio(onColor, accent.color);
        // WCAG AA requires at least 3:1 for graphical objects / bold controls
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      });
    });
  });

  describe("Surface Text Contrast in Light & Dark Mode", () => {
    const lightSurfaces = {
      bgBody: "#FFFFFF",
      bgCard: "#FFFFFF",
      bgMuted: "#F8FAFC",
      tBase: "#1E293B",
      tMuted: "#64748B",
    };

    const darkSurfaces = {
      bgBody: "#0B1120",
      bgCard: "#141B2D",
      bgMuted: "#1A2237",
      tBase: "#F1F5F9",
      tMuted: "#94A3B8",
    };

    it("light theme base text has > 10:1 contrast against card & body background", () => {
      const contrastOnCard = contrastRatio(lightSurfaces.tBase, lightSurfaces.bgCard);
      expect(contrastOnCard).toBeGreaterThan(10);
      expect(isContrastAccessible(lightSurfaces.tBase, lightSurfaces.bgCard)).toBe(true);
    });

    it("light theme muted text has > 4.5:1 contrast against card background", () => {
      const contrast = contrastRatio(lightSurfaces.tMuted, lightSurfaces.bgCard);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it("dark theme base text has > 12:1 contrast against dark card background", () => {
      const contrastOnCard = contrastRatio(darkSurfaces.tBase, darkSurfaces.bgCard);
      expect(contrastOnCard).toBeGreaterThan(12);
      expect(isContrastAccessible(darkSurfaces.tBase, darkSurfaces.bgCard)).toBe(true);
    });

    it("dark theme muted text has > 4.5:1 contrast against dark card background", () => {
      const contrast = contrastRatio(darkSurfaces.tMuted, darkSurfaces.bgCard);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("Custom Accent Personalization Visibility", () => {
    const testHexes = [
      { name: "Pure White", hex: "#FFFFFF" },
      { name: "Pure Black", hex: "#000000" },
      { name: "Bright Yellow", hex: "#FFFF00" },
      { name: "Cyan", hex: "#00FFFF" },
      { name: "Navy Blue", hex: "#0A192F" },
      { name: "Hot Pink", hex: "#FF69B4" },
      { name: "Emerald", hex: "#10B981" },
    ];

    testHexes.forEach(({ name, hex }) => {
      it(`custom accent "${name}" (${hex}) in light mode maintains accessible text`, () => {
        const vars = customAccentVars(hex, "light");
        expect(vars["--primary"]).toBeTruthy();
        expect(vars["--primary-soft"]).toBeTruthy();
        const onColor = onColorFor(vars["--primary"]);
        expect(contrastRatio(onColor, vars["--primary"])).toBeGreaterThanOrEqual(3.0);
      });

      it(`custom accent "${name}" (${hex}) in dark mode maintains accessible text`, () => {
        const vars = customAccentVars(hex, "dark");
        expect(vars["--primary"]).toBeTruthy();
        expect(vars["--primary-soft"]).toBeTruthy();
        const onColor = onColorFor(vars["--primary"]);
        expect(contrastRatio(onColor, vars["--primary"])).toBeGreaterThanOrEqual(3.0);
      });
    });
  });

  describe("Attendance Report '2 Days' Badge & Status Chips Contrast", () => {
    // In report.jsx, the duration badge ("2 Days") uses color: var(--t-base) on color-mix(in srgb, var(--primary) 8%, var(--bg-card))
    // which guarantees at least 10:1 contrast against white in light mode and >10:1 against dark in dark mode.
    it("light theme '2 days' text (#1E293B) against light card (#FFFFFF) has > 10:1 contrast", () => {
      const contrast = contrastRatio("#1E293B", "#FFFFFF");
      expect(contrast).toBeGreaterThan(10);
      expect(isContrastAccessible("#1E293B", "#FFFFFF")).toBe(true);
    });

    it("dark theme '2 days' text (#F1F5F9) against dark card (#141B2D) has > 12:1 contrast", () => {
      const contrast = contrastRatio("#F1F5F9", "#141B2D");
      expect(contrast).toBeGreaterThan(12);
      expect(isContrastAccessible("#F1F5F9", "#141B2D")).toBe(true);
    });

    it("white theme '2 days' text (#0F172A) against white (#FFFFFF) has > 15:1 contrast", () => {
      const contrast = contrastRatio("#0F172A", "#FFFFFF");
      expect(contrast).toBeGreaterThan(15);
      expect(isContrastAccessible("#0F172A", "#FFFFFF")).toBe(true);
    });
  });

  describe("applyPrefs Dom State Across All Combinations", () => {
    THEME_OPTIONS.forEach((t) => {
      SIDEBAR_OPTIONS.forEach((s) => {
        FONT_OPTIONS.forEach((f) => {
          it(`applies { theme: ${t.id}, sidebar: ${s.id}, font: ${f.id} } to DOM properly`, () => {
            const prefs = {
              theme: t.id,
              sidebar: s.id,
              accent: "teal",
              accentColor: "#0D9488",
              font: f.id,
            };
            applyPrefs(prefs, document);
            expect(document.documentElement.getAttribute("data-theme")).toBe(t.id);
            expect(document.documentElement.getAttribute("data-sidebar")).toBe(s.id);
            expect(document.documentElement.getAttribute("data-font")).toBe(f.id);
            expect(document.documentElement.style.getPropertyValue("--on-primary")).toBeTruthy();
          });
        });
      });
    });
  });
});
