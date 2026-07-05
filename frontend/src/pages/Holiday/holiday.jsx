import { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";
import { Link } from "react-router-dom";

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const getDayName = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long" });
};

const DAY_COLORS = {
  Sunday:    { bg: "#FEF2F2", color: "#DC2626", border: "#fca5a5" },
  Saturday:  { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" },
  Monday:    { bg: "#EEF2FF", color: "#5048E5", border: "#c7d2fe" },
  Tuesday:   { bg: "#ECFDF5", color: "#059669", border: "#6ee7b7" },
  Wednesday: { bg: "#FAF5FF", color: "#7C3AED", border: "#ddd6fe" },
  Thursday:  { bg: "#EFF6FF", color: "#2563EB", border: "#bfdbfe" },
  Friday:    { bg: "#FDF4FF", color: "#9333EA", border: "#e9d5ff" },
};

const ROWS_PER_PAGE = 10;

export default function Holiday() {
  const [holidays, setHolidays]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [searchText, setSearchText]     = useState("");
  const [showModal, setShowModal]       = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [form, setForm]                 = useState({ name: "", date: "" });
  const [error, setError]               = useState("");
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage]   = useState(1);

  useEffect(() => { loadHolidays(); }, []);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load ──
  const loadHolidays = async () => {
    setLoading(true);
    try {
      const res  = await api.get("/holidays/list");
      const data = res.data || [];
      setHolidays(data.map((h) => ({
        id:   h?.id,
        name: h?.name || "",
        date: h?.date || "",
        day:  h?.date ? getDayName(h.date) : "",
      })));
    } catch (err) {
      console.error(err);
      setHolidays([]);
      showToast("Failed to load holidays.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Filter + paginate ──
  const filtered = holidays.filter((h) => {
    const t = searchText.toLowerCase();
    return (
      (h.name || "").toLowerCase().includes(t) ||
      (h.date || "").toLowerCase().includes(t) ||
      (h.day  || "").toLowerCase().includes(t)
    );
  });
  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // ── Modal ──
  const handleModal = (holiday = null) => {
    setSelectedHoliday(holiday || null);
    setForm(holiday ? { name: holiday.name, date: holiday.date } : { name: "", date: "" });
    setError("");
    setShowModal(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ── Save ──
  const handleSave = async () => {
    if (!form.name || !form.date) { setError("Please fill in all fields."); return; }
    setSaving(true);
    try {
      if (selectedHoliday) {
        await api.put(`/holidays/${selectedHoliday.id}`, form);
        showToast("Holiday updated successfully.", "success");
      } else {
        await api.post("/holidays/create", form);
        showToast("Holiday added successfully.", "success");
      }
      setShowModal(false);
      loadHolidays();
    } catch (err) {
      console.error(err);
      setError("Failed to save holiday.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    try {
      await api.delete(`/holidays/${id}`);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      setDeleteConfirm(null);
      showToast("Holiday deleted.", "success");
    } catch (err) {
      console.error(err);
      showToast("Delete failed.", "error");
    }
  };

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
          <h5 className="sr-page-title">Holidays</h5>
          <nav className="sr-breadcrumb">
            <Link to="/">Home</Link>
            <i className="bi bi-chevron-right" />
            <span>Setup</span>
            <i className="bi bi-chevron-right" />
            <span>Holidays</span>
          </nav>
        </div>
        <button className="cu-save-btn" onClick={() => handleModal()}>
          <i className="bi bi-plus-lg" /> Add Holiday
        </button>
      </div>

      {/* ── SEARCH CARD ── */}
      <div className="sr-filter-card">
        <div className="sr-filter-inner">
          <div className="sr-filter-group" style={{ flex: 1, maxWidth: 340 }}>
            <label className="sr-label">Search Holidays</label>
            <div className="sr-input-wrap">
              <i className="bi bi-search sr-input-icon" />
              <input
                className="sr-input"
                placeholder="Search by name, date or day…"
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
              />
              {searchText && (
                <button className="ul-clear-btn" onClick={() => { setSearchText(""); setCurrentPage(1); }}>
                  <i className="bi bi-x" />
                </button>
              )}
            </div>
          </div>
          <div className="ul-count-pill">
            <i className="bi bi-calendar-event" /> {filtered.length} holiday{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="ul-table-card">

        {loading && (
          <div className="sr-empty-state">
            <div className="sr-empty-icon sr-pulse"><i className="bi bi-cpu" /></div>
            <p className="sr-empty-title">Loading holidays…</p>
            <p className="sr-empty-sub">Fetching holiday data, please wait</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="sr-empty-state">
            <div className="sr-empty-icon"><i className="bi bi-calendar-x" /></div>
            <p className="sr-empty-title">No holidays found</p>
            <p className="sr-empty-sub">
              {searchText ? "Try a different search term" : "Click \"Add Holiday\" to get started"}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            <div className="sr-table-wrap">
              <table className="sr-table">
                <thead>
                  <tr>
                    <th className="sr-th-sm">#</th>
                    <th>Holiday Name</th>
                    <th>Date</th>
                    <th>Day</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((h, i) => {
                    const dc = DAY_COLORS[h.day] || { bg: "#F3F4F6", color: "#6B7280", border: "#D1D5DB" };
                    return (
                      <tr key={h.id} className="sr-tr">
                        <td className="sr-td-muted sr-center">{(currentPage - 1) * ROWS_PER_PAGE + i + 1}</td>
                        <td>
                          <div className="hl-name-cell">
                            <div className="hl-cal-icon"><i className="bi bi-calendar2-heart" /></div>
                            <span className="ul-name">{h.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="hl-date-pill">
                            <i className="bi bi-calendar3" /> {formatDate(h.date)}
                          </span>
                        </td>
                        <td>
                          <span
                            className="sr-status-pill"
                            style={{ background: dc.bg, color: dc.color, borderColor: dc.border }}
                          >
                            {h.day || "—"}
                          </span>
                        </td>
                        <td>
                          <div className="ul-actions">
                            <button className="ul-edit-btn" onClick={() => handleModal(h)}>
                              <i className="bi bi-pencil" /> Edit
                            </button>
                            <button className="ul-delete-btn" onClick={() => setDeleteConfirm(h.id)}>
                              <i className="bi bi-trash" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
                    >{i + 1}</button>
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
            <div className="ul-modal-icon ul-modal-icon-danger"><i className="bi bi-trash" /></div>
            <p className="ul-modal-title">Delete Holiday?</p>
            <p className="ul-modal-sub">This action cannot be undone.</p>
            <div className="ul-modal-actions">
              <button className="cu-back-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="ul-delete-confirm-btn" onClick={() => handleDelete(deleteConfirm)}>
                <i className="bi bi-trash" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {showModal && (
        <div className="ul-overlay" onClick={() => setShowModal(false)}>
          <div className="ul-modal ul-modal-sm" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="ul-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="cu-form-icon">
                  <i className={`bi ${selectedHoliday ? "bi-pencil-square" : "bi-calendar-plus"}`} />
                </div>
                <div>
                  <p className="ul-modal-title" style={{ margin: 0, textAlign: "left" }}>
                    {selectedHoliday ? "Edit Holiday" : "Add Holiday"}
                  </p>
                  <p className="ul-modal-sub" style={{ margin: 0, textAlign: "left" }}>
                    {selectedHoliday ? "Update the holiday details below." : "Fill in the details to add a new holiday."}
                  </p>
                </div>
              </div>
              <button className="ul-modal-close" onClick={() => setShowModal(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="cu-divider" />

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>

              <div className="cu-field-group">
                <label className="sr-label">Holiday Name</label>
                <div className="sr-input-wrap">
                  <i className="bi bi-calendar-heart sr-input-icon" />
                  <input
                    className="sr-input"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Christmas Day"
                  />
                </div>
              </div>

              <div className="cu-field-group">
                <label className="sr-label">Date</label>
                <div className="sr-input-wrap">
                  <i className="bi bi-calendar3 sr-input-icon" />
                  <input
                    className="sr-input"
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                  />
                </div>
                {form.date && (
                  <span className="hl-day-preview">
                    <i className="bi bi-info-circle" /> Falls on a <strong>{getDayName(form.date)}</strong>
                  </span>
                )}
              </div>

              {error && (
                <span className="cu-field-error">
                  <i className="bi bi-exclamation-circle" /> {error}
                </span>
              )}
            </div>

            <div className="cu-divider" />

            {/* Actions */}
            <div className="cu-actions">
              <button className="cu-back-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="cu-save-btn" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><i className="bi bi-arrow-repeat sr-spin" /> Saving…</>
                  : <><i className="bi bi-check-lg" /> {selectedHoliday ? "Save Changes" : "Add Holiday"}</>}
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
  .sr-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
  .sr-page-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; letter-spacing: -0.01em; }
  .sr-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
  .sr-breadcrumb a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .sr-breadcrumb a:hover { text-decoration: underline; }
  .sr-breadcrumb i { font-size: 10px; opacity: 0.5; }

  /* ── Filter card ── */
  .sr-filter-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow); padding: 18px 20px; margin-bottom: 16px; }
  .sr-filter-inner { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
  .sr-filter-group { display: flex; flex-direction: column; gap: 6px; }
  .sr-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
  .sr-input-wrap { position: relative; display: flex; align-items: center; }
  .sr-input-icon { position: absolute; left: 11px; color: var(--text-muted); font-size: 13px; pointer-events: none; z-index: 1; }
  .sr-input { width: 100%; padding: 9px 12px 9px 34px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); font-size: 13px; color: var(--text-primary); font-family: 'Plus Jakarta Sans', sans-serif; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
  .sr-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }

  .ul-clear-btn { position: absolute; right: 9px; background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 15px; display: flex; align-items: center; padding: 0; transition: color 0.15s; }
  .ul-clear-btn:hover { color: var(--text-primary); }
  .ul-count-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-secondary); background: var(--bg); border: 1px solid var(--border); border-radius: 20px; padding: 5px 12px; white-space: nowrap; align-self: flex-end; }

  /* ── Table card ── */
  .ul-table-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow); overflow: hidden; }

  /* ── Empty / loading ── */
  .sr-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; }
  .sr-empty-icon { width: 60px; height: 60px; border-radius: 50%; background: #EEF2FF; color: var(--primary); font-size: 24px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
  .sr-pulse { animation: sr-pulse 1.5s ease-in-out infinite; }
  @keyframes sr-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(0.95); } }
  .sr-empty-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
  .sr-empty-sub   { font-size: 12.5px; color: var(--text-muted); margin: 0; }

  /* ── Table ── */
  .sr-table-wrap { overflow-x: auto; }
  .sr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .sr-table thead tr { border-bottom: 2px solid var(--border); }
  .sr-table th { padding: 11px 16px; font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; text-align: left; white-space: nowrap; background: var(--bg); }
  .sr-th-sm { width: 56px; text-align: center; }
  .sr-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .sr-table tbody tr:last-child td { border-bottom: none; }
  .sr-tr { transition: background 0.1s; }
  .sr-tr:hover td { background: #fafbff; }
  .sr-td-muted { color: var(--text-secondary); font-size: 12.5px; }
  .sr-center { text-align: center; }

  /* ── Holiday-specific cells ── */
  .hl-name-cell { display: flex; align-items: center; gap: 10px; }
  .hl-cal-icon { width: 32px; height: 32px; border-radius: var(--radius); background: #EEF2FF; color: var(--primary); font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ul-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
  .hl-date-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-secondary); background: var(--bg); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; white-space: nowrap; }
  .sr-status-pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid; white-space: nowrap; }

  /* ── Day preview in modal ── */
  .hl-day-preview { font-size: 11.5px; color: var(--text-muted); display: flex; align-items: center; gap: 5px; margin-top: 2px; }

  /* ── Actions ── */
  .ul-actions { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
  .ul-edit-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; background: #EEF2FF; color: #5048E5; border: 1px solid #c7d2fe; border-radius: var(--radius); font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.12s; font-family: 'Plus Jakarta Sans', sans-serif; }
  .ul-edit-btn:hover { background: #e0e7ff; transform: translateY(-1px); }
  .ul-delete-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; background: #FEF2F2; color: #DC2626; border: 1px solid #fca5a5; border-radius: var(--radius); font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.12s; font-family: 'Plus Jakarta Sans', sans-serif; }
  .ul-delete-btn:hover { background: #fee2e2; transform: translateY(-1px); }

  /* ── Pagination ── */
  .ul-pagination { padding: 14px 16px; border-top: 1px solid var(--border); }
  .sh-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .sh-page-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); font-size: 12.5px; font-weight: 600; color: var(--text-primary); cursor: pointer; transition: border-color 0.15s, background 0.15s, color 0.15s; font-family: 'Plus Jakarta Sans', sans-serif; }
  .sh-page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }
  .sh-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .sh-page-numbers { display: flex; align-items: center; gap: 4px; }
  .sh-page-num { width: 32px; height: 32px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface); font-size: 12.5px; font-weight: 600; color: var(--text-primary); cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; font-family: 'Plus Jakarta Sans', sans-serif; }
  .sh-page-num:hover { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }
  .sh-page-num-active { background: var(--primary); color: #fff; border-color: var(--primary); }

  /* ── Buttons ── */
  .cu-save-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; background: #059669; color: #fff; border: none; border-radius: var(--radius); font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; transition: background 0.15s, transform 0.15s; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; }
  .cu-save-btn:hover:not(:disabled) { background: #047857; transform: translateY(-1px); color: #fff; }
  .cu-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .cu-back-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s; font-family: 'Plus Jakarta Sans', sans-serif; }
  .cu-back-btn:hover { border-color: var(--primary); color: var(--primary); background: #EEF2FF; }

  /* ── Overlay / Modal ── */
  .ul-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; animation: sr-fade-in 0.15s ease; padding: 16px; }
  .ul-modal { background: var(--surface); border-radius: var(--radius-lg); box-shadow: 0 20px 60px rgba(0,0,0,0.2); padding: 28px; width: 100%; max-width: 400px; animation: ul-slide-up 0.2s ease; text-align: center; }
  .ul-modal-sm { max-width: 460px; text-align: left; }
  @keyframes ul-slide-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .ul-modal-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 12px; }
  .ul-modal-close { background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 16px; padding: 4px; border-radius: var(--radius); transition: color 0.15s, background 0.15s; display: flex; align-items: center; flex-shrink: 0; }
  .ul-modal-close:hover { color: var(--text-primary); background: var(--bg); }
  .ul-modal-icon { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; margin: 0 auto 14px; }
  .ul-modal-icon-danger { background: #FEF2F2; color: #DC2626; }
  .ul-modal-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
  .ul-modal-sub   { font-size: 12.5px; color: var(--text-muted); margin: 0 0 20px; }
  .ul-modal-actions { display: flex; align-items: center; justify-content: center; gap: 10px; }
  .ul-delete-confirm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 20px; background: #DC2626; color: #fff; border: none; border-radius: var(--radius); font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; font-family: 'Plus Jakarta Sans', sans-serif; }
  .ul-delete-confirm-btn:hover { background: #b91c1c; }

  /* ── Form helpers ── */
  .cu-form-icon { width: 40px; height: 40px; border-radius: var(--radius); background: #EEF2FF; color: var(--primary); font-size: 18px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .cu-divider { border: none; border-top: 1px solid var(--border); margin: 0 0 20px; }
  .cu-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .cu-field-group { display: flex; flex-direction: column; gap: 6px; }
  .cu-field-error { display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: #DC2626; }

  /* ── Animations ── */
  .sr-spin { animation: sr-spin 0.7s linear infinite; display: inline-block; }
  @keyframes sr-spin    { to { transform: rotate(360deg); } }
  @keyframes sr-fade-in { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
`;
