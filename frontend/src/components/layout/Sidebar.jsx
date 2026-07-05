import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Sidebar({ isOpen, onClose }) {
  const { pathname }          = useLocation();
  const [role, setRole]       = useState("employee");
  const [userName, setUserName]       = useState("User");
  const [userInitials, setUserInitials] = useState("U");
  const [openAttendance, setOpenAttendance] = useState(false);
  const [openTask, setOpenTask]             = useState(false);
  const [openTimesheet, setOpenTimesheet]   = useState(false);
  const [openSetup, setOpenSetup]           = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setRole(payload.role || "employee");
        if (payload.name) {
          setUserName(payload.name);
          const parts    = payload.name.trim().split(" ");
          const initials =
            parts.length >= 2
              ? parts[0][0] + parts[parts.length - 1][0]
              : parts[0].slice(0, 2);
          setUserInitials(initials.toUpperCase());
        }
      } catch (err) {
        console.error("Failed to decode token:", err);
      }
    }
  }, []);

  useEffect(() => {
    setOpenAttendance(
      pathname.includes("leaves") ||
        pathname.includes("report/attendance") ||
        pathname === "/employee/report"
    );
    setOpenTask(
      pathname.includes("/tasks") || pathname.includes("/tasks/report")
    );
    setOpenTimesheet(
      pathname.includes("/timesheet") ||
        pathname.includes("/timesheet/report") ||
        pathname.includes("/admin/ai-summary")
    );
    setOpenSetup(
      pathname.includes("/userslist") || pathname.includes("/holidays")
    );
  }, [pathname]);

  const isActive = (link, exact = false) =>
    exact ? pathname === link : pathname.startsWith(link);

  const dashPath = role === "admin" ? "/admin" : "/employee";

  // Close sidebar on nav — mobile only
  const handleNavClick = () => {
    if (window.innerWidth < 768) onClose?.();
  };

  return (
    <aside className={`app-sidebar ${isOpen ? "open" : ""}`}>

      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <i className="bi bi-layers-half"></i>
        </div>
        <div className="sidebar-brand-text">
          Voltech
          <span>Attendance &amp; Timesheet</span>
        </div>
        {/* Close button — mobile only via CSS */}
        <button
          className="sidebar-close-btn"
          aria-label="Close menu"
          onClick={onClose}
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      {/* Overview */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Overview</div>
        <Link
          to={dashPath}
          className={`menu-item ${isActive(dashPath, true) ? "active" : ""}`}
          onClick={handleNavClick}
        >
          <i className="bi bi-speedometer2 menu-icon"></i>
          Dashboard
        </Link>
      </div>

      {/* Management */}
      <div className="sidebar-section" style={{ marginTop: 8 }}>
        <div className="sidebar-section-label">Management</div>

        {/* Attendance */}
        <div
          className={`menu-item ${openAttendance ? "open" : ""}`}
          onClick={() => setOpenAttendance(!openAttendance)}
        >
          <i className="bi bi-calendar2-check menu-icon"></i>
          Attendance
          <i
            className="bi bi-chevron-right ms-auto"
            style={{
              fontSize: 11,
              opacity: 0.45,
              transition: "transform 0.2s",
              transform: openAttendance ? "rotate(90deg)" : "rotate(0deg)",
            }}
          ></i>
        </div>
        <div className={`submenu ${openAttendance ? "open" : ""}`}>
          <Link
            to={role === "admin" ? "/admin/leaves" : "/employee/leaves"}
            className={`submenu-item ${
              isActive(
                role === "admin" ? "/admin/leaves" : "/employee/leaves",
                true
              )
                ? "active"
                : ""
            }`}
            onClick={handleNavClick}
          >
            Attendance Form
          </Link>
          {role === "admin" && (
            <Link
              to="/employee/report"
              className={`submenu-item ${isActive("/employee/report", true) ? "active" : ""}`}
              onClick={handleNavClick}
            >
              Report
            </Link>
          )}
        </div>

        {/* Task */}
        <div
          className={`menu-item ${openTask ? "open" : ""}`}
          onClick={() => setOpenTask(!openTask)}
        >
          <i className="bi bi-list-task menu-icon"></i>
          Task
          <i
            className="bi bi-chevron-right ms-auto"
            style={{
              fontSize: 11,
              opacity: 0.45,
              transition: "transform 0.2s",
              transform: openTask ? "rotate(90deg)" : "rotate(0deg)",
            }}
          ></i>
        </div>
        <div className={`submenu ${openTask ? "open" : ""}`}>
          <Link
            to="/tasks"
            className={`submenu-item ${
              isActive("/tasks", true) && !isActive("/tasks/report")
                ? "active"
                : ""
            }`}
            onClick={handleNavClick}
          >
            Task Form
          </Link>
          {role === "admin" && (
            <Link
              to="/tasks/report"
              className={`submenu-item ${isActive("/tasks/report", true) ? "active" : ""}`}
              onClick={handleNavClick}
            >
              Report
            </Link>
          )}
        </div>

        {/* Timesheet */}
        <div
          className={`menu-item ${openTimesheet ? "open" : ""}`}
          onClick={() => setOpenTimesheet(!openTimesheet)}
        >
          <i className="bi bi-calendar3 menu-icon"></i>
          Timesheet
          <i
            className="bi bi-chevron-right ms-auto"
            style={{
              fontSize: 11,
              opacity: 0.45,
              transition: "transform 0.2s",
              transform: openTimesheet ? "rotate(90deg)" : "rotate(0deg)",
            }}
          ></i>
        </div>
        <div className={`submenu ${openTimesheet ? "open" : ""}`}>
          <Link
            to={role === "admin" ? "/admin/timesheet" : "/employee/timesheet"}
            className={`submenu-item ${
              isActive(
                role === "admin" ? "/admin/timesheet" : "/employee/timesheet",
                true
              )
                ? "active"
                : ""
            }`}
            onClick={handleNavClick}
          >
            Timesheet Form
          </Link>
          {role === "admin" && (
            <>
              <Link
                to="/admin/ai-summary"
                className={`submenu-item ${isActive("/admin/ai-summary", true) ? "active" : ""}`}
                onClick={handleNavClick}
              >
                Generate Summary
              </Link>
              <Link
                to="/admin/ai-summary/history"
                className={`submenu-item ${
                  isActive("/admin/ai-summary/history", true) ? "active" : ""
                }`}
                onClick={handleNavClick}
              >
                Summary History
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Admin Setup */}
      {role === "admin" && (
        <div className="sidebar-section" style={{ marginTop: 8 }}>
          <div className="sidebar-section-label">Admin</div>
          <div
            className={`menu-item ${openSetup ? "open" : ""}`}
            onClick={() => setOpenSetup(!openSetup)}
          >
            <i className="bi bi-gear menu-icon"></i>
            Setup
            <i
              className="bi bi-chevron-right ms-auto"
              style={{
                fontSize: 11,
                opacity: 0.45,
                transition: "transform 0.2s",
                transform: openSetup ? "rotate(90deg)" : "rotate(0deg)",
              }}
            ></i>
          </div>
          <div className={`submenu ${openSetup ? "open" : ""}`}>
            <Link
              to="/employee/userslist"
              className={`submenu-item ${isActive("/employee/userslist", true) ? "active" : ""}`}
              onClick={handleNavClick}
            >
              Users
            </Link>
            <Link
              to="/holidays"
              className={`submenu-item ${isActive("/holidays", true) ? "active" : ""}`}
              onClick={handleNavClick}
            >
              Holiday
            </Link>
          </div>
        </div>
      )}

      {/* Sidebar Footer — User Card */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="ui-avatar">{userInitials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{userName}</div>
            <div className="sidebar-user-role">
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </div>
          </div>
          <i
            className="bi bi-three-dots-vertical"
            style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}
          ></i>
        </div>
      </div>

    </aside>
  );
}
