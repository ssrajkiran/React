import { useState, useEffect } from "react";
import api from "../../api";
import { Link, useNavigate } from "react-router-dom";
import SharedSelect from "../../components/SharedSelect";
import Logo from "../../components/Logo";

const STYLE_ID = "register-corporate-styles";
const injectStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; }
    html, body, #root { height: 100%; overflow: hidden; margin: 0; padding: 0; }

    .reg-root {
      display: flex;
      height: 100vh;
      overflow: hidden;
      font-family: 'Poppins', sans-serif;
      background: #F0F2F9;
    }

    /* ── Left panel ── */
    .reg-left {
      flex: 0 0 48%;
      background: linear-gradient(155deg, #0F0E2A 0%, #1A1660 48%, #3D35C2 100%);
      display: flex;
      flex-direction: column;
      padding: clamp(32px, 5vw, 64px) clamp(28px, 5vw, 56px);
      position: relative;
      overflow: hidden;
    }

    .reg-left::before {
      content: '';
      position: absolute; inset: 0;
      background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 24px 24px;
      pointer-events: none;
    }

    .reg-blob1 {
      position: absolute; width: 400px; height: 400px; border-radius: 50%;
      background: radial-gradient(circle, rgba(99,82,255,0.18) 0%, transparent 65%);
      top: -120px; right: -100px; pointer-events: none;
      animation: reg-float 8s ease-in-out infinite;
    }
    .reg-blob2 {
      position: absolute; width: 280px; height: 280px; border-radius: 50%;
      background: radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 65%);
      bottom: -30px; left: -60px; pointer-events: none;
      animation: reg-float 10s ease-in-out infinite reverse;
    }
    .reg-blob3 {
      position: absolute; width: 180px; height: 180px; border-radius: 50%;
      background: radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 65%);
      top: 45%; left: 25%; pointer-events: none;
      animation: reg-float 12s ease-in-out infinite;
    }

    @keyframes reg-float {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-20px) scale(1.02); }
    }

    .reg-left-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      z-index: 1;
    }

    /* Brand */
    .reg-brand {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: clamp(28px, 4vw, 48px);
    }
    .reg-brand-name {
      font-size: 16px; font-weight: 700; color: #fff;
    }
    .reg-brand-tag {
      display: block;
      font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.3);
      letter-spacing: 0.1em; text-transform: uppercase;
      margin-top: 2px;
    }

    /* Heading */
    .reg-left-heading {
      font-size: clamp(24px, 3.5vw, 34px);
      font-weight: 700; color: #fff; line-height: 1.2;
      margin: 0 0 clamp(14px, 2vw, 20px);
    }
    .reg-left-heading-accent {
      font-style: normal;
      background: linear-gradient(135deg, #818CF8 0%, #C4B5FD 50%, #93C5FD 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .reg-left-sub {
      font-size: clamp(13px, 1.2vw, 14px);
      color: rgba(255,255,255,0.38); line-height: 1.75;
      margin: 0 0 clamp(28px, 4vw, 44px);
      max-width: 360px; font-weight: 300;
    }

    /* Steps */
    .reg-steps {
      display: flex; flex-direction: column; gap: 14px;
    }
    .reg-step {
      display: flex; align-items: center; gap: 14px;
    }
    .reg-step-icon-wrap {
      width: 40px; height: 40px; border-radius: 11px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .reg-step-icon { font-size: 16px; color: #A5B4FC; }
    .reg-step-text { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.7); }

    /* Bottom */
    .reg-left-foot {
      display: flex; align-items: center; gap: 8px;
      position: relative; z-index: 1;
      margin-top: clamp(24px, 3.5vw, 40px);
      padding-top: clamp(18px, 3vw, 28px);
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .reg-left-foot-icon {
      width: 28px; height: 28px; border-radius: 8px;
      background: rgba(5,150,105,0.15);
      display: flex; align-items: center; justify-content: center;
    }
    .reg-left-foot-icon i { font-size: 12px; color: #6EE7B7; }
    .reg-left-foot span { font-size: 11.5px; color: rgba(255,255,255,0.3); font-weight: 500; }

    /* ── Right panel ── */
    .reg-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: clamp(28px, 4vw, 48px) clamp(20px, 4vw, 44px);
      overflow: hidden;
      position: relative;
      background: #ffffff;
    }

    /* ── Form Area (integrated, no card) ── */
    .reg-form-card {
      width: 100%;
      max-width: 420px;
      position: relative;
      z-index: 1;
    }

    /* Card header */
    .reg-form-header {
      text-align: center;
      margin-bottom: clamp(24px, 3vw, 32px);
    }
    .reg-form-logo {
      margin: 0 auto 20px;
      width: 56px; height: 56px;
      border-radius: 14px;
      background: linear-gradient(135deg, #EEF2FF, #E0E7FF);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 12px rgba(67,56,202,0.1);
    }
    .reg-form-logo img {
      width: 32px; height: 32px; object-fit: contain;
    }
    .reg-form-title {
      font-size: 24px; font-weight: 700;
      color: #0D1030; margin: 0 0 8px; line-height: 1.2;
    }
    .reg-form-subtitle { font-size: 14px; color: #828BAA; margin: 0; font-weight: 400; }

    /* Error */
    .reg-error-box {
      display: flex; align-items: center; gap: 8px;
      background: #FEF2F2; border: 1px solid #FECACA;
      border-radius: 10px; padding: 11px 16px;
      font-size: 12.5px; font-weight: 600;
      color: #DC2626; margin-bottom: 16px;
    }

    /* Form */
    .reg-form { display: flex; flex-direction: column; gap: clamp(16px, 1.8vw, 20px); }
    .reg-field-group { display: flex; flex-direction: column; gap: 7px; }
    .reg-label { font-size: 14px; font-weight: 600; color: #374151; }

    /* Input */
    .reg-input-wrap {
      display: flex; align-items: center;
      border: 1.5px solid #E2E4ED; border-radius: 10px;
      background: #F9FAFC; position: relative;
      transition: all 0.2s ease; height: 48px;
    }
    .reg-input-wrap:focus-within {
      border-color: #4338CA;
      box-shadow: 0 0 0 3px rgba(67,56,202,0.08);
      background: #fff;
    }
    .reg-input-icon { font-size: 14px; color: #A8AECA; padding: 0 14px; flex-shrink: 0; transition: color 0.2s; }
    .reg-input-wrap:focus-within .reg-input-icon { color: #4338CA; }
    .reg-input {
      flex: 1; border: none; outline: none;
      font-size: 14px; font-weight: 500; color: #0D1030;
      background: transparent; padding: 0 12px 0 0;
      font-family: 'Poppins', sans-serif;
      min-width: 0; height: 100%;
    }
    .reg-input::placeholder { color: #C0C6D8; font-weight: 400; }

    .reg-eye-btn {
      position: absolute; right: 12px;
      background: none; border: none; cursor: pointer;
      padding: 4px 6px; color: #A8AECA; font-size: 14px;
      display: flex; align-items: center;
      transition: color 0.15s;
    }
    .reg-eye-btn:hover { color: #4338CA; }

    /* Submit */
    .reg-submit-btn {
      width: 100%;
      padding: clamp(13px, 1.4vw, 14px) 24px;
      background: linear-gradient(135deg, #3730A3 0%, #5048E5 100%);
      color: #fff; border: none; border-radius: 10px;
      font-size: 16px; font-weight: 600;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      margin-top: 4px; font-family: 'Poppins', sans-serif;
      transition: all 0.2s ease;
      box-shadow: 0 4px 16px rgba(55,48,163,0.3);
    }
    .reg-submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(55,48,163,0.38);
    }
    .reg-submit-btn:active:not(:disabled) { transform: translateY(0); }
    .reg-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
    .reg-submit-btn i { font-size: 15px; }

    /* Divider */
    .reg-divider {
      display: flex; align-items: center; gap: 14px;
      margin: clamp(24px, 2.5vw, 28px) 0 clamp(18px, 2vw, 22px);
    }
    .reg-divider-line { flex: 1; height: 1px; background: #E8EAF2; }
    .reg-divider-text {
      font-size: 12px; color: #B8BDD4; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.1em;
    }

    /* Login link */
    .reg-login-text { text-align: center; font-size: 14px; color: #828BAA; margin: 0; }
    .reg-login-link { color: #4338CA; font-weight: 600; text-decoration: none; transition: color 0.15s; }
    .reg-login-link:hover { color: #3730A3; text-decoration: underline; }

    .reg-right-footer {
      margin-top: 32px; font-size: 12px; color: #A8AECA;
      text-align: center; font-weight: 400;
    }

    /* ── Responsive ── */
    @media (max-width: 960px) {
      .reg-root { flex-direction: column; height: auto; min-height: 100vh; overflow: auto; }
      .reg-left { flex: none; width: 100%; padding: 36px 28px 32px; }
      .reg-left-content { justify-content: flex-start; }
      .reg-steps { display: grid !important; grid-template-columns: 1fr 1fr; gap: 12px !important; }
      .reg-right { padding: 28px 20px 36px; }
      .reg-form-card { max-width: 100%; }
    }
    @media (max-width: 640px) {
      .reg-left { padding: 28px 20px 24px; }
      .reg-steps { grid-template-columns: 1fr !important; }
      .reg-right { padding: 24px 16px 32px; }
      .reg-left-foot { display: none; }
    }
    @media (max-width: 380px) {
      .reg-right { padding: 20px 14px 24px; }
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
        <div className="reg-blob1" />
        <div className="reg-blob2" />
        <div className="reg-blob3" />

        <div className="reg-left-content">
          <div className="reg-brand">
            <Logo size={38} />
            <div>
              <span className="reg-brand-name">Voltech</span>
              <span className="reg-brand-tag">Attendance Platform</span>
            </div>
          </div>

          <h2 className="reg-left-heading">
            Join your team<br />
            <span className="reg-left-heading-accent">and get started.</span>
          </h2>

          <p className="reg-left-sub">
            Create your account to access attendance tracking, timesheets,
            and task management — all in one place.
          </p>

          <div className="reg-steps">
            {steps.map((step, i) => (
              <div key={i} className="reg-step">
                <div className="reg-step-icon-wrap">
                  <i className={`bi ${step.icon} reg-step-icon`} />
                </div>
                <span className="reg-step-text">{step.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="reg-left-foot">
          <div className="reg-left-foot-icon">
            <i className="bi bi-shield-check" />
          </div>
          <span>Your data is safe with us</span>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="reg-right">
        <div className="reg-form-card">

          <div className="reg-form-header">
            <div className="reg-form-logo">
              <Logo size={28} />
            </div>
            <h3 className="reg-form-title">Create Account</h3>
            <p className="reg-form-subtitle">Fill in your details to register.</p>
          </div>

          {error && (
            <div className="reg-error-box">
              <i className="bi bi-exclamation-circle-fill" style={{ fontSize: 14, flexShrink: 0 }} />
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
                  className="reg-input" />
              </div>
            </div>

            <div className="reg-field-group">
              <label className="reg-label">Email address</label>
              <div className="reg-input-wrap">
                <i className="bi bi-envelope reg-input-icon" />
                <input type="email" placeholder="employee@company.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  className="reg-input" />
              </div>
            </div>

            <div className="reg-field-group">
              <label className="reg-label">Password</label>
              <div className="reg-input-wrap">
                <i className="bi bi-lock reg-input-icon" />
                <input type={showPassword ? "text" : "password"} placeholder="Enter a secure password"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="reg-input" style={{ paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="reg-eye-btn">
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
              </div>
            </div>

            <div className="reg-field-group">
              <label className="reg-label">Role</label>
              <SharedSelect
                value={role}
                onChange={(val) => setRole(val)}
                options={[
                  { value: "employee", label: "Employee" },
                  { value: "admin", label: "Admin" },
                ]}
                placeholder="Select role"
              />
            </div>

            <button type="submit" disabled={loading} className="reg-submit-btn">
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm"
                    style={{ width: 15, height: 15, marginRight: 8 }} />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <i className="bi bi-arrow-right" style={{ marginLeft: 8, fontSize: 15 }} />
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
