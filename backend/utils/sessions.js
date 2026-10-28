// ── Session revocation ──
// JWTs stay stateless, but every login gets a unique `jti`. Logging in (or
// logging out) revokes the token the browser currently holds, so the previous
// account's session is destroyed as soon as another account logs in — even on
// other devices that token was copied to.
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "secret"; // matches routes/auth.js signing secret
const TOKEN_TTL = "30d";

// Signs a session token carrying a revocable jti.
const issueToken = (payload) =>
  jwt.sign({ ...payload, jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn: TOKEN_TTL });

// Marks a raw token as revoked. Verifies the signature first so a forged
// token can never revoke someone else's session. Ignores expired tokens
// (nothing left to revoke).
const revokeToken = (db, rawToken, done) => {
  const finish = typeof done === "function" ? done : () => {};
  if (!rawToken) return finish(null);
  let decoded;
  try {
    decoded = jwt.verify(rawToken, JWT_SECRET);
  } catch {
    return finish(null); // invalid/expired → already unusable
  }
  if (!decoded || !decoded.jti) return finish(null);
  if (decoded.exp && decoded.exp * 1000 <= Date.now()) return finish(null);

  const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : null;
  db.query(
    "INSERT IGNORE INTO revoked_tokens (jti, user_id, expires_at) VALUES (?, ?, ?)",
    [decoded.jti, decoded.id || null, expiresAt],
    (err) => finish(err || null)
  );
};

// Express middleware: reject requests whose token jti has been revoked.
// Fails open on DB errors so a database hiccup never logs everyone out.
const revocationGate = (db) => (req, res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return next();

  let decoded;
  try {
    decoded = jwt.verify(header.slice(7), JWT_SECRET);
  } catch {
    return next(); // invalid/expired → route-level verifyToken will reject
  }
  if (!decoded || !decoded.jti) return next(); // legacy tokens: no jti → not revocable

  db.query("SELECT 1 FROM revoked_tokens WHERE jti = ?", [decoded.jti], (err, rows) => {
    if (err) return next();
    if (rows && rows.length)
      return res.status(401).json({ error: "Session ended. Please log in again." });
    next();
  });
};

// Startup migration + opportunistic cleanup of expired revocation rows.
const ensureTable = (db, done = () => {}) => {
  db.query(
    `CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti VARCHAR(64) NOT NULL PRIMARY KEY,
      user_id INT NULL,
      revoked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NULL,
      KEY idx_expires (expires_at)
    )`,
    (err) => {
      if (err) return done(err);
      console.log("Session table ready: revoked_tokens");
      cleanupExpired(db, () => done(null));
    }
  );
};

const cleanupExpired = (db, done = () => {}) => {
  db.query(
    "DELETE FROM revoked_tokens WHERE expires_at IS NOT NULL AND expires_at < NOW()",
    () => done()
  );
};

module.exports = { JWT_SECRET, issueToken, revokeToken, revocationGate, ensureTable, cleanupExpired };
