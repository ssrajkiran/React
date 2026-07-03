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
    sql += ` AND FIND_IN_SET(?, t.assigned_to)`;
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

module.exports = router;