import { useEffect, useState } from "react";
import AppLayoutImport from "../../components/layout/AppLayout";
import api from "../../api";
import { Link } from "react-router-dom";
import DataTableImport from "react-data-table-component";
import * as ReactBootstrap from "react-bootstrap";
import SelectImport from "react-select";

// ✅ Fix default export issues safely
const AppLayout = AppLayoutImport?.default || AppLayoutImport;
const DataTable = DataTableImport?.default || DataTableImport;
const Select = SelectImport?.default || SelectImport;

// ✅ Fix react-bootstrap safely
const { Modal, Button, Form, InputGroup } = ReactBootstrap;

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
const [editFormData, setEditFormData] = useState({
  task: "",
  assigned_to: [],
  project_id: null,
  status: "Inprogress"
});
  const [createFormData, setCreateFormData] = useState({
    project_id: null,
    newProjectName: "",
    tasks: [{ task: "", assigned_to: [] }],
  });
  const [isAddingProject, setIsAddingProject] = useState(false);

  const token = localStorage.getItem("token");
  let isAdmin = false;
  let loggedInUserId = null;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      isAdmin = payload.role === "admin";
      loggedInUserId = payload.id;
    } catch (err) {
      console.error("Token decode failed", err);
    }
  }

  // Load tasks and users
  useEffect(() => {
    loadTasks();
    fetchUsers();
    fetchProjects();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tasks-project");
      setTasks(res.data.tasks || []);
      setUsers(res.data.users || []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/list/users");
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed loading users", err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get("/tasks-project/projects");
      setProjects(res.data || []);
    } catch (err) {
      console.error("Failed loading projects", err);
    }
  };

  /** ================= Edit Modal ================= **/
  const openEditModal = (task) => {
    setSelectedTask(task);

    const assignedIds = task.assigned_to
      ? task.assigned_to.split(",").map((id) => parseInt(id.trim()))
      : [];

    const selectedUsers = users
      .filter((u) => assignedIds.includes(u.id))
      .map((u) => ({ value: u.id, label: u.name }));

   setEditFormData({
  task: task.task,
  assigned_to: selectedUsers,
  project_id: task.project_id,
  status: task.status || "Inprogress"
});
    setShowEditModal(true);
  };
  const handleEditSave = async () => {
    if (!selectedTask) return;

    try {
      const payload = {
  task: editFormData.task,
  project_id: selectedTask.project_id,
  assigned_to: editFormData.assigned_to.map((u) => u.value).join(","),
  status: editFormData.status
};

      await api.put(`/tasks-project/${selectedTask.id}`, payload);

      await loadTasks();
      setShowEditModal(false);
    } catch (err) {
      console.error("Failed to update task:", err);
      alert("Failed to update task.");
    }
  };

  /** ================= Create Modal ================= **/
  const handleAddTaskRow = () => {
    setCreateFormData({
      ...createFormData,
      tasks: [...createFormData.tasks, { task: "", assigned_to: [] }],
    });
  };

  const handleCreateTaskChange = (index, field, value) => {
    const updatedTasks = [...createFormData.tasks];
    updatedTasks[index][field] = value;
    setCreateFormData({ ...createFormData, tasks: updatedTasks });
  };

  const handleCreateSave = async () => {
    try {
      // Payload to send to bulk endpoint
      const payload = {
        project_name: isAddingProject ? createFormData.newProjectName : undefined,
        project_id: !isAddingProject ? createFormData.project_id : undefined,
        tasks: createFormData.tasks.map((t) => ({
          task: t.task,
          assigned_to: t.assigned_to.map((u) => u.value), // send array of user IDs
        })),
      };

      // Call bulk endpoint: backend handles project creation if project_name is provided
      await api.post("/tasks-project/bulk", payload);

      // Reload tasks and reset form
      await loadTasks();
      setShowCreateModal(false);
      setCreateFormData({ project_id: null, newProjectName: "", tasks: [{ task: "", assigned_to: [] }] });
      setIsAddingProject(false);
    } catch (err) {
      console.error("Failed to create tasks:", err);
      alert("Failed to create tasks.");
    }
  };

  /** ================= Table Filter ================= **/
  const filteredTasks = tasks.filter((task) => {
    if (!searchText) return true;
    const text = searchText.toLowerCase();
    return (
      (task.task || "").toLowerCase().includes(text) ||
      (task.project_name || "").toLowerCase().includes(text) ||
      (task.assigned_to_names || "").toLowerCase().includes(text) ||
      (task.created_by_name || "").toLowerCase().includes(text)
    );
  });

  const rows = [...filteredTasks]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((task, index) => ({
      ...task,
      serial: index + 1,
      assignedUsers: task.assigned_to_names
        ? task.assigned_to_names.split(",").map((u) => u.trim())
        : [],
      formattedDate: new Date(task.created_at).toLocaleDateString(),
    }));

  const columns = [
    { name: "SI.No", selector: (row) => row.serial, width: "70px", center: true },
    { name: "Date", selector: (row) => row.formattedDate, sortable: true, width: "120px" },
    { name: "Project", selector: (row) => row.project_name, sortable: true },
    { name: "Task", selector: (row) => row.task, sortable: true },
    {
      name: "Assigned To",
      selector: (row) => row.assignedUsers.join(", "),
      cell: (row) =>
        row.assignedUsers.map((name, idx) => (
          <span key={idx} className="badge bg-info text-dark me-1">{name}</span>
        )),
    },
    {
      name: "Created By",
      selector: (row) => row.created_by_name
    },
    {
      name: "Total Man Hours",
      selector: (row) => row.total_man_hrs,
      sortable: true,
      cell: (row) => `${row.total_man_hrs || 0} hrs`
    },
    {
      name: "Status",
      selector: (row) => row.status
    },
    {
      name: "Action",
      cell: (row) => {
        if (isAdmin || row.created_by === loggedInUserId) {
          return (
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-primary" onClick={() => openEditModal(row)}>Edit</button>
              <button
                className="btn btn-sm btn-danger"
                onClick={async () => {
                  if (window.confirm("Are you sure you want to delete this task?")) {
                    try {
                      await api.delete(`/tasks-project/${row.id}`);
                      setTasks(tasks.filter((t) => t.id !== row.id));
                      alert("Task deleted successfully!");
                    } catch (err) {
                      console.error("Failed to delete task:", err);
                      alert("Failed to delete task.");
                    }
                  }
                }}
              >Delete</button>
            </div>
          );
        }
        return null;
      },
    },
  ];

  return (
    <AppLayout>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-semibold mb-0">Task List</h4>
      </div>

      <div className="card border-0 shadow-sm rounded-3 p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <input
            type="text"
            className="form-control w-25"
            placeholder="Search tasks..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            + Add Task
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
  noDataComponent="No tasks found."
/>
      </div>

      {/* Edit Task Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="xl" centered>
        <Modal.Header closeButton><Modal.Title>Edit Task</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedTask && (
            <Form>
              <div className="row g-3">
                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label>Date</Form.Label>
                    <Form.Control type="text" value={new Date(selectedTask.created_at).toLocaleDateString()} disabled />
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label>Project</Form.Label>
                    <Form.Control
                      type="text"
                      value={selectedTask.project_name}
                      disabled
                    />
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label>Created By</Form.Label>
                    <Form.Control type="text" value={selectedTask.created_by_name} disabled />
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group>
                    <Form.Label>Task</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={editFormData.task}
                      onChange={(e) => setEditFormData({ ...editFormData, task: e.target.value })}
                    />
                  </Form.Group>
                </div>
                <div className="col-12">
                  <Form.Group>
                    <Form.Label>Assigned To</Form.Label>
                    <Select
                      isMulti
                      options={isAdmin ? users.map(u => ({ value: u.id, label: u.name })) :
                        users.filter(u => u.id === loggedInUserId).map(u => ({ value: u.id, label: u.name }))}
                      value={editFormData.assigned_to}
                      onChange={(selected) => setEditFormData({ ...editFormData, assigned_to: selected })}
                      placeholder="Select users..."
                    />
                  </Form.Group>
                </div>
                <div className="col-md-6">
  <Form.Group>
    <Form.Label>Status</Form.Label>
    <Form.Select
      value={editFormData.status}
      onChange={(e) =>
        setEditFormData({
          ...editFormData,
          status: e.target.value
        })
      }
    >
      <option value="In Progress">In progress</option>
      <option value="Completed">Completed</option>
    </Form.Select>
  </Form.Group>
</div>
              </div>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleEditSave}>Save</Button>
        </Modal.Footer>
      </Modal>

      {/* Create Task Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="xl" centered>
        <Modal.Header closeButton><Modal.Title>Create Tasks</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Date</Form.Label>
                  <Form.Control type="text" value={new Date().toLocaleDateString()} disabled />
                </Form.Group>
              </div>

              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Project</Form.Label>
                  <InputGroup>
                    <Form.Select
                      value={createFormData.project_id || ""}
                      onChange={e => setCreateFormData({ ...createFormData, project_id: parseInt(e.target.value) })}
                      disabled={isAddingProject}
                    >
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                    </Form.Select>
                    <Button variant={isAddingProject ? "secondary" : "success"} onClick={() => setIsAddingProject(!isAddingProject)}>
                      {isAddingProject ? "Cancel" : "+"}
                    </Button>
                  </InputGroup>
                  {isAddingProject && (
                    <Form.Control
                      type="text"
                      className="mt-2"
                      placeholder="Enter new project name"
                      value={createFormData.newProjectName}
                      onChange={(e) => setCreateFormData({ ...createFormData, newProjectName: e.target.value })}
                    />
                  )}
                </Form.Group>
              </div>

              {createFormData.tasks.map((t, idx) => (
                <div key={idx} className="col-md-12 border p-3 mb-2 rounded">
                  <Form.Group className="mb-2">
                    <Form.Label>Task {idx + 1}</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={t.task}
                      onChange={e => handleCreateTaskChange(idx, "task", e.target.value)}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Assigned To</Form.Label>
                    <Select
                      isMulti
                      options={isAdmin ? users.map(u => ({ value: u.id, label: u.name })) :
                        users.filter(u => u.id === loggedInUserId).map(u => ({ value: u.id, label: u.name }))}
                      value={t.assigned_to}
                      onChange={selected => handleCreateTaskChange(idx, "assigned_to", selected)}
                      placeholder="Select users..."
                    />
                  </Form.Group>
                </div>
              ))}

              <div className="col-12">
                <Button variant="info" size="sm" onClick={handleAddTaskRow}>+ Add Another Task</Button>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreateSave}>Save Tasks</Button>
        </Modal.Footer>
      </Modal>
    </AppLayout>
  );
}
