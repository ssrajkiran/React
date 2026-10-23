import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import GlobalSearch from "./GlobalSearch";
import { usePreferences } from "../../context/PreferencesContext";

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { toggleTheme, isDark } = usePreferences();

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

  // Global search shortcut: Ctrl/Cmd + K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
          onSearchClick={() => setSearchOpen(true)}
          onThemeToggle={toggleTheme}
          isDark={isDark}
        />
        <main className="page-content">{children}</main>
        <footer className="app-footer">
          <span>&copy; {new Date().getFullYear()} Voltech. All rights reserved.</span>
          <div className="footer-meta">
            <span>Developed by Software Development</span>
          </div>
        </footer>
      </div>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
