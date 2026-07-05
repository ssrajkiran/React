import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api";

/* Map route paths → page titles */
const PAGE_TITLES = {
  "/admin": "Dashboard",
  "/employee": "Dashboard",
  "/admin/leaves": "Attendance",
  "/employee/leaves": "Attendance",
  "/employee/report": "Attendance Report",
  "/tasks": "Tasks",
  "/tasks/report": "Task Report",
  "/admin/timesheet": "Timesheet",
  "/employee/timesheet": "Timesheet",
  "/admin/ai-summary": "AI Summary",
  "/admin/ai-summary/history": "Summary History",
  "/employee/userslist": "Users",
  "/holidays": "Holidays",
  "/profile": "My Profile",
};

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key));
  return match ? PAGE_TITLES[match] : "Voltech";
}

export default function Topbar({ onMenuClick, sidebarOpen }) {
  const [userName, setUserName] = useState("User");
  const [userInitials, setUserInitials] = useState("U");
  const [role, setRole] = useState("employee");
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

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const pageTitle = getPageTitle(pathname);

  return (
    <>
      <style>{`
        /* ── Topbar Shell ─────────────────────────────── */
        .app-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
          padding: 0 24px;
          background: #ffffff;
          border-bottom: 1px solid #e8ecf0;
          box-shadow: 0 1px 8px rgba(0,0,0,0.06);
          position: sticky;
          top: 0;
          z-index: 100;
          gap: 12px;
        }

        /* ── Left side ────────────────────────────────── */
        .topbar-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
          flex: 1;
        }

        .topbar-title-wrap {
          min-width: 0;
        }

        .topbar-title {
          font-size: 17px;
          font-weight: 700;
          color: #111827;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .topbar-subtitle {
          font-size: 11px;
          color: #9ca3af;
          font-weight: 400;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Hamburger Button ─────────────────────────── */
        .topbar-hamburger {
          display: none;            /* hidden on desktop */
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 10px;
          background: transparent;
          cursor: pointer;
          position: relative;
          align-items: center;
          justify-content: center;
          transition: background 0.18s ease;
          padding: 0;
        }

        .topbar-hamburger:hover {
          background: #f3f4f6;
        }

        .topbar-hamburger:active {
          background: #e5e7eb;
          transform: scale(0.95);
        }

        /* Custom three-line hamburger icon */
        .hamburger-icon {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          width: 20px;
          height: 20px;
        }

        .hamburger-icon span {
          display: block;
          height: 2px;
          border-radius: 2px;
          background: #374151;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          transform-origin: center;
        }

        .hamburger-icon span:nth-child(1) { width: 20px; }
        .hamburger-icon span:nth-child(2) { width: 14px; }
        .hamburger-icon span:nth-child(3) { width: 20px; }

        .topbar-hamburger:hover .hamburger-icon span:nth-child(2) {
          width: 20px;
        }

        /* Animated X state when open */
        .topbar-hamburger.is-open .hamburger-icon span:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .topbar-hamburger.is-open .hamburger-icon span:nth-child(2) {
          opacity: 0;
          width: 0;
        }
        .topbar-hamburger.is-open .hamburger-icon span:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }

        /* ── Right side actions ───────────────────────── */
        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        /* Icon buttons */
        .topbar-icon-btn {
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: #6b7280;
          font-size: 17px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: background 0.16s ease, color 0.16s ease;
        }

        .topbar-icon-btn:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .topbar-notif-badge {
          position: absolute;
          top: 7px;
          right: 7px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ef4444;
          border: 1.5px solid #fff;
        }

        /* ── Profile button ───────────────────────────── */
        .topbar-profile-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          height: 40px;
          padding: 0 10px 0 6px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #f9fafb;
          cursor: pointer;
          transition: background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
        }

        .topbar-profile-btn:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .topbar-profile-info {
          text-align: left;
          line-height: 1.2;
        }

        .topbar-profile-name {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .topbar-profile-role {
          font-size: 11px;
          color: #9ca3af;
        }

        .topbar-profile-chevron {
          font-size: 11px;
          color: #9ca3af;
          transition: transform 0.2s ease;
        }

        .topbar-profile-btn[aria-expanded="true"] .topbar-profile-chevron {
          transform: rotate(180deg);
        }

        /* Avatar */
        .ui-avatar.sm {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--primary, #6366f1), #8b5cf6);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          letter-spacing: 0.5px;
        }

        /* ── Dropdown ─────────────────────────────────── */
        .dropdown-menu {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.10);
          padding: 6px;
          min-width: 180px;
        }

        .dropdown-item {
          border-radius: 8px;
          font-size: 14px;
          padding: 9px 12px;
          display: flex;
          align-items: center;
          gap: 9px;
          transition: background 0.14s ease;
        }

        .dropdown-item:hover {
          background: #f3f4f6;
        }

        .dropdown-divider {
          margin: 4px 0;
          border-color: #f3f4f6;
        }

        /* ── TABLET  (768px – 1023px) ─────────────────── */
        @media (max-width: 1023px) {
          .app-topbar {
            padding: 0 16px;
            height: 60px;
          }

          .topbar-subtitle {
            display: none;          /* hide subtitle on tablet */
          }

          .topbar-title {
            font-size: 15px;
          }
        }

        /* ── MOBILE  (≤ 767px) ────────────────────────── */
        @media (max-width: 767px) {
          .app-topbar {
            padding: 0 14px;
            height: 56px;
          }

          /* Show hamburger */
          .topbar-hamburger {
            display: flex;
          }

          /* Hide search on small phones */
          .topbar-icon-btn[title="Search"] {
            display: none;
          }

          /* Collapse profile text, show avatar only */
          .topbar-profile-info,
          .topbar-profile-chevron {
            display: none;
          }

          .topbar-profile-btn {
            padding: 4px;
            border-radius: 10px;
            gap: 0;
          }
        }

        /* ── SMALL PHONE  (≤ 400px) ───────────────────── */
        @media (max-width: 400px) {
          .app-topbar {
            padding: 0 10px;
            gap: 6px;
          }

          .topbar-title {
            font-size: 14px;
          }

          .topbar-icon-btn[title="Notifications"] {
            width: 34px;
            height: 34px;
          }
        }
      `}</style>

      <header className="app-topbar">
        <div className="topbar-left">
          {/* Hamburger — visible only on mobile (<768px) */}
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

          {/* Page title */}
          <div className="topbar-title-wrap">
            <div className="topbar-title">{pageTitle}</div>
            <div className="topbar-subtitle">
              Voltech Attendance &amp; Timesheet Management System
            </div>
          </div>
        </div>

        <div className="topbar-actions">
          {/* Search */}
          <button className="topbar-icon-btn" title="Search">
            <i className="bi bi-search"></i>
          </button>

          {/* Notifications */}
          <button className="topbar-icon-btn" title="Notifications">
            <i className="bi bi-bell"></i>
            <span className="topbar-notif-badge"></span>
          </button>

          {/* Profile dropdown */}
          <div className="dropdown">
            <button
              className="topbar-profile-btn"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <div className="ui-avatar sm">{userInitials}</div>
              <div className="topbar-profile-info">
                <div className="topbar-profile-name">{userName}</div>
                <div className="topbar-profile-role">
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </div>
              </div>
              <i className="bi bi-chevron-down topbar-profile-chevron"></i>
            </button>

            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => navigate("/profile")}
                >
                  <i className="bi bi-person" style={{ color: "var(--primary, #6366f1)" }}></i>
                  Profile
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => navigate("/todo")}
                >
                  <i className="bi bi-check2-square" style={{ color: "#10B981" }}></i>
                  My Todo
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item text-danger" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right"></i>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>
    </>
  );
}
