import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";
import { useNavigate, Link } from "react-router-dom";

export default function CreateUser() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: ""
  });

  const [error, setError] = useState(""); // For validation & backend errors

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const validateEmail = (email) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(form.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setError("");

    try {
      const res = await api.post("/auth/register", form);

      alert(res.data.message || "User created successfully");
      navigate("/employee/userslist");

    } catch (err) {
      console.error("Create user error:", err);

      // If backend returns JSON { message: "User already exists" }
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to create user");
      }
    }
  };

  return (
    <AppLayout>

      {/* Header + Breadcrumb */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-semibold mb-0">Create User</h4>
        <nav>
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">Setup</li>
            <li className="breadcrumb-item">Users</li>
            <li className="breadcrumb-item active">Create</li>
          </ol>
        </nav>
      </div>

      {/* Form Card */}
      <div className="card shadow-sm p-4">
        <form onSubmit={handleSubmit}>

          {/* Name */}
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-control"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email */}
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />

            {error && (
              <small className="text-danger">{error}</small>
            )}
          </div>

          {/* Password */}
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* Role */}
          <div className="mb-3">
            <label className="form-label">Role</label>
            <select
              className="form-control"
              name="role"
              value={form.role}
              onChange={handleChange}
              required
            >
              <option value="">Select Role</option>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          {/* Save Button Right */}
        {/* Save & Back Buttons */}
<div className="d-flex justify-content-between">
  <button
    type="button"
    className="btn btn-secondary"
    onClick={() => navigate(-1)}
  >
    Back
  </button>

  <button type="submit" className="btn btn-success">
    Save User
  </button>
</div>

        </form>
      </div>

    </AppLayout>
  );
}
