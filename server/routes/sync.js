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
    const taskTrashResult = await pool.query(
      "SELECT task_id, list_id, text, completed, priority, goal_id, completed_at, sort_order, deleted_at FROM task_trash WHERE user_id = $1 ORDER BY deleted_at DESC",
      [userId]
    );
    const scheduleTrashResult = await pool.query(
      "SELECT day, lesson, name, start_time, end_time, room, teacher, color, attended, reminder, notes, deleted_at FROM schedule_trash WHERE user_id = $1 ORDER BY deleted_at DESC",
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

    const taskTrash = taskTrashResult.rows.map((t) => ({
      id: t.task_id,
      listId: t.list_id,
      text: t.text,
      completed: t.completed,
      priority: t.priority,
      goalId: t.goal_id,
      completedAt: t.completed_at,
      deletedAt: new Date(t.deleted_at).getTime(),
    }));

    const scheduleTrash = scheduleTrashResult.rows.map((t) => ({
      day: t.day,
      lesson: t.lesson,
      name: t.name || "",
      startTime: t.start_time || "",
      endTime: t.end_time || "",
      room: t.room || "",
      teacher: t.teacher || "",
      color: t.color || "emerald",
      attended: t.attended || false,
      reminder: t.reminder || "none",
      notes: t.notes || "",
      deletedAt: new Date(t.deleted_at).getTime(),
    }));

    res.json({
      user: userResult.rows[0],
      data: { lists, goals, schedule, streak, taskTrash, scheduleTrash },
    });
  } catch (err) {
    console.error("Sync GET error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  const client = await req.pool.connect();
  try {
    const userId = req.userId;
    const { lists, goals, schedule, streak, taskTrash, scheduleTrash } = req.body;

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

    if (taskTrash && Array.isArray(taskTrash)) {
      await client.query("DELETE FROM task_trash WHERE user_id = $1", [userId]);
      for (const t of taskTrash) {
        await client.query(
          `INSERT INTO task_trash (user_id, task_id, list_id, text, completed, priority, goal_id, completed_at, sort_order, deleted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10 / 1000.0))
           ON CONFLICT (user_id, task_id) DO NOTHING`,
          [userId, t.id, t.listId || "", t.text, t.completed || false, t.priority || "low", t.goalId || null, t.completedAt || null, t.sortOrder || 0, t.deletedAt || Date.now()]
        );
      }
    }

    if (scheduleTrash && Array.isArray(scheduleTrash)) {
      await client.query("DELETE FROM schedule_trash WHERE user_id = $1", [userId]);
      for (const t of scheduleTrash) {
        await client.query(
          `INSERT INTO schedule_trash (user_id, day, lesson, name, start_time, end_time, room, teacher, color, attended, reminder, notes, deleted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, to_timestamp($13 / 1000.0))
           ON CONFLICT (user_id, day, lesson) DO NOTHING`,
          [userId, t.day, t.lesson, t.name || "", t.startTime || "", t.endTime || "", t.room || "", t.teacher || "", t.color || "emerald", t.attended || false, t.reminder || "none", t.notes || "", t.deletedAt || Date.now()]
        );
      }
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
    const trashCount = await pool.query("SELECT COUNT(*) as c FROM task_trash WHERE user_id = $1", [userId]);
    res.json({
      tasks: parseInt(taskCount.rows[0].c),
      goals: parseInt(goalCount.rows[0].c),
      completedTasks: parseInt(completedCount.rows[0].c),
      lessons: parseInt(lessonCount.rows[0].c),
      currentStreak: streakRow.rows[0]?.current_streak || 0,
      longestStreak: streakRow.rows[0]?.longest_streak || 0,
      trashCount: parseInt(trashCount.rows[0].c),
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/patch", authMiddleware, async (req, res) => {
  const client = await req.pool.connect();
  try {
    const userId = req.userId;
    const { type, payload } = req.body;
    const pool = req.pool;

    let broadcastType = type;
    let broadcastPayload = { ...payload };

    switch (type) {
      case "list:create": {
        await pool.query(
          `INSERT INTO task_lists (user_id, list_id, name, sort_order)
           VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, list_id) DO UPDATE SET name = $3, sort_order = $4, updated_at = NOW()`,
          [userId, payload.list.id, payload.list.name, payload.sortOrder || 0]
        );
        break;
      }
      case "list:rename": {
        await pool.query(
          "UPDATE task_lists SET name = $1, updated_at = NOW() WHERE user_id = $2 AND list_id = $3",
          [payload.name, userId, payload.listId]
        );
        break;
      }
      case "list:delete": {
        await pool.query("DELETE FROM task_lists WHERE user_id = $1 AND list_id = $2", [userId, payload.listId]);
        break;
      }
      case "task:add": {
        const t = payload.task;
        await pool.query(
          `INSERT INTO tasks (user_id, task_id, list_id, text, completed, priority, goal_id, completed_at, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (user_id, task_id)
           DO UPDATE SET text = $4, priority = $6, goal_id = $7, completed_at = $8, sort_order = $9, updated_at = NOW()`,
          [userId, t.id, payload.listId, t.text, t.completed || false, t.priority || "low", t.goalId || null, t.completedAt || null, t.sortOrder || 0]
        );
        break;
      }
      case "task:update": {
        const tu = payload.task;
        await pool.query(
          `UPDATE tasks SET text = $1, priority = $2, goal_id = $3, updated_at = NOW()
           WHERE user_id = $4 AND task_id = $5`,
          [tu.text, tu.priority || "low", tu.goalId || null, userId, tu.id]
        );
        break;
      }
      case "task:toggle": {
        await pool.query(
          `UPDATE tasks SET completed = $1, completed_at = $2, updated_at = NOW()
           WHERE user_id = $3 AND task_id = $4`,
          [payload.completed, payload.completedAt || null, userId, payload.taskId]
        );
        break;
      }
      case "task:reorder": {
        const tasks = payload.tasks;
        for (let i = 0; i < tasks.length; i++) {
          await pool.query(
            "UPDATE tasks SET sort_order = $1, updated_at = NOW() WHERE user_id = $2 AND task_id = $3",
            [i, userId, tasks[i].id]
          );
        }
        break;
      }
      case "task:delete": {
        const td = payload.task;
        await pool.query("DELETE FROM tasks WHERE user_id = $1 AND task_id = $2", [userId, td.id]);
        await pool.query(
          `INSERT INTO task_trash (user_id, task_id, list_id, text, completed, priority, goal_id, completed_at, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (user_id, task_id) DO NOTHING`,
          [userId, td.id, payload.listId || "", td.text, td.completed || false, td.priority || "low", td.goalId || null, td.completedAt || null, td.sortOrder || 0]
        );
        broadcastPayload.task = td;
        break;
      }
      case "task:restore": {
        const tr = payload.item;
        await pool.query("DELETE FROM task_trash WHERE user_id = $1 AND task_id = $2", [userId, tr.id]);
        const existingTask = await pool.query("SELECT id FROM tasks WHERE user_id = $1 AND task_id = $2", [userId, tr.id]);
        if (existingTask.rows.length === 0) {
          const targetListId = payload.targetListId || tr.listId;
          await pool.query(
            `INSERT INTO tasks (user_id, task_id, list_id, text, completed, priority, goal_id, completed_at, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [userId, tr.id, targetListId, tr.text, tr.completed || false, tr.priority || "low", tr.goalId || null, tr.completedAt || null, tr.sortOrder || 0]
          );
        }
        break;
      }
      case "task:delete-permanent": {
        await pool.query("DELETE FROM task_trash WHERE user_id = $1 AND task_id = $2", [userId, payload.taskId]);
        break;
      }
      case "goal:add": {
        const g = payload.goal;
        await pool.query(
          `INSERT INTO goals (user_id, goal_id, name, description, created_at)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, goal_id) DO UPDATE SET name = $3, description = $4, updated_at = NOW()`,
          [userId, g.id, g.name, g.description || "", g.createdAt || new Date().toISOString()]
        );
        break;
      }
      case "goal:update": {
        const gu = payload.goal;
        await pool.query(
          "UPDATE goals SET name = $1, description = $2, updated_at = NOW() WHERE user_id = $3 AND goal_id = $4",
          [gu.name, gu.description || "", userId, gu.id]
        );
        break;
      }
      case "goal:delete": {
        await pool.query("DELETE FROM goals WHERE user_id = $1 AND goal_id = $2", [userId, payload.goalId]);
        break;
      }
      case "lesson:add":
      case "lesson:update": {
        const l = payload.lesson;
        await pool.query(
          `INSERT INTO schedule_entries (user_id, day, lesson, name, start_time, end_time, room, teacher, color, attended, reminder, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (user_id, day, lesson)
           DO UPDATE SET name = $4, start_time = $5, end_time = $6, room = $7, teacher = $8, color = $9, attended = $10, reminder = $11, notes = $12`,
          [userId, l.day, l.lesson, l.name || "", l.startTime || "", l.endTime || "", l.room || "", l.teacher || "", l.color || "emerald", l.attended || false, l.reminder || "none", l.notes || ""]
        );
        break;
      }
      case "lesson:delete": {
        const ld = payload.lesson;
        await pool.query("DELETE FROM schedule_entries WHERE user_id = $1 AND day = $2 AND lesson = $3",
          [userId, ld.day, ld.lesson]);
        await pool.query(
          `INSERT INTO schedule_trash (user_id, day, lesson, name, start_time, end_time, room, teacher, color, attended, reminder, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (user_id, day, lesson) DO NOTHING`,
          [userId, ld.day, ld.lesson, ld.name || "", ld.startTime || "", ld.endTime || "", ld.room || "", ld.teacher || "", ld.color || "emerald", ld.attended || false, ld.reminder || "none", ld.notes || ""]
        );
        break;
      }
      case "lesson:restore": {
        const lr = payload.item;
        await pool.query("DELETE FROM schedule_trash WHERE user_id = $1 AND day = $2 AND lesson = $3",
          [userId, lr.day, lr.lesson]);
        const existingLesson = await pool.query("SELECT id FROM schedule_entries WHERE user_id = $1 AND day = $2 AND lesson = $3",
          [userId, lr.day, lr.lesson]);
        if (existingLesson.rows.length === 0) {
          await pool.query(
            `INSERT INTO schedule_entries (user_id, day, lesson, name, start_time, end_time, room, teacher, color, attended, reminder, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [userId, lr.day, lr.lesson, lr.name || "", lr.startTime || "", lr.endTime || "", lr.room || "", lr.teacher || "", lr.color || "emerald", lr.attended || false, lr.reminder || "none", lr.notes || ""]
          );
        }
        break;
      }
      case "lesson:delete-permanent": {
        await pool.query("DELETE FROM schedule_trash WHERE user_id = $1 AND day = $2 AND lesson = $3",
          [userId, payload.day, payload.lesson]);
        break;
      }
      case "trash:restore-all": {
        if (payload.type === "tasks") {
          const items = await pool.query("SELECT * FROM task_trash WHERE user_id = $1", [userId]);
          for (const row of items.rows) {
            const existing = await pool.query("SELECT id FROM tasks WHERE user_id = $1 AND task_id = $2", [userId, row.task_id]);
            if (existing.rows.length === 0) {
              await pool.query(
                `INSERT INTO tasks (user_id, task_id, list_id, text, completed, priority, goal_id, completed_at, sort_order)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [userId, row.task_id, row.list_id, row.text, row.completed, row.priority, row.goal_id, row.completed_at, row.sort_order]
              );
            }
          }
          await pool.query("DELETE FROM task_trash WHERE user_id = $1", [userId]);
        } else if (payload.type === "lessons") {
          const items = await pool.query("SELECT * FROM schedule_trash WHERE user_id = $1", [userId]);
          for (const row of items.rows) {
            const existing = await pool.query("SELECT id FROM schedule_entries WHERE user_id = $1 AND day = $2 AND lesson = $3",
              [userId, row.day, row.lesson]);
            if (existing.rows.length === 0) {
              await pool.query(
                `INSERT INTO schedule_entries (user_id, day, lesson, name, start_time, end_time, room, teacher, color, attended, reminder, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [userId, row.day, row.lesson, row.name, row.start_time, row.end_time, row.room, row.teacher, row.color, row.attended, row.reminder, row.notes]
              );
            }
          }
          await pool.query("DELETE FROM schedule_trash WHERE user_id = $1", [userId]);
        }
        break;
      }
      case "trash:delete-all": {
        if (payload.type === "tasks") {
          await pool.query("DELETE FROM task_trash WHERE user_id = $1", [userId]);
        } else if (payload.type === "lessons") {
          await pool.query("DELETE FROM schedule_trash WHERE user_id = $1", [userId]);
        }
        break;
      }
      case "trash:restore-selected": {
        if (payload.type === "tasks" && payload.items) {
          for (const item of payload.items) {
            await pool.query("DELETE FROM task_trash WHERE user_id = $1 AND task_id = $2", [userId, item.id]);
            const existing = await pool.query("SELECT id FROM tasks WHERE user_id = $1 AND task_id = $2", [userId, item.id]);
            if (existing.rows.length === 0) {
              await pool.query(
                `INSERT INTO tasks (user_id, task_id, list_id, text, completed, priority, goal_id, completed_at, sort_order)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [userId, item.id, item.listId || "", item.text, item.completed || false, item.priority || "low", item.goalId || null, item.completedAt || null, 0]
              );
            }
          }
        } else if (payload.type === "lessons" && payload.items) {
          for (const item of payload.items) {
            await pool.query("DELETE FROM schedule_trash WHERE user_id = $1 AND day = $2 AND lesson = $3",
              [userId, item.day, item.lesson]);
            const existing = await pool.query("SELECT id FROM schedule_entries WHERE user_id = $1 AND day = $2 AND lesson = $3",
              [userId, item.day, item.lesson]);
            if (existing.rows.length === 0) {
              await pool.query(
                `INSERT INTO schedule_entries (user_id, day, lesson, name, start_time, end_time, room, teacher, color, attended, reminder, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [userId, item.day, item.lesson, item.name || "", item.startTime || "", item.endTime || "", item.room || "", item.teacher || "", item.color || "emerald", item.attended || false, item.reminder || "none", item.notes || ""]
              );
            }
          }
        }
        break;
      }
      case "trash:delete-selected": {
        if (payload.type === "tasks" && payload.ids) {
          for (const id of payload.ids) {
            await pool.query("DELETE FROM task_trash WHERE user_id = $1 AND task_id = $2", [userId, id]);
          }
        } else if (payload.type === "lessons" && payload.ids) {
          for (const id of payload.ids) {
            await pool.query("DELETE FROM schedule_trash WHERE user_id = $1 AND day = $2 AND lesson = $3",
              [userId, id.day, id.lesson]);
          }
        }
        break;
      }
      default:
        return res.status(400).json({ error: `Unknown patch type: ${type}` });
    }

    const io = req.app.get("io");
    const sessionId = req.headers["x-session-id"] || "";
    if (io) {
      io.to(`user:${userId}`).emit("sync:patch", { type, payload: broadcastPayload, sessionId });
    }

    res.json({ message: "Patched", type });
  } catch (err) {
    console.error("Patch error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
