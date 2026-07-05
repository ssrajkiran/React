import { useState, useEffect } from "react";
import api from "../../api";
import { Link, useNavigate } from "react-router-dom";

/* ─── Inject responsive styles once ─────────────────────────────────── */
const STYLE_ID = "register-responsive-styles";
const injectStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; }

    html, body, #root {
      height: 100%;
      overflow: hidden;
      margin: 0;
      padding: 0;
    }

    .reg-root {
      display: flex;
      height: 100vh;
      overflow: hidden;
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #F3F4F9;
    }

    /* ── Left panel ── */
    .reg-left {
      flex: 0 0 46%;
      background: linear-gradient(145deg, #1E1B4B 0%, #3730A3 60%, #5048E5 100%);
      display: flex;
      flex-direction: column;
      padding: 44px 52px;
      position: relative;
      overflow: hidden;
    }

    .reg-left-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      z-index: 1;
    }

    .reg-brand-mark {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }

    .reg-brand-name {
      font-size: 13px;
      font-weight: 700;
      color: rgba(255,255,255,0.5);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 28px;
    }

    .reg-left-heading {
      font-size: 34px;
      font-weight: 700;
      color: #fff;
      line-height: 1.2;
      margin: 0 0 16px;
    }

    .reg-left-heading-accent { color: #A5B4FC; }

    .reg-left-sub {
      font-size: 14.5px;
      color: rgba(255,255,255,0.55);
      line-height: 1.7;
      margin: 0 0 32px;
      max-width: 340px;
    }

    .reg-steps-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .reg-step-item {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .reg-step-icon-wrap {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .reg-step-icon { font-size: 16px; color: #A5B4FC; }
    .reg-step-text { font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.75); }

    .reg-left-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
      z-index: 1;
    }

    .reg-left-footer-text { font-size: 12px; color: rgba(255,255,255,0.35); font-weight: 500; }

    /* ── Right panel ── */
    .reg-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 28px;
      overflow: hidden;
    }

    .reg-form-card {
      width: 100%;
      max-width: 460px;
      background: #fff;
      border-radius: 18px;
      padding: 36px 38px;
      border: 1px solid #E5E7EB;
      box-shadow: 0 6px 30px rgba(0,0,0,0.08);
    }

    .reg-form-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 24px;
    }

    .reg-form-icon-wrap {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      background: #EEF2FF;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .reg-form-title  { font-size: 18px; font-weight: 700; color: #111827; margin: 0; line-height: 1.2; }
    .reg-form-subtitle { font-size: 13px; color: #6B7280; margin: 3px 0 0; }

    .reg-error-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12.5px;
      font-weight: 500;
      color: #DC2626;
      margin-bottom: 16px;
    }

    .reg-form { display: flex; flex-direction: column; gap: 14px; }

    .reg-field-group { display: flex; flex-direction: column; gap: 5px; }

    .reg-label { font-size: 12.5px; font-weight: 600; color: #374151; }

    .reg-input-wrap {
      display: flex;
      align-items: center;
      border: 1.5px solid #E5E7EB;
      border-radius: 9px;
      background: #fff;
      position: relative;
      transition: border-color 0.15s, box-shadow 0.15s;
      height: 46px;
    }

    .reg-input-icon { font-size: 14px; color: #9CA3AF; padding: 0 12px; flex-shrink: 0; }

    .reg-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 13px;
      font-weight: 500;
      color: #111827;
      background: transparent;
      padding: 0 10px 0 0;
      font-family: inherit;
      min-width: 0;
      height: 100%;
    }

    .reg-input::placeholder { color: #D1D5DB; font-weight: 400; }

    .reg-select {
      flex: 1;
      border: none;
      outline: none;
      font-size: 13px;
      font-weight: 500;
      color: #111827;
      background: transparent;
      padding: 0 36px 0 0;
      font-family: inherit;
      appearance: none;
      cursor: pointer;
      min-width: 0;
      height: 100%;
    }

    .reg-select-chevron {
      position: absolute;
      right: 12px;
      font-size: 11px;
      color: #9CA3AF;
      pointer-events: none;
    }

    .reg-eye-btn {
      position: absolute;
      right: 10px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 6px;
      color: #9CA3AF;
      font-size: 14px;
      display: flex;
      align-items: center;
    }

    .reg-submit-btn {
      width: 100%;
      padding: 13px 18px;
      background: #5048E5;
      color: #fff;
      border: none;
      border-radius: 9px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 4px;
      font-family: inherit;
      transition: background 0.15s, transform 0.1s;
      letter-spacing: 0.02em;
    }

    .reg-submit-btn:hover:not(:disabled) { background: #4338CA; transform: translateY(-1px); }
    .reg-submit-btn:active:not(:disabled) { transform: translateY(0); }
    .reg-submit-btn:disabled { opacity: 0.75; cursor: not-allowed; }

    .reg-divider { display: flex; align-items: center; gap: 12px; margin: 18px 0 14px; }
    .reg-divider-line { flex: 1; height: 1px; background: #E5E7EB; }
    .reg-divider-text { font-size: 12px; color: #9CA3AF; font-weight: 500; }

    .reg-login-text  { text-align: center; font-size: 13px; color: #6B7280; margin: 0; }
    .reg-login-link  { color: #5048E5; font-weight: 600; text-decoration: none; }
    .reg-login-link:hover { text-decoration: underline; }

    .reg-right-footer { margin-top: 16px; font-size: 11.5px; color: #9CA3AF; text-align: center; }

    /* ── Tablet landscape: ≤ 1024px ── */
    @media (max-width: 1024px) {
      .reg-left { flex: 0 0 44%; padding: 36px 40px; }
      .reg-left-heading { font-size: 28px; }
    }

    /* ── Tablet portrait: ≤ 768px → stack, re-enable scroll ── */
    @media (max-width: 768px) {
      html, body, #root { overflow: auto; height: auto; }

      .reg-root { flex-direction: column; height: auto; min-height: 100vh; overflow: auto; }

      .reg-left { flex: none; width: 100%; padding: 28px 24px 32px; }
      .reg-left-content { justify-content: flex-start; }
      .reg-left-heading { font-size: 26px; margin-bottom: 10px; }
      .reg-left-sub { font-size: 13.5px; margin-bottom: 20px; }

      .reg-steps-list { display: grid !important; grid-template-columns: 1fr 1fr; gap: 12px !important; }

      .reg-right { padding: 24px 18px 32px; overflow: auto; }
      .reg-form-card { padding: 28px 24px; max-width: 100%; }
    }

    /* ── Mobile: ≤ 480px ── */
    @media (max-width: 480px) {
      .reg-left { padding: 22px 18px 26px; }
      .reg-left-heading { font-size: 22px; }
      .reg-left-sub { font-size: 13px; }
      .reg-steps-list { grid-template-columns: 1fr !important; }
      .reg-form-card { padding: 22px 18px; }
      .reg-form-title { font-size: 16px; }
      .reg-input-wrap { height: 44px; }
      .reg-submit-btn { padding: 12px 16px; font-size: 13.5px; }
    }
  `;
  document.head.appendChild(el);
};

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { injectStyles(); }, []);

  const focusInput = (e) => {
    e.target.parentNode.style.borderColor = "#5048E5";
    e.target.parentNode.style.boxShadow = "0 0 0 3px rgba(80,72,229,0.12)";
  };
  const blurInput = (e) => {
    e.target.parentNode.style.borderColor = "#E5E7EB";
    e.target.parentNode.style.boxShadow = "none";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { name, email, password, role });
      alert(res.data.message || "Registered Successfully");
      navigate("/");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { icon: "bi-person-plus-fill",    text: "Create your account" },
    { icon: "bi-shield-check",         text: "Admin approves access" },
    { icon: "bi-calendar2-check-fill", text: "Start tracking attendance" },
    { icon: "bi-graph-up-arrow",       text: "View reports & summaries" },
  ];

  return (
    <div className="reg-root">

      {/* ── LEFT PANEL ── */}
      <div className="reg-left">
        <div style={dc1} /><div style={dc2} /><div style={dc3} />

        <div className="reg-left-content">
          <div className="reg-brand-mark">
            <i className="bi bi-layers-half" style={{ fontSize: 22, color: "#fff" }} />
          </div>
          <div className="reg-brand-name">Voltech</div>

          <h2 className="reg-left-heading">
            Join your team<br />
            <span className="reg-left-heading-accent">and get started.</span>
          </h2>

          <p className="reg-left-sub">
            Create your account to access attendance tracking, timesheets,
            and task management — all in one place.
          </p>

          <div className="reg-steps-list">
            {steps.map((step, i) => (
              <div key={i} className="reg-step-item">
                <div className="reg-step-icon-wrap">
                  <i className={`bi ${step.icon} reg-step-icon`} />
                </div>
                <span className="reg-step-text">{step.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="reg-left-footer">
          <i className="bi bi-shield-check" style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }} />
          <span className="reg-left-footer-text">Your data is safe with us</span>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="reg-right">
        <div className="reg-form-card">

          <div className="reg-form-header">
            <div className="reg-form-icon-wrap">
              <i className="bi bi-person-plus-fill" style={{ fontSize: 20, color: "#5048E5" }} />
            </div>
            <div>
              <h3 className="reg-form-title">Create Account</h3>
              <p className="reg-form-subtitle">Fill in your details to register.</p>
            </div>
          </div>

          {error && (
            <div className="reg-error-box">
              <i className="bi bi-exclamation-circle-fill" style={{ fontSize: 13, flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={submit} className="reg-form">

            <div className="reg-field-group">
              <label className="reg-label">Full Name</label>
              <div className="reg-input-wrap">
                <i className="bi bi-person reg-input-icon" />
                <input type="text" placeholder="John Doe" value={name}
                  onChange={(e) => setName(e.target.value)} required
                  className="reg-input" onFocus={focusInput} onBlur={blurInput} />
              </div>
            </div>

            <div className="reg-field-group">
              <label className="reg-label">Email address</label>
              <div className="reg-input-wrap">
                <i className="bi bi-envelope reg-input-icon" />
                <input type="email" placeholder="employee@company.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  className="reg-input" onFocus={focusInput} onBlur={blurInput} />
              </div>
            </div>

            <div className="reg-field-group">
              <label className="reg-label">Password</label>
              <div className="reg-input-wrap">
                <i className="bi bi-lock reg-input-icon" />
                <input type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="reg-input" style={{ paddingRight: 36 }}
                  onFocus={focusInput} onBlur={blurInput} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="reg-eye-btn">
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
              </div>
            </div>

            <div className="reg-field-group">
              <label className="reg-label">Role</label>
              <div className="reg-input-wrap">
                <i className="bi bi-person-badge reg-input-icon" />
                <select value={role} onChange={(e) => setRole(e.target.value)}
                  className="reg-select" onFocus={focusInput} onBlur={blurInput}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
                <i className="bi bi-chevron-down reg-select-chevron" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="reg-submit-btn">
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm"
                    style={{ width: 14, height: 14, marginRight: 8 }} />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <i className="bi bi-arrow-right" style={{ marginLeft: 8, fontSize: 14 }} />
                </>
              )}
            </button>
          </form>

          <div className="reg-divider">
            <div className="reg-divider-line" />
            <span className="reg-divider-text">or</span>
            <div className="reg-divider-line" />
          </div>

          <p className="reg-login-text">
            Already have an account?{" "}
            <Link to="/" className="reg-login-link">Sign in</Link>
          </p>
        </div>

        <p className="reg-right-footer">
          &copy; {new Date().getFullYear()} Voltech. All rights reserved.
        </p>
      </div>
    </div>
  );
}

/* Decorative circles */
const dc1 = { position:"absolute", width:320, height:320, borderRadius:"50%", background:"rgba(255,255,255,0.04)", top:-80, right:-80, pointerEvents:"none" };
const dc2 = { position:"absolute", width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.04)", bottom:55, left:-55, pointerEvents:"none" };
const dc3 = { position:"absolute", width:110, height:110, borderRadius:"50%", background:"rgba(255,255,255,0.03)", top:"45%", right:18, pointerEvents:"none" };
