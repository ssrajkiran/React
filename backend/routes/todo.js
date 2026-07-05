const router = require("express").Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

/* ==============================
   AUTH MIDDLEWARE
================================ */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Token missing" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, "secret", (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    req.user = decoded;
    next();
  });
};

/* ==============================
   HELPERS
================================ */
const uid = (req) => req.user.id;

const TODO_SELECT = `
  SELECT id, title, description, priority,
         DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
         completed, created_at
  FROM todos
`;

const formatTodo = (r) => ({ ...r, completed: r.completed === 1 });

/* ==============================
   GET STATS  (before /:id)
================================ */
router.get("/stats/summary", verifyToken, (req, res) => {
  db.query(
    `SELECT
       COUNT(*)           AS total,
       SUM(completed = 1) AS completed,
       SUM(completed = 0) AS active
     FROM todos
     WHERE user_id = ?`,
    [uid(req)],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Failed to fetch stats" });
      const { total, completed, active } = results[0];
      res.json({ total, completed, active });
    }
  );
});

/* ==============================
   GET ALL TODOS
================================ */
router.get("/", verifyToken, (req, res) => {
  const { filter = "All", search = "" } = req.query;

  let sql = `${TODO_SELECT} WHERE user_id = ?`;
  const params = [uid(req)];

  if (filter === "Active")    { sql += " AND completed = 0"; }
  if (filter === "Completed") { sql += " AND completed = 1"; }

  if (search.trim()) {
    sql += " AND (title LIKE ? OR description LIKE ?)";
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  sql += " ORDER BY created_at DESC";

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch todos" });
    const data = results.map(formatTodo);
    res.json({ data, total: data.length });
  });
});

/* ==============================
   GET SINGLE TODO
================================ */
router.get("/:id", verifyToken, (req, res) => {
  db.query(
    `${TODO_SELECT} WHERE id = ? AND user_id = ?`,
    [req.params.id, uid(req)],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Failed to fetch todo" });
      if (!results.length) return res.status(404).json({ message: "Todo not found" });
      res.json(formatTodo(results[0]));
    }
  );
});

/* ==============================
   CREATE TODO
================================ */
router.post("/create", verifyToken, (req, res) => {
  const { title, description = "", priority = "Medium", due_date = null } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: "Title is required" });
  }

  db.query(
    "INSERT INTO todos (user_id, title, description, priority, due_date) VALUES (?, ?, ?, ?, ?)",
    [uid(req), title.trim(), description, priority, due_date || null],
    (err) => {
      if (err) return res.status(500).json({ message: "Failed to create todo" });
      res.status(201).json({ message: "Todo created successfully" });
    }
  );
});

/* ==============================
   UPDATE TODO
================================ */
router.put("/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const { title, description, priority, due_date, completed } = req.body;

  if (title !== undefined && !title.trim()) {
    return res.status(400).json({ message: "Title cannot be empty" });
  }

  db.query(
    `${TODO_SELECT} WHERE id = ? AND user_id = ?`,
    [id, uid(req)],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Failed to fetch todo" });
      if (!results.length) return res.status(404).json({ message: "Todo not found" });

      const cur = results[0];
      const updated = {
        title:       title       !== undefined ? title.trim()       : cur.title,
        description: description !== undefined ? description        : cur.description,
        priority:    priority    !== undefined ? priority           : cur.priority,
        due_date:    due_date    !== undefined ? (due_date || null) : cur.due_date,
        completed:   completed   !== undefined ? (completed ? 1:0) : cur.completed,
      };

      db.query(
        "UPDATE todos SET title=?, description=?, priority=?, due_date=?, completed=? WHERE id=? AND user_id=?",
        [updated.title, updated.description, updated.priority, updated.due_date, updated.completed, id, uid(req)],
        (err2, result) => {
          if (err2) return res.status(500).json({ message: "Failed to update todo" });
          if (result.affectedRows === 0) return res.status(404).json({ message: "Todo not found" });
          res.json({ message: "Todo updated successfully" });
        }
      );
    }
  );
});

/* ==============================
   DELETE TODO
================================ */
router.delete("/:id", verifyToken, (req, res) => {
  db.query(
    "DELETE FROM todos WHERE id = ? AND user_id = ?",
    [req.params.id, uid(req)],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Failed to delete todo" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Todo not found" });
      res.json({ message: "Todo deleted successfully" });
    }
  );
});

module.exports = router;
