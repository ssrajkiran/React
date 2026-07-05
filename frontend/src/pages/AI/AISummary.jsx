import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AISummary() {
  const [loading, setLoading]               = useState(false);
  const [tableData, setTableData]           = useState([]);
  const [history, setHistory]               = useState([]);
  const [employeeHours, setEmployeeHours]   = useState({});
  const [fromDate, setFromDate]             = useState("");
  const [toDate, setToDate]                 = useState("");
  const [toast, setToast]                   = useState(null);
  const [generated, setGenerated]           = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get("/ai-summary/history");
      setHistory(res.data || []);
    } catch (err) { console.error(err); }
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const generateReport = async () => {
    if (!fromDate || !toDate) {
      showToast("Please select both From and To dates.", "error");
      return;
    }
    if (fromDate > toDate) {
      showToast("From date cannot be greater than To date.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/ai-summary", { from_date: fromDate, to_date: toDate });
      setTableData(res.data.tableData || []);
      setEmployeeHours(res.data.employeeHours || {});
      setGenerated(true);
      fetchHistory();
      showToast("Report generated successfully.", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to generate report.", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const formatDateShort = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const groupedByEmployee = tableData.reduce((acc, row) => {
    if (!acc[row.employee]) acc[row.employee] = [];
    acc[row.employee].push(row);
    return acc;
  }, {});

  const totalHours = Object.values(employeeHours).reduce((s, h) => s + Number(h), 0);
  const totalTasks = tableData.length;
  const totalEmployees = Object.keys(groupedByEmployee).length;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Summary Report", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Period: ${formatDate(fromDate)} → ${formatDate(toDate)}`, 14, 26);
    doc.setTextColor(0);
    let startY = 34;

    Object.entries(groupedByEmployee).forEach(([emp, tasks]) => {
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text(`${emp}  (${employeeHours[emp] || 0} hrs)`, 14, startY);
      doc.setFont(undefined, "normal");
      startY += 5;

      autoTable(doc, {
        head: [["Date", "Project", "Task", "Status", "Hours"]],
        body: tasks.map((t) => [formatDate(t.date), t.project, t.task, t.status, t.hours]),
        startY,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [80, 72, 229] },
      });
      startY = doc.lastAutoTable.finalY + 10;
    });

    doc.save("summary-report.pdf");
  };

  const statusConfig = {
    "completed":   { color: "#059669", bg: "#ECFDF5", border: "#6ee7b7" },
    "in progress": { color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
    "in-progress": { color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
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
          <h5 className="sr-page-title">Summary Report</h5>
          <nav className="sr-breadcrumb">
            <Link to="/">Home</Link>
            <i className="bi bi-chevron-right" />
            <span>Summary</span>
          </nav>
        </div>
        {generated && tableData.length > 0 && (
          <button className="sr-export-btn" onClick={exportPDF}>
            <i className="bi bi-file-earmark-pdf" /> Export PDF
          </button>
        )}
      </div>

      {/* ── FILTER CARD ── */}
      <div className="sr-filter-card">
        <div className="sr-filter-inner">
          <div className="sr-filter-group">
            <label className="sr-label">From Date</label>
            <div className="sr-input-wrap">
              <i className="bi bi-calendar3 sr-input-icon" />
              <input
                className="sr-input"
                type="date"
                value={fromDate}
                max={toDate || new Date().toISOString().split("T")[0]}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
          </div>

          <div className="sr-filter-sep"><i className="bi bi-arrow-right" /></div>

          <div className="sr-filter-group">
            <label className="sr-label">To Date</label>
            <div className="sr-input-wrap">
              <i className="bi bi-calendar3 sr-input-icon" />
              <input
                className="sr-input"
                type="date"
                value={toDate}
                min={fromDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <button className="sr-generate-btn" onClick={generateReport} disabled={loading}>
            {loading
              ? <><i className="bi bi-arrow-repeat sr-spin" /> Generating…</>
              : <><i className="bi bi-lightning-charge" /> Generate Report</>}
          </button>
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {!loading && !generated && (
        <div className="sr-empty-state">
          <div className="sr-empty-icon"><i className="bi bi-bar-chart-line" /></div>
          <p className="sr-empty-title">No report generated yet</p>
          <p className="sr-empty-sub">Select a date range above and click Generate Report</p>
        </div>
      )}

      {/* ── LOADING STATE ── */}
      {loading && (
        <div className="sr-empty-state">
          <div className="sr-empty-icon sr-pulse"><i className="bi bi-cpu" /></div>
          <p className="sr-empty-title">Generating your report…</p>
          <p className="sr-empty-sub">Analyzing timesheet data, please wait</p>
        </div>
      )}

      {/* ── REPORT ── */}
      {!loading && generated && tableData.length > 0 && (
        <>
          {/* Summary stat cards */}
          <div className="sr-stats-row">
            <div className="sr-stat-card">
              <div className="sr-stat-icon sr-stat-blue"><i className="bi bi-clock-history" /></div>
              <div>
                <p className="sr-stat-val">{totalHours}</p>
                <p className="sr-stat-label">Total Hours</p>
              </div>
            </div>
            <div className="sr-stat-card">
              <div className="sr-stat-icon sr-stat-green"><i className="bi bi-people" /></div>
              <div>
                <p className="sr-stat-val">{totalEmployees}</p>
                <p className="sr-stat-label">Employees</p>
              </div>
            </div>
            <div className="sr-stat-card">
              <div className="sr-stat-icon sr-stat-orange"><i className="bi bi-list-check" /></div>
              <div>
                <p className="sr-stat-val">{totalTasks}</p>
                <p className="sr-stat-label">Task Entries</p>
              </div>
            </div>
            <div className="sr-stat-card sr-stat-period">
              <div className="sr-stat-icon sr-stat-purple"><i className="bi bi-calendar-range" /></div>
              <div>
                <p className="sr-stat-val sr-stat-val-sm">{formatDateShort(fromDate)} → {formatDateShort(toDate)}</p>
                <p className="sr-stat-label">Report Period</p>
              </div>
            </div>
          </div>

          {/* Per-employee tables */}
          {Object.entries(groupedByEmployee).map(([emp, tasks]) => {
            const empHrs = employeeHours[emp] || 0;
            const completedCount = tasks.filter(t => (t.status || "").toLowerCase() === "completed").length;
            const inProgressCount = tasks.filter(t => (t.status || "").toLowerCase().includes("progress")).length;

            return (
              <div key={emp} className="sr-emp-card">
                {/* Employee header */}
                <div className="sr-emp-header">
                  <div className="sr-emp-header-left">
                    <div className="sr-emp-avatar">
                      {emp.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="sr-emp-name">{emp}</p>
                      <div className="sr-emp-meta">
                        <span className="sr-meta-pill sr-meta-blue">
                          <i className="bi bi-stopwatch" /> {empHrs} hrs
                        </span>
                        <span className="sr-meta-pill sr-meta-green">
                          <i className="bi bi-check-circle" /> {completedCount} completed
                        </span>
                        {inProgressCount > 0 && (
                          <span className="sr-meta-pill sr-meta-orange">
                            <i className="bi bi-hourglass-split" /> {inProgressCount} in progress
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="sr-emp-count">{tasks.length} entr{tasks.length !== 1 ? "ies" : "y"}</span>
                </div>

                {/* Task table */}
                <div className="sr-table-wrap">
                  <table className="sr-table">
                    <thead>
                      <tr>
                        <th className="sr-th-sm">#</th>
                        <th>Date</th>
                        <th>Project</th>
                        <th>Task</th>
                        <th>Status</th>
                        <th>Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((t, i) => {
                        const sc = statusConfig[(t.status || "").toLowerCase()];
                        return (
                          <tr key={i} className="sr-tr">
                            <td className="sr-td-muted sr-center">{i + 1}</td>
                            <td className="sr-td-muted sr-nowrap">{formatDateShort(t.date)}</td>
                            <td>
                              {t.project
                                ? <span className="sr-project-pill">{t.project}</span>
                                : <span className="sr-td-muted">—</span>}
                            </td>
                            <td className="sr-task-cell" title={t.task}>{t.task || "—"}</td>
                            <td>
                              <span
                                className="sr-status-pill"
                                style={sc
                                  ? { background: sc.bg, color: sc.color, borderColor: sc.border }
                                  : { background: "#F3F4F6", color: "#6B7280", borderColor: "#D1D5DB" }}
                              >
                                {t.status || "Pending"}
                              </span>
                            </td>
                            <td>
                              <span className="sr-hrs-pill">
                                <i className="bi bi-stopwatch" />{t.hours || 0} hrs
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="sr-tfoot-row">
                        <td colSpan={5} className="sr-tfoot-label">Total</td>
                        <td>
                          <span className="sr-hrs-pill sr-hrs-pill-total">
                            <i className="bi bi-stopwatch-fill" />{empHrs} hrs
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── NO DATA AFTER GENERATE ── */}
      {!loading && generated && tableData.length === 0 && (
        <div className="sr-empty-state">
          <div className="sr-empty-icon"><i className="bi bi-inbox" /></div>
          <p className="sr-empty-title">No data found</p>
          <p className="sr-empty-sub">No timesheet entries found for the selected date range</p>
        </div>
      )}
    </AppLayout>
  );
}

// ================= STYLES =================
const styles = `
  /* Toast */
  .sr-toast {
    position: fixed; top: 20px; right: 20px; z-index: 999;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: var(--radius-lg);
    font-size: 13px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12); animation: sr-fade-in 0.2s ease;
  }
  .sr-toast-success { background: #ECFDF5; color: #059669; border: 1px solid #6ee7b7; }
  .sr-toast-error   { background: #FEF2F2; color: #DC2626; border: 1px solid #fca5a5; }
  .sr-toast-close { margin-left: 6px; background: none; border: none; cursor: pointer; color: inherit; font-size: 15px; display: flex; align-items: center; }

  /* Page header */
  .sr-page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
  }
  .sr-page-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; letter-spacing: -0.01em; }
  .sr-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
  .sr-breadcrumb a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .sr-breadcrumb a:hover { text-decoration: underline; }
  .sr-breadcrumb i { font-size: 10px; opacity: 0.5; }

  /* Export btn */
  .sr-export-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 9px 18px; background: #059669; color: #fff;
    border: none; border-radius: var(--radius); font-size: 13px; font-weight: 600;
    cursor: pointer; transition: background 0.15s, transform 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .sr-export-btn:hover { background: #047857; transform: translateY(-1px); }

  /* Filter card */
  .sr-filter-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    padding: 18px 20px; margin-bottom: 20px;
  }
  .sr-filter-inner { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
  .sr-filter-group { display: flex; flex-direction: column; gap: 6px; }
  .sr-filter-sep { color: var(--text-muted); font-size: 14px; padding-bottom: 9px; }
  .sr-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
  .sr-input-wrap { position: relative; display: flex; align-items: center; }
  .sr-input-icon { position: absolute; left: 11px; color: var(--text-muted); font-size: 13px; pointer-events: none; }
  .sr-input {
    padding: 9px 12px 9px 34px; border: 1px solid var(--border); border-radius: var(--radius);
    background: var(--surface); font-size: 13px; color: var(--text-primary);
    font-family: 'Plus Jakarta Sans', sans-serif; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .sr-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(80,72,229,0.1); }

  /* Generate btn */
  .sr-generate-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 9px 20px; background: var(--primary); color: #fff;
    border: none; border-radius: var(--radius); font-size: 13px; font-weight: 600;
    cursor: pointer; transition: background 0.15s, transform 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap;
  }
  .sr-generate-btn:hover:not(:disabled) { background: var(--primary-dark); transform: translateY(-1px); }
  .sr-generate-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Empty / loading state */
  .sr-empty-state {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 60px 20px; text-align: center; margin-bottom: 20px;
  }
  .sr-empty-icon {
    width: 60px; height: 60px; border-radius: 50%;
    background: #EEF2FF; color: var(--primary); font-size: 24px;
    display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
  }
  .sr-pulse { animation: sr-pulse 1.5s ease-in-out infinite; }
  @keyframes sr-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.95); } }
  .sr-empty-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
  .sr-empty-sub { font-size: 12.5px; color: var(--text-muted); margin: 0; }

  /* Stat row */
  .sr-stats-row {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px; margin-bottom: 20px;
  }
  .sr-stat-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    padding: 16px 18px; display: flex; align-items: center; gap: 14px;
  }
  .sr-stat-icon {
    width: 42px; height: 42px; border-radius: var(--radius);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0;
  }
  .sr-stat-blue   { background: #EEF2FF; color: #5048E5; }
  .sr-stat-green  { background: #ECFDF5; color: #059669; }
  .sr-stat-orange { background: #FFF7ED; color: #C2410C; }
  .sr-stat-purple { background: #FAF5FF; color: #7C3AED; }
  .sr-stat-val { font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 0 0 2px; line-height: 1; }
  .sr-stat-val-sm { font-size: 12px; font-weight: 700; color: var(--text-primary); margin: 0 0 2px; line-height: 1.4; }
  .sr-stat-label { font-size: 11px; color: var(--text-muted); font-weight: 600; margin: 0; text-transform: uppercase; letter-spacing: 0.04em; }

  /* Employee card */
  .sr-emp-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    margin-bottom: 16px; overflow: hidden;
  }
  .sr-emp-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; border-bottom: 1px solid var(--border);
    background: var(--bg); flex-wrap: wrap; gap: 10px;
  }
  .sr-emp-header-left { display: flex; align-items: center; gap: 12px; }
  .sr-emp-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: var(--primary); color: #fff;
    font-size: 15px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .sr-emp-name { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin: 0 0 5px; }
  .sr-emp-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .sr-meta-pill {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px;
  }
  .sr-meta-blue   { background: #EEF2FF; color: #5048E5; }
  .sr-meta-green  { background: #ECFDF5; color: #059669; }
  .sr-meta-orange { background: #FFF7ED; color: #C2410C; }
  .sr-emp-count { font-size: 11.5px; font-weight: 600; color: var(--text-muted); background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; white-space: nowrap; }

  /* Table */
  .sr-table-wrap { overflow-x: auto; }
  .sr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .sr-table thead tr { border-bottom: 2px solid var(--border); }
  .sr-table th { padding: 10px 14px; font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; text-align: left; white-space: nowrap; background: var(--surface); }
  .sr-th-sm { width: 48px; text-align: center; }
  .sr-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .sr-tr { transition: background 0.1s; }
  .sr-tr:hover td { background: #fafbff; }
  .sr-td-muted { color: var(--text-secondary); font-size: 12.5px; }
  .sr-center { text-align: center; }
  .sr-nowrap { white-space: nowrap; }
  .sr-task-cell { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); font-weight: 500; }

  /* tfoot */
  .sr-tfoot-row td { border-top: 2px solid var(--border); border-bottom: none; background: var(--bg); padding: 10px 14px; }
  .sr-tfoot-label { font-size: 11.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; text-align: right; }

  /* Pills */
  .sr-project-pill { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 20px; background: #EEF2FF; color: #5048E5; white-space: nowrap; }
  .sr-status-pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid; white-space: nowrap; }
  .sr-hrs-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; padding: 3px 9px; background: #FFF7ED; color: #C2410C; border-radius: 20px; border: 1px solid #FED7AA; white-space: nowrap; }
  .sr-hrs-pill-total { background: #EEF2FF; color: #5048E5; border-color: #c7d2fe; }
  .sr-hrs-pill i { font-size: 11px; }

  /* Spin */
  .sr-spin { animation: sr-spin 0.7s linear infinite; display: inline-block; }
  @keyframes sr-spin { to { transform: rotate(360deg); } }
  @keyframes sr-fade-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
`;
