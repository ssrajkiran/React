import { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";
import { Link } from "react-router-dom";

const MENU_ITEMS = [
  { key: "dashboard",         label: "Dashboard" },
  { key: "attendance",        label: "Attendance Form" },
  { key: "attendance_report", label: "Attendance Report" },
  { key: "task",              label: "Task Form" },
  { key: "task_report",       label: "Task Report" },
  { key: "timesheet",         label: "Timesheet Form" },
  { key: "ai_summary",        label: "AI Summary" },
  { key: "summary_history",   label: "Summary History" },
  { key: "users",             label: "Users" },
  { key: "holidays",          label: "Holidays" },
  { key: "roles",             label: "Roles" },
  { key: "todo",              label: "Todo" },
  { key: "profile",           label: "Profile" },
];

const DEFAULT_ROLES = ["admin", "employee"];

const emptyPermissions = () =>
  MENU_ITEMS.map((m) => ({ menu_key: m.key, can_view: false, can_create: false, can_edit: false, can_delete: false }));

export default function Roles() {
  const [roles, setRoles]                       = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [showModal, setShowModal]               = useState(false);
  const [selectedRole, setSelectedRole]         = useState(null);
  const [saving, setSaving]                     = useState(false);
  const [searchText, setSearchText]             = useState("");
  const [toast, setToast]                       = useState(null);
  const [deleteConfirm, setDeleteConfirm]       = useState(null);
  const [currentPage, setCurrentPage]           = useState(1);
  const ROWS_PER_PAGE = 10;

  useEffect(() => { loadRoles(); }, []);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load ──
  const loadRoles = async () => {
    setLoading(true);
    try {
      const res  = await api.get("/roles");
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setRoles(data.map((r) => ({
        id:          r?.id          ?? "",
        name:        r?.name        ?? "",
        description: r?.description ?? "",
        permissions: r?.permissions ?? [],
      })));
    } catch (err) {
      console.error("Failed to load roles:", err);
      setRoles([]);
      showToast("Failed to load roles.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    try {
      await api.delete(`/roles/${id}`);
      setRoles((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirm(null);
      showToast("Role deleted successfully.", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete role.", "error");
    }
  };

  // ── Open Create / Edit ──
  const openCreate = () => {
    setSelectedRole({ name: "", description: "", permissions: emptyPermissions() });
    setShowModal(true);
  };

  const openEdit = async (role) => {
    try {
      const res  = await api.get(`/roles/${role.id}`);
      const data = res.data?.data ?? res.data;
      const perms = Array.isArray(data.permissions) && data.permissions.length > 0
        ? data.permissions
        : emptyPermissions();
      setSelectedRole({ id: data.id, name: data.name, description: data.description, permissions: perms });
      setShowModal(true);
    } catch (err) {
      console.error(err);
      showToast("Failed to load role details.", "error");
    }
  };

  // ── Save (Create or Update) ──
  const handleSave = async () => {
    if (!selectedRole.name.trim()) {
      showToast("Role name is required.", "error");
      return;
    }
    setSaving(true);
    try {
      const { id, name, description, permissions } = selectedRole;
      if (id) {
        await api.put(`/roles/${id}`, { name, description, permissions });
        showToast("Role updated successfully.", "success");
      } else {
        await api.post("/roles", { name, description, permissions });
        showToast("Role created successfully.", "success");
      }
      setShowModal(false);
      await loadRoles();
    } catch (err) {
      console.error(err);
      showToast("Failed to save role.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Permission helpers ──
  const handlePermChange = (menuKey, field) => {
    setSelectedRole((prev) => ({
      ...prev,
      permissions: prev.permissions.map((p) =>
        p.menu_key === menuKey ? { ...p, [field]: !p[field] } : p
      ),
    }));
  };

  const handlePermAll = (menuKey) => {
    setSelectedRole((prev) => {
      const perm = prev.permissions.find((p) => p.menu_key === menuKey);
      if (!perm) return prev;
      const allChecked = perm.can_view && perm.can_create && perm.can_edit && perm.can_delete;
      return {
        ...prev,
        permissions: prev.permissions.map((p) =>
          p.menu_key === menuKey
            ? { ...p, can_view: !allChecked, can_create: !allChecked, can_edit: !allChecked, can_delete: !allChecked }
            : p
        ),
      };
    });
  };

  const permCount = (role) => {
    const perms = role.permissions || [];
    return perms.filter((p) => p.can_view || p.can_create || p.can_edit || p.can_delete).length;
  };

  const isDefault = (role) => DEFAULT_ROLES.includes(role.name?.toLowerCase());

  // ── Filter + Paginate ──
  const filtered = roles.filter((r) => {
    const t = searchText.toLowerCase();
    return r.name.toLowerCase().includes(t) || (r.description || "").toLowerCase().includes(t);
  });

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const handleSearch = (e) => { setSearchText(e.target.value); setCurrentPage(1); };

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div className={`sr-toast sr-toast-${toast.type}`}>
          <i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"}`} />
          {toast.msg}
          <button className="sr-toast-close" onClick={() => setToast(null)}><i className="bi bi-x" /></button>
        </div>
      )}

      {/* ── PAGE HEADER ── */}
      <div className="sr-page-header">
        <div>
          <h5 className="sr-page-title">All Roles</h5>
          <nav className="sr-breadcrumb">
            <Link to="/">Home</Link>
            <i className="bi bi-chevron-right" />
            <span>Setup</span>
            <i className="bi bi-chevron-right" />
            <span>Roles</span>
          </nav>
        </div>
        <button className="cu-save-btn" onClick={openCreate}>
          <i className="bi bi-plus-lg" /> Add Role
        </button>
      </div>

      {/* ── SEARCH CARD ── */}
      <div className="sr-filter-card">
        <div className="sr-filter-inner">
          <div className="sr-filter-group" style={{ flex: 1, maxWidth: 340 }}>
            <label className="sr-label">Search Roles</label>
            <div className="sr-input-wrap">
              <i className="bi bi-search sr-input-icon" />
              <input
                className="sr-input"
                placeholder="Search by name or description…"
                value={searchText}
                onChange={handleSearch}
              />
              {searchText && (
                <button className="ul-clear-btn" onClick={() => { setSearchText(""); setCurrentPage(1); }}>
                  <i className="bi bi-x" />
                </button>
              )}
            </div>
          </div>
          <div className="ul-count-pill">
            <i className="bi bi-shield" /> {filtered.length} role{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="ul-table-card">

        {loading && (
          <div className="sr-empty-state">
            <div className="sr-empty-icon sr-pulse"><i className="bi bi-cpu" /></div>
            <p className="sr-empty-title">Loading roles…</p>
            <p className="sr-empty-sub">Fetching role data, please wait</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="sr-empty-state">
            <div className="sr-empty-icon"><i className="bi bi-shield" /></div>
            <p className="sr-empty-title">No roles found</p>
            <p className="sr-empty-sub">{searchText ? "Try a different search term" : "Add your first role to get started"}</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            <div className="sr-table-wrap">
              <table className="sr-table">
                <thead>
                  <tr>
                    <th className="sr-th-sm">#</th>
                    <th>Role Name</th>
                    <th>Description</th>
                    <th>Permissions</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((role, i) => (
                    <tr key={role.id} className="sr-tr">
                      <td className="sr-td-muted sr-center">{(currentPage - 1) * ROWS_PER_PAGE + i + 1}</td>
                      <td>
                        <div className="ul-name-cell">
                          <div className="ul-avatar">{role.name.charAt(0).toUpperCase()}</div>
                          <span className="ul-name">{role.name}</span>
                        </div>
                      </td>
                      <td className="sr-td-muted">{role.description || "—"}</td>
                      <td>
                        <span className="ul-perm-pill">
                          <i className="bi bi-key" /> {permCount(role)} menu{permCount(role) !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td>
                        <div className="ul-actions">
                          {isDefault(role) && (
                            <span className="ul-default-badge">
                              <i className="bi bi-lock-fill" /> Default
                            </span>
                          )}
                          <button className="ul-edit-btn" onClick={() => openEdit(role)}>
                            <i className="bi bi-pencil" /> Edit
                          </button>
                          {!isDefault(role) && (
                            <button className="ul-delete-btn" onClick={() => setDeleteConfirm(role.id)}>
                              <i className="bi bi-trash" /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="sh-pagination ul-pagination">
                <button className="sh-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  <i className="bi bi-chevron-left" /> Previous
                </button>
                <div className="sh-page-numbers">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      className={`sh-page-num ${currentPage === i + 1 ? "sh-page-num-active" : ""}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button className="sh-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                  Next <i className="bi bi-chevron-right" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteConfirm && (
        <div className="ul-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="ul-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ul-modal-icon ul-modal-icon-danger">
              <i className="bi bi-trash" />
            </div>
            <p className="ul-modal-title">Delete Role?</p>
            <p className="ul-modal-sub">This action cannot be undone. The role will be permanently removed.</p>
            <div className="ul-modal-actions">
              <button className="cu-back-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="ul-delete-confirm-btn" onClick={() => handleDelete(deleteConfirm)}>
                <i className="bi bi-trash" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {showModal && selectedRole && (
        <div className="ul-overlay" onClick={() => setShowModal(false)}>
          <div className="ul-modal ul-modal-lg" onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="ul-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="cu-form-icon"><i className="bi bi-shield-lock" /></div>
                <div>
                  <p className="ul-modal-title" style={{ margin: 0 }}>{selectedRole.id ? "Edit Role" : "Create Role"}</p>
                  <p className="ul-modal-sub" style={{ margin: 0 }}>{selectedRole.id ? "Update role details and permissions." : "Define a new role and its permissions."}</p>
                </div>
              </div>
              <button className="ul-modal-close" onClick={() => setShowModal(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="cu-divider" />

            {/* Fields */}
            <div className="cu-fields-grid" style={{ marginBottom: 20 }}>
              <div className="cu-field-group">
                <label className="sr-label">Role Name</label>
                <div className="sr-input-wrap">
                  <i className="bi bi-tag sr-input-icon" />
                  <input
                    className="sr-input"
                    value={selectedRole.name}
                    onChange={(e) => setSelectedRole((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Manager"
                  />
                </div>
              </div>
              <div className="cu-field-group">
                <label className="sr-label">Description</label>
                <div className="sr-input-wrap">
                  <i className="bi bi-card-text sr-input-icon" />
                  <input
                    className="sr-input"
                    value={selectedRole.description}
                    onChange={(e) => setSelectedRole((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Brief description of this role"
                  />
                </div>
              </div>
            </div>

            {/* Permissions Grid */}
            <label className="sr-label" style={{ marginBottom: 8 }}>Permissions</label>
            <div className="rl-perm-wrap">
              <table className="rl-perm-table">
                <thead>
                  <tr>
                    <th className="rl-perm-menu">Menu</th>
                    <th className="rl-perm-col"><i className="bi bi-eye" /> View</th>
                    <th className="rl-perm-col"><i className="bi bi-plus-circle" /> Create</th>
                    <th className="rl-perm-col"><i className="bi bi-pencil" /> Edit</th>
                    <th className="rl-perm-col"><i className="bi bi-trash" /> Delete</th>
                    <th className="rl-perm-col rl-all-head">All</th>
                  </tr>
                </thead>
                <tbody>
                  {MENU_ITEMS.map((item) => {
                    const perm = selectedRole.permissions.find((p) => p.menu_key === item.key) || {};
                    const allChecked = perm.can_view && perm.can_create && perm.can_edit && perm.can_delete;
                    return (
                      <tr key={item.key} className="sr-tr">
                        <td className="rl-perm-label">{item.label}</td>
                        {["can_view", "can_create", "can_edit", "can_delete"].map((field) => (
                          <td key={field} className="rl-perm-cell">
                            <label className="rl-toggle">
                              <input
                                type="checkbox"
                                checked={!!perm[field]}
                                onChange={() => handlePermChange(item.key, field)}
                              />
                              <span className="rl-toggle-track" />
                            </label>
                          </td>
                        ))}
                        <td className="rl-perm-cell">
                          <label className="rl-toggle">
                            <input
                              type="checkbox"
                              checked={!!allChecked}
                              onChange={() => handlePermAll(item.key)}
                            />
                            <span className="rl-toggle-track" />
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="cu-divider" />

            {/* Modal actions */}
            <div className="cu-actions">
              <button className="cu-back-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="cu-save-btn" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><i className="bi bi-arrow-repeat sr-spin" /> Saving…</>
                  : <><i className="bi bi-check-lg" /> {selectedRole.id ? "Save Changes" : "Create Role"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ================= STYLES =================
const styles = `
  /* ── Toast ── */
  .sr-toast {
    position: fixed; top: 20px; right: 20px; z-index: 1100;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: var(--radius-lg);
    font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12); animation: sr-fade-in 0.2s ease;
  }
  .sr-toast-success { background: #ECFDF5; color: #059669; border: 1px solid #6ee7b7; }
  .sr-toast-error   { background: #FEF2F2; color: #DC2626; border: 1px solid #fca5a5; }
  .sr-toast-close { margin-left: 6px; background: none; border: none; cursor: pointer; color: inherit; font-size: 15px; display: flex; align-items: center; }

  /* ── Page header ── */
  .sr-page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
  }
  .sr-page-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; letter-spacing: -0.01em; }
  .sr-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
  .sr-breadcrumb a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .sr-breadcrumb a:hover { text-decoration: underline; }
  .sr-breadcrumb i { font-size: 10px; opacity: 0.5; }

  /* ── Filter card ── */
  .sr-filter-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    padding: 18px 20px; margin-bottom: 16px;
  }
  .sr-filter-inner { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
  .sr-filter-group { display: flex; flex-direction: column; gap: 6px; }
  .sr-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
  .sr-input-wrap { position: relative; display: flex; align-items: center; }
  .sr-input-icon { position: absolute; left: 11px; color: var(--text-muted); font-size: 13px; pointer-events: none; z-index: 1; }
  .sr-input {
    width: 100%; padding: 9px 12px 9px 34px; border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface); font-size: 13px; color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .sr-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }

  .ul-clear-btn {
    position: absolute; right: 9px; background: none; border: none;
    cursor: pointer; color: var(--text-muted); font-size: 15px;
    display: flex; align-items: center; padding: 0; transition: color 0.15s;
  }
  .ul-clear-btn:hover { color: var(--text-primary); }

  .ul-count-pill {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 600; color: var(--text-secondary);
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 20px; padding: 5px 12px; white-space: nowrap;
    align-self: flex-end;
  }

  /* ── Table card ── */
  .ul-table-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    overflow: hidden;
  }

  /* ── Empty / loading state ── */
  .sr-empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 60px 20px; text-align: center;
  }
  .sr-empty-icon {
    width: 60px; height: 60px; border-radius: 50%;
    background: #EEF2FF; color: var(--primary); font-size: 24px;
    display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
  }
  .sr-pulse { animation: sr-pulse 1.5s ease-in-out infinite; }
  @keyframes sr-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.95); } }
  .sr-empty-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
  .sr-empty-sub   { font-size: 12.5px; color: var(--text-muted); margin: 0; }

  /* ── Table ── */
  .sr-table-wrap { overflow-x: auto; }
  .sr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .sr-table thead tr { border-bottom: 2px solid var(--border); }
  .sr-table th {
    padding: 11px 16px; font-size: 10.5px; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.06em; text-align: left;
    white-space: nowrap; background: var(--bg);
  }
  .sr-th-sm { width: 56px; text-align: center; }
  .sr-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .sr-table tbody tr:last-child td { border-bottom: none; }
  .sr-tr { transition: background 0.1s; }
  .sr-tr:hover td { background: #fafbff; }
  .sr-td-muted { color: var(--text-secondary); font-size: 12.5px; }
  .sr-center { text-align: center; }

  /* ── Name cell ── */
  .ul-name-cell { display: flex; align-items: center; gap: 10px; }
  .ul-avatar {
    width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
    background: var(--primary); color: #fff;
    font-size: 13px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .ul-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }

  /* ── Permission pill ── */
  .ul-perm-pill {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px;
    background: #ECFDF5; color: #059669; border: 1px solid #6ee7b7;
    white-space: nowrap;
  }

  /* ── Default badge ── */
  .ul-default-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 600; color: var(--text-muted);
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 20px; padding: 3px 10px; white-space: nowrap;
  }

  /* ── Action buttons ── */
  .ul-actions { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }

  .ul-edit-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 12px; background: #EEF2FF; color: #5048E5;
    border: 1px solid #c7d2fe; border-radius: var(--radius);
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: background 0.15s, transform 0.12s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .ul-edit-btn:hover { background: #e0e7ff; transform: translateY(-1px); }

  .ul-delete-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 12px; background: #FEF2F2; color: #DC2626;
    border: 1px solid #fca5a5; border-radius: var(--radius);
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: background 0.15s, transform 0.12s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .ul-delete-btn:hover { background: #fee2e2; transform: translateY(-1px); }

  /* ── Pagination ── */
  .ul-pagination { padding: 14px 16px; border-top: 1px solid var(--border); }
  .sh-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .sh-page-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 16px; background: var(--surface);
    border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 12.5px; font-weight: 600; color: var(--text-primary);
    cursor: pointer; transition: border-color 0.15s, background 0.15s, color 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .sh-page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }
  .sh-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .sh-page-numbers { display: flex; align-items: center; gap: 4px; }
  .sh-page-num {
    width: 32px; height: 32px; border-radius: var(--radius);
    border: 1px solid var(--border); background: var(--surface);
    font-size: 12.5px; font-weight: 600; color: var(--text-primary);
    cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .sh-page-num:hover { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }
  .sh-page-num-active { background: var(--primary); color: #fff; border-color: var(--primary); }

  /* ── Add Role btn (reuse cu-save-btn style) ── */
  .cu-save-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px; background: #059669; color: #fff;
    border: none; border-radius: var(--radius);
    font-size: 13px; font-weight: 600; text-decoration: none;
    cursor: pointer; transition: background 0.15s, transform 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap;
  }
  .cu-save-btn:hover:not(:disabled) { background: #047857; transform: translateY(-1px); color: #fff; }
  .cu-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .cu-back-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px; background: var(--surface);
    border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 13px; font-weight: 600; color: var(--text-secondary);
    cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .cu-back-btn:hover { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }

  /* ── Overlay ── */
  .ul-overlay {
    position: fixed; inset: 0; background: rgba(17,24,39,0.45); backdrop-filter: blur(2px);
    z-index: 1000; display: flex; align-items: center; justify-content: center;
    animation: sr-fade-in 0.15s ease; padding: 16px;
  }
  .ul-modal {
    background: var(--surface); border-radius: var(--radius-lg);
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    padding: 28px; width: 80%; max-width: 420px; max-height: calc(100vh - 32px);
    animation: ul-modal-center-in 0.2s ease;
    text-align: center;
  }
  .ul-modal-lg { max-width: 720px; text-align: left; overflow-y: auto; }

  @keyframes ul-modal-center-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }

  .ul-modal-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 20px; gap: 12px;
  }
  .ul-modal-close {
    background: none; border: none; cursor: pointer;
    color: var(--text-muted); font-size: 16px; padding: 4px;
    border-radius: var(--radius); transition: color 0.15s, background 0.15s;
    display: flex; align-items: center; flex-shrink: 0;
  }
  .ul-modal-close:hover { color: var(--text-primary); background: var(--bg); }

  /* Delete confirm modal */
  .ul-modal-icon {
    width: 56px; height: 56px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; margin: 0 auto 14px;
  }
  .ul-modal-icon-danger { background: #FEF2F2; color: #DC2626; }
  .ul-modal-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
  .ul-modal-sub   { font-size: 12.5px; color: var(--text-muted); margin: 0 0 20px; }
  .ul-modal-actions { display: flex; align-items: center; justify-content: center; gap: 10px; }

  .ul-delete-confirm-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 20px; background: #DC2626; color: #fff;
    border: none; border-radius: var(--radius);
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: background 0.15s; font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .ul-delete-confirm-btn:hover { background: #b91c1c; }

  /* ── Form fields ── */
  .cu-fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; }
  @media (max-width: 560px) { .cu-fields-grid { grid-template-columns: 1fr; } }
  .cu-field-group { display: flex; flex-direction: column; gap: 6px; }
  .cu-form-icon {
    width: 40px; height: 40px; border-radius: var(--radius);
    background: #EEF2FF; color: var(--primary); font-size: 18px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .cu-divider { border: none; border-top: 1px solid var(--border); margin: 0 0 20px; }
  .cu-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

  /* ── Permissions grid ── */
  .rl-perm-wrap {
    border: 1px solid var(--border); border-radius: var(--radius);
    overflow: hidden; margin-bottom: 20px;
  }
  .rl-perm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .rl-perm-table thead tr { border-bottom: 2px solid var(--border); }
  .rl-perm-table th {
    padding: 10px 14px; font-size: 10.5px; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.06em; text-align: center;
    white-space: nowrap; background: var(--bg);
  }
  .rl-perm-menu { text-align: left !important; }
  .rl-perm-col { width: 72px; }
  .rl-all-head { width: 52px; }
  .rl-perm-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .rl-perm-table tbody tr:last-child td { border-bottom: none; }
  .rl-perm-table tbody tr:hover td { background: #fafbff; }
  .rl-perm-label { font-weight: 600; color: var(--text-primary); font-size: 12.5px; }
  .rl-perm-cell { text-align: center; }

  /* ── Toggle switch ── */
  .rl-toggle {
    position: relative; display: inline-block; cursor: pointer;
  }
  .rl-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
  .rl-toggle-track {
    display: block; width: 34px; height: 18px; border-radius: 20px;
    background: #d1d5db; transition: background 0.2s;
    position: relative;
  }
  .rl-toggle-track::after {
    content: ""; position: absolute; top: 2px; left: 2px;
    width: 14px; height: 14px; border-radius: 50%;
    background: #fff; transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
  .rl-toggle input:checked + .rl-toggle-track { background: #5048E5; }
  .rl-toggle input:checked + .rl-toggle-track::after { transform: translateX(16px); }

  /* ── Animations ── */
  .sr-spin { animation: sr-spin 0.7s linear infinite; display: inline-block; }
  @keyframes sr-spin    { to { transform: rotate(360deg); } }
  @keyframes sr-fade-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
`;
