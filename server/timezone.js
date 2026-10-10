// Timezone helpers for the reminder scheduler.
//
// Schedule entries store wall-clock local times ("08:00"), so reminders MUST be
// evaluated against the user's local clock — not the server's. A server running
// in UTC would otherwise fire reminders hours early/late for anyone in another
// timezone. We resolve the user's IANA timezone (e.g. "Asia/Tokyo") with Intl,
// with no external dependency, and fall back to server-local time when the
// timezone is unknown.

function isValidTimeZone(timeZone) {
  if (typeof timeZone !== "string" || !timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Returns the calendar/time fields of `date` as observed in `timeZone`.
function getZonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;

  // Some ICU builds emit "24" for midnight when hour12:false.
  let hour = parseInt(parts.hour, 10);
  if (hour === 24) hour = 0;

  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hour,
    minute: parseInt(parts.minute, 10),
    weekday: WEEKDAY_INDEX[parts.weekday],
  };
}

const pad2 = (n) => String(n).padStart(2, "0");

// Mon=0..Sat=5, Sunday=-1 (the app only schedules Mon-Sat).
function dayIndexFromWeekday(weekday) {
  return weekday >= 1 && weekday <= 6 ? weekday - 1 : -1;
}

function minutesFromParts(parts) {
  return parts.hour * 60 + parts.minute;
}

function dateKeyFromParts(parts) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

// Builds the reminder-evaluation context ({ dayIndex, minutes, dateKey }) for a
// given instant, either in the user's timezone or in server-local time.
function getContext(date, timeZone) {
  if (isValidTimeZone(timeZone)) {
    const parts = getZonedParts(date, timeZone);
    return {
      dayIndex: dayIndexFromWeekday(parts.weekday),
      minutes: minutesFromParts(parts),
      dateKey: dateKeyFromParts(parts),
      timeZone,
    };
  }
  const dow = date.getDay();
  return {
    dayIndex: dayIndexFromWeekday(dow),
    minutes: date.getHours() * 60 + date.getMinutes(),
    dateKey: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    timeZone: null,
  };
}

module.exports = {
  isValidTimeZone,
  getZonedParts,
  dayIndexFromWeekday,
  minutesFromParts,
  dateKeyFromParts,
  getContext,
};
