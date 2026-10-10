// Server-side reminder scheduler.
// Authoritative "app closed" delivery path: reads schedule_entries from the DB,
// computes each lesson's reminder window [lessonTime - reminder, lessonTime)
// for the user's LOCAL day (Mon-Sat), and sends web push to that user's
// subscriptions.
//
// Timezone: lesson times are wall-clock local times, so the window is evaluated
// in the user's IANA timezone (users.timezone), falling back to server-local
// time when unknown. See ./timezone.js.
//
// Dedup: push_notifications_log (user_id, day, lesson, date) — one push per
// lesson per local day, mirroring the client-side notificationsLog behavior.

const { sendPush: defaultSendPush } = require("./webpush");
const { isValidTimeZone, getContext } = require("./timezone");

function parseTime(str) {
  if (!str) return null;
  const [h, m] = str.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Runs one scan. `now` is an absolute instant; each user's local day/time is
// derived from it. `options.sendPush` allows injecting a sender in tests.
async function runReminderScan(pool, now = new Date(), options = {}) {
  const sendPush = options.sendPush || defaultSendPush;

  const result = await pool.query(
    `SELECT s.user_id, u.timezone, s.day, s.lesson, s.name, s.start_time, s.room, s.teacher, s.reminder
     FROM schedule_entries s
     JOIN users u ON u.id = s.user_id
     WHERE s.reminder IS NOT NULL AND s.reminder <> 'none'`
  );

  // Group entries by (user, timezone) so each distinct local clock is evaluated
  // once from the same instant.
  const groups = new Map();
  for (const row of result.rows) {
    const tz = isValidTimeZone(row.timezone) ? row.timezone : null;
    const key = `${row.user_id}::${tz || "SERVER"}`;
    if (!groups.has(key)) groups.set(key, { userId: row.user_id, timeZone: tz, entries: [] });
    groups.get(key).entries.push(row);
  }

  let sent = 0;
  let handled = 0;
  let evaluated = 0;

  for (const group of groups.values()) {
    const ctx = getContext(now, group.timeZone);
    if (ctx.dayIndex === -1) continue; // Sunday — no lessons

    for (const lesson of group.entries) {
      if (lesson.day !== ctx.dayIndex) continue;

      const reminderMinutes = parseInt(lesson.reminder, 10);
      if (Number.isNaN(reminderMinutes)) continue;

      const lessonTime = parseTime(lesson.start_time);
      if (lessonTime === null) continue;

      const notificationTime = lessonTime - reminderMinutes;
      if (ctx.minutes < notificationTime || ctx.minutes >= lessonTime) continue;

      evaluated++;

      // Dedup: already sent for this user's local day.
      const dup = await pool.query(
        `SELECT 1 FROM push_notifications_log WHERE user_id = $1 AND day = $2 AND lesson = $3 AND date = $4`,
        [lesson.user_id, lesson.day, lesson.lesson, ctx.dateKey]
      );
      if (dup.rows.length > 0) continue;

      handled++;

      const minutesUntil = lessonTime - ctx.minutes;
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
        const outcome = await sendPush(subscription, payload);
        if (outcome === "sent") {
          sent++;
        } else if (outcome === "gone") {
          await pool.query("DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2", [
            lesson.user_id,
            sub.endpoint,
          ]);
        }
        // transient { error } → ignore, keep subscription
      }

      // Mark handled regardless of delivery: dedup beats retrying within the
      // same window (the client-side path behaves the same way).
      await pool.query(
        `INSERT INTO push_notifications_log (user_id, day, lesson, reminder, date)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, day, lesson, date) DO NOTHING`,
        [lesson.user_id, lesson.day, lesson.lesson, lesson.reminder, ctx.dateKey]
      );
    }
  }

  return { sent, skipped: false, entries: result.rows.length, evaluated, handled };
}

// Housekeeping: drop old dedup rows so push_notifications_log cannot grow
// without bound. Kept comfortably longer than the longest reminder window.
async function cleanupOldPushLog(pool, retentionDays = 7) {
  const days = Number.isFinite(retentionDays) && retentionDays > 0 ? Math.floor(retentionDays) : 7;
  const res = await pool.query(
    `DELETE FROM push_notifications_log WHERE created_at < NOW() - ($1 || ' days')::interval`,
    [String(days)]
  );
  return res.rowCount || 0;
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

module.exports = { runReminderScan, startScheduler, cleanupOldPushLog, parseTime };
