const router = require("express").Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

/* ==============================
   VERIFY TOKEN MIDDLEWARE
================================ */
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


router.get("/employee/projects", verifyToken, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT DISTINCT p.id, p.project_name
    FROM task t
    JOIN projects p ON p.id = t.project_id
    WHERE FIND_IN_SET(?, t.assigned_to)
    ORDER BY p.project_name ASC
  `;

  db.query(sql, [userId], (err, projects) => {
    if (err) return res.status(500).json({ error: "Failed to fetch employee projects" });
    res.json(projects);
  });
});

router.get("/employee/tasks/:projectId", verifyToken, (req, res) => {
  const userId = req.user.id;
  const projectId = req.params.projectId;

  const sql = `
    SELECT id, task
    FROM task
    WHERE project_id = ?
    AND FIND_IN_SET(?, assigned_to)
    ORDER BY task ASC
  `;

  db.query(sql, [projectId, userId], (err, tasks) => {
    if (err) return res.status(500).json({ error: "Failed to fetch tasks" });
    res.json(tasks);
  });
});

router.delete("/delete/:id", verifyToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }

  const id = req.params.id;
  const sql = "DELETE FROM timesheet WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Delete error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json({ message: "Timesheet deleted successfully" });
  });
});

/* ==============================
   GET ALL TIMESHEETS (ADMIN)
================================ */
router.get("/admin", verifyToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }

  const sql = `
    SELECT 
      ts.id AS timesheet_id,
      ts.task AS task_id,
      ts.date AS timesheet_date,
      ts.man_hrs,
      ts.created_by AS timesheet_created_by,
      ts.created_at AS timesheet_created_at,
      ts.updated_at AS timesheet_updated_at,
      t.task AS task_name,
      t.assigned_to AS task_assigned_to,
      t.status AS task_status,
      t.created_by AS task_created_by,
      p.id AS project_id,
      p.project_name,
      u.name AS created_by_name
    FROM timesheet ts
    LEFT JOIN task t ON ts.task = t.id
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON ts.created_by = u.id
    ORDER BY ts.date DESC, u.name ASC, p.id ASC, ts.id ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Detailed DB error:", err);
      return res.status(500).json({ message: "Database error", error: err.sqlMessage });
    }
    res.json(results);
  });
});

/* ==============================
   GET EMPLOYEE TIMESHEETS
================================ */
router.get("/employee", verifyToken, (req, res) => {
  const sql = `
    SELECT 
      ts.id AS timesheet_id,
      ts.task AS task_id,
      ts.date AS timesheet_date,
      ts.man_hrs,
      ts.created_by AS timesheet_created_by,
      ts.created_at AS timesheet_created_at,
      ts.updated_at AS timesheet_updated_at,
      t.task AS task_name,
      t.assigned_to AS task_assigned_to,
      t.status AS task_status,
      t.created_by AS task_created_by,
      p.id AS project_id,
      p.project_name
    FROM timesheet ts
    LEFT JOIN task t ON ts.task = t.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.assigned_to IS NOT NULL AND FIND_IN_SET(?, t.assigned_to)
    ORDER BY ts.date DESC, p.id ASC, ts.id ASC
  `;

  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      console.error("Detailed DB error:", err);
      return res.status(500).json({ message: "Database error", error: err.sqlMessage });
    }
    res.json(results);
  });
});

/* ==============================
   GET ALL USERS
================================ */
router.get("/list/users", verifyToken, (req, res) => {
  const sql = "SELECT id, name FROM users ORDER BY name ASC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("User list error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(results);
  });
});

/* ==============================
   GET ALL PROJECTS
================================ */
router.get("/projects", verifyToken, (req, res) => {
  const sql = "SELECT id, project_name FROM projects ORDER BY project_name ASC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Project list error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(results);
  });
});

/* ==============================
   GET TASKS BY PROJECT
================================ */
router.get("/tasks/project/:projectId", verifyToken, (req, res) => {
  const { projectId } = req.params;
  const sql = "SELECT id, task FROM task WHERE project_id = ? ORDER BY task ASC";
  db.query(sql, [projectId], (err, results) => {
    if (err) {
      console.error("Task list error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(results);
  });
});
router.post("/", verifyToken, (req, res) => {
  const { task, date, man_hrs, created_by } = req.body;

  if (!task || !date || !man_hrs || !created_by) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const hoursToAdd = Number(man_hrs);

  if (isNaN(hoursToAdd) || hoursToAdd <= 0 || hoursToAdd > 8) {
    return res.status(400).json({ message: "Invalid hours. Must be between 1 and 8." });
  }

  // Frontend <input type="date"> always sends "YYYY-MM-DD"
  // Split manually to avoid any timezone shift from new Date()
  const parts = date.split("-");
  if (parts.length !== 3) {
    return res.status(400).json({ message: "Invalid date format. Expected YYYY-MM-DD." });
  }
  const [year, month, day] = parts;
  const normalizedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`; // stored in DB as YYYY-MM-DD
  const displayDate    = `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;  // shown in UI as DD-MM-YYYY

  // Step 1: Check total hours already logged for that user on that date
  // DATE() strips any time component so comparison works even if DB stores datetime
  const checkSql = `
    SELECT COALESCE(SUM(man_hrs), 0) AS total_hours
    FROM timesheet
    WHERE DATE(date) = ? AND created_by = ?
  `;

  db.query(checkSql, [normalizedDate, created_by], (err, results) => {
    if (err) {
      console.error("Check timesheet hours error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    const totalHours = Number(results[0].total_hours) || 0;
    const remaining  = 8 - totalHours;

    if (totalHours + hoursToAdd > 8) {
      return res.status(400).json({
        message: `Only ${remaining} hr${remaining !== 1 ? "s" : ""} remaining for ${displayDate}. Cannot add ${hoursToAdd} hr${hoursToAdd !== 1 ? "s" : ""}.`,
      });
    }

    // Step 2: Insert — always store date as YYYY-MM-DD
    const insertSql = "INSERT INTO timesheet (task, date, man_hrs, created_by) VALUES (?, ?, ?, ?)";

    db.query(insertSql, [task, normalizedDate, man_hrs, created_by], (err, result) => {
      if (err) {
        console.error("Insert timesheet error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      res.json({ message: "Timesheet added successfully", timesheet_id: result.insertId });
    });
  });
});


// Projects assigned to a specific user (for admin modal)
router.get("/admin/projects/:userId", verifyToken, (req, res) => {
  const sql = `
    SELECT DISTINCT p.id, p.project_name
    FROM task t
    JOIN projects p ON p.id = t.project_id
    WHERE FIND_IN_SET(?, t.assigned_to)
    ORDER BY p.project_name ASC
  `;
  db.query(sql, [req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch projects" });
    res.json(rows);
  });
});

// Tasks for a project assigned to a specific user (for admin modal)
router.get("/admin/tasks/:projectId/:userId", verifyToken, (req, res) => {
  const sql = `
    SELECT id, task FROM task
    WHERE project_id = ? AND FIND_IN_SET(?, assigned_to)
    ORDER BY task ASC
  `;
  db.query(sql, [req.params.projectId, req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch tasks" });
    res.json(rows);
  });
});

module.exports = router;
