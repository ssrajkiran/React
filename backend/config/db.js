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
  queueLimit: 0
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
