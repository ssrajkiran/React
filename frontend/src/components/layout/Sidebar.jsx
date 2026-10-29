import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Logo from "../Logo";
import api from "../../api";

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
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
    } catch { /* ignore malformed stored permissions */ }

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
    // Revoke the session server-side; keepalive keeps the request alive
    // through the page navigation below.
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        keepalive: true,
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      }).catch(() => {});
    }
    localStorage.removeItem("token");
    localStorage.removeItem("permissions");
    window.location.href = "/";
  };

  // Close sidebar on nav — mobile only
  const handleNavClick = () => {
    if (window.innerWidth < 768) onClose?.();
  };

  // When collapsed, clicking a submenu parent expands the sidebar and opens it
  const handleSubmenuToggle = (setter, currentVal) => {
    if (isCollapsed) {
      onToggleCollapse?.();
      setter(true);
    } else {
      setter(!currentVal);
    }
  };

  return (
    <aside className={`app-sidebar ${isOpen ? "open" : ""} ${isCollapsed ? "is-collapsed" : ""}`}>

      {/* Top Section: Brand & Navigation */}
      <div className="sidebar-top-group">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-logo-circle" title="Voltech Core">
            <Logo size={24} />
          </div>
          {!isCollapsed && (
            <div className="sidebar-brand-text">
              Voltech
              <span>Attendance &amp; Timesheet</span>
            </div>
          )}
          <button
            className="sidebar-close-btn"
            aria-label="Close menu"
            onClick={onClose}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="sidebar-pill-divider" />

        {/* Overview */}
        <div className="sidebar-section">
          {!isCollapsed && <div className="sidebar-section-label">Overview</div>}
          <Link
            to={dashPath}
            title="Dashboard"
            className={`menu-item ${isActive(dashPath, true) && !pathname.includes("leave-dashboard") && !pathname.includes("timesheet-dashboard") ? "active" : ""}`}
            onClick={handleNavClick}
          >
            <i className="bi bi-speedometer2 menu-icon"></i>
            {!isCollapsed && <span>Dashboard</span>}
          </Link>
          {can("leave_dashboard") && (
            <Link
              to={role === "admin" ? "/admin/leave-dashboard" : "/employee/leave-dashboard"}
              title="Leave Dashboard"
              className={`menu-item ${isActive(role === "admin" ? "/admin/leave-dashboard" : "/employee/leave-dashboard", true) ? "active" : ""}`}
              onClick={handleNavClick}
            >
              <i className="bi bi-calendar2-check menu-icon"></i>
              {!isCollapsed && <span>Leave Dashboard</span>}
            </Link>
          )}
          {can("timesheet_dashboard") && (
            <Link
              to={role === "admin" ? "/admin/timesheet-dashboard" : "/employee/timesheet-dashboard"}
              title="Timesheet Dashboard"
              className={`menu-item ${isActive(role === "admin" ? "/admin/timesheet-dashboard" : "/employee/timesheet-dashboard", true) ? "active" : ""}`}
              onClick={handleNavClick}
            >
              <i className="bi bi-clock-history menu-icon"></i>
              {!isCollapsed && <span>Timesheet Dashboard</span>}
            </Link>
          )}
        </div>

        {/* Management */}
        <div className="sidebar-section" style={{ marginTop: 6 }}>
          {!isCollapsed ? (
            <div className="sidebar-section-label">Management</div>
          ) : (
            <div className="sidebar-pill-divider" />
          )}

          {/* Attendance */}
          {can("attendance") && (
            <>
              <div
                className={`menu-item ${openAttendance ? "open" : ""}`}
                title="Attendance"
                onClick={() => handleSubmenuToggle(setOpenAttendance, openAttendance)}
              >
                <i className="bi bi-calendar2-check menu-icon"></i>
                {!isCollapsed && (
                  <>
                    <span>Attendance</span>
                    <i
                      className="bi bi-chevron-right ms-auto"
                      style={{
                        fontSize: 11,
                        opacity: 0.45,
                        transition: "transform 0.2s",
                        transform: openAttendance ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    ></i>
                  </>
                )}
              </div>
              {!isCollapsed && (
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
              )}
            </>
          )}

          {/* Module */}
          {can("task") && (
            <>
              <div
                className={`menu-item ${openTask ? "open" : ""}`}
                title="Modules"
                onClick={() => handleSubmenuToggle(setOpenTask, openTask)}
              >
                <i className="bi bi-list-task menu-icon"></i>
                {!isCollapsed && (
                  <>
                    <span>Modules</span>
                    <i
                      className="bi bi-chevron-right ms-auto"
                      style={{
                        fontSize: 11,
                        opacity: 0.45,
                        transition: "transform 0.2s",
                        transform: openTask ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    ></i>
                  </>
                )}
              </div>
              {!isCollapsed && (
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
              )}
            </>
          )}

          {/* Timesheet */}
          {can("timesheet") && (
            <>
              <div
                className={`menu-item ${openTimesheet ? "open" : ""}`}
                title="Timesheet"
                onClick={() => handleSubmenuToggle(setOpenTimesheet, openTimesheet)}
              >
                <i className="bi bi-calendar3 menu-icon"></i>
                {!isCollapsed && (
                  <>
                    <span>Timesheet</span>
                    <i
                      className="bi bi-chevron-right ms-auto"
                      style={{
                        fontSize: 11,
                        opacity: 0.45,
                        transition: "transform 0.2s",
                        transform: openTimesheet ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    ></i>
                  </>
                )}
              </div>
              {!isCollapsed && (
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
                      Timesheet Report
                    </Link>
                  )}
                </div>
              )}
            </>
          )}

          {/* Todo */}
          {can("todo") && (
            <Link
              to="/todo"
              title="Todo"
              className={`menu-item ${isActive("/todo", true) ? "active" : ""}`}
              onClick={handleNavClick}
            >
              <i className="bi bi-check2-square menu-icon"></i>
              {!isCollapsed && <span>Todo</span>}
            </Link>
          )}

          {/* Report */}
          {can("report") && (
            <Link
              to="/reports"
              title="Reports"
              className={`menu-item ${isActive("/reports", true) ? "active" : ""}`}
              onClick={handleNavClick}
            >
              <i className="bi bi-bar-chart-line menu-icon"></i>
              {!isCollapsed && <span>Reports</span>}
            </Link>
          )}

          {/* Intercom */}
          <Link
            to="/intercom"
            title="Intercom List"
            className={`menu-item ${isActive("/intercom", true) ? "active" : ""}`}
            onClick={handleNavClick}
          >
            <i className="bi bi-telephone menu-icon"></i>
            {!isCollapsed && <span>Intercom</span>}
          </Link>
        </div>

        {/* Admin Setup */}
        {(can("users") || can("holidays") || can("roles")) && (
          <div className="sidebar-section" style={{ marginTop: 6 }}>
            {!isCollapsed ? (
              <div className="sidebar-section-label">Admin</div>
            ) : (
              <div className="sidebar-pill-divider" />
            )}
            <div
              className={`menu-item ${openSetup ? "open" : ""}`}
              title="Setup"
              onClick={() => handleSubmenuToggle(setOpenSetup, openSetup)}
            >
              <i className="bi bi-gear menu-icon"></i>
              {!isCollapsed && (
                <>
                  <span>Setup</span>
                  <i
                    className="bi bi-chevron-right ms-auto"
                    style={{
                      fontSize: 11,
                      opacity: 0.45,
                      transition: "transform 0.2s",
                      transform: openSetup ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                  ></i>
                </>
              )}
            </div>
            {!isCollapsed && (
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
            )}
          </div>
        )}

        {/* Preferences — visible to every user */}
        <div className="sidebar-section" style={{ marginTop: 6 }}>
          {!isCollapsed ? (
            <div className="sidebar-section-label">Preferences</div>
          ) : (
            <div className="sidebar-pill-divider" />
          )}
          <Link
            to="/settings"
            title="Personalization"
            className={`menu-item ${isActive("/settings", true) ? "active" : ""}`}
            onClick={handleNavClick}
          >
            <i className="bi bi-palette menu-icon"></i>
            {!isCollapsed && <span>Personalization</span>}
          </Link>
        </div>
      </div>

      {/* Sidebar Footer — User Card & Collapse Toggle */}
      <div className="sidebar-footer">
        {!isCollapsed ? (
          <div className="sidebar-user">
            <div className="ui-avatar">{userInitials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{userName}</div>
              <div className="sidebar-user-role">{role.charAt(0).toUpperCase() + role.slice(1)}</div>
            </div>
            <button
              className="sidebar-pill-btn"
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </button>
            <button
              className="sidebar-logout-btn"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        ) : (
          <div className="sidebar-user-collapsed">
            <div className="ui-avatar sm" title={`${userName} (${role})`}>
              {userInitials}
            </div>
            <button
              className="sidebar-pill-btn"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </button>
            <button
              className="sidebar-logout-btn"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        )}
      </div>

    </aside>
  );
}
