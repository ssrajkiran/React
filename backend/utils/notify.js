const db = require("../config/db");

// Insert notifications for a list of user ids. Never throws.
async function notifyMany(userIds, { title, message, type = "info", link = null }) {
  try {
    const ids = [...new Set((Array.isArray(userIds) ? userIds : [userIds])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0))];
    if (!ids.length || !title || !message) return;

    const values = ids.map(() => "(?, ?, ?, ?, ?, 0, NOW())").join(", ");
    const params = ids.flatMap((id) => [id, title, message, type, link]);
    await db.promise().query(
      `INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at) VALUES ${values}`,
      params
    );
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

// Notify a single user
function notify(userId, payload) {
  return notifyMany([userId], payload);
}

// Notify every admin user
async function notifyAdmins(payload) {
  try {
    const [rows] = await db.promise().query("SELECT id FROM users WHERE role='admin'");
    await notifyMany(rows.map((r) => r.id), payload);
  } catch (err) {
    console.error("Failed to notify admins:", err);
  }
}

module.exports = { notify, notifyMany, notifyAdmins };
