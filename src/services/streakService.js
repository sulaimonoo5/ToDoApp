const STREAK_KEY = "dailyStreak";

const defaultStreak = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
};

export function getStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? JSON.parse(raw) : { ...defaultStreak };
  } catch {
    return { ...defaultStreak };
  }
}

export function updateStreak(date) {
  const streak = getStreak();
  const today =
    typeof date === "string" ? date : date.toISOString().slice(0, 10);

  if (streak.lastActiveDate === today) return streak;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (streak.lastActiveDate === yesterdayStr) {
    streak.currentStreak += 1;
  } else {
    streak.currentStreak = 1;
  }

  streak.lastActiveDate = today;
  streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);

  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  return streak;
}
