import { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";
import DataTableImport from "react-data-table-component";
import { Link } from "react-router-dom";
import { Modal, Button, Form } from "react-bootstrap";

const DataTable =
  DataTableImport?.default || DataTableImport;

export default function UsersPresent() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState("");

  // ================= LOAD USERS =================
  useEffect(() => {
    loadUsers();
  }, []);
const loadUsers = async () => {
  try {
    setLoading(true);

    const res = await api.get("/auth/users");

    console.log("Users API response:", res.data);

    // ✅ FIX HERE (most important)
    const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

    setUsers(
      data.map((u) => ({
        id: u?.id ?? "",
        name: u?.name ?? "",
        email: u?.email ?? "",
        role: u?.role ?? "",
      }))
    );
  } catch (err) {
    console.error("Failed to load users:", err);
    setUsers([]);
  } finally {
    setLoading(false);
  }
};

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;

    try {
      await api.delete(`/auth/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete user");
    }
  };

  // ================= EDIT =================
  const handleUpdate = (user) => {
    setSelectedUser({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      role: user.role || "",
      password: "",
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    setSelectedUser((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { id, name, email, role, password } = selectedUser;

      await api.put(`/auth/${id}`, {
        name,
        email,
        role,
        ...(password ? { password } : {}),
      });

      setShowModal(false);
      await loadUsers();
    } catch (err) {
      console.error(err);
      alert("Update failed");
    } finally {
      setSaving(false);
    }
  };

  // ================= FILTER =================
  const filteredUsers = users.filter((u) => {
    const text = searchText.toLowerCase();
    return (
      u.name.toLowerCase().includes(text) ||
      u.email.toLowerCase().includes(text) ||
      u.role.toLowerCase().includes(text)
    );
  });

  // ================= COLUMNS =================
  const columns = [
    {
      name: "SI.No",
      cell: (row, index) => index + 1,
      width: "80px",
      center: true,
    },
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
    },
    {
      name: "Email",
      selector: (row) => row.email,
      sortable: true,
    },
    {
      name: "Role",
      cell: (row) => (
        <span className={`badge ${row.role === "admin" ? "bg-danger" : "bg-primary"}`}>
          {row.role || "-"}
        </span>
      ),
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-info"
            onClick={() => handleUpdate(row)}
          >
            Edit
          </button>

          <button
            className="btn btn-sm btn-danger"
            onClick={() => handleDelete(row.id)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      {/* HEADER */}
      <div className="d-flex justify-content-between mb-3">
        <h4>All Users</h4>
        <Link className="btn btn-primary btn-sm" to="/admin/users/create">
          + Add User
        </Link>
      </div>

      {/* SEARCH */}
      <div className="card p-3 shadow-sm mb-3">
        <input
          className="form-control w-25"
          placeholder="Search users..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {/* DATA TABLE */}
      <div className="card p-3 shadow-sm">
        <DataTable
          columns={columns}
          data={filteredUsers}
          progressPending={loading}
          pagination
          highlightOnHover
          striped
          responsive
          noDataComponent="No users found"
        />
      </div>

      {/* MODAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit User</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedUser && (
            <Form>
              <Form.Control
                className="mb-2"
                name="name"
                value={selectedUser.name}
                onChange={handleChange}
              />

              <Form.Control
                className="mb-2"
                name="email"
                value={selectedUser.email}
                onChange={handleChange}
              />

              <Form.Select
                className="mb-2"
                name="role"
                value={selectedUser.role}
                onChange={handleChange}
              >
                <option value="">Select Role</option>
                <option value="admin">Admin</option>
                <option value="employee">Employee</option>
              </Form.Select>

              <Form.Control
                type="password"
                name="password"
                value={selectedUser.password}
                onChange={handleChange}
                placeholder="Password"
              />
            </Form>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>

          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>
    </AppLayout>
  );
}
