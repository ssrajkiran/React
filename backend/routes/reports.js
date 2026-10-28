const express = require("express");
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const { taskStatusSql, taskRowStatusSql } = require("../utils/freezedModules");

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

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// GET /api/reports/projects - dropdown list
router.get("/projects", verifyToken, (req, res) => {
  db.query("SELECT id, project_name FROM projects ORDER BY project_name ASC", (err, rows) => {
    if (err) return res.status(500).json({ message: "Failed to fetch projects" });
    res.json(rows);
  });
});

// GET /api/reports/project-wise?project_id=X
router.get("/project-wise", verifyToken, (req, res) => {
  const project_id = Number(req.query.project_id);
  if (!project_id) return res.status(400).json({ message: "project_id is required" });

  db.query("SELECT id, project_name FROM projects WHERE id = ?", [project_id], (err, projRows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!projRows.length) return res.status(404).json({ message: "Project not found" });

    const sql = `
      SELECT t.id AS task_id, t.task AS module_name, ${taskStatusSql()} AS module_status,
             ts.work_description, ts.man_hrs, ts.date, u.name AS person_name
      FROM task t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN timesheet ts ON ts.task = t.id
      LEFT JOIN users u ON u.id = ts.created_by
      WHERE p.id = ?

      UNION ALL

      SELECT NULL AS task_id, SUBSTRING(ts.task, 5) AS module_name, 'Completed' AS module_status,
             ts.work_description, ts.man_hrs, ts.date, u.name AS person_name
      FROM timesheet ts
      LEFT JOIN users u ON u.id = ts.created_by
      WHERE ts.project_id = ? AND ts.task LIKE 'FV::%'

      ORDER BY module_name ASC, date DESC
    `;

    db.query(sql, [project_id, project_id], (err2, rows) => {
      if (err2) return res.status(500).json({ message: "Database error" });

      const personsMap = {};
      const modulesMap = {};
      let totalHours = 0;

      rows.forEach((r) => {
        const key = r.task_id !== null && r.task_id !== undefined ? r.task_id : `fv:${r.module_name}`;
        if (!modulesMap[key]) {
          modulesMap[key] = {
            task_id: r.task_id,
            module_name: r.module_name,
            status: r.module_status || "In Progress",
            total_hours: 0,
            entries: [],
          };
        }
        const hasEntry = r.date !== null && r.date !== undefined;
        if (!hasEntry) return;

        const hrs = Number(r.man_hrs) || 0;
        totalHours += hrs;
        modulesMap[key].total_hours += hrs;
        modulesMap[key].entries.push({
          work_description: r.work_description || "-",
          man_hrs: hrs,
          date: r.date,
          person: r.person_name || "Unknown",
        });

        const personKey = r.person_name || "Unknown";
        personsMap[personKey] = (personsMap[personKey] || 0) + hrs;
      });

      res.json({
        project: projRows[0],
        total_hours: round2(totalHours),
        persons: Object.entries(personsMap)
          .map(([name, hours]) => ({ name, hours: round2(hours) }))
          .sort((a, b) => b.hours - a.hours),
        modules: Object.values(modulesMap),
      });
    });
  });
});

// GET /api/reports/module-wise
router.get("/module-wise", verifyToken, (req, res) => {
  const sql = `
    SELECT p.id AS project_id, p.project_name,
           t.id AS task_id, t.task AS module_name, ${taskRowStatusSql()} AS module_status,
           ts.created_by, u.name AS person_name,
           IFNULL(SUM(ts.man_hrs), 0) AS total_hours,
           COUNT(ts.id) AS entry_count
    FROM task t
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN timesheet ts ON ts.task = t.id
    LEFT JOIN users u ON u.id = ts.created_by
    GROUP BY p.id, t.id, ts.created_by

    UNION ALL

    SELECT p.id AS project_id, p.project_name,
           NULL AS task_id, SUBSTRING(ts.task, 5) AS module_name, 'Completed' AS module_status,
           ts.created_by, u.name AS person_name,
           IFNULL(SUM(ts.man_hrs), 0) AS total_hours,
           COUNT(ts.id) AS entry_count
    FROM timesheet ts
    JOIN projects p ON p.id = ts.project_id
    LEFT JOIN users u ON u.id = ts.created_by
    WHERE ts.task LIKE 'FV::%'
    GROUP BY p.id, p.project_name, SUBSTRING(ts.task, 5), ts.created_by, u.name

    ORDER BY project_name ASC, module_name ASC
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });

    const merged = {};
    rows.forEach((r) => {
      const key = r.task_id !== null && r.task_id !== undefined ? r.task_id : `fv:${r.project_id}:${r.module_name}`;
      if (!merged[key]) {
        merged[key] = {
          project_id: r.project_id,
          project_name: r.project_name,
          task_id: r.task_id,
          module_name: r.module_name,
          status: r.module_status || "In Progress",
          total_hours: 0,
          entry_count: 0,
          persons: [],
        };
      }
      merged[key].total_hours += Number(r.total_hours) || 0;
      merged[key].entry_count += Number(r.entry_count) || 0;
      if (r.person_name && Number(r.entry_count) > 0) merged[key].persons.push(r.person_name);
    });

    res.json(
      Object.values(merged).map((m) => ({
        ...m,
        total_hours: round2(m.total_hours),
        persons: [...new Set(m.persons)],
      }))
    );
  });
});

module.exports = router;
