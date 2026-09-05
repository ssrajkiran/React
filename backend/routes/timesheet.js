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
    AND t.status = 'In Progress'
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
    AND status = 'In Progress'
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


// Projects assigned to a specific user (for admin modal) - only In Progress tasks
router.get("/admin/projects/:userId", verifyToken, (req, res) => {
  const sql = `
    SELECT DISTINCT p.id, p.project_name
    FROM task t
    JOIN projects p ON p.id = t.project_id
    WHERE FIND_IN_SET(?, REPLACE(t.assigned_to, ' ', ''))
    AND t.status = 'In Progress'
    ORDER BY p.project_name ASC
  `;
  db.query(sql, [req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch projects" });
    res.json(rows);
  });
});

// Tasks for a project assigned to a specific user (for admin modal) - only In Progress tasks
router.get("/admin/tasks/:projectId/:userId", verifyToken, (req, res) => {
  const sql = `
    SELECT id, task FROM task
    WHERE project_id = ? AND FIND_IN_SET(?, REPLACE(assigned_to, ' ', ''))
    AND status = 'In Progress'
    ORDER BY task ASC
  `;
  db.query(sql, [req.params.projectId, req.params.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch tasks" });
    res.json(rows);
  });
});

/* ==============================
   MAIN DASHBOARD SUMMARY
   /api/timesheet/dashboard/summary
================================ */
router.get("/dashboard/summary", verifyToken, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === "admin";
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Get start of current week (Monday)
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(monday.getDate() + mondayOffset);
  const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;

  // Get start and end of current month
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;

  const queries = {};

  // 1. Today's attendance (timesheet entries for today)
  queries.todayHours = new Promise((resolve, reject) => {
    const sql = `
      SELECT COALESCE(SUM(man_hrs), 0) AS total_hours, COUNT(*) AS entry_count
      FROM timesheet
      WHERE DATE(date) = ? AND created_by = ?
    `;
    db.query(sql, [todayStr, userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || { total_hours: 0, entry_count: 0 });
    });
  });

  // 2. This week's hours
  queries.weekHours = new Promise((resolve, reject) => {
    const sql = `
      SELECT COALESCE(SUM(man_hrs), 0) AS total_hours, COUNT(*) AS entry_count
      FROM timesheet
      WHERE DATE(date) >= ? AND DATE(date) <= ? AND created_by = ?
    `;
    db.query(sql, [weekStart, todayStr, userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || { total_hours: 0, entry_count: 0 });
    });
  });

  // 3. Pending tasks/modules count (assigned to user, In Progress)
  queries.pendingModules = new Promise((resolve, reject) => {
    const sql = `
      SELECT COUNT(*) AS count FROM task
      WHERE FIND_IN_SET(?, REPLACE(assigned_to, ' ', ''))
      AND status = 'In Progress'
    `;
    db.query(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || { count: 0 });
    });
  });

  // 4. Pending leaves count
  queries.pendingLeaves = new Promise((resolve, reject) => {
    const sql = `SELECT COUNT(*) AS count FROM leaves WHERE user_id = ? AND status = 'pending'`;
    db.query(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || { count: 0 });
    });
  });

  // 5. Recent timesheet entries (last 5)
  queries.recentEntries = new Promise((resolve, reject) => {
    const sql = `
      SELECT ts.id, ts.date, ts.man_hrs, ts.start_time, ts.end_time,
             ts.work_description,
             IFNULL(t.task, ts.work_description) AS task_name,
             IFNULL(p.project_name, 'Permission') AS project_name
      FROM timesheet ts
      LEFT JOIN task t ON ts.task = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE ts.created_by = ?
      ORDER BY ts.date DESC, ts.id DESC
      LIMIT 5
    `;
    db.query(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

  // 6. Todo count (active)
  queries.todoCount = new Promise((resolve, reject) => {
    const sql = `SELECT COUNT(*) AS count FROM todos WHERE user_id = ? AND completed = 0`;
    db.query(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || { count: 0 });
    });
  });

  // Admin-only: team stats
  if (isAdmin) {
    queries.teamTodayHours = new Promise((resolve, reject) => {
      const sql = `
        SELECT COUNT(DISTINCT created_by) AS active_employees, COALESCE(SUM(man_hrs), 0) AS total_hours
        FROM timesheet WHERE DATE(date) = ?
      `;
      db.query(sql, [todayStr], (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || { active_employees: 0, total_hours: 0 });
      });
    });

    queries.teamWeekHours = new Promise((resolve, reject) => {
      const sql = `
        SELECT COUNT(DISTINCT created_by) AS active_employees, COALESCE(SUM(man_hrs), 0) AS total_hours
        FROM timesheet WHERE DATE(date) >= ? AND DATE(date) <= ?
      `;
      db.query(sql, [weekStart, todayStr], (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || { active_employees: 0, total_hours: 0 });
      });
    });

    queries.totalEmployees = new Promise((resolve, reject) => {
      db.query("SELECT COUNT(*) AS count FROM users WHERE role = 'employee'", (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || { count: 0 });
      });
    });

    queries.pendingApprovals = new Promise((resolve, reject) => {
      db.query("SELECT COUNT(*) AS count FROM leaves WHERE status = 'pending'", (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || { count: 0 });
      });
    });
  }

  Promise.all(Object.values(queries))
    .then((results) => {
      const keys = Object.keys(queries);
      const data = {};
      keys.forEach((key, i) => { data[key] = results[i]; });
      res.json(data);
    })
    .catch((err) => {
      console.error("Dashboard summary error:", err);
      res.status(500).json({ message: "Failed to load dashboard summary" });
    });
});

