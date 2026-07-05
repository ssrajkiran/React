const router = require("express").Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");

/* ==============================
   VERIFY TOKEN MIDDLEWARE
================================ */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Invalid token format" });

  jwt.verify(token, "secret", (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = decoded;
    next();
  });
};

/* ─── Helper: is this date a 2nd or 4th Saturday? ─── */
function is2ndOr4thSat(year, month, day) {
  const dow = new Date(year, month - 1, day).getDay();
  if (dow !== 6) return false;
  let satCount = 0;
  for (let d = 1; d <= day; d++) {
    if (new Date(year, month - 1, d).getDay() === 6) satCount++;
  }
  return satCount === 2 || satCount === 4;
}

/* ─── Helper: zero-pad to YYYY-MM-DD ─── */
function toDateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/* ==============================
   GET ATTENDANCE REPORT
   /api/attendance?year=2026&month=2
================================ */
router.get("/", verifyToken, async (req, res) => {
  const year  = parseInt(req.query.year);
  const month = parseInt(req.query.month);

  if (!year || !month)
    return res.status(400).json({ error: "Year and month are required" });

  try {
    // 1️⃣ All users
    const [users] = await db.promise().query(
      `SELECT id, name FROM users ORDER BY name`
    );

    // 2️⃣ Approved leaves for the month
    const [leaves] = await db.promise().query(
      `SELECT id, user_id, from_date, to_date, type, status, remarks,
              half_day_type, comp_off_date
       FROM leaves
       WHERE status = 'approved'
         AND YEAR(from_date) = ? AND MONTH(from_date) = ?`,
      [year, month]
    );

    // 3️⃣ Approved permissions for the month
    const [permissions] = await db.promise().query(
      `SELECT id, user_id, date, hours, slot, status, remarks
       FROM permission
       WHERE status = 'approved'
         AND YEAR(date) = ? AND MONTH(date) = ?`,
      [year, month]
    );

    // 4️⃣ Approved present_on_holiday for the month  ← NEW
    const [presents] = await db.promise().query(
      `SELECT id, user_id, date, holiday_name, status, remarks
       FROM present_on_holiday
       WHERE status = 'approved'
         AND YEAR(date) = ? AND MONTH(date) = ?`,
      [year, month]
    );

    // 5️⃣ Public holidays from holidays table for the month
    const [publicHolidays] = await db.promise().query(
      `SELECT date, name FROM holidays
       WHERE YEAR(date) = ? AND MONTH(date) = ?`,
      [year, month]
    );
    const publicHolidayMap = {};
    publicHolidays.forEach((h) => {
      const d = new Date(h.date);
      publicHolidayMap[d.getDate()] = h.name;
    });

    // 6️⃣ Days in month & headers
    const daysInMonth = new Date(year, month, 0).getDate();
    const headers = ["User"];
    for (let d = 1; d <= daysInMonth; d++) headers.push(d);

    // 7️⃣ Build rows
    const rows = users.map((user) => {
      const row = { User: user.name };

      for (let day = 1; day <= daysInMonth; day++) {
        const dow     = new Date(year, month - 1, day).getDay(); // 0=Sun,6=Sat
        const dateStr = toDateStr(year, month, day);

        // ── Priority 1: present_on_holiday (approved) ──
        const presentRecord = presents.find(
          (p) => p.user_id === user.id && new Date(p.date).getDate() === day
        );
        if (presentRecord) {
          row[day] = {
            status:          "present_on_holiday",
            holiday_name:    presentRecord.holiday_name || "",
            remarks:         presentRecord.remarks || "",
            approval_status: "approved",
          };
          continue;
        }

        // ── Priority 2: approved leave ──
        const leaveRecord = leaves.find((l) => {
          if (l.user_id !== user.id) return false;
          const from = new Date(l.from_date).getDate();
          const to   = new Date(l.to_date).getDate();
          return day >= from && day <= to;
        });

        if (leaveRecord) {
          const days =
            (new Date(leaveRecord.to_date) - new Date(leaveRecord.from_date)) /
              (1000 * 60 * 60 * 24) + 1;

          if (leaveRecord.type === "compoff") {
            row[day] = {
              status:          "compoff",          // → frontend shows CO
              from_date:       leaveRecord.from_date,
              to_date:         leaveRecord.to_date,
              days,
              comp_off_date:   leaveRecord.comp_off_date || "",
              remarks:         leaveRecord.remarks || "",
              approval_status: "approved",
            };
          } else {
            row[day] = {
              status:          "leave",            // → frontend shows L
              from_date:       leaveRecord.from_date,
              to_date:         leaveRecord.to_date,
              days,
              half_day_type:   leaveRecord.half_day_type || "full",
              remarks:         leaveRecord.remarks || "",
              approval_status: "approved",
            };
          }
          continue;
        }

        // ── Priority 3: approved permission ──
        const permRecord = permissions.find(
          (p) => p.user_id === user.id && new Date(p.date).getDate() === day
        );
        if (permRecord) {
          row[day] = {
            status:          "permission",         // → frontend shows PP
            hours:           permRecord.hours,
            slot:            permRecord.slot,
            remarks:         permRecord.remarks || "",
            approval_status: "approved",
          };
          continue;
        }

        // ── Priority 4: public holiday (from DB) ──
        if (publicHolidayMap[day]) {
          row[day] = {
            status:       "holiday",              // → frontend shows H
            holiday_name: publicHolidayMap[day],
          };
          continue;
        }

        // ── Priority 5: Sunday = week off ──
        if (dow === 0) {
          row[day] = { status: "WO" };
          continue;
        }

        // ── Priority 6: 2nd & 4th Saturday = week off ──
        if (is2ndOr4thSat(year, month, day)) {
          row[day] = { status: "WO" };
          continue;
        }

        // ── Default: Present ──
        row[day] = { status: "P" };
      }

      return row;
    });

    res.json({ year, month, headers, rows, daysInMonth });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
