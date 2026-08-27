import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";

const ROWS_PER_PAGE = 10;

// ── Field Renderer ──
function FieldRenderer({ field, value, onChange, disabled }) {
  const base = "dy-input";
  const val = value ?? field.default_value ?? "";

  switch (field.field_type) {
    case "textarea":
      return (
        <textarea
          className={`${base} dy-textarea`}
          placeholder={field.placeholder}
          value={val}
          disabled={disabled}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.max_length || undefined}
        />
      );

    case "select":
      return (
        <select className={base} value={val} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          <option value="">{field.placeholder || "Select..."}</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case "number":
      return (
        <input
          type="number"
          className={base}
          placeholder={field.placeholder}
          value={val}
          disabled={disabled}
          min={field.min_value || undefined}
          max={field.max_value || undefined}
          step="any"
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "date":
      return (
        <input
          type="date"
          className={base}
          value={val}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "datetime-local":
      return (
        <input
          type="datetime-local"
          className={base}
          value={val}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "time":
      return (
        <input
          type="time"
          className={base}
          value={val}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "email":
      return (
        <input
          type="email"
          className={base}
          placeholder={field.placeholder}
          value={val}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "password":
      return (
        <input
          type="password"
          className={base}
          placeholder={field.placeholder}
          value={val}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "tel":
      return (
        <input
          type="tel"
          className={base}
          placeholder={field.placeholder}
          value={val}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "url":
      return (
        <input
          type="url"
          className={base}
          placeholder={field.placeholder}
          value={val}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "checkbox":
      return (
        <label className="dy-check-wrap">
          <input
            type="checkbox"
            checked={!!val}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="dy-check-box" />
        </label>
      );

    case "radio":
      return (
        <div className="dy-radio-group">
          {(field.options || []).map((opt) => (
            <label key={opt} className="dy-radio-wrap">
              <input
                type="radio"
                name={field.field_key}
                value={opt}
                checked={val === opt}
                disabled={disabled}
                onChange={() => onChange(opt)}
              />
              <span className="dy-radio-circle" />
              {opt}
            </label>
          ))}
        </div>
      );

    case "toggle":
      return (
        <label className="dy-toggle-wrap">
          <input
            type="checkbox"
            checked={val === 1 || val === "1" || val === true}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked ? 1 : 0)}
          />
          <span className="dy-toggle-track">
            <span className="dy-toggle-thumb" />
          </span>
        </label>
      );

    case "hidden":
      return <input type="hidden" value={val} />;

    case "readonly":
      return <input type="text" className={base} value={val} disabled readOnly />;

    default:
      return (
        <input
          type="text"
          className={base}
          placeholder={field.placeholder}
          value={val}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.max_length || undefined}
        />
      );
  }
}

// ── Main DynamicPage ──
export default function DynamicPage() {
  const { module: moduleName } = useParams();

  const [config, setConfig] = useState(null);
  const [fields, setFields] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchText) params.set("search", searchText);
      params.set("sort", sortField);
      params.set("order", sortOrder);

      const res = await api.get(`/crud/${moduleName}?${params.toString()}`);
      setConfig(res.data.config);
      setFields(res.data.fields);
      setData(res.data.data || []);
    } catch (err) {
      console.error("Failed to load:", err);
      setToast({ msg: "Failed to load data.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [moduleName, searchText, sortField, sortOrder]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => { if (toast) setToast(null); }, 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const initForm = (item = null) => {
    const f = {};
    fields.forEach((field) => {
      if (item) {
        f[field.field_key] = item[field.field_key] ?? field.default_value ?? "";
      } else {
        f[field.field_key] = field.default_value ?? (field.field_type === "toggle" || field.field_type === "checkbox" ? 0 : "");
      }
    });
    setForm(f);
    setFormErrors({});
    setEditItem(item);
    setShowModal(true);
  };

  const validate = () => {
    const errors = {};
    fields.filter((f) => f.show_in_form).forEach((field) => {
      if (field.is_required) {
        const val = form[field.field_key];
        if (val === undefined || val === null || val === "") {
          errors[field.field_key] = `${field.field_label} is required`;
        }
      }
      if (field.validation_regex && form[field.field_key]) {
        try {
          const regex = new RegExp(field.validation_regex);
          if (!regex.test(String(form[field.field_key]))) {
            errors[field.field_key] = field.validation_message || `${field.field_label} is invalid`;
          }
        } catch (e) {}
      }
      if (field.min_length && form[field.field_key] && String(form[field.field_key]).length < field.min_length) {
        errors[field.field_key] = `Minimum ${field.min_length} characters`;
      }
      if (field.max_length && form[field.field_key] && String(form[field.field_key]).length > field.max_length) {
        errors[field.field_key] = `Maximum ${field.max_length} characters`;
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/crud/${moduleName}/${editItem.id}`, form);
        setToast({ msg: "Updated successfully.", type: "success" });
      } else {
        await api.post(`/crud/${moduleName}`, form);
        setToast({ msg: "Created successfully.", type: "success" });
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save.";
      setToast({ msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/crud/${moduleName}/${id}`);
      setDeleteConfirm(null);
      setToast({ msg: "Deleted successfully.", type: "success" });
      await loadData();
    } catch (err) {
      setToast({ msg: "Failed to delete.", type: "error" });
    }
  };

  const handleSort = (key) => {
    if (sortField === key) {
      setSortOrder((p) => (p === "asc" ? "desc" : "asc"));
    } else {
      setSortField(key);
      setSortOrder("asc");
    }
  };

  // Filter
  const filtered = data;
  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const formFields = fields.filter((f) => f.show_in_form);
  const tableFields = fields.filter((f) => f.show_in_table);

  if (!config && !loading) {
    return (
      <AppLayout>
        <div className="dy-page">
          <div className="dy-empty-state">
            <div className="dy-empty-icon"><i className="bi bi-exclamation-triangle" /></div>
            <p className="dy-empty-title">Module not found</p>
            <p className="dy-empty-sub">The module "{moduleName}" does not exist or is inactive.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* Toast */}
      {toast && (
        <div className={`dy-toast dy-toast-${toast.type}`}>
          <i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"}`} />
          {toast.msg}
          <button className="dy-toast-close" onClick={() => setToast(null)}><i className="bi bi-x" /></button>
        </div>
      )}

      <div className="dy-page">
        {/* Header */}
        <div className="dy-header">
          <div>
            <h5 className="dy-title">{config?.page_title || "Loading..."}</h5>
            <div className="dy-breadcrumb">
              <span>Dynamic CRUD</span>
              <i className="bi bi-chevron-right" />
              <span>{config?.display_name || moduleName}</span>
            </div>
          </div>
          <button className="dy-btn dy-btn-primary" onClick={() => initForm()}>
            <i className="bi bi-plus-lg" /> Add New
          </button>
        </div>

        {/* Search */}
        <div className="dy-filter-card">
          <div className="dy-filter-inner">
            <div className="dy-filter-group" style={{ flex: 1, maxWidth: 340 }}>
              <div className="dy-input-wrap">
                <i className="bi bi-search dy-input-icon" />
                <input
                  className="dy-input"
                  placeholder={config?.search_placeholder || "Search..."}
                  value={searchText}
                  onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                />
                {searchText && (
                  <button className="dy-clear-btn" onClick={() => { setSearchText(""); setCurrentPage(1); }}>
                    <i className="bi bi-x" />
                  </button>
                )}
              </div>
            </div>
            <div className="dy-count-pill">
              <i className="bi bi-database" /> {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="dy-table-card">
          {loading ? (
            <div className="dy-empty-state">
              <div className="dy-empty-icon dy-pulse"><i className="bi bi-cpu" /></div>
              <p className="dy-empty-title">Loading data...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="dy-empty-state">
              <div className="dy-empty-icon"><i className="bi bi-inbox" /></div>
              <p className="dy-empty-title">{config?.empty_message || "No data found"}</p>
              <p className="dy-empty-sub">{config?.empty_sub_message || "Add your first record."}</p>
            </div>
          ) : (
            <>
              <div className="dy-table-wrap">
                <table className="dy-table">
                  <thead>
                    <tr>
                      <th className="dy-th-sm">#</th>
                      {tableFields.map((f) => (
                        <th
                          key={f.field_key}
                          style={{ width: f.table_width !== "auto" ? f.table_width : undefined, textAlign: f.table_align }}
                          className={f.is_sortable ? "dy-sortable" : ""}
                          onClick={() => f.is_sortable && handleSort(f.field_key)}
                        >
                          {f.field_label}
                          {f.is_sortable && sortField === f.field_key && (
                            <i className={`bi bi-caret-${sortOrder === "asc" ? "up" : "down"}-fill dy-sort-icon`} />
                          )}
                        </th>
                      ))}
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((row, i) => (
                      <tr key={row.id} className="dy-tr">
                        <td className="dy-td-muted dy-center">{(currentPage - 1) * ROWS_PER_PAGE + i + 1}</td>
                        {tableFields.map((f) => (
                          <td key={f.field_key} style={{ textAlign: f.table_align }}>
                            {renderCellValue(row[f.field_key], f)}
                          </td>
                        ))}
                        <td>
                          <div className="dy-actions">
                            <button className="dy-action-edit" onClick={() => initForm(row)}>
                              <i className="bi bi-pencil" /> Edit
                            </button>
                            <button className="dy-action-delete" onClick={() => setDeleteConfirm(row.id)}>
                              <i className="bi bi-trash" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="dy-pagination">
                  <button className="dy-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                    <i className="bi bi-chevron-left" /> Prev
                  </button>
                  <div className="dy-page-nums">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        className={`dy-page-num ${currentPage === i + 1 ? "dy-page-num-active" : ""}`}
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button className="dy-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                    Next <i className="bi bi-chevron-right" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="dy-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="dy-modal dy-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="dy-modal-icon dy-modal-icon-danger">
              <i className="bi bi-trash" />
            </div>
            <p className="dy-modal-title">Delete Record?</p>
            <p className="dy-modal-sub">This action cannot be undone.</p>
            <div className="dy-modal-actions">
              <button className="dy-btn dy-btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="dy-btn dy-btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                <i className="bi bi-trash" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="dy-overlay" onClick={() => setShowModal(false)}>
          <div className="dy-modal dy-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="dy-modal-header">
              <div>
                <p className="dy-modal-title">{editItem ? `Edit ${config?.display_name || "Record"}` : `Create ${config?.display_name || "Record"}`}</p>
                <p className="dy-modal-sub">{editItem ? "Update the record details." : "Fill in the fields below."}</p>
              </div>
              <button className="dy-modal-close" onClick={() => setShowModal(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="dy-divider" />

            <div className="dy-form-grid">
              {formFields.map((field) => {
                // Check depends_on
                if (field.depends_on && field.depends_value) {
                  const depVal = form[field.depends_on];
                  if (String(depVal) !== String(field.depends_value)) return null;
                }

                return (
                  <div key={field.field_key} className={`dy-field ${field.field_type === "textarea" ? "dy-field-full" : ""}`}>
                    <label className="dy-label">
                      {field.field_label}
                      {field.is_required && <span className="dy-required">*</span>}
                    </label>
                    <FieldRenderer
                      field={field}
                      value={form[field.field_key]}
                      onChange={(val) => setForm((prev) => ({ ...prev, [field.field_key]: val }))}
                    />
                    {field.help_text && <p className="dy-help">{field.help_text}</p>}
                    {formErrors[field.field_key] && (
                      <p className="dy-error">{formErrors[field.field_key]}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="dy-divider" />

            <div className="dy-modal-footer">
              <button className="dy-btn dy-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="dy-btn dy-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><i className="bi bi-arrow-repeat dy-spin" /> Saving...</>
                ) : (
                  <><i className="bi bi-check-lg" /> {editItem ? "Save Changes" : "Create"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function renderCellValue(value, field) {
  if (value === null || value === undefined || value === "") return <span className="dy-td-muted">—</span>;

  switch (field.field_type) {
    case "toggle":
    case "checkbox":
      return value === 1 || value === "1" || value === true
        ? <span className="dy-badge dy-badge-green"><i className="bi bi-check-lg" /> Yes</span>
        : <span className="dy-badge dy-badge-gray"><i className="bi bi-x-lg" /> No</span>;
    case "select":
      return <span className="dy-badge dy-badge-blue">{value}</span>;
    default:
      return String(value);
  }
}

// ══════════════════════════════════════
// STYLES
// ══════════════════════════════════════
const styles = `
  .dy-page { padding: 0; }

  /* ── Toast ── */
  .dy-toast {
    position: fixed; top: 20px; right: 20px; z-index: 1100;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: var(--radius-lg);
    font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12); animation: dy-fade-in 0.2s ease;
  }
  .dy-toast-success { background: #ECFDF5; color: #059669; border: 1px solid #6ee7b7; }
  .dy-toast-error   { background: #FEF2F2; color: #DC2626; border: 1px solid #fca5a5; }
  .dy-toast-close { margin-left: 6px; background: none; border: none; cursor: pointer; color: inherit; font-size: 15px; display: flex; align-items: center; }

  /* ── Header ── */
  .dy-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
  .dy-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
  .dy-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
  .dy-breadcrumb i { font-size: 10px; opacity: 0.5; }

  /* ── Filter ── */
  .dy-filter-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    padding: 18px 20px; margin-bottom: 16px;
  }
  .dy-filter-inner { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
  .dy-filter-group { display: flex; flex-direction: column; gap: 6px; }
  .dy-input-wrap { position: relative; display: flex; align-items: center; }
  .dy-input-icon { position: absolute; left: 11px; color: var(--text-muted); font-size: 13px; pointer-events: none; z-index: 1; }
  .dy-input {
    width: 100%; padding: 9px 12px 9px 34px; border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface); font-size: 13px; color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .dy-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }
  .dy-clear-btn {
    position: absolute; right: 9px; background: none; border: none;
    cursor: pointer; color: var(--text-muted); font-size: 15px;
    display: flex; align-items: center; padding: 0; transition: color 0.15s;
  }
  .dy-clear-btn:hover { color: var(--text-primary); }
  .dy-count-pill {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 600; color: var(--text-secondary);
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 20px; padding: 5px 12px; white-space: nowrap; align-self: flex-end;
  }

  /* ── Table Card ── */
  .dy-table-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow); overflow: hidden;
  }

  /* ── Empty ── */
  .dy-empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 60px 20px; text-align: center;
  }
  .dy-empty-icon {
    width: 60px; height: 60px; border-radius: 50%;
    background: #EEF2FF; color: var(--primary); font-size: 24px;
    display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
  }
  .dy-pulse { animation: dy-pulse 1.5s ease-in-out infinite; }
  @keyframes dy-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.95); } }
  .dy-empty-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
  .dy-empty-sub   { font-size: 12.5px; color: var(--text-muted); margin: 0; }

  /* ── Table ── */
  .dy-table-wrap { overflow-x: auto; }
  .dy-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .dy-table thead tr { border-bottom: 2px solid var(--border); }
  .dy-table th {
    padding: 11px 16px; font-size: 10.5px; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.06em; text-align: left;
    white-space: nowrap; background: var(--bg);
  }
  .dy-th-sm { width: 56px; text-align: center; }
  .dy-sortable { cursor: pointer; user-select: none; }
  .dy-sortable:hover { color: var(--primary); }
  .dy-sort-icon { margin-left: 4px; font-size: 10px; }
  .dy-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .dy-table tbody tr:last-child td { border-bottom: none; }
  .dy-tr { transition: background 0.1s; }
  .dy-tr:hover td { background: #fafbff; }
  .dy-td-muted { color: var(--text-secondary); font-size: 12.5px; }
  .dy-center { text-align: center; }

  /* ── Actions ── */
  .dy-actions { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
  .dy-action-edit {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 12px; background: #EEF2FF; color: #5048E5;
    border: 1px solid #c7d2fe; border-radius: var(--radius);
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: background 0.15s; font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .dy-action-edit:hover { background: #e0e7ff; }
  .dy-action-delete {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 12px; background: #FEF2F2; color: #DC2626;
    border: 1px solid #fca5a5; border-radius: var(--radius);
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: background 0.15s; font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .dy-action-delete:hover { background: #fee2e2; }

  /* ── Badges ── */
  .dy-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap;
  }
  .dy-badge-green { background: #ECFDF5; color: #059669; border: 1px solid #6ee7b7; }
  .dy-badge-gray  { background: #F3F4F6; color: #6B7280; border: 1px solid #D1D5DB; }
  .dy-badge-blue  { background: #EEF2FF; color: #5048E5; border: 1px solid #c7d2fe; }

  /* ── Pagination ── */
  .dy-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 14px 16px; border-top: 1px solid var(--border); }
  .dy-page-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 16px; background: var(--surface);
    border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 12.5px; font-weight: 600; color: var(--text-primary);
    cursor: pointer; transition: all 0.15s; font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .dy-page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }
  .dy-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .dy-page-nums { display: flex; align-items: center; gap: 4px; }
  .dy-page-num {
    width: 32px; height: 32px; border-radius: var(--radius);
    border: 1px solid var(--border); background: var(--surface);
    font-size: 12.5px; font-weight: 600; color: var(--text-primary);
    cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .dy-page-num:hover { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }
  .dy-page-num-active { background: var(--primary); color: #fff; border-color: var(--primary); }

  /* ── Buttons ── */
  .dy-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px; border-radius: var(--radius);
    font-size: 13px; font-weight: 600; cursor: pointer;
    transition: all 0.15s; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap;
    border: none;
  }
  .dy-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .dy-btn-primary { background: #5048E5; color: #fff; }
  .dy-btn-primary:hover:not(:disabled) { background: #4338CA; transform: translateY(-1px); color: #fff; }
  .dy-btn-danger { background: #DC2626; color: #fff; }
  .dy-btn-danger:hover:not(:disabled) { background: #b91c1c; }
  .dy-btn-outline { background: var(--surface); border: 1px solid var(--border); color: var(--text-secondary); }
  .dy-btn-outline:hover { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }

  /* ── Overlay + Modal ── */
  .dy-overlay {
    position: fixed; inset: 0; background: rgba(17,24,39,0.45); backdrop-filter: blur(2px);
    z-index: 1000; display: flex; align-items: center; justify-content: center;
    animation: dy-fade-in 0.15s ease; padding: 16px;
  }
  .dy-modal {
    background: var(--surface); border-radius: var(--radius-lg);
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    padding: 28px; width: 80%; max-height: calc(100vh - 32px);
    animation: dy-modal-in 0.2s ease; text-align: center;
  }
  .dy-modal-lg { max-width: 720px; text-align: left; overflow-y: auto; }
  .dy-modal-sm { max-width: 400px; }
  .dy-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 0; }
  .dy-modal-close {
    background: none; border: none; cursor: pointer; color: var(--text-muted);
    font-size: 16px; padding: 4px; border-radius: var(--radius);
    transition: all 0.15s; display: flex; align-items: center; flex-shrink: 0;
  }
  .dy-modal-close:hover { color: var(--text-primary); background: var(--bg); }
  .dy-modal-icon {
    width: 56px; height: 56px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; margin: 0 auto 14px;
  }
  .dy-modal-icon-danger { background: #FEF2F2; color: #DC2626; }
  .dy-modal-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
  .dy-modal-sub   { font-size: 12.5px; color: var(--text-muted); margin: 0 0 20px; }
  .dy-modal-actions { display: flex; align-items: center; justify-content: center; gap: 10px; }
  .dy-modal-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .dy-divider { border: none; border-top: 1px solid var(--border); margin: 20px 0; }

  @keyframes dy-fade-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes dy-modal-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
  .dy-spin { animation: dy-spin 0.7s linear infinite; display: inline-block; }
  @keyframes dy-spin { to { transform: rotate(360deg); } }

  /* ── Form Fields ── */
  .dy-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; }
  .dy-field { display: flex; flex-direction: column; gap: 6px; }
  .dy-field-full { grid-column: 1 / -1; }
  .dy-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
  .dy-required { color: #DC2626; margin-left: 2px; }
  .dy-help { font-size: 11px; color: var(--text-muted); margin: 0; }
  .dy-error { font-size: 11px; color: #DC2626; margin: 0; font-weight: 600; }

  /* ── Input Types ── */
  .dy-input, .dy-textarea {
    padding: 9px 12px; border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface); font-size: 13px; color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s; width: 100%; box-sizing: border-box;
  }
  .dy-input:focus, .dy-textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }
  .dy-textarea { resize: vertical; min-height: 80px; }
  select.dy-input { cursor: pointer; }

  /* ── Toggle ── */
  .dy-toggle-wrap { position: relative; display: inline-block; cursor: pointer; padding-top: 2px; }
  .dy-toggle-wrap input { position: absolute; opacity: 0; width: 0; height: 0; }
  .dy-toggle-track {
    display: block; width: 40px; height: 22px; border-radius: 20px;
    background: #d1d5db; transition: background 0.2s; position: relative;
  }
  .dy-toggle-thumb {
    position: absolute; top: 3px; left: 3px;
    width: 16px; height: 16px; border-radius: 50%;
    background: #fff; transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
  .dy-toggle-wrap input:checked + .dy-toggle-track { background: #5048E5; }
  .dy-toggle-wrap input:checked + .dy-toggle-track .dy-toggle-thumb { transform: translateX(18px); }

  /* ── Checkbox ── */
  .dy-check-wrap { display: inline-flex; align-items: center; cursor: pointer; padding-top: 2px; }
  .dy-check-wrap input { position: absolute; opacity: 0; width: 0; height: 0; }
  .dy-check-box {
    width: 20px; height: 20px; border: 2px solid var(--border); border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; background: var(--surface);
  }
  .dy-check-wrap input:checked + .dy-check-box { background: #5048E5; border-color: #5048E5; }
  .dy-check-wrap input:checked + .dy-check-box::after { content: "✓"; color: #fff; font-size: 12px; font-weight: 700; }

  /* ── Radio ── */
  .dy-radio-group { display: flex; gap: 16px; flex-wrap: wrap; padding-top: 2px; }
  .dy-radio-wrap { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: var(--text-primary); }
  .dy-radio-wrap input { position: absolute; opacity: 0; width: 0; height: 0; }
  .dy-radio-circle {
    width: 18px; height: 18px; border: 2px solid var(--border); border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; flex-shrink: 0;
  }
  .dy-radio-wrap input:checked + .dy-radio-circle { border-color: #5048E5; }
  .dy-radio-wrap input:checked + .dy-radio-circle::after {
    content: ""; width: 8px; height: 8px; border-radius: 50%; background: #5048E5;
  }

  @media (max-width: 560px) { .dy-form-grid { grid-template-columns: 1fr; } }
`;
