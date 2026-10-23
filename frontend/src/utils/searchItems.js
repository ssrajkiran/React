// ── Global search navigation registry + pure helpers (framework-free, testable) ──

export const SEARCH_ITEMS = [
  { label: "Dashboard", path: "/admin", alt: "/employee", icon: "bi-speedometer2", group: "Overview", roles: ["admin", "employee"] },
  { label: "Leave Dashboard", path: "/admin/leave-dashboard", alt: "/employee/leave-dashboard", icon: "bi-calendar2-check", group: "Overview", roles: ["admin", "employee"] },
  { label: "Timesheet Dashboard", path: "/admin/timesheet-dashboard", alt: "/employee/timesheet-dashboard", icon: "bi-clock-history", group: "Overview", roles: ["admin", "employee"] },
  { label: "Attendance Form", path: "/admin/leaves", alt: "/employee/leaves", icon: "bi-calendar-check", group: "Attendance", roles: ["admin", "employee"] },
  { label: "Attendance Report", path: "/employee/report", icon: "bi-table", group: "Attendance", roles: ["admin", "employee"] },
  { label: "Modules", path: "/tasks", icon: "bi-list-task", group: "Module", roles: ["admin", "employee"] },
  { label: "Module Report", path: "/tasks/report", icon: "bi-bar-chart-line", group: "Module", roles: ["admin", "employee"] },
  { label: "Timesheet", path: "/admin/timesheet", alt: "/employee/timesheet", icon: "bi-calendar3", group: "Timesheet", roles: ["admin", "employee"] },
  { label: "Timesheet Report", path: "/admin/ai-summary", icon: "bi-file-earmark-bar-graph", group: "Timesheet", roles: ["admin"] },
  { label: "Report", path: "/reports", icon: "bi-graph-up", group: "Reports", roles: ["admin", "employee"] },
  { label: "Todo", path: "/todo", icon: "bi-check2-square", group: "Work", roles: ["admin", "employee"] },
  { label: "Intercom Directory", path: "/intercom", icon: "bi-telephone", group: "Work", roles: ["admin", "employee"] },
  { label: "Users", path: "/employee/userslist", icon: "bi-people", group: "Setup", roles: ["admin"] },
  { label: "Create User", path: "/admin/users/create", icon: "bi-person-plus", group: "Setup", roles: ["admin"] },
  { label: "Holidays", path: "/holidays", icon: "bi-calendar-day", group: "Setup", roles: ["admin"] },
  { label: "Roles", path: "/admin/roles", icon: "bi-shield-lock", group: "Setup", roles: ["admin"] },
  { label: "My Profile", path: "/profile", icon: "bi-person", group: "Account", roles: ["admin", "employee"] },
  { label: "Personalization", path: "/settings", icon: "bi-palette", group: "Account", roles: ["admin", "employee"] },
];

export function filterSearchItems(items, query, role) {
  const visible = items.filter((it) => !it.roles || it.roles.includes(role));
  const q = query.trim().toLowerCase();
  if (!q) return visible;
  return visible.filter(
    (it) =>
      it.label.toLowerCase().includes(q) ||
      it.group.toLowerCase().includes(q) ||
      it.path.toLowerCase().includes(q)
  );
}

export function resolvePath(item, role) {
  if (item.alt) return role === "admin" ? item.path : item.alt;
  return item.path;
}

export function getRoleFromToken(token = globalThis.localStorage?.getItem("token")) {
  if (!token) return "employee";
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || "employee";
  } catch {
    return "employee";
  }
}
