"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { runReminderScan, cleanupOldPushLog } = require("../server/reminderScheduler");

// Minimal in-memory stand-in for a pg Pool, matching the exact queries the
// scheduler issues. Lets us assert timezone logic, dedup and gone-removal
// without a database or real push delivery.
function makeFakePool({ entries = [], subscriptions = [] } = {}) {
  const logs = [];
  const removed = [];
  return {
    logs,
    removed,
    subscriptions,
    async query(sql, params = []) {
      const s = sql.replace(/\s+/g, " ").trim();
      if (s.includes("FROM schedule_entries s")) {
        return { rows: entries };
      }
      if (s.startsWith("SELECT 1 FROM push_notifications_log")) {
        const [userId, day, lesson, date] = params;
        const found = logs.some(
          (l) => l.userId === userId && l.day === day && l.lesson === lesson && l.date === date
        );
        return { rows: found ? [{}] : [] };
      }
      if (s.startsWith("INSERT INTO push_notifications_log")) {
        const [userId, day, lesson, reminder, date] = params;
        logs.push({ userId, day, lesson, reminder, date });
        return { rows: [] };
      }
      if (s.startsWith("DELETE FROM push_subscriptions")) {
        removed.push(params);
        return { rows: [] };
      }
      if (s.includes("FROM push_subscriptions")) {
        return { rows: subscriptions };
      }
      return { rows: [] };
    },
  };
}

const tokyoLesson = {
  user_id: 1,
  timezone: "Asia/Tokyo",
  day: 0, // Monday
  lesson: 1,
  name: "Math",
  start_time: "10:00",
  room: "A1",
  teacher: "Mr. X",
  reminder: "30",
};

const sub = { endpoint: "https://push.example/1", p256dh: "p256dh-key", auth: "auth-key" };

test("fires at the user's local time (not server time) and then dedups", async () => {
  const pool = makeFakePool({ entries: [tokyoLesson], subscriptions: [sub] });
  const sentPayloads = [];
  const sendPush = async (subscription, payload) => {
    sentPayloads.push(payload);
    return "sent";
  };

  // 00:30 UTC = 09:30 Monday in Tokyo → inside [09:30, 10:00) window (30 min reminder).
  const now = new Date("2026-01-05T00:30:00.000Z");

  const first = await runReminderScan(pool, now, { sendPush });
  assert.equal(first.sent, 1);
  assert.equal(first.handled, 1);
  assert.equal(first.evaluated, 1);
  assert.equal(sentPayloads.length, 1);
  assert.equal(sentPayloads[0].title, "Upcoming Lesson");
  assert.equal(sentPayloads[0].tag, "reminder_0_1");
  assert.equal(pool.logs.length, 1);
  assert.equal(pool.logs[0].date, "2026-01-05");

  // Same window again → already delivered, no duplicate.
  const second = await runReminderScan(pool, now, { sendPush });
  assert.equal(second.sent, 0);
  assert.equal(second.handled, 0);
  assert.equal(pool.logs.length, 1);
});

test("a user in another timezone does not fire at the same instant", async () => {
  const pool = makeFakePool({
    entries: [{ ...tokyoLesson, timezone: "Europe/London" }],
    subscriptions: [sub],
  });
  // 00:30 UTC = 00:30 Monday in London → far before the [09:30, 10:00) window.
  const result = await runReminderScan(pool, new Date("2026-01-05T00:30:00.000Z"), {
    sendPush: async () => "sent",
  });
  assert.equal(result.handled, 0);
  assert.equal(pool.logs.length, 0);
});

test("Sunday local time is skipped entirely", async () => {
  const pool = makeFakePool({
    entries: [{ ...tokyoLesson, timezone: "America/New_York" }],
    subscriptions: [sub],
  });
  // 00:30 UTC Monday = Sunday 19:30 in New York.
  const result = await runReminderScan(pool, new Date("2026-01-05T00:30:00.000Z"), {
    sendPush: async () => "sent",
  });
  assert.equal(result.handled, 0);
});

test("removes the subscription when push reports it gone", async () => {
  const pool = makeFakePool({ entries: [tokyoLesson], subscriptions: [sub] });
  const result = await runReminderScan(pool, new Date("2026-01-05T00:30:00.000Z"), {
    sendPush: async () => "gone",
  });
  assert.equal(result.sent, 0);
  assert.equal(result.handled, 1);
  assert.equal(pool.removed.length, 1);
  assert.deepEqual(pool.removed[0], [1, sub.endpoint]);
});

test("ignores lessons without a usable time or reminder", async () => {
  const pool = makeFakePool({
    entries: [
      { ...tokyoLesson, lesson: 2, start_time: "" },
      { ...tokyoLesson, lesson: 3, reminder: "abc" },
    ],
    subscriptions: [sub],
  });
  const result = await runReminderScan(pool, new Date("2026-01-05T00:30:00.000Z"), {
    sendPush: async () => "sent",
  });
  assert.equal(result.evaluated, 0);
  assert.equal(result.handled, 0);
});

test("cleanupOldPushLog deletes rows older than the retention window", async () => {
  const calls = [];
  const pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rowCount: 3 };
    },
  };
  const deleted = await cleanupOldPushLog(pool, 7);
  assert.equal(deleted, 3);
  assert.match(calls[0].sql, /DELETE FROM push_notifications_log/);
  assert.deepEqual(calls[0].params, ["7"]);
});
