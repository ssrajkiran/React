import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { PreferencesProvider, usePreferences } from "./PreferencesContext";
import {
  PREFS_KEY,
  THEME_KEY,
  DEFAULT_PREFS,
} from "../utils/preferences";

const wrapper = ({ children }) => <PreferencesProvider>{children}</PreferencesProvider>;

const renderPrefs = () => renderHook(() => usePreferences(), { wrapper });

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe("PreferencesContext", () => {
  it("throws when hook is used outside the provider", () => {
    expect(() => renderHook(() => usePreferences())).toThrow(
      /must be used within PreferencesProvider/
    );
  });

  it("starts with defaults", () => {
    const { result } = renderPrefs();
    expect(result.current.theme).toBe("light");
    expect(result.current.accent).toBe("teal");
    expect(result.current.font).toBe("poppins");
    expect(result.current.sidebar).toBe("white");
    expect(result.current.isDark).toBe(false);
  });

  it("setTheme updates theme, isDark, and shifts white sidebar to dark", () => {
    const { result } = renderPrefs();
    expect(result.current.sidebar).toBe("white");
    act(() => result.current.setTheme("dark"));
    expect(result.current.theme).toBe("dark");
    expect(result.current.sidebar).toBe("dark");
    expect(result.current.isDark).toBe(true);
    act(() => result.current.setTheme("light"));
    expect(result.current.theme).toBe("light");
    expect(result.current.sidebar).toBe("white");
  });

  it("toggleTheme flips light -> dark -> light and adapts sidebar", () => {
    const { result } = renderPrefs();
    expect(result.current.sidebar).toBe("white");
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");
    expect(result.current.sidebar).toBe("dark");
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
    expect(result.current.sidebar).toBe("white");
  });

  it("setAccent / setFont update independently", () => {
    const { result } = renderPrefs();
    act(() => result.current.setAccent("purple"));
    act(() => result.current.setFont("roboto"));
    expect(result.current).toMatchObject({ accent: "purple", font: "roboto" });
    expect(result.current.theme).toBe("light");
  });

  it("setSidebar updates sidebar appearance and sets data attribute", () => {
    const { result } = renderPrefs();
    expect(result.current.sidebar).toBe("white");
    act(() => result.current.setSidebar("dark"));
    expect(result.current.sidebar).toBe("dark");
    expect(document.documentElement.getAttribute("data-sidebar")).toBe("dark");
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY));
    expect(stored.sidebar).toBe("dark");
  });

  it("setAccentColor switches to the custom accent with the picked hex", () => {
    const { result } = renderPrefs();
    act(() => result.current.setAccentColor("#123456"));
    expect(result.current).toMatchObject({ accent: "custom", accentColor: "#123456" });
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY));
    expect(stored).toMatchObject({ accent: "custom", accentColor: "#123456" });
    // picked color is applied to <html> as inline vars
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#123456");
    act(() => result.current.resetPrefs());
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("");
  });

  it("persists changes to localStorage (both keys)", () => {
    const { result } = renderPrefs();
    act(() => {
      result.current.setTheme("dark");
      result.current.setAccent("orange");
    });
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY));
    expect(stored).toMatchObject({ theme: "dark", accent: "orange" });
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  });

  it("applies data attributes to <html>", () => {
    const { result } = renderPrefs();
    act(() => result.current.setTheme("dark"));
    act(() => result.current.setAccent("indigo"));
    act(() => result.current.setFont("nunito"));
    act(() => result.current.setSidebar("themed"));
    const root = document.documentElement;
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(root.getAttribute("data-accent")).toBe("indigo");
    expect(root.getAttribute("data-font")).toBe("nunito");
    expect(root.getAttribute("data-sidebar")).toBe("themed");
  });

  it("restores saved prefs on mount", () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ theme: "dark", accent: "rose", font: "inter" })
    );
    const { result } = renderPrefs();
    expect(result.current).toMatchObject({ theme: "dark", accent: "rose", font: "inter" });
    expect(result.current.isDark).toBe(true);
  });

  it("resetPrefs returns to defaults", () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ theme: "dark", accent: "blue", font: "roboto" })
    );
    const { result } = renderPrefs();
    act(() => result.current.resetPrefs());
    expect(result.current).toMatchObject(DEFAULT_PREFS);
    expect(result.current.isDark).toBe(false);
  });
});
