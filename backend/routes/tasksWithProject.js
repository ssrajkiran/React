const express = require("express");
const db = require("../config/db");
const jwt = require("jsonwebtoken");

const router = express.Router();

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

// GET ALL TASKS
router.get("/", verifyToken, (req, res) => {
  let sql = `
    SELECT t.*, p.project_name,
    IFNULL(SUM(ts.man_hrs),0) AS total_man_hrs
    FROM task t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN timesheet ts ON ts.task = t.id
  `;
  const params = [];
  if (req.user.role !== "admin") {
    sql += ` WHERE FIND_IN_SET(?, REPLACE(t.assigned_to, ' ', '')) OR t.created_by = ?`;
    params.push(req.user.id, req.user.id);
  }
  sql += ` GROUP BY t.id ORDER BY t.created_at DESC`;

  db.query(sql, params, (err, tasks) => {
    if (err) return res.status(500).json({ error: "Failed to fetch tasks" });

    // Fetch per-user hours breakdown for all tasks
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length === 0) {
      return db.query(`SELECT id, name, role FROM users ORDER BY name ASC`, (err2, allUsers) => {
        if (err2) return res.status(500).json({ error: "Failed to fetch users" });
        res.json({ tasks: [], users: allUsers });
      });
    }

    const hoursSql = `
      SELECT ts.task AS task_id, ts.created_by AS user_id, u.name AS user_name,
             IFNULL(SUM(ts.man_hrs), 0) AS user_hrs
      FROM timesheet ts
      LEFT JOIN users u ON ts.created_by = u.id
      WHERE ts.task IN (?)
      GROUP BY ts.task, ts.created_by
    `;
    db.query(hoursSql, [taskIds], (err2, hoursRows) => {
      if (err2) return res.status(500).json({ error: "Failed to fetch hours" });

      // Build per-user hours map: { taskId: [{ user_name, user_hrs }] }
      const hoursMap = {};
      (hoursRows || []).forEach(row => {
        if (!hoursMap[row.task_id]) hoursMap[row.task_id] = [];
        hoursMap[row.task_id].push({ user_name: row.user_name, user_hrs: row.user_hrs });
      });

      db.query(`SELECT id, name, role FROM users ORDER BY name ASC`, (err3, allUsers) => {
        if (err3) return res.status(500).json({ error: "Failed to fetch users" });
        const userMap = {};
        allUsers.forEach(u => (userMap[u.id] = u.name));
        const result = tasks.map(task => ({
          ...task,
          assigned_to_names: task.assigned_to
            ? task.assigned_to.split(",").map(id => userMap[parseInt(id.trim())] || `ID:${id.trim()}`).join(", ")
            : "",
          created_by_name: userMap[task.created_by] || `ID:${task.created_by}`,
          user_hours: hoursMap[task.id] || [],
        }));
        res.json({ tasks: result, users: allUsers });
      });
    });
  });
});

// GET ALL USERS
router.get("/users", verifyToken, (req, res) => {
  db.query("SELECT id, name, role FROM users ORDER BY name ASC", (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch users" });
    res.json(results);
  });
});

// GET ALL PROJECTS
router.get("/projects", verifyToken, (req, res) => {
  db.query("SELECT id, project_name FROM projects ORDER BY project_name ASC", (err, projects) => {
    if (err) return res.status(500).json({ error: "Failed to fetch projects" });
    res.json(projects);
  });
});

// CREATE BULK TASKS
router.post("/bulk", verifyToken, (req, res) => {
  const { project_id, project_name, tasks } = req.body;
  if ((!project_id && !project_name) || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: "Project and tasks are required" });
  }

  const createTasks = (finalProjectId) => {
    const values = tasks.map(t => [
      finalProjectId,
      t.task,
      Array.isArray(t.assigned_to) ? t.assigned_to.join(",") : (t.assigned_to || ""),
      req.user.id,
      new Date()
    ]);
    db.query("INSERT INTO task (project_id, task, assigned_to, created_by, created_at) VALUES ?", [values], (err) => {
      if (err) return res.status(500).json({ error: "Failed to create tasks" });
      res.json({ success: true, message: "Tasks created successfully" });
    });
  };

  if (!project_id && project_name) {
    db.query("INSERT INTO projects (project_name) VALUES (?)", [project_name], (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to create project" });
      createTasks(result.insertId);
    });
  } else {
    createTasks(project_id);
  }
});

// UPDATE TASK
router.put("/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  let { task, assigned_to, project_id, status } = req.body;
  if (Array.isArray(assigned_to)) assigned_to = assigned_to.join(",");

  db.query("SELECT created_by FROM task WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (rows.length === 0) return res.status(404).json({ error: "Task not found" });
    if (req.user.role !== "admin" && req.user.id !== rows[0].created_by) {
      return res.status(403).json({ error: "You are not allowed to edit this task" });
    }
    db.query(`UPDATE task SET task = ?, assigned_to = ?, project_id = ?, status = ? WHERE id = ?`,
      [task, assigned_to, project_id, status, id], (err2) => {
        if (err2) return res.status(500).json({ error: "Failed to update task" });
        res.json({ success: true, message: "Task updated successfully" });
      });
  });
});

// DELETE TASK
router.delete("/:id", verifyToken, (req, res) => {
  db.query("SELECT created_by FROM task WHERE id = ?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (rows.length === 0) return res.status(404).json({ error: "Task not found" });
    if (req.user.role !== "admin" && req.user.id !== rows[0].created_by) {
      return res.status(403).json({ error: "You are not allowed to delete this task" });
    }
    db.query("DELETE FROM task WHERE id = ?", [req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: "Failed to delete task" });
      res.json({ success: true, message: "Task deleted successfully" });
    });
  });
});

module.exports = router;
