import { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";
import { Link } from "react-router-dom";

const FIELD_TYPES = [
  "text","number","email","password","tel","url",
  "textarea","select","multi-select",
  "date","datetime-local","time",
  "checkbox","radio","toggle",
  "file","image",
  "hidden","readonly",
];

const emptyConfig = () => ({
  module_name: "", table_name: "", display_name: "", api_route: "",
  icon: "bi-grid", primary_color: "#5048E5", menu_key: "",
  search_placeholder: "Search...", page_title: "All Items",
  empty_message: "No items found", empty_sub_message: "Add your first item to get started",
  is_active: true,
});

const emptyField = () => ({
  field_key: "", field_label: "", field_type: "text",
  placeholder: "", default_value: "", options: "",
  is_required: false, is_searchable: false, is_sortable: true, is_unique: false,
  show_in_table: true, show_in_form: true, show_in_detail: true,
  table_width: "auto", table_align: "left",
  validation_regex: "", validation_message: "",
  min_value: "", max_value: "", min_length: "", max_length: "",
  depends_on: "", depends_value: "", help_text: "",
});

export default function ConfigManager() {
  const [configs, setConfigs]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [editConfig, setEditConfig]   = useState(null);
  const [config, setConfig]           = useState(emptyConfig());
  const [fields, setFields]           = useState([]);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchText, setSearchText]   = useState("");

  useEffect(() => { loadConfigs(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => { if (toast) setToast(null); }, 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/crud/admin/all");
      setConfigs(res.data || []);
    } catch (err) {
      console.error(err);
      setToast({ msg: "Failed to load configs.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditConfig(null);
    setConfig(emptyConfig());
    setFields([emptyField()]);
    setShowModal(true);
  };

  const openEdit = async (cfg) => {
    try {
      const res = await api.get(`/crud/admin/${cfg.id}`);
      setEditConfig(res.data.config);
      setConfig({
        ...res.data.config,
        is_active: !!res.data.config.is_active,
      });
      setFields(
        res.data.fields.map((f) => ({
          ...f,
          options: f.options ? (Array.isArray(f.options) ? f.options.join(", ") : String(f.options)) : "",
          is_required: !!f.is_required,
          is_searchable: !!f.is_searchable,
          is_sortable: !!f.is_sortable,
          is_unique: !!f.is_unique,
          show_in_table: !!f.show_in_table,
          show_in_form: !!f.show_in_form,
          show_in_detail: !!f.show_in_detail,
        }))
      );
      setShowModal(true);
    } catch (err) {
      console.error(err);
      setToast({ msg: "Failed to load config details.", type: "error" });
    }
  };

  const handleSave = async () => {
    if (!config.module_name.trim() || !config.table_name.trim()) {
      setToast({ msg: "Module name and table name are required.", type: "error" });
      return;
    }
    if (!config.display_name.trim()) config.display_name = config.module_name;

    setSaving(true);
    try {
      const payload = {
        config: {
          ...config,
          api_route: config.api_route || `/api/crud/${config.module_name}`,
        },
        fields: fields.map((f, i) => ({
          ...f,
          options: f.options
            ? f.options.split(",").map((s) => s.trim()).filter(Boolean)
            : null,
          sort_order: i,
        })),
      };

      if (editConfig) {
        await api.put(`/crud/admin/${editConfig.id}`, payload);
        setToast({ msg: "Config updated successfully.", type: "success" });
      } else {
        await api.post("/crud/admin", payload);
        setToast({ msg: "Config created successfully.", type: "success" });
      }
      setShowModal(false);
      await loadConfigs();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save config.";
      setToast({ msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/crud/admin/${id}`);
      setDeleteConfirm(null);
      setToast({ msg: "Config deleted.", type: "success" });
      await loadConfigs();
    } catch (err) {
      setToast({ msg: "Failed to delete config.", type: "error" });
    }
  };

  const addField = () => setFields((prev) => [...prev, emptyField()]);

  const updateField = (index, key, value) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)));
  };

  const removeField = (index) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const moveField = (index, dir) => {
    setFields((prev) => {
      const arr = [...prev];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  const filtered = configs.filter((c) => {
    const t = searchText.toLowerCase();
    return (c.module_name || "").toLowerCase().includes(t) ||
           (c.display_name || "").toLowerCase().includes(t) ||
           (c.table_name || "").toLowerCase().includes(t);
  });

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* Toast */}
      {toast && (
        <div className={`cfg-toast cfg-toast-${toast.type}`}>
          <i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"}`} />
          {toast.msg}
          <button className="cfg-toast-close" onClick={() => setToast(null)}><i className="bi bi-x" /></button>
        </div>
      )}

      {/* Header */}
      <div className="cfg-header">
        <div>
          <h5 className="cfg-title">Form Configurations</h5>
          <div className="cfg-breadcrumb">
            <Link to="/">Home</Link>
            <i className="bi bi-chevron-right" />
            <span>Setup</span>
            <i className="bi bi-chevron-right" />
            <span>Config Manager</span>
          </div>
        </div>
        <button className="cfg-btn cfg-btn-primary" onClick={openCreate}>
          <i className="bi bi-plus-lg" /> Add Config
        </button>
      </div>

      {/* Search */}
      <div className="cfg-filter-card">
        <div className="cfg-filter-inner">
          <div className="cfg-filter-group" style={{ flex: 1, maxWidth: 340 }}>
            <div className="cfg-input-wrap">
              <i className="bi bi-search cfg-input-icon" />
              <input
                className="cfg-input"
                placeholder="Search configs..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>
          <div className="cfg-count-pill">
            <i className="bi bi-grid" /> {filtered.length} config{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="cfg-table-card">
        {loading ? (
          <div className="cfg-empty-state">
            <div className="cfg-empty-icon cfg-pulse"><i className="bi bi-cpu" /></div>
            <p className="cfg-empty-title">Loading configs...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="cfg-empty-state">
            <div className="cfg-empty-icon"><i className="bi bi-grid" /></div>
            <p className="cfg-empty-title">No configs found</p>
            <p className="cfg-empty-sub">{searchText ? "Try a different search" : "Create your first form config to get started"}</p>
          </div>
        ) : (
          <div className="cfg-table-wrap">
            <table className="cfg-table">
              <thead>
                <tr>
                  <th className="cfg-th-sm">#</th>
                  <th>Module</th>
                  <th>Table</th>
                  <th>Display Name</th>
                  <th>API Route</th>
                  <th>Fields</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cfg, i) => (
                  <tr key={cfg.id} className="cfg-tr">
                    <td className="cfg-td-muted cfg-center">{i + 1}</td>
                    <td>
                      <div className="cfg-module-cell">
                        <div className="cfg-module-icon" style={{ background: cfg.primary_color || "#5048E5" }}>
                          <i className={`bi ${cfg.icon || "bi-grid"}`} />
                        </div>
                        <span className="cfg-module-name">{cfg.module_name}</span>
                      </div>
                    </td>
                    <td className="cfg-td-muted">{cfg.table_name}</td>
                    <td>{cfg.display_name}</td>
                    <td><code className="cfg-route">{cfg.api_route}</code></td>
                    <td><span className="cfg-badge">{cfg.field_count || "—"}</span></td>
                    <td>
                      <span className={`cfg-status ${cfg.is_active ? "cfg-status-active" : "cfg-status-inactive"}`}>
                        {cfg.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="cfg-actions">
                        <Link to={`/admin/dynamic/${cfg.module_name}`} className="cfg-action-view">
                          <i className="bi bi-eye" /> View
                        </Link>
                        <button className="cfg-action-edit" onClick={() => openEdit(cfg)}>
                          <i className="bi bi-pencil" /> Edit
                        </button>
                        <button className="cfg-action-delete" onClick={() => setDeleteConfirm(cfg.id)}>
                          <i className="bi bi-trash" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="cfg-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="cfg-modal cfg-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="cfg-modal-icon cfg-modal-icon-danger"><i className="bi bi-trash" /></div>
            <p className="cfg-modal-title">Delete Config?</p>
            <p className="cfg-modal-sub">This will permanently remove the config and all its field definitions.</p>
            <div className="cfg-modal-actions">
              <button className="cfg-btn cfg-btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="cfg-btn cfg-btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                <i className="bi bi-trash" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="cfg-overlay" onClick={() => setShowModal(false)}>
          <div className="cfg-modal cfg-modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="cfg-modal-header">
              <div>
                <p className="cfg-modal-title">{editConfig ? "Edit Config" : "Create Config"}</p>
                <p className="cfg-modal-sub">{editConfig ? "Update module configuration." : "Define a new module and its fields."}</p>
              </div>
              <button className="cfg-modal-close" onClick={() => setShowModal(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="cfg-divider" />

            {/* Module Info */}
            <p className="cfg-section-label">Module Info</p>
            <div className="cfg-form-grid">
              <div className="cfg-field">
                <label className="cfg-label">Module Name <span className="cfg-required">*</span></label>
                <input className="cfg-input" value={config.module_name} onChange={(e) => setConfig((p) => ({ ...p, module_name: e.target.value }))} placeholder="e.g. departments" disabled={!!editConfig} />
              </div>
              <div className="cfg-field">
                <label className="cfg-label">Table Name <span className="cfg-required">*</span></label>
                <input className="cfg-input" value={config.table_name} onChange={(e) => setConfig((p) => ({ ...p, table_name: e.target.value }))} placeholder="e.g. departments" disabled={!!editConfig} />
              </div>
              <div className="cfg-field">
                <label className="cfg-label">Display Name</label>
                <input className="cfg-input" value={config.display_name} onChange={(e) => setConfig((p) => ({ ...p, display_name: e.target.value }))} placeholder="e.g. Departments" />
              </div>
              <div className="cfg-field">
                <label className="cfg-label">API Route</label>
                <input className="cfg-input" value={config.api_route} onChange={(e) => setConfig((p) => ({ ...p, api_route: e.target.value }))} placeholder="/api/crud/departments" />
              </div>
              <div className="cfg-field">
                <label className="cfg-label">Icon</label>
                <input className="cfg-input" value={config.icon} onChange={(e) => setConfig((p) => ({ ...p, icon: e.target.value }))} placeholder="bi-grid" />
              </div>
              <div className="cfg-field">
                <label className="cfg-label">Primary Color</label>
                <input type="color" className="cfg-color-input" value={config.primary_color} onChange={(e) => setConfig((p) => ({ ...p, primary_color: e.target.value }))} />
              </div>
              <div className="cfg-field">
                <label className="cfg-label">Menu Key</label>
                <input className="cfg-input" value={config.menu_key} onChange={(e) => setConfig((p) => ({ ...p, menu_key: e.target.value }))} placeholder="e.g. departments" />
              </div>
              <div className="cfg-field">
                <label className="cfg-label">Active</label>
                <label className="cfg-toggle-wrap">
                  <input type="checkbox" checked={config.is_active} onChange={(e) => setConfig((p) => ({ ...p, is_active: e.target.checked }))} />
                  <span className="cfg-toggle-track"><span className="cfg-toggle-thumb" /></span>
                </label>
              </div>
            </div>

            <div className="cfg-divider" />

            {/* Fields */}
            <div className="cfg-fields-header">
              <p className="cfg-section-label" style={{ margin: 0 }}>Fields ({fields.length})</p>
              <button className="cfg-btn cfg-btn-sm cfg-btn-primary" onClick={addField}>
                <i className="bi bi-plus" /> Add Field
              </button>
            </div>

            <div className="cfg-fields-list">
              {fields.map((field, idx) => (
                <div key={idx} className="cfg-field-card">
                  <div className="cfg-field-card-header">
                    <div className="cfg-field-drag">
                      <button className="cfg-drag-btn" disabled={idx === 0} onClick={() => moveField(idx, -1)}>
                        <i className="bi bi-chevron-up" />
                      </button>
                      <span className="cfg-field-num">{idx + 1}</span>
                      <button className="cfg-drag-btn" disabled={idx === fields.length - 1} onClick={() => moveField(idx, 1)}>
                        <i className="bi bi-chevron-down" />
                      </button>
                    </div>
                    <span className="cfg-field-preview">
                      {field.field_label || field.field_key || "New Field"} — <code>{field.field_type}</code>
                    </span>
                    <button className="cfg-field-remove" onClick={() => removeField(idx)}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>

                  <div className="cfg-form-grid">
                    <div className="cfg-field">
                      <label className="cfg-label">Key</label>
                      <input className="cfg-input" value={field.field_key} onChange={(e) => updateField(idx, "field_key", e.target.value)} placeholder="column_name" />
                    </div>
                    <div className="cfg-field">
                      <label className="cfg-label">Label</label>
                      <input className="cfg-input" value={field.field_label} onChange={(e) => updateField(idx, "field_label", e.target.value)} placeholder="Field Label" />
                    </div>
                    <div className="cfg-field">
                      <label className="cfg-label">Type</label>
                      <div className="cfg-select-wrap">
                        <select className="cfg-select" value={field.field_type} onChange={(e) => updateField(idx, "field_type", e.target.value)}>
                          {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <i className="bi bi-chevron-down cfg-select-arrow" />
                      </div>
                    </div>
                    <div className="cfg-field">
                      <label className="cfg-label">Placeholder</label>
                      <input className="cfg-input" value={field.placeholder} onChange={(e) => updateField(idx, "placeholder", e.target.value)} />
                    </div>
                    {(field.field_type === "select" || field.field_type === "radio") && (
                      <div className="cfg-field cfg-field-full">
                        <label className="cfg-label">Options (comma separated)</label>
                        <input className="cfg-input" value={field.options} onChange={(e) => updateField(idx, "options", e.target.value)} placeholder="Option1, Option2, Option3" />
                      </div>
                    )}
                    <div className="cfg-field">
                      <label className="cfg-label">Default Value</label>
                      <input className="cfg-input" value={field.default_value} onChange={(e) => updateField(idx, "default_value", e.target.value)} />
                    </div>
                    <div className="cfg-field">
                      <label className="cfg-label">Help Text</label>
                      <input className="cfg-input" value={field.help_text} onChange={(e) => updateField(idx, "help_text", e.target.value)} />
                    </div>
                  </div>

                  <div className="cfg-field-toggles">
                    <label className="cfg-mini-toggle"><input type="checkbox" checked={field.is_required} onChange={(e) => updateField(idx, "is_required", e.target.checked)} /> Required</label>
                    <label className="cfg-mini-toggle"><input type="checkbox" checked={field.is_searchable} onChange={(e) => updateField(idx, "is_searchable", e.target.checked)} /> Searchable</label>
                    <label className="cfg-mini-toggle"><input type="checkbox" checked={field.is_sortable} onChange={(e) => updateField(idx, "is_sortable", e.target.checked)} /> Sortable</label>
                    <label className="cfg-mini-toggle"><input type="checkbox" checked={field.show_in_table} onChange={(e) => updateField(idx, "show_in_table", e.target.checked)} /> Table</label>
                    <label className="cfg-mini-toggle"><input type="checkbox" checked={field.show_in_form} onChange={(e) => updateField(idx, "show_in_form", e.target.checked)} /> Form</label>
                  </div>
                </div>
              ))}
            </div>

            <div className="cfg-divider" />

            <div className="cfg-modal-footer">
              <button className="cfg-btn cfg-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="cfg-btn cfg-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><i className="bi bi-arrow-repeat cfg-spin" /> Saving...</> : <><i className="bi bi-check-lg" /> {editConfig ? "Save Changes" : "Create Config"}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

const styles = `
  /* ── Toast ── */
  .cfg-toast {
    position: fixed; top: 20px; right: 20px; z-index: 1100;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: var(--radius-lg);
    font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12); animation: cfg-fade-in 0.2s ease;
  }
  .cfg-toast-success { background: #ECFDF5; color: #059669; border: 1px solid #6ee7b7; }
  .cfg-toast-error   { background: #FEF2F2; color: #DC2626; border: 1px solid #fca5a5; }
  .cfg-toast-close { margin-left: 6px; background: none; border: none; cursor: pointer; color: inherit; font-size: 15px; display: flex; align-items: center; }

  /* ── Header ── */
  .cfg-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
  .cfg-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
  .cfg-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
  .cfg-breadcrumb a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .cfg-breadcrumb a:hover { text-decoration: underline; }
  .cfg-breadcrumb i { font-size: 10px; opacity: 0.5; }

  /* ── Filter ── */
  .cfg-filter-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    padding: 18px 20px; margin-bottom: 16px;
  }
  .cfg-filter-inner { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
  .cfg-filter-group { display: flex; flex-direction: column; gap: 6px; }
  .cfg-input-wrap { position: relative; display: flex; align-items: center; }
  .cfg-input-icon { position: absolute; left: 11px; color: var(--text-muted); font-size: 13px; pointer-events: none; z-index: 1; }
  .cfg-input {
    width: 100%; padding: 9px 12px 9px 34px; border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface); font-size: 13px; color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .cfg-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }
  .cfg-count-pill {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 600; color: var(--text-secondary);
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 20px; padding: 5px 12px; white-space: nowrap; align-self: flex-end;
  }

  /* ── Table ── */
  .cfg-table-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow); overflow: hidden;
  }
  .cfg-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; }
  .cfg-empty-icon {
    width: 60px; height: 60px; border-radius: 50%;
    background: #EEF2FF; color: var(--primary); font-size: 24px;
    display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
  }
  .cfg-pulse { animation: cfg-pulse 1.5s ease-in-out infinite; }
  @keyframes cfg-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.95); } }
  .cfg-empty-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
  .cfg-empty-sub   { font-size: 12.5px; color: var(--text-muted); margin: 0; }
  .cfg-table-wrap { overflow-x: auto; }
  .cfg-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .cfg-table thead tr { border-bottom: 2px solid var(--border); }
  .cfg-table th {
    padding: 11px 16px; font-size: 10.5px; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.06em; text-align: left;
    white-space: nowrap; background: var(--bg);
  }
  .cfg-th-sm { width: 56px; text-align: center; }
  .cfg-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .cfg-table tbody tr:last-child td { border-bottom: none; }
  .cfg-tr { transition: background 0.1s; }
  .cfg-tr:hover td { background: #fafbff; }
  .cfg-td-muted { color: var(--text-secondary); font-size: 12.5px; }
  .cfg-center { text-align: center; }

  .cfg-module-cell { display: flex; align-items: center; gap: 10px; }
  .cfg-module-icon {
    width: 32px; height: 32px; border-radius: var(--radius); flex-shrink: 0;
    color: #fff; font-size: 14px; display: flex; align-items: center; justify-content: center;
  }
  .cfg-module-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
  .cfg-route { font-size: 11.5px; background: var(--bg); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border); }
  .cfg-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px;
    background: #EEF2FF; color: #5048E5; border: 1px solid #c7d2fe;
  }
  .cfg-status {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px;
  }
  .cfg-status-active { background: #ECFDF5; color: #059669; border: 1px solid #6ee7b7; }
  .cfg-status-inactive { background: #FEF2F2; color: #DC2626; border: 1px solid #fca5a5; }

  /* ── Actions ── */
  .cfg-actions { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
  .cfg-action-view, .cfg-action-edit {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 12px; border-radius: var(--radius);
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: background 0.15s; font-family: 'Plus Jakarta Sans', sans-serif;
    text-decoration: none;
  }
  .cfg-action-view { background: #ECFDF5; color: #059669; border: 1px solid #6ee7b7; }
  .cfg-action-view:hover { background: #d1fae5; color: #059669; }
  .cfg-action-edit { background: #EEF2FF; color: #5048E5; border: 1px solid #c7d2fe; }
  .cfg-action-edit:hover { background: #e0e7ff; }
  .cfg-action-delete {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 12px; background: #FEF2F2; color: #DC2626;
    border: 1px solid #fca5a5; border-radius: var(--radius);
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: background 0.15s; font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .cfg-action-delete:hover { background: #fee2e2; }

  /* ── Buttons ── */
  .cfg-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px; border-radius: var(--radius);
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: all 0.15s; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; border: none;
  }
  .cfg-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .cfg-btn-primary { background: #5048E5; color: #fff; }
  .cfg-btn-primary:hover:not(:disabled) { background: #4338CA; transform: translateY(-1px); color: #fff; }
  .cfg-btn-danger { background: #DC2626; color: #fff; }
  .cfg-btn-danger:hover:not(:disabled) { background: #b91c1c; }
  .cfg-btn-outline { background: var(--surface); border: 1px solid var(--border); color: var(--text-secondary); }
  .cfg-btn-outline:hover { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }
  .cfg-btn-sm { padding: 6px 14px; font-size: 12px; }

  /* ── Overlay + Modal ── */
  .cfg-overlay {
    position: fixed; inset: 0; background: rgba(17,24,39,0.45); backdrop-filter: blur(2px);
    z-index: 1000; display: flex; align-items: center; justify-content: center;
    animation: cfg-fade-in 0.15s ease; padding: 16px;
  }
  .cfg-modal {
    background: var(--surface); border-radius: var(--radius-lg);
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    padding: 28px; width: 90%; max-height: calc(100vh - 32px);
    animation: cfg-modal-in 0.2s ease; text-align: left; overflow-y: auto;
  }
  .cfg-modal-xl { max-width: 900px; }
  .cfg-modal-sm { max-width: 400px; text-align: center; }
  .cfg-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 0; }
  .cfg-modal-close {
    background: none; border: none; cursor: pointer; color: var(--text-muted);
    font-size: 16px; padding: 4px; border-radius: var(--radius);
    transition: all 0.15s; display: flex; align-items: center; flex-shrink: 0;
  }
  .cfg-modal-close:hover { color: var(--text-primary); background: var(--bg); }
  .cfg-modal-icon { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; margin: 0 auto 14px; }
  .cfg-modal-icon-danger { background: #FEF2F2; color: #DC2626; }
  .cfg-modal-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
  .cfg-modal-sub   { font-size: 12.5px; color: var(--text-muted); margin: 0 0 20px; }
  .cfg-modal-actions { display: flex; align-items: center; justify-content: center; gap: 10px; }
  .cfg-modal-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .cfg-divider { border: none; border-top: 1px solid var(--border); margin: 20px 0; }
  @keyframes cfg-fade-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes cfg-modal-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
  .cfg-spin { animation: cfg-spin 0.7s linear infinite; display: inline-block; }
  @keyframes cfg-spin { to { transform: rotate(360deg); } }

  /* ── Form ── */
  .cfg-section-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; }
  .cfg-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; }
  .cfg-field { display: flex; flex-direction: column; gap: 5px; }
  .cfg-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
  .cfg-required { color: #DC2626; }
  .cfg-color-input { width: 48px; height: 36px; border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; padding: 2px; }
  .cfg-select-wrap { position: relative; display: flex; align-items: center; }
  .cfg-select {
    width: 100%; padding: 9px 34px 9px 12px; border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface); font-size: 13px; color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none; cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s; appearance: none; -webkit-appearance: none;
  }
  .cfg-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }
  .cfg-select-arrow { position: absolute; right: 11px; color: var(--text-muted); font-size: 11px; pointer-events: none; }

  /* ── Toggle ── */
  .cfg-toggle-wrap { position: relative; display: inline-block; cursor: pointer; padding-top: 2px; }
  .cfg-toggle-wrap input { position: absolute; opacity: 0; width: 0; height: 0; }
  .cfg-toggle-track {
    display: block; width: 40px; height: 22px; border-radius: 20px;
    background: #d1d5db; transition: background 0.2s; position: relative;
  }
  .cfg-toggle-thumb {
    position: absolute; top: 3px; left: 3px;
    width: 16px; height: 16px; border-radius: 50%;
    background: #fff; transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
  .cfg-toggle-wrap input:checked + .cfg-toggle-track { background: #5048E5; }
  .cfg-toggle-wrap input:checked + .cfg-toggle-track .cfg-toggle-thumb { transform: translateX(18px); }

  /* ── Fields ── */
  .cfg-fields-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .cfg-fields-list { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; padding-right: 4px; }
  .cfg-field-card {
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 16px; background: var(--bg);
  }
  .cfg-field-card-header {
    display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
  }
  .cfg-field-drag { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .cfg-drag-btn {
    background: none; border: none; cursor: pointer; color: var(--text-muted);
    font-size: 10px; padding: 0; line-height: 1; transition: color 0.15s;
  }
  .cfg-drag-btn:hover:not(:disabled) { color: var(--primary); }
  .cfg-drag-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .cfg-field-num {
    font-size: 11px; font-weight: 700; color: var(--text-muted);
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 4px; width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center;
  }
  .cfg-field-preview { flex: 1; font-size: 13px; font-weight: 600; color: var(--text-primary); }
  .cfg-field-preview code { font-size: 11px; color: var(--text-muted); background: var(--surface); padding: 1px 6px; border-radius: 4px; }
  .cfg-field-remove {
    background: none; border: none; cursor: pointer; color: var(--text-muted);
    font-size: 14px; padding: 4px; border-radius: var(--radius);
    transition: all 0.15s; display: flex; align-items: center;
  }
  .cfg-field-remove:hover { color: #DC2626; background: #FEF2F2; }
  .cfg-field-toggles { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 12px; }
  .cfg-mini-toggle {
    display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600;
    color: var(--text-secondary); cursor: pointer;
  }
  .cfg-mini-toggle input { width: 14px; height: 14px; accent-color: #5048E5; }

  @media (max-width: 600px) { .cfg-form-grid { grid-template-columns: 1fr; } }
`;
