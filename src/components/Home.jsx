// Home Dashboard — главная страница приложения
// Приветствие | статистика | следующий урок | задачи | расписание | прогресс | быстрые действия
// Использует существующие данные localStorage: scheduleData, todoLists

import React, { useState, useEffect } from "react";
import RightIcon from "../icons/RightIcon";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const GREETING_QUOTES = [
  "Stay focused. One step at a time.",
  "Progress beats perfection.",
  "Small steps every day.",
  "Consistency creates results.",
  "Keep moving forward.",
  "Focus on what matters today.",
  "Make today count.",
  "One task at a time.",
  "Your future self will thank you.",
  "Build habits. Trust the process.",
];

const FOOTER_QUOTES = [
  "Today is a good day to make progress.",
  "One task at a time.",
  "Your future self will thank you.",
  "Consistency wins.",
  "Keep going.",
  "Small progress is still progress.",
];

const parseTime = (str) => {
  if (!str) return null;
  const [h, m] = str.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
};

const getTodayDayIndex = () => {
  const d = new Date().getDay();
  return d >= 1 && d <= 6 ? d - 1 : -1;
};

const getTodayDateString = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getScheduleData = () => {
  try {
    const saved = localStorage.getItem("scheduleData");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const isToday = (completedAt) => {
  if (!completedAt) return false;
  return (
    getTodayDateString() === new Date(completedAt).toISOString().slice(0, 10)
  );
};

function Home({
  onToggleSidebar,
  sidebarOpen,
  tasks,
  lists,
  onPageChange,
  onToggle,
}) {
  const [now, setNow] = useState(() => new Date());
  const [quote] = useState(
    () => GREETING_QUOTES[Math.floor(Math.random() * GREETING_QUOTES.length)],
  );
  const [footerQuote] = useState(
    () => FOOTER_QUOTES[Math.floor(Math.random() * FOOTER_QUOTES.length)],
  );

  // Таймер обновления каждые 60 секунд
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const greeting = getGreeting();
  const currentDayIndex = getTodayDayIndex();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // ----- Данные из localStorage -----
  const scheduleData = getScheduleData();
  const dayData = currentDayIndex !== -1 ? scheduleData[currentDayIndex] : null;

  // ----- Статистика задач -----
  const allTasks = lists.reduce((acc, list) => [...acc, ...list.tasks], []);
  const pendingTasks = allTasks.filter((t) => !t.completed);
  const completedTodayTasks = allTasks.filter(
    (t) => t.completed && isToday(t.completedAt),
  );
  const currentTasks = tasks || [];
  const currentPending = currentTasks.filter((t) => !t.completed);
  const currentCompleted = currentTasks.filter((t) => t.completed);
  const totalTasks = currentTasks.length;
  const completedCount = currentCompleted.length;
  const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  // 5 ближайших pending задач
  const topPending = currentPending.slice(0, 5);

  // ----- Статистика уроков -----
  let todayLessons = [];
  let nextLesson = null;
  let nextLessonStatus = null;

  if (dayData) {
    todayLessons = Object.entries(dayData)
      .map(([num, l]) => ({ lessonNum: parseInt(num), ...l }))
      .filter((l) => l.startTime)
      .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

    for (const lesson of todayLessons) {
      const start = parseTime(lesson.startTime);
      const end = parseTime(lesson.endTime);
      if (start === null) continue;

      if (nowMinutes < start) {
        nextLesson = lesson;
        nextLessonStatus = "upcoming";
        break;
      }
      if (end && nowMinutes >= start && nowMinutes < end) {
        nextLesson = lesson;
        nextLessonStatus = "inProgress";
        break;
      }
    }
  }

  const formatTimeUntil = () => {
    if (!nextLesson || nextLessonStatus === "inProgress") return null;
    const start = parseTime(nextLesson.startTime);
    if (start === null) return null;
    const diff = start - nowMinutes;

    if (diff <= 0) return "Starts now";
    if (diff < 60) return `Starts in ${diff} min`;

    const days = Math.floor(diff / (60 * 24));
    if (days >= 1) return "Starts tomorrow";

    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (mins === 0) return `Starts in ${hours}h`;
    return `Starts in ${hours}h ${mins}m`;
  };

  const dailySummary = () => {
    const h = new Date().getHours();
    if (h >= 20 || h < 7) {
      const allDone = completedCount === totalTasks && totalTasks > 0;
      return allDone
        ? "All tasks completed 🎉"
        : "Day completed. See you tomorrow.";
    }
    if (
      todayLessons.length === 0 &&
      currentPending.length === 0 &&
      completedCount === 0
    ) {
      return "You are free today.";
    }
    const allDone = completedCount === totalTasks && totalTasks > 0;
    if (allDone) return "All tasks completed 🎉";
    return `You have ${todayLessons.length} lesson${todayLessons.length !== 1 ? "s" : ""} and ${currentPending.length} task${currentPending.length !== 1 ? "s" : ""} remaining today.`;
  };

  const timeUntilStr = formatTimeUntil();

  const priorityColors = {
    high: "text-red-400",
    medium: "text-amber-400",
    low: "text-zinc-500",
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header — sidebar toggle + greeting (как в Study Schedule) */}
      <div className="flex-shrink-0 flex items-start gap-4 pt-14 sm:pt-16 px-4 sm:px-6 max-w-2xl mx-auto w-full pb-5">
        <button
          onClick={onToggleSidebar}
          className={`p-2 sm:p-3 bg-zinc-800/80 backdrop-blur-sm rounded-xl hover:scale-110 active:scale-95 transition-all duration-200 flex-shrink-0 ${sidebarOpen ? "opacity-0 pointer-events-none" : ""}`}
          aria-label="Toggle sidebar">
          <RightIcon className="w-5 h-5 text-zinc-400 hover:text-emerald-400 transition-all" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {greeting}
          </h1>
          <p className="text-zinc-500 text-sm mt-2">{quote}</p>
          <p className="text-zinc-600 text-xs sm:text-sm mt-3">
            {dailySummary()}
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-800/30 rounded-xl px-4 py-3 border border-zinc-700/30">
              <p className="text-xs text-zinc-500">Today's Lessons</p>
              <p className="text-xl font-bold text-white mt-0.5">
                {todayLessons.length} lesson
                {todayLessons.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="bg-zinc-800/30 rounded-xl px-4 py-3 border border-zinc-700/30">
              <p className="text-xs text-zinc-500">Pending Tasks</p>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">
                {currentPending.length} task
                {currentPending.length !== 1 ? "s" : ""} left
              </p>
            </div>
            <div className="bg-zinc-800/30 rounded-xl px-4 py-3 border border-zinc-700/30">
              <p className="text-xs text-zinc-500">Completed</p>
              <p className="text-xl font-bold text-white mt-0.5">
                {completedCount} completed
              </p>
            </div>
            <div className="bg-zinc-800/30 rounded-xl px-4 py-3 border border-zinc-700/30">
              <p className="text-xs text-zinc-500">Upcoming Lesson</p>
              <p className="text-sm font-semibold text-white mt-0.5 truncate">
                {nextLesson ? nextLesson.name : "No lessons today"}
              </p>
              {nextLesson && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  Starts at {nextLesson.startTime}
                </p>
              )}
            </div>
          </div>

          {/* Next Lesson — большая карточка */}
          {nextLesson && (
            <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/30 px-5 py-4">
              <p className="text-xs text-zinc-500 mb-3">Next Lesson</p>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-lg font-bold text-white">
                    {nextLesson.name}
                  </p>
                  {nextLesson.startTime && nextLesson.endTime && (
                    <p className="text-sm text-zinc-400 mt-1">
                      {nextLesson.startTime} — {nextLesson.endTime}
                    </p>
                  )}
                  {nextLesson.room && (
                    <p className="text-sm text-zinc-500 mt-1">
                      Room {nextLesson.room}
                    </p>
                  )}
                  {nextLesson.teacher && (
                    <p className="text-sm text-zinc-500">
                      {nextLesson.teacher}
                    </p>
                  )}
                </div>
                {timeUntilStr && (
                  <p
                    key={timeUntilStr}
                    className="text-sm font-semibold text-emerald-400 flex-shrink-0 animate-fade-in">
                    {nextLessonStatus === "inProgress"
                      ? "In progress"
                      : timeUntilStr}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Today's Schedule */}
          <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/30 px-5 py-4">
            <p className="text-xs text-zinc-500 mb-3">
              {currentDayIndex !== -1 ? DAYS[currentDayIndex] : "Today"}
            </p>
            {todayLessons.length > 0 ? (
              <div className="space-y-3">
                {todayLessons.map((lesson) => (
                  <div
                    key={lesson.lessonNum}
                    className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {lesson.name}
                      </p>
                      {lesson.room && (
                        <p className="text-xs text-zinc-500">
                          Room {lesson.room}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 flex-shrink-0 ml-4">
                      {lesson.startTime} — {lesson.endTime}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                No lessons scheduled for today
              </p>
            )}
          </div>

          {/* Today's Tasks — 5 ближайших */}
          {topPending.length > 0 && (
            <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/30 px-5 py-4">
              <p className="text-xs text-zinc-500 mb-3">Today's Tasks</p>
              <div className="space-y-2">
                {topPending.map((task) => (
                  <div key={task.id} className="flex items-center gap-3">
                    <button
                      onClick={() => onToggle(task.id)}
                      className="w-4 h-4 rounded border border-zinc-600 flex-shrink-0 hover:border-emerald-500 transition-colors">
                      {task.completed && (
                        <svg
                          className="w-full h-full text-emerald-400"
                          fill="currentColor"
                          viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </button>
                    <p className="flex-1 text-sm text-white truncate">
                      {task.text}
                    </p>
                    {task.priority && (
                      <span
                        className={`text-xs font-medium ${priorityColors[task.priority] || "text-zinc-500"}`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {currentPending.length > 5 && (
                <button
                  onClick={() => onPageChange("tasks")}
                  className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                  View All Tasks
                </button>
              )}
            </div>
          )}

          {/* Progress Bar */}
          <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/30 px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-sm">
                {completedCount} of {totalTasks} completed
              </p>
              <p className="text-zinc-500 text-sm">{Math.round(progress)}%</p>
            </div>
            <div className="w-full h-2 bg-zinc-800/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-green-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <p className="text-xs text-zinc-500 mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => onPageChange("tasks")}
                className="bg-zinc-800/30 hover:bg-zinc-800/50 border border-zinc-700/30 rounded-xl px-4 py-3 text-center transition-all duration-200">
                <span className="text-lg block mb-1">📋</span>
                <span className="text-xs text-zinc-400">New Task</span>
              </button>

              <button
                onClick={() => onPageChange("schedule")}
                className="bg-zinc-800/30 hover:bg-zinc-800/50 border border-zinc-700/30 rounded-xl px-4 py-3 text-center transition-all duration-200">
                <span className="text-lg block mb-1">📅</span>
                <span className="text-xs text-zinc-400">Open Schedule</span>
              </button>
              <div className="relative bg-zinc-800/15 border border-zinc-700/20 rounded-xl px-4 py-3 text-center opacity-60 cursor-default pointer-events-none select-none">
                <span className="text-lg block mb-1 opacity-70">📅</span>
                <span className="text-xs text-zinc-500">Calendar</span>
                <span className="absolute -top-1.5 -right-1.5 bg-zinc-700/80 text-zinc-400 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  Coming Soon
                </span>
              </div>

              <div className="relative bg-zinc-800/15 border border-zinc-700/20 rounded-xl px-4 py-3 text-center opacity-60 cursor-default pointer-events-none select-none">
                <span className="text-lg block mb-1 opacity-70">📝</span>
                <span className="text-xs text-zinc-500">Notes</span>
                <span className="absolute -top-1.5 -right-1.5 bg-zinc-700/80 text-zinc-400 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>

          {/* Motivation Footer */}
          <p className="text-xs text-zinc-600 text-center pt-2 pb-4">
            {footerQuote}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
