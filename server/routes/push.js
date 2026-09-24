const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const {
  getPublicKey,
  validateSubscription,
} = require("../webpush");

const router = express.Router();

// Public key for the Push API (safe to expose — it is not a secret).
router.get("/publicKey", (req, res) => {
  res.json({ publicKey: getPublicKey() });
});

// Save/update a push subscription for the current user.
// Endpoint is the unique key: one subscription row per device.
router.post("/subscribe", authMiddleware, async (req, res) => {
  try {
    const { endpoint, keys, deviceLabel } = req.body;
    if (!validateSubscription({ endpoint, keys })) {
      return res.status(400).json({ error: "Invalid push subscription" });
    }

    const label = typeof deviceLabel === "string" && deviceLabel.trim() ? deviceLabel.trim().slice(0, 200) : "Unknown device";
    const result = await req.pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, device_label)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         device_label = EXCLUDED.device_label,
         updated_at = NOW()
       RETURNING id`,
      [req.userId, endpoint, keys.p256dh, keys.auth, label]
    );

    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error("Push subscribe error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Remove ONE subscription (the current device). Used on logout so a device
// stops receiving push for an account it is no longer signed into.
router.delete("/subscribe", authMiddleware, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (typeof endpoint !== "string" || !endpoint) {
      return res.status(400).json({ error: "endpoint is required" });
    }
    await req.pool.query(
      "DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2",
      [req.userId, endpoint]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Push unsubscribe error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;