import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ FIX 1: toggle instead of always open
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar  = () => setSidebarOpen(false);

  // Close sidebar when resizing beyond mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <div className="app-wrapper">
      {/* Overlay — dims content on mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay visible"
          aria-hidden="true"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Main panel */}
      <div className="main-panel">
        {/* ✅ FIX 2: pass both toggle handler AND sidebarOpen state */}
        <Topbar onMenuClick={toggleSidebar} sidebarOpen={sidebarOpen} />

        {/* Page content */}
        <main className="page-content">{children}</main>

        {/* Footer */}
        <footer className="app-footer">
          <div className="footer-inner">
            <span>&copy; {new Date().getFullYear()} Voltech. All rights reserved.</span>
            <span className="footer-divider">·</span>
            <span>Developed by Software Development</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
