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

  describe("Sidebar Module & Submodule Contrast Across All Colors (Accent/Themed Sidebar)", () => {
    // Preset gradient color stops used in App.css for [data-sidebar="themed"]
    const accentSidebarGradients = {
      teal: { top: "#042F2E", mid: "#0F766E", bottom: "#0D9488" },
      blue: { top: "#0C1A3D", mid: "#1D4ED8", bottom: "#2563EB" },
      indigo: { top: "#1E1B4B", mid: "#4338CA", bottom: "#4F46E5" },
      purple: { top: "#2E1065", mid: "#6D28D9", bottom: "#7C3AED" },
      rose: { top: "#4C0519", mid: "#BE123C", bottom: "#E11D48" },
      emerald: { top: "#022C22", mid: "#047857", bottom: "#059669" },
      orange: { top: "#431407", mid: "#C2410C", bottom: "#EA580C" },
    };

    Object.entries(accentSidebarGradients).forEach(([accentName, stops]) => {
      it(`accent "${accentName}" sidebar provides accessible white text for modules & submodules`, () => {
        // Module & Submodule text on dark accent gradients is crisp white (#FFFFFF)
        const contrastTop = contrastRatio("#FFFFFF", stops.top);
        const contrastMid = contrastRatio("#FFFFFF", stops.mid);
        const contrastBottom = contrastRatio("#FFFFFF", stops.bottom);

        // Top and mid stops where navigation items sit should have high contrast (>= 4.5:1)
        expect(contrastTop).toBeGreaterThanOrEqual(4.5);
        expect(contrastMid).toBeGreaterThanOrEqual(4.5);
        expect(isContrastAccessible("#FFFFFF", stops.top)).toBe(true);
        expect(isContrastAccessible("#FFFFFF", stops.mid)).toBe(true);
        // Bottom stop bold contrast
        expect(contrastBottom).toBeGreaterThanOrEqual(3.0);
      });
    });

    it("white accent sidebar provides > 9:1 contrast for modules and submodules", () => {
      const whiteSidebarBg = "#FFFFFF";
      const moduleTextColor = "#334155";
      const moduleOpenColor = "#0F172A";
      const submoduleColor = "#475569";
      const activeTextColor = "#FFFFFF";
      const activePillBg = "#0F172A";

      expect(contrastRatio(moduleTextColor, whiteSidebarBg)).toBeGreaterThan(9);
      expect(contrastRatio(moduleOpenColor, whiteSidebarBg)).toBeGreaterThan(14);
      expect(contrastRatio(submoduleColor, whiteSidebarBg)).toBeGreaterThan(7);
      expect(contrastRatio(activeTextColor, activePillBg)).toBeGreaterThan(14);
    });

    it("applyPrefs correctly flags data-accent-light for light accents and false for vibrant/dark", () => {
      // White accent
      applyPrefs({ theme: "light", sidebar: "themed", accent: "white" }, document);
      expect(document.documentElement.getAttribute("data-accent-light")).toBe("true");

      // Teal accent
      applyPrefs({ theme: "light", sidebar: "themed", accent: "teal" }, document);
      expect(document.documentElement.getAttribute("data-accent-light")).toBe("false");

      // Custom yellow accent (luminance > 0.65)
      applyPrefs({ theme: "light", sidebar: "themed", accent: "custom", accentColor: "#FFFF00" }, document);
      expect(document.documentElement.getAttribute("data-accent-light")).toBe("true");

      // Custom navy accent (luminance < 0.65)
      applyPrefs({ theme: "light", sidebar: "themed", accent: "custom", accentColor: "#0A192F" }, document);
      expect(document.documentElement.getAttribute("data-accent-light")).toBe("false");
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

  describe("Sidebar Bottom User Bar ('Santhoshkumar G' & 'Admin') Contrast & Legibility Across All Themes", () => {
    function blend(hexBg, hexOverlay, alpha) {
      const r1 = parseInt(hexBg.slice(1, 3), 16);
      const g1 = parseInt(hexBg.slice(3, 5), 16);
      const b1 = parseInt(hexBg.slice(5, 7), 16);

      const r2 = parseInt(hexOverlay.slice(1, 3), 16);
      const g2 = parseInt(hexOverlay.slice(3, 5), 16);
      const b2 = parseInt(hexOverlay.slice(5, 7), 16);

      const blendedR = Math.round((1 - alpha) * r1 + alpha * r2);
      const blendedG = Math.round((1 - alpha) * g1 + alpha * g2);
      const blendedB = Math.round((1 - alpha) * b1 + alpha * b2);

      const toHex = (n) => n.toString(16).padStart(2, '0');
      return '#' + toHex(blendedR) + toHex(blendedG) + toHex(blendedB);
    }

    const accentBottoms = {
      teal: '#0D9488',
      blue: '#2563EB',
      indigo: '#4F46E5',
      purple: '#7C3AED',
      rose: '#E11D48',
      emerald: '#059669',
      orange: '#EA580C',
    };

    Object.entries(accentBottoms).forEach(([accentName, hexBottom]) => {
      it(`accent "${accentName}" sidebar user card provides WCAG AA contrast for both name and role`, () => {
        // Card uses dark-frosted glass: rgba(15, 23, 42, 0.28) over accent bottom stop
        const cardBg = blend(hexBottom, '#0F172A', 0.28);
        
        // Name text is pure white #FFFFFF
        const nameContrast = contrastRatio('#FFFFFF', cardBg);
        expect(nameContrast).toBeGreaterThanOrEqual(4.5);
        expect(isContrastAccessible('#FFFFFF', cardBg)).toBe(true);

        // Role text is rgba(255, 255, 255, 0.90)
        const roleColor = blend(cardBg, '#FFFFFF', 0.90);
        const roleContrast = contrastRatio(roleColor, cardBg);
        expect(roleContrast).toBeGreaterThanOrEqual(4.5);
      });
    });

    it("white sidebar user card provides > 15:1 contrast for name and > 5.5:1 for role", () => {
      const cardBg = "#FFFFFF";
      const nameColor = "#0F172A";
      const roleColor = "#475569";
      const avatarBg = "#0F172A";
      const avatarText = "#FFFFFF";

      expect(contrastRatio(nameColor, cardBg)).toBeGreaterThan(15);
      expect(isContrastAccessible(nameColor, cardBg)).toBe(true);

      expect(contrastRatio(roleColor, cardBg)).toBeGreaterThan(5.5);
      expect(isContrastAccessible(roleColor, cardBg)).toBe(true);

      expect(contrastRatio(avatarText, avatarBg)).toBeGreaterThan(15);
    });

    it("dark theme / dark sidebar user card provides > 14:1 contrast for name and > 9:1 for role", () => {
      const cardBg = "#141B2D";
      const nameColor = "#FFFFFF";
      const roleColor = blend(cardBg, '#FFFFFF', 0.82);

      expect(contrastRatio(nameColor, cardBg)).toBeGreaterThan(14);
      expect(isContrastAccessible(nameColor, cardBg)).toBe(true);

      expect(contrastRatio(roleColor, cardBg)).toBeGreaterThan(9);
      expect(isContrastAccessible(roleColor, cardBg)).toBe(true);
    });
  });
});
