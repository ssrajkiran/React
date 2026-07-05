import { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import api from "../api";
import { Link } from "react-router-dom";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("profile");

  const [user, setUser] = useState({ name: "", email: "" });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading]         = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [toast, setToast]             = useState(null);
  const [showPw, setShowPw]           = useState({ current: false, new: false, confirm: false });

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── fetch profile ── */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/auth/profile");
        setUser({ name: res.data?.name || "", email: res.data?.email || "" });
      } catch {
        showToast("Failed to load profile.", "error");
      }
    };
    fetchProfile();
  }, []);

  /* ── update profile ── */
  const handleSaveProfile = async () => {
    const name  = user.name.trim();
    const email = user.email.trim();
    if (!name || !email) { showToast("Name and email are required.", "error"); return; }
    setLoading(true);
    try {
      await api.put("/auth/profile", { name, email });
      showToast("Profile updated successfully!", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Error updating profile.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ── change password ── */
  const handleSavePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("All password fields are required.", "error"); return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.", "error"); return;
    }
    setPasswordLoading(true);
    try {
      await api.put("/auth/change-password", {
        currentPassword: currentPassword.trim(),
        newPassword:     newPassword.trim(),
      });
      showToast("Password updated successfully!", "success");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      showToast(err.response?.data?.message || "Error updating password.", "error");
    } finally {
      setPasswordLoading(false);
    }
  };

  const togglePw = (field) => setShowPw((p) => ({ ...p, [field]: !p[field] }));

  /* ── initials avatar ── */
  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* ── Toast ── */}
      {toast && (
        <div className={`sr-toast sr-toast-${toast.type}`}>
          <i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"}`} />
          {toast.msg}
          <button className="sr-toast-close" onClick={() => setToast(null)}>
            <i className="bi bi-x" />
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="sr-page-header">
        <div>
          <h5 className="sr-page-title">Profile</h5>
          <nav className="sr-breadcrumb">
            <Link to="/">Home</Link>
            <i className="bi bi-chevron-right" />
            <span>Profile</span>
          </nav>
        </div>
      </div>

      <div className="pf-layout">

        {/* ── Sidebar ── */}
        <aside className="pf-sidebar">

          {/* Avatar card */}
          <div className="pf-avatar-card">
            <div className="pf-avatar">{initials}</div>
            <p className="pf-avatar-name">{user.name || "—"}</p>
            <p className="pf-avatar-email">{user.email || "—"}</p>
          </div>

          {/* Nav */}
          <nav className="pf-nav">
            {[
              { key: "profile",  icon: "bi-person",      label: "My Profile"       },
              { key: "password", icon: "bi-shield-lock",  label: "Change Password"  },
            ].map((item) => (
              <button
                key={item.key}
                className={`pf-nav-btn ${activeTab === item.key ? "active" : ""}`}
                onClick={() => setActiveTab(item.key)}
              >
                <i className={`bi ${item.icon}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Content ── */}
        <div className="pf-content">

          {/* ─ Profile tab ─ */}
          {activeTab === "profile" && (
            <div className="cu-form-card">
              <div className="cu-form-heading">
                <div className="cu-form-icon">
                  <i className="bi bi-person" />
                </div>
                <div>
                  <p className="cu-form-title">My Profile</p>
                  <p className="cu-form-sub">Update your name and email address.</p>
                </div>
              </div>

              <div className="cu-divider" />

              <div className="cu-fields-grid">

                {/* Name */}
                <div className="cu-field-group">
                  <label className="sr-label">Full Name</label>
                  <div className="sr-input-wrap">
                    <i className="bi bi-person sr-input-icon" />
                    <input
                      className="sr-input cu-input"
                      type="text"
                      placeholder="e.g. John Doe"
                      value={user.name}
                      onChange={(e) => setUser((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="cu-field-group">
                  <label className="sr-label">Email Address</label>
                  <div className="sr-input-wrap">
                    <i className="bi bi-envelope sr-input-icon" />
                    <input
                      className="sr-input cu-input"
                      type="email"
                      placeholder="e.g. john@company.com"
                      value={user.email}
                      onChange={(e) => setUser((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                </div>

              </div>

              <div className="cu-divider" />

              <div className="cu-actions">
                <span />
                <button className="cu-save-btn" onClick={handleSaveProfile} disabled={loading}>
                  {loading
                    ? <><i className="bi bi-arrow-repeat sr-spin" /> Saving…</>
                    : <><i className="bi bi-check2-circle" /> Save Changes</>}
                </button>
              </div>
            </div>
          )}

          {/* ─ Password tab ─ */}
          {activeTab === "password" && (
            <div className="cu-form-card">
              <div className="cu-form-heading">
                <div className="cu-form-icon" style={{ background: "#FFF7ED", color: "#C2410C" }}>
                  <i className="bi bi-shield-lock" />
                </div>
                <div>
                  <p className="cu-form-title">Change Password</p>
                  <p className="cu-form-sub">Keep your account secure with a strong password.</p>
                </div>
              </div>

              <div className="cu-divider" />

              <div className="pf-pw-grid">

                {/* Current password */}
                <div className="cu-field-group pf-full">
                  <label className="sr-label">Current Password</label>
                  <div className="sr-input-wrap">
                    <i className="bi bi-lock sr-input-icon" />
                    <input
                      className="sr-input cu-input cu-input-password"
                      type={showPw.current ? "text" : "password"}
                      placeholder="Enter current password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))}
                    />
                    <button type="button" className="cu-pw-toggle" onClick={() => togglePw("current")} tabIndex={-1}>
                      <i className={`bi ${showPw.current ? "bi-eye-slash" : "bi-eye"}`} />
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div className="cu-field-group">
                  <label className="sr-label">New Password</label>
                  <div className="sr-input-wrap">
                    <i className="bi bi-lock-fill sr-input-icon" />
                    <input
                      className="sr-input cu-input cu-input-password"
                      type={showPw.new ? "text" : "password"}
                      placeholder="Enter new password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
                    />
                    <button type="button" className="cu-pw-toggle" onClick={() => togglePw("new")} tabIndex={-1}>
                      <i className={`bi ${showPw.new ? "bi-eye-slash" : "bi-eye"}`} />
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="cu-field-group">
                  <label className="sr-label">Confirm Password</label>
                  <div className="sr-input-wrap">
                    <i className="bi bi-lock-fill sr-input-icon" />
                    <input
                      className="sr-input cu-input cu-input-password"
                      type={showPw.confirm ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))}
                    />
                    <button type="button" className="cu-pw-toggle" onClick={() => togglePw("confirm")} tabIndex={-1}>
                      <i className={`bi ${showPw.confirm ? "bi-eye-slash" : "bi-eye"}`} />
                    </button>
                  </div>
                </div>

              </div>

              <div className="cu-divider" />

              <div className="cu-actions">
                <span />
                <button
                  className="cu-save-btn"
                  style={{ background: "#D97706" }}
                  onClick={handleSavePassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading
                    ? <><i className="bi bi-arrow-repeat sr-spin" /> Updating…</>
                    : <><i className="bi bi-shield-check" /> Update Password</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}

const styles = `
  /* ── Toast ── */
  .sr-toast {
    position:fixed;top:20px;right:20px;z-index:999;
    display:flex;align-items:center;gap:10px;
    padding:12px 16px;border-radius:var(--radius-lg);
    font-size:13px;font-weight:600;font-family:'Plus Jakarta Sans',sans-serif;
    box-shadow:0 8px 24px rgba(0,0,0,.12);animation:sr-fade-in .2s ease;
  }
  .sr-toast-success{background:#ECFDF5;color:#059669;border:1px solid #6ee7b7}
  .sr-toast-error  {background:#FEF2F2;color:#DC2626;border:1px solid #fca5a5}
  .sr-toast-close{margin-left:6px;background:none;border:none;cursor:pointer;color:inherit;font-size:15px;display:flex;align-items:center}

  /* ── Page header ── */
  .sr-page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
  .sr-page-title{font-size:15px;font-weight:700;color:var(--text-primary);margin:0 0 4px;letter-spacing:-0.01em}
  .sr-breadcrumb{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted)}
  .sr-breadcrumb a{color:var(--primary);text-decoration:none;font-weight:500}
  .sr-breadcrumb a:hover{text-decoration:underline}
  .sr-breadcrumb i{font-size:10px;opacity:.5}

  /* ── Shared inputs ── */
  .sr-label{font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em}
  .sr-input-wrap{position:relative;display:flex;align-items:center}
  .sr-input-icon{position:absolute;left:11px;color:var(--text-muted);font-size:13px;pointer-events:none;z-index:1}
  .sr-input{
    width:100%;padding:9px 12px 9px 34px;border:1px solid var(--border);border-radius:var(--radius);
    background:var(--surface);font-size:13px;color:var(--text-primary);
    font-family:'Plus Jakarta Sans',sans-serif;outline:none;
    transition:border-color .15s,box-shadow .15s;
  }
  .sr-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(80,72,229,.1)}
  .cu-input{display:block}
  .cu-input-password{padding-right:38px}
  .cu-pw-toggle{
    position:absolute;right:10px;background:none;border:none;
    cursor:pointer;color:var(--text-muted);font-size:14px;
    display:flex;align-items:center;padding:0;transition:color .15s;
  }
  .cu-pw-toggle:hover{color:var(--primary)}

  /* ── Form card ── */
  .cu-form-card{
    background:var(--surface);border:1px solid var(--border);
    border-radius:var(--radius-lg);box-shadow:var(--shadow);
    padding:24px 28px;
  }
  .cu-form-heading{display:flex;align-items:center;gap:14px;margin-bottom:20px}
  .cu-form-icon{
    width:44px;height:44px;border-radius:var(--radius);
    background:#EEF2FF;color:var(--primary);font-size:20px;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
  }
  .cu-form-title{font-size:14px;font-weight:700;color:var(--text-primary);margin:0 0 3px}
  .cu-form-sub  {font-size:12px;color:var(--text-muted);margin:0}
  .cu-divider{border:none;border-top:1px solid var(--border);margin:0 0 20px}
  .cu-fields-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 20px;margin-bottom:20px}
  .cu-field-group{display:flex;flex-direction:column;gap:6px}
  .cu-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .cu-save-btn{
    display:flex;align-items:center;gap:7px;padding:9px 22px;
    background:#059669;color:#fff;border:none;border-radius:var(--radius);
    font-size:13px;font-weight:600;cursor:pointer;
    transition:background .15s,transform .15s;font-family:'Plus Jakarta Sans',sans-serif;
  }
  .cu-save-btn:hover:not(:disabled){filter:brightness(.92);transform:translateY(-1px)}
  .cu-save-btn:disabled{opacity:.6;cursor:not-allowed}
  .sr-spin{animation:sr-spin .7s linear infinite;display:inline-block}

  /* ── Profile layout ── */
  .pf-layout{display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:start}
  @media(max-width:680px){.pf-layout{grid-template-columns:1fr}}

  /* ── Sidebar ── */
  .pf-sidebar{display:flex;flex-direction:column;gap:12px}

  .pf-avatar-card{
    background:var(--surface);border:1px solid var(--border);
    border-radius:var(--radius-lg);box-shadow:var(--shadow);
    padding:20px 16px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;
  }
  .pf-avatar{
    width:60px;height:60px;border-radius:50%;
    background:#EEF2FF;color:var(--primary);
    font-size:20px;font-weight:700;
    display:flex;align-items:center;justify-content:center;
    letter-spacing:.02em;flex-shrink:0;
  }
  .pf-avatar-name {font-size:13px;font-weight:700;color:var(--text-primary);margin:0}
  .pf-avatar-email{font-size:11.5px;color:var(--text-muted);margin:0;word-break:break-all}

  .pf-nav{
    background:var(--surface);border:1px solid var(--border);
    border-radius:var(--radius-lg);box-shadow:var(--shadow);
    padding:8px;display:flex;flex-direction:column;gap:3px;
  }
  .pf-nav-btn{
    display:flex;align-items:center;gap:10px;
    padding:9px 12px;border-radius:var(--radius);
    font-size:13px;font-weight:600;cursor:pointer;
    border:none;background:transparent;color:var(--text-secondary);
    transition:all .15s;font-family:'Plus Jakarta Sans',sans-serif;text-align:left;
  }
  .pf-nav-btn i{font-size:14px}
  .pf-nav-btn:hover{background:#F3F4F6;color:var(--text-primary)}
  .pf-nav-btn.active{background:#EEF2FF;color:var(--primary)}

  /* ── Password grid ── */
  .pf-pw-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 20px;margin-bottom:20px}
  .pf-full{grid-column:1/-1}
  @media(max-width:560px){
    .cu-fields-grid,.pf-pw-grid{grid-template-columns:1fr}
    .pf-full{grid-column:1}
  }

  @keyframes sr-spin   {to{transform:rotate(360deg)}}
  @keyframes sr-fade-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
`;
