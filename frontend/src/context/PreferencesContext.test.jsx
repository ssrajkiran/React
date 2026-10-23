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
    expect(result.current.isDark).toBe(false);
  });

  it("setTheme updates theme and isDark", () => {
    const { result } = renderPrefs();
    act(() => result.current.setTheme("dark"));
    expect(result.current.theme).toBe("dark");
    expect(result.current.isDark).toBe(true);
  });

  it("toggleTheme flips light -> dark -> light", () => {
    const { result } = renderPrefs();
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
  });

  it("setAccent / setFont update independently", () => {
    const { result } = renderPrefs();
    act(() => result.current.setAccent("purple"));
    act(() => result.current.setFont("roboto"));
    expect(result.current).toMatchObject({ accent: "purple", font: "roboto" });
    expect(result.current.theme).toBe("light");
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
    const root = document.documentElement;
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(root.getAttribute("data-accent")).toBe("indigo");
    expect(root.getAttribute("data-font")).toBe("nunito");
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
