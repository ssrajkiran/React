import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";
import { useNavigate, Link } from "react-router-dom";

export default function CreateUser() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", form);
      showToast(res.data.message || "User created successfully.", "success");
      setTimeout(() => navigate("/employee/userslist"), 1200);
    } catch (err) {
      console.error("Create user error:", err);
      const msg =
        err.response?.data?.message || "Failed to create user.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div className={`sr-toast sr-toast-${toast.type}`}>
          <i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"}`} />
          {toast.msg}
          <button className="sr-toast-close" onClick={() => setToast(null)}>
            <i className="bi bi-x" />
          </button>
        </div>
      )}

      {/* ── PAGE HEADER ── */}
      <div className="sr-page-header">
        <div>
          <h5 className="sr-page-title">Create User</h5>
          <nav className="sr-breadcrumb">
            <Link to="/">Home</Link>
            <i className="bi bi-chevron-right" />
            <span>Setup</span>
            <i className="bi bi-chevron-right" />
            <Link to="/employee/userslist">Users</Link>
            <i className="bi bi-chevron-right" />
            <span>Create</span>
          </nav>
        </div>
      </div>

      {/* ── FORM CARD ── */}
      <div className="cu-form-card">

        {/* Card heading */}
        <div className="cu-form-heading">
          <div className="cu-form-icon">
            <i className="bi bi-person-plus" />
          </div>
          <div>
            <p className="cu-form-title">New User Details</p>
            <p className="cu-form-sub">Fill in the information below to create a new account.</p>
          </div>
        </div>

        <div className="cu-divider" />

        <form onSubmit={handleSubmit} noValidate>
          <div className="cu-fields-grid">

            {/* Name */}
            <div className="cu-field-group">
              <label className="sr-label">Full Name</label>
              <div className="sr-input-wrap">
                <i className="bi bi-person sr-input-icon" />
                <input
                  className="sr-input cu-input"
                  type="text"
                  name="name"
                  placeholder="e.g. John Doe"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="cu-field-group">
              <label className="sr-label">Email Address</label>
              <div className="sr-input-wrap">
                <i className="bi bi-envelope sr-input-icon" />
                <input
                  className={`sr-input cu-input ${error ? "cu-input-error" : ""}`}
                  type="email"
                  name="email"
                  placeholder="e.g. john@company.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              {error && (
                <span className="cu-field-error">
                  <i className="bi bi-exclamation-circle" /> {error}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="cu-field-group">
              <label className="sr-label">Password</label>
              <div className="sr-input-wrap">
                <i className="bi bi-lock sr-input-icon" />
                <input
                  className="sr-input cu-input cu-input-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter a secure password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="cu-pw-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="cu-field-group">
              <label className="sr-label">Role</label>
              <div className="sr-input-wrap">
                <i className="bi bi-shield-check sr-input-icon" />
                <select
                  className="sr-input cu-input cu-select"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a role…</option>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                </select>
                <i className="bi bi-chevron-down cu-select-arrow" />
              </div>
            </div>

          </div>

          <div className="cu-divider" />

          {/* Actions */}
          <div className="cu-actions">
            <button
              type="button"
              className="cu-back-btn"
              onClick={() => navigate(-1)}
            >
              <i className="bi bi-arrow-left" /> Back
            </button>
            <button
              type="submit"
              className="cu-save-btn"
              disabled={loading}
            >
              {loading
                ? <><i className="bi bi-arrow-repeat sr-spin" /> Saving…</>
                : <><i className="bi bi-person-check" /> Save User</>}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

// ================= STYLES =================
const styles = `
  /* ── Toast ── */
  .sr-toast {
    position: fixed; top: 20px; right: 20px; z-index: 999;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: var(--radius-lg);
    font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12); animation: sr-fade-in 0.2s ease;
  }
  .sr-toast-success { background: #ECFDF5; color: #059669; border: 1px solid #6ee7b7; }
  .sr-toast-error   { background: #FEF2F2; color: #DC2626; border: 1px solid #fca5a5; }
  .sr-toast-close { margin-left: 6px; background: none; border: none; cursor: pointer; color: inherit; font-size: 15px; display: flex; align-items: center; }

  /* ── Page header ── */
  .sr-page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
  }
  .sr-page-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; letter-spacing: -0.01em; }
  .sr-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
  .sr-breadcrumb a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .sr-breadcrumb a:hover { text-decoration: underline; }
  .sr-breadcrumb i { font-size: 10px; opacity: 0.5; }

  /* ── Label ── */
  .sr-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }

  /* ── Input wrap ── */
  .sr-input-wrap { position: relative; display: flex; align-items: center; }
  .sr-input-icon { position: absolute; left: 11px; color: var(--text-muted); font-size: 13px; pointer-events: none; z-index: 1; }
  .sr-input {
    width: 100%; padding: 9px 12px 9px 34px; border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface); font-size: 13px; color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .sr-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }

  /* ── Form card ── */
  .cu-form-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    padding: 24px 28px;
  }

  /* ── Card heading ── */
  .cu-form-heading { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
  .cu-form-icon {
    width: 44px; height: 44px; border-radius: var(--radius);
    background: #EEF2FF; color: var(--primary); font-size: 20px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .cu-form-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0 0 3px; }
  .cu-form-sub   { font-size: 12px; color: var(--text-muted); margin: 0; }

  .cu-divider { border: none; border-top: 1px solid var(--border); margin: 0 0 20px; }

  /* ── Fields grid ── */
  .cu-fields-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 16px 20px; margin-bottom: 20px;
  }
  @media (max-width: 560px) { .cu-fields-grid { grid-template-columns: 1fr; } }

  .cu-field-group { display: flex; flex-direction: column; gap: 6px; }

  /* ── Input variants ── */
  .cu-input { display: block; }
  .cu-input-error { border-color: #EF4444 !important; box-shadow: 0 0 0 3px rgba(239,68,68,0.1) !important; }
  .cu-input-password { padding-right: 38px; }

  /* ── Password toggle ── */
  .cu-pw-toggle {
    position: absolute; right: 10px; background: none; border: none;
    cursor: pointer; color: var(--text-muted); font-size: 14px;
    display: flex; align-items: center; padding: 0;
    transition: color 0.15s;
  }
  .cu-pw-toggle:hover { color: var(--primary); }

  /* ── Select ── */
  .cu-select { appearance: none; padding-right: 34px; cursor: pointer; }
  .cu-select-arrow {
    position: absolute; right: 11px; color: var(--text-muted);
    font-size: 11px; pointer-events: none;
  }

  /* ── Field error ── */
  .cu-field-error {
    display: flex; align-items: center; gap: 5px;
    font-size: 11.5px; font-weight: 600; color: #DC2626;
  }
  .cu-field-error i { font-size: 11px; }

  /* ── Actions row ── */
  .cu-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

  .cu-back-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 9px 18px; background: var(--surface);
    border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 13px; font-weight: 600; color: var(--text-secondary);
    cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .cu-back-btn:hover { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }

  .cu-save-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 9px 22px; background: #059669; color: #fff;
    border: none; border-radius: var(--radius);
    font-size: 13px; font-weight: 600;
    cursor: pointer; transition: background 0.15s, transform 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .cu-save-btn:hover:not(:disabled) { background: #047857; transform: translateY(-1px); }
  .cu-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ── Spin ── */
  .sr-spin { animation: sr-spin 0.7s linear infinite; display: inline-block; }
  @keyframes sr-spin { to { transform: rotate(360deg); } }
  @keyframes sr-fade-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
`;
