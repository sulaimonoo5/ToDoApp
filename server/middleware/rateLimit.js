// Минимальный in-memory rate limiter для чувствительных auth-эндпоинтов.
// Без внешних зависимостей. Счётчики живут в памяти процесса и сбрасываются при
// рестарте (приемлемо для защиты от перебора на уровне приложения).

function createAttemptLimiter({ windowMs, max, keyFn }) {
  const store = new Map();

  const defaultKey = (req) => {
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || "unknown";
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase() : "";
    return `${ip}|${email}`;
  };
  const buildKey = keyFn || defaultKey;

  function sweep(now) {
    if (store.size < 5000) return;
    for (const [key, entry] of store) {
      if (now > entry.reset) store.delete(key);
    }
  }

  return {
    // Пропускает запрос, если лимит ещё не достигнут.
    guard(req, res, next) {
      const now = Date.now();
      const key = buildKey(req);
      req._rateKey = key;
      const entry = store.get(key);
      if (entry && now <= entry.reset && entry.count >= max) {
        res.setHeader("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
        return res.status(429).json({ error: "Too many attempts. Please try again later." });
      }
      next();
    },
    // Увеличивает счётчик попыток.
    record(req) {
      const now = Date.now();
      sweep(now);
      const key = req._rateKey;
      if (!key) return;
      const entry = store.get(key);
      if (!entry || now > entry.reset) store.set(key, { count: 1, reset: now + windowMs });
      else entry.count += 1;
    },
    // Сбрасывает счётчик (например, после успешного входа).
    reset(req) {
      if (req._rateKey) store.delete(req._rateKey);
    },
  };
}

module.exports = { createAttemptLimiter };
