const router = require("express").Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const nodemailer = require("nodemailer");

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
                  <div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;color:#ffffff;font-family:Arial,sans-serif;text-align:center;line-height:36px;margin-right:10px;">LM</div>
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:13px;color:rgba(255,255,255,0.75);font-family:Arial,sans-serif;">Leave Management System</span>
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
              Hi <strong style="font-weight:500;">${recipientName}</strong>, ${footerNote ? "here's an update on your recent request." : "your request has been submitted and is awaiting admin review."}
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
              If you have any questions, please reach out to us.
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

// ================= JWT Middleware =================
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const parts = authHeader.split(" ");
  const token = parts.length === 2 ? parts[1] : null;
  if (!token) return res.status(401).json({ error: "Invalid token format" });

  jwt.verify(token, "secret", function (err, user) {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// ================= Admin: Employee Leave Summary =================
router.get("/employee-summary", auth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  try {
    const [rows] = await db.promise().query(`
    SELECT
  u.id, u.name, u.email,

  -- Leaves used (approved, type='leave')
  COALESCE((SELECT SUM(l.days) FROM leaves l
    WHERE l.user_id = u.id AND l.status = 'approved'
    AND l.type = 'leave'), 0) AS leaves_used,

  -- Comp-off used
  COALESCE((SELECT COUNT(*) FROM leaves l
    WHERE l.user_id = u.id AND l.status = 'approved'
    AND l.type = 'compoff'), 0) AS compoff_used,

  -- Permission: total hours used
  COALESCE((SELECT SUM(p.hours) FROM permission p
    WHERE p.user_id = u.id AND p.status = 'approved'), 0)
    AS permission_used,

  -- Present on holiday (comp-off earned)
  COALESCE((SELECT COUNT(*) FROM present_on_holiday ph
    WHERE ph.user_id = u.id AND ph.status = 'approved'), 0)
    AS present_on_holiday,

  -- Pending counts
  COALESCE((SELECT COUNT(*) FROM leaves l
    WHERE l.user_id = u.id AND l.status = 'pending'
    AND l.type = 'leave'), 0) AS leaves_pending,
  COALESCE((SELECT COUNT(*) FROM leaves l
    WHERE l.user_id = u.id AND l.status = 'pending'
    AND l.type = 'compoff'), 0) AS compoff_pending,
  COALESCE((SELECT COUNT(*) FROM permission p
    WHERE p.user_id = u.id AND p.status = 'pending'), 0)
    AS permission_pending,
  COALESCE((SELECT COUNT(*) FROM present_on_holiday ph
    WHERE ph.user_id = u.id AND ph.status = 'pending'), 0)
    AS present_pending,

  -- Total pending
  COALESCE((SELECT COUNT(*) FROM leaves l
    WHERE l.user_id = u.id AND l.status = 'pending'), 0) +
  COALESCE((SELECT COUNT(*) FROM permission p
    WHERE p.user_id = u.id AND p.status = 'pending'), 0) +
  COALESCE((SELECT COUNT(*) FROM present_on_holiday ph
    WHERE ph.user_id = u.id AND ph.status = 'pending'), 0)
    AS total_pending,

  -- ✅ FIXED: Months elapsed since April of current FY
  
ROUND(
    GREATEST(
      (YEAR(CURDATE()) - CASE
        WHEN MONTH(CURDATE()) >= 4 THEN YEAR(CURDATE())
        ELSE YEAR(CURDATE()) - 1
      END) * 12
      + MONTH(CURDATE()) - 4
      + CASE WHEN MONTH(CURDATE()) >= 4 THEN 0 ELSE 12 END
      + 1,
    0) * 2.5,
  1) AS leave_accrued,


  -- ✅ FIXED: Permission allocated = 2 hrs × months elapsed in FY
  
ROUND(
    GREATEST(
      (YEAR(CURDATE()) - CASE
        WHEN MONTH(CURDATE()) >= 4 THEN YEAR(CURDATE())
        ELSE YEAR(CURDATE()) - 1
      END) * 12
      + MONTH(CURDATE()) - 4
      + CASE WHEN MONTH(CURDATE()) >= 4 THEN 0 ELSE 12 END
      + 1,
    0) * 2,
  1) AS permission_allocated,


  -- ✅ FIXED: Leave balance uses same corrected accrual
  
ROUND(
    GREATEST(
      (YEAR(CURDATE()) - CASE
        WHEN MONTH(CURDATE()) >= 4 THEN YEAR(CURDATE())
        ELSE YEAR(CURDATE()) - 1
      END) * 12
      + MONTH(CURDATE()) - 4
      + CASE WHEN MONTH(CURDATE()) >= 4 THEN 0 ELSE 12 END
      + 1,
    0) * 2.5
    + COALESCE((SELECT COUNT(*) FROM present_on_holiday ph
        WHERE ph.user_id = u.id AND ph.status = 'approved'), 0)
    - COALESCE((SELECT SUM(l.days) FROM leaves l
        WHERE l.user_id = u.id AND l.status = 'approved'
        AND l.type = 'leave'), 0)
    - COALESCE((SELECT COUNT(*) FROM leaves l
        WHERE l.user_id = u.id AND l.status = 'approved'
        AND l.type = 'compoff'), 0),
  1) AS leave_balance


FROM users u
WHERE u.role = 'employee'
ORDER BY u.name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("employee-summary error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// ================= Permission Remaining =================
router.get("/permission-remaining", auth, (req, res) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  db.query(
    `SELECT SUM(hours) as total FROM permission WHERE user_id=? AND MONTH(date)=? AND YEAR(date)=?`,
    [req.user.id, month, year],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      const used = result[0].total || 0;
      const remaining = Math.max(0, 2 - used);
      res.json({ used, remaining });
    }
  );
});

// ================= FETCH ALL EMPLOYEES =================
router.get("/admin_userspanel", auth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  const query = `SELECT id, name, email, role, created_at FROM users ORDER BY name ASC`;
  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// ================= FETCH ALL HOLIDAYS =================
router.get("/holidays", auth, async (req, res) => {
  try {
    const [result] = await db.promise().query(
      `SELECT id, name, DATE_FORMAT(date, '%Y-%m-%d') AS date FROM holidays ORDER BY date ASC`
    );
    res.json(result);
  } catch (err) {
    console.warn("holidays query failed:", err.message);
    res.json([]);
  }
});

// ================= FETCH ELIGIBLE COMP-OFF DATES =================
router.get("/compoff-eligible", auth, (req, res) => {
  const user_id = req.query.user_id || req.user.id;
  if (req.user.role !== "admin" && String(user_id) !== String(req.user.id)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const query = `
    SELECT p.id AS present_id, DATE_FORMAT(p.date, '%Y-%m-%d') AS date_str, p.holiday_name
    FROM present_on_holiday p
    WHERE p.user_id = ? AND p.status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM leaves l
        WHERE l.user_id = p.user_id AND l.type = 'compoff'
          AND DATE(l.comp_off_date) = DATE(p.date)
          AND l.status IN ('approved', 'pending')
      )
    ORDER BY p.date DESC
  `;
  db.query(query, [user_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// ================= FETCH ALL LEAVES, COMPOFF, PERMISSIONS, PRESENT (admin calendar) =================
router.get("/adminpanel", auth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  try {
    const leavesQuery = `
      SELECT l.id, l.user_id, u.name, l.type,
        DATE_FORMAT(l.from_date, '%Y-%m-%d') AS start, DATE_FORMAT(l.to_date, '%Y-%m-%d') AS end,
        l.comp_off_date, l.days, l.half_day_type, l.remarks, l.status,
        NULL AS hours, NULL AS slot, NULL AS holiday_name
      FROM leaves l JOIN users u ON u.id = l.user_id
    `;
    const permQuery = `
      SELECT p.id, p.user_id, u.name, 'permission' AS type,
        DATE_FORMAT(p.date, '%Y-%m-%d') AS start, DATE_FORMAT(p.date, '%Y-%m-%d') AS end,
        NULL AS comp_off_date, NULL AS days, NULL AS half_day_type,
        p.remarks, p.status, p.hours, p.slot, NULL AS holiday_name
      FROM permission p JOIN users u ON u.id = p.user_id
    `;
    const presentQuery = `
      SELECT ph.id, ph.user_id, u.name, 'present' AS type,
        DATE_FORMAT(ph.date, '%Y-%m-%d') AS start, DATE_FORMAT(ph.date, '%Y-%m-%d') AS end,
        NULL AS comp_off_date, NULL AS days, NULL AS half_day_type,
        ph.remarks, ph.status, NULL AS hours, NULL AS slot, ph.holiday_name
      FROM present_on_holiday ph JOIN users u ON u.id = ph.user_id
    `;
    const [leaves]      = await db.promise().query(leavesQuery);
    const [permissions] = await db.promise().query(permQuery);
    let presents = [];
    try { [presents] = await db.promise().query(presentQuery); } catch (e) { console.warn(e.message); }
    const all = [...leaves, ...permissions, ...presents].sort((a, b) => (a.start < b.start ? 1 : -1));
    res.json(all);
  } catch (err) {
    console.error("adminpanel error:", err);
    res.status(500).json({ error: err.message, code: err.code || null });
  }
});

// ================= Admin: Apply leave/compoff/permission/present on behalf =================
router.post("/admin", auth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });

  const { user_id, from_date, to_date, days, type, remarks, comp_off_date, half_day_type, hours, slot } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id is required" });
  if (!type)    return res.status(400).json({ error: "type is required" });

  try {
    const [userRows] = await db.promise().query("SELECT id, name, email FROM users WHERE id = ?", [user_id]);
    if (!userRows.length) return res.status(404).json({ error: "User not found" });
    const targetUser = userRows[0];

    if (type === "permission") {
      if (!from_date || !hours || !slot)
        return res.status(400).json({ error: "Missing required fields for permission" });
      await db.promise().query(
        `INSERT INTO permission (user_id, date, hours, slot, remarks, status, created_at) VALUES (?, ?, ?, ?, ?, 'approved', NOW())`,
        [user_id, from_date, hours, slot, remarks || null]
      );
      return res.json({ message: `Permission applied successfully for ${targetUser.name}` });
    }

    if (type === "present") {
      if (!from_date) return res.status(400).json({ error: "from_date is required for present" });
      let holiday_name = req.body.holiday_name || null;
      if (!holiday_name) {
        const [hRows] = await db.promise().query(`SELECT name FROM holidays WHERE DATE(date) = DATE(?) LIMIT 1`, [from_date]);
        if (hRows.length) holiday_name = hRows[0].name;
      }
      const [existing] = await db.promise().query(
        `SELECT id FROM present_on_holiday WHERE user_id = ? AND DATE(date) = DATE(?)`, [user_id, from_date]
      );
      if (existing.length) return res.status(400).json({ error: "Employee is already marked present for this holiday" });
      await db.promise().query(
        `INSERT INTO present_on_holiday (user_id, date, holiday_name, remarks, status, created_at) VALUES (?, ?, ?, ?, 'approved', NOW())`,
        [user_id, from_date, holiday_name, remarks || null]
      );
      return res.json({ message: `Marked present on holiday for ${targetUser.name}` });
    }

    if (!from_date) return res.status(400).json({ error: "from_date is required" });
    if (type === "leave" && !to_date) return res.status(400).json({ error: "to_date is required for leave" });

    const leaveToDate      = type === "leave" ? to_date : from_date;
    const finalDays        = type === "leave" && half_day_type !== "full" ? 0.5 : (days || 1);
    const compOffDateValue = type === "compoff" ? comp_off_date : null;

    await db.promise().query(
      `INSERT INTO leaves (user_id, from_date, to_date, days, type, remarks, half_day_type, status, created_at, comp_off_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', NOW(), ?)`,
      [user_id, from_date, leaveToDate, finalDays, type, remarks || null, type === "leave" ? (half_day_type || "full") : null, compOffDateValue]
    );
    return res.json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} applied successfully for ${targetUser.name}` });

  } catch (err) {
    console.error("Admin apply leave error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= Employee: Apply Leave / Permission (own) =================
router.post("/", auth, async (req, res) => {
  const { id, from_date, to_date, days, type, remarks, comp_off_date, half_day_type, hours, slot } = req.body;
  if (!type) return res.status(400).json({ error: "Type is required" });

  const adminEmail = "ssrajkiran01@gmail.com";

  try {
    const [userRows] = await db.promise().query("SELECT name, email FROM users WHERE id=?", [req.user.id]);
    if (!userRows.length) return res.status(404).json({ error: "User not found" });
    const userName = userRows[0].name || "User";

    // ── PERMISSION ──
    if (type === "permission") {
      if (!from_date || !hours || !slot)
        return res.status(400).json({ error: "Missing required fields for permission" });

      const [existing] = await db.promise().query(
        `SELECT id, status FROM permission WHERE user_id=? AND date=?`, [req.user.id, from_date]
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

      try {
        await createTransporter().sendMail({
          from: process.env.EMAIL_USER,
          to: adminEmail,
          subject: `New Permission Request from ${userName}`,
          html: buildEmailHtml({
            recipientName: "Admin",
            title: `New permission request from ${userName}`,
            statusLabel: "Pending",
            statusColor: "#92400e",
            statusBg: "#fef3c7",
            rows: [
              { label: "Employee",   value: userName },
              { label: "Date",       value: from_date },
              { label: "Hours",      value: `${hours} hrs` },
              { label: "Slot",       value: slot },
              { label: "Remarks",    value: remarks || "N/A" },
            ],
          }),
        });
      } catch (err) { console.error("Failed to send email:", err); }

      return res.json({ message });
    }

    // ── PRESENT ON HOLIDAY ──
    if (type === "present") {
      if (!from_date) return res.status(400).json({ error: "Holiday date is required" });

      let holiday_name = req.body.holiday_name || null;
      if (!holiday_name) {
        const [hRows] = await db.promise().query(
          `SELECT name FROM holidays WHERE DATE(date) = DATE(?) LIMIT 1`, [from_date]
        );
        if (hRows.length) holiday_name = hRows[0].name;
      }

      const [existing] = await db.promise().query(
        `SELECT id, status FROM present_on_holiday WHERE user_id=? AND DATE(date) = DATE(?)`,
        [req.user.id, from_date]
      );
      if (existing.length) return res.status(400).json({ error: "You have already applied for this holiday" });

      await db.promise().query(
        `INSERT INTO present_on_holiday (user_id, date, holiday_name, remarks, status, created_at) VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [req.user.id, from_date, holiday_name, remarks || null]
      );

      try {
        await createTransporter().sendMail({
          from: process.env.EMAIL_USER,
          to: adminEmail,
          subject: `New Present-on-Holiday Request from ${userName}`,
          html: buildEmailHtml({
            recipientName: "Admin",
            title: `Present on holiday request from ${userName}`,
            statusLabel: "Pending",
            statusColor: "#92400e",
            statusBg: "#fef3c7",
            rows: [
              { label: "Employee",     value: userName },
              { label: "Holiday",      value: holiday_name || "N/A" },
              { label: "Date",         value: from_date },
              { label: "Remarks",      value: remarks || "N/A" },
            ],
          }),
        });
      } catch (err) { console.error("Failed to send email:", err); }

      return res.json({ message: "Present on holiday applied successfully" });
    }

    // ── LEAVE / COMP-OFF ──
    if (!from_date || (type === "leave" && !to_date))
      return res.status(400).json({ error: "Missing required fields for leave/compoff" });

    const leaveToDate      = type === "leave" ? to_date : from_date;
    const finalDays        = type === "leave" && half_day_type !== "full" ? 0.5 : days;
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
          `UPDATE leaves SET from_date=?, to_date=?, days=?, remarks=?, half_day_type=?, comp_off_date=?, status='pending' WHERE id=?`,
          [from_date, leaveToDate, finalDays, remarks || null, type === "leave" ? half_day_type : null, compOffDateValue, id]
        );
        message = `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`;
      } else {
        return res.status(400).json({ error: `${type.charAt(0).toUpperCase() + type.slice(1)} already exists for selected date(s)` });
      }
    } else {
      await db.promise().query(
        `INSERT INTO leaves (user_id, from_date, to_date, days, type, remarks, half_day_type, status, created_at, comp_off_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), ?)`,
        [req.user.id, from_date, leaveToDate, finalDays, type, remarks || null, type === "leave" ? half_day_type : null, compOffDateValue]
      );
      message = `${type.charAt(0).toUpperCase() + type.slice(1)} applied successfully`;
    }

    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    try {
      await createTransporter().sendMail({
        from: process.env.EMAIL_USER,
        to: adminEmail,
        subject: `New ${typeLabel} Request from ${userName}`,
        html: buildEmailHtml({
          recipientName: "Admin",
          title: `New ${typeLabel.toLowerCase()} request from ${userName}`,
          statusLabel: "Pending",
          statusColor: "#92400e",
          statusBg: "#fef3c7",
          rows: [
            { label: "Employee",  value: userName },
            { label: "Type",      value: typeLabel },
            { label: "From",      value: from_date },
            { label: "To",        value: leaveToDate },
            ...(type === "leave" ? [{ label: "Duration", value: `${finalDays} day(s)` }] : []),
            ...(type === "compoff" ? [{ label: "Comp-off for", value: comp_off_date || "N/A" }] : []),
            { label: "Remarks",   value: remarks || "N/A" },
          ],
        }),
      });
    } catch (err) { console.error("Failed to send email:", err); }

    return res.json({ message });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= Admin: Get all leaves + permissions =================