/* ==============================
   TIMESHEET DASHBOARD DATA
   /api/timesheet/dashboard/timesheet
================================ */
router.get("/dashboard/timesheet", verifyToken, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === "admin";
  const { dateFrom, dateTo, projectId, employeeId, limit } = req.query;

  const queries = {};

  // 1. KPIs
  queries.kpis = new Promise((resolve, reject) => {
    let sql;
    const params = [];

    if (isAdmin) {
      sql = `
        SELECT
          COUNT(DISTINCT DATE(ts.date)) AS active_days,
          COUNT(DISTINCT ts.created_by) AS active_employees,
          COUNT(DISTINCT t.project_id) AS active_projects,
          COALESCE(SUM(ts.man_hrs), 0) AS total_hours,
          COUNT(*) AS total_entries
        FROM timesheet ts
        LEFT JOIN task t ON ts.task = t.id
        WHERE DATE(ts.date) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      `;
    } else {
      sql = `
        SELECT
          COUNT(DISTINCT DATE(ts.date)) AS active_days,
          COUNT(DISTINCT t.project_id) AS active_projects,
          COALESCE(SUM(ts.man_hrs), 0) AS total_hours,
          COUNT(*) AS total_entries
        FROM timesheet ts
        LEFT JOIN task t ON ts.task = t.id
        WHERE ts.created_by = ?
        AND DATE(ts.date) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      `;
      params.push(userId);
    }

    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || {});
    });
  });

  // 2. Project → Module hierarchy with hours
  queries.hierarchy = new Promise((resolve, reject) => {
    let sql;
    const params = [];

    if (isAdmin) {
      sql = `
        SELECT
          p.id AS project_id,
          p.project_name,
          t.id AS module_id,
          t.task AS module_name,
          t.status AS module_status,
          t.assigned_to,
          COALESCE(SUM(ts.man_hrs), 0) AS total_hours,
          COUNT(ts.id) AS entry_count
        FROM projects p
        LEFT JOIN task t ON t.project_id = p.id
        LEFT JOIN timesheet ts ON ts.task = t.id
        ${dateFrom ? "AND DATE(ts.date) >= ?" : ""}
        ${dateTo ? "AND DATE(ts.date) <= ?" : ""}
        GROUP BY p.id, p.project_name, t.id, t.task, t.status, t.assigned_to
        ORDER BY p.project_name ASC, t.task ASC
      `;
      if (dateFrom) params.push(dateFrom);
      if (dateTo) params.push(dateTo);
    } else {
      sql = `
        SELECT
          p.id AS project_id,
          p.project_name,
          t.id AS module_id,
          t.task AS module_name,
          t.status AS module_status,
          COALESCE(SUM(ts.man_hrs), 0) AS total_hours,
          COUNT(ts.id) AS entry_count
        FROM projects p
        INNER JOIN task t ON t.project_id = p.id AND FIND_IN_SET(?, REPLACE(t.assigned_to, ' ', ''))
        LEFT JOIN timesheet ts ON ts.task = t.id
        ${dateFrom ? "AND DATE(ts.date) >= ?" : ""}
        ${dateTo ? "AND DATE(ts.date) <= ?" : ""}
        GROUP BY p.id, p.project_name, t.id, t.task, t.status
        ORDER BY p.project_name ASC, t.task ASC
      `;
      params.push(userId);
      if (dateFrom) params.push(dateFrom);
      if (dateTo) params.push(dateTo);
    }

    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);

      // Group into hierarchy
      const projectMap = {};
      (rows || []).forEach((row) => {
        if (!projectMap[row.project_id]) {
          projectMap[row.project_id] = {
            project_id: row.project_id,
            project_name: row.project_name,
            modules: [],
            total_hours: 0,
          };
        }
        if (row.module_id) {
          projectMap[row.project_id].modules.push({
            module_id: row.module_id,
            module_name: row.module_name,
            module_status: row.module_status,
            total_hours: parseFloat(row.total_hours) || 0,
            entry_count: row.entry_count,
          });
        }
        projectMap[row.project_id].total_hours += parseFloat(row.total_hours) || 0;
      });

      resolve(Object.values(projectMap));
    });
  });

  // 3. Detailed timesheet entries
  queries.entries = new Promise((resolve, reject) => {
    let whereClauses = [];
    let params = [];

    if (isAdmin) {
      if (employeeId) {
        whereClauses.push("ts.created_by = ?");
        params.push(employeeId);
      }
    } else {
      whereClauses.push("ts.created_by = ?");
      params.push(userId);
    }

    if (projectId) {
      whereClauses.push("t.project_id = ?");
      params.push(projectId);
    }

    if (dateFrom) {
      whereClauses.push("DATE(ts.date) >= ?");
      params.push(dateFrom);
    }
    if (dateTo) {
      whereClauses.push("DATE(ts.date) <= ?");
      params.push(dateTo);
    }

    const whereStr = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";
    const limitNum = parseInt(limit) || 10;

    const sql = `
      SELECT
        ts.id AS timesheet_id,
        ts.date AS timesheet_date,
        ts.man_hrs,
        ts.start_time,
        ts.end_time,
        ts.work_description,
        IFNULL(t.task, ts.work_description) AS module_name,
        IFNULL(p.project_name, 'Permission') AS project_name,
        IFNULL(t.status, 'Permission') AS module_status,
        u.name AS employee_name
      FROM timesheet ts
      LEFT JOIN task t ON ts.task = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON ts.created_by = u.id
      ${whereStr}
      ORDER BY ts.date DESC, ts.id DESC
      LIMIT ?
    `;
    params.push(limitNum);

    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

  // 4. All projects (for filter dropdown)
  queries.projects = new Promise((resolve, reject) => {
    db.query("SELECT id, project_name FROM projects ORDER BY project_name ASC", (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

  // 5. All employees (admin only, for filter dropdown)
  if (isAdmin) {
    queries.employees = new Promise((resolve, reject) => {
      db.query("SELECT id, name FROM users WHERE role = 'employee' ORDER BY name ASC", (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  Promise.all(Object.values(queries))
    .then((results) => {
      const keys = Object.keys(queries);
      const data = {};
      keys.forEach((key, i) => { data[key] = results[i]; });
      res.json(data);
    })
    .catch((err) => {
      console.error("Timesheet dashboard error:", err);
      res.status(500).json({ message: "Failed to load timesheet dashboard" });
    });
});

/* ==============================
   USER DETAIL
   /api/timesheet/detail/user/:id
=============================== */
router.get("/detail/user/:id", verifyToken, (req, res) => {
  const userId = req.params.id;

  const queries = {};

  // 1. User info
  queries.user = new Promise((resolve, reject) => {
    db.query("SELECT id, name, email, role FROM users WHERE id = ?", [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || null);
    });
  });

  // 2. Assigned projects
  queries.projects = new Promise((resolve, reject) => {
    const sql = `
      SELECT DISTINCT p.id, p.project_name, t.status AS module_status
      FROM task t
      JOIN projects p ON p.id = t.project_id
      WHERE FIND_IN_SET(?, REPLACE(t.assigned_to, ' ', ''))
      ORDER BY p.project_name ASC
    `;
    db.query(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

  // 3. Assigned modules
  queries.modules = new Promise((resolve, reject) => {
    const sql = `
      SELECT t.id, t.task AS module_name, t.status AS module_status, p.project_name, p.id AS project_id
      FROM task t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE FIND_IN_SET(?, REPLACE(t.assigned_to, ' ', ''))
      ORDER BY p.project_name ASC, t.task ASC
    `;
    db.query(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

  // 4. Recent timesheet entries (last 10)
  queries.timesheet = new Promise((resolve, reject) => {
    const sql = `
      SELECT ts.id, ts.date, ts.man_hrs, ts.start_time, ts.end_time, ts.work_description,
             IFNULL(t.task, ts.work_description) AS module_name,
             IFNULL(p.project_name, 'Permission') AS project_name
      FROM timesheet ts
      LEFT JOIN task t ON ts.task = t.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE ts.created_by = ?
      ORDER BY ts.date DESC LIMIT 10
    `;
    db.query(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

  // 5. Leave & Permission history
  queries.leaves = new Promise((resolve, reject) => {
    const leavesSql = `
      SELECT id, type,
        DATE_FORMAT(from_date, '%Y-%m-%d') AS start, DATE_FORMAT(to_date, '%Y-%m-%d') AS end,
        days, NULL AS hours, status, half_day_type, NULL AS slot
      FROM leaves WHERE user_id = ?
    `;
    const permSql = `
      SELECT id, 'permission' AS type,
        DATE_FORMAT(date, '%Y-%m-%d') AS start, DATE_FORMAT(date, '%Y-%m-%d') AS end,
        NULL AS days, hours, status, NULL AS half_day_type, slot
      FROM permission WHERE user_id = ?
    `;
    db.query(leavesSql, [userId], (err, leaveRows) => {
      if (err) return reject(err);
      db.query(permSql, [userId], (err, permRows) => {
        if (err) return reject(err);
        const all = [...(leaveRows || []), ...(permRows || [])]
          .sort((a, b) => (a.start < b.start ? 1 : -1))
          .slice(0, 10);
        resolve(all);
      });
    });
  });

  // 6. Stats
  queries.stats = new Promise((resolve, reject) => {
    const sql = `
      SELECT
        COUNT(DISTINCT ts.id) AS total_timesheet_entries,
        COALESCE(SUM(ts.man_hrs), 0) AS total_hours,
        COUNT(DISTINCT DATE(ts.date)) AS active_days
      FROM timesheet ts WHERE ts.created_by = ?
    `;
    db.query(sql, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || {});
    });
  });

  Promise.all(Object.values(queries))
    .then((results) => {
      const keys = Object.keys(queries);
      const data = {};
      keys.forEach((key, i) => { data[key] = results[i]; });
      res.json(data);
    })
    .catch((err) => {
      console.error("User detail error:", err);
      res.status(500).json({ message: "Failed to load user detail" });
    });
});

/* ==============================
   PROJECT DETAIL
   /api/timesheet/detail/project/:id
=============================== */
router.get("/detail/project/:id", verifyToken, (req, res) => {
  const projectId = req.params.id;

  const queries = {};

  // 1. Project info
  queries.project = new Promise((resolve, reject) => {
    db.query("SELECT id, project_name FROM projects WHERE id = ?", [projectId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || null);
    });
  });

  // 2. Modules in project
  queries.modules = new Promise((resolve, reject) => {
    const sql = `
      SELECT t.id, t.task AS module_name, t.status AS module_status, t.assigned_to,
             GROUP_CONCAT(DISTINCT u.name SEPARATOR ', ') AS assigned_names,
             COALESCE(SUM(ts.man_hrs), 0) AS total_hours,
             COUNT(ts.id) AS entry_count
      FROM task t
      LEFT JOIN timesheet ts ON ts.task = t.id
      LEFT JOIN users u ON FIND_IN_SET(u.id, REPLACE(t.assigned_to, ' ', ''))
      WHERE t.project_id = ?
      GROUP BY t.id, t.task, t.status, t.assigned_to
      ORDER BY t.task ASC
    `;
    db.query(sql, [projectId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

  // 3. Team members
  queries.team = new Promise((resolve, reject) => {
    const sql = `
      SELECT DISTINCT u.id, u.name, u.email,
             COUNT(DISTINCT t.id) AS module_count,
             COALESCE(SUM(ts.man_hrs), 0) AS total_hours
      FROM task t
      JOIN users u ON FIND_IN_SET(u.id, REPLACE(t.assigned_to, ' ', ''))
      LEFT JOIN timesheet ts ON ts.task = t.id
      WHERE t.project_id = ?
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name ASC
    `;
    db.query(sql, [projectId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

  // 4. Recent timesheet entries
  queries.timesheet = new Promise((resolve, reject) => {
    const sql = `
      SELECT ts.id, ts.date, ts.man_hrs, ts.start_time, ts.end_time, ts.work_description,
             IFNULL(t.task, ts.work_description) AS module_name,
             u.name AS employee_name
      FROM timesheet ts
      LEFT JOIN task t ON ts.task = t.id
      LEFT JOIN users u ON ts.created_by = u.id
      WHERE t.project_id = ?
      ORDER BY ts.date DESC LIMIT 10
    `;
    db.query(sql, [projectId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

  // 5. Stats
  queries.stats = new Promise((resolve, reject) => {
    const sql = `
      SELECT
        COUNT(DISTINCT t.id) AS module_count,
        COUNT(DISTINCT ts.created_by) AS contributor_count,
        COALESCE(SUM(ts.man_hrs), 0) AS total_hours,
        COUNT(DISTINCT DATE(ts.date)) AS active_days
      FROM task t
      LEFT JOIN timesheet ts ON ts.task = t.id
      WHERE t.project_id = ?
    `;
    db.query(sql, [projectId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || {});
    });
  });

  Promise.all(Object.values(queries))
    .then((results) => {
      const keys = Object.keys(queries);
      const data = {};
      keys.forEach((key, i) => { data[key] = results[i]; });
      res.json(data);
    })
    .catch((err) => {
      console.error("Project detail error:", err);
      res.status(500).json({ message: "Failed to load project detail" });
    });
});

/* ==============================
   MODULE DETAIL
   /api/timesheet/detail/module/:id
=============================== */
router.get("/detail/module/:id", verifyToken, (req, res) => {
  const moduleId = req.params.id;

  const queries = {};

  // 1. Module info
  queries.module = new Promise((resolve, reject) => {
    const sql = `
      SELECT t.id, t.task AS module_name, t.status AS module_status, t.assigned_to,
             p.id AS project_id, p.project_name
      FROM task t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `;
    db.query(sql, [moduleId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || null);
    });
  });

  // 2. Team members assigned
  queries.team = new Promise((resolve, reject) => {
    const sql = `
      SELECT u.id, u.name, u.email,
             COALESCE(SUM(ts.man_hrs), 0) AS total_hours,
             COUNT(ts.id) AS entry_count
      FROM users u
      JOIN task t ON FIND_IN_SET(u.id, REPLACE(t.assigned_to, ' ', ''))
      LEFT JOIN timesheet ts ON ts.task = t.id AND ts.created_by = u.id
      WHERE t.id = ?
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name ASC
    `;
    db.query(sql, [moduleId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

  // 3. Timesheet entries
  queries.timesheet = new Promise((resolve, reject) => {
    const sql = `
      SELECT ts.id, ts.date, ts.man_hrs, ts.start_time, ts.end_time, ts.work_description,
             u.name AS employee_name
      FROM timesheet ts
      LEFT JOIN users u ON ts.created_by = u.id
      WHERE ts.task = ?
      ORDER BY ts.date DESC LIMIT 15
    `;
    db.query(sql, [moduleId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

  // 4. Stats
  queries.stats = new Promise((resolve, reject) => {
    const sql = `
      SELECT
        COUNT(DISTINCT ts.created_by) AS contributor_count,
        COALESCE(SUM(ts.man_hrs), 0) AS total_hours,
        COUNT(ts.id) AS entry_count,
        COUNT(DISTINCT DATE(ts.date)) AS active_days
      FROM timesheet ts WHERE ts.task = ?
    `;
    db.query(sql, [moduleId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || {});
    });
  });

  Promise.all(Object.values(queries))
    .then((results) => {
      const keys = Object.keys(queries);
      const data = {};
      keys.forEach((key, i) => { data[key] = results[i]; });
      res.json(data);
    })
    .catch((err) => {
      console.error("Module detail error:", err);
      res.status(500).json({ message: "Failed to load module detail" });
    });
});

/* ==============================
   TIMESHEET DETAIL
   /api/timesheet/detail/:id
=============================== */
router.get("/detail/:id", verifyToken, (req, res) => {
  const timesheetId = req.params.id;

  const sql = `
    SELECT
      ts.id, ts.date, ts.man_hrs, ts.start_time, ts.end_time, ts.work_description,
      ts.created_by, ts.created_at, ts.updated_at,
      t.id AS module_id, t.task AS module_name, t.status AS module_status,
      p.id AS project_id, p.project_name,
      u.name AS employee_name, u.email AS employee_email
    FROM timesheet ts
    LEFT JOIN task t ON ts.task = t.id
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON ts.created_by = u.id
    WHERE ts.id = ?
  `;

  db.query(sql, [timesheetId], (err, rows) => {
    if (err) {
      console.error("Timesheet detail error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    if (rows.length === 0) {
      return res.status(404).json({ message: "Timesheet entry not found" });
    }
    res.json(rows[0]);
  });
});

module.exports = router;
