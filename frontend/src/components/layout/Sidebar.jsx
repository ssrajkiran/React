import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Logo from "../Logo";
import api from "../../api";

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

    // Load permissions from localStorage first (fast)
    try {
      const stored = localStorage.getItem("permissions");
      if (stored) {
        const arr = JSON.parse(stored);
        const map = {};
        arr.forEach((p) => { map[p.menu_key] = p; });
        setPermissions(map);
      }
    } catch (err) {}

    // Then fetch fresh permissions from API (always, on every navigation)
    const fetchPermissions = async () => {
      try {
        const res = await api.get("/auth/permissions");
        if (Array.isArray(res.data)) {
          const map = {};
          res.data.forEach((p) => { map[p.menu_key] = p; });
          setPermissions(map);
          localStorage.setItem("permissions", JSON.stringify(res.data));
        }
      } catch (err) {
        console.error("Failed to fetch permissions:", err);
      }
    };
    fetchPermissions();
  }, [pathname]);

  const can = (menuKey) => {
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
      pathname.includes("/userslist") || pathname.includes("/holidays") || pathname.includes("/admin/roles")
    );
  }, [pathname]);

  const isActive = (link, exact = false) =>
    exact ? pathname === link : pathname.startsWith(link);

  const dashPath = role === "admin" ? "/admin" : "/employee";

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // Close sidebar on nav — mobile only
  const handleNavClick = () => {
    if (window.innerWidth < 768) onClose?.();
  };

  return (
    <aside className={`app-sidebar ${isOpen ? "open" : ""}`}>

      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo-circle">
          <Logo size={28} />
        </div>
        <div className="sidebar-brand-text">
          Voltech
          <span>Attendance & Timesheet</span>
        </div>
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
          className={`menu-item ${isActive(dashPath, true) && !pathname.includes("leave-dashboard") && !pathname.includes("timesheet-dashboard") ? "active" : ""}`}
          onClick={handleNavClick}
        >
          <i className="bi bi-speedometer2 menu-icon"></i>
          Dashboard
        </Link>
        {can("leave_dashboard") && (
          <Link
            to={role === "admin" ? "/admin/leave-dashboard" : "/employee/leave-dashboard"}
            className={`menu-item ${isActive(role === "admin" ? "/admin/leave-dashboard" : "/employee/leave-dashboard", true) ? "active" : ""}`}
            onClick={handleNavClick}
          >
            <i className="bi bi-calendar2-check menu-icon"></i>
            Leave Dashboard
          </Link>
        )}
        {can("timesheet_dashboard") && (
          <Link
            to={role === "admin" ? "/admin/timesheet-dashboard" : "/employee/timesheet-dashboard"}
            className={`menu-item ${isActive(role === "admin" ? "/admin/timesheet-dashboard" : "/employee/timesheet-dashboard", true) ? "active" : ""}`}
            onClick={handleNavClick}
          >
            <i className="bi bi-clock-history menu-icon"></i>
            Timesheet Dashboard
          </Link>
        )}
      </div>

      {/* Management */}
      <div className="sidebar-section" style={{ marginTop: 8 }}>
        <div className="sidebar-section-label">Management</div>

        {/* Attendance */}
        {can("attendance") && (
          <>
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
          </>
        )}

        {/* Module */}
        {can("task") && (
          <>
            <div
              className={`menu-item ${openTask ? "open" : ""}`}
              onClick={() => setOpenTask(!openTask)}
            >
              <i className="bi bi-list-task menu-icon"></i>
              Module
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
                Module List
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
          </>
        )}

        {/* Timesheet */}
        {can("timesheet") && (
          <>
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
                  <Link
                    to="/admin/ai-summary"
                    className={`submenu-item ${isActive("/admin/ai-summary", true) ? "active" : ""}`}
                    onClick={handleNavClick}
                  >
                    Generate Summary
                  </Link>
              )}
              {can("summary_history") && (
                <Link
                  to="/admin/ai-history"
                  className={`submenu-item ${isActive("/admin/ai-history", true) ? "active" : ""}`}
                  onClick={handleNavClick}
                >
                  Summary History
                </Link>
              )}
            </div>
          </>
        )}

        {/* Todo */}
        {can("todo") && (
          <Link
            to="/todo"
            className={`menu-item ${isActive("/todo", true) ? "active" : ""}`}
            onClick={handleNavClick}
          >
            <i className="bi bi-check2-square menu-icon"></i>
            Todo
          </Link>
        )}

        {/* Intercom */}
        <Link
          to="/intercom"
          className={`menu-item ${isActive("/intercom", true) ? "active" : ""}`}
          onClick={handleNavClick}
        >
          <i className="bi bi-telephone menu-icon"></i>
          Intercom List
        </Link>
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

          </div>
        </div>
      )}

      {/* Sidebar Footer — User Card */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="ui-avatar">{userInitials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{userName}</div>
            <div className="sidebar-user-role">{role.charAt(0).toUpperCase() + role.slice(1)}</div>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </div>

    </aside>
  );
}
