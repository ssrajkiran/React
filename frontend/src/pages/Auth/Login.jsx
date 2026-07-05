import { useState } from "react";
import api from "../../api";
import { Link, useNavigate } from "react-router-dom";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

  .vt-root *, .vt-root *::before, .vt-root *::after { box-sizing: border-box; }

  .vt-root {
    display: flex;
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    background: #ECEEF5;
  }

  /* ─── LEFT ─── */
  .vt-left {
    flex: 0 0 48%;
    background: linear-gradient(150deg, #0B0A24 0%, #1A1660 52%, #3D35C2 100%);
    display: flex;
    flex-direction: column;
    padding: clamp(32px, 5vw, 64px) clamp(28px, 5vw, 64px);
    position: relative;
    overflow: hidden;
  }
  .vt-left::before {
    content: '';
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 52px 52px;
    pointer-events: none;
  }
  .vt-blob1 {
    position: absolute; width: 420px; height: 420px; border-radius: 50%;
    background: radial-gradient(circle, rgba(99,82,255,0.22) 0%, transparent 68%);
    top: -110px; right: -110px; pointer-events: none;
  }
  .vt-blob2 {
    position: absolute; width: 280px; height: 280px; border-radius: 50%;
    background: radial-gradient(circle, rgba(96,165,250,0.14) 0%, transparent 68%);
    bottom: 20px; left: -80px; pointer-events: none;
  }

  .vt-left-inner {
    flex: 1; display: flex; flex-direction: column;
    justify-content: center; position: relative; z-index: 1;
  }
  .vt-brand {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: clamp(28px, 4vw, 48px);
  }
  .vt-brand-icon {
    width: 42px; height: 42px; border-radius: 11px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.18);
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; color: #C4B5FD; backdrop-filter: blur(6px);
  }
  .vt-brand-name {
 
    font-size: 15px; font-weight: 800; color: #fff; letter-spacing: 0.06em;
  }
  .vt-heading {
  
    font-size: clamp(22px, 3.2vw, 32px);
    font-weight: 700; color: #fff; line-height: 1.22;
    margin: 0 0 clamp(12px, 1.8vw, 18px);
  }
  .vt-heading em { font-style: normal; color: #A5B4FC; }
  .vt-sub {
    font-size: clamp(12px, 1.1vw, 14.5px);
    color: rgba(255,255,255,0.48); line-height: 1.78;
    max-width: 370px; margin: 0 0 clamp(28px, 4vw, 44px);
  }
  .vt-tiles {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: clamp(8px, 1.2vw, 13px);
  }
  .vt-tile {
    background: rgba(255,255,255,0.055);
    border: 1px solid rgba(255,255,255,0.09); border-radius: 12px;
    padding: clamp(11px, 1.3vw, 16px) clamp(12px, 1.3vw, 16px);
    display: flex; align-items: center; gap: 10px;
    transition: background 0.2s, border-color 0.2s;
  }
  .vt-tile:hover { background: rgba(255,255,255,0.1); border-color: rgba(165,180,252,0.28); }
  .vt-tile i { font-size: 14px; color: #A5B4FC; flex-shrink: 0; }
  .vt-tile span {
    font-size: clamp(11px, 0.95vw, 11.5px); font-weight: 600;
    color: rgba(255,255,255,0.75);
  }
  .vt-left-foot {
    display: flex; align-items: center; gap: 7px;
    position: relative; z-index: 1;
    margin-top: clamp(24px, 3.5vw, 40px);
  }
  .vt-left-foot span { font-size: 11px; color: rgba(255,255,255,0.32); font-weight: 500; }

  /* ─── RIGHT ─── */
  .vt-right {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: clamp(32px, 5vw, 64px) clamp(20px, 4vw, 48px);
  }
  .vt-card {
    width: 100%; max-width: 430px; background: #fff;
    border-radius: 20px;
    padding: clamp(28px, 4vw, 44px) clamp(24px, 4vw, 44px);
    border: 1px solid #DDE0EC;
    box-shadow: 0 10px 48px rgba(14,18,56,0.1), 0 2px 8px rgba(14,18,56,0.04);
  }
  .vt-card-head {
    display: flex; align-items: center; gap: 13px;
    margin-bottom: clamp(22px, 3vw, 32px);
  }
  .vt-head-icon {
    width: 46px; height: 46px; border-radius: 12px; background: #EDEEFF;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: #4338CA; flex-shrink: 0;
  }
  .vt-card-title {
  
    font-size: clamp(14px, 1.8vw, 21px); font-weight: 700;
    color: #0D1030; margin: 0; line-height: 1.2;
  }
  .vt-card-sub { font-size: 11px; color: #828BAA; margin: 3px 0 0; }

  .vt-form { display: flex; flex-direction: column; gap: clamp(14px, 1.8vw, 20px); }
  .vt-field { display: flex; flex-direction: column; gap: 6px; }
  .vt-lrow { display: flex; justify-content: space-between; align-items: center; }
  .vt-label { font-size: 13px; font-weight: 600; color: #2D3460; }
  .vt-forgot { font-size: 12px; color: #4338CA; font-weight: 500; cursor: pointer; }
  .vt-forgot:hover { text-decoration: underline; }

  .vt-iw {
    display: flex; align-items: center;
    border: 1.5px solid #E0E3EF; border-radius: 10px;
    background: #F8F9FD;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    position: relative;
  }
  .vt-iw:focus-within {
    border-color: #4338CA;
    box-shadow: 0 0 0 3px rgba(67,56,202,0.1);
    background: #fff;
  }
  .vt-iw .vt-icon { font-size: 12px; color: #A8AECA; padding: 0 12px; flex-shrink: 0; }
  .vt-iw input {
    flex: 1; border: none; outline: none;
    font-size: 12px; font-weight: 500; color: #0D1030;
    background: transparent;
    padding: clamp(9px, 1.1vw, 12px) 12px clamp(9px, 1.1vw, 12px) 0;
    font-family: 'DM Sans', sans-serif; width: 100%;
  }
  .vt-iw input::placeholder { color: #BFC6DC; font-weight: 400; }
  .vt-eye {
    position: absolute; right: 10px;
    background: none; border: none; cursor: pointer;
    padding: 4px 6px; color: #A8AECA; font-size: 12px;
    display: flex; align-items: center; transition: color 0.15s;
  }
  .vt-eye:hover { color: #4338CA; }

  .vt-btn {
    width: 100%;
    padding: clamp(10px, 1.3vw, 13px) 20px;
    background: linear-gradient(135deg, #3730A3 0%, #5048E5 100%);
    color: #fff; border: none; border-radius: 10px;
    font-size: 12px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-family: 'DM Sans', sans-serif; letter-spacing: 0.015em;
    box-shadow: 0 4px 18px rgba(55,48,163,0.38);
    transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s;
    margin-top: 4px;
  }
  .vt-btn:hover:not(:disabled) {
    opacity: 0.92; transform: translateY(-1px);
    box-shadow: 0 7px 22px rgba(55,48,163,0.44);
  }
  .vt-btn:active:not(:disabled) { transform: translateY(0); }
  .vt-btn:disabled { opacity: 0.7; cursor: not-allowed; }

  .vt-div {
    display: flex; align-items: center; gap: 12px;
    margin: clamp(18px, 2.5vw, 26px) 0 clamp(14px, 2vw, 20px);
  }
  .vt-div-line { flex: 1; height: 1px; background: #E8EAF2; }
  .vt-div-txt { font-size: 11px; color: #B8BDD4; font-weight: 500; }

  .vt-reg { text-align: center; font-size: 10px; color: #828BAA; margin: 0; }
  .vt-reg a { color: #4338CA; font-weight: 600; text-decoration: none; }
  .vt-reg a:hover { text-decoration: underline; }
  .vt-foot { margin-top: clamp(20px, 3vw, 30px); font-size: 10px; color: #A8AECA; text-align: center; }

  /* ─── RESPONSIVE ─── */
  @media (max-width: 900px) {
    .vt-root { flex-direction: column; }
    .vt-left { flex: 0 0 auto; }
    .vt-tiles { grid-template-columns: repeat(4, 1fr); }
    .vt-card { max-width: 100%; }
  }
  @media (max-width: 600px) {
    .vt-left { padding: 28px 20px; }
    .vt-tiles { grid-template-columns: 1fr 1fr; }
    .vt-right { padding: 28px 16px; }
    .vt-card { padding: 26px 20px; border-radius: 16px; }
  }
  @media (max-width: 360px) {
    .vt-card { padding: 22px 14px; }
    .vt-tile span { font-size: 10.5px; }
  }
`;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ── LOGIC UNTOUCHED ──
  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", r.data.token);
      navigate(r.data.role === "admin" ? "/admin" : "/employee");
    } catch {
      alert("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{css}</style>
      <div className="vt-root">

        {/* ── LEFT PANEL ── */}
        <div className="vt-left">
          <div className="vt-blob1" />
          <div className="vt-blob2" />

          <div className="vt-left-inner">
            <div className="vt-brand">
              <div className="vt-brand-icon">
                <i className="bi bi-layers-half" />
              </div>
              <span className="vt-brand-name">Voltech</span>
            </div>

            <h2 className="vt-heading">
              Manage attendances<br />
              <em>&amp; timesheets easily.</em>
            </h2>
            <p className="vt-sub">
              Everything your team needs — attendance tracking, timesheets,
              task management, and AI-powered summaries in one placesss.
            </p>

            <div className="vt-tiles">
              {[
                { icon: "bi-people-fill", label: "Team Management" },
                { icon: "bi-calendar2-check-fill", label: "Attendance" },
                { icon: "bi-clock-fill", label: "Timesheets" },
                { icon: "bi-journal-check", label: "Task Reports" },
              ].map((f) => (
                <div key={f.label} className="vt-tile">
                  <i className={`bi ${f.icon}`} />
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="vt-left-foot">
            <i className="bi bi-shield-check" style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }} />
            <span>Secure &amp; encrypted access</span>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="vt-right">
          <div className="vt-card">

            <div className="vt-card-head">
              <div className="vt-head-icon">
                <i className="bi bi-person-fill" />
              </div>
              <div>
                <h3 className="vt-card-title">Sign In</h3>
                <p className="vt-card-sub">Welcome back! Enter your credentials.</p>
              </div>
            </div>

            <form onSubmit={login} className="vt-form">

              {/* Email */}
              <div className="vt-field">
                <label className="vt-label">Email address</label>
                <div className="vt-iw">
                  <i className="bi bi-envelope vt-icon" />
                  <input
                    type="email"
                    placeholder="employee@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="vt-field">
                <div className="vt-lrow">
                  <label className="vt-label">Password</label>
                  <span className="vt-forgot">Forgot password?</span>
                </div>
                <div className="vt-iw">
                  <i className="bi bi-lock vt-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    className="vt-eye"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
                  </button>
                </div>
              </div>

              {/* Submit — logic props preserved exactly */}
              <button
                type="submit"
                disabled={loading}
                className="vt-btn"
                style={{ opacity: loading ? 0.75 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      style={{ width: 14, height: 14 }}
                    />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <i className="bi bi-arrow-right" style={{ fontSize: 14 }} />
                  </>
                )}
              </button>

            </form>

            <div className="vt-div">
              <div className="vt-div-line" />
              <span className="vt-div-txt">or</span>
              <div className="vt-div-line" />
            </div>

            <p className="vt-reg">
              New employee?{" "}
              <Link to="/register">Create an account</Link>
            </p>
          </div>

          <p className="vt-foot">
            &copy; {new Date().getFullYear()} Voltech. All rights reserved.
          </p>
        </div>

      </div>
    </>
  );
}
