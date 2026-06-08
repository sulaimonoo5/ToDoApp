// Умный приветственный экран с интеграцией расписания
// time detection | schedule analysis | greeting selection | quote fallback | startup animation | next lesson logic

import React, { useState, useEffect } from "react";

const QUOTES = [
  "Stay focused. One step at a time.",
  "Small progress is still progress.",
  "A clear plan creates a calm mind.",
  "Make today count.",
  "Consistency beats intensity.",
  "One task at a time.",
  "Keep moving forward.",
  "Every day is a new opportunity.",
  "Done is better than perfect.",
  "Your future self will thank you.",
  "Build habits. Trust the process.",
  "Progress comes from repetition.",
  "Focus on what matters today.",
  "A little better every day.",
  "Start now. Improve later.",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getTimePeriod = () => {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  const t = h * 60 + m;
  if (t >= 420 && t < 720) return "morning";
  if (t >= 720 && t < 1080) return "afternoon";
  if (t >= 1080 && t < 1200) return "evening";
  return "night";
};

const getGreeting = (period) => {
  switch (period) {
    case "morning": return { text: "Good Morning", emoji: "☀️" };
    case "afternoon": return { text: "Good Afternoon", emoji: "🌤️" };
    case "evening": return { text: "Good Evening", emoji: "🌙" };
    case "night": return { text: "Welcome Back", emoji: "🌌" };
  }
};

const getTodayDayIndex = () => {
  const d = new Date().getDay();
  return d >= 1 && d <= 6 ? d - 1 : -1;
};

const getScheduleData = () => {
  try {
    const saved = localStorage.getItem("scheduleData");
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
};

const parseTime = (str) => {
  if (!str) return null;
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
};

function WelcomeScreen({ onComplete }) {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState(0);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const period = getTimePeriod();
  const greeting = getGreeting(period);
  const scheduleData = getScheduleData();
  const currentDayIdx = getTodayDayIndex();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  // ------ schedule analysis ------
  const getTodayLessons = () => {
    if (!scheduleData || currentDayIdx === -1) return null;
    const dayData = scheduleData[currentDayIdx];
    if (!dayData) return null;

    const lessons = Object.entries(dayData)
      .map(([num, l]) => ({ lessonNum: parseInt(num), ...l }))
      .filter((l) => l.startTime)
      .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

    if (lessons.length === 0) return null;

    const completed = lessons.filter((l) => parseTime(l.endTime) <= nowMinutes);
    const upcoming = lessons.filter((l) => parseTime(l.startTime) > nowMinutes);
    const inProgress = lessons.filter(
      (l) => parseTime(l.startTime) <= nowMinutes && parseTime(l.endTime) > nowMinutes
    );

    return {
      lessons,
      completed,
      upcoming,
      inProgress,
      nextLesson: upcoming[0] || null,
      firstLesson: lessons[0],
      lastLesson: lessons[lessons.length - 1],
      total: lessons.length,
      completedCount: completed.length,
      allDone: completed.length === lessons.length,
      remainingCount: lessons.length - completed.length,
    };
  };

  const getTomorrowInfo = () => {
    if (!scheduleData) return null;
    let tomorrowIdx;
    if (currentDayIdx === -1 || currentDayIdx === 5) tomorrowIdx = 0;
    else tomorrowIdx = currentDayIdx + 1;

    const dayData = scheduleData[tomorrowIdx];
    if (!dayData) return null;

    const lessons = Object.entries(dayData)
      .map(([num, l]) => ({ lessonNum: parseInt(num), ...l }))
      .filter((l) => l.startTime)
      .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

    if (lessons.length === 0) return null;
    return { lessons, total: lessons.length, firstLesson: lessons[0], dayName: DAYS[tomorrowIdx] };
  };

  const todayInfo = getTodayLessons();
  const tomorrowInfo = getTomorrowInfo();

  const getTimeUntil = (startTime) => {
    const diff = parseTime(startTime) - nowMinutes;
    if (diff <= 0) return "starting now";
    if (diff < 60) return `in ${diff} min`;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m === 0 ? `in ${h}h` : `in ${h}h ${m}m`;
  };

  // ------ greeting selection ------
  const getSubtitle = () => {
    // Ночь — всегда завтра
    if (period === "night") {
      if (tomorrowInfo) {
        return {
          line1: `Tomorrow: ${tomorrowInfo.total} lesson${tomorrowInfo.total !== 1 ? "s" : ""} scheduled.`,
          line2: tomorrowInfo.total === 1
            ? `${tomorrowInfo.firstLesson.name} at ${tomorrowInfo.firstLesson.startTime}.`
            : `Starts with ${tomorrowInfo.firstLesson.name} at ${tomorrowInfo.firstLesson.startTime}.`,
        };
      }
      return null;
    }

    // Выходной или нет уроков → fallback
    if (!todayInfo) return null;

    // Утро
    if (period === "morning") {
      return {
        line1: `${todayInfo.total} lesson${todayInfo.total !== 1 ? "s" : ""} today.`,
        line2: `Starts with ${todayInfo.firstLesson.name} at ${todayInfo.firstLesson.startTime}.`,
      };
    }

    // День
    if (period === "afternoon") {
      if (todayInfo.inProgress.length > 0) {
        return { line1: `${todayInfo.inProgress[0].name} is in progress now.`, line2: "" };
      }
      if (todayInfo.nextLesson) {
        return {
          line1: `Next: ${todayInfo.nextLesson.name} at ${todayInfo.nextLesson.startTime}.`,
          line2: `${todayInfo.nextLesson.name} starts ${getTimeUntil(todayInfo.nextLesson.startTime)}.`,
        };
      }
      if (todayInfo.allDone && todayInfo.completedCount === todayInfo.total) {
        return { line1: `${todayInfo.total} lesson${todayInfo.total !== 1 ? "s" : ""} completed today.`, line2: "Great job!" };
      }
      return { line1: `${todayInfo.completedCount} done, ${todayInfo.remainingCount} left today.`, line2: "" };
    }

    // Вечер
    if (period === "evening") {
      if (todayInfo.inProgress.length > 0) {
        return { line1: `${todayInfo.inProgress[0].name} is still going.`, line2: "" };
      }
      if (todayInfo.completedCount === todayInfo.total) {
        return {
          line1: "All lessons completed today.",
          line2: `You completed ${todayInfo.total} lesson${todayInfo.total !== 1 ? "s" : ""}. Great job!`,
        };
      }
      if (todayInfo.remainingCount > 0) {
        return {
          line1: `${todayInfo.remainingCount} lesson${todayInfo.remainingCount !== 1 ? "s" : ""} remaining today.`,
          line2: todayInfo.nextLesson ? `Next: ${todayInfo.nextLesson.name} at ${todayInfo.nextLesson.startTime}.` : "",
        };
      }
    }

    return null;
  };

  const subtitle = getSubtitle();

  // ------ startup animation ------
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    const t1 = setTimeout(() => setStage(1), 400);
    const t2 = setTimeout(onComplete, 2800);
    return () => { cancelAnimationFrame(frame); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div className="text-center px-6 max-w-sm">
        {/* Этап 1: приветствие */}
        <div
          className={`transition-all duration-700 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[30px]"
          }`}
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            {greeting.text}
          </h1>
          <div className="text-3xl mt-3">{greeting.emoji}</div>
        </div>

        {/* Этап 2: информация о расписании или цитата */}
        <div
          className={`mt-8 transition-all duration-700 ease-out ${
            stage >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[30px]"
          }`}
        >
          {stage >= 1 && subtitle ? (
            <div className="space-y-2">
              <p className="text-zinc-300 text-sm leading-relaxed">{subtitle.line1}</p>
              {subtitle.line2 && (
                <p className="text-emerald-400/80 text-xs font-medium">{subtitle.line2}</p>
              )}
            </div>
          ) : stage >= 1 ? (
            <p className="text-zinc-300 text-sm mt-8 leading-relaxed">{quote}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
