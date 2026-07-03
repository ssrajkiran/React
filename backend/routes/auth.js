const router = require("express").Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
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
   ROLE CHECK (ADMIN)
================================ */
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }
  next();
};

/* ==============================
   PROFILE
================================ */
router.get("/profile", verifyToken, (req, res) => {
  db.query(
    "SELECT id,name,email,role FROM users WHERE id=?",
    [req.user.id],
    (err, result) => {
      if (err) return res.sendStatus(500);
      if (!result.length) return res.sendStatus(404);
      res.json(result[0]);
    }
  );
});

router.put("/profile", verifyToken, (req, res) => {
  const { name, email } = req.body;

  db.query(
    "UPDATE users SET name=?, email=? WHERE id=?",
    [name, email, req.user.id],
    (err) => {
      if (err) return res.sendStatus(500);
      res.json({ message: "Profile updated successfully" });
    }
  );
});

/* ==============================
   DELETE USER
================================ */
router.delete("/:id", verifyToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }

  db.query(
    "DELETE FROM users WHERE id=?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Delete failed" });

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    }
  );
});

/* ==============================
   CHANGE PASSWORD
================================ */

/* ==============================
   EMPLOYEE PROJECTS
================================ */
router.get("/employee/projects", verifyToken, (req, res) => {
  const sql = `
    SELECT DISTINCT p.id, p.project_name
    FROM task t
    JOIN projects p ON p.id = t.project_id
    WHERE FIND_IN_SET(?, t.assigned_to)
    ORDER BY p.project_name ASC
  `;

  db.query(sql, [req.user.id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Failed to fetch projects" });
    }

    res.json({ success: true, data: result });
  });
});

/* ==============================
   EMPLOYEE TASKS
================================ */
router.get("/employee/tasks/:projectId", verifyToken, (req, res) => {
  const sql = `
    SELECT id, task
    FROM task
    WHERE project_id = ?
    AND FIND_IN_SET(?, assigned_to)
    ORDER BY task ASC
  `;

  db.query(sql, [req.params.projectId, req.user.id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Failed to fetch tasks" });
    }

    res.json({ success: true, data: result });
  });
});

/* ==============================
   ADMIN TIMESHEETS
================================ */
router.get("/admin", verifyToken, isAdmin, (req, res) => {
  const sql = `
    SELECT 
      ts.id,
      ts.task AS task_id,
      ts.date,
      ts.man_hrs,
      t.task AS task_name,
      p.project_name,
      u.name AS created_by_name
    FROM timesheet ts
    LEFT JOIN task t ON ts.task = t.id
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON ts.created_by = u.id
    ORDER BY ts.date DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "DB error" });
    }

    res.json({ success: true, data: result });
  });
});

/* ==============================
   EMPLOYEE TIMESHEETS
================================ */
router.get("/employee", verifyToken, (req, res) => {
  const sql = `
    SELECT 
      ts.id,
      ts.task,
      ts.date,
      ts.man_hrs,
      p.project_name
    FROM timesheet ts
    LEFT JOIN task t ON ts.task = t.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE FIND_IN_SET(?, t.assigned_to)
    ORDER BY ts.date DESC
  `;

  db.query(sql, [req.user.id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "DB error" });
    }

    res.json({ success: true, data: result });
  });
});

/* ==============================
   CREATE TIMESHEET
================================ */
router.post("/", verifyToken, (req, res) => {
  const { task, date, man_hrs } = req.body;
  const userId = req.user.id;

  if (!task || !date || !man_hrs) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const hours = Number(man_hrs);

  const checkSql = `
    SELECT SUM(man_hrs) AS total
    FROM timesheet
    WHERE date=? AND created_by=?
  `;

  db.query(checkSql, [date, userId], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error" });

    const total = result[0].total || 0;

    if (total + hours > 8) {
      return res.status(400).json({
        message: `Daily limit exceeded. Already ${total} hrs logged.`,
      });
    }

    const insertSql =
      "INSERT INTO timesheet (task,date,man_hrs,created_by) VALUES (?,?,?,?)";

    db.query(insertSql, [task, date, hours, userId], (err, result) => {
      if (err) return res.status(500).json({ message: "Insert failed" });

      res.json({
        success: true,
        message: "Timesheet added",
        id: result.insertId,
      });
    });
  });
});

/* ============================== */

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email=?", [email], (err, result) => {
    if (err) return res.sendStatus(500);
    if (!result.length) return res.sendStatus(401);

    const valid = bcrypt.compareSync(password, result[0].password);
    if (!valid) return res.sendStatus(401);

    const token = jwt.sign(
      { id: result[0].id, role: result[0].role },
      "secret",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: result[0].role,
    });
  });
});



router.get("/users", verifyToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }

  db.query(
    "SELECT id, name, email, role FROM users",
    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Database query failed",
        });
      }

      res.json(result);
    }
  );
});
router.put("/change-password", verifyToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      message: "New password must be different",
    });
  }

  db.query(
    "SELECT password FROM users WHERE id=?",
    [req.user.id],
    (err, result) => {
      if (err) return res.sendStatus(500);
      if (!result.length) return res.sendStatus(404);

      // check old password
      const valid = bcrypt.compareSync(
        currentPassword,
        result[0].password
      );

      if (!valid) {
        return res.status(400).json({
          message: "Wrong current password",
        });
      }

      // hash new password
      const hash = bcrypt.hashSync(newPassword, 10);

      // update BOTH columns
      db.query(
        "UPDATE users SET password=?, plain_password=? WHERE id=?",
        [hash, newPassword, req.user.id],
        (err2, result2) => {
          if (err2) return res.sendStatus(500);

          if (result2.affectedRows === 0) {
            return res.status(400).json({
              message: "Password not updated",
            });
          }

          res.json({
            message: "Password updated successfully",
          });
        }
      );
    }
  );
});



/* ==============================
   UPDATE USER (ADMIN)
================================ */
router.put("/:id", verifyToken, (req, res) => {
  if (req.user.role !== "admin") {

    return res.status(403).json({ message: "Admins only" });
  }

  const userId = req.params.id;
  const { name, email, role, password } = req.body;

  const updates = [];
  const params = [];

  if (name) {
    updates.push("name=?");
    params.push(name);
  }

  if (email) {
    updates.push("email=?");
    params.push(email);
  }

  if (role) {
    updates.push("role=?");
    params.push(role);
  }

  if (password) {

    const hash = bcrypt.hashSync(password, 10);
    updates.push("password=?, plain_password=?");
    params.push(hash, password);
  }

  if (!updates.length) {

    return res.status(400).json({ message: "No fields to updates" });
  }

  params.push(userId);

  // ✅ FIXED SQL STRING
  const sql = `UPDATE users SET ${updates.join(", ")} WHERE id=?`;

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to update user" });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated successfully" });
  });
});

/* ==============================
   EXPORT
================================ */
module.exports = router;
