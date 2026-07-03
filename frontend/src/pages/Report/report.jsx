import AppLayout from "../../components/layout/AppLayout";

import { useState, useEffect } from "react";
import api from "../../api";
import ExcelJS from "exceljs";
import { Link } from "react-router-dom";

export default function AttendanceReport() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [headers, setHeaders] = useState([]);
    const [rows, setRows] = useState([]);
    const [daysInMonth, setDaysInMonth] = useState(0);
    const [loading, setLoading] = useState(false);
    const [holidays, setHolidays] = useState([]); // holiday dates in YYYY-MM-DD

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // ------------------ FETCH ATTENDANCE ------------------
    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/attendance?year=${year}&month=${month}`);
            setHeaders(res.data.headers);
            setRows(res.data.rows);
            setDaysInMonth(res.data.daysInMonth);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Failed to fetch attendance");
        }
        setLoading(false);
    };

    // ------------------ FETCH HOLIDAYS ------------------
    const fetchHolidays = async () => {
        try {
            const res = await api.get(`/holidays/?year=${year}&month=${month}`);
            // store as YYYY-MM-DD strings
            setHolidays(res.data.map(d => d.date));
        } catch (err) {
            console.error("Failed to fetch holidays", err);
        }
    };

    useEffect(() => {
        fetchAttendance();
        fetchHolidays();
    }, [year, month]);

    // ------------------ FORMAT DATE ------------------
    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    // ------------------ MODAL ------------------
    const openModal = (user, cell, day) => {
        setSelectedUser(user);
        setSelectedCell({ ...cell, day });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedCell(null);
        setSelectedUser(null);
    };

    // ------------------ EXCEL EXPORT ------------------
    const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Attendance");

    // Header row
    const columns = ["User"];
    for (let day = 1; day <= daysInMonth; day++) {
        columns.push(`Day ${day}`);
    }

    sheet.addRow(columns);

    // Data rows
    rows.forEach((row) => {
        const rowData = [row.User];

        for (let day = 1; day <= daysInMonth; day++) {
            const cell = row[day];
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isHoliday = holidays.includes(dateStr);

            let display = "P";

            if (isHoliday && (!cell || cell.status === "P")) {
                display = "H";
            } else if (cell) {
                display = cell.status;
            }

            rowData.push(display);
        }

        sheet.addRow(rowData);
    });

    // Legend section
    sheet.addRow([]);
    sheet.addRow(["Legend"]);
    sheet.addRow(["P", "Present"]);
    sheet.addRow(["H", "Holiday"]);
    sheet.addRow(["L", "Leave"]);
    sheet.addRow(["C", "Comp Off"]);
    sheet.addRow(["PP", "Permission"]);

    // Download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Attendance_${monthNames[month - 1]}_${year}.xlsx`;
    link.click();
};

    return (
        <AppLayout>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-semibold mb-0">Attendance Sheet - {monthNames[month - 1]} {year}</h4>
                <nav>
                    <ol className="breadcrumb mb-0">
                        <li className="breadcrumb-item">
                            <Link to="/employee/dashboard">Dashboard</Link>
                        </li>
                        <li className="breadcrumb-item active">Attendance</li>
                    </ol>
                </nav>
            </div>

            <div className="card shadow-sm border-0 rounded-4 p-3">
                {/* Month & Year Selector + Export */}
                <div className="mb-3 d-flex gap-2 align-items-center justify-content-between">
                    <div className="d-flex gap-2 align-items-center">
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="form-select w-auto"
                        >
                            {monthNames.map((name, i) => (
                                <option key={i + 1} value={i + 1}>{name}</option>
                            ))}
                        </select>

                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="form-select w-auto"
                        >
                            {Array.from({ length: 5 }, (_, i) => (
                                <option key={i} value={year - 2 + i}>{year - 2 + i}</option>
                            ))}
                        </select>

                        <button
                            className="btn btn-primary"
                            onClick={() => { fetchAttendance(); fetchHolidays(); }}
                            disabled={loading}
                        >
                            {loading ? "Loading..." : "Load"}
                        </button>
                    </div>

                    <button className="btn btn-success" onClick={exportToExcel}>
                        Export as Excel
                    </button>
                </div>

                {/* Attendance Table */}
                <div className="table-responsive">
                    <table className="table table-bordered table-sm text-center align-middle">
                        <thead className="table-light">
                            <tr>
                                {headers.map((h, i) => <th key={i}>{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={daysInMonth + 1} className="text-center text-muted">
                                        No data available
                                    </td>
                                </tr>
                            )}

                            {rows.map((row, idx) => (
                                <tr key={idx}>
                                    <td className="text-start">{row.User}</td>
                                    {Array.from({ length: daysInMonth }, (_, i) => {
                                        const day = i + 1;
                                        const cell = row[day];
                                        const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                                        const isHoliday = holidays.includes(dateStr);

                                        let display = "P";
                                        let title = "";

                                        if (isHoliday && (!cell || ["P"].includes(cell.status))) {
                                            display = "H";
                                        } else if (cell) {
                                            display = cell.status;
                                            title = ["C", "L", "PP"].includes(cell.status) ? cell.detail || "" : "";
                                        }

                                        const backgroundColor =
                                            display === "L" ? "#ffc107" :
                                            display === "C" ? "#0d6efd" :
                                            display === "PP" ? "#198754" :
                                            display === "H" ? "#6c757d" :
                                            "#fff";

                                        const color = display === "P" ? "#000" : "#fff";

                                        return (
                                            <td
                                                key={day}
                                                style={{ cursor: ["P", "H"].includes(display) ? "default" : "pointer", backgroundColor, color }}
                                                title={title}
                                                onClick={() => !["P", "H"].includes(display) && cell && openModal(row.User, cell, day)}
                                            >
                                                {display}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {modalOpen && selectedCell && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    onClick={closeModal}
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                >
                    <div
                        className="modal-dialog modal-dialog-centered"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Attendance Details</h5>
                                <button type="button" className="btn-close" onClick={closeModal}></button>
                            </div>
                            <div className="modal-body text-start">
                                <p><strong>Employee:</strong> {selectedUser}</p>
                                <p>
                                    <strong>Type:</strong> {selectedCell.status === "C" ? "Comp Off" :
                                        selectedCell.status === "L" ? "Leave" : "Permission"}
                                </p>

                                {["L", "C"].includes(selectedCell.status) ? (
                                    <>
                                        <p><strong>From:</strong> {formatDate(selectedCell.from_date || selectedCell.detail)}</p>
                                        <p><strong>To:</strong> {formatDate(selectedCell.to_date || selectedCell.detail)}</p>
                                        <p><strong>Days:</strong> {selectedCell.days || "1.00"}</p>
                                        <p><strong>Reason:</strong> {selectedCell.detail || "-"}</p>
                                        <p><strong>Status:</strong> APPROVED</p>
                                    </>
                                ) : (
                                    <>
                                        <p><strong>Date:</strong> {formatDate(selectedCell.date || selectedCell.detail)}</p>
                                        <p><strong>Hours:</strong> {selectedCell.detail}</p>
                                        <p><strong>Status:</strong> APPROVED</p>
                                    </>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}