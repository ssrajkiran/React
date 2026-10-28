require("dotenv").config();

const mysql = require("mysql2");

// Create pool instead of single connection
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "leave_system",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Return DATE/DATETIME/TIMESTAMP as plain strings ("YYYY-MM-DD" /
  // "YYYY-MM-DD HH:MM:SS") instead of JS Date objects. JSON.stringify would
  // otherwise turn Date objects into ISO UTC timestamps ("2026-09-25T18:30:00.000Z")
  // which shifts the day in IST and leaks raw timestamps into the UI.
  dateStrings: ["DATE", "DATETIME", "TIMESTAMP"]
});

// Test connection safely
db.getConnection((err, connection) => {
  if (err) {
    console.log("MySQL connection failed:", err.message);
    return;
  }
  console.log("MySQL Connected Successfully");
  connection.release();
});

module.exports = db;
