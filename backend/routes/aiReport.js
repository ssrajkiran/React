const express = require("express");
const router = express.Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// ==============================
// VERIFY TOKEN MIDDLEWARE
// ==============================
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Token missing" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, "secret", (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
};

// ==============================
// HELPER: Generate summary including task counts
// ==============================
function generateRefinedSummary(data) {
  const tableData = [];
  const employeeHours = {};
  const projectHours = {};
  const projectTaskCounts = {};

  data.forEach(item => {
    const projectName = item.project_name || "Permission";
    const taskName = item.task_name || item.work_description || "Permission";
    const taskStatus = item.task_status || "Permission";

    // Total hours per employee
    employeeHours[item.employee_name] = (employeeHours[item.employee_name] || 0) + item.man_hrs;

    // Total hours per project
    projectHours[projectName] = (projectHours[projectName] || 0) + item.man_hrs;

    // Total tasks per project
    if (!projectTaskCounts[projectName]) {
      projectTaskCounts[projectName] = { total: 0, pending: 0, completed: 0 };
    }
    projectTaskCounts[projectName].total += 1;
    if (taskStatus === "In Progress") projectTaskCounts[projectName].pending += 1;
    if (taskStatus === "Completed") projectTaskCounts[projectName].completed += 1;

    // Build table row
    tableData.push({
      employee: item.employee_name,
      project: projectName,
      task: taskName,
      status: taskStatus,
      hours: item.man_hrs,
      start_time: item.start_time,
      end_time: item.end_time,
      date: item.timesheet_date,
      work_description: item.work_description,
    });
  });

  return { tableData, employeeHours, projectHours, projectTaskCounts };
}

// ==============================
// POST /ai-summary
// ==============================
router.post("/", verifyToken, (req, res) => {
  if (req.user.role !== "admin") 
    return res.status(403).json({ message: "Admins only" });

  const { project_id, employee_id, from_date, to_date, report_name } = req.body;

  let sql = `
    SELECT 
      ts.id AS timesheet_id,
      ts.date AS timesheet_date,
      ts.man_hrs,
      ts.start_time AS start_time,
      ts.end_time AS end_time,
      ts.work_description AS work_description,
      ts.task AS task_id,
      IFNULL(t.task, ts.work_description) AS task_name,
      IFNULL(t.status, 'Permission') AS task_status,
      IFNULL(p.project_name, 'Permission') AS project_name,
      u.name AS employee_name
    FROM timesheet ts
    LEFT JOIN task t ON ts.task = t.id
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON ts.created_by = u.id
    WHERE 1=1
  `;
  const params = [];
  if (project_id) { sql += " AND p.id = ?"; params.push(project_id); }
  if (employee_id) { sql += " AND ts.created_by = ?"; params.push(employee_id); }
  if (from_date) { sql += " AND ts.date >= ?"; params.push(from_date); }
  if (to_date) { sql += " AND ts.date <= ?"; params.push(to_date); }

  db.query(sql, params, (err, data) => {
    if (err) {
      console.error("Database error fetching timesheet data:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }

    const { tableData, employeeHours, projectHours, projectTaskCounts } = generateRefinedSummary(data);

    const summaryText = JSON.stringify({ tableData, employeeHours, projectHours, projectTaskCounts }, null, 2);

    // Format report name if not provided
    let formattedReportName = report_name;
    if (!formattedReportName) {
      const formatDate = (iso) => {
        const d = new Date(iso);
        return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
      };
      formattedReportName = `Report From: ${from_date ? formatDate(from_date) : "-"} To: ${to_date ? formatDate(to_date) : "-"}`;
    }

    const insertSql = `
      INSERT INTO ai_reports (report_name, content, generated_by, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    
    db.query(insertSql, [formattedReportName, summaryText, req.user.id], (err2, result) => {
      if (err2) {
        console.error("Failed to save report:", err2);
        return res.status(500).json({ message: "Failed to save report", error: err2 });
      }
      console.log("Report saved with ID:", result.insertId);

      res.json({
        message: "Report generated and saved successfully",
        tableData,
        employeeHours,
        projectHours,
        projectTaskCounts,
        report_name: formattedReportName
      });
    });
  });
});

// ==============================
// GET /ai-summary/history
// ==============================
router.get("/history", verifyToken, (req, res) => {
  if (req.user.role !== "admin") 
    return res.status(403).json({ message: "Admins only" });

  const sql = `
    SELECT 
      id, 
      report_name, 
      content AS summary_text, 
      generated_by, 
      created_at
    FROM ai_reports
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Database error fetching AI reports:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.json(results);
  });
});

module.exports = router;