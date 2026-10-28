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

const run = (query, values = []) =>
  new Promise((resolve, reject) =>
    db.query(query, values, (err, rows) => (err ? reject(err) : resolve(rows)))
  );

// GET ALL TASKS
router.get("/", verifyToken, async (req, res) => {
  try {
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

    const tasks = await run(sql, params);

    // Virtual freezed modules ("FV::<name>") that have timesheet entries.
    // They have no task row - they are surfaced here so a module appears in the
    // Module List once someone has timesheeted against it.
    let fvSql = `
      SELECT ts.task AS fv_key, ts.project_id, SUBSTRING(ts.task, 5) AS module_name,
             p.project_name, MIN(ts.date) AS first_date,
             COUNT(ts.id) AS entry_count,
             IFNULL(SUM(ts.man_hrs), 0) AS total_man_hrs,
             GROUP_CONCAT(DISTINCT u.name ORDER BY u.name SEPARATOR ', ') AS contributor_names,
             -ABS(CRC32(CONCAT(ts.project_id, ':', ts.task))) AS virtual_id
      FROM timesheet ts
      LEFT JOIN projects p ON p.id = ts.project_id
      LEFT JOIN users u ON u.id = ts.created_by
      WHERE ts.task LIKE 'FV::%' AND ts.project_id IS NOT NULL
    `;
    const fvParams = [];
    if (req.user.role !== "admin") {
      fvSql += ` AND ts.created_by = ?`;
      fvParams.push(req.user.id);
    }
    fvSql += ` GROUP BY ts.task, ts.project_id, p.project_name ORDER BY MIN(ts.date) DESC`;
    let fvGroups = await run(fvSql, fvParams);

    // Hide virtual modules whose project already has a real module of the same name
    if (fvGroups.length > 0) {
      const names = [...new Set(fvGroups.map((g) => String(g.module_name).toLowerCase()))];
      const dupRows = await run(
        `SELECT DISTINCT project_id, LOWER(task) AS lname FROM task WHERE LOWER(task) IN (?)`,
        [names]
      );
      const dupSet = new Set(dupRows.map((r) => `${r.project_id}:${r.lname}`));
      fvGroups = fvGroups.filter(
        (g) => !dupSet.has(`${g.project_id}:${String(g.module_name).toLowerCase()}`)
      );
    }

    // Per-user hours breakdown for real tasks
    const taskIds = tasks.map((t) => t.id);
    const hoursRows = taskIds.length > 0
      ? await run(
          `SELECT ts.task AS task_id, ts.created_by AS user_id, u.name AS user_name,
                  IFNULL(SUM(ts.man_hrs), 0) AS user_hrs
           FROM timesheet ts
           LEFT JOIN users u ON ts.created_by = u.id
           WHERE ts.task IN (?)
           GROUP BY ts.task, ts.created_by`,
          [taskIds]
        )
      : [];

    // Per-user hours breakdown for virtual freezed modules
    const fvHoursRows = fvGroups.length > 0
      ? await run(
          `SELECT ts.task AS fv_key, ts.project_id, ts.created_by AS user_id, u.name AS user_name,
                  IFNULL(SUM(ts.man_hrs), 0) AS user_hrs
           FROM timesheet ts
           LEFT JOIN users u ON ts.created_by = u.id
           WHERE ts.task LIKE 'FV::%' AND ts.project_id IS NOT NULL${fvParams.length ? " AND ts.created_by = ?" : ""}
           GROUP BY ts.task, ts.project_id, ts.created_by, u.name`,
          fvParams
        )
      : [];

    const allUsers = await run(`SELECT id, name, role FROM users ORDER BY name ASC`);
    const userMap = {};
    allUsers.forEach((u) => (userMap[u.id] = u.name));

    const hoursMap = {};
    hoursRows.forEach((row) => {
      if (!hoursMap[row.task_id]) hoursMap[row.task_id] = [];
      hoursMap[row.task_id].push({ user_name: row.user_name, user_hrs: row.user_hrs });
    });

    const fvHoursMap = {};
    fvHoursRows.forEach((row) => {
      const key = `${row.project_id}:${row.fv_key}`;
      if (!fvHoursMap[key]) fvHoursMap[key] = [];
      fvHoursMap[key].push({ user_name: row.user_name, user_hrs: row.user_hrs });
    });

    const result = tasks.map((task) => ({
      ...task,
      assigned_to_names: task.assigned_to
        ? task.assigned_to.split(",").map((id) => userMap[parseInt(id.trim())] || `ID:${id.trim()}`).join(", ")
        : "",
      created_by_name: userMap[task.created_by] || `ID:${task.created_by}`,
      user_hours: hoursMap[task.id] || [],
    }));

    const virtualRows = fvGroups.map((g) => {
      const key = `${g.project_id}:${g.fv_key}`;
      const userHours = fvHoursMap[key] || [];
      return {
        id: g.virtual_id,
        virtual: true,
        fv_key: g.fv_key,
        project_id: g.project_id,
        project_name: g.project_name,
        task: g.module_name,
        status: "Completed",
        assigned_to: "",
        assigned_to_names: userHours.map((uh) => uh.user_name).filter(Boolean).join(", "),
        created_by: null,
        created_by_name: g.contributor_names || "",
        created_at: g.first_date,
        total_man_hrs: g.total_man_hrs,
        user_hours: userHours,
        entry_count: g.entry_count,
      };
    });

    // Newest module first across real tasks and virtual freezed modules
    const combined = [...result, ...virtualRows].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    res.json({ tasks: combined, users: allUsers });
  } catch (err) {
    console.error("Tasks list error:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
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
router.put("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  let { task, assigned_to, project_id, status, fv_key } = req.body;
  if (Array.isArray(assigned_to)) assigned_to = assigned_to.join(",");

  // Virtual freezed module (no task row): editing it converts it into a real
  // module of the project and points all its timesheet entries at that module.
  const isVirtual = String(fv_key || "").startsWith("FV::") || Number(id) < 0;
  if (isVirtual) {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admin can edit this module" });
    }
    const fv = String(fv_key || "");
    const pid = Number(project_id);
    const newName = String(task || "").trim();
    if (!fv.startsWith("FV::") || !pid || !newName) {
      return res.status(400).json({ error: "Project and module name are required" });
    }
    try {
      const existing = await run(
        `SELECT id FROM task WHERE project_id = ? AND LOWER(task) = LOWER(?) LIMIT 1`,
        [pid, newName]
      );
      let taskId;
      if (existing.length > 0) {
        taskId = existing[0].id;
        await run(`UPDATE task SET assigned_to = ?, status = ? WHERE id = ?`, [
          assigned_to || "",
          status || "In Progress",
          taskId,
        ]);
      } else {
        const result = await run(
          `INSERT INTO task (project_id, task, assigned_to, created_by, created_at) VALUES (?, ?, ?, ?, ?)`,
          [pid, newName, assigned_to || "", req.user.id, new Date()]
        );
        taskId = result.insertId;
      }
      await run(`UPDATE timesheet SET task = ? WHERE task = ? AND project_id = ?`, [
        String(taskId),
        fv,
        pid,
      ]);
      return res.json({ success: true, message: "Task updated successfully", task_id: taskId });
    } catch (err) {
      console.error("Virtual task update error:", err);
      return res.status(500).json({ error: "Failed to update task" });
    }
  }

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
  // Virtual freezed module: deleting it removes all of its timesheet entries
  const fv = String(req.query.fv || "");
  const fvProject = req.query.project || "";
  if (fv.startsWith("FV::") && fvProject !== "") {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admin can delete this module" });
    }
    db.query(`DELETE FROM timesheet WHERE task = ? AND project_id = ?`, [fv, fvProject], (err, result) => {
      if (err) {
        console.error("Virtual task delete error:", err);
        return res.status(500).json({ error: "Failed to delete task" });
      }
      res.json({
        success: true,
        message: "Task deleted successfully",
        deleted_entries: (result && result.affectedRows) || 0,
      });
    });
    return;
  }

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
