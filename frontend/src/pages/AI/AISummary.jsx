import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";
import { Button, Table, Card, Form, Breadcrumb, Modal, Spinner } from "react-bootstrap";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AISummary() {
  const [loading, setLoading] = useState(false);

  const [tableData, setTableData] = useState([]);
  const [history, setHistory] = useState([]);

  const [employeeHours, setEmployeeHours] = useState({});
  const [projectHours, setProjectHours] = useState({});
  const [projectTaskCounts, setProjectTaskCounts] = useState({});

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ---------------- MODAL STATE ----------------
  const [modal, setModal] = useState({
    show: false,
    title: "",
    message: "",
    variant: "info",
  });

  const showModal = (title, message, variant = "info") => {
    setModal({ show: true, title, message, variant });
  };

  const closeModal = () => {
    setModal({ show: false, title: "", message: "", variant: "info" });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get("/ai-summary/history");
      setHistory(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const generateReport = async () => {
    if (!fromDate || !toDate) {
      showModal("Validation Error", "Please select From and To dates", "danger");
      return;
    }

    if (fromDate > toDate) {
      showModal("Validation Error", "From date cannot be greater than To date", "danger");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/ai-summary", {
        from_date: fromDate,
        to_date: toDate,
      });

      setTableData(res.data.tableData || []);
      setEmployeeHours(res.data.employeeHours || {});
      setProjectHours(res.data.projectHours || {});
      setProjectTaskCounts(res.data.projectTaskCounts || {});

      fetchHistory();

      showModal("Success", "Report generated successfully", "success");
    } catch (err) {
      console.error(err);
      showModal("Error", "Failed to generate report", "danger");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const groupedByEmployee = tableData.reduce((acc, row) => {
    if (!acc[row.employee]) acc[row.employee] = [];
    acc[row.employee].push(row);
    return acc;
  }, {});

  const projectStatusHours = tableData.reduce((acc, row) => {
    if (!acc[row.project]) acc[row.project] = { "In Progress": 0, Completed: 0 };

    if (row.status === "In Progress")
      acc[row.project]["In Progress"] += row.hours || 0;

    if (row.status === "Completed")
      acc[row.project]["Completed"] += row.hours || 0;

    return acc;
  }, {});

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.text("Summary Report", 14, 20);
    doc.text(`From: ${formatDate(fromDate)} To: ${formatDate(toDate)}`, 14, 28);

    let startY = 36;

    Object.entries(groupedByEmployee).forEach(([emp, tasks]) => {
      doc.text(`${emp}`, 14, startY);
      startY += 6;

      autoTable(doc, {
        head: [["Date", "Project", "Task", "Status", "Hours"]],
        body: tasks.map((t) => [
          formatDate(t.date),
          t.project,
          t.task,
          t.status,
          t.hours,
        ]),
        startY,
      });

      startY = doc.lastAutoTable.finalY + 10;
    });

    doc.save("summary.pdf");
  };

  return (
    <AppLayout>
      {/* ---------------- HEADER ---------------- */}
      <div className="d-flex justify-content-between mb-3">
        <h4>Summary Report</h4>

        <Breadcrumb>
          <Breadcrumb.Item href="/">Dashboard</Breadcrumb.Item>
          <Breadcrumb.Item active>Summary</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      {/* ---------------- FILTER CARD ---------------- */}
      <Card className="mb-3 p-3 shadow-sm">
        <Form className="d-flex gap-2 flex-wrap align-items-end">
          <Form.Group>
            <Form.Label>From</Form.Label>
            <Form.Control type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </Form.Group>

          <Form.Group>
            <Form.Label>To</Form.Label>
            <Form.Control type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </Form.Group>

          <Button onClick={generateReport} disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" animation="border" /> Loading...
              </>
            ) : (
              "Generate Report"
            )}
          </Button>
        </Form>
      </Card>

      {/* ---------------- EMPTY STATE ---------------- */}
      {!loading && tableData.length === 0 && (
        <Card className="p-3 text-center text-muted">
          No report generated yet. Select dates and generate report.
        </Card>
      )}

      {/* ---------------- DATA VIEW ---------------- */}
      {tableData.length > 0 && (
        <Card className="p-3 shadow-sm">
          <div className="d-flex justify-content-between mb-3">
            <strong>
              Report: {formatDate(fromDate)} → {formatDate(toDate)}
            </strong>

            <Button size="sm" variant="success" onClick={exportPDF}>
              Export PDF
            </Button>
          </div>

          {Object.entries(groupedByEmployee).map(([emp, tasks]) => (
            <Card key={emp} className="mb-3">
              <Card.Header>
                {emp} - Hours: {employeeHours[emp] || 0}
              </Card.Header>

              <Card.Body>
                <Table size="sm" striped bordered>
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
        </Card>
      )}

      {/* ---------------- MODAL ---------------- */}
      <Modal show={modal.show} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{modal.title}</Modal.Title>
        </Modal.Header>

        <Modal.Body>{modal.message}</Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </AppLayout>
  );
}
