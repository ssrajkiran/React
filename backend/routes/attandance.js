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

/* ─── Helper: day-of-month from a date value (string or Date), tz-safe ─── */
function dayOf(v) {
  if (typeof v === "string") {
    const m = v.match(/^\d{4}-\d{2}-(\d{2})/);
    if (m) return Number(m[1]);
  }
  if (v instanceof Date) return v.getDate();
  return new Date(v).getDate();
}

/* ─── Helper: "YYYY-MM-DD" from a date value, tz-safe ─── */
function toISODate(v) {
  if (typeof v === "string") {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  if (v instanceof Date) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : String(v);
}

/* ==============================
   GET ATTENDANCE REPORT
   /api/attendance?year=2026&month=2&user_id=5
================================ */
router.get("/", verifyToken, async (req, res) => {
  const year  = parseInt(req.query.year);
  const month = parseInt(req.query.month);
  const userId = req.query.user_id ? parseInt(req.query.user_id) : null;

  if (!year || !month)
    return res.status(400).json({ error: "Year and month are required" });

  try {
    // 1️⃣ Users (optionally a single person)
    const [users] = userId
      ? await db.promise().query(`SELECT id, name FROM users WHERE id = ? ORDER BY name`, [userId])
      : await db.promise().query(`SELECT id, name FROM users ORDER BY name`);

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
      publicHolidayMap[dayOf(h.date)] = h.name;
    });

    // 6️⃣ Days in month & headers
    const daysInMonth = new Date(year, month, 0).getDate();
    const headers = ["User"];
    for (let d = 1; d <= daysInMonth; d++) headers.push(d);

    // 7️⃣ Build rows
    const rows = users.map((user) => {
      const row = { User: user.name, user_id: user.id };

      for (let day = 1; day <= daysInMonth; day++) {
        const dow     = new Date(year, month - 1, day).getDay(); // 0=Sun,6=Sat
        const dateStr = toDateStr(year, month, day);

        // ── Priority 1: present_on_holiday (approved) ──
        const presentRecord = presents.find(
          (p) => p.user_id === user.id && dayOf(p.date) === day
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
          const from = dayOf(l.from_date);
          const to   = dayOf(l.to_date);
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
          (p) => p.user_id === user.id && dayOf(p.date) === day
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

/* ==============================
   PEOPLE LIST (for person filter)
   /api/attendance/people
================================ */
router.get("/people", verifyToken, async (req, res) => {
  try {
    const [users] = await db.promise().query(
      `SELECT id, name FROM users ORDER BY name ASC`
    );
    res.json(users);
  } catch (err) {
    console.error("people error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ==============================
   PERSON MONTH-WISE SUMMARY
   /api/attendance/person-summary?user_id=5&year=2026
   Returns leave / comp-off / permission / present
   records grouped by month for the given year.
================================ */
router.get("/person-summary", verifyToken, async (req, res) => {
  const userId = parseInt(req.query.user_id);
  const year   = parseInt(req.query.year);

  if (!userId || !year)
    return res.status(400).json({ error: "user_id and year are required" });

  try {
    const [userRows] = await db.promise().query(
      `SELECT id, name FROM users WHERE id = ?`, [userId]
    );
    if (!userRows.length)
      return res.status(404).json({ error: "User not found" });

    // Approved leaves (leave + compoff) overlapping the year
    const [leaves] = await db.promise().query(
      `SELECT id, from_date, to_date, days, type, status, remarks,
              half_day_type, comp_off_date
       FROM leaves
       WHERE user_id = ? AND status = 'approved'
         AND YEAR(to_date) >= ? AND YEAR(from_date) <= ?
       ORDER BY from_date ASC`,
      [userId, year, year]
    );

    // Approved permissions in the year
    const [permissions] = await db.promise().query(
      `SELECT id, date, hours, slot, status, remarks
       FROM permission
       WHERE user_id = ? AND status = 'approved'
         AND YEAR(date) = ?
       ORDER BY date ASC`,
      [userId, year]
    );

    // Approved present-on-holiday in the year
    const [presents] = await db.promise().query(
      `SELECT id, date, holiday_name, status, remarks
       FROM present_on_holiday
       WHERE user_id = ? AND status = 'approved'
         AND YEAR(date) = ?
       ORDER BY date ASC`,
      [userId, year]
    );

    // Build flat list of all records with a month key
    const records = [];

    leaves.forEach((l) => {
      const fromStr = toISODate(l.from_date);
      const toStr   = toISODate(l.to_date || l.from_date);
      // A leave may span months — clip day-count per month (string arithmetic, tz-safe)
      let [y, m, d] = fromStr.split("-").map(Number);
      const [toY, toM, toD] = toStr.split("-").map(Number);
      while (y < toY || (y === toY && (m < toM || (m === toM && d <= toD)))) {
        if (y === year) {
          const isSingle = fromStr === toStr;
          records.push({
            month: m,
            type: l.type === "compoff" ? "compoff" : "leave",
            from_date: fromStr,
            to_date: toStr,
            day: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
            days: isSingle
              ? (l.half_day_type && l.half_day_type !== "full" ? 0.5 : (parseFloat(l.days) || 1))
              : 1, // each day of a range counts 1 in its own month
            half_day_type: l.half_day_type || "full",
            comp_off_date: l.comp_off_date ? toISODate(l.comp_off_date) : "",
            remarks: l.remarks || "",
            status: l.status,
          });
        }
        d += 1;
        const dim = new Date(y, m, 0).getDate();
        if (d > dim) { d = 1; m += 1; if (m > 12) { m = 1; y += 1; } }
      }
    });

    permissions.forEach((p) => {
      const pStr = toISODate(p.date);
      const [py, pm] = pStr.split("-").map(Number);
      if (py === year) {
        records.push({
          month: pm,
          type: "permission",
          from_date: pStr,
          to_date: pStr,
          day: pStr,
          days: null,
          hours: parseFloat(p.hours) || 0,
          slot: p.slot || "",
          remarks: p.remarks || "",
          status: p.status,
        });
      }
    });

    presents.forEach((p) => {
      const pStr = toISODate(p.date);
      const [py, pm] = pStr.split("-").map(Number);
      if (py === year) {
        records.push({
          month: pm,
          type: "present",
          from_date: pStr,
          to_date: pStr,
          day: pStr,
          days: 1,
          holiday_name: p.holiday_name || "",
          remarks: p.remarks || "",
          status: p.status,
        });
      }
    });

    // Per-month aggregation
    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      leave_days: 0,
      compoff_days: 0,
      permission_hours: 0,
      present_days: 0,
      total_days: 0,
      records: [],
    }));

    records.forEach((r) => {
      const bucket = monthly[r.month - 1];
      bucket.records.push(r);
      if (r.type === "leave")     bucket.leave_days += r.days || 0;
      else if (r.type === "compoff") bucket.compoff_days += r.days || 0;
      else if (r.type === "permission") bucket.permission_hours += r.hours || 0;
      else if (r.type === "present") bucket.present_days += 1;
    });

    monthly.forEach((b) => {
      // Newest record first inside each month
      b.records.sort((a, c) => String(c.day || "").localeCompare(String(a.day || "")));
      b.leave_days     = parseFloat(b.leave_days.toFixed(2));
      b.compoff_days   = parseFloat(b.compoff_days.toFixed(2));
      b.permission_hours = parseFloat(b.permission_hours.toFixed(2));
      b.present_days   = parseFloat(b.present_days.toFixed(2));
      b.total_days     = parseFloat((b.leave_days + b.compoff_days + b.present_days).toFixed(2));
    });

    // Year totals
    const totals = monthly.reduce(
      (acc, b) => ({
        leave_days:       parseFloat((acc.leave_days + b.leave_days).toFixed(2)),
        compoff_days:     parseFloat((acc.compoff_days + b.compoff_days).toFixed(2)),
        permission_hours: parseFloat((acc.permission_hours + b.permission_hours).toFixed(2)),
        present_days:     parseFloat((acc.present_days + b.present_days).toFixed(2)),
        total_days:       parseFloat((acc.total_days + b.total_days).toFixed(2)),
      }),
      { leave_days: 0, compoff_days: 0, permission_hours: 0, present_days: 0, total_days: 0 }
    );

    res.json({ user: userRows[0], year, monthly, totals });
  } catch (err) {
    console.error("person-summary error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
