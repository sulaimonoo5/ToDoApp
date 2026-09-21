const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { authMiddleware, JWT_SECRET } = require("../middleware/auth");
const { createAttemptLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Защита от перебора: вход — 30 неудачных попыток / 10 мин на IP+email,
// регистрация — 20 попыток / час на IP.
const loginLimiter = createAttemptLimiter({ windowMs: 10 * 60 * 1000, max: 30 });
const registerLimiter = createAttemptLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyFn: (req) => req.ip || "unknown",
});

function createSessionId() {
  return crypto.randomUUID();
}

function createToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

async function createSession(pool, userId, deviceInfo, ip) {
  const sessionId = createSessionId();
  await pool.query(
    `INSERT INTO sessions (user_id, session_id, device_type, browser, os, ip, location)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, sessionId, deviceInfo?.deviceType || "Unknown", deviceInfo?.browser || "Unknown", deviceInfo?.os || "Unknown", ip || "", deviceInfo?.location || ""]
  );
  return sessionId;
}

async function recordLoginHistory(pool, userId, deviceInfo, ip) {
  await pool.query(
    `INSERT INTO login_history (user_id, device_type, browser, os, ip, location)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, deviceInfo?.deviceType || "Unknown", deviceInfo?.browser || "Unknown", deviceInfo?.os || "Unknown", ip || "", deviceInfo?.location || ""]
  );
}

router.post("/register", registerLimiter.guard, async (req, res) => {
  try {
    registerLimiter.record(req);
    const { name, email, password, deviceInfo } = req.body;
    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (!name || !email || !password) return res.status(400).json({ error: "All fields are required" });
    if (name.length > 255) return res.status(400).json({ error: "Name is too long" });
    if (email.length > 255) return res.status(400).json({ error: "Email is too long" });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    if (password.length > 200) return res.status(400).json({ error: "Password is too long" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Invalid email format" });

    const existing = await req.pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Email already exists" });

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);
    const result = await req.pool.query(
      "INSERT INTO users (name, email, password_hash, last_password_change) VALUES ($1, $2, $3, NOW()) RETURNING id, name, email, created_at, last_password_change",
      [name, email, password_hash]
    );

    const user = result.rows[0];
    const token = createToken(user.id);
    const sessionId = await createSession(req.pool, user.id, deviceInfo, req.ip);
    await recordLoginHistory(req.pool, user.id, deviceInfo, req.ip);

    res.status(201).json({ user, token, sessionId });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", loginLimiter.guard, async (req, res) => {
  try {
    const { email, password, deviceInfo } = req.body;
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await req.pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      loginLimiter.record(req);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      loginLimiter.record(req);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    loginLimiter.reset(req);
    const token = createToken(user.id);
    const sessionId = await createSession(req.pool, user.id, deviceInfo, req.ip);
    await recordLoginHistory(req.pool, user.id, deviceInfo, req.ip);

    res.json({
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at, last_password_change: user.last_password_change },
      token,
      sessionId,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const result = await req.pool.query("SELECT id, name, email, created_at, last_password_change FROM users WHERE id = $1", [req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/logout", authMiddleware, async (req, res) => {
  try {
    const sessionId = req.headers["x-session-id"];
    if (sessionId) {
      await req.pool.query("DELETE FROM sessions WHERE session_id = $1 AND user_id = $2", [sessionId, req.userId]);
    }
    res.json({ message: "Logged out" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both passwords are required" });
    }
    if (newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
    if (newPassword.length > 200) return res.status(400).json({ error: "New password is too long" });

    const result = await req.pool.query("SELECT password_hash FROM users WHERE id = $1", [req.userId]);
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(newPassword, salt);
    await req.pool.query("UPDATE users SET password_hash = $1, last_password_change = NOW(), updated_at = NOW() WHERE id = $2", [password_hash, req.userId]);
    res.json({ message: "Password changed", last_password_change: new Date().toISOString() });
  } catch (err) {
    console.error("Password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/account", authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (typeof password !== "string" || !password) return res.status(400).json({ error: "Password is required" });

    const result = await req.pool.query("SELECT password_hash FROM users WHERE id = $1", [req.userId]);
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    await req.pool.query("DELETE FROM users WHERE id = $1", [req.userId]);
    res.json({ message: "Account deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (typeof name !== "string" || !name.trim()) return res.status(400).json({ error: "Name is required" });
    if (name.length > 255) return res.status(400).json({ error: "Name is too long" });

    const result = await req.pool.query(
      "UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, created_at, last_password_change",
      [name.trim(), req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/sessions", authMiddleware, async (req, res) => {
  try {
    const currentSessionId = req.headers["x-session-id"];
    const result = await req.pool.query(
      "SELECT session_id, device_type, browser, os, ip, location, last_active_at, created_at FROM sessions WHERE user_id = $1 ORDER BY last_active_at DESC",
      [req.userId]
    );
    const sessions = result.rows.map((s) => ({
      sessionId: s.session_id,
      deviceType: s.device_type,
      browser: s.browser,
      os: s.os,
      ip: s.ip,
      location: s.location,
      lastActive: s.last_active_at,
      createdAt: s.created_at,
      isCurrent: s.session_id === currentSessionId,
    }));
    res.json({ sessions });
  } catch (err) {
    console.error("Sessions error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/sessions/:sessionId", authMiddleware, async (req, res) => {
  try {
    await req.pool.query("DELETE FROM sessions WHERE session_id = $1 AND user_id = $2", [req.params.sessionId, req.userId]);
    res.json({ message: "Session ended" });
  } catch (err) {
    console.error("Delete session error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/sessions/logout-all", authMiddleware, async (req, res) => {
  try {
    const currentSessionId = req.headers["x-session-id"];
    if (currentSessionId) {
      await req.pool.query("DELETE FROM sessions WHERE user_id = $1 AND session_id != $2", [req.userId, currentSessionId]);
    } else {
      await req.pool.query("DELETE FROM sessions WHERE user_id = $1", [req.userId]);
    }
    res.json({ message: "All other sessions ended" });
  } catch (err) {
    console.error("Logout all error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/login-history", authMiddleware, async (req, res) => {
  try {
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 50;
    if (limit > 200) limit = 200;
    const result = await req.pool.query(
      "SELECT device_type, browser, os, ip, location, created_at FROM login_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
      [req.userId, limit]
    );
    const history = result.rows.map((h) => ({
      deviceType: h.device_type,
      browser: h.browser,
      os: h.os,
      ip: h.ip,
      location: h.location,
      createdAt: h.created_at,
    }));
    res.json({ history });
  } catch (err) {
    console.error("Login history error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/security", authMiddleware, async (req, res) => {
  try {
    const result = await req.pool.query("SELECT last_password_change FROM users WHERE id = $1", [req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json({
      lastPasswordChange: result.rows[0].last_password_change,
      twoFactorEnabled: false,
    });
  } catch (err) {
    console.error("Security error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
