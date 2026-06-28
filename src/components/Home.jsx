// Home Dashboard — главная страница приложения
// Приветствие | статистика | следующий урок | задачи | расписание | прогресс | быстрые действия
// Использует существующие данные localStorage: scheduleData, todoLists

import React, { useState, useEffect } from "react";
import RightIcon from "../icons/RightIcon";
import { getStreak } from "../services/streakService";
import { CalendarDays, Clock, Flame, Target, ClipboardList, NotebookPen, Check, List } from "lucide-react";

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
  goals = [],
  onPageChange,
  onToggle,
  now: propNow,
}) {
  const [now, setNow] = useState(() => new Date());
  const [quote] = useState(
    () => GREETING_QUOTES[Math.floor(Math.random() * GREETING_QUOTES.length)],
  );
  const [footerQuote] = useState(
    () => FOOTER_QUOTES[Math.floor(Math.random() * FOOTER_QUOTES.length)],
  );

  useEffect(() => {
    if (propNow) setNow(propNow);
  }, [propNow]);

  // Таймер обновления каждые 60 секунд (резерв, если propNow не передан)
  useEffect(() => {
    if (propNow) return;
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [propNow]);

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
        ? "All tasks completed"
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
    if (allDone) return "All tasks completed";
    return `You have ${todayLessons.length} lesson${todayLessons.length !== 1 ? "s" : ""} and ${currentPending.length} task${currentPending.length !== 1 ? "s" : ""} remaining today.`;
  };

  const timeUntilStr = formatTimeUntil();

  // Дата и время для единого Header
  const getDateStr = (d) => {
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  };
  const getTimeStr = (d) => `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;

  // Streak
  const streakData = getStreak();

  // Weekly statistics
  const getWeekRange = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { monday, sunday };
  };

  const { monday, sunday } = getWeekRange();
  const allTasksForStats = lists.reduce((acc, list) => [...acc, ...list.tasks], []);
  const weeklyTasksCompleted = allTasksForStats.filter((t) => {
    if (!t.completed || !t.completedAt) return false;
    const d = new Date(t.completedAt);
    return d >= monday && d <= sunday;
  }).length;

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayActivity = dayNames.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = allTasksForStats.filter((t) => {
      if (!t.completed || !t.completedAt) return false;
      return t.completedAt.slice(0, 10) === dateStr;
    }).length;
    return { day: dayNames[i], count };
  });
  const maxActivity = Math.max(...dayActivity.map((d) => d.count), 1);
  const weeklyCompletionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const priorityColors = {
    high: "text-red-400",
    medium: "text-amber-400",
    low: "text-zinc-500",
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Единый закреплённый Header */}
      <div className="sticky top-0 z-20 bg-black/70 backdrop-blur-md border-b border-zinc-800/50 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 py-3">
            <button
              onClick={onToggleSidebar}
              className={`p-2 sm:p-3 bg-zinc-800/80 backdrop-blur-sm rounded-xl hover:scale-110 active:scale-95 transition-all duration-200 flex-shrink-0 ${sidebarOpen ? "opacity-0 pointer-events-none" : ""}`}
              aria-label="Toggle sidebar">
              <RightIcon className="w-5 h-5 text-zinc-400 hover:text-emerald-400 transition-all" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-white">{greeting}</h1>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-zinc-400 whitespace-nowrap"><CalendarDays className="w-3 h-3 inline mr-1" />{getDateStr(now)}</span>
              <span className="text-xs text-zinc-400 font-mono whitespace-nowrap"><Clock className="w-3 h-3 inline mr-1" />{getTimeStr(now)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-5">
          <div className="animate-fade-in">
            <p className="text-zinc-500 text-sm">{quote}</p>
            <p className="text-zinc-600 text-xs sm:text-sm mt-1.5">
              {dailySummary()}
            </p>
            {streakData.currentStreak > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-sm font-semibold text-orange-400">{streakData.currentStreak} Day Streak</span>
              </div>
            )}
          </div>
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

          {/* Weekly Statistics */}
          <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/30 px-5 py-4">
            <p className="text-xs text-zinc-500 mb-3">This Week</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <p className="text-xl font-bold text-white">{weeklyTasksCompleted}</p>
                <p className="text-xs text-zinc-500">Tasks Completed</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white">—</p>
                <p className="text-xs text-zinc-500">Lessons Attended</p>
              </div>
              <div>
                <p className="text-xl font-bold text-orange-400">{streakData.currentStreak}</p>
                <p className="text-xs text-zinc-500">Current Streak</p>
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-400">{weeklyCompletionRate}%</p>
                <p className="text-xs text-zinc-500">Completion Rate</p>
              </div>
            </div>
            <div className="space-y-1">
              {dayActivity.map(({ day, count }) => (
                <div key={day} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 w-8">{day}</span>
                  <div className="flex-1 h-3 bg-zinc-800/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/60 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max((count / maxActivity) * 100, count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 w-4 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Current Goals — максимум 3 */}
          {goals.length > 0 && (
            <div className="bg-zinc-800/30 rounded-xl border border-zinc-700/30 px-5 py-4">
              <p className="text-xs text-zinc-500 mb-3">Current Goals</p>
              <div className="space-y-3">
                {goals.slice(0, 3).map((goal) => {
                  const linked = allTasksForStats.filter((t) => t.goalId === goal.id);
                  const total = linked.length;
                  const completed = linked.filter((t) => t.completed).length;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <div key={goal.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-zinc-300 truncate"><Target className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />{goal.name}</span>
                        <span className="text-xs text-emerald-400 font-medium ml-2">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-green-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {goals.length > 3 && (
                <button
                  onClick={() => onPageChange("goals")}
                  className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  View All Goals
                </button>
              )}
            </div>
          )}

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
                        <Check className="w-full h-full text-emerald-400" strokeWidth={3} />
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
                <ClipboardList className="w-5 h-5 text-zinc-400 mx-auto mb-1" />
                <span className="text-xs text-zinc-400">New Task</span>
              </button>

              <button
                onClick={() => onPageChange("schedule")}
                className="bg-zinc-800/30 hover:bg-zinc-800/50 border border-zinc-700/30 rounded-xl px-4 py-3 text-center transition-all duration-200">
                <CalendarDays className="w-5 h-5 text-zinc-400 mx-auto mb-1" />
                <span className="text-xs text-zinc-400">Open Schedule</span>
              </button>
              <div className="relative bg-zinc-800/15 border border-zinc-700/20 rounded-xl px-4 py-3 text-center opacity-60 cursor-default pointer-events-none select-none">
                <CalendarDays className="w-5 h-5 text-zinc-500 mx-auto mb-1 opacity-70" />
                <span className="text-xs text-zinc-500">Calendar</span>
                <span className="absolute -top-1.5 -right-1.5 bg-zinc-700/80 text-zinc-400 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                  Coming Soon
                </span>
              </div>

              <div className="relative bg-zinc-800/15 border border-zinc-700/20 rounded-xl px-4 py-3 text-center opacity-60 cursor-default pointer-events-none select-none">
                <NotebookPen className="w-5 h-5 text-zinc-500 mx-auto mb-1 opacity-70" />
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
