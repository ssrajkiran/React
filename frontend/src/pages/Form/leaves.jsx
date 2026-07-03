import { useState, useEffect } from "react";
import api from "../../api";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import AppLayout from "../../components/layout/AppLayout";
import { Link } from "react-router-dom";

import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export default function Leaves() {
    const [events, setEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false);
    const [permissionRemaining, setPermissionRemaining] = useState(2); // max 2 hours/month

    const [formData, setFormData] = useState({
        leave_type: "leave", // leave | compoff | permission
        start_date: "",
        end_date: "",
        reason: "",
        days: 0,
        compoff_date: "",
        half_day_type: "full",
        hours: 0,
        slot: "morning",
        status: "",
    });

    // ================= FETCH LEAVES =================
    const fetchLeaves = async () => {
        try {
            const res = await api.get("/leaves/my");
            const formatted = res.data.map((ev) => ({
                ...ev,
                start: new Date(ev.start),
                end: new Date(ev.end),
            }));
            setEvents(formatted);
        } catch (err) {
            console.error(err);
        }
    };

    // ================= FETCH REMAINING PERMISSION HOURS =================
    const fetchPermissionRemaining = async () => {
        try {
            const res = await api.get("/leaves/permission-remaining"); // backend endpoint
            setPermissionRemaining(res.data.remaining || 0);
        } catch (err) {
            console.error(err);
            setPermissionRemaining(0);
        }
    };

    useEffect(() => {
        fetchLeaves();
        fetchPermissionRemaining();
    }, []);



    // ================= HELPERS =================
    const toCalendarDate = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const calculateDays = (start, end) => {
        if (!start || !end) return 0;
        const s = new Date(start);
        const e = new Date(end);
        s.setHours(0, 0, 0, 0);
        e.setHours(0, 0, 0, 0);
        return (e - s) / (1000 * 60 * 60 * 24) + 1;
    };

    const handleDelete = async () => {
        if (!formData.id) return;

        const confirmDelete = window.confirm("Are you sure you want to delete this entry?");
        if (!confirmDelete) return;

        try {
            setLoading(true);

            const token = localStorage.getItem("token"); // assuming token is stored here
            if (!token) throw new Error("Not authenticated");

            const type = formData.leave_type; // leave | compoff | permission
            const url = `/leaves/delete/${formData.id}?type=${type}`;

            await api.delete(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setLoading(false);
            setShowModal(false);
            fetchLeaves(); // refresh calendar
            fetchPermissionRemaining(); // refresh permission hours
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || err.message || "Something went wrong while deleting.");
            setLoading(false);
        }
    };
    const handleSelectSlot = (slotInfo) => {
        const startDate = new Date(slotInfo.start);
        const endDate = new Date(slotInfo.end);

        // Make end date inclusive
        if (startDate.getTime() !== endDate.getTime()) {
            endDate.setDate(endDate.getDate() - 1);
        }

        // Only prevent overlapping with existing leaves (ignore comp offs)
        const overlappingLeave = events.some((ev) => {
            if (ev.type !== "leave" && ev.type != "compoff") return false; // only leave blocks leave

            const evStart = new Date(ev.start);
            const evEnd = new Date(ev.end);

            return startDate <= evEnd && endDate >= evStart;
        });

        if (overlappingLeave) {
            alert(
                "Leave already exists for selected date(s). You cannot apply leave on these days."
            );
            return; // prevent opening the form
        }

        // Open form for leave
        setFormData({
            id: null,
            leave_type: "leave",
            start_date: toCalendarDate(startDate),
            end_date: toCalendarDate(endDate),
            reason: "",
            days: calculateDays(startDate, endDate),
            compoff_date: "",
            half_day_type: "full",
            hours: permissionRemaining,
            slot: "morning",
            status: "pending",
        });

        setIsViewMode(false);
        setShowModal(true);
    };


    // ================= EVENT CLICK =================
    const handleSelectEvent = (event) => {
        setFormData({
            id: event.id,
            leave_type: event.type || "leave",
            start_date: toCalendarDate(event.start),
            end_date: toCalendarDate(event.end),
            reason: event.remarks || "",
            days: calculateDays(event.start, event.end),
            compoff_date: event.comp_off_date || "",
            half_day_type: event.half_day_type || "full",
            hours: event.hours || permissionRemaining,
            slot: event.slot || "morning",
            status: event.status,
        });

        // View mode only for approved leave/compoff
        if ((event.type === "leave" || event.type === "compoff") && event.status === "approved") {
            setIsViewMode(true);
        } else {
            setIsViewMode(false);
        }

        setShowModal(true);
    };


    // ================= AUTO UPDATE DAYS =================
    useEffect(() => {
        if (formData.leave_type !== "leave") return;
        const totalDays = calculateDays(formData.start_date, formData.end_date);
        if (formData.start_date === formData.end_date && formData.half_day_type !== "full") {
            setFormData((prev) => ({ ...prev, days: 0.5 }));
        } else {
            setFormData((prev) => ({ ...prev, days: totalDays }));
        }
    }, [formData.start_date, formData.end_date, formData.half_day_type, formData.leave_type]);

    // ================= SUBMIT =================
    const handleSubmit = async () => {
        if (isViewMode) return;
        setLoading(true);

        try {
            let payload = { id: formData.id };

            if (formData.leave_type === "permission") {
                if (!formData.start_date || !formData.hours || !formData.slot) {
                    alert("Please fill all fields for permission.");
                    setLoading(false);
                    return;
                }
                if (formData.hours > permissionRemaining) {
                    alert(`You only have ${permissionRemaining} hour(s) remaining this month.`);
                    setLoading(false);
                    return;
                }
                payload = {
                    ...payload,
                    from_date: formData.start_date,
                    type: "permission",
                    hours: formData.hours,
                    slot: formData.slot,
                    remarks: formData.reason || null,
                };
            } else if (formData.leave_type === "compoff") {
                if (!formData.start_date || !formData.compoff_date) {
                    alert("Please fill all fields for comp off.");
                    setLoading(false);
                    return;
                }
                payload = {
                    ...payload,
                    from_date: formData.start_date,
                    type: "compoff",
                    comp_off_date: formData.compoff_date,
                    remarks: formData.reason || null,
                };
            } else {
                if (!formData.start_date || !formData.end_date) {
                    alert("Please select start and end date for leave.");
                    setLoading(false);
                    return;
                }
                payload = {
                    ...payload,
                    from_date: formData.start_date,
                    to_date: formData.end_date,
                    type: "leave",
                    days: formData.days,
                    half_day_type: formData.half_day_type,
                    remarks: formData.reason || null,
                };
            }

            await api.post("/leaves", payload);
            setLoading(false);
            setShowModal(false);
            fetchLeaves();
            fetchPermissionRemaining(); // refresh remaining hours
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Something went wrong");
            setLoading(false);
        }
    };

    return (
        <AppLayout>
           
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="fw-semibold mb-0">My Leave Calendar</h4>
                    <nav>
                        <ol className="breadcrumb mb-0">
                            <li className="breadcrumb-item">
                                <Link to="/employee/dashboard">Dashboard</Link>
                            </li>
                            <li className="breadcrumb-item active">Leaves</li>
                        </ol>
                    </nav>
                </div>

                <div className="card shadow-sm border-0 rounded-4 p-3">
                    {/* Status Legend */}
                    <div className="d-flex gap-3 mb-3 align-items-center">
                        <div className="d-flex align-items-center gap-1">
                            <span className="status-dot" style={{ backgroundColor: "#198754" }}></span>
                            <small>Approved</small>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <span className="status-dot" style={{ backgroundColor: "#ffc107" }}></span>
                            <small>Pending</small>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <span className="status-dot" style={{ backgroundColor: "#dc3545" }}></span>
                            <small>Rejected</small>
                        </div>
                    </div>


                    <Calendar
                        selectable
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: 600 }}
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleSelectEvent}
                        eventPropGetter={(event) => {
                            let bg =
                                event.status === "approved"
                                    ? "#198754"
                                    : event.status === "rejected"
                                        ? "#dc3545"
                                        : "#ffc107";
                            return { style: { backgroundColor: bg, color: "#fff", borderRadius: "6px", border: "none" } };
                        }}
                    />
                </div>


                {showModal && (
                    <>
                        <div className="modal fade show d-block">
                            <div className="modal-dialog modal-dialog-centered">
                                <div className="modal-content rounded-4">
                                    <div className="modal-header">
                                        <h5 className="modal-title">{isViewMode ? "Details" : "Apply Leave/Permission"}</h5>
                                        <button className="btn-close" onClick={() => setShowModal(false)}></button>
                                    </div>
                                    <div className="modal-body">
                                        {/* Leave Type */}
                                        <div className="mb-3">
                                            <label className="form-label">Type</label>
                                            <select
                                                className="form-select"
                                                value={formData.leave_type}
                                                disabled={isViewMode || !!formData.id} // disable if viewing/editing existing leave
                                                onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                                            >
                                                <option value="leave">Leave</option>
                                                <option value="compoff">Comp Off</option>
                                                <option value="permission">Permission</option>
                                            </select>
                                        </div>


                                        {/* Dates */}
                                        <div className="mb-3">
                                            <label className="form-label">Start Date</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={formData.start_date}
                                                disabled={isViewMode}
                                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                            />
                                        </div>

                                        {/* Leave */}
                                        {formData.leave_type === "leave" && (
                                            <>
                                                <div className="mb-3">
                                                    <label className="form-label">End Date</label>
                                                    <input
                                                        type="date"
                                                        className="form-control"
                                                        value={formData.end_date}
                                                        disabled={isViewMode}
                                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                                    />
                                                </div>

                                                {formData.start_date === formData.end_date && (
                                                    <div className="mb-3">
                                                        <label className="form-label">Duration</label>
                                                        <select
                                                            className="form-select"
                                                            value={formData.half_day_type}
                                                            disabled={isViewMode}
                                                            onChange={(e) => setFormData({ ...formData, half_day_type: e.target.value })}
                                                        >
                                                            <option value="full">Full Day</option>
                                                            <option value="first_half">First Half</option>
                                                            <option value="second_half">Second Half</option>
                                                        </select>
                                                    </div>
                                                )}

                                                <div className="mb-3">
                                                    <label className="form-label">No of Days</label>
                                                    <input type="number" className="form-control" value={formData.days} readOnly />
                                                </div>
                                            </>
                                        )}

                                        {/* Comp Off */}
                                        {formData.leave_type === "compoff" && (
                                            <div className="mb-3">
                                                <label className="form-label">Comp Off Date</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={formData.compoff_date}
                                                    disabled={isViewMode}
                                                    max={formData.start_date}
                                                    onChange={(e) => setFormData({ ...formData, compoff_date: e.target.value })}
                                                />
                                            </div>
                                        )}

                                        {/* Permission */}
                                        {formData.leave_type === "permission" && (
                                            <>
                                                <div className="mb-2">
                                                    <small>Remaining hours this month: {permissionRemaining}h</small>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Hours (Max {permissionRemaining})</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        min={0.5}
                                                        max={permissionRemaining}
                                                        value={formData.hours}
                                                        disabled={isViewMode || permissionRemaining === 0}
                                                        onChange={(e) => setFormData({ ...formData, hours: Number(e.target.value) })}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Slot</label>
                                                    <select
                                                        className="form-select"
                                                        value={formData.slot}
                                                        disabled={isViewMode || permissionRemaining === 0}
                                                        onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                                                    >
                                                        <option value="morning">Morning</option>
                                                        <option value="evening">Evening</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        {/* Reason */}
                                        <div className="mb-3">
                                            <label className="form-label">Reason</label>
                                            <textarea
                                                className="form-control"
                                                rows="3"
                                                value={formData.reason}
                                                disabled={isViewMode}
                                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                            ></textarea>
                                        </div>

                                        {isViewMode && (
                                            <div className="mb-3">
                                                <label className="form-label">Status</label>
                                                <input type="text" className="form-control" value={formData.status} readOnly />
                                            </div>
                                        )}
                                    </div>
                                    <div className="modal-footer">
                                        {/* Always show Close */}
                                        <button className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>
                                            Close
                                        </button>

                                        {/* Show Submit if not fully approved */}
                                        {!isViewMode || formData.status === "pending" ? (
                                            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                                                {loading ? "Submitting..." : "Submit"}
                                            </button>
                                        ) : null}

                                        {/* Show Delete if entry exists */}
                                        {formData.id && formData.status === "pending" && (
                                            <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>
                                                {loading ? "Deleting..." : "Delete"}
                                            </button>
                                        )}

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
