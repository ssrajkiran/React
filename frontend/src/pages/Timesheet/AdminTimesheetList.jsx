import { useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import api from "../../api";
import DataTableImport from "react-data-table-component";
import { Button, Form, Breadcrumb, Alert } from "react-bootstrap";

const DataTable = DataTableImport?.default || DataTableImport;

export default function AdminTimesheetList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [role, setRole] = useState("");
  const [loggedUserId, setLoggedUserId] = useState(null);

  const [listMessage, setListMessage] = useState("");
  const [listMessageType, setListMessageType] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setRole(payload.role);
        setLoggedUserId(payload.id);
      } catch (e) {
        console.error("Token error:", e);
      }
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await api.get("/timesheet/admin", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const result = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];

      setData(result);
    } catch (err) {
      console.error("Load error:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteTimesheet = async (id) => {
    if (!window.confirm("Delete this timesheet?")) return;

    try {
      await api.delete(`/timesheet/delete/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setListMessage("Deleted successfully");
      setListMessageType("success");
      loadData();
    } catch (err) {
      console.error(err);
      setListMessage("Delete failed");
      setListMessageType("danger");
    }
  };

  // ---------------- FILTER ----------------
  const filteredData = (data || []).filter((t) => {
    const text = searchText.toLowerCase();

    return (
      (t.task_name || "").toLowerCase().includes(text) ||
      (t.project_name || "").toLowerCase().includes(text) ||
      (t.created_by_name || "").toLowerCase().includes(text)
    );
  });

  // ---------------- ROWS ----------------
  const rows = filteredData.map((t, i) => ({
    ...t,
    serial: i + 1,
    formattedDate: t.timesheet_date
      ? new Date(t.timesheet_date).toLocaleDateString("en-GB")
      : "-",
  }));

  // ---------------- COLUMNS ----------------
  const columns = [
    {
      name: "SI.No",
      cell: (row, index) => index + 1,
      width: "70px",
    },
    {
      name: "Date",
      selector: (row) => row.formattedDate,
    },
    {
      name: "User",
      selector: (row) => row.created_by_name || "-",
    },
    {
      name: "Project",
      selector: (row) => row.project_name || "-",
    },
    {
      name: "Task",
      selector: (row) => row.task_name || "-",
    },
    {
      name: "Hours",
      cell: (row) => `${row.man_hrs || 0} hrs`,
    },
    {
      name: "Action",
      cell: (row) => {
        if (
          role === "admin" ||
          row.timesheet_created_by === loggedUserId
        ) {
          return (
            <Button
              size="sm"
              variant="danger"
              onClick={() => deleteTimesheet(row.timesheet_id)}
            >
              Delete
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <AppLayout>
      <div className="d-flex justify-content-between mb-3">
        <h4>Timesheet List</h4>

        <Breadcrumb>
          <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
          <Breadcrumb.Item active>Timesheets</Breadcrumb.Item>
        </Breadcrumb>
      </div>

      {/* Message */}
      {listMessage && (
        <Alert
          variant={listMessageType}
          onClose={() => setListMessage("")}
          dismissible
        >
          {listMessage}
        </Alert>
      )}

      {/* Search + Table */}
      <div className="card p-3 shadow-sm">
        <div className="mb-3">
          <Form.Control
            placeholder="Search by task, project, or user..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <DataTable
          columns={columns}
          data={rows}
          progressPending={loading}
          pagination
          striped
          highlightOnHover
          responsive
          noDataComponent="No timesheets found"
        />
      </div>
    </AppLayout>
  );
}
