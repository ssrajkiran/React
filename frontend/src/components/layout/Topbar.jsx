import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api"; // Axios instance

export default function Topbar() {
  const [userName, setUserName] = useState("User");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await api.get("/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res?.data?.name) setUserName(res.data.name);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <header
      className="app-topbar d-flex align-items-center px-4 position-relative"
      style={{
        height: "70px",
        background: "#fff",
        boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
        borderRadius: "10px",
        margin: "10px",
      }}
    >
      {/* Centered Title */}
      <strong
        className="position-absolute top-50 start-50 translate-middle text-dark"
        style={{ fontSize: "1.2rem", fontWeight: 600, letterSpacing: "0.5px" }}
      >
      Voltech Attendance & Timesheet Management System
      </strong>

      {/* Right-side dropdown */}
      <div className="dropdown ms-auto" > 
        <button
          className="btn d-flex align-items-center gap-2 border-0 bg-light px-3 py-1 rounded-3"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          style={{ transition: "all 0.2s", boxShadow: "0 2px 6px rgba(113, 156, 182, 0.1)" }}
        >
          <div
            className="profile-icon d-flex align-items-center gap-2"
         
          >
            <i className="bi bi-person-circle fs-4 text-primary"></i>
            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{userName}</span>
          </div>

          <i className="bi bi-chevron-down fs-5 text-muted"></i>
        </button>

        <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-3">
          <li>
            <button
              className="dropdown-item d-flex gap-2 align-items-center"
              onClick={() => navigate("/profile")}
              style={{ transition: "0.2s" }}
            >
              <i className="bi bi-person text-primary"></i> Profile
            </button>
          </li>
          <li>
            <button
              className="dropdown-item d-flex gap-2 align-items-center"
              style={{ transition: "0.2s" }}
            >
              <i className="bi bi-key text-success"></i> My Todo
            </button>
          </li>
          <li><hr className="dropdown-divider" /></li>
          <li>
            <button
              className="dropdown-item d-flex gap-2 align-items-center text-danger"
              onClick={handleLogout}
              style={{ transition: "0.2s" }}
            >
              <i className="bi bi-box-arrow-right"></i> Logout
            </button>
          </li>
        </ul>
      </div>
    </header>
  );
}
