import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("hrms-theme") || "light");

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar  = () => setSidebarOpen(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("hrms-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <div className="app-wrapper">
      {sidebarOpen && (
        <div
          className="sidebar-overlay visible"
          aria-hidden="true"
          onClick={closeSidebar}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="main-panel">
        <Topbar
          onMenuClick={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />
        <main className="page-content">{children}</main>
        <footer className="app-footer">
          <span>&copy; {new Date().getFullYear()} Voltech. All rights reserved.</span>
          <div className="footer-meta">
            <span>Developed by Software Development</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
