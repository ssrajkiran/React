import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DataTableImport from "react-data-table-component";
import api from "../../api";
import AppLayout from "../../components/layout/AppLayout";

const DataTable = DataTableImport?.default || DataTableImport;

export default function TaskReport() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  const [filters, setFilters] = useState({
    project_id: "",
    assigned_to: "",
    status: "",
  });

  // ================= FETCH TASKS =================
  const fetchTasks = async () => {
    try {
      const res = await api.get("/tasks_report/report", {
        params: filters,
      });

      const data = Array.isArray(res.data) ? res.data : [];

      const formatted = data.map((t) => ({
        project_name: t?.project_name || "-",
        task: t?.task || "-",
        status: t?.status || "Pending",
        assigned_to_names: t?.assigned_to_names || "-",
      }));

      setTasks(formatted);
    } catch (err) {
      console.error("Task fetch error:", err);
      setTasks([]);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get("/tasks_report/projects");
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch {
      setProjects([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/tasks_report/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchTasks();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  const handleFilter = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ================= COLUMNS (SAFE) =================
  const columns = [
    {
      name: "SI.No",
      cell: (row, index) => index + 1,
      width: "80px",
      center: true,
    },
    {
      name: "Project",
      selector: (row) => row?.project_name || "-",
      sortable: true,
    },
    {
      name: "Task",
      selector: (row) => row?.task || "-",
      wrap: true,
    },
    {
      name: "Assigned To",
      selector: (row) => row?.assigned_to_names || "-",
      wrap: true,
    },
    {
      name: "Status",
      cell: (row) => {
        const status = row?.status || "Pending";

        return (
          <span
            className={`badge ${
              status === "Completed"
                ? "bg-success"
                : status === "In Progress"
                ? "bg-warning"
                : "bg-secondary"
            }`}
          >
            {status}
          </span>
        );
      },
    },
  ];

  return (
    <AppLayout>
      {/* HEADER */}
      <div className="d-flex justify-content-between mb-3">
        <h4>Task Report</h4>
        <nav>
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <Link to="/admin/dashboard">Dashboard</Link>
            </li>
            <li className="breadcrumb-item active">Task Report</li>
          </ol>
        </nav>
      </div>

      {/* FILTERS */}
      <div className="card p-3 mb-3">
        <div className="row g-3">
          <div className="col-md-4">
            <label>Project</label>
            <select
              className="form-control"
              name="project_id"
              value={filters.project_id}
              onChange={handleFilter}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4">
            <label>Assigned To</label>
            <select
              className="form-control"
              name="assigned_to"
              value={filters.assigned_to}
              onChange={handleFilter}
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-4">
            <label>Status</label>
            <select
              className="form-control"
              name="status"
              value={filters.status}
              onChange={handleFilter}
            >
              <option value="">All Status</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="card p-3">
        <DataTable
          columns={columns}
          data={tasks || []}
          pagination
          striped
          highlightOnHover
          responsive
          noDataComponent="No tasks found"
        />
      </div>
    </AppLayout>
  );
}
