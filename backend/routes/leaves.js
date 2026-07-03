const router = require("express").Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

require("dotenv").config(); // must be at the very top

const nodemailer = require("nodemailer");

// ================= JWT Middleware =================
function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  // Check if header exists
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  // Extract token safely
  const parts = authHeader.split(" ");
  const token = parts.length === 2 ? parts[1] : null;

  if (!token) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  jwt.verify(token, "secret", function (err, user) {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }

    req.user = user;
    next();
  });
}

router.get("/permission-remaining", auth, (req, res) => {
  const now = new Date();
  const month = now.getMonth() + 1; // JS months are 0-indexed
  const year = now.getFullYear();

  db.query(
    `SELECT SUM(hours) as total FROM permission WHERE user_id=? AND MONTH(date)=? AND YEAR(date)=?`,
    [req.user.id, month, year],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });

      const used = result[0].total || 0;
      const remaining = Math.max(0, 2 - used); // max 2 hours per month
      res.json({ used, remaining });
    }
  );
});

// ================= FETCH ALL EMPLOYEES =================
router.get("/admin_userspanel", auth, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  const query = `
    SELECT id, name, email, role, created_at
    FROM users
    ORDER BY name ASC
  `;

  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// ================= FETCH ALL LEAVES, COMPOFF, PERMISSIONS =================
router.get("/adminpanel", auth, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  const query = `
    -- Fetch leaves
    SELECT 
      l.id,
      l.user_id,
      u.name,
      l.type,
      l.from_date AS start,
      l.to_date AS end,
      l.comp_off_date,
      l.days,
      l.half_day_type,
      l.remarks,
      l.status,
      NULL AS hours,
      NULL AS slot
    FROM leaves l
    JOIN users u ON u.id = l.user_id

    UNION ALL

    -- Fetch permissions
    SELECT
      p.id,
      p.user_id,
      u.name,
      'permission' AS type,
      p.date AS start,
      p.date AS end,
      NULL AS comp_off_date,
      NULL AS days,
      NULL AS half_day_type,
      p.remarks,
      p.status,
      p.hours,
      p.slot
    FROM permission p
    JOIN users u ON u.id = p.user_id

    ORDER BY start DESC
  `;

  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});



