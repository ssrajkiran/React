import { useState, useEffect } from "react";
import LeaveCalendar from "../components/LeaveCalendar";
import api from "../api";

export default function Employee() {
  const [type, setType] = useState("leave");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [days, setDays] = useState(0);
  const [halfDay, setHalfDay] = useState(false);
  const [compOffDate, setCompOffDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => api.get("/leaves/my").then(r => setHistory(r.data));

  const applyLeave = async () => {
    if (!from) return alert("Select leave date");
    if (type === "compoff" && !compOffDate) return alert("Select Comp Off Worked Date");

    const payload = {
      from_date: from,
      to_date: type === "leave" ? to : from,
      days: type === "leave" ? (halfDay ? 0.5 : days) : 1,
      type,
      remarks,
      comp_off_date: type === "compoff" ? compOffDate : null
    };

    console.log("Applying Leave:", payload);

    await api.post("/leaves", payload);

    alert("Leave Applied");

    setFrom(""); setTo(""); setDays(0); setHalfDay(false);
    setCompOffDate(""); setRemarks("");
    loadHistory();
  };

  return (
    <div style={container}>
      <div style={header}>
        Leave Management System
        <button onClick={() => { localStorage.clear(); location = "/" }} style={logout}>
          Logout
        </button>
      </div>

      <div style={main}>

        {/* APPLY CARD */}
        <div style={card}>
          <h3>Apply Leave / Comp Off</h3>

          <select value={type} onChange={e => { setType(e.target.value); setHalfDay(false); }} style={input}>
            <option value="leave">Leave</option>
            <option value="compoff">Comp Off</option>
          </select> 
          <div style={gap}></div>

          <LeaveCalendar
            type={type}
            onSelect={(f, t, d) => { setFrom(f); setTo(t); setDays(d); }}
          />
 <div style={gap}></div>
          {from && (
            <>
              <div style={grid}>
                <div>
                  <label>From</label>
                  <input value={from} readOnly style={input} />
                </div>
                <div>
                  <label>To</label>
                  <input value={type === "leave" ? to : from} readOnly style={input} />
                </div>
                <div>
                  <label>Days</label>
                  <input value={type === "leave" ? (halfDay ? 0.5 : days) : 1} readOnly style={input} />
                </div>
              </div>

              {/* Half Day only for Leave + 1 Day */}
              {type === "leave" && days === 1 && (
                <label style={{ display: "block", marginTop: 10 }}>
                  <input type="checkbox" checked={halfDay} onChange={e => setHalfDay(e.target.checked)} /> Half Day
                </label>
              )}

              {/* Comp Off extra field */}
              {type === "compoff" && (
                <div style={{ marginTop: 10 }}>
                  <label>Comp Off Worked Date</label>
                  <input
                    type="date"
                    value={compOffDate}
                    onChange={e => setCompOffDate(e.target.value)}
                    style={input}
                  />
                </div>
              )}

              <textarea
                placeholder="Remarks"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                style={textarea}
              />

              <button onClick={applyLeave} style={btn}>Submit</button>
            </>
          )}

        </div>

        {/* HISTORY */}
        <div style={card}>
          <h3>Leave History</h3>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>From</th>
                <th style={th}>To</th>
                <th style={th}>Days</th>
                <th style={th}>Type</th>
                <th style={th}>Comp Off Date</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id}>
                  <td style={td}>{h.from_date}</td>
                  <td style={td}>{h.to_date}</td>
                  <td style={td}>{h.days}</td>
                  <td style={td}>{h.type}</td>
                  <td style={td}>{h.comp_off_date || "-"}</td>
                  <td style={{ ...td, color: h.status === "approved" ? "green" : h.status === "rejected" ? "red" : "orange" }}>
                    {h.status}
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

/* STYLES */
const container = { minHeight: "100vh", background: "#f3f4f6" };
const gap = { minHeight: "5vh" };
const header = { background: "#1f2937", color: "#fff", padding: 15, display: "flex", justifyContent: "space-between" };
const main = { display: "flex", gap: 20, padding: 20 };
const card = { flex: 1, background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 0 5px rgba(0,0,0,.1)" };
const grid = { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 };
const input = { width: "100%", padding: 10, marginTop: 5 };
const textarea = { width: "100%", height: 80, marginTop: 15 };
const btn = { marginTop: 15, width: "100%", padding: 10, background: "#2563eb", color: "#fff", border: "none" };
const logout = { background: "#dc2626", color: "#fff", border: "none", padding: "5px 10px" };

/* Table Styles */
const table = { width: "100%", borderCollapse: "collapse", marginTop: 15, fontFamily: "Arial, sans-serif", fontSize: 14 };
const th = { border: "1px solid #999", padding: 8, background: "#f0f0f0", textAlign: "left" };
const td = { border: "1px solid #999", padding: 8 };
