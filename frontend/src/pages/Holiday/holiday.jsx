import { useState, useEffect, useMemo } from "react";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";
import { Link } from "react-router-dom";
import SharedDatePicker from "../../components/SharedDatePicker";

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
  Sunday:    { bg: "var(--danger-soft)", color: "var(--danger)", border: "#fca5a5" },
  Saturday:  { bg: "var(--orange-soft)", color: "var(--orange)", border: "color-mix(in srgb, var(--orange) 40%, transparent)" },
  Monday:    { bg: "var(--primary-soft)", color: "var(--primary)", border: "color-mix(in srgb, var(--primary) 40%, transparent)" },
  Tuesday:   { bg: "var(--success-soft)", color: "var(--success)", border: "#6ee7b7" },
  Wednesday: { bg: "var(--purple-soft)", color: "var(--purple)", border: "#ddd6fe" },
  Thursday:  { bg: "var(--primary-soft)", color: "var(--primary)", border: "color-mix(in srgb, var(--primary) 40%, transparent)" },
  Friday:    { bg: "var(--purple-soft)", color: "var(--purple)", border: "#e9d5ff" },
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
  const [expandedYears, setExpandedYears] = useState({});

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

  // Group holidays by year
  const holidaysByYear = useMemo(() => {
    const groups = {};
    filtered.forEach((h) => {
      const year = h.date ? new Date(h.date).getFullYear() : "Unknown";
      if (!groups[year]) groups[year] = [];
      groups[year].push(h);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, items]) => ({
        year: Number(year),
        holidays: items.sort((a, b) => new Date(a.date) - new Date(b.date)),
      }));
  }, [filtered]);

  // ── Modal ──
  const handleModal = (holiday = null) => {
    setSelectedHoliday(holiday || null);
    setForm(holiday ? { name: holiday.name, date: holiday.date } : { name: "", date: "" });
    setError("");
    setShowModal(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleYear = (year) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }));
  };

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
          <button className="sr-toast-close" title="Close" onClick={() => setToast(null)}><i className="bi bi-x" /></button>
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

      {/* ── CARD (module-wise) ── */}
      <div className="ul-table-card">
        <div className="ul-toolbar">
          <div className="sr-input-wrap ul-search-wrap">
            <i className="bi bi-search sr-input-icon" />
            <input
              className="sr-input ul-search"
              placeholder="Search by name, date or day…"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
            />
            {searchText && (
              <button className="ul-clear-btn" title="Clear search" onClick={() => { setSearchText(""); setCurrentPage(1); }}>
                <i className="bi bi-x" />
              </button>
            )}
          </div>
          <span className="ul-count-pill">
            <i className="bi bi-calendar-event" /> {filtered.length} holiday{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

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

        {!loading && holidaysByYear.map(({ year, holidays: yearHolidays }) => {
          const isExpanded = expandedYears[year] !== false;
          return (
            <div key={year}>
              {/* Year Header */}
              <div
                onClick={() => toggleYear(year)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 20px", cursor: "pointer", userSelect: "none",
                  background: "var(--bg-muted)",
                  borderBottom: isExpanded ? "1px solid var(--border-soft)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="bi bi-calendar3" style={{ fontSize: 16, color: "var(--primary)" }} />
                  <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{year}</span>
                  <span className="ul-badge ul-badge-primary" style={{ fontSize: 11 }}>{yearHolidays.length} holiday{yearHolidays.length !== 1 ? "s" : ""}</span>
                </div>
                <i className={`bi bi-chevron-${isExpanded ? "up" : "down"}`} style={{ fontSize: 14, color: "var(--t-muted)" }} />
              </div>

              {/* Holiday List */}
              {isExpanded && (
                <div style={{ padding: 0 }}>
                  {yearHolidays.map((h, idx) => {
                    const dc = DAY_COLORS[h.day] || { bg: "var(--bg-muted)", color: "var(--t-muted)", border: "var(--border)" };
                    return (
                      <div
                        key={h.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "12px 20px",
                          borderBottom: idx < yearHolidays.length - 1 ? "1px solid var(--border-soft)" : "none",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: 10, display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center", background: dc.bg,
                            flexShrink: 0,
                          }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: dc.color, lineHeight: 1 }}>
                              {h.date ? new Date(h.date).getDate() : "—"}
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 600, color: dc.color, textTransform: "uppercase", lineHeight: 1, marginTop: 1 }}>
                              {h.date ? new Date(h.date).toLocaleDateString("en-US", { month: "short" }) : ""}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text)" }}>{h.name}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                              <span style={{ fontSize: 12, color: "var(--t-muted)" }}>{formatDate(h.date)}</span>
                              <span
                                className="sr-status-pill"
                                style={{ background: dc.bg, color: dc.color, borderColor: dc.border, fontSize: 11, padding: "1px 8px" }}
                              >
                                {h.day || "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="sh-actions">
                          <button
                            className="sh-action-btn sh-action-edit"
                            title="Edit"
                            onClick={() => handleModal(h)}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            className="sh-action-btn sh-action-delete"
                            title="Delete"
                            onClick={() => setDeleteConfirm(h.id)}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteConfirm && (
        <div className="ul-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="ul-modal ul-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="ul-modal-icon ul-modal-icon-danger"><i className="bi bi-trash" /></div>
            <h6 className="ul-modal-title">Delete Holiday?</h6>
            <p className="ul-modal-sub">This action cannot be undone.</p>
            <div className="ul-modal-divider" />
            <div className="ul-modal-footer">
              <button className="ul-btn ul-btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="ul-btn ul-btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                <i className="bi bi-trash" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {showModal && (
        <div className="ul-overlay" onClick={() => setShowModal(false)}>
          <div className="ul-modal ul-modal-md" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="ul-modal-header">
              <div className="ul-modal-header-left">
                <div className={`ul-modal-icon ${selectedHoliday ? "ul-modal-icon-primary" : "ul-modal-icon-success"}`}>
                  <i className={`bi ${selectedHoliday ? "bi-pencil-square" : "bi-calendar-plus"}`} />
                </div>
                <div>
                  <h6 className="ul-modal-title">{selectedHoliday ? "Edit Holiday" : "Add Holiday"}</h6>
                  <p className="ul-modal-sub">{selectedHoliday ? "Update the holiday details below" : "Fill in the details to add a new holiday"}</p>
                </div>
              </div>
              <button className="ul-modal-close" title="Close" onClick={() => setShowModal(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="ul-modal-divider" />

            {/* Fields */}
            <div className="ul-modal-body">
              <div className="ul-form-grid-2">
                <div className="ul-field" style={{ gridColumn: "span 2" }}>
                  <label className="ul-label">Holiday Name</label>
                  <input
                    className="ul-input"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Christmas Day"
                  />
                </div>

                <div className="ul-field" style={{ gridColumn: "span 2" }}>
                  <label className="ul-label">Date</label>
                  <SharedDatePicker
                    value={form.date}
                    onChange={(val) => setForm({ ...form, date: val })}
                    className="ul-input"
                    placeholder="Select date"
                  />
                  {form.date && (
                    <span style={{ fontSize: 11.5, color: "var(--t-muted)", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                      <i className="bi bi-info-circle" /> Falls on a <strong>{getDayName(form.date)}</strong>
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <span className="ul-field-error">
                  <i className="bi bi-exclamation-circle" /> {error}
                </span>
              )}
            </div>

            <div className="ul-modal-divider" />

            {/* Actions */}
            <div className="ul-modal-footer">
              <button className="ul-btn ul-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="ul-btn ul-btn-primary" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
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
    font-size: 13px; font-weight: 600; font-family: var(--font);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12); animation: sr-fade-in 0.2s ease;
  }
  .sr-toast-success { background: var(--success-soft); color: var(--success); }
  .sr-toast-error   { background: var(--danger-soft); color: var(--danger); }
  .sr-toast-close { margin-left: 6px; background: none; border: none; cursor: pointer; color: inherit; font-size: 15px; display: flex; align-items: center; }

  /* ── Page header ── */
  .sr-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
  .sr-page-title { font-size: 24px; font-weight: 800; color: var(--t-base); margin: 0; letter-spacing: -0.02em; }
  .sr-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--t-muted); margin-top: 6px; }
  .sr-breadcrumb a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .sr-breadcrumb a:hover { text-decoration: underline; }
  .sr-breadcrumb i { font-size: 10px; opacity: 0.5; }

  /* ── Toolbar (module-wise) ── */
  .ul-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--border-soft); gap: 12px; }
  .ul-search-wrap { flex: 1; max-width: 360px; }
  .sr-input-wrap { position: relative; display: flex; align-items: center; }
  .sr-input-icon { position: absolute; left: 11px; color: var(--t-muted); font-size: 13px; pointer-events: none; z-index: 1; }
  .sr-input, .ul-search { width: 100%; padding: 8px 32px 8px 34px; border: none; border-radius: var(--radius); background: var(--bg-muted); font-size: 13px; color: var(--t-base); font-family: var(--font); outline: none; transition: box-shadow 0.15s; }
  .sr-input:focus, .ul-search:focus { box-shadow: 0 0 0 3px rgba(80,72,229,0.18); }

  .ul-clear-btn { position: absolute; right: 9px; background: none; border: none; cursor: pointer; color: var(--t-muted); font-size: 15px; display: flex; align-items: center; padding: 0; transition: color 0.15s; }
  .ul-clear-btn:hover { color: var(--t-base); }
  .ul-count-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--t-muted); background: var(--bg-card); box-shadow: var(--shadow-sm); border-radius: 20px; padding: 3px 10px; white-space: nowrap; }

  /* ── Table card ── */
  .ul-table-card { background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card), 0 24px 60px -30px rgba(15, 23, 42, 0.20); overflow: hidden; }

  /* ── Action buttons (module-wise) ── */
  .sh-actions { display: flex; align-items: center; gap: 6px; }
  .sh-action-btn { width: 30px; height: 30px; border: none; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 12px; transition: all 0.15s; }
  .sh-action-edit { background: var(--primary-soft); color: var(--primary); }
  .sh-action-edit:hover { background: var(--primary); color: #fff; }
  .sh-action-delete { background: var(--danger-soft); color: var(--danger); }
  .sh-action-delete:hover { background: var(--danger); color: #fff; }

  /* ── Empty / loading ── */
  .sr-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; }
  .sr-empty-icon { width: 60px; height: 60px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); font-size: 24px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
  .sr-pulse { animation: sr-pulse 1.5s ease-in-out infinite; }
  @keyframes sr-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(0.95); } }
  .sr-empty-title { font-size: 14px; font-weight: 700; color: var(--t-base); margin: 0 0 4px; }
  .sr-empty-sub   { font-size: 12.5px; color: var(--t-muted); margin: 0; }

  /* ── Holiday-specific cells ── */
  .hl-name-cell { display: flex; align-items: center; gap: 10px; }
  .hl-cal-icon { width: 32px; height: 32px; border-radius: var(--radius); background: var(--primary-soft); color: var(--primary); font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ul-name { font-size: 13px; font-weight: 600; color: var(--t-base); }
  .hl-date-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--t-muted); background: var(--bg-card); box-shadow: var(--shadow-sm); border-radius: 20px; padding: 3px 10px; white-space: nowrap; }
  .sr-status-pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }

  /* ── Day preview in modal ── */
  .hl-day-preview { font-size: 11.5px; color: var(--t-muted); display: flex; align-items: center; gap: 5px; margin-top: 2px; }

  /* ── Pagination ── */
  .ul-pagination { padding: 14px 16px; border-top: 1px solid var(--border-soft); }
  .sh-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .sh-page-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--bg-muted); border: none; border-radius: var(--radius); font-size: 12.5px; font-weight: 600; color: var(--t-base); cursor: pointer; transition: background 0.15s, color 0.15s; font-family: var(--font); }
  .sh-page-btn:hover:not(:disabled) { color: var(--primary); background: var(--primary-soft); }
  .sh-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .sh-page-numbers { display: flex; align-items: center; gap: 4px; }
  .sh-page-num { width: 32px; height: 32px; border-radius: var(--radius); border: none; background: var(--bg-muted); font-size: 12.5px; font-weight: 600; color: var(--t-base); cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; font-family: var(--font); }
  .sh-page-num:hover { color: var(--primary); background: var(--primary-soft); }
  .sh-page-num-active { background: var(--primary); color: #fff; }

  /* ── Buttons ── */
  .cu-save-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; background: var(--success); color: #fff; border: none; border-radius: var(--radius); font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; transition: background 0.15s, transform 0.15s; font-family: var(--font); white-space: nowrap; }
  .cu-save-btn:hover:not(:disabled) { background: var(--success); transform: translateY(-1px); color: #fff; }
  .cu-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .cu-back-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; background: var(--bg-muted); border: none; border-radius: var(--radius); font-size: 13px; font-weight: 600; color: var(--t-muted); cursor: pointer; transition: color 0.15s, background 0.15s; font-family: var(--font); }
  .cu-back-btn:hover { color: var(--primary); background: var(--primary-soft); }

  /* ── Overlay / Modal ── */
  .ul-overlay { position: fixed; inset: 0; background: rgba(17,24,39,0.45); backdrop-filter: blur(2px); z-index: 1000; display: flex; align-items: center; justify-content: center; animation: sr-fade-in 0.15s ease; padding: 16px; }
  .ul-modal { background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-card), 0 24px 60px -30px rgba(15, 23, 42, 0.20); padding: 28px; width: 80%; max-width: 460px; max-height: calc(100vh - 32px); animation: ul-modal-center-in 0.2s ease; text-align: center; }
  .ul-modal-sm { max-width: 460px; text-align: left; }
  @keyframes ul-modal-center-in { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
  .ul-modal-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 12px; }
  .ul-modal-close { background: none; border: none; cursor: pointer; color: var(--t-muted); font-size: 16px; padding: 4px; border-radius: var(--radius); transition: color 0.15s, background 0.15s; display: flex; align-items: center; flex-shrink: 0; }
  .ul-modal-close:hover { color: var(--t-base); background: var(--bg); }
  .ul-modal-icon { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; margin: 0 auto 14px; }
  .ul-modal-icon-danger { background: var(--danger-soft); color: var(--danger); }
  .ul-modal-title { font-size: 15px; font-weight: 700; color: var(--t-base); margin: 0 0 6px; }
  .ul-modal-sub   { font-size: 12.5px; color: var(--t-muted); margin: 0 0 20px; }
  .ul-modal-actions { display: flex; align-items: center; justify-content: center; gap: 10px; }
  .ul-delete-confirm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 20px; background: var(--danger); color: #fff; border: none; border-radius: var(--radius); font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; font-family: var(--font); }
  .ul-delete-confirm-btn:hover { background: #b91c1c; }

  /* ── Form helpers ── */
  .cu-form-icon { width: 40px; height: 40px; border-radius: var(--radius); background: var(--primary-soft); color: var(--primary); font-size: 18px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .cu-divider { border: none; border-top: 1px solid var(--border-soft); margin: 0 0 20px; }
  .cu-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .cu-field-group { display: flex; flex-direction: column; gap: 6px; }
  .cu-field-error { display: flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: var(--danger); }

  /* ── Animations ── */
  .sr-spin { animation: sr-spin 0.7s linear infinite; display: inline-block; }
  @keyframes sr-spin    { to { transform: rotate(360deg); } }
  @keyframes sr-fade-in { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
`;
