import { useState } from "react";
import api from "../../api";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [error, setError] = useState(""); // New state for backend errors

  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(""); // Reset error on submit

    try {
      const res = await api.post("/auth/register", { name, email, password, role });
      alert(res.data.message || "Registered Successfully");
      navigate("/");

    } catch (err) {
      console.error("Registration error:", err);

      // Show backend error message if available
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Registration failed");
      }
    }
  };

  return (
    <div className="container-fluid min-vh-100">
      <div className="row min-vh-100">

        {/* LEFT BRAND PANEL */}
        <div className="col-md-6 d-none d-md-flex flex-column align-items-center justify-content-center bg-primary text-white">
          <div className="text-center px-5">
            <h1 className="fw-bold mb-3">Attendance & Timesheet</h1>
            <p className="fs-5 opacity-75">
              Employee onboarding & workforce management.
            </p>
          </div>

          {/* Icon Cluster */}
          <div className="d-flex flex-wrap justify-content-center mt-4 gap-3">
            <div className="icon-circle">
              <i className="bi bi-people-fill text-white fs-2"></i>
            </div>
            <div className="icon-circle">
              <i className="bi bi-calendar2-check-fill text-white fs-2"></i>
            </div>
            <div className="icon-circle">
              <i className="bi bi-clock-fill text-white fs-2"></i>
            </div>
            <div className="icon-circle">
              <i className="bi bi-journal-check text-white fs-2"></i>
            </div>
          </div>
        </div>

        {/* RIGHT REGISTER PANEL */}
        <div className="col-md-6 d-flex align-items-center justify-content-center">
          <div className="card shadow border-0 rounded-4" style={{ width: 450 }}>
            <div className="card-body p-5">
              <h3 className="fw-bold mb-1">Create Account</h3>
              <p className="text-muted mb-4">Company Portal</p>

              {/* Show error message if exists */}
              {error && (
                <div className="alert alert-danger">{error}</div>
              )}

              <form onSubmit={submit}>
                {/* Name */}
                <div className="mb-3 position-relative">
                  <label className="form-label">Full Name</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <i className="bi bi-person-fill"></i>
                    </span>
                    <input
                      className="form-control"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="mb-3 position-relative">
                  <label className="form-label">Email</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <i className="bi bi-envelope-fill"></i>
                    </span>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="employee@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="mb-3 position-relative">
                  <label className="form-label">Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <i className="bi bi-lock-fill"></i>
                    </span>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="********"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Role */}
                <div className="mb-4 position-relative">
                  <label className="form-label">Role</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <i className="bi bi-person-badge-fill"></i>
                    </span>
                    <select
                      className="form-select"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <button className="btn btn-success w-100 py-2 fw-semibold">
                  Register
                </button>
              </form>

              <div className="text-center mt-4">
                <span className="text-muted">Already have account?</span>
                <Link to="/" className="ms-1 text-decoration-none fw-semibold">
                  Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for icon circles */}
      <style>{`
        .icon-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .icon-circle:hover {
          transform: translateY(-5px) scale(1.1);
          background-color: rgba(255,255,255,0.35);
        }
      `}</style>
    </div>
  );
}