const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Единый источник JWT-секрета для всего backend (REST + Socket.IO).
// В production публичный dev-секрет использовать нельзя: если переменная окружения
// не задана, генерируем случайный секрет на процесс (токены нельзя подделать,
// но активные сессии сбрасываются при рестарте — задайте JWT_SECRET в окружении).
const DEV_FALLBACK_SECRET = "todo-app-jwt-secret-dev";
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    JWT_SECRET = crypto.randomBytes(48).toString("hex");
    console.warn(
      "[security] JWT_SECRET is not set. Generated a random ephemeral secret; " +
      "existing sessions will be invalidated on restart. Set JWT_SECRET in the environment."
    );
  } else {
    JWT_SECRET = DEV_FALLBACK_SECRET;
  }
}

async function authMiddleware(req, res, next) {
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