router.get("/alladmin", auth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });

  const leavesQuery = `
    SELECT l.id, l.user_id, u.name, l.from_date AS start, l.to_date AS end,
      l.days, l.type, l.half_day_type, l.remarks, l.status
    FROM leaves l JOIN users u ON l.user_id = u.id ORDER BY l.id DESC
  `;
  const permissionsQuery = `
    SELECT p.id, p.user_id, u.name, p.date AS start, p.hours, p.slot,
      p.remarks, p.status, 'permission' AS type
    FROM permission p JOIN users u ON p.user_id = u.id ORDER BY p.id DESC
  `;

  db.query(leavesQuery, (err, leaves) => {
    if (err) return res.status(500).json({ error: err });
    db.query(permissionsQuery, (err, permissions) => {
      if (err) return res.status(500).json({ error: err });
      res.json([...leaves, ...permissions.map(p => ({ ...p, end: p.start }))]);
    });
  });
});

// ================= Admin: Get all users =================
router.get("/users", auth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
  db.query(`SELECT id, name, email, role, created_at FROM users ORDER BY name ASC`, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// ================= Employee: Own Leaves + Permissions =================
router.get("/my", auth, (req, res) => {
  const leavesQuery = `
    SELECT id, user_id,
      DATE_FORMAT(from_date,'%Y-%m-%d') as from_date, DATE_FORMAT(to_date,'%Y-%m-%d') as to_date,
      DATE_FORMAT(comp_off_date,'%Y-%m-%d') as comp_off_date,
      days, type, half_day_type, remarks, status
    FROM leaves WHERE user_id=? ORDER BY id DESC
  `;
  const permissionsQuery = `
    SELECT id, user_id, DATE_FORMAT(date,'%Y-%m-%d') as date, hours, slot, remarks, status
    FROM permission WHERE user_id=? ORDER BY id DESC
  `;
  const presentQuery = `
    SELECT id, user_id, DATE_FORMAT(date,'%Y-%m-%d') as date, holiday_name, remarks, status
    FROM present_on_holiday WHERE user_id=? ORDER BY id DESC
  `;

  db.query(leavesQuery, [req.user.id], (err, leaves) => {
    if (err) return res.status(500).json({ error: err });
    db.query(permissionsQuery, [req.user.id], (err, permissions) => {
      if (err) return res.status(500).json({ error: err });
      db.query(presentQuery, [req.user.id], (err, presents) => {
        if (err) return res.status(500).json({ error: err });
        const events = [
          ...leaves.map(l => ({
            id: l.id,
            title: l.type === "leave" ? `LEAVE - ${l.status.toUpperCase()}`
                 : l.type === "compoff" ? `COMP OFF - ${l.status.toUpperCase()}`
                 : `UNKNOWN - ${l.status.toUpperCase()}`,
            start: new Date(l.from_date),
            end: new Date(new Date(l.to_date).setHours(23, 59, 59, 999)),
            days: l.days, type: l.type, half_day_type: l.half_day_type,
            remarks: l.remarks, comp_off_date: l.comp_off_date, status: l.status,
          })),
          ...permissions.map(p => ({
            id: p.id, title: `PERMISSION - ${p.status.toUpperCase()}`,
            start: new Date(p.date), end: new Date(p.date),
            type: "permission", hours: p.hours, slot: p.slot, remarks: p.remarks, status: p.status,
          })),
          ...presents.map(p => ({
            id: p.id, title: `PRESENT (${p.holiday_name || "Holiday"}) - ${p.status.toUpperCase()}`,
            start: new Date(p.date), end: new Date(p.date),
            type: "present", holiday_name: p.holiday_name, remarks: p.remarks, status: p.status,
          })),
        ];
        res.json(events);
      });
    });
  });
});

// ================= Delete leave or permission =================
router.delete("/delete/:id", auth, (req, res) => {
  const { id } = req.params;
  const type = req.query.type || "leave";
  const table = type === "permission" ? "permission" : type === "present" ? "present_on_holiday" : "leaves";

  db.query(`SELECT user_id, status FROM ${table} WHERE id=?`, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (!result.length) return res.status(404).json({ error: `${type} not found` });

    const entry = result[0];
    if (entry.user_id !== req.user.id) return res.status(403).json({ error: `You can only delete your own ${type}` });
    if (entry.status !== "pending") return res.status(400).json({ error: `Only pending ${type} can be deleted` });

    db.query(`DELETE FROM ${table} WHERE id=?`, [id], (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully` });
    });
  });
});

// ================= Admin: Approve / Reject Leave =================
router.put("/leave/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });

  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "Invalid status" });

  try {
    const [leaves] = await db.promise().query(
      `SELECT leaves.*, users.email AS user_email, users.name AS user_name
       FROM leaves JOIN users ON leaves.user_id = users.id WHERE leaves.id=?`,
      [req.params.id]
    );
    if (!leaves.length) return res.status(404).json({ error: "Leave not found" });

    const leave = leaves[0];
    const [result] = await db.promise().query("UPDATE leaves SET status=? WHERE id=?", [status, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Leave not found" });

    if (leave.user_email) {
      const isApproved = status === "approved";
      try {
        await createTransporter().sendMail({
          from: process.env.EMAIL_USER,
          to: leave.user_email,
          subject: `Your ${leave.type} request has been ${status}`,
          html: buildEmailHtml({
            recipientName: leave.user_name,
            title: `Leave request ${status}`,
            statusLabel: isApproved ? "Approved" : "Rejected",
            statusColor: isApproved ? "#065f46" : "#991b1b",
            statusBg:    isApproved ? "#d1fae5" : "#fee2e2",
            rows: [
              { label: "Type",     value: leave.type.charAt(0).toUpperCase() + leave.type.slice(1) },
              { label: "From",     value: leave.from_date },
              { label: "To",       value: leave.to_date },
              { label: "Duration", value: `${leave.days} day(s)` },
              { label: "Remarks",  value: leave.remarks || "N/A" },
            ],
          }),
        });
      } catch (mailErr) { console.error("Failed to send email:", mailErr); }
    }

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

// ================= Admin: Approve / Reject Present on Holiday =================
router.put("/present/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });

  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "Invalid status" });

  try {
    const [rows] = await db.promise().query(
      `SELECT ph.*, u.email AS user_email, u.name AS user_name
       FROM present_on_holiday ph JOIN users u ON ph.user_id = u.id WHERE ph.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Record not found" });

    const record = rows[0];
    const [result] = await db.promise().query("UPDATE present_on_holiday SET status=? WHERE id=?", [status, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Record not found" });

    if (record.user_email) {
      const isApproved = status === "approved";
      try {
        await createTransporter().sendMail({
          from: process.env.EMAIL_USER,
          to: record.user_email,
          subject: `Present on Holiday request ${status}`,
          html: buildEmailHtml({
            recipientName: record.user_name,
            title: `Present on holiday ${status}`,
            statusLabel: isApproved ? "Approved" : "Rejected",
            statusColor: isApproved ? "#065f46" : "#991b1b",
            statusBg:    isApproved ? "#d1fae5" : "#fee2e2",
            rows: [
              { label: "Holiday", value: record.holiday_name || "N/A" },
              { label: "Date",    value: record.date },
              { label: "Remarks", value: record.remarks || "N/A" },
              ...(isApproved ? [{ label: "Next step", value: "You can now apply a Comp Off for this day" }] : []),
            ],
          }),
        });
      } catch (mailErr) { console.error("Failed to send email:", mailErr); }
    }

    res.json({ message: "Present status updated", status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
