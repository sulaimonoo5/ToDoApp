const express = require("express");
const pool = require("../config/db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

router.post("/import", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { tasks, goals, schedule, statistics } = req.body;

    // store JSON blobs per user for future sync
    await pool.query(
      `INSERT INTO user_data (user_id, data_type, data) VALUES ($1, 'tasks', $2)
       ON CONFLICT (user_id, data_type) DO UPDATE SET data = $2, updated_at = NOW()`,
      [userId, JSON.stringify(tasks)]
    );
    await pool.query(
      `INSERT INTO user_data (user_id, data_type, data) VALUES ($1, 'goals', $2)
       ON CONFLICT (user_id, data_type) DO UPDATE SET data = $2, updated_at = NOW()`,
      [userId, JSON.stringify(goals)]
    );
    await pool.query(
      `INSERT INTO user_data (user_id, data_type, data) VALUES ($1, 'schedule', $2)
       ON CONFLICT (user_id, data_type) DO UPDATE SET data = $2, updated_at = NOW()`,
      [userId, JSON.stringify(schedule)]
    );
    await pool.query(
      `INSERT INTO user_data (user_id, data_type, data) VALUES ($1, 'statistics', $2)
       ON CONFLICT (user_id, data_type) DO UPDATE SET data = $2, updated_at = NOW()`,
      [userId, JSON.stringify(statistics)]
    );

    res.json({ message: "Data imported successfully" });
  } catch (err) {
    console.error("Import error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
