// Server-side reminder scheduler.
// Authoritative "app closed" delivery path: reads schedule_entries from the DB,
// computes each lesson's reminder window [lessonTime - reminder, lessonTime)
// for TODAY (Mon-Sat), and sends web push to the user's subscriptions.
// Dedup: push_notifications_log (user_id, day, lesson, date) — one push per
// lesson per day, mirroring the client-side notificationsLog behavior.

const { sendPush } = require("./webpush");

function getTodayIndex(now) {
  const dow = now.getDay();
  return dow >= 1 && dow <= 6 ? dow - 1 : -1;
}

function parseTime(str) {
  if (!str) return null;
  const [h, m] = str.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function dateKey(now) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function runReminderScan(pool, now = new Date()) {
  const dayIndex = getTodayIndex(now);
  if (dayIndex === -1) return { sent: 0, skipped: true, entries: 0, handled: 0 };

  const today = dateKey(now);
  const nowTotal = now.getHours() * 60 + now.getMinutes();

  const entries = await pool.query(
    `SELECT user_id, day, lesson, name, start_time, room, teacher, reminder
     FROM schedule_entries
     WHERE day = $1 AND reminder IS NOT NULL AND reminder <> 'none'`,
    [dayIndex]
  );

  let sent = 0;
  let handled = 0;

  for (const lesson of entries.rows) {
    const reminderMinutes = parseInt(lesson.reminder, 10);
    if (Number.isNaN(reminderMinutes)) continue;

    const lessonTime = parseTime(lesson.start_time);
    if (lessonTime === null) continue;

    const notificationTime = lessonTime - reminderMinutes;
    if (nowTotal < notificationTime || nowTotal >= lessonTime) continue;

    // Dedup: уже отправляли сегодня
    const dup = await pool.query(
      `SELECT 1 FROM push_notifications_log WHERE user_id = $1 AND day = $2 AND lesson = $3 AND date = $4`,
      [lesson.user_id, lesson.day, lesson.lesson, today]
    );
    if (dup.rows.length > 0) continue;

    handled++;

    const minutesUntil = lessonTime - nowTotal;
    const lines = [lesson.name || "Lesson"];
    if (minutesUntil > 0) lines.push(`Starts in ${minutesUntil} min`);
    if (lesson.room) lines.push(`Room ${lesson.room}`);
    if (lesson.teacher) lines.push(`Teacher: ${lesson.teacher}`);

    const payload = {
      title: "Upcoming Lesson",
      body: lines.join("\n"),
      tag: `reminder_${lesson.day}_${lesson.lesson}`,
      url: "./#/schedule",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: {
        day: lesson.day,
        lesson: lesson.lesson,
        name: lesson.name || "Lesson",
        minutesUntil,
      },
    };

    const subs = await pool.query(
      "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1",
      [lesson.user_id]
    );

    for (const sub of subs.rows) {
      const subscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
      const result = await sendPush(subscription, payload);
      if (result === "sent") {
        sent++;
      } else if (result === "gone") {
        await pool.query("DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2", [
          lesson.user_id,
          sub.endpoint,
        ]);
      }
      // transient { error } → ignore, keep subscription
    }

    // Помечаем как обработанное независимо от доставки — dedup важнее повторной
    // попытки в том же окне (клиентское время делает то же самое).
    await pool.query(
      `INSERT INTO push_notifications_log (user_id, day, lesson, reminder, date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, day, lesson, date) DO NOTHING`,
      [lesson.user_id, lesson.day, lesson.lesson, lesson.reminder, today]
    );
  }

  return { sent, skipped: false, entries: entries.rows.length, handled };
}

function startScheduler(pool, intervalMs = 30 * 1000) {
  const timer = setInterval(async () => {
    try {
      await runReminderScan(pool);
    } catch (err) {
      console.error("[reminderScheduler]", err.message);
    }
  }, intervalMs);
  timer.unref && timer.unref();
  return timer;
}

module.exports = { runReminderScan, startScheduler, getTodayIndex, dateKey, parseTime };