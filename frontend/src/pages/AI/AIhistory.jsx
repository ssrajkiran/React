import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const formatDateShort = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const REPORTS_PER_PAGE = 5;

export default function AIHistory() {
  const [history, setHistory]               = useState([]);
  const [currentPage, setCurrentPage]       = useState(1);
  const [expandedReport, setExpandedReport] = useState(null);
  const [toast, setToast]                   = useState(null);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get("/ai-summary/history");
      const parsed = (res.data || []).map((r) => ({
        ...r,
        parsedSummary: JSON.parse(r.summary_text),
      }));
      setHistory(parsed);
    } catch (err) {
      console.error("Failed to fetch report history", err);
      showToast("Failed to load history.", "error");
    }
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const indexOfLast    = currentPage * REPORTS_PER_PAGE;
  const indexOfFirst   = indexOfLast - REPORTS_PER_PAGE;
  const currentReports = history.slice(indexOfFirst, indexOfLast);
  const totalPages     = Math.ceil(history.length / REPORTS_PER_PAGE);

  const toggleExpand = (id) => setExpandedReport((prev) => (prev === id ? null : id));

  const statusConfig = {
    "completed":   { color: "#059669", bg: "#ECFDF5", border: "#6ee7b7" },
    "in progress": { color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
    "in-progress": { color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" },
  };

  const exportPDF = (report) => {
    const summary   = report.parsedSummary;
    const doc       = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    const title = "Timesheet Report";
    doc.text(title, (pageWidth - doc.getTextWidth(title)) / 2, 14);

    doc.setFontSize(14);
    doc.text(report.report_name || "Summary Report", 14, 22);

    let startY = 30;

    const grouped = (summary.tableData || []).reduce((acc, row) => {
      if (!acc[row.employee]) acc[row.employee] = [];
      acc[row.employee].push(row);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([emp, tasks]) => {
      doc.setFontSize(12);
      doc.text(`${emp} — Total Hours: ${summary.employeeHours?.[emp] || 0}`, 14, startY);
      startY += 6;
      autoTable(doc, {
        head: [["Date", "Project", "Task", "Status", "Hours"]],
        body: tasks.map((t) => [formatDate(t.date), t.project, t.task, t.status, t.hours]),
        startY,
        theme: "grid",
        headStyles: { fillColor: [80, 72, 229] },
      });
      startY = doc.lastAutoTable.finalY + 10;
    });

    if (summary.projectHours) {
      doc.setFontSize(12);
      doc.text("Total Hours per Project", 14, startY);
      startY += 6;
      autoTable(doc, {
        head: [["Project", "Hours"]],
        body: Object.entries(summary.projectHours),
        startY,
        theme: "grid",
        headStyles: { fillColor: [80, 72, 229] },
      });
      startY = doc.lastAutoTable.finalY + 10;
    }

    if (summary.projectTaskCounts) {
      doc.setFontSize(12);
      doc.text("Total Tasks per Project by Status", 14, startY);
      startY += 6;
      autoTable(doc, {
        head: [["Project", "In Progress", "Completed", "Total"]],
        body: Object.entries(summary.projectTaskCounts).map(([proj, counts]) => [
          proj,
          counts.pending || 0,
          counts.completed || 0,
          counts.total || 0,
        ]),
        startY,
        theme: "grid",
        headStyles: { fillColor: [80, 72, 229] },
      });
    }

    doc.setFontSize(11);
    doc.text(`Generated on: ${formatDate(report.created_at)}`, 14, doc.lastAutoTable.finalY + 14);
    doc.save(`${report.report_name || "AI_Summary"}_${formatDate(report.created_at)}.pdf`);
    showToast("PDF exported successfully.", "success");
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
          <h5 className="sr-page-title">Reports History</h5>
          <nav className="sr-breadcrumb">
            <Link to="/">Home</Link>
            <i className="bi bi-chevron-right" />
            <span>History</span>
          </nav>
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {history.length === 0 && (
        <div className="sr-empty-state">
          <div className="sr-empty-icon"><i className="bi bi-clock-history" /></div>
          <p className="sr-empty-title">No reports yet</p>
          <p className="sr-empty-sub">Generated reports will appear here</p>
        </div>
      )}

      {/* ── REPORT LIST ── */}
      {currentReports.map((report) => {
        const summary  = report.parsedSummary;
        const isOpen   = expandedReport === report.id;
        const grouped  = (summary.tableData || []).reduce((acc, row) => {
          if (!acc[row.employee]) acc[row.employee] = [];
          acc[row.employee].push(row);
          return acc;
        }, {});

        const totalHours     = Object.values(summary.employeeHours || {}).reduce((s, h) => s + Number(h), 0);
        const totalEmployees = Object.keys(grouped).length;
        const totalTasks     = (summary.tableData || []).length;

        return (
          <div key={report.id} className="sh-report-card">

            {/* ── REPORT HEADER (clickable) ── */}
            <div
              className={`sh-report-header ${isOpen ? "sh-report-header-open" : ""}`}
              onClick={() => toggleExpand(report.id)}
            >
              <div className="sh-report-header-left">
                <div className="sh-report-icon">
                  <i className="bi bi-file-earmark-bar-graph" />
                </div>
                <div>
                  <p className="sh-report-name">{report.report_name || "Summary Report"}</p>
                  <div className="sh-report-meta">
                    <span className="sr-meta-pill sr-meta-blue">
                      <i className="bi bi-calendar3" /> {formatDateShort(report.created_at)}
                    </span>
                    <span className="sr-meta-pill sr-meta-green">
                      <i className="bi bi-clock-history" /> {totalHours} hrs
                    </span>
                    <span className="sr-meta-pill sr-meta-purple">
                      <i className="bi bi-people" /> {totalEmployees} employee{totalEmployees !== 1 ? "s" : ""}
                    </span>
                    <span className="sr-meta-pill sr-meta-orange">
                      <i className="bi bi-list-check" /> {totalTasks} tasks
                    </span>
                  </div>
                </div>
              </div>
              <div className="sh-report-header-right">
                <button
                  className="sr-export-btn"
                  onClick={(e) => { e.stopPropagation(); exportPDF(report); }}
                >
                  <i className="bi bi-file-earmark-pdf" /> Export PDF
                </button>
                <div className={`sh-chevron ${isOpen ? "sh-chevron-open" : ""}`}>
                  <i className="bi bi-chevron-down" />
                </div>
              </div>
            </div>

            {/* ── EXPANDED BODY ── */}
            {isOpen && (
              <div className="sh-report-body">

                {/* Per-employee tables */}
                {Object.entries(grouped).map(([emp, tasks]) => {
                  const empHrs        = summary.employeeHours?.[emp] || 0;
                  const completedCount  = tasks.filter((t) => (t.status || "").toLowerCase() === "completed").length;
                  const inProgressCount = tasks.filter((t) => (t.status || "").toLowerCase().includes("progress")).length;

                  return (
                    <div key={emp} className="sr-emp-card">
                      <div className="sr-emp-header">
                        <div className="sr-emp-header-left">
                          <div className="sr-emp-avatar">{emp.charAt(0).toUpperCase()}</div>
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

                {/* Project Hours & Status Summary */}
                {(summary.projectHours || summary.projectTaskCounts) && (
                  <div className="sh-summary-grid">

                    {/* Hours per project */}
                    {summary.projectHours && (
                      <div className="sh-summary-block">
                        <p className="sh-summary-title">
                          <i className="bi bi-bar-chart-line" /> Total Hours per Project
                        </p>
                        <div className="sr-table-wrap">
                          <table className="sr-table">
                            <thead>
                              <tr>
                                <th>Project</th>
                                <th>Hours</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(summary.projectHours).map(([proj, hrs]) => (
                                <tr key={proj} className="sr-tr">
                                  <td>
                                    <span className="sr-project-pill">{proj}</span>
                                  </td>
                                  <td>
                                    <span className="sr-hrs-pill">
                                      <i className="bi bi-stopwatch" />{hrs} hrs
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Task counts per project */}
                    {summary.projectTaskCounts && (
                      <div className="sh-summary-block">
                        <p className="sh-summary-title">
                          <i className="bi bi-list-check" /> Tasks per Project by Status
                        </p>
                        <div className="sr-table-wrap">
                          <table className="sr-table">
                            <thead>
                              <tr>
                                <th>Project</th>
                                <th>Total</th>
                                <th>In Progress</th>
                                <th>Completed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(summary.projectTaskCounts).map(([proj, counts]) => (
                                <tr key={proj} className="sr-tr">
                                  <td><span className="sr-project-pill">{proj}</span></td>
                                  <td><span className="sr-emp-count">{counts.total || 0}</span></td>
                                  <td>
                                    <span className="sr-status-pill" style={{ background: "#FFFBEB", color: "#D97706", borderColor: "#FCD34D" }}>
                                      {counts.pending || 0}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="sr-status-pill" style={{ background: "#ECFDF5", color: "#059669", borderColor: "#6ee7b7" }}>
                                      {counts.completed || 0}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div className="sh-pagination">
          <button
            className="sh-page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
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

          <button
            className="sh-page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next <i className="bi bi-chevron-right" />
          </button>
        </div>
      )}
    </AppLayout>
  );
}

// ================= STYLES =================
const styles = `
  /* ── Toast (same as AISummary) ── */
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

  /* ── Page header (same as AISummary) ── */
  .sr-page-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
  }
  .sr-page-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; letter-spacing: -0.01em; }
  .sr-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
  .sr-breadcrumb a { color: var(--primary); text-decoration: none; font-weight: 500; }
  .sr-breadcrumb a:hover { text-decoration: underline; }
  .sr-breadcrumb i { font-size: 10px; opacity: 0.5; }

  /* ── Export btn (same as AISummary) ── */
  .sr-export-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 14px; background: #059669; color: #fff;
    border: none; border-radius: var(--radius); font-size: 12px; font-weight: 600;
    cursor: pointer; transition: background 0.15s, transform 0.15s;
    font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap;
  }
  .sr-export-btn:hover { background: #047857; transform: translateY(-1px); }

  /* ── Empty state (same as AISummary) ── */
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
  .sr-empty-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
  .sr-empty-sub   { font-size: 12.5px; color: var(--text-muted); margin: 0; }

  /* ── Meta pills (same as AISummary) ── */
  .sr-meta-pill {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px;
  }
  .sr-meta-blue   { background: #EEF2FF; color: #5048E5; }
  .sr-meta-green  { background: #ECFDF5; color: #059669; }
  .sr-meta-orange { background: #FFF7ED; color: #C2410C; }
  .sr-meta-purple { background: #FAF5FF; color: #7C3AED; }

  /* ── Employee card (same as AISummary) ── */
  .sr-emp-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    margin-bottom: 12px; overflow: hidden;
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
  .sr-emp-count { font-size: 11.5px; font-weight: 600; color: var(--text-muted); background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; white-space: nowrap; }

  /* ── Table (same as AISummary) ── */
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
  .sr-tfoot-row td { border-top: 2px solid var(--border); border-bottom: none; background: var(--bg); padding: 10px 14px; }
  .sr-tfoot-label { font-size: 11.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; text-align: right; }

  /* ── Pills (same as AISummary) ── */
  .sr-project-pill { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 20px; background: #EEF2FF; color: #5048E5; white-space: nowrap; }
  .sr-status-pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid; white-space: nowrap; }
  .sr-hrs-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; padding: 3px 9px; background: #FFF7ED; color: #C2410C; border-radius: 20px; border: 1px solid #FED7AA; white-space: nowrap; }
  .sr-hrs-pill-total { background: #EEF2FF; color: #5048E5; border-color: #c7d2fe; }
  .sr-hrs-pill i { font-size: 11px; }

  /* ── Report card (history-specific) ── */
  .sh-report-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); box-shadow: var(--shadow);
    margin-bottom: 12px; overflow: hidden;
    transition: box-shadow 0.15s;
  }
  .sh-report-card:hover { box-shadow: 0 4px 20px rgba(80,72,229,0.08); }

  .sh-report-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; cursor: pointer; gap: 12px; flex-wrap: wrap;
    transition: background 0.12s;
  }
  .sh-report-header:hover { background: #fafbff; }
  .sh-report-header-open { background: #fafbff; border-bottom: 1px solid var(--border); }

  .sh-report-header-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }

  .sh-report-icon {
    width: 42px; height: 42px; border-radius: var(--radius);
    background: #EEF2FF; color: var(--primary); font-size: 18px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }

  .sh-report-name { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin: 0 0 6px; }
  .sh-report-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

  .sh-report-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

  .sh-chevron { color: var(--text-muted); font-size: 13px; transition: transform 0.2s; }
  .sh-chevron-open { transform: rotate(180deg); }

  /* ── Report body ── */
  .sh-report-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 0; }

  /* ── Project summary grid ── */
  .sh-summary-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 12px; margin-top: 4px;
  }
  .sh-summary-block {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius-lg); overflow: hidden;
  }
  .sh-summary-title {
    font-size: 12px; font-weight: 700; color: var(--text-secondary);
    text-transform: uppercase; letter-spacing: 0.05em;
    margin: 0; padding: 12px 16px; border-bottom: 1px solid var(--border);
    background: var(--bg); display: flex; align-items: center; gap: 7px;
  }

  /* ── Pagination ── */
  .sh-pagination {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 16px; gap: 12px; flex-wrap: wrap;
  }
  .sh-page-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 16px; background: var(--surface);
    border: 1px solid var(--border); border-radius: var(--radius);
    font-size: 12.5px; font-weight: 600; color: var(--text-primary);
    cursor: pointer; transition: border-color 0.15s, background 0.15s;
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
  .sh-page-num-active:hover { background: var(--primary-dark); }

  /* ── Animations ── */
  @keyframes sr-fade-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
`;
