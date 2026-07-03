import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout({ children }) {
  return (
    <div className="app-wrapper d-flex">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Panel */}
      <div className="main-panel d-flex flex-column flex-grow-1 min-vh-100">

        {/* Topbar */}
        <Topbar />

        {/* Page Content */}
        <div className="page-content flex-grow-1 p-6" style={{ backgroundColor: "#f5f6fa" }}>
          {children}
        </div>

        {/* Footer */}
        <footer
          className="d-flex justify-content-between align-items-right px-4 py-2 mt-auto"

        >
          <div>
            &copy; {new Date().getFullYear()} Voltech. All rights reserved.
          </div>
          <div style={{ fontWeight: "500", opacity: 0.9 }}>
            Developed by Software Development
          </div>
        </footer>

      </div>

    </div>
  );
}

