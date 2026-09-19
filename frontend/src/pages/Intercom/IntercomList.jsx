import { useState, useEffect, useRef } from "react";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";

const ROWS_PER_PAGE = 30;

export default function IntercomList() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadResult, setUploadResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [role, setRole] = useState("employee");
  const fileRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setRole(payload.role || "employee");
      } catch (e) {}
    }
    loadData();
  }, []);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/intercom/list");
      setData(res.data || []);
      const deptRes = await api.get("/intercom/departments");
      setDepartments(deptRes.data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load intercom data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term) => {
    setSearch(term);
    setCurrentPage(1);
    if (!term && !deptFilter) {
      loadData();
      return;
    }
    try {
      const res = await api.get(`/intercom/search?q=${encodeURIComponent(term)}`);
      setData(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeptFilter = async (dept) => {
    setDeptFilter(dept);
    setCurrentPage(1);
    if (!dept) {
      loadData();
      return;
    }
    try {
      const res = await api.get(`/intercom/search?q=${encodeURIComponent(dept)}`);
      setData(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".pdf")) {
      showToast("Only PDF files are allowed", "error");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/intercom/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadResult(res.data);
      setShowResultModal(true);
      showToast(`Updated! ${res.data.totalInserted} entries loaded.`, "success");
      loadData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Filter + paginate
  const filtered = data;
  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  // Group by department for display
  const grouped = {};
  paginated.forEach((row) => {
    if (!grouped[row.department]) grouped[row.department] = [];
    grouped[row.department].push(row);
  });

  return (
    <AppLayout>
      <style>{styles}</style>

      {toast && (
        <div className={`ic-toast ic-toast-${toast.type}`}>
          <i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"}`} />
          {toast.msg}
          <button className="ic-toast-close" onClick={() => setToast(null)}>
            <i className="bi bi-x" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="ic-page-header">
        <div>
          <h5 className="ic-page-title">Intercom List</h5>
          <nav className="ic-breadcrumb">
            <span>Home</span>
            <i className="bi bi-chevron-right" />
            <span>Intercom List</span>
          </nav>
        </div>
        {role === "admin" && (
          <div className="ic-header-actions">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              style={{ display: "none" }}
            />
            <button
              className="ic-upload-btn"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <i className="bi bi-arrow-repeat ic-spin" /> Uploading…
                </>
              ) : (
                <>
                  <i className="bi bi-cloud-arrow-up" /> Upload PDF
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Search + Filter */}
      <div className="ic-filter-card">
        <div className="ic-filter-inner">
          <div className="ic-filter-group" style={{ flex: 1, maxWidth: 400 }}>
            <label className="ic-label">Search</label>
            <div className="ic-input-wrap">
              <i className="bi bi-search ic-input-icon" />
              <input
                className="ic-input"
                placeholder="Search by name, intercom number or department…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {search && (
                <button className="ic-clear-btn" onClick={() => handleSearch("")}>
                  <i className="bi bi-x" />
                </button>
              )}
            </div>
          </div>
          <div className="ic-filter-group">
            <label className="ic-label">Department</label>
            <select
              className="ic-select"
              value={deptFilter}
              onChange={(e) => handleDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="ic-count-pill">
            <i className="bi bi-telephone" /> {filtered.length} entries
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="ic-table-card">
        {loading ? (
          <div className="ic-empty-state">
            <div className="ic-empty-icon ic-pulse">
              <i className="bi bi-cpu" />
            </div>
            <p className="ic-empty-title">Loading intercom list…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ic-empty-state">
            <div className="ic-empty-icon">
              <i className="bi bi-telephone-x" />
            </div>
            <p className="ic-empty-title">No entries found</p>
            <p className="ic-empty-sub">
              {search ? "Try a different search term" : "Upload a PDF to get started"}
            </p>
          </div>
        ) : (
          <>
            <div className="ic-table-wrap">
              <table className="ic-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>S.No</th>
                    <th>Name</th>
                    <th style={{ width: 120 }}>Intercom</th>
                    <th>Department</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row, idx) => (
                    <tr key={row.id || idx}>
                      <td className="ic-td-center">{row.sno}</td>
                      <td>
                        <div className="ic-name-cell">
                          <div className="ic-avatar">
                            {row.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <span className="ic-name">{row.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="ic-badge ic-badge-primary">{row.intercom}</span>
                      </td>
                      <td className="ic-td-dept">{row.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="ic-pagination">
                <span className="ic-page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="ic-page-btns">
                  <button
                    className="ic-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <i className="bi bi-chevron-left" /> Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`ic-page-num ${currentPage === pageNum ? "ic-active" : ""}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    className="ic-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next <i className="bi bi-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Result Modal */}
      {showResultModal && uploadResult && (
        <div className="ic-overlay" onClick={() => setShowResultModal(false)}>
          <div className="ic-modal ic-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="ic-modal-header">
              <div className="ic-modal-header-left">
                <div className="ic-modal-icon ic-modal-icon-success">
                  <i className="bi bi-check-circle" />
                </div>
                <div>
                  <h6 className="ic-modal-title">Upload Complete</h6>
                  <p className="ic-modal-sub">
                    {uploadResult.totalInserted} entries inserted
                    {uploadResult.newEntries > 0
                      ? ` • ${uploadResult.newEntries} new entries added`
                      : " • No new entries (all existed)"}
                  </p>
                </div>
              </div>
              <button className="ic-modal-close" onClick={() => setShowResultModal(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="ic-modal-divider" />
            <div className="ic-modal-body">
              <label className="ic-label" style={{ marginBottom: 8 }}>
                MySQL Query Executed
              </label>
              <pre className="ic-sql-block">{uploadResult.sql}</pre>
            </div>
            <div className="ic-modal-divider" />
            <div className="ic-modal-footer">
              <button className="ic-btn ic-btn-ghost" onClick={() => setShowResultModal(false)}>
                Close
              </button>
              <button
                className="ic-btn ic-btn-primary"
                onClick={() => {
                  navigator.clipboard.writeText(uploadResult.sql);
                  showToast("SQL copied to clipboard", "success");
                }}
              >
                <i className="bi bi-clipboard" /> Copy SQL
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

const styles = `
  .ic-toast {
    position: fixed; top: 20px; right: 20px; z-index: 1100;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: var(--radius-lg);
    font-size: 13px; font-weight: 600; font-family: var(--font);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12); animation: ic-fade-in 0.2s ease;
  }
  .ic-toast-success { background: #ECFDF5; color: #059669; border: 1px solid #6ee7b7; }
  .ic-toast-error   { background: #FEF2F2; color: #DC2626; border: 1px solid #fca5a5; }
  .ic-toast-close { margin-left: 6px; background: none; border: none; cursor: pointer; color: inherit; font-size: 15px; display: flex; align-items: center; }

  .ic-page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
  }
  .ic-page-title { font-size: 15px; font-weight: 700; color: var(--t-base); margin: 0 0 4px; }
  .ic-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--t-muted); }
  .ic-breadcrumb i { font-size: 10px; opacity: 0.5; }
  .ic-header-actions { display: flex; gap: 8px; }
  .ic-upload-btn {
    display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px;
    background: #059669; color: #fff; border: none; border-radius: var(--radius);
    font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s;
    font-family: var(--font); white-space: nowrap;
  }
  .ic-upload-btn:hover:not(:disabled) { background: #047857; }
  .ic-upload-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .ic-filter-card {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg);
    box-shadow: var(--shadow); padding: 18px 20px; margin-bottom: 16px;
  }
  .ic-filter-inner { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
  .ic-filter-group { display: flex; flex-direction: column; gap: 6px; }
  .ic-label { font-size: 11px; font-weight: 700; color: var(--t-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .ic-input-wrap { position: relative; display: flex; align-items: center; }
  .ic-input-icon { position: absolute; left: 11px; color: var(--t-muted); font-size: 13px; pointer-events: none; z-index: 1; }
  .ic-input {
    width: 100%; padding: 9px 34px 9px 34px; border: 1px solid var(--border);
    border-radius: var(--radius); background: var(--bg-card); font-size: 13px;
    color: var(--t-base); font-family: var(--font); outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ic-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }
  .ic-clear-btn {
    position: absolute; right: 9px; background: none; border: none;
    cursor: pointer; color: var(--t-muted); font-size: 15px;
    display: flex; align-items: center; padding: 0;
  }
  .ic-clear-btn:hover { color: var(--t-base); }
  .ic-select {
    padding: 9px 12px; border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--bg-card); font-size: 13px; color: var(--t-base);
    font-family: var(--font); outline: none; min-width: 180px; cursor: pointer;
  }
  .ic-count-pill {
    display: inline-flex; align-items: center; gap: 6px; font-size: 12px;
    font-weight: 600; color: var(--t-muted); background: var(--bg);
    border: 1px solid var(--border); border-radius: 20px; padding: 5px 12px;
    white-space: nowrap; align-self: flex-end;
  }

  .ic-table-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow); overflow: hidden;
  }
  .ic-table-wrap { overflow-x: auto; }
  .ic-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .ic-table thead tr { border-bottom: 2px solid var(--border); }
  .ic-table th {
    padding: 11px 16px; font-size: 10.5px; font-weight: 700;
    color: var(--t-muted); text-transform: uppercase; letter-spacing: 0.06em;
    text-align: left; white-space: nowrap; background: var(--bg);
  }
  .ic-table td {
    padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle;
  }
  .ic-table tbody tr:last-child td { border-bottom: none; }
  .ic-table tbody tr { transition: background 0.1s; }
  .ic-table tbody tr:hover td { background: #fafbff; }
  .ic-td-center { text-align: center; font-weight: 600; color: var(--t-muted); }
  .ic-td-dept { font-size: 12px; color: var(--t-muted); }

  .ic-name-cell { display: flex; align-items: center; gap: 10px; }
  .ic-avatar {
    width: 32px; height: 32px; border-radius: 8px;
    background: linear-gradient(135deg, #EEF2FF, #E0E7FF);
    color: #5048E5; font-size: 13px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ic-name { font-weight: 600; font-size: 13px; color: var(--t-base); }

  .ic-badge {
    display: inline-block; padding: 3px 10px; border-radius: 6px;
    font-size: 12px; font-weight: 700; font-family: var(--font-mono);
  }
  .ic-badge-primary { background: #EEF2FF; color: #5048E5; border: 1px solid #c7d2fe; }

  .ic-empty-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 60px 20px; text-align: center;
  }
  .ic-empty-icon {
    width: 60px; height: 60px; border-radius: 50%; background: #EEF2FF;
    color: var(--primary); font-size: 24px; display: flex;
    align-items: center; justify-content: center; margin-bottom: 14px;
  }
  .ic-pulse { animation: ic-pulse 1.5s ease-in-out infinite; }
  @keyframes ic-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.95)} }
  .ic-empty-title { font-size: 14px; font-weight: 700; color: var(--t-base); margin: 0 0 4px; }
  .ic-empty-sub { font-size: 12.5px; color: var(--t-muted); margin: 0; }

  .ic-pagination {
    padding: 14px 16px; border-top: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
  }
  .ic-page-info { font-size: 12.5px; color: var(--t-muted); }
  .ic-page-btns { display: flex; align-items: center; gap: 4px; }
  .ic-page-btn {
    display: flex; align-items: center; gap: 6px; padding: 7px 14px;
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 12.5px; font-weight: 600; color: var(--t-base); cursor: pointer;
    transition: all 0.15s; font-family: var(--font);
  }
  .ic-page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }
  .ic-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .ic-page-num {
    width: 32px; height: 32px; border-radius: var(--radius);
    border: 1px solid var(--border); background: var(--bg-card);
    font-size: 12.5px; font-weight: 600; color: var(--t-base);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-family: var(--font); transition: all 0.15s;
  }
  .ic-page-num:hover { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }
  .ic-page-num.ic-active { background: var(--primary); color: #fff; border-color: var(--primary); }

  .ic-overlay {
    position: fixed; inset: 0; background: rgba(17,24,39,0.45);
    backdrop-filter: blur(2px); z-index: 1000; display: flex;
    align-items: center; justify-content: center; padding: 16px;
  }
  .ic-modal {
    background: var(--bg-card); border-radius: var(--radius-lg);
    box-shadow: 0 20px 60px rgba(0,0,0,0.2); width: 90%;
    max-height: calc(100vh - 32px); display: flex; flex-direction: column;
    overflow: hidden; animation: ic-modal-in 0.2s ease;
  }
  .ic-modal-lg { max-width: 800px; }
  @keyframes ic-modal-in { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
  .ic-modal-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 18px 24px 16px; gap: 12px;
  }
  .ic-modal-header-left { display: flex; align-items: center; gap: 12px; }
  .ic-modal-icon {
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 18px;
  }
  .ic-modal-icon-success { background: #ECFDF5; color: #059669; }
  .ic-modal-title { font-size: 15px; font-weight: 700; color: var(--t-base); margin: 0; }
  .ic-modal-sub { font-size: 12.5px; color: var(--t-muted); margin: 2px 0 0; }
  .ic-modal-close {
    width: 32px; height: 32px; border: 1px solid var(--border); border-radius: var(--radius);
    background: transparent; display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--t-muted); font-size: 13px; transition: all 0.15s;
  }
  .ic-modal-close:hover { background: var(--danger-soft); border-color: var(--danger); color: var(--danger); }
  .ic-modal-divider { border: none; border-top: 1px solid var(--border); margin: 0; }
  .ic-modal-body { flex: 1; overflow-y: auto; padding: 20px 24px; }
  .ic-modal-footer {
    display: flex; align-items: center; justify-content: flex-end;
    padding: 14px 24px; border-top: 1px solid var(--border); gap: 8px;
  }
  .ic-sql-block {
    background: #1E293B; color: #A5F3FC; padding: 16px; border-radius: var(--radius);
    font-size: 11.5px; font-family: var(--font-mono); overflow-x: auto;
    max-height: 300px; overflow-y: auto; white-space: pre-wrap; word-break: break-all;
    line-height: 1.6; margin: 0;
  }
  .ic-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 8px 18px; border-radius: var(--radius); font-size: 13px; font-weight: 600;
    font-family: var(--font); cursor: pointer; transition: all 0.15s; border: none; white-space: nowrap;
  }
  .ic-btn-primary { background: var(--primary); color: #fff; }
  .ic-btn-primary:hover { background: var(--primary-dark); }
  .ic-btn-ghost { background: transparent; color: var(--t-muted); border: 1px solid var(--border); }
  .ic-btn-ghost:hover { background: var(--bg-hover); border-color: var(--t-light); }

  .ic-spin { animation: ic-spin 1s linear infinite; display: inline-block; }
  @keyframes ic-spin { to { transform: rotate(360deg); } }
  @keyframes ic-fade-in { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
`;
