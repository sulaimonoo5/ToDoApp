const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "todo-app-jwt-secret-dev";

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    const sessionId = req.headers["x-session-id"];
    if (sessionId && req.pool) {
      req.pool.query(
        "UPDATE sessions SET last_active_at = NOW() WHERE session_id = $1 AND user_id = $2",
        [sessionId, decoded.userId]
      ).catch((err) => {
        console.error("Session ping failed:", err.message);
      });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
