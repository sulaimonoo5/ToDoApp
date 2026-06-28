const express = require("express");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const pool = req.pool;
    const userId = req.userId;

    const userResult = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1", [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const listResult = await pool.query(
      "SELECT list_id, name, sort_order FROM task_lists WHERE user_id = $1 ORDER BY sort_order",
      [userId]
    );
    const taskResult = await pool.query(
      "SELECT task_id, list_id, text, completed, priority, goal_id, completed_at, sort_order FROM tasks WHERE user_id = $1 ORDER BY sort_order",
      [userId]
    );
    const goalResult = await pool.query(
      "SELECT goal_id, name, description, created_at FROM goals WHERE user_id = $1 ORDER BY created_at",
      [userId]
    );
    const scheduleResult = await pool.query(
      "SELECT day, lesson, name, start_time, end_time, room, teacher, color, attended, reminder, notes FROM schedule_entries WHERE user_id = $1 ORDER BY day, lesson",
      [userId]
    );
    const streakResult = await pool.query(
      "SELECT current_streak, longest_streak, last_active_date FROM streaks WHERE user_id = $1",
      [userId]
    );

    const listMap = {};
    for (const row of listResult.rows) {
      listMap[row.list_id] = { id: row.list_id, name: row.name, tasks: [] };
    }
    for (const row of taskResult.rows) {
      if (listMap[row.list_id]) {
        listMap[row.list_id].tasks.push({
          id: row.task_id,
          text: row.text,
          completed: row.completed,
          priority: row.priority,
          goalId: row.goal_id,
          completedAt: row.completed_at,
        });
      }
    }
    const lists = Object.values(listMap);

    const goals = goalResult.rows.map((g) => ({
      id: g.goal_id,
      name: g.name,
      description: g.description,
      createdAt: g.created_at,
    }));

    const schedule = {};
    for (const row of scheduleResult.rows) {
      const day = String(row.day);
      const lesson = String(row.lesson);
      if (!schedule[day]) schedule[day] = {};
      schedule[day][lesson] = {
        name: row.name || "",
        startTime: row.start_time || "",
        endTime: row.end_time || "",
        room: row.room || "",
        teacher: row.teacher || "",
        color: row.color || "emerald",
        attended: row.attended || false,
        reminder: row.reminder || "none",
        notes: row.notes || "",
      };
    }

    const streakRow = streakResult.rows[0];
    const streak = streakRow
      ? { currentStreak: streakRow.current_streak, longestStreak: streakRow.longest_streak, lastActiveDate: streakRow.last_active_date }
      : { currentStreak: 0, longestStreak: 0, lastActiveDate: null };

    res.json({ user: userResult.rows[0], data: { lists, goals, schedule, streak } });
  } catch (err) {
    console.error("Sync GET error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  const client = await req.pool.connect();
  try {
    const userId = req.userId;
    const { lists, goals, schedule, streak } = req.body;

    await client.query("BEGIN");

    await client.query("DELETE FROM tasks WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM task_lists WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM goals WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM schedule_entries WHERE user_id = $1", [userId]);

    if (lists && Array.isArray(lists)) {
      for (let i = 0; i < lists.length; i++) {
        const list = lists[i];
        await client.query(
          `INSERT INTO task_lists (user_id, list_id, name, sort_order)
           VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, list_id)
           DO UPDATE SET name = $3, sort_order = $4, updated_at = NOW()`,
          [userId, list.id, list.name, i]
        );
        if (list.tasks && Array.isArray(list.tasks)) {
          for (let j = 0; j < list.tasks.length; j++) {
            const t = list.tasks[j];
            await client.query(
              `INSERT INTO tasks (user_id, task_id, list_id, text, completed, priority, goal_id, completed_at, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (user_id, task_id)
               DO UPDATE SET text = $4, completed = $5, priority = $6, goal_id = $7, completed_at = $8, sort_order = $9, updated_at = NOW()`,
              [userId, t.id, list.id, t.text, t.completed || false, t.priority || "low", t.goalId || null, t.completedAt || null, j]
            );
          }
        }
      }
    }

    if (goals && Array.isArray(goals)) {
      for (const g of goals) {
        await client.query(
          `INSERT INTO goals (user_id, goal_id, name, description, created_at)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, goal_id)
           DO UPDATE SET name = $3, description = $4, updated_at = NOW()`,
          [userId, g.id, g.name, g.description || "", g.createdAt || new Date().toISOString()]
        );
      }
    }

    if (schedule && typeof schedule === "object") {
      for (const [day, lessons] of Object.entries(schedule)) {
        if (typeof lessons === "object") {
          for (const [lessonIdx, lesson] of Object.entries(lessons)) {
            if (lesson && typeof lesson === "object") {
              await client.query(
                `INSERT INTO schedule_entries (user_id, day, lesson, name, start_time, end_time, room, teacher, color, attended, reminder, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (user_id, day, lesson)
                 DO UPDATE SET name = $4, start_time = $5, end_time = $6, room = $7, teacher = $8, color = $9, attended = $10, reminder = $11, notes = $12`,
                [userId, parseInt(day), parseInt(lessonIdx), lesson.name || "", lesson.startTime || "", lesson.endTime || "", lesson.room || "", lesson.teacher || "", lesson.color || "emerald", lesson.attended || false, lesson.reminder || "none", lesson.notes || ""]
              );
            }
          }
        }
      }
    }

    if (streak) {
      await client.query(
        `INSERT INTO streaks (user_id, current_streak, longest_streak, last_active_date)
         VALUES ($1, $2, $3, $4) ON CONFLICT (user_id)
         DO UPDATE SET current_streak = $2, longest_streak = $3, last_active_date = $4`,
        [userId, streak.currentStreak || 0, streak.longestStreak || 0, streak.lastActiveDate || ""]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Sync complete" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Sync POST error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const pool = req.pool;
    const userId = req.userId;
    const taskCount = await pool.query("SELECT COUNT(*) as c FROM tasks WHERE user_id = $1", [userId]);
    const goalCount = await pool.query("SELECT COUNT(*) as c FROM goals WHERE user_id = $1", [userId]);
    const completedCount = await pool.query("SELECT COUNT(*) as c FROM tasks WHERE user_id = $1 AND completed = true", [userId]);
    const lessonCount = await pool.query("SELECT COUNT(*) as c FROM schedule_entries WHERE user_id = $1", [userId]);
    const streakRow = await pool.query("SELECT current_streak, longest_streak FROM streaks WHERE user_id = $1", [userId]);
    res.json({
      tasks: parseInt(taskCount.rows[0].c),
      goals: parseInt(goalCount.rows[0].c),
      completedTasks: parseInt(completedCount.rows[0].c),
      lessons: parseInt(lessonCount.rows[0].c),
      currentStreak: streakRow.rows[0]?.current_streak || 0,
      longestStreak: streakRow.rows[0]?.longest_streak || 0,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
