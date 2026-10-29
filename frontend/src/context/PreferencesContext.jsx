import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { loadPrefs, savePrefs, applyPrefs, DEFAULT_PREFS, CUSTOM_ACCENT } from "../utils/preferences";

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [prefs, setPrefsState] = useState(() => loadPrefs());

  // apply to <html> + persist whenever prefs change (also on first mount)
  useEffect(() => {
    const clean = applyPrefs(prefs);
    savePrefs(clean);
  }, [prefs]);

  const setTheme = useCallback(
    (theme) =>
      setPrefsState((p) => {
        const nextSidebar =
          theme === "dark" && p.sidebar === "white"
            ? "dark"
            : theme === "light" && p.sidebar === "dark"
            ? "white"
            : p.sidebar;
        return { ...p, theme, sidebar: nextSidebar };
      }),
    []
  );
  const setSidebar = useCallback((sidebar) => setPrefsState((p) => ({ ...p, sidebar })), []);
  const setAccent = useCallback((accent) => setPrefsState((p) => ({ ...p, accent })), []);
  // Picking a custom hex switches the accent to "custom" and stores the color.
  const setAccentColor = useCallback(
    (accentColor) => setPrefsState((p) => ({ ...p, accent: CUSTOM_ACCENT, accentColor })),
    []
  );
  const setFont = useCallback((font) => setPrefsState((p) => ({ ...p, font })), []);
  const toggleTheme = useCallback(
    () =>
      setPrefsState((p) => {
        const nextTheme = p.theme === "light" ? "dark" : "light";
        const nextSidebar =
          nextTheme === "dark" && p.sidebar === "white"
            ? "dark"
            : nextTheme === "light" && p.sidebar === "dark"
            ? "white"
            : p.sidebar;
        return { ...p, theme: nextTheme, sidebar: nextSidebar };
      }),
    []
  );
  const resetPrefs = useCallback(() => setPrefsState({ ...DEFAULT_PREFS }), []);

  const value = {
    ...prefs,
    isDark: prefs.theme === "dark",
    setTheme,
    setSidebar,
    setAccent,
    setAccentColor,
    setFont,
    toggleTheme,
    resetPrefs,
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook must ship with its provider
export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}

export default PreferencesContext;
