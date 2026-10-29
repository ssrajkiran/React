import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api";
import NotificationBell from "./NotificationBell";

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
  "/admin/ai-summary": "Timesheet Report",
  "/reports": "Report",
  "/employee/userslist": "Users",
  "/holidays": "Holidays",
  "/admin/roles": "Roles",
  "/profile": "My Profile",
  "/settings": "Personalization",
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

export default function Topbar({
  onMenuClick,
  sidebarOpen,
  isCollapsed,
  onToggleCollapse,
  onSearchClick,
  onThemeToggle,
  isDark,
}) {
  const [userName, setUserName] = useState("User");
  const [userInitials, setUserInitials] = useState("U");
  const [role, setRole] = useState("employee");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [todayHours, setTodayHours] = useState(0);
  const [todayLeaves, setTodayLeaves] = useState(0);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => {
      const top = window.scrollY || document.documentElement.scrollTop || 0;
      setIsScrolled(top > 10);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await api.get("/timesheet/dashboard/summary");
        if (!isMounted || !res?.data) return;
        const hrs = res.data.todayHours?.total_hours ?? res.data.teamTodayHours?.total_hours ?? 0;
        const leaves = res.data.todayLeaves?.count ?? res.data.pendingLeaves?.count ?? 0;
        setTodayHours(Number(hrs) || 0);
        setTodayLeaves(Number(leaves) || 0);
      } catch {
        /* silent fallback */
      }
    };
    fetchSummary();
    const interval = setInterval(fetchSummary, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setRole(payload.role || "employee");
        } catch { /* malformed token — keep default role */ }
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
    <header className={`app-topbar ${isScrolled ? "is-scrolled" : ""}`}>
      {/* Left side: Collapse toggle + Status & Page Pills */}
      <div className="topbar-left">
        {/* Desktop Collapse / Extend toggle button */}
        <button
          className="topbar-circle-btn topbar-collapse-desktop"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapse}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
          </svg>
        </button>

        {/* Mobile Hamburger Drawer button */}
        <button
          className={`topbar-hamburger topbar-hamburger-mobile ${sidebarOpen ? "is-open" : ""}`}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          onClick={() => onMenuClick?.()}
        >
          <span className="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        {/* Metrics & Status Pills Stack (matching tactical pill look) */}
        <div className="topbar-pills-stack">
          {/* Live Pulse Status Pill */}
          <div className="topbar-pill topbar-pill-status" title="System operational and connected">
            <span className="topbar-pulse-dot"></span>
            <span className="topbar-pill-label">Status:</span>
            <strong className="topbar-pill-val">Active</strong>
          </div>

          {/* User Role Pill */}
          <div className="topbar-pill topbar-pill-role" title={`Signed in as ${role}`}>
            <i className={`bi ${role === "admin" ? "bi-shield-check" : "bi-person-badge"}`}></i>
            <span className="topbar-pill-label">Role:</span>
            <strong className="topbar-pill-val">{role.charAt(0).toUpperCase() + role.slice(1)}</strong>
          </div>

          {/* Today's Man Hours Pill */}
          <div
            className="topbar-pill topbar-pill-metric topbar-pill-hours"
            title="Today's logged man hours (click to view timesheet)"
            role="button"
            tabIndex={0}
            onClick={() => navigate(role === "admin" ? "/admin/timesheet" : "/employee/timesheet")}
            onKeyDown={(e) => e.key === "Enter" && navigate(role === "admin" ? "/admin/timesheet" : "/employee/timesheet")}
          >
            <i className="bi bi-clock-history text-info"></i>
            <span className="topbar-pill-label">Today Hours:</span>
            <strong className="topbar-pill-val">{Number(todayHours).toFixed(1)}h</strong>
          </div>

          {/* Today's Leaves Pill */}
          <div
            className="topbar-pill topbar-pill-metric topbar-pill-leaves"
            title="Today's leave requests / approvals (click to view attendance)"
            role="button"
            tabIndex={0}
            onClick={() => navigate(role === "admin" ? "/admin/leaves" : "/employee/leaves")}
            onKeyDown={(e) => e.key === "Enter" && navigate(role === "admin" ? "/admin/leaves" : "/employee/leaves")}
          >
            <i className="bi bi-calendar-x text-warning"></i>
            <span className="topbar-pill-label">Leaves:</span>
            <strong className="topbar-pill-val">{todayLeaves}</strong>
          </div>

          {/* Active Section / Page Breadcrumb Pill */}
          <div className="topbar-pill topbar-pill-page" title="Current page">
            <i className="bi bi-grid-fill"></i>
            <strong className="topbar-pill-val">{pageTitle}</strong>
          </div>
        </div>
      </div>

      {/* Right side: Search Pill + Quick Actions + User Profile Pill */}
      <div className="topbar-actions">
        {/* Global Search Pill with ⌘K Badge */}
        <button
          className="topbar-search-pill"
          title="Search modules, records, and pages (Ctrl + K)"
          aria-label="Open global search"
          onClick={() => onSearchClick?.()}
        >
          <i className="bi bi-search"></i>
          <span className="topbar-search-text">Search modules, records...</span>
          <kbd className="topbar-search-kbd">⌘K</kbd>
        </button>

        {/* Theme Mode Toggle Pill Button */}
        <button
          className="topbar-circle-btn"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => onThemeToggle?.()}
        >
          <i className={`bi ${isDark ? "bi-sun" : "bi-moon-stars"}`}></i>
        </button>

        {/* Notification Bell Pill */}
        <NotificationBell />

        {/* Fullscreen Toggle Pill Button */}
        <button
          className="topbar-circle-btn hide-sm"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          aria-label="Toggle fullscreen"
          onClick={toggleFullscreen}
        >
          <i className={`bi ${isFullscreen ? "bi-fullscreen-exit" : "bi-fullscreen"}`}></i>
        </button>

        <div className="topbar-divider"></div>

        {/* User Profile Pill with Avatar & Dropdown */}
        <div className="dropdown">
          <button
            className="topbar-user-pill"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            title="User menu"
          >
            <div
              className="ui-avatar sm topbar-avatar"
              style={{ background: avatarGradient }}
            >
              {userInitials}
            </div>
            <div className="topbar-user-pill-info">
              <div className="topbar-user-pill-name">{userName}</div>
              <div className="topbar-user-pill-role">
                <i className={`bi ${role === "admin" ? "bi-shield-lock" : "bi-person-badge"}`}></i>
                {" "}{role.charAt(0).toUpperCase() + role.slice(1)}
              </div>
            </div>
            <i className="bi bi-chevron-down topbar-user-pill-chevron"></i>
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
              <button
                className="dropdown-item"
                onClick={() => navigate("/settings")}
              >
                <span className="dropdown-icon-wrap" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
                  <i className="bi bi-gear"></i>
                </span>
                Personalization
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
