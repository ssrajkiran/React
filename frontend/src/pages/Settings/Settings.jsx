import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import AppLayout from "../../components/layout/AppLayout";
import {
  usePreferences,
} from "../../context/PreferencesContext";
import {
  THEME_OPTIONS,
  SIDEBAR_OPTIONS,
  ACCENT_OPTIONS,
  FONT_OPTIONS,
  DEFAULT_PREFS,
  CUSTOM_ACCENT,
} from "../../utils/preferences";

const styles = `
.st-page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
.st-page-title{margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;color:var(--t-base)}
.st-breadcrumb{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--t-muted);margin-top:5px}
.st-breadcrumb a{color:var(--primary);text-decoration:none;font-weight:500}
.st-breadcrumb a:hover{text-decoration:underline}
.st-breadcrumb i{font-size:10px;opacity:.5}

.st-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-card);overflow:hidden;margin-bottom:20px}
.st-card-head{padding:14px 20px;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;gap:10px}
.st-card-head i{width:32px;height:32px;border-radius:8px;background:var(--primary-soft);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:15px}
.st-card-head h6{margin:0;font-size:14.5px;font-weight:700;color:var(--t-base)}
.st-card-head p{margin:1px 0 0;font-size:12px;color:var(--t-muted)}
.st-card-body{padding:20px}

.st-opt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.st-opt{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1.5px solid var(--border);border-radius:10px;background:var(--bg-card);cursor:pointer;font-family:var(--font);font-size:13.5px;font-weight:600;color:var(--t-base);transition:all .15s;text-align:left}
.st-opt:hover{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 8%,var(--bg-card));color:var(--t-base)}
.st-opt.is-active{border-color:var(--primary)!important;background:color-mix(in srgb,var(--primary) 12%,var(--bg-card))!important;color:var(--t-base)!important;font-weight:700!important;box-shadow:0 2px 8px color-mix(in srgb,var(--primary) 20%,transparent)}
.st-opt .st-check{margin-left:auto;font-size:14px;color:var(--primary);opacity:0;transition:opacity .15s}
.st-opt.is-active .st-check{opacity:1!important}
.st-opt i.st-opt-icon{font-size:16px;color:var(--t-muted);transition:color .15s}
.st-opt:hover i.st-opt-icon,.st-opt.is-active i.st-opt-icon{color:var(--primary)!important}

.st-swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}
.st-swatch{display:flex;align-items:center;gap:10px;padding:11px 13px;border:1.5px solid var(--border);border-radius:10px;background:var(--bg-card);cursor:pointer;font-family:var(--font);font-size:13px;font-weight:600;color:var(--t-base);transition:all .15s}
.st-swatch:hover{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 8%,var(--bg-card));color:var(--t-base)}
.st-swatch.is-active{border-color:var(--primary)!important;background:color-mix(in srgb,var(--primary) 12%,var(--bg-card))!important;color:var(--t-base)!important;font-weight:700!important;box-shadow:0 2px 8px color-mix(in srgb,var(--primary) 20%,transparent)}
.st-dot{width:18px;height:18px;border-radius:50%;flex-shrink:0;box-shadow:0 0 0 2px rgba(255,255,255,.7),0 1px 3px rgba(0,0,0,.2);border:1px solid rgba(0,0,0,.18)}
.st-swatch .st-check{margin-left:auto;opacity:0;color:var(--primary);transition:opacity .15s}
.st-swatch.is-active .st-check{opacity:1!important}
.st-swatch-custom{position:relative;overflow:hidden}
.st-swatch-custom input[type=color]{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:none;padding:0;z-index:1}
.st-swatch-custom .st-hex{font-size:11px;font-weight:600;color:var(--t-light);font-family:var(--font-mono)}

.st-preview{border:1px solid var(--border-soft);border-radius:12px;overflow:hidden}
.st-preview-bar{display:flex;align-items:center;gap:7px;padding:10px 14px;background:var(--bg-muted);border-bottom:1px solid var(--border-soft)}
.st-preview-bar span{width:9px;height:9px;border-radius:50%;background:var(--border)}
.st-preview-body{padding:18px;background:var(--bg-body)}
.st-preview-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 15px;border-radius:8px;background:var(--primary);color:var(--on-primary);font-size:13px;font-weight:600;border:none;font-family:var(--font)}
.st-preview-ghost{display:inline-flex;align-items:center;gap:7px;padding:8px 15px;border-radius:8px;background:var(--primary-soft);color:var(--t-base);font-size:13px;font-weight:600;border:1px solid var(--border);font-family:var(--font);margin-left:8px}
.st-preview-card{margin-top:14px;padding:14px;border:1px solid var(--border);border-radius:10px;background:var(--bg-card);display:flex;align-items:center;gap:12px}
.st-preview-avatar{width:36px;height:36px;border-radius:50%;background:var(--primary);color: var(--on-primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px}
.st-preview-card strong{display:block;font-size:13.5px;color:var(--t-base);font-family:var(--font)}
.st-preview-card small{font-size:12px;color:var(--t-muted);font-family:var(--font)}
.st-preview-type{margin-top:14px;font-size:13.5px;color:var(--t-base);line-height:1.6}

.st-actions{display:flex;justify-content:flex-end;gap:10px}
.st-reset{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--t-muted);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font);transition:all .15s}
.st-reset:hover{background:var(--danger-soft);border-color:var(--danger);color:var(--danger)}

@media(max-width:576px){
  .st-page-title{font-size:20px}
  .st-opt-grid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}
}
`;

