const express = require("express");
const db = require("../config/db");
const jwt = require("jsonwebtoken");

const router = express.Router();

// ==============================
// VERIFY TOKEN
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

router.get("/report", verifyToken, (req, res) => { 
  const { project_id, assigned_to, status } = req.query;

  let sql = `
    SELECT 
      t.id,
      t.task,
      t.assigned_to,
      t.status,
      p.project_name
    FROM task t
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE 1=1
  `;

  const params = [];

  // FILTER BY PROJECT
  if (project_id) {
    sql += ` AND t.project_id = ?`;
    params.push(project_id);
  }

  // FILTER BY ASSIGNED USER
  if (assigned_to) {
    sql += ` AND FIND_IN_SET(?, REPLACE(t.assigned_to, ' ', ''))`;
    params.push(assigned_to);
  }

  // FILTER BY STATUS
  if (status) {
    sql += ` AND t.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY p.project_name ASC, t.created_at DESC`;

  db.query(sql, params, (err, tasks) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch task report" });
    }

    // MAP ASSIGNED TO NAMES
    db.query(`SELECT id, name FROM users`, (err2, users) => {
      if (err2) return res.status(500).json({ error: "Failed to fetch users" });

      const userMap = {};
      users.forEach(u => userMap[u.id] = u.name);

      const result = tasks.map(task => ({
        ...task,
        assigned_to_names: task.assigned_to
          ? task.assigned_to
              .split(",")
              .map(id => userMap[parseInt(id.trim())] || `ID:${id.trim()}`)
              .join(", ")
          : ""
      }));

      res.json(result);
    });
  });
});

// ==============================
// GET PROJECTS (FOR FILTER)
// ==============================
router.get("/projects", verifyToken, (req, res) => {
  db.query(
    `SELECT id, project_name FROM projects ORDER BY project_name ASC`,
    (err, projects) => {
      if (err) return res.status(500).json({ error: "Failed to fetch projects" });
      res.json(projects);
    }
  );
});

// ==============================
// GET USERS (FOR FILTER)
// ==============================
router.get("/users", verifyToken, (req, res) => {
  db.query(
    `SELECT id, name FROM users ORDER BY name ASC`,
    (err, users) => {
      if (err) return res.status(500).json({ error: "Failed to fetch users" });
      res.json(users);
    }
  );
});

// ==============================
// GET TIMESHEET-BASED REPORT (project-wise)
// ==============================
router.get("/report/timesheet", verifyToken, (req, res) => {
  const { project_id, assigned_to, status } = req.query;

  let sql = `
    SELECT 
      ts.id,
      ts.date,
      ts.man_hrs,
      ts.work_description,
      ts.start_time,
      ts.end_time,
      t.id AS task_id,
      t.task AS module_name,
      t.status AS module_status,
      t.assigned_to,
      p.id AS project_id,
      p.project_name,
      u.name AS user_name
    FROM timesheet ts
    LEFT JOIN task t ON t.id = ts.task
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = ts.created_by
    WHERE 1=1
  `;

  const params = [];

  if (project_id) {
    sql += ` AND t.project_id = ?`;
    params.push(project_id);
  }

  if (assigned_to) {
    sql += ` AND FIND_IN_SET(?, REPLACE(t.assigned_to, ' ', ''))`;
    params.push(assigned_to);
  }

  if (status) {
    sql += ` AND t.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY p.project_name ASC, t.task ASC, ts.date DESC`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch timesheet report" });
    }

    // Map assigned_to to names
    db.query(`SELECT id, name FROM users`, (err2, users) => {
      if (err2) return res.status(500).json({ error: "Failed to fetch users" });

      const userMap = {};
      users.forEach(u => userMap[u.id] = u.name);

      const result = rows.map(row => ({
        id: row.id,
        date: row.date,
        man_hrs: row.man_hrs,
        work_description: row.work_description || "-",
        start_time: row.start_time,
        end_time: row.end_time,
        module_name: row.module_name || "-",
        module_status: row.module_status || "Pending",
        project_name: row.project_name || "-",
        project_id: row.project_id,
        user_name: row.user_name || "-",
        assigned_to_names: row.assigned_to
          ? row.assigned_to
              .split(",")
              .map(id => userMap[parseInt(id.trim())] || `ID:${id.trim()}`)
              .join(", ")
          : ""
      }));

      res.json(result);
    });
  });
});

module.exports = router;