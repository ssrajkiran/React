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

  const setTheme = useCallback((theme) => setPrefsState((p) => ({ ...p, theme })), []);
  const setAccent = useCallback((accent) => setPrefsState((p) => ({ ...p, accent })), []);
  // Picking a custom hex switches the accent to "custom" and stores the color.
  const setAccentColor = useCallback(
    (accentColor) => setPrefsState((p) => ({ ...p, accent: CUSTOM_ACCENT, accentColor })),
    []
  );
  const setFont = useCallback((font) => setPrefsState((p) => ({ ...p, font })), []);
  const toggleTheme = useCallback(
    () => setPrefsState((p) => ({ ...p, theme: p.theme === "light" ? "dark" : "light" })),
    []
  );
  const resetPrefs = useCallback(() => setPrefsState({ ...DEFAULT_PREFS }), []);

  const value = {
    ...prefs,
    isDark: prefs.theme === "dark",
    setTheme,
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