router.post("/", auth, async (req, res) => {
  const {
    id,
    from_date,
    to_date,
    days,
    type,
    remarks,
    comp_off_date,
    half_day_type,
    hours,
    slot,
  } = req.body;

  if (!type) return res.status(400).json({ error: "Type is required" });

  const adminEmail = "ssrajkiran01@gmail.com";

  try {
    // 1️⃣ Get user info (name & email)
    const [userRows] = await db.promise().query(
      "SELECT name, email FROM users WHERE id=?",
      [req.user.id]
    );

    if (!userRows.length) return res.status(404).json({ error: "User not found" });

    const userName = userRows[0].name || "User";

    if (type === "permission") {
      if (!from_date || !hours || !slot)
        return res.status(400).json({ error: "Missing required fields for permission" });

      const month = new Date(from_date).getMonth() + 1;
      const year = new Date(from_date).getFullYear();

      // Check existing permission on same date
      const [existing] = await db.promise().query(
        `SELECT id, status FROM permission WHERE user_id=? AND date=?`,
        [req.user.id, from_date]
      );

      let message = "";
      if (existing.length > 0) {
        if (existing[0].status === "pending") {
          await db.promise().query(
            `UPDATE permission SET hours=?, slot=?, remarks=? WHERE id=?`,
            [hours, slot, remarks || null, existing[0].id]
          );
          message = "Permission updated successfully";
        } else {
          return res.status(400).json({ error: "Cannot edit approved permission" });
        }
      } else {
        await db.promise().query(
          `INSERT INTO permission (user_id, date, hours, slot, remarks, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
          [req.user.id, from_date, hours, slot, remarks || null]
        );
        message = "Permission applied successfully";
      }

      // Send email
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: Number(process.env.EMAIL_PORT),
          secure: process.env.EMAIL_SECURE === "true",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          tls: { rejectUnauthorized: false },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: adminEmail,
          subject: `New Permission Request from ${userName}`,
          text: `User ${userName} submitted a permission request for ${from_date} (${hours} hours, slot: ${slot}). Remarks: ${remarks || "N/A"}`,
        });
        console.log("Email sent to", adminEmail);
      } catch (err) {
        console.error("Failed to send email:", err);
      }

      return res.json({ message });
    } else {
      // Leave / Comp-off
      if (!from_date || (type === "leave" && !to_date))
        return res.status(400).json({ error: "Missing required fields for leave/compoff" });

      const leaveToDate = type === "leave" ? to_date : from_date;
      const finalDays = type === "leave" && half_day_type !== "full" ? 0.5 : days;
      const compOffDateValue = type === "compoff" ? comp_off_date : null;

      const checkQuery =
        type === "leave"
          ? `SELECT id, status FROM leaves WHERE user_id=? AND type='leave' AND 
             ((from_date BETWEEN ? AND ?) OR (to_date BETWEEN ? AND ?) OR (? BETWEEN from_date AND to_date))`
          : `SELECT id, status FROM leaves WHERE user_id=? AND type='compoff' AND from_date=?`;

      const params =
        type === "leave"
          ? [req.user.id, from_date, leaveToDate, from_date, leaveToDate, from_date]
          : [req.user.id, from_date];

      const [existing] = await db.promise().query(checkQuery, params);

      let message = "";
      if (existing.length > 0) {
        if ((id && existing[0].id === id && existing[0].status === "pending") || existing[0].status === "rejected") {
          await db.promise().query(
            `UPDATE leaves SET from_date=?, to_date=?, days=?, remarks=?, half_day_type=?, comp_off_date=?, status="pending" WHERE id=?`,
            [from_date, leaveToDate, finalDays, remarks || null, type === "leave" ? half_day_type : null, compOffDateValue, id]
          );
          message = `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`;
        } else {
          return res.status(400).json({ error: `${type.charAt(0).toUpperCase() + type.slice(1)} already exists for selected date(s)` });
        }
      } else {
        await db.promise().query(
          `INSERT INTO leaves (user_id, from_date, to_date, days, type, remarks, half_day_type, status, created_at, comp_off_date) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), ?)`,
          [req.user.id, from_date, leaveToDate, finalDays, type, remarks || null, type === "leave" ? half_day_type : null, compOffDateValue]
        );
        message = `${type.charAt(0).toUpperCase() + type.slice(1)} applied successfully`;
      }

      // Send email to admin
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: Number(process.env.EMAIL_PORT),
          secure: process.env.EMAIL_SECURE === "true",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          tls: { rejectUnauthorized: false },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: adminEmail,
          subject: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Request from ${userName}`,
          text: `User ${userName} submitted a ${type} request from ${from_date} to ${leaveToDate}. Remarks: ${remarks || "N/A"}`,
        });
        console.log("Email sent to", adminEmail);
      } catch (err) {
        console.error("Failed to send email:", err);
      }

      return res.json({ message });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= Admin: Get all leaves + permissions =================
router.get("/alladmin", auth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });

  // Fetch all leaves
  const leavesQuery = `
    SELECT 
      l.id,
      l.user_id,
      u.name,
      l.from_date AS start,
      l.to_date AS end,
      l.days,
      l.type,
      l.half_day_type,
      l.remarks,
      l.status
    FROM leaves l
    JOIN users u ON l.user_id = u.id
    ORDER BY l.id DESC
  `;

  // Fetch all permissions
  const permissionsQuery = `
    SELECT
      p.id,
      p.user_id,
      u.name,
      p.date AS start,
      p.hours,
      p.slot,
      p.remarks,
      p.status,
      'permission' AS type
    FROM permission p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.id DESC
  `;

  db.query(leavesQuery, (err, leaves) => {
    if (err) return res.status(500).json({ error: err });

    db.query(permissionsQuery, (err, permissions) => {
      if (err) return res.status(500).json({ error: err });

      // Normalize permissions end date
      const permissionEvents = permissions.map(p => ({
        ...p,
        end: p.start, // permissions are single-day
      }));

      const allRequests = [...leaves, ...permissionEvents];

      res.json(allRequests);
    });
  });
});

