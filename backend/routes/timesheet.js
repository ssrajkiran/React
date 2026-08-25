const router = require("express").Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

// Helper: format "HH:MM:SS" or "HH:MM" to "9:00 AM" style
function formatTimeAMPM(timeStr) {
  if (!timeStr) return "";
  const parts = timeStr.substring(0, 5).split(":");
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

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
    WHERE FIND_IN_SET(?, REPLACE(t.assigned_to, ' ', ''))
    AND t.status != 'Completed'
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
    AND FIND_IN_SET(?, REPLACE(assigned_to, ' ', ''))
    AND status != 'Completed'
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
      ts.start_time AS start_time,
      ts.end_time AS end_time,
      ts.work_description AS work_description,
      ts.created_by AS timesheet_created_by,
      ts.created_at AS timesheet_created_at,
      ts.updated_at AS timesheet_updated_at,
      IFNULL(t.task, ts.work_description) AS task_name,
      t.assigned_to AS task_assigned_to,
      IFNULL(t.status, 'Permission') AS task_status,
      t.created_by AS task_created_by,
      p.id AS project_id,
      IFNULL(p.project_name, 'Permission') AS project_name,
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
=============================== */
router.get("/employee", verifyToken, (req, res) => {
  const sql = `
    SELECT 
      ts.id AS timesheet_id,
      ts.task AS task_id,
      ts.date AS timesheet_date,
      ts.man_hrs,
      ts.start_time AS start_time,
      ts.end_time AS end_time,
      ts.work_description AS work_description,
      ts.created_by AS timesheet_created_by,
      ts.created_at AS timesheet_created_at,
      ts.updated_at AS timesheet_updated_at,
      IFNULL(t.task, ts.work_description) AS task_name,
      t.assigned_to AS task_assigned_to,
      IFNULL(t.status, 'Permission') AS task_status,
      t.created_by AS task_created_by,
      p.id AS project_id,
      IFNULL(p.project_name, 'Permission') AS project_name
    FROM timesheet ts
    LEFT JOIN task t ON ts.task = t.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE ts.created_by = ?
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
  const { task, date, start_time, end_time, man_hrs, created_by, work_description, entry_type } = req.body;
  const isPermission = entry_type === "permission";

  if (!date || !created_by) {
    return res.status(400).json({ message: "Date and user are required" });
  }
  if (!isPermission && !task) {
    return res.status(400).json({ message: "Task is required for project entries" });
  }

  // Calculate man_hrs from start_time/end_time if provided
  let hoursToAdd;
  let dbStartTime = null;
  let dbEndTime = null;

  if (start_time && end_time) {
    // Parse times and compute difference in minutes
    const [sh, sm] = start_time.split(":").map(Number);
    const [eh, em] = end_time.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const diffMin = endMin - startMin;

    if (isNaN(diffMin) || diffMin <= 0) {
      return res.status(400).json({ message: "End time must be after start time." });
    }

    hoursToAdd = diffMin / 60;
    dbStartTime = start_time.length === 5 ? start_time + ":00" : start_time;
    dbEndTime = end_time.length === 5 ? end_time + ":00" : end_time;
  } else if (man_hrs) {
    // Legacy support: accept man_hrs directly
    hoursToAdd = Number(man_hrs);
    dbStartTime = null;
    dbEndTime = null;
  } else {
    return res.status(400).json({ message: "Either start/end times or man hours are required." });
  }

  if (isNaN(hoursToAdd) || hoursToAdd <= 0 || hoursToAdd > 8) {
    return res.status(400).json({ message: "Invalid hours. Must be between 0 and 8." });
  }

  // Frontend <input type="date"> always sends "YYYY-MM-DD"
  const parts = date.split("-");
  if (parts.length !== 3) {
    return res.status(400).json({ message: "Invalid date format. Expected YYYY-MM-DD." });
  }
  const [year, month, day] = parts;
  const normalizedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const displayDate = `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;

  // For permission entries, skip task validation
  if (isPermission) {
    proceedAfterValidation();
  } else {
    // Validate that the task is assigned to the target user
    const validateSql = `
      SELECT id FROM task
      WHERE id = ? AND FIND_IN_SET(?, REPLACE(assigned_to, ' ', ''))
    `;

    db.query(validateSql, [task, created_by], (err, validationResults) => {
      if (err) {
        console.error("Validate assignment error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (validationResults.length === 0) {
        return res.status(400).json({ message: "This task is not assigned to the selected user." });
      }

      proceedAfterValidation();
    });
  }

  function proceedAfterValidation() {

    // Step 1: Check total hours already logged for that user on that date
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
      const remaining = 8 - totalHours;

      if (totalHours + hoursToAdd > 8) {
        return res.status(400).json({
          message: `Only ${remaining} hr${remaining !== 1 ? "s" : ""} remaining for ${displayDate}. Cannot add ${hoursToAdd} hr${hoursToAdd !== 1 ? "s" : ""}.`,
        });
      }

      // Step 2: Check for overlapping time entries on same date for same user
      if (dbStartTime && dbEndTime) {
        const overlapSql = `
          SELECT id, start_time, end_time, task
          FROM timesheet
          WHERE DATE(date) = ? AND created_by = ?
          AND start_time IS NOT NULL AND end_time IS NOT NULL
          AND start_time < ? AND end_time > ?
        `;

        db.query(overlapSql, [normalizedDate, created_by, dbEndTime, dbStartTime], (err, overlapResults) => {
          if (err) {
            console.error("Check overlap error:", err);
            return res.status(500).json({ message: "Database error" });
          }

          if (overlapResults.length > 0) {
            const overlap = overlapResults[0];
            const overlapStart = formatTimeAMPM(overlap.start_time);
            const overlapEnd = formatTimeAMPM(overlap.end_time);
            return res.status(400).json({
              message: `Time overlap detected! You already have an entry from ${overlapStart} to ${overlapEnd} on ${displayDate}. Please choose a different time slot.`,
            });
          }

          // No overlap - proceed with insert
          insertTimesheet();
        });
      } else {
        insertTimesheet();
      }

      function insertTimesheet() {
        const insertSql = "INSERT INTO timesheet (task, date, man_hrs, start_time, end_time, work_description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)";

        db.query(insertSql, [task, normalizedDate, hoursToAdd, dbStartTime, dbEndTime, work_description || null, created_by], (err, result) => {
          if (err) {
            console.error("Insert timesheet error:", err);
            return res.status(500).json({ message: "Database error" });
          }

          res.json({ message: "Timesheet added successfully", timesheet_id: result.insertId });
        });
      }
    });
  }
});


// Projects assigned to a specific user (for admin modal) - only completed tasks
router.get("/admin/projects/:userId", verifyToken, (req, res) => {
  const sql = `
    SELECT DISTINCT p.id, p.project_name
    FROM task t
    JOIN projects p ON p.id = t.project_id
    WHERE FIND_IN_SET(?, REPLACE(t.assigned_to, ' ', ''))
    AND t.status = 'Completed'
    ORDER BY p.project_name ASC
  `;
  db.query(sql, [req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch projects" });
    res.json(rows);
  });
});

// Tasks for a project assigned to a specific user (for admin modal) - only completed tasks
router.get("/admin/tasks/:projectId/:userId", verifyToken, (req, res) => {
  const sql = `
    SELECT id, task FROM task
    WHERE project_id = ? AND FIND_IN_SET(?, REPLACE(assigned_to, ' ', ''))
    AND status = 'Completed'
    ORDER BY task ASC
  `;
  db.query(sql, [req.params.projectId, req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch tasks" });
    res.json(rows);
  });
});

module.exports = router;
