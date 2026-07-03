import { useState } from "react";
import api from "../../api";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();

    try {
      const r = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", r.data.token);
      navigate(r.data.role === "admin" ? "/admin" : "/employee");
    } catch {
      alert("Invalid Login");
    }
  };

  return (
    <div className="container-fluid min-vh-100">
      <div className="row min-vh-100">

        {/* LEFT PANEL */}
       <div className="col-md-6 d-none d-md-flex flex-column align-items-center justify-content-center bg-primary text-white">
  <div className="text-center px-5">
    <h1 className="fw-bold mb-3">Attendance & Timesheet</h1>
    <p className="fs-5 opacity-75">
      Track attendance, manage timesheets, and improve productivity.
    </p>
  </div>

  {/* Icon Cluster */}
  <div className="d-flex flex-wrap justify-content-center mt-4 gap-3">
    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        width: 80,
        height: 80,
        borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.2)",
      }}
    >
      <i className="bi bi-people-fill text-white fs-2"></i>
    </div>

    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        width: 80,
        height: 80,
        borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.2)",
      }}
    >
      <i className="bi bi-calendar2-check-fill text-white fs-2"></i>
    </div>

    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        width: 80,
        height: 80,
        borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.2)",
      }}
    >
      <i className="bi bi-clock-fill text-white fs-2"></i>
    </div>

    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        width: 80,
        height: 80,
        borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.2)",
      }}
    >
      <i className="bi bi-journal-check text-white fs-2"></i>
    </div>
  </div>

  {/* Optional Bottom Icon */}
  <div className="d-flex justify-content-center mt-4">
    <i
      className="bi bi-person-badge-fill fs-1 text-white opacity-50"
    ></i>
  </div>
</div>


        {/* RIGHT PANEL */}
        <div className="col-md-6 d-flex align-items-center justify-content-center">
          <div className="card shadow border-0 rounded-4" style={{ width: 380 }}>
            <div className="card-body p-5">
              <h3 className="fw-bold mb-1">Sign In</h3>
              <p className="text-muted mb-4">Voltech</p>

              <form onSubmit={login}>
                {/* Email Field */}
                <div className="mb-3 position-relative">
                  <label className="form-label">Email</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="bi bi-envelope-fill"></i>
                    </span>
                    <input
                      type="email"
                      className="form-control border-start-0"
                      placeholder="employee@company.com"
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="mb-4 position-relative">
                  <label className="form-label">Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="bi bi-lock-fill"></i>
                    </span>
                    <input
                      type="password"
                      className="form-control border-start-0"
                      placeholder="********"
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold"
                >
                  Login
                </button>
              </form>

              <div className="text-center mt-4">
                <span className="text-muted">New employee?</span>
                <Link
                  to="/register"
                  className="ms-1 text-decoration-none fw-semibold"
                >
                  Register
                </Link>
              </div>

              {/* Bottom Icon */}
            
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
