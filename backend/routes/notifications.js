const router = require("express").Router();
const db = require("../config/db");
const jwt = require("jsonwebtoken");
const { notifyMany } = require("../utils/notify");

require("dotenv").config();

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

// ================= Birthday notifications (deduped per title per day) =================
let birthdayCheckInFlight = null;

function ensureBirthdayNotifications() {
  if (birthdayCheckInFlight) return birthdayCheckInFlight;
  birthdayCheckInFlight = (async () => {
    try {
      const [birthdays] = await db.promise().query(
        `SELECT id, name FROM users
         WHERE dob IS NOT NULL AND MONTH(dob) = MONTH(CURDATE()) AND DAY(dob) = DAY(CURDATE())`
      );
      if (!birthdays.length) return;

      const [seen] = await db.promise().query(
        `SELECT title FROM notifications WHERE type='birthday' AND DATE(created_at) = CURDATE()`
      );
      const seenTitles = new Set(seen.map((r) => r.title));
      const pending = birthdays.filter((b) => !seenTitles.has(`Happy Birthday ${b.name}!`));
      if (!pending.length) return;

      const [allUsers] = await db.promise().query("SELECT id FROM users");
      if (!allUsers.length) return;

      for (const person of pending) {
        await notifyMany(allUsers.map((u) => u.id), {
          title: `Happy Birthday ${person.name}!`,
          message: `Wishing ${person.name} a very happy birthday today.`,
          type: "birthday",
          link: null,
        });
      }
    } catch (err) {
      console.error("Birthday notification check failed:", err);
    } finally {
      birthdayCheckInFlight = null;
    }
  })();
  return birthdayCheckInFlight;
}

// ================= List notifications for current user =================
router.get("/", auth, async (req, res) => {
  try {
    await ensureBirthdayNotifications();

    const [rows] = await db.promise().query(
      `SELECT id, title, message, type, link, is_read, created_at
       FROM notifications WHERE user_id=?
       ORDER BY id DESC LIMIT 20`,
      [req.user.id]
    );

    const [[{ unread_count }]] = await db.promise().query(
      `SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id=? AND is_read=0`,
      [req.user.id]
    );

    res.json({ notifications: rows, unread_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= Mark all as read =================
router.put("/read-all", auth, async (req, res) => {
  try {
    await db.promise().query(
      "UPDATE notifications SET is_read=1 WHERE user_id=? AND is_read=0",
      [req.user.id]
    );
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= Mark one as read =================
router.put("/:id/read", auth, async (req, res) => {
  try {
    const [result] = await db.promise().query(
      "UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?",
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Notification not found" });
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
