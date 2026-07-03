import { useEffect, useState } from "react";
import AppLayoutImport from "../../components/layout/AppLayout";
import api from "../../api";
import * as ReactBootstrap from "react-bootstrap";
import DataTableImport from "react-data-table-component";
import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

// ✅ Safe fixes for default/named export issues
const AppLayout = AppLayoutImport?.default || AppLayoutImport;
const DataTable = DataTableImport?.default || DataTableImport;

// ✅ Safe destructure for bootstrap
const { Breadcrumb, Form, Button, Alert, Modal } = ReactBootstrap;

export default function EmployeeTimesheetList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  // Modal & Form state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    date: "",
    created_by: "",
    project: "",
    task: "",
    man_hrs: "",
  });
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loggedUserId, setLoggedUserId] = useState(null);

  // Message state
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setLoggedUserId(payload.id);
        setForm((prev) => ({ ...prev, created_by: payload.id }));
      } catch (err) {
        console.error("Token decode failed", err);
      }
    }

    loadData();
    loadProjects();
  }, []);

  // Load employee timesheets
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/timesheet/employee", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setData(res.data);
    } catch (err) {
      console.error("Failed to load timesheets:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load projects
  const loadProjects = async () => {
    try {
      const res = await api.get("/timesheet/employee/projects", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Load tasks for a project
  const loadTasks = async (projectId) => {
    try {
      const res = await api.get(`/timesheet/employee/tasks/${projectId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === "project") loadTasks(value);
  };

  // Save timesheet with 8-hour per day limit
  const handleSave = async () => {
    if (!form.date || !form.task || !form.man_hrs) {
      setMessage("Please fill all required fields");
      setMessageType("danger");
      return;
    }

    // Check if total hours exceed 8 for the selected date
    const totalHours = data
      .filter((t) => t.timesheet_date === form.date)
      .reduce((sum, t) => sum + Number(t.man_hrs), 0);

    if (totalHours + Number(form.man_hrs) > 8) {
      setMessage("Cannot exceed 8 hours per day");
      setMessageType("danger");
      return;
    }

    try {
      await api.post(
        "/timesheet",
        {
          date: form.date,
          created_by: form.created_by,
          project: form.project,
          task: form.task,
          man_hrs: form.man_hrs,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      setShowModal(false);
      setMessage("Timesheet added successfully");
      setMessageType("success");

      setForm({ date: "", created_by: loggedUserId, project: "", task: "", man_hrs: "" });
      setTasks([]);
      loadData();

      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to add timesheet");
      setMessageType("danger");
    }
  };

  // Filter data for search
  const filteredData = data.filter((t) => {
    const text = searchText.toLowerCase();
    return (
      t.task_name?.toLowerCase().includes(text) ||
      t.project_name?.toLowerCase().includes(text) ||
      t.task_status?.toLowerCase().includes(text)
    );
  });

  // Map rows for DataTable
  const rows = filteredData.map((t, index) => ({
    ...t,
    serial: index + 1,
    formattedDate: t.timesheet_date
      ? new Date(t.timesheet_date).toLocaleDateString("en-GB")
      : "-",
    statusBadge:
      t.task_status === "completed"
        ? "bg-success"
        : t.task_status === "in-progress"
        ? "bg-warning text-dark"
        : "bg-secondary",
  }));

  const columns = [
    { name: "SI.No", selector: (row) => row.serial, width: "70px", center: true },
    { name: "Date", selector: (row) => row.formattedDate, sortable: true, width: "120px" },
    { name: "Project", selector: (row) => row.project_name, sortable: true },
    { name: "Task", selector: (row) => row.task_name, sortable: true },
    {
      name: "Status",
      selector: (row) => row.task_status,
      cell: (row) => <span className={`badge ${row.statusBadge}`}>{row.task_status || "Pending"}</span>,
      sortable: true,
    },
    { name: "Man Hours", selector: (row) => (row.man_hrs ? `${row.man_hrs} hrs` : "-"), sortable: true },
  ];

  return (
    <AppLayout>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-semibold mb-0">My Timesheets</h4>
        <Breadcrumb className="mb-0">
          <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
          <Breadcrumb.Item active>Employee</Breadcrumb.Item>
          <Breadcrumb.Item active>Timesheets</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      <div className="card p-3 shadow-sm">
        {/* Show message above list only if modal is closed */}
        {!showModal && message && (
          <Alert variant={messageType} dismissible onClose={() => setMessage("")} className="mb-3">
            {message}
          </Alert>
        )}

        <div className="d-flex justify-content-between align-items-center mb-3">
          <div style={{ maxWidth: "300px" }}>
            <Form.Control
              type="text"
              placeholder="Search by task, project, or status..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <Button size="sm" variant="primary" onClick={() => setShowModal(true)}>
            + Add Timesheet
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          progressPending={loading}
          pagination
          highlightOnHover
          striped
          responsive
          noHeader
          noDataComponent="No timesheets found."
        />
      </div>

      {/* ------------------ Add Timesheet Modal ------------------ */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Timesheet</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/* Show message inside modal if modal is open */}
          {showModal && message && (
            <Alert variant={messageType} dismissible onClose={() => setMessage("")}>
              {message}
            </Alert>
          )}

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control type="date" name="date" value={form.date} onChange={handleChange} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Project</Form.Label>
              <Form.Select name="project" value={form.project} onChange={handleChange}>
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Task</Form.Label>
              <Form.Select name="task" value={form.task} onChange={handleChange}>
                <option value="">Select Task</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.task}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label>Man Hours</Form.Label>
              <Form.Select name="man_hrs" value={form.man_hrs} onChange={handleChange}>
                <option value="">Select Hours</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                  <option key={h} value={h}>
                    {h} hrs
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </AppLayout>
  );
}
