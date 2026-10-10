"use strict";

const test = require("node:test");
const assert = require("node:assert");
const {
  isValidTimeZone,
  getZonedParts,
  getContext,
  dayIndexFromWeekday,
} = require("../server/timezone");

test("isValidTimeZone accepts IANA zones and rejects junk", () => {
  assert.equal(isValidTimeZone("Asia/Tokyo"), true);
  assert.equal(isValidTimeZone("America/New_York"), true);
  assert.equal(isValidTimeZone("Not/AZone"), false);
  assert.equal(isValidTimeZone(""), false);
  assert.equal(isValidTimeZone(null), false);
  assert.equal(isValidTimeZone(undefined), false);
});

test("dayIndexFromWeekday maps Mon..Sat to 0..5 and Sunday to -1", () => {
  assert.equal(dayIndexFromWeekday(1), 0); // Mon
  assert.equal(dayIndexFromWeekday(6), 5); // Sat
  assert.equal(dayIndexFromWeekday(0), -1); // Sun
});

test("getZonedParts resolves local wall-clock time per timezone", () => {
  const instant = new Date("2026-01-05T00:30:00.000Z"); // Monday 00:30 UTC
  const tokyo = getZonedParts(instant, "Asia/Tokyo"); // UTC+9
  assert.equal(tokyo.weekday, 1);
  assert.equal(tokyo.hour, 9);
  assert.equal(tokyo.minute, 30);
  assert.equal(tokyo.day, 5);

  const ny = getZonedParts(instant, "America/New_York"); // UTC-5 in January
  assert.equal(ny.weekday, 0); // Sunday
  assert.equal(ny.hour, 19);
  assert.equal(ny.day, 4);
});

test("getContext crosses the date boundary in the user's timezone", () => {
  const instant = new Date("2026-01-04T20:00:00.000Z"); // Sunday 20:00 UTC
  const ctx = getContext(instant, "Asia/Tokyo"); // Monday 05:00
  assert.equal(ctx.timeZone, "Asia/Tokyo");
  assert.equal(ctx.dayIndex, 0); // Monday
  assert.equal(ctx.dateKey, "2026-01-05");
  assert.equal(ctx.minutes, 5 * 60);
});

test("getContext falls back to server-local time for an unknown zone", () => {
  const instant = new Date("2026-01-05T00:30:00.000Z");
  const ctx = getContext(instant, "Bogus/Zone");
  assert.equal(ctx.timeZone, null);

  const expectedDate = `${instant.getFullYear()}-${String(instant.getMonth() + 1).padStart(2, "0")}-${String(
    instant.getDate()
  ).padStart(2, "0")}`;
  assert.equal(ctx.dateKey, expectedDate);
  assert.equal(ctx.minutes, instant.getHours() * 60 + instant.getMinutes());
});
