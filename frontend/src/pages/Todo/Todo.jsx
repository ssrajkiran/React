import { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";  // ✅ same import as CreateUser.jsx
import { Link } from "react-router-dom";

// ─── helpers ─────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);
const EMPTY_FORM = { title: "", description: "", priority: "", due_date: "" };

// ─── CreateTodoDialog (inline) ────────────────────────────────────
function CreateTodoDialog({ open, onClose, onSaved, editData, showToast }) {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      editData
        ? {
            title:       editData.title,
            description: editData.description || "",
            priority:    editData.priority,
            due_date:    editData.due_date || "",
          }
        : EMPTY_FORM
    );
    setError("");
  }, [open, editData]);

  if (!open) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required.");        return; }
    if (!form.priority)     { setError("Please select a priority."); return; }
    setLoading(true);
    try {
      if (editData) {
        const res = await api.put(`/todos/${editData.id}`, form);
        showToast(res.data.message || "Todo updated successfully.", "success");
      } else {
        const res = await api.post("/todos/create", form);
        showToast(res.data.message || "Todo created successfully.", "success");
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error("Save todo error:", err);
      const msg = err.response?.data?.message || "Failed to save todo.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const titleErr    = error === "Title is required.";
  const priorityErr = error === "Please select a priority.";

  return (
    <>
      <div className="cd-backdrop" onClick={onClose} />
      <div className="cd-dialog" role="dialog" aria-modal="true">

        <div className="cd-head">
          <div className="cd-icon">
            <i className={`bi ${editData ? "bi-pencil" : "bi-plus-circle"}`} />
          </div>
          <div>
            <p className="cd-title">{editData ? "Edit Todo" : "New Todo Details"}</p>
            <p className="cd-sub">
              {editData ? "Update the todo information below."
                        : "Fill in the information below to create a new todo."}
            </p>
          </div>
          <button className="cd-close" onClick={onClose}>
            <i className="bi bi-x" />
          </button>
        </div>

        <div className="cd-divider" />

        <form onSubmit={handleSubmit} noValidate>
          <div className="cd-body">
            <div className="cd-grid">

              {/* Title */}
              <div className="cd-field">
                <label className="sr-label">Title</label>
                <div className="sr-input-wrap">
                  <i className="bi bi-check2-square sr-input-icon" />
                  <input
                    className={`sr-input ${titleErr ? "cu-input-error" : ""}`}
                    type="text"
                    name="title"
                    placeholder="What needs to be done?"
                    value={form.title}
                    onChange={handleChange}
                  />
                </div>
                {titleErr && (
                  <span className="cu-field-error">
                    <i className="bi bi-exclamation-circle" /> {error}
                  </span>
                )}
              </div>

              {/* Priority */}
              <div className="cd-field">
                <label className="sr-label">Priority</label>
                <div className="sr-input-wrap">
                  <i className="bi bi-flag sr-input-icon" />
                  <select
                    className={`sr-input cu-select ${priorityErr ? "cu-input-error" : ""}`}
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                  >
                    <option value="">Select priority…</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                  <i className="bi bi-chevron-down cu-select-arrow" />
                </div>
                {priorityErr && (
                  <span className="cu-field-error">
                    <i className="bi bi-exclamation-circle" /> {error}
                  </span>
                )}
              </div>

              {/* Due Date */}
              <div className="cd-field">
                <label className="sr-label">Due Date</label>
                <div className="sr-input-wrap">
                  <i className="bi bi-calendar3 sr-input-icon" />
                  <input
                    className="sr-input"
                    type="date"
                    name="due_date"
                    value={form.due_date}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="cd-field cd-full">
                <label className="sr-label">Description</label>
                <textarea
                  className="sr-input cu-textarea"
                  name="description"
                  placeholder="Optional details…"
                  rows={3}
                  value={form.description}
                  onChange={handleChange}
                />
              </div>

            </div>
          </div>

          <div className="cd-divider" style={{ margin: "0" }} />

          <div className="cd-footer">
            <button type="button" className="cu-back-btn" onClick={onClose}>
              <i className="bi bi-arrow-left" /> Back
            </button>
            <button type="submit" className="cu-save-btn" disabled={loading}>
              {loading
                ? <><i className="bi bi-arrow-repeat sr-spin" /> Saving…</>
                : <><i className="bi bi-check2-circle" /> {editData ? "Update" : "Save"} Todo</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Todo (main page) ─────────────────────────────────────────────
export default function Todo() {
  const [todos, setTodos]           = useState([]);
  const [stats, setStats]           = useState({ total: 0, active: 0, completed: 0 });
  const [filter, setFilter]         = useState("All");
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData]     = useState(null);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTodos = async () => {
    try {
      const res = await api.get("/todos", { params: { filter, search } });
      setTodos(res.data.data);
    } catch (err) {
      console.error("Fetch todos error:", err);
      showToast("Failed to load todos.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/todos/stats/summary");
      setStats(res.data);
    } catch (err) {
      console.error("Fetch stats error:", err);
    }
  };

  useEffect(() => {
    fetchTodos();
    fetchStats();
  }, [filter, search]);

  const handleToggle = async (todo) => {
    try {
      const res = await api.put(`/todos/${todo.id}`, { completed: !todo.completed });
      showToast(res.data.message || (todo.completed ? "Marked as active." : "Marked as completed."), "success");
      fetchTodos();
      fetchStats();
    } catch (err) {
      console.error("Toggle error:", err);
      showToast("Failed to update todo.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this todo?")) return;
    try {
      const res = await api.delete(`/todos/${id}`);
      showToast(res.data.message || "Todo deleted.", "success");
      fetchTodos();
      fetchStats();
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete todo.", "error");
    }
  };

  const openCreate = ()     => { setEditData(null); setDialogOpen(true); };
  const openEdit   = (todo) => { setEditData(todo); setDialogOpen(true); };
  const onSaved    = ()     => { fetchTodos(); fetchStats(); };

  const t = todayStr();

  return (
    <AppLayout>
      <style>{styles}</style>

      {/* ── Toast ── */}
      {toast && (
        <div className={`sr-toast sr-toast-${toast.type}`}>
          <i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"}`} />
          {toast.msg}
          <button className="sr-toast-close" onClick={() => setToast(null)}>
            <i className="bi bi-x" />
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="sr-page-header">
        <div>
          <h5 className="sr-page-title">Todo</h5>
          <nav className="sr-breadcrumb">
            <Link to="/">Home</Link>
            <i className="bi bi-chevron-right" />
            <span>Todo</span>
          </nav>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="tl-stats">
        {[
          { label: "Total",     value: stats.total,     color: "var(--text-primary)" },
          { label: "Active",    value: stats.active,    color: "var(--primary)"      },
          { label: "Completed", value: stats.completed, color: "#059669"             },
        ].map((s) => (
          <div className="tl-stat-card" key={s.label}>
            <p className="tl-stat-label">{s.label}</p>
            <p className="tl-stat-val" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="tl-toolbar">
        <div className="sr-input-wrap" style={{ flex: 1, minWidth: 180 }}>
          <i className="bi bi-search sr-input-icon" />
          <input
            className="sr-input"
            type="text"
            placeholder="Search todos…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="tl-filter-tabs">
          {["All", "Active", "Completed"].map((f) => (
            <button
              key={f}
              className={`tl-filter-tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <button className="tl-add-btn" onClick={openCreate}>
          <i className="bi bi-plus-lg" /> New Todo
        </button>
      </div>

      {/* ── Table ── */}
      <div className="tl-table-card">
        <table className="tl-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th>Title</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Created</th>
              <th style={{ width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="tl-empty">Loading…</td></tr>
            ) : todos.length === 0 ? (
              <tr><td colSpan="7" className="tl-empty">No todos found.</td></tr>
            ) : todos.map((todo) => {
              const overdue = todo.due_date && todo.due_date < t && !todo.completed;
              return (
                <tr key={todo.id}>
                  <td>
                    <button
                      className={`tl-toggle ${todo.completed ? "done" : ""}`}
                      onClick={() => handleToggle(todo)}
                      title={todo.completed ? "Mark active" : "Mark done"}
                    />
                  </td>
                  <td>
                    <p className={`tl-row-title ${todo.completed ? "done-text" : ""}`}>
                      {todo.title}
                    </p>
                    {todo.description && (
                      <p className="tl-row-desc">{todo.description}</p>
                    )}
                  </td>
                  <td>
                    <span className={`tl-badge tl-badge-${todo.priority.toLowerCase()}`}>
                      {todo.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`tl-badge ${todo.completed ? "tl-badge-done" : "tl-badge-active"}`}>
                      {todo.completed ? "Completed" : "Active"}
                    </span>
                  </td>
                  <td>
                    <span className={`tl-due ${overdue ? "overdue" : ""}`}>
                      {todo.due_date || "—"}{overdue && " ⚠"}
                    </span>
                  </td>
                  <td>
                    <span className="tl-due">{todo.created_at?.slice(0, 10)}</span>
                  </td>
                  <td>
                    <div className="tl-actions">
                      <button className="tl-icon-btn" onClick={() => openEdit(todo)} title="Edit">
                        <i className="bi bi-pencil" />
                      </button>
                      <button className="tl-icon-btn tl-del" onClick={() => handleDelete(todo.id)} title="Delete">
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Dialog ── */}
      <CreateTodoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={onSaved}
        editData={editData}
        showToast={showToast}
      />
    </AppLayout>
  );
}

// ─── styles ──────────────────────────────────────────────────────
const styles = `
  .sr-toast {
    position:fixed;top:20px;right:20px;z-index:999;
    display:flex;align-items:center;gap:10px;
    padding:12px 16px;border-radius:var(--radius-lg);
    font-size:13px;font-weight:600;font-family:'Plus Jakarta Sans',sans-serif;
    box-shadow:0 8px 24px rgba(0,0,0,.12);animation:sr-fade-in .2s ease;
  }
  .sr-toast-success{background:#ECFDF5;color:#059669;border:1px solid #6ee7b7}
  .sr-toast-error  {background:#FEF2F2;color:#DC2626;border:1px solid #fca5a5}
  .sr-toast-close{margin-left:6px;background:none;border:none;cursor:pointer;color:inherit;font-size:15px;display:flex;align-items:center}
  .sr-page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
  .sr-page-title{font-size:15px;font-weight:700;color:var(--text-primary);margin:0 0 4px;letter-spacing:-0.01em}
  .sr-breadcrumb{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted)}
  .sr-breadcrumb a{color:var(--primary);text-decoration:none;font-weight:500}
  .sr-breadcrumb a:hover{text-decoration:underline}
  .sr-breadcrumb i{font-size:10px;opacity:.5}
  .sr-label{font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em}
  .sr-input-wrap{position:relative;display:flex;align-items:center}
  .sr-input-icon{position:absolute;left:11px;color:var(--text-muted);font-size:13px;pointer-events:none;z-index:1}
  .sr-input{
    width:100%;padding:9px 12px 9px 34px;border:1px solid var(--border);border-radius:var(--radius);
    background:var(--surface);font-size:13px;color:var(--text-primary);
    font-family:'Plus Jakarta Sans',sans-serif;outline:none;
    transition:border-color .15s,box-shadow .15s;
  }
  .sr-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(80,72,229,.1)}
  .cu-select{appearance:none;padding-right:34px;cursor:pointer}
  .cu-select-arrow{position:absolute;right:11px;color:var(--text-muted);font-size:11px;pointer-events:none}
  .cu-input-error{border-color:#EF4444!important;box-shadow:0 0 0 3px rgba(239,68,68,.1)!important}
  .cu-field-error{display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color:#DC2626}
  .cu-field-error i{font-size:11px}
  .cu-textarea{padding:9px 12px;resize:vertical;min-height:80px}
  .cu-back-btn{
    display:flex;align-items:center;gap:7px;padding:9px 18px;
    background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
    font-size:13px;font-weight:600;color:var(--text-secondary);cursor:pointer;
    transition:border-color .15s,color .15s,background .15s;font-family:'Plus Jakarta Sans',sans-serif;
  }
  .cu-back-btn:hover{border-color:var(--primary);color:var(--primary);background:#EEF2FF}
  .cu-save-btn{
    display:flex;align-items:center;gap:7px;padding:9px 22px;
    background:#059669;color:#fff;border:none;border-radius:var(--radius);
    font-size:13px;font-weight:600;cursor:pointer;
    transition:background .15s,transform .15s;font-family:'Plus Jakarta Sans',sans-serif;
  }
  .cu-save-btn:hover:not(:disabled){background:#047857;transform:translateY(-1px)}
  .cu-save-btn:disabled{opacity:.6;cursor:not-allowed}
  .sr-spin{animation:sr-spin .7s linear infinite;display:inline-block}

  .tl-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
  .tl-stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px}
  .tl-stat-label{font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px}
  .tl-stat-val{font-size:22px;font-weight:700;margin:0}
  .tl-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
  .tl-filter-tabs{display:flex;gap:3px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:3px}
  .tl-filter-tab{
    padding:5px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;
    border:none;background:transparent;color:var(--text-secondary);
    transition:all .15s;font-family:'Plus Jakarta Sans',sans-serif;
  }
  .tl-filter-tab.active{background:#EEF2FF;color:var(--primary)}
  .tl-add-btn{
    display:flex;align-items:center;gap:6px;padding:8px 16px;
    background:#059669;color:#fff;border:none;border-radius:var(--radius);
    font-size:13px;font-weight:600;cursor:pointer;
    transition:background .15s;font-family:'Plus Jakarta Sans',sans-serif;white-space:nowrap;
  }
  .tl-add-btn:hover{background:#047857}
  .tl-table-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden}
  .tl-table{width:100%;border-collapse:collapse;font-size:13px}
  .tl-table thead th{
    padding:10px 16px;text-align:left;font-size:11px;font-weight:700;
    color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;
    border-bottom:1px solid var(--border);background:var(--surface);
  }
  .tl-table tbody tr{border-bottom:.5px solid var(--border);transition:background .12s}
  .tl-table tbody tr:last-child{border-bottom:none}
  .tl-table tbody tr:hover{background:#F9FAFB}
  .tl-table td{padding:11px 16px;vertical-align:middle}
  .tl-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700}
  .tl-badge-high   {background:#FEF2F2;color:#DC2626}
  .tl-badge-medium {background:#FFF7ED;color:#C2410C}
  .tl-badge-low    {background:#ECFDF5;color:#059669}
  .tl-badge-done   {background:#ECFDF5;color:#059669}
  .tl-badge-active {background:#EEF2FF;color:#5048E5}
  .tl-toggle{
    width:20px;height:20px;border-radius:50%;border:2px solid #d1d5db;background:#fff;
    cursor:pointer;transition:all .15s;flex-shrink:0;position:relative;
  }
  .tl-toggle.done{background:#059669;border-color:#059669}
  .tl-toggle.done::after{
    content:'';position:absolute;top:3px;left:6px;
    width:5px;height:8px;border:2px solid #fff;
    border-top:none;border-left:none;transform:rotate(45deg);
  }
  .tl-row-title{font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;margin:0}
  .tl-row-title.done-text{text-decoration:line-through;color:var(--text-muted)}
  .tl-row-desc{font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;margin:2px 0 0}
  .tl-due{font-size:12px;color:var(--text-secondary)}
  .tl-due.overdue{color:#DC2626;font-weight:600}
  .tl-actions{display:flex;gap:6px}
  .tl-icon-btn{
    width:28px;height:28px;border-radius:6px;border:1px solid var(--border);
    background:var(--surface);cursor:pointer;display:flex;align-items:center;
    justify-content:center;color:var(--text-secondary);transition:all .15s;font-size:13px;
  }
  .tl-icon-btn:hover{border-color:var(--primary);color:var(--primary);background:#EEF2FF}
  .tl-icon-btn.tl-del:hover{border-color:#DC2626;color:#DC2626;background:#FEF2F2}
  .tl-empty{text-align:center;padding:48px;color:var(--text-muted);font-size:13px}

  .cd-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:50}
  .cd-dialog{
    position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
    z-index:51;width:100%;max-width:480px;
    background:var(--surface);border:1px solid var(--border);
    border-radius:var(--radius-lg);box-shadow:0 20px 60px rgba(0,0,0,.2);
    animation:sr-fade-in .2s ease;
  }
  .cd-head{display:flex;align-items:center;gap:14px;padding:20px 24px 16px}
  .cd-icon{
    width:40px;height:40px;border-radius:var(--radius);
    background:#EEF2FF;color:var(--primary);font-size:18px;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;
  }
  .cd-title{font-size:14px;font-weight:700;color:var(--text-primary);margin:0 0 2px}
  .cd-sub{font-size:12px;color:var(--text-muted);margin:0}
  .cd-close{
    margin-left:auto;width:28px;height:28px;border-radius:var(--radius);
    border:1px solid var(--border);background:none;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    color:var(--text-muted);font-size:16px;
  }
  .cd-close:hover{background:#F3F4F6}
  .cd-divider{border:none;border-top:1px solid var(--border);margin:0 0 20px}
  .cd-body{padding:0 24px}
  .cd-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 16px;margin-bottom:20px}
  .cd-field{display:flex;flex-direction:column;gap:6px}
  .cd-full{grid-column:1/-1}
  .cd-footer{display:flex;align-items:center;justify-content:space-between;padding:0 24px 20px;gap:10px}
  @media(max-width:520px){.cd-grid{grid-template-columns:1fr}}

  @keyframes sr-spin   {to{transform:rotate(360deg)}}
  @keyframes sr-fade-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
`;
