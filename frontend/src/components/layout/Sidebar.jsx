import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Logo from "../Logo";

export default function Sidebar({ isOpen, onClose }) {
  const { pathname }          = useLocation();
  const [role, setRole]       = useState("employee");
  const [permissions, setPermissions] = useState({});
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
    // Load permissions from localStorage
    try {
      const stored = localStorage.getItem("permissions");
      if (stored) {
        const arr = JSON.parse(stored);
        const map = {};
        arr.forEach((p) => { map[p.menu_key] = p; });
        setPermissions(map);
      }
    } catch (err) {}
  }, []);

  const can = (menuKey) => {
    if (role === "admin") return true;
    return !!permissions[menuKey]?.can_view;
  };

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
      pathname.includes("/userslist") || pathname.includes("/holidays") || pathname.includes("/admin/config-manager")
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
        <div className="sidebar-logo-rect">
          <Logo size={26} />
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
          {can("attendance_report") && (
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
          {can("task_report") && (
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
          {can("ai_summary") && (
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
      {(can("users") || can("holidays") || can("roles")) && (
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
            {can("users") && (
              <Link
                to="/employee/userslist"
                className={`submenu-item ${isActive("/employee/userslist", true) ? "active" : ""}`}
                onClick={handleNavClick}
              >
                Users
              </Link>
            )}
            {can("holidays") && (
              <Link
                to="/holidays"
                className={`submenu-item ${isActive("/holidays", true) ? "active" : ""}`}
                onClick={handleNavClick}
              >
                Holiday
              </Link>
            )}
            {can("roles") && (
              <Link
                to="/admin/roles"
                className={`submenu-item ${isActive("/admin/roles", true) ? "active" : ""}`}
                onClick={handleNavClick}
              >
                Roles
              </Link>
            )}
            <Link
              to="/admin/config-manager"
              className={`submenu-item ${isActive("/admin/config-manager", true) ? "active" : ""}`}
              onClick={handleNavClick}
            >
              <i className="bi bi-grid-3x3-gap" style={{ marginRight: 6, fontSize: 13 }} />
              Config Manager
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
