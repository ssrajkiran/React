const router = require("express").Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const nodemailer = require("nodemailer");

// ================= Shared: Create Transporter =================
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === "true",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });
}

// ================= Shared: HTML Email Builder =================
function buildEmailHtml({ recipientName, title, statusLabel, statusColor, statusBg, rows, footerNote }) {
  const rowsHtml = rows.map(({ label, value }) => `
    <tr>
      <td style="color:#6b7280;padding:6px 0;width:40%;font-size:14px;font-family:Arial,sans-serif;">${label}</td>
      <td style="font-weight:500;padding:6px 0;font-size:14px;font-family:Arial,sans-serif;color:#111827;">${value}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="background:#185FA5;padding:28px 32px 24px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;color:#ffffff;font-family:Arial,sans-serif;text-align:center;line-height:36px;margin-right:10px;">ERP</div>
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:13px;color:rgba(255,255,255,0.75);font-family:Arial,sans-serif;">ERP Management System</span>
                </td>
              </tr>
            </table>
            <h1 style="margin:12px 0 0;font-size:22px;font-weight:500;color:#ffffff;font-family:Arial,sans-serif;">${title}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">

            <p style="margin:0 0 20px;font-size:15px;color:#111827;line-height:1.7;font-family:Arial,sans-serif;">
              Hi <strong style="font-weight:500;">${recipientName}</strong>, ${footerNote || "your account has been set up and is ready to use."}
            </p>

            <!-- Info card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
              <tr><td>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${rowsHtml}
                  <tr>
                    <td style="color:#6b7280;padding:6px 0;width:40%;font-size:14px;font-family:Arial,sans-serif;">Status</td>
                    <td style="padding:6px 0;">
                      <span style="background:${statusBg};color:${statusColor};font-size:12px;font-weight:500;padding:3px 12px;border-radius:999px;font-family:Arial,sans-serif;">${statusLabel}</span>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <p style="font-size:14px;color:#6b7280;margin:0 0 20px;line-height:1.7;font-family:Arial,sans-serif;">
              If you have any questions, please reach out to your administrator.
            </p>

            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:4px;">
              <tr>
                <td style="font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;">This is an automated message — do not reply.</td>
                <td align="right" style="font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;">Sent via erp.notification</td>
              </tr>
            </table>

          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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

/* ==============================
   LOGIN
================================ */
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

/* ==============================
   REGISTER (+ Welcome Email)
================================ */
router.post("/register", (req, res) => {
  const { name, email, password, role } = req.body;
  const hash = bcrypt.hashSync(password, 10);

  db.query(
    "INSERT INTO users(name,email,password,plain_password,role) VALUES(?,?,?,?,?)",
    [name, email, hash, password, role],
    async (err) => {
      if (err) return res.status(500).json({ message: "User already exists" });

      // Send welcome email (non-blocking — won't fail registration if mail errors)
      try {
        await createTransporter().sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Welcome to ERP — Your account is ready",
          html: buildEmailHtml({
            recipientName: name,
            title: "Welcome aboard!",
            statusLabel: "Active",
            statusColor: "#065f46",
            statusBg: "#d1fae5",
            footerNote: "your account has been created successfully. Here are your login credentials — please keep them safe.",
            rows: [
              { label: "Full Name", value: name },
              { label: "Email",     value: email },
              { label: "Password",  value: password },
              { label: "Role",      value: role || "employee" },
            ],
          }),
        });
        console.log(`✅ Welcome email sent to ${email}`);
      } catch (mailErr) {
        console.error("❌ Failed to send welcome email:", mailErr.message);
      }

      res.json({ message: "Registered successfully" });
    }
  );
});

/* ==============================
   GET ALL USERS (ADMIN)
================================ */
router.get("/users", verifyToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }

  db.query(
    "SELECT id, name, email, role FROM users",
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database query failed" });
      }

      res.json(result);
    }
  );
});

/* ==============================
   CHANGE PASSWORD
================================ */
router.put("/change-password", verifyToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ message: "New password must be different" });
  }

  db.query(
    "SELECT password FROM users WHERE id=?",
    [req.user.id],
    (err, result) => {
      if (err) return res.sendStatus(500);
      if (!result.length) return res.sendStatus(404);

      const valid = bcrypt.compareSync(currentPassword, result[0].password);

      if (!valid) {
        return res.status(400).json({ message: "Wrong current password" });
      }

      const hash = bcrypt.hashSync(newPassword, 10);

      db.query(
        "UPDATE users SET password=?, plain_password=? WHERE id=?",
        [hash, newPassword, req.user.id],
        (err2, result2) => {
          if (err2) return res.sendStatus(500);

          if (result2.affectedRows === 0) {
            return res.status(400).json({ message: "Password not updated" });
          }

          res.json({ message: "Password updated successfully" });
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
    return res.status(400).json({ message: "No fields to update" });
  }

  params.push(userId);

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
