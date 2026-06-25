const express = require("express");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

router.post("/import", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { tasks, goals, schedule, statistics } = req.body;
    const pool = req.pool;

    const types = [
      { type: "tasks", data: tasks },
      { type: "goals", data: goals },
      { type: "schedule", data: schedule },
      { type: "statistics", data: statistics },
    ];

    for (const { type, data } of types) {
      await pool.query(
        `INSERT INTO user_data (user_id, data_type, data) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, data_type) DO UPDATE SET data = $3, updated_at = NOW()`,
        [userId, type, JSON.stringify(data)]
      );
    }

    res.json({ message: "Data imported" });
  } catch (err) {
    console.error("Import error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

module.exports = router;
