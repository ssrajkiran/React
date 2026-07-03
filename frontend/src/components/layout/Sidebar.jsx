import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const { pathname } = useLocation();
  const [role, setRole] = useState("employee");
  const [openAttendance, setOpenAttendance] = useState(false);
  const [openTask, setOpenTask] = useState(false);
  const [openTimesheet, setOpenTimesheet] = useState(false);
  const [openSetup, setOpenSetup] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setRole(payload.role || "employee");
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
    setOpenTask(pathname.includes("/tasks") || pathname.includes("/tasks/report"));
    setOpenTimesheet(
      pathname.includes("/timesheet") ||
        pathname.includes("/timesheet/report") ||
        pathname.includes("/admin/ai-summary")
    );
    setOpenSetup(pathname.includes("/userslist") || pathname.includes("/holidays"));
  }, [pathname]);

  const isActive = (link, exact = false) => {
    return exact ? pathname === link : pathname.startsWith(link);
  };

  return (
    <aside className="app-sidebar">
      <div className="brand">Voltech Attendance & Timesheet</div>

      <Link
        to={role === "admin" ? "/admin" : "/employee"}
        className={`menu-item ${
          isActive(role === "admin" ? "/admin" : "/employee", true) ? "active" : ""
        }`}
      >
        <i className="bi bi-speedometer2"></i> Dashboard
      </Link>

      <div
        className={`menu-item ${openAttendance ? "open" : ""}`}
        onClick={() => setOpenAttendance(!openAttendance)}
      >
        <i className="bi bi-calendar2-check"></i> Attendance
        <i className={`bi bi-chevron-${openAttendance ? "down" : "right"} ms-auto`}></i>
      </div>
      {openAttendance && (
        <div className="submenu">
          <Link
            to={role === "admin" ? "/admin/leaves" : "/employee/leaves"}
            className={`submenu-item ${
              isActive(role === "admin" ? "/admin/leaves" : "/employee/leaves", true)
                ? "active"
                : ""
            }`}
          >
            Attendance Form
          </Link>
          {role === "admin" && (
            <Link
              to="/employee/report"
              className={`submenu-item ${isActive("/employee/report", true) ? "active" : ""}`}
            >
              Report
            </Link>
          )}
        </div>
      )}

      <div className={`menu-item ${openTask ? "open" : ""}`} onClick={() => setOpenTask(!openTask)}>
        <i className="bi bi-list-task"></i> Task
        <i className={`bi bi-chevron-${openTask ? "down" : "right"} ms-auto`}></i>
      </div>
      {openTask && (
        <div className="submenu">
          <Link
            to="/tasks"
            className={`submenu-item ${
              isActive("/tasks", true) && !isActive("/tasks/report") ? "active" : ""
            }`}
          >
            Task Form
          </Link>
          {role === "admin" && (
            <Link
              to="/tasks/report"
              className={`submenu-item ${isActive("/tasks/report", true) ? "active" : ""}`}
            >
              Report
            </Link>
          )}
        </div>
      )}

      <div
        className={`menu-item ${openTimesheet ? "open" : ""}`}
        onClick={() => setOpenTimesheet(!openTimesheet)}
      >
        <i className="bi bi-calendar3"></i> Timesheet
        <i className={`bi bi-chevron-${openTimesheet ? "down" : "right"} ms-auto`}></i>
      </div>
      {openTimesheet && (
        <div className="submenu">
          <Link
            to={role === "admin" ? "/admin/timesheet" : "/employee/timesheet"}
            className={`submenu-item ${
              isActive(role === "admin" ? "/admin/timesheet" : "/employee/timesheet", true)
                ? "active"
                : ""
            }`}
          >
            Timesheet Form
          </Link>
          {role === "admin" && (
            <>
              <Link
                to="/admin/ai-summary"
                className={`submenu-item ${isActive("/admin/ai-summary", true) ? "active" : ""}`}
              >
                Generate Summary
              </Link>
              <Link
                to="/admin/ai-summary/history"
                className={`submenu-item ${
                  isActive("/admin/ai-summary/history", true) ? "active" : ""
                }`}
              >
                Summary History
              </Link>
            </>
          )}
        </div>
      )}

      {role === "admin" && (
        <>
          <div className={`menu-item setup-toggle`} onClick={() => setOpenSetup(!openSetup)}>
            <i className="bi bi-gear"></i> Setup
            <i className={`bi bi-chevron-${openSetup ? "down" : "right"} ms-auto`}></i>
          </div>
          {openSetup && (
            <div className="submenu">
              <Link
                to="/employee/userslist"
                className={`submenu-item ${isActive("/employee/userslist", true) ? "active" : ""}`}
              >
                Users
              </Link>
              <Link
                to="/holidays"
                className={`submenu-item ${isActive("/holidays", true) ? "active" : ""}`}
              >
                Holiday
              </Link>
            </div>
          )}
        </>
      )}
    </aside>
  );
}