export default function Settings() {
  const { theme, sidebar, accent, accentColor, font, isDark, setTheme, setSidebar, setAccent, setAccentColor, setFont, resetPrefs } =
    usePreferences();

  const handleReset = () => {
    resetPrefs();
    toast.info("Appearance reset to defaults.");
  };

  const activeFont =
    FONT_OPTIONS.find((f) => f.id === font)?.stack || FONT_OPTIONS[0].stack;
  const accentLabel =
    accent === CUSTOM_ACCENT
      ? "Custom"
      : ACCENT_OPTIONS.find((a) => a.id === accent)?.label || "Custom";

  return (
    <AppLayout>
      <style>{styles}</style>

      <div className="st-page-header">
        <div>
          <h5 className="st-page-title">Personalization</h5>
          <nav className="st-breadcrumb" aria-label="breadcrumb">
            <Link to="/admin">Home</Link>
            <i className="bi bi-chevron-right"></i>
            <span>Personalization</span>
          </nav>
        </div>
        <button className="st-reset" onClick={handleReset} title="Reset appearance to defaults">
          <i className="bi bi-arrow-counterclockwise"></i>
          Reset to defaults
        </button>
      </div>

      {/* ── Theme mode ── */}
      <section className="st-card">
        <div className="st-card-head">
          <i className={`bi ${isDark ? "bi-moon-stars" : "bi-sun"}`}></i>
          <div>
            <h6>Theme</h6>
            <p>Switch between light and dark appearance</p>
          </div>
        </div>
        <div className="st-card-body">
          <div className="st-opt-grid" role="radiogroup" aria-label="Theme mode">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`st-opt ${theme === opt.id ? "is-active" : ""}`}
                role="radio"
                aria-checked={theme === opt.id}
                onClick={() => setTheme(opt.id)}
              >
                <i className={`bi ${opt.icon} st-opt-icon`}></i>
                {opt.label}
                <i className="bi bi-check-circle-fill st-check"></i>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sidebar appearance ── */}
      <section className="st-card">
        <div className="st-card-head">
          <i className="bi bi-layout-sidebar"></i>
          <div>
            <h6>Sidebar appearance</h6>
            <p>
              {isDark
                ? "Dark theme applies full dark styling across the app and sidebar"
                : "Choose your sidebar background style independently of your accent color"}
            </p>
          </div>
        </div>
        <div className="st-card-body">
          <div className="st-opt-grid" role="radiogroup" aria-label="Sidebar appearance">
            {SIDEBAR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`st-opt ${sidebar === opt.id ? "is-active" : ""}`}
                role="radio"
                aria-checked={sidebar === opt.id}
                onClick={() => {
                  setSidebar(opt.id);
                  if (opt.id === "white" && isDark) {
                    setTheme("light");
                  }
                }}
              >
                <i className={`bi ${opt.icon} st-opt-icon`}></i>
                {opt.label}
                {opt.id === "white" && isDark ? " (Light mode)" : ""}
                <i className="bi bi-check-circle-fill st-check"></i>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Accent color ── */}
      <section className="st-card">
        <div className="st-card-head">
          <i className="bi bi-palette"></i>
          <div>
            <h6>Accent color</h6>
            <p>Pick the primary color used across buttons, animations, hover, and highlights</p>
          </div>
        </div>
        <div className="st-card-body">
          <div className="st-swatches" role="radiogroup" aria-label="Accent color">
            {ACCENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`st-swatch ${accent === opt.id ? "is-active" : ""}`}
                role="radio"
                aria-checked={accent === opt.id}
                title={`Apply ${opt.label} accent`}
                onClick={() => {
                  setAccent(opt.id);
                  if (opt.id === "white" && isDark) {
                    setTheme("light");
                  }
                }}
              >
                <span className="st-dot" style={{ background: opt.color }}></span>
                {opt.label}
                <i className="bi bi-check-circle-fill st-check"></i>
              </button>
            ))}
            <label
              className={`st-swatch st-swatch-custom ${accent === CUSTOM_ACCENT ? "is-active" : ""}`}
              role="radio"
              aria-checked={accent === CUSTOM_ACCENT}
              title={
                accent === CUSTOM_ACCENT
                  ? `Custom accent ${accentColor}`
                  : "Pick a custom accent color"
              }
              onClick={() => {
                if (accent !== CUSTOM_ACCENT) setAccentColor(accentColor);
              }}
            >
              <span
                className="st-dot"
                style={
                  accent === CUSTOM_ACCENT
                    ? { background: accentColor }
                    : {
                        background:
                          "conic-gradient(from 45deg, #EF4444, #F59E0B, #22C55E, #06B6D4, #3B82F6, #A855F7, #EF4444)",
                      }
                }
              ></span>
              Custom
              {accent === CUSTOM_ACCENT && <span className="st-hex">{accentColor}</span>}
              <i className="bi bi-check-circle-fill st-check"></i>
              <input
                type="color"
                value={accentColor.toLowerCase()}
                onChange={(e) => setAccentColor(e.target.value)}
                aria-label="Custom accent color"
                tabIndex={-1}
              />
            </label>
          </div>
        </div>
      </section>

      {/* ── Font ── */}
      <section className="st-card">
        <div className="st-card-head">
          <i className="bi bi-fonts"></i>
          <div>
            <h6>Font</h6>
            <p>Choose the typeface used throughout the application</p>
          </div>
        </div>
        <div className="st-card-body">
          <div className="st-opt-grid" role="radiogroup" aria-label="Font">
            {FONT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`st-opt ${font === opt.id ? "is-active" : ""}`}
                role="radio"
                aria-checked={font === opt.id}
                style={{ fontFamily: opt.stack }}
                onClick={() => setFont(opt.id)}
              >
                {opt.label}
                <i className="bi bi-check-circle-fill st-check"></i>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live preview ── */}
      <section className="st-card">
        <div className="st-card-head">
          <i className="bi bi-eye"></i>
          <div>
            <h6>Preview</h6>
            <p>Live preview of your current selection</p>
          </div>
        </div>
        <div className="st-card-body">
          <div className="st-preview" style={{ fontFamily: activeFont }}>
            <div className="st-preview-bar">
              <span></span><span></span><span></span>
            </div>
            <div className="st-preview-body">
              <div>
                <button className="st-preview-btn">
                  <i className="bi bi-check2"></i> Primary button
                </button>
                <button className="st-preview-ghost">
                  <i className="bi bi-pencil"></i> Secondary
                </button>
              </div>
              <div className="st-preview-card">
                <div className="st-preview-avatar">
                  VP
                </div>
                <div>
                  <strong>Voltech User</strong>
                  <small>Sample card · {theme === "dark" ? "Dark" : "Light"} mode ·{" "}
                    {sidebar ? sidebar.charAt(0).toUpperCase() + sidebar.slice(1) : "White"} sidebar ·{" "}
                    {accentLabel} accent</small>
                </div>
              </div>
              <p className="st-preview-type">
                The quick brown fox jumps over the lazy dog — 0123456789.
                Body text preview at 13.5px with muted caption below.
              </p>
            </div>
          </div>
          <div className="st-actions" style={{ marginTop: 16 }}>
            <span style={{ fontSize: 12, color: "var(--t-light)" }}>
              Changes apply instantly and are saved to this browser ({JSON.stringify(DEFAULT_PREFS).replace(/[{}"]/g, "").replace(/,/g, ", ")} defaults)
            </span>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
