import { useState, useEffect } from "react";
import api from "../../api";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import AppLayout from "../../components/layout/AppLayout";
import { Link } from "react-router-dom";

import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function AdminLeaves() {
    const [events, setEvents] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [employeeColors, setEmployeeColors] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);

    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [summaryData, setSummaryData] = useState([]);
    const [visibleRange, setVisibleRange] = useState({ start: null, end: null });

    // Toggle: calendar or list
    const [viewMode, setViewMode] = useState("calendar"); // "calendar" or "list"

    // Sort state for list view
    const [sortField, setSortField] = useState("name");
    const [sortOrder, setSortOrder] = useState("asc");

    // ================== FETCH EMPLOYEES ==================
    const fetchEmployees = async () => {
        try {
            const res = await api.get("/leaves/admin_userspanel");
            setEmployees(res.data);

            // Assign unique colors per employee
            const colors = {};
            res.data.forEach((emp, index) => {
                const hue = (index * 137.5) % 360; // golden angle
                colors[emp.id] = `hsl(${hue}, 70%, 50%)`;
            });
            setEmployeeColors(colors);
        } catch (err) {
            console.error("Error fetching employees:", err);
        }
    };
const eventStyleGetter = (event) => ({
  style: {
    backgroundColor: "transparent", // no blue background
    border: "none",
    color: "#000", // text color
    padding: "0",
    margin: "0",
  },
});
    // ================== FETCH ALL LEAVES ==================
    const fetchAllLeaves = async () => {
        try {
            const res = await api.get("/leaves/adminpanel");
            const formatted = res.data.map(ev => ({
                ...ev,
                start: new Date(ev.start),
                end: new Date(ev.end),
                title: `${ev.name} (${ev.type.charAt(0).toUpperCase() + ev.type.slice(1)})`,
            }));
            setEvents(formatted);
        } catch (err) {
            console.error("Error fetching leaves:", err);
        }
    };

    useEffect(() => {
        fetchEmployees();
        fetchAllLeaves();
    }, []);

    // ================== EVENT STYLE ==================

    // ================== SELECT EVENT ==================
    const handleSelectEvent = (event) => {
        setFormData({
            id: event.id,
            user_id: event.user_id,
            name: event.name,
            type: event.type,
            start_date: format(event.start, "yyyy-MM-dd"),
            end_date: format(event.end, "yyyy-MM-dd"),
            days: event.days || null,
            hours: event.hours || null,
            slot: event.slot || null,
            compoff_date: event.comp_off_date || null,
            half_day_type: event.half_day_type || "full",
            reason: event.remarks || "",
            status: event.status,
        });
        setShowModal(true);
    };

    // ================== APPROVE / REJECT ==================
    const handleUpdateStatus = async (status) => {
        if (!formData.id) return;
        setLoading(true);
        try {
            const endpoint =
                formData.type === "permission"
                    ? `/leaves/permission/${formData.id}`
                    : `/leaves/leave/${formData.id}`;

            await api.put(endpoint, { status });
            setLoading(false);
            setShowModal(false);
            fetchAllLeaves();
            alert(`Status updated to ${status}`);
        } catch (err) {
            console.error(err);
            setLoading(false);
            alert(err.response?.data?.error || "Error updating status");
        }
    };

    // ================== SUMMARY ==================
    const generateSummary = () => {
        const today = new Date();
        const currentYear = today.getMonth() + 1 >= 4 ? today.getFullYear() : today.getFullYear() - 1;
        const start = new Date(`${currentYear}-04-01`);
        const end = new Date(`${currentYear + 1}-03-31`);

        const summary = {};
        events
            .filter(ev => ev.start >= start && ev.start <= end)
            .forEach(ev => {
                if (!summary[ev.name]) summary[ev.name] = { leave: 0, compoff: 0, permission: 0 };
                if (ev.type === "leave") summary[ev.name].leave += Number(ev.days || 1);
                else if (ev.type === "compoff") summary[ev.name].compoff += Number(ev.days || 0);
            });

        const result = Object.entries(summary).map(([name, counts]) => {
            const totalAllocated = 12 * 2.5;
            const usedLeave = counts.leave - counts.compoff;
            return {
                name,
                leaveTaken: counts.leave.toFixed(2),
                compOff: counts.compoff.toFixed(2),
                permission: counts.permission.toFixed(2),
                totalUsed: usedLeave.toFixed(2),
                remaining: (totalAllocated - usedLeave).toFixed(2),
            };
        });

        setSummaryData(result);
        setShowSummaryModal(true);
    };

    // ================== SORT LIST ==================
    const sortedEvents = [...events].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        // For dates
        if (sortField === "start" || sortField === "end") {
            valA = new Date(valA);
            valB = new Date(valB);
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
    });

    return (
        <AppLayout>
            {/* Header and toggle */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-semibold mb-0">All Employee Leaves</h4>
                <div className="d-flex align-items-center gap-2">
                    <button
                        className={`btn btn-${viewMode === "calendar" ? "primary" : "outline-primary"}`}
                        onClick={() => setViewMode("calendar")}
                    >
                        Calendar View
                    </button>
                    <button
                        className={`btn btn-${viewMode === "list" ? "primary" : "outline-primary"}`}
                        onClick={() => setViewMode("list")}
                    >
                        List View
                    </button>
                    <button className="btn btn-primary ms-2" onClick={generateSummary}>
                        Total Count
                    </button>
                </div>
            </div>

            <div className="card shadow-sm border-0 rounded-4 p-3">
                {viewMode === "calendar" ? (
                 <Calendar
  selectable={false}
  localizer={localizer}
  events={events}
  startAccessor="start"
  endAccessor="end"
  style={{ height: 700 }}
  onSelectEvent={handleSelectEvent}
  eventPropGetter={eventStyleGetter} // <-- use this
  tooltipAccessor={event => `${event.name} - ${event.type.toUpperCase()} (${event.status})`}
  components={{
    event: ({ event }) => {
      let statusLetter = "";
      let color = "";

      switch (event.status) {
        case "approved":
          statusLetter = "A";
          color = "#198754";
          break;
        case "pending":
          statusLetter = "P";
          color = "#ffc107";
          break;
        case "rejected":
          statusLetter = "R";
          color = "#dc3545";
          break;
        default:
          statusLetter = "?";
          color = "#6c757d";
      }

      return (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              backgroundColor: color,
              color: "#fff",
              fontSize: 12,
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {statusLetter}
          </span>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {event.name} ({event.type})
          </span>
        </div>
      );
    },
  }}
/>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-bordered table-striped table-sm text-center">
                            <thead className="table-light">
                                <tr>
                                    <th onClick={() => { setSortField("name"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>Employee</th>
                                    <th onClick={() => { setSortField("type"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>Type</th>
                                    <th onClick={() => { setSortField("start"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>Start Date</th>
                                    <th onClick={() => { setSortField("end"); setSortOrder(sortOrder === "asc" ? "desc" : "asc"); }}>End Date</th>
                                    <th>Days / Hours</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEvents.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center text-muted">
                                            No data available
                                        </td>
                                    </tr>
                                )}
                                {sortedEvents.map((ev, idx) => (
                                    <tr key={idx} style={{ cursor: "pointer" }} onClick={() => handleSelectEvent(ev)}>
                                        <td>{ev.name}</td>
                                        <td className="text-capitalize">{ev.type}</td>
                                        <td>{format(ev.start, "yyyy-MM-dd")}</td>
                                        <td>{format(ev.end, "yyyy-MM-dd")}</td>
                                        <td>{ev.type === "permission" ? ev.hours || "-" : ev.days || 1}</td>
                                        <td>{ev.remarks || "-"}</td>
                                        <td>
                                            <span
                                                className={`badge rounded-pill bg-${
                                                    ev.status === "approved"
                                                        ? "success"
                                                        : ev.status === "rejected"
                                                        ? "danger"
                                                        : "warning"
                                                }`}
                                            >
                                                {ev.status?.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <>
                    <div className="modal fade show d-block">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content rounded-4">
                                <div className="modal-header">
                                    <h5 className="modal-title">Leave / Permission Details</h5>
                                    <button className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <table className="table table-bordered table-sm mb-0">
                                        <tbody>
                                            <tr>
                                                <th>Employee</th>
                                                <td>{formData.name}</td>
                                            </tr>
                                            <tr>
                                                <th>Type</th>
                                                <td className="text-capitalize">{formData.type}</td>
                                            </tr>
                                            <tr>
                                                <th>From</th>
                                                <td>{formData.start_date}</td>
                                            </tr>
                                            {formData.type === "leave" && (
                                                <>
                                                    <tr>
                                                        <th>To</th>
                                                        <td>{formData.end_date}</td>
                                                    </tr>
                                                    <tr>
                                                        <th>Days</th>
                                                        <td>{formData.days || 1}</td>
                                                    </tr>
                                                </>
                                            )}
                                            {formData.type === "permission" && (
                                                <>
                                                    <tr>
                                                        <th>Hours</th>
                                                        <td>{formData.hours}</td>
                                                    </tr>
                                                    <tr>
                                                        <th>Slot</th>
                                                        <td>{formData.slot}</td>
                                                    </tr>
                                                </>
                                            )}
                                            {formData.type === "compoff" && (
                                                <tr>
                                                    <th>Comp Off Date</th>
                                                    <td>{formData.compoff_date}</td>
                                                </tr>
                                            )}
                                            <tr>
                                                <th>Reason</th>
                                                <td>{formData.reason || "-"}</td>
                                            </tr>
                                            <tr>
                                                <th>Status</th>
                                                <td>
                                                    <span
                                                        className={`badge rounded-pill bg-${
                                                            formData.status === "approved"
                                                                ? "success"
                                                                : formData.status === "rejected"
                                                                ? "danger"
                                                                : "warning"
                                                        }`}
                                                    >
                                                        {formData.status?.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>
                                        Close
                                    </button>
                                    {formData.status === "pending" && (
                                        <>
                                            <button
                                                className="btn btn-success"
                                                onClick={() => handleUpdateStatus("approved")}
                                                disabled={loading}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => handleUpdateStatus("rejected")}
                                                disabled={loading}
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )}

            {/* Summary Modal */}
            {showSummaryModal && (
                <>
                    <div className="modal fade show d-block">
                        <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content rounded-4">
                                <div className="modal-header">
                                    <h5 className="modal-title">Employee Leave Summary</h5>
                                    <button className="btn-close" onClick={() => setShowSummaryModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <table className="table table-bordered table-striped">
                                        <thead>
                                            <tr>
                                                <th>Employee Name</th>
                                                <th>Leaves</th>
                                                <th>Comp Off</th>
                                                <th>Permissions</th>
                                                <th>Total Used</th>
                                                <th>Remaining Leaves</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summaryData.map((row, idx) => (
                                                <tr key={idx}>
                                                    <td>{row.name}</td>
                                                    <td>{row.leaveTaken}</td>
                                                    <td>{row.compOff}</td>
                                                    <td>{row.permission}</td>
                                                    <td>{row.totalUsed}</td>
                                                    <td>{row.remaining}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-secondary" onClick={() => setShowSummaryModal(false)}>Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )}
        </AppLayout>
    );
}