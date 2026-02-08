import { useEffect, useState } from "react";
import api from "../api";

export default function AdminDashboard() {
  const [list, setList] = useState([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const res = await api.get("/leaves/all");
    setList(res.data);
  };

  const updateStatus = async (id, status) => {
    await api.put("/leaves/" + id, { status });
    load();
  };

  return (
    <div style={container}>

      <div style={header}>
        Admin Dashboard
        <button onClick={() => { localStorage.clear(); location = "/" }} style={logout}>Logout</button>
      </div>

      <div style={main}>

        <div style={card}>
          <h3>All Leave Requests</h3>

         <table style={table}>
  <thead>
    <tr>
      <th style={thTd}>ID</th>
      <th style={thTd}>User</th>
      <th style={thTd}>From</th>
      <th style={thTd}>To</th>
      <th style={thTd}>Days</th>
      <th style={thTd}>Type</th>
      <th style={thTd}>Comp Off Date</th>
      <th style={thTd}>Remarks</th>
      <th style={thTd}>Status</th>
      <th style={thTd}>Action</th>
    </tr>
  </thead>
  <tbody>
    {list.map((l, i) => (
      <tr key={l.id} style={i % 2 === 0 ? rowEven : rowOdd}>
        <td style={thTd}>{l.id}</td>
        <td style={thTd}>{l.name}</td>
        <td style={thTd}>{l.from_date}</td>
        <td style={thTd}>{l.to_date}</td>
        <td style={thTd}>{l.days}</td>
        <td style={thTd}>{l.type}</td>
        <td style={thTd}>{l.comp_off_date || "-"}</td>
        <td style={thTd}>{l.remarks}</td>
        <td style={{ ...thTd, color: l.status === "approved" ? "green" : l.status === "rejected" ? "red" : "orange", fontWeight: "bold" }}>{l.status}</td>
        <td style={thTd}>
          {l.status === "pending" && (
            <>
              <button style={approveBtn} onClick={() => updateStatus(l.id, "approved")}>Approve</button>
              <button style={rejectBtn} onClick={() => updateStatus(l.id, "rejected")}>Reject</button>
            </>
          )}
        </td>
      </tr>
    ))}
  </tbody>
</table>


        </div>

      </div>

    </div>
  );
}

/* Styles */
const container = { minHeight: "100vh", background: "#f3f4f6" };
const header = { background: "#1f2937", color: "#fff", padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center" };
const main = { padding: 20 };
const card = { background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 0 8px rgba(0,0,0,0.1)" };

const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 15,
  fontFamily: "Arial, sans-serif",
  fontSize: 14
};

const thTd = {
  border: "1px solid #ccc",
  padding: "8px",
  textAlign: "center"
};


const rowEven = { background: "#f9fafb" };
const rowOdd = { background: "#ffffff" };

const approveBtn = {
  padding: "5px 10px",
  marginRight: 5,
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 5,
  cursor: "pointer"
};

const rejectBtn = {
  padding: "5px 10px",
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 5,
  cursor: "pointer"
};

const logout = { background: "#dc2626", color: "#fff", border: "none", padding: "5px 10px", borderRadius: 5, cursor: "pointer" };
