import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api";

const PAGE_TITLES = {
  "/admin": "Dashboard",
  "/employee": "Dashboard",
  "/admin/leave-dashboard": "Leave Dashboard",
  "/employee/leave-dashboard": "Leave Dashboard",
  "/admin/timesheet-dashboard": "Timesheet Dashboard",
  "/employee/timesheet-dashboard": "Timesheet Dashboard",
  "/admin/leaves": "Attendance",
  "/employee/leaves": "Attendance",
  "/employee/report": "Attendance Report",
  "/tasks": "Modules",
  "/tasks/report": "Module Report",
  "/admin/timesheet": "Timesheet",
  "/employee/timesheet": "Timesheet",
  "/admin/ai-summary": "AI Summary",
  "/admin/ai-summary/history": "Summary History",
  "/employee/userslist": "Users",
  "/holidays": "Holidays",
  "/admin/roles": "Roles",
  "/profile": "My Profile",
};

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key));
  return match ? PAGE_TITLES[match] : "Voltech";
}

const AVATAR_COLORS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Topbar({ onMenuClick, sidebarOpen }) {
  const [userName, setUserName] = useState("User");
  const [userInitials, setUserInitials] = useState("U");
  const [role, setRole] = useState("employee");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setRole(payload.role || "employee");
        } catch (_) {}
        const res = await api.get("/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res?.data?.name) {
          const name = res.data.name;
          setUserName(name);
          const parts = name.trim().split(" ");
          const initials =
            parts.length >= 2
              ? parts[0][0] + parts[parts.length - 1][0]
              : parts[0].slice(0, 2);
          setUserInitials(initials.toUpperCase());
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const pageTitle = getPageTitle(pathname);
  const avatarGradient = getAvatarColor(userName);

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button
          className={`topbar-hamburger${sidebarOpen ? " is-open" : ""}`}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          onClick={() => onMenuClick?.()}
        >
          <span className="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <div className="topbar-title-wrap">
          <div className="topbar-title">{pageTitle}</div>
          <div className="topbar-subtitle">
            Voltech Attendance &amp; Timesheet Management System
          </div>
        </div>
      </div>

      <div className="topbar-actions">
        <button className="topbar-icon-btn" title="Notifications">
          <i className="bi bi-bell"></i>
          <span className="topbar-notif-badge"></span>
        </button>

        <button
          className="topbar-icon-btn"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          onClick={toggleFullscreen}
        >
          <i className={`bi ${isFullscreen ? "bi-fullscreen-exit" : "bi-fullscreen"}`}></i>
        </button>

        <div className="topbar-divider"></div>

        <div className="dropdown">
          <button
            className="topbar-profile-btn"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <div
              className="ui-avatar sm topbar-avatar"
              style={{ background: avatarGradient }}
            >
              {userInitials}
            </div>
            <div className="topbar-profile-info">
              <div className="topbar-profile-name">{userName}</div>
              <div className="topbar-profile-role">
                <i className={`bi ${role === "admin" ? "bi-shield-lock" : "bi-person-badge"}`}></i>
                {" "}{role.charAt(0).toUpperCase() + role.slice(1)}
              </div>
            </div>
            <i className="bi bi-chevron-down topbar-profile-chevron"></i>
          </button>

          <ul className="dropdown-menu dropdown-menu-end topbar-dropdown">
            <li className="dropdown-header-item">
              <div className="dropdown-user-card">
                <div
                  className="ui-avatar topbar-avatar-lg"
                  style={{ background: avatarGradient }}
                >
                  {userInitials}
                </div>
                <div className="dropdown-user-info">
                  <div className="dropdown-user-name">{userName}</div>
                  <div className="dropdown-user-role">
                    <i className={`bi ${role === "admin" ? "bi-shield-lock" : "bi-person-badge"}`}></i>
                    {" "}{role.charAt(0).toUpperCase() + role.slice(1)}
                  </div>
                </div>
              </div>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button
                className="dropdown-item"
                onClick={() => navigate("/profile")}
              >
                <span className="dropdown-icon-wrap" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                  <i className="bi bi-person"></i>
                </span>
                My Profile
              </button>
            </li>
            <li>
              <button
                className="dropdown-item"
                onClick={() => navigate("/todo")}
              >
                <span className="dropdown-icon-wrap" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                  <i className="bi bi-check2-square"></i>
                </span>
                My Todo
              </button>
            </li>
            <li>
              <button className="dropdown-item">
                <span className="dropdown-icon-wrap" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
                  <i className="bi bi-gear"></i>
                </span>
                Settings
              </button>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button className="dropdown-item text-danger" onClick={handleLogout}>
                <span className="dropdown-icon-wrap" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                  <i className="bi bi-box-arrow-right"></i>
                </span>
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
