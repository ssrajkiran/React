import { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";
import DataTableImport from "react-data-table-component";
import { Button, Modal, Form } from "react-bootstrap";

const DataTable = DataTableImport?.default || DataTableImport;

export default function Holiday() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [form, setForm] = useState({ name: "", date: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    loadHolidays();
  }, []);

  // ================= LOAD =================
  const loadHolidays = async () => {
    try {
      setLoading(true);
      const res = await api.get("/holidays/list");

      const data = res.data || [];

      const safeData = data.map((h) => ({
        id: h?.id,
        name: h?.name || "",
        date: h?.date || "",
        day: h?.date
          ? new Date(h.date).toLocaleDateString("en-US", {
              weekday: "long",
            })
          : "",
      }));

      setHolidays(safeData);
    } catch (err) {
      console.error(err);
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  // ================= SEARCH FILTER =================
  const filteredData = holidays.filter((h) => {
    if (!searchText) return true;

    const text = searchText.toLowerCase();
    return (
      (h.name || "").toLowerCase().includes(text) ||
      (h.date || "").toLowerCase().includes(text) ||
      (h.day || "").toLowerCase().includes(text)
    );
  });

  // ================= FORM =================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleModal = (holiday = null) => {
    if (holiday) {
      setSelectedHoliday(holiday);
      setForm({ name: holiday.name, date: holiday.date });
    } else {
      setSelectedHoliday(null);
      setForm({ name: "", date: "" });
    }
    setError("");
    setShowModal(true);
  };

  // ================= SAVE =================
  const handleSave = async () => {
    if (!form.name || !form.date) {
      setError("Please fill all fields");
      return;
    }

    try {
      if (selectedHoliday) {
        await api.put(`/holidays/${selectedHoliday.id}`, form);
      } else {
        await api.post("/holidays/create", form);
      }

      setShowModal(false);
      loadHolidays();
    } catch (err) {
      console.error(err);
      setError("Failed to save holiday");
    }
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this holiday?")) return;

    try {
      await api.delete(`/holidays/${id}`);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  // ================= COLUMNS =================
  const columns = [
    {
      name: "SI.No",
      cell: (row, index) => index + 1,
      width: "80px",
      center: true,
    },
    {
      name: "Holiday Name",
      selector: (row) => row.name,
      sortable: true,
    },
    {
      name: "Date",
      selector: (row) => row.date,
      sortable: true,
    },
    {
      name: "Day",
      selector: (row) => row.day,
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="d-flex gap-2">
          <Button size="sm" variant="info" onClick={() => handleModal(row)}>
            Edit
          </Button>

          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Holidays</h4>

        <Button variant="success" size="sm" onClick={() => handleModal()}>
          + Add Holiday
        </Button>
      </div>

      {/* SEARCH */}
      <div className="mb-3">
        <input
          type="text"
          className="form-control w-25"
          placeholder="Search holidays..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div className="card shadow-sm p-3">
        <DataTable
          columns={columns}
          data={filteredData}
          progressPending={loading}
          pagination
          highlightOnHover
          striped
          responsive
          noDataComponent="No holidays found"
        />
      </div>

      {/* MODAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedHoliday ? "Edit Holiday" : "Add Holiday"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group className="mb-2">
              <Form.Label>Holiday Name</Form.Label>
              <Form.Control
                name="name"
                value={form.name}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
              />
            </Form.Group>

            {error && <small className="text-danger">{error}</small>}
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