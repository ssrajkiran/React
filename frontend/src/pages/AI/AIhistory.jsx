import { useEffect, useState } from "react";
import { Card, Table, Accordion, Pagination, Row, Col, Button } from "react-bootstrap";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Helper to format date as DD-MM-YYYY
const formatDate = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

export default function AIHistory() {
  const [history, setHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [reportsPerPage] = useState(5);
  const [expandedReport, setExpandedReport] = useState(null);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get("/ai-summary/history");
      const parsedReports = res.data.map(r => ({
        ...r,
        parsedSummary: JSON.parse(r.summary_text)
      }));
      setHistory(parsedReports);
    } catch (err) {
      console.error("Failed to fetch report history", err);
    }
  };

  const indexOfLast = currentPage * reportsPerPage;
  const indexOfFirst = indexOfLast - reportsPerPage;
  const currentReports = history.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(history.length / reportsPerPage);
  const handlePageChange = (page) => setCurrentPage(page);

  // --- PDF Export Function ---
 const exportPDF = (report) => {
  const summary = report.parsedSummary;
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();

  // Timesheet Report Title (centered)
  doc.setFontSize(16);
  const title = "Timesheet Report";
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (pageWidth - titleWidth) / 2, 14);  // centered

  // Report Name (left aligned under title)
  doc.setFontSize(14);
  doc.text(report.report_name || "Summary Report", 14, 22);

  let startY = 30;

  // Group by employee
  const groupedByEmployee = summary.tableData.reduce((acc, row) => {
    if (!acc[row.employee]) acc[row.employee] = [];
    acc[row.employee].push(row);
    return acc;
  }, {});

  Object.entries(groupedByEmployee).forEach(([employee, tasks]) => {
    doc.setFontSize(12);
    doc.text(`${employee} - Total Hours: ${summary.employeeHours[employee] || 0}`, 14, startY);
    startY += 6;

    const rows = tasks.map(t => [
      formatDate(t.date),
      t.project,
      t.task,
      t.status,
      t.hours
    ]);

    autoTable(doc, {
      head: [["Date", "Project", "Task", "Status", "Hours"]],
      body: rows,
      startY,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
    });

    startY = doc.lastAutoTable.finalY + 10;
  });

  // Total Hours per Project
  doc.setFontSize(12);
  doc.text("Total Hours per Project", 14, startY);
  startY += 6;
  const projectRows = Object.entries(summary.projectHours).map(([proj, hrs]) => [proj, hrs]);
  autoTable(doc, {
    head: [["Project", "Hours"]],
    body: projectRows,
    startY,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] },
  });

  startY = doc.lastAutoTable.finalY + 10;

  // Total Tasks per Project by Status
  doc.setFontSize(12);
  doc.text("Total Tasks per Project by Status", 14, startY);
  startY += 6;
  const statusRows = Object.entries(summary.projectTaskCounts).map(([proj, counts]) => [
    proj,
    counts.pending || 0,    
    counts.completed || 0,  
    counts.total || 0
  ]);
  autoTable(doc, {
    head: [["Project", "In Progress", "Completed", "Total"]],
    body: statusRows,
    startY,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] },
  });

  // Move "Generated on" to last page
  const finalY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(11);
  doc.text(`Generated on: ${formatDate(report.created_at)}`, 14, finalY);

  doc.save(`${report.report_name || "AI_Summary"}_${formatDate(report.created_at)}.pdf`);
};

  return (
    <AppLayout>
      <Row className="mb-3 align-items-center">
        <Col>
          <h4>Reports History</h4>
        </Col>
      </Row>

      {currentReports.length === 0 && <p>No reports found.</p>}

      <Accordion activeKey={expandedReport}>
        {currentReports.map((report, idx) => {
          const summary = report.parsedSummary;
          const groupedByEmployee = summary.tableData.reduce((acc, row) => {
            if (!acc[row.employee]) acc[row.employee] = [];
            acc[row.employee].push(row);
            return acc;
          }, {});

          return (
            <Card className="mb-3" key={report.id}>
              <Accordion.Item eventKey={String(idx)}>
                <Accordion.Header onClick={() => setExpandedReport(expandedReport === String(idx) ? null : String(idx))}>
                  {report.report_name} - {formatDate(report.created_at)}
                </Accordion.Header>
                <Accordion.Body>
                  <div className="mb-3 text-end">
                    <Button size="sm" variant="success" onClick={() => exportPDF(report)}>
                      Export PDF
                    </Button>
                  </div>

                  {Object.entries(groupedByEmployee).map(([employee, tasks]) => (
                    <Card className="mb-3" key={employee}>
                      <Card.Header>{employee} - Total Hours: {summary.employeeHours[employee]}</Card.Header>
                      <Card.Body>
                        <Table striped bordered hover size="sm">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Project</th>
                              <th>Task</th>
                              <th>Status</th>
                              <th>Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tasks.map((t, i) => (
                              <tr key={i}>
                                <td>{formatDate(t.date)}</td>
                                <td>{t.project}</td>
                                <td>{t.task}</td>
                                <td>{t.status}</td>
                                <td>{t.hours}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  ))}

                  <h6>Total Hours per Project</h6>
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(summary.projectHours).map(([proj, hrs]) => (
                        <tr key={proj}>
                          <td>{proj}</td>
                          <td>{hrs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  <h6>Total Tasks per Project by Status</h6>
                  <Table striped bordered hover size="sm">
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
                        <tr key={proj}>
                          <td>{proj}</td>
                                  <td>{counts.total || 0}</td>
                          <td>{counts.pending || 0}</td>
                          <td>{counts.completed || 0}</td>
                  
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Accordion.Body>
              </Accordion.Item>
            </Card>
          );
        })}
      </Accordion>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <Button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>Previous</Button>
          <Pagination className="mb-0">
            {[...Array(totalPages)].map((_, i) => (
              <Pagination.Item key={i} active={i + 1 === currentPage} onClick={() => handlePageChange(i + 1)}>
                {i + 1}
              </Pagination.Item>
            ))}
          </Pagination>
          <Button disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>Next</Button>
        </div>
      )}
    </AppLayout>
  );
}