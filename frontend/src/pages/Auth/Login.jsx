import { useState, useEffect } from "react";
import api from "../../api";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

  .vt-root *, .vt-root *::before, .vt-root *::after { box-sizing: border-box; }

  .vt-root {
    display: flex;
    height: 100vh;
    max-height: 100vh;
    overflow: hidden;
    font-family: 'Poppins', sans-serif;
    background: #F0F2F9;
  }

  /* ═══ LEFT PANEL ═══ */
  .vt-left {
    flex: 0 0 52%;
    background: linear-gradient(160deg, #0C0B2E 0%, #161452 40%, #2D28A0 100%);
    display: flex;
    flex-direction: column;
    padding: 40px 60px;
    position: relative;
    overflow: visible;
  }

  .vt-left::before {
    content: '';
    position: absolute; inset: 0;
    background-image: radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 24px 24px;
    pointer-events: none;
  }

  .vt-orb {
    position: absolute; border-radius: 50%; pointer-events: none;
    filter: blur(60px);
  }
  .vt-orb-1 { width: 300px; height: 300px; background: rgba(99,102,241,0.2); top: -80px; right: -60px; animation: vt-pulse 7s ease-in-out infinite; }
  .vt-orb-2 { width: 220px; height: 220px; background: rgba(59,130,246,0.12); bottom: 10%; left: -50px; animation: vt-pulse 9s ease-in-out infinite reverse; }
  .vt-orb-3 { width: 160px; height: 160px; background: rgba(168,85,247,0.1); top: 45%; right: 20%; animation: vt-pulse 11s ease-in-out infinite; }

  @keyframes vt-pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.08); }
  }

  .vt-left-inner {
    flex: 1; display: flex; flex-direction: column;
    position: relative; z-index: 1;
  }

  .vt-brand {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 40px;
  }
  .vt-brand-name {
    font-size: 16px; font-weight: 700; color: #fff;
  }
  .vt-brand-tag {
    display: block;
    font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.3);
    letter-spacing: 0.1em; text-transform: uppercase;
    margin-top: 2px;
  }

  .vt-heading {
    font-size: 32px;
    font-weight: 700; color: #fff; line-height: 1.2;
    margin: 0 0 14px;
  }
  .vt-heading em {
    font-style: normal;
    background: linear-gradient(135deg, #818CF8 0%, #C4B5FD 50%, #93C5FD 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .vt-sub {
    font-size: 14px;
    color: rgba(255,255,255,0.38); line-height: 1.75;
    max-width: 360px; margin: 0;
    font-weight: 300;
  }

  /* ── Clock Illustration ── */
  .vt-illustration {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 36px 0;
    overflow: visible;
  }

  .vt-clock-wrap {
    position: relative;
    width: 240px;
    height: 240px;
    overflow: visible;
  }

  .vt-clock-ring {
    position: absolute; inset: 0;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.06);
    animation: vt-rotate 30s linear infinite;
  }
  .vt-clock-ring::before {
    content: '';
    position: absolute; top: -3px; left: 50%; transform: translateX(-50%);
    width: 6px; height: 6px; border-radius: 50%;
    background: #818CF8;
  }

  @keyframes vt-rotate { to { transform: rotate(360deg); } }

  .vt-clock-face {
    position: absolute; inset: 16px;
    border-radius: 50%;
    background: rgba(255,255,255,0.04);
    border: 1.5px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
  }

  .vt-clock-tick {
    position: absolute;
    width: 2px; height: 10px;
    background: rgba(255,255,255,0.2);
    border-radius: 2px;
    top: 10px; left: 50%; transform-origin: bottom center;
  }
  .vt-clock-tick.major { height: 14px; background: rgba(255,255,255,0.4); width: 2.5px; }

  .vt-clock-hand-hour {
    position: absolute;
    width: 3px; height: 35%;
    background: #fff; border-radius: 3px;
    bottom: 50%; left: 50%; transform-origin: bottom center;
    transform: translateX(-50%) rotate(-30deg);
  }
  .vt-clock-hand-min {
    position: absolute;
    width: 2px; height: 42%;
    background: rgba(255,255,255,0.7); border-radius: 2px;
    bottom: 50%; left: 50%; transform-origin: bottom center;
    transform: translateX(-50%) rotate(60deg);
  }
  .vt-clock-center {
    position: absolute;
    width: 10px; height: 10px; border-radius: 50%;
    background: #818CF8;
    box-shadow: 0 0 16px rgba(129,140,248,0.6);
    z-index: 2;
  }

  .vt-float-card {
    position: absolute;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    padding: 12px 16px;
    backdrop-filter: blur(12px);
    animation: vt-float-card 5s ease-in-out infinite;
  }
  .vt-float-card-1 { bottom: 4%; right: -55%; animation-delay: 0s; }
  .vt-float-card-2 { top: 2%; left: -56%; animation-delay: 1.5s; }

  @keyframes vt-float-card {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .vt-fc-row { display: flex; align-items: center; gap: 10px; }
  .vt-fc-icon {
    width: 32px; height: 32px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; flex-shrink: 0;
  }
  .vt-fc-icon-green { background: rgba(16,185,129,0.2); color: #6EE7B7; }
  .vt-fc-icon-blue { background: rgba(59,130,246,0.2); color: #93C5FD; }
  .vt-fc-label { font-size: 10.5px; color: rgba(255,255,255,0.4); font-weight: 500; }
  .vt-fc-value { font-size: 14px; color: #fff; font-weight: 600; margin-top: 2px; }

  .vt-left-foot {
    display: flex; align-items: center; gap: 16px;
    position: relative; z-index: 1;
    padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.05);
  }
  .vt-stat { display: flex; align-items: center; gap: 6px; }
  .vt-stat-dot { width: 6px; height: 6px; border-radius: 50%; }
  .vt-stat-dot.green { background: #10B981; box-shadow: 0 0 8px rgba(16,185,129,0.5); }
  .vt-stat-dot.blue { background: #3B82F6; box-shadow: 0 0 8px rgba(59,130,246,0.5); }
  .vt-stat-label { font-size: 11px; color: rgba(255,255,255,0.3); font-weight: 500; }

  /* ═══ RIGHT PANEL — Integrated White Area ═══ */
  .vt-right {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 40px 48px;
    position: relative;
    background: #ffffff;
  }

  .vt-login-wrap {
    width: 100%; max-width: 400px;
  }

  .vt-login-head {
    text-align: center;
    margin-bottom: 32px;
  }
  .vt-login-logo-img {
    display: block;
    margin: 0 auto 20px;
    width: 180px; height: 56px;
    object-fit: contain;
  }
  .vt-login-title {
    font-size: 24px; font-weight: 700;
    color: #0F1029; margin: 0 0 8px; line-height: 1.2;
  }
  .vt-login-sub {
    font-size: 14px; color: #8B92B3; margin: 0; font-weight: 400;
  }

  .vt-form {
    display: flex; flex-direction: column;
    gap: 20px;
  }
  .vt-field { display: flex; flex-direction: column; gap: 7px; }
  .vt-lrow { display: flex; justify-content: space-between; align-items: center; }
  .vt-label { font-size: 14px; font-weight: 600; color: #374151; }
  .vt-forgot {
    font-size: 12px; color: #4338CA; font-weight: 600;
    cursor: pointer; transition: color 0.15s;
  }
  .vt-forgot:hover { color: #3730A3; text-decoration: underline; }

  .vt-iw {
    display: flex; align-items: center;
    border: 1.5px solid #E2E4ED;
    border-radius: 10px;
    background: #F9FAFC;
    transition: all 0.2s ease;
    position: relative;
  }
  .vt-iw:focus-within {
    border-color: #4338CA;
    box-shadow: 0 0 0 3px rgba(67,56,202,0.08);
    background: #fff;
  }
  .vt-iw .vt-icon {
    font-size: 15px; color: #A8AECA;
    padding: 0 14px; flex-shrink: 0;
    transition: color 0.2s;
  }
  .vt-iw:focus-within .vt-icon { color: #4338CA; }
  .vt-iw input {
    flex: 1; border: none; outline: none;
    font-size: 14px; font-weight: 500; color: #0F1029;
    background: transparent;
    padding: 14px 14px 14px 0;
    font-family: 'Poppins', sans-serif; width: 100%;
  }
  .vt-iw input::placeholder { color: #C0C6D8; font-weight: 400; }

  .vt-eye {
    position: absolute; right: 12px;
    background: none; border: none; cursor: pointer;
    padding: 4px 6px; color: #A8AECA; font-size: 15px;
    display: flex; align-items: center;
    transition: color 0.15s;
  }
  .vt-eye:hover { color: #4338CA; }

  .vt-btn {
    width: 100%;
    padding: 14px 24px;
    background: linear-gradient(135deg, #3730A3 0%, #5048E5 100%);
    color: #fff; border: none; border-radius: 10px;
    font-size: 16px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    font-family: 'Poppins', sans-serif;
    box-shadow: 0 4px 16px rgba(55,48,163,0.3);
    transition: all 0.2s ease;
    margin-top: 4px;
    cursor: pointer;
  }
  .vt-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(55,48,163,0.38);
  }
  .vt-btn:active:not(:disabled) { transform: translateY(0); }
  .vt-btn:disabled { opacity: 0.7; cursor: not-allowed; }
  .vt-btn i { font-size: 16px; }

  .vt-div {
    display: flex; align-items: center; gap: 14px;
    margin: 24px 0 20px;
  }
  .vt-div-line { flex: 1; height: 1px; background: #E8EAF2; }
  .vt-div-txt {
    font-size: 12px; color: #B8BDD4; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.1em;
  }

  .vt-reg { text-align: center; font-size: 14px; color: #8B92B3; margin: 0; }
  .vt-reg a {
    color: #4338CA; font-weight: 600; text-decoration: none;
    transition: color 0.15s;
  }
  .vt-reg a:hover { color: #3730A3; text-decoration: underline; }

  .vt-foot {
    margin-top: 32px;
    font-size: 12px; color: #A8AECA; text-align: center;
  }

  /* ═══ RESPONSIVE ═══ */
  @media (max-width: 1200px) {
    .vt-left { flex: 0 0 48%; padding: 36px 52px; }
    .vt-heading { font-size: 28px; }
    .vt-clock-wrap { width: 220px; height: 220px; }
  }
  @media (max-width: 1024px) {
    .vt-left { flex: 0 0 45%; padding: 32px 40px; }
    .vt-heading { font-size: 24px; }
    .vt-clock-wrap { width: 200px; height: 200px; }
  }
  @media (max-width: 860px) {
    .vt-root { flex-direction: column; }
    .vt-left { flex: 0 0 auto; height: auto; padding: 28px 28px 24px; overflow: hidden; }
    .vt-brand { margin-bottom: 20px; }
    .vt-heading { font-size: 22px; margin-bottom: 10px; }
    .vt-sub { font-size: 13px; }
    .vt-illustration { margin: 16px 0; }
    .vt-clock-wrap { width: 160px; height: 160px; }
    .vt-float-card { display: none; }
    .vt-left-foot { display: none; }
    .vt-right { padding: 28px 24px 32px; }
    .vt-login-title { font-size: 20px; }
  }
  @media (max-width: 640px) {
    .vt-left { padding: 22px 18px 20px; }
    .vt-heading { font-size: 20px; }
    .vt-sub { font-size: 12.5px; }
    .vt-clock-wrap { width: 130px; height: 130px; }
    .vt-right { padding: 24px 16px 28px; }
    .vt-login-head { margin-bottom: 24px; }
    .vt-login-title { font-size: 18px; }
    .vt-form { gap: 16px; }
    .vt-btn { padding: 12px 20px; font-size: 15px; }
    .vt-foot { margin-top: 20px; font-size: 11px; }
  }
  @media (max-width: 380px) {
    .vt-left { padding: 18px 14px 16px; }
    .vt-heading { font-size: 18px; }
    .vt-clock-wrap { width: 110px; height: 110px; }
    .vt-right { padding: 20px 14px 24px; }
  }
`;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", r.data.token);
      if (r.data.permissions) {
        localStorage.setItem("permissions", JSON.stringify(r.data.permissions));
      }
      navigate(r.data.role === "admin" ? "/admin" : "/employee");
    } catch {
      alert("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const ticks = Array.from({ length: 12 }, (_, i) => i);

  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const hourDeg = hours * 30 + minutes * 0.5;
  const minDeg = minutes * 6 + seconds * 0.1;

  const fmtTime = (d) => {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  return (
    <>
      <style>{css}</style>
      <div className="vt-root">

        {/* LEFT */}
        <div className="vt-left">
          <div className="vt-orb vt-orb-1" />
          <div className="vt-orb vt-orb-2" />
          <div className="vt-orb vt-orb-3" />

          <div className="vt-left-inner">
            <div className="vt-brand">
              {/* <Logo size={38} /> */}
              <div>
                <span className="vt-brand-name">Voltech</span>
                <span className="vt-brand-tag">Attendance Platform</span>
              </div>
            </div>

            <h2 className="vt-heading">
              Track time,<br />
              <em>manage attendance.</em>
            </h2>
            <p className="vt-sub">
              Clock in, log hours, and stay on top of your team&apos;s
              schedule — all from a single dashboard.
            </p>

            <div className="vt-illustration">
              <div className="vt-clock-wrap">
                <div className="vt-clock-ring" />
                <div className="vt-clock-face">
                  {ticks.map((i) => (
                    <div
                      key={i}
                      className={`vt-clock-tick ${i % 3 === 0 ? "major" : ""}`}
                      style={{ transform: `translateX(-50%) rotate(${i * 30}deg)` }}
                    />
                  ))}
                  <div className="vt-clock-hand-hour" style={{ transform: `translateX(-50%) rotate(${hourDeg}deg)` }} />
                  <div className="vt-clock-hand-min" style={{ transform: `translateX(-50%) rotate(${minDeg}deg)` }} />
                  <div className="vt-clock-center" />
                </div>
                <div className="vt-float-card vt-float-card-1">
                  <div className="vt-fc-row">
                    <div className="vt-fc-icon vt-fc-icon-green">
                      <i className="bi bi-box-arrow-in-right" />
                    </div>
                    <div>
                      <div className="vt-fc-label">Time</div>
                      <div className="vt-fc-value">{fmtTime(now)}</div>
                    </div>
                  </div>
                </div>
                <div className="vt-float-card vt-float-card-2">
                  <div className="vt-fc-row">
                    <div className="vt-fc-icon vt-fc-icon-blue">
                      <i className="bi bi-clock-history" />
                    </div>
                    <div>
                      <div className="vt-fc-label">Hours Today</div>
                      <div className="vt-fc-value">8h 30m</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="vt-left-foot">
            <div className="vt-stat">
              <div className="vt-stat-dot green" />
              <span className="vt-stat-label">System Online</span>
            </div>
            <div className="vt-stat">
              <div className="vt-stat-dot blue" />
              <span className="vt-stat-label">v2.4.1</span>
            </div>
          </div>
        </div>

        {/* RIGHT — Integrated White Area (no card/panel) */}
        <div className="vt-right">
          <div className="vt-login-wrap">
            <div className="vt-login-head">
              <img src="/logo2.png" alt="Voltech Logo" className="vt-login-logo-img" />
              <h3 className="vt-login-title">Welcome back</h3>
              <p className="vt-login-sub">Sign in to your account to continue.</p>
            </div>

            <form onSubmit={login} className="vt-form">
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

              <div className="vt-field">
                <div className="vt-lrow">
                  <label className="vt-label">Password</label>
                  <span className="vt-forgot">Forgot password?</span>
                </div>
                <div className="vt-iw">
                  <i className="bi bi-lock vt-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: 42 }}
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

              <button type="submit" disabled={loading} className="vt-btn">
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" style={{ width: 15, height: 15 }} />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <i className="bi bi-arrow-right" />
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
              New employee? <Link to="/register">Create an account</Link>
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