// ================= Admin: Get all users =================
router.get("/users", auth, (req, res) => {
  // Only admin can fetch all employees
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }

  const query = `
    SELECT 
      id,
      name,
      email,
      role,
      created_at
    FROM users
    ORDER BY name ASC
  `;

  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// ================= Employee Own Leaves + Permissions =================
router.get("/my", auth, (req, res) => {
  const leavesQuery = `
    SELECT
      id,
      user_id,
      DATE_FORMAT(from_date,'%Y-%m-%d') as from_date,
      DATE_FORMAT(to_date,'%Y-%m-%d') as to_date,
      DATE_FORMAT(comp_off_date,'%Y-%m-%d') as comp_off_date,
      days,
      type,
      half_day_type,
      remarks,
      status
    FROM leaves
    WHERE user_id=?
    ORDER BY id DESC
  `;

  const permissionsQuery = `
    SELECT
      id,
      user_id,
      DATE_FORMAT(date,'%Y-%m-%d') as date,
      hours,
      slot,
      remarks,
      status
    FROM permission
    WHERE user_id=?
    ORDER BY id DESC
  `;

  db.query(leavesQuery, [req.user.id], (err, leaves) => {
    if (err) return res.status(500).json({ error: err });

    db.query(permissionsQuery, [req.user.id], (err, permissions) => {
      if (err) return res.status(500).json({ error: err });

      const events = [
        ...leaves.map(l => ({
          id: l.id,
          title:
            l.type === "leave"
              ? `LEAVE - ${l.status.toUpperCase()}`
              : l.type === "compoff"
                ? `COMP OFF - ${l.status.toUpperCase()}`
                : `UNKNOWN - ${l.status.toUpperCase()}`,
          start: new Date(l.from_date),
          end: new Date(new Date(l.to_date).setHours(23, 59, 59, 999)),
          days: l.days,
          type: l.type,
          half_day_type: l.half_day_type,
          remarks: l.remarks,
          comp_off_date: l.comp_off_date,
          status: l.status,
        })),
        ...permissions.map(p => ({
          id: p.id,
          title: `PERMISSION - ${p.status.toUpperCase()}`,
          start: new Date(p.date),
          end: new Date(p.date),
          type: "permission",
          hours: p.hours,
          slot: p.slot,
          remarks: p.remarks,
          status: p.status,
        })),
      ];

      res.json(events);
    });
  });
});

// DELETE leave or permission
router.delete("/delete/:id", auth, (req, res) => {
  const { id } = req.params;
  const type = req.query.type || "leave"; // default to leave

  const table = type === "permission" ? "permission" : "leaves";
  const idField = "id";

  db.query(`SELECT user_id, status FROM ${table} WHERE ${idField}=?`, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0) return res.status(404).json({ error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found` });

    const entry = result[0];

    if (entry.user_id !== req.user.id) {
      return res.status(403).json({ error: `You can only delete your own ${type}` });
    }

    if (entry.status !== "pending") {
      return res.status(400).json({ error: `Only pending ${type} can be deleted` });
    }

    db.query(`DELETE FROM ${table} WHERE ${idField}=?`, [id], (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully` });
    });
  });
});



// ================= Admin: Approve / Reject Leave =================
// router.put("/leave/:id", auth, (req, res) => {
//   if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
//   const { status } = req.body;
//   if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "Invalid status" });

//   db.query("UPDATE leaves SET status=? WHERE id=?", [status, req.params.id], (err, result) => {
//     if (err) return res.status(500).json({ error: err });
//     if (result.affectedRows === 0) return res.status(404).json({ error: "Leave not found" });
//     res.json({ message: "Leave status updated", status });
//   });
// });

router.put("/leave/:id", auth, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Admin only" });

  const { status } = req.body;
  if (!["approved", "rejected"].includes(status))
    return res.status(400).json({ error: "Invalid status" });

  try {
    // 1️⃣ Get the leave request along with the user's email
    const [leaves] = await db.promise().query(
      `SELECT leaves.*, users.email AS user_email, users.name AS user_name
       FROM leaves
       JOIN users ON leaves.user_id = users.id
       WHERE leaves.id=?`,
      [req.params.id]
    );

    if (!leaves.length) return res.status(404).json({ error: "Leave not found" });

    const leave = leaves[0];
    const userEmail = leave.user_email; // this comes from JOIN
    const userName = leave.user_name || "User";

    if (!userEmail) {
      console.warn("No email found for leave request ID:", req.params.id);
      return res.status(400).json({ error: "User has no email configured" });
    }

    // 2️⃣ Update leave status
    const [result] = await db.promise().query(
      "UPDATE leaves SET status=? WHERE id=?",
      [status, req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Leave not found" });

    // 3️⃣ Send email using Zoho SMTP
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS, // Zoho app password
        },
        tls: {
          rejectUnauthorized: false, // for local/testing
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `Leave Request ${status.toUpperCase()}`,
        text: `Hello ${userName},\n\nYour leave request has been ${status}.`,
      };

      await transporter.sendMail(mailOptions);
      console.log("Email sent to", userEmail);
    } catch (mailErr) {
      console.error("Failed to send email:", mailErr);
    }

    // 4️⃣ Respond to client
    res.json({ message: "Leave status updated", status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// ================= Admin: Approve / Reject Permission =================
router.put("/permission/:id", auth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "Invalid status" });

  db.query("UPDATE permission SET status=? WHERE id=?", [status, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Permission not found" });
    res.json({ message: "Permission status updated", status });
  });
});



module.exports = router;
