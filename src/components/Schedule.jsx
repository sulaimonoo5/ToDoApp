// Расписание занятий (Study Planner)
// Таблица: строки = пары (1-12), колонки = дни (Пн-Сб)
// Клик по ячейке → модалка добавления/редактирования
// Drag & Drop между ячейками
// localStorage ключ: scheduleData
// Удаление: урок → lessonTrash (с deletedAt) → Undo toast на 4 сек → если Undo → восстановление

import React, { useState, useEffect, useRef } from "react";
import RightIcon from "../icons/RightIcon";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LESSONS = Array.from({ length: 12 }, (_, i) => i + 1);
const TRASH_DAYS = 30;

const COLORS = ["emerald", "blue", "amber", "purple", "red", "pink", "cyan", "orange"];
const COLOR_MAP = {
  emerald: { text: "text-emerald-300", accent: "bg-emerald-500/70", border: "border-emerald-500/40" },
  blue: { text: "text-blue-300", accent: "bg-blue-500/70", border: "border-blue-500/40" },
  amber: { text: "text-amber-300", accent: "bg-amber-500/70", border: "border-amber-500/40" },
  purple: { text: "text-purple-300", accent: "bg-purple-500/70", border: "border-purple-500/40" },
  red: { text: "text-red-300", accent: "bg-red-500/70", border: "border-red-500/40" },
  pink: { text: "text-pink-300", accent: "bg-pink-500/70", border: "border-pink-500/40" },
  cyan: { text: "text-cyan-300", accent: "bg-cyan-500/70", border: "border-cyan-500/40" },
  orange: { text: "text-orange-300", accent: "bg-orange-500/70", border: "border-orange-500/40" },
};

const REMINDER_OPTIONS = [
  { value: "none", label: "None" },
  { value: "5", label: "5 minutes before" },
  { value: "10", label: "10 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
];

const DEFAULT_FORM = {
  name: "", teacher: "", room: "", notes: "",
  color: "emerald",
  startTime: "08:00", endTime: "08:45", reminder: "none",
};

function Schedule({ onToggleSidebar, sidebarOpen }) {
  const [data, setData] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Drag & Drop state
  const [dragSource, setDragSource] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);

  // Анимации создания/удаления ячеек
  const [newCells, setNewCells] = useState(new Set());
  const [deletingCells, setDeletingCells] = useState(new Set());

  // Trash + Undo для уроков
  const [lessonTrash, setLessonTrash] = useState([]);
  const [isLessonTrashOpen, setIsLessonTrashOpen] = useState(false);
  const [recentlyDeletedLesson, setRecentlyDeletedLesson] = useState(null);
  const lessonUndoTimeoutRef = useRef(null);

  // ------ localStorage: scheduleData ------
  useEffect(() => {
    try {
      const saved = localStorage.getItem("scheduleData");
      if (saved) setData(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("scheduleData", JSON.stringify(data));
  }, [data]);

  // ------ localStorage: lessonTrash ------
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lessonTrash");
      if (saved) {
        const parsed = JSON.parse(saved);
        const valid = parsed.filter((t) => !isTrashExpired(t.deletedAt));
        setLessonTrash(valid);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("lessonTrash", JSON.stringify(lessonTrash));
  }, [lessonTrash]);

  const isTrashExpired = (deletedAt) => {
    const now = Date.now();
    const daysDiff = (now - deletedAt) / (1000 * 60 * 60 * 24);
    return daysDiff > TRASH_DAYS;
  };

  // ESC close modal + body scroll lock
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          setIsModalOpen(false);
          setSelectedCell(null);
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isModalOpen]);

  // ESC для Lesson Trash
  useEffect(() => {
    if (isLessonTrashOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") setIsLessonTrashOpen(false);
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isLessonTrashOpen]);

  const today = new Date().getDay();
  const currentDayIndex = today >= 1 && today <= 6 ? today - 1 : -1;

  // Статистика расписания
  const totalLessons = Object.values(data).reduce(
    (sum, day) => sum + (day ? Object.keys(day).length : 0), 0
  );
  const dayCounts = DAYS.map((_, i) => (data[i] ? Object.keys(data[i]).length : 0));
  const maxCount = Math.max(...dayCounts);
  const busiestDay = maxCount > 0 ? DAYS[dayCounts.indexOf(maxCount)] : "—";
  const totalSlots = LESSONS.length * DAYS.length;
  const freeSlots = totalSlots - totalLessons;

  const hasAnyLesson = totalLessons > 0;

  // ------ Next Lesson ------
  const getNextLesson = () => {
    if (currentDayIndex === -1) return null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const dayData = data[currentDayIndex];
    if (!dayData) return null;

    const lessons = Object.entries(dayData)
      .map(([lessonNum, lesson]) => ({
        lessonNum: parseInt(lessonNum),
        ...lesson,
      }))
      .filter((l) => l.startTime)
      .sort((a, b) => {
        const [aH, aM] = a.startTime.split(":").map(Number);
        const [bH, bM] = b.startTime.split(":").map(Number);
        return aH * 60 + aM - (bH * 60 + bM);
      });

    for (const lesson of lessons) {
      const [h, m] = lesson.startTime.split(":").map(Number);
      const lessonStartMinutes = h * 60 + m;
      if (lessonStartMinutes > currentMinutes) return lesson;
    }
    return null;
  };

  const nextLesson = getNextLesson();

  const getTimeUntil = (startTime) => {
    if (!startTime) return "";
    const [h, m] = startTime.split(":").map(Number);
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const lessonMinutes = h * 60 + m;
    const diff = lessonMinutes - nowMinutes;
    if (diff <= 0) return "Starting now";
    if (diff < 60) return `Starts in ${diff} min`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (mins === 0) return `Starts in ${hours}h`;
    return `Starts in ${hours}h ${mins}m`;
  };

  // ------ Modal handlers ------
  const openModal = (day, lesson) => {
    const existing = data[day]?.[lesson];
    setSelectedCell({ day, lesson });
    if (existing) {
      setForm({ ...DEFAULT_FORM, ...existing });
    } else {
      setForm({ ...DEFAULT_FORM });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const isNew = !data[selectedCell.day]?.[selectedCell.lesson];

    setData((prev) => ({
      ...prev,
      [selectedCell.day]: {
        ...(prev[selectedCell.day] || {}),
        [selectedCell.lesson]: { ...form, name: form.name.trim() },
      },
    }));

    if (isNew) {
      const key = `${selectedCell.day}-${selectedCell.lesson}`;
      setNewCells((prev) => new Set(prev).add(key));
      setTimeout(() => {
        setNewCells((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 300);
    }

    setIsModalOpen(false);
    setSelectedCell(null);
  };

  const handleDelete = () => {
    if (!selectedCell) return;
    const key = `${selectedCell.day}-${selectedCell.lesson}`;
    const lessonData = data[selectedCell.day]?.[selectedCell.lesson];
    if (!lessonData) return;

    // Сохраняем в корзину
    const trashItem = {
      id: `lesson_${Date.now()}`,
      ...lessonData,
      day: selectedCell.day,
      lesson: selectedCell.lesson,
      deletedAt: Date.now(),
    };
    setLessonTrash((prev) => [...prev, trashItem]);

    // Показываем Undo toast
    setRecentlyDeletedLesson(trashItem);

    // Анимация удаления
    setDeletingCells((prev) => new Set(prev).add(key));

    setTimeout(() => {
      setData((prev) => {
        const newData = { ...prev };
        if (newData[selectedCell.day]) {
          const newDay = { ...newData[selectedCell.day] };
          delete newDay[selectedCell.lesson];
          if (Object.keys(newDay).length === 0) {
            delete newData[selectedCell.day];
          } else {
            newData[selectedCell.day] = newDay;
          }
        }
        return newData;
      });
      setDeletingCells((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 200);

    // Авто-скрытие тоста через 4 сек
    if (lessonUndoTimeoutRef.current) clearTimeout(lessonUndoTimeoutRef.current);
    lessonUndoTimeoutRef.current = setTimeout(() => {
      setRecentlyDeletedLesson(null);
    }, 4000);

    setIsModalOpen(false);
    setSelectedCell(null);
  };

  const undoLessonDelete = () => {
    if (!recentlyDeletedLesson) return;
    const { id, day, lesson, deletedAt, ...lessonData } = recentlyDeletedLesson;
    const key = `${day}-${lesson}`;

    setData((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] || {}),
        [lesson]: lessonData,
      },
    }));

    // Анимация восстановления
    setNewCells((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setNewCells((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 300);

    setLessonTrash((prev) => prev.filter((item) => item.id !== id));

    if (lessonUndoTimeoutRef.current) clearTimeout(lessonUndoTimeoutRef.current);
    setRecentlyDeletedLesson(null);
  };

  const restoreLesson = (trashItem) => {
    const { id, day, lesson, deletedAt, ...lessonData } = trashItem;
    const key = `${day}-${lesson}`;

    setData((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] || {}),
        [lesson]: lessonData,
      },
    }));

    setNewCells((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setNewCells((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 300);

    setLessonTrash((prev) => prev.filter((item) => item.id !== id));
  };

  const permanentlyDeleteLesson = (id) => {
    setLessonTrash((prev) => prev.filter((item) => item.id !== id));
  };

  const getLesson = (day, lesson) => data[day]?.[lesson];

  // Drag & Drop handlers
  const handleDragStart = (day, lesson, e) => {
    setDragSource({ day, lesson });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${day}-${lesson}`);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (targetDay, targetLesson, e) => {
    e.preventDefault();
    if (!dragSource) return;
    const { day: srcDay, lesson: srcLesson } = dragSource;
    if (srcDay === targetDay && srcLesson === targetLesson) {
      setDragSource(null);
      setDragTarget(null);
      return;
    }
    setData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const sourceData = newData[srcDay]?.[srcLesson];
      if (!sourceData) return prev;
      delete newData[srcDay][srcLesson];
      if (newData[srcDay] && Object.keys(newData[srcDay]).length === 0) {
        delete newData[srcDay];
      }
      newData[targetDay] = {
        ...(newData[targetDay] || {}),
        [targetLesson]: sourceData,
      };
      return newData;
    });
    setDragSource(null);
    setDragTarget(null);
  };

  const isDragTarget = (day, lesson) =>
    dragTarget && dragTarget.day === day && dragTarget.lesson === lesson;

  const isDragSource = (day, lesson) =>
    dragSource && dragSource.day === day && dragSource.lesson === lesson;

  const handleDragEnd = () => {
    setDragSource(null);
    setDragTarget(null);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in px-4 sm:px-6 max-w-5xl mx-auto w-full">
      {/* Schedule header — sidebar toggle + title + trash button */}
      <div className="flex-shrink-0 flex items-start gap-4 pt-14 sm:pt-16 pb-5">
        <button
          onClick={onToggleSidebar}
          className={`p-2 sm:p-3 bg-zinc-800/80 backdrop-blur-sm rounded-xl hover:scale-110 active:scale-95 transition-all duration-200 flex-shrink-0 ${sidebarOpen ? "opacity-0 pointer-events-none" : ""}`}
          aria-label="Toggle sidebar"
        >
          <RightIcon className="w-5 h-5 text-zinc-400 hover:text-emerald-400 transition-all" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">Study Schedule</h1>
              <p className="text-sm text-zinc-500 mt-1">Plan your weekly lessons</p>
            </div>
            <button
              onClick={() => setIsLessonTrashOpen(true)}
              className="relative p-2 bg-zinc-800/70 hover:bg-zinc-700/70 rounded-xl transition-all duration-200 flex-shrink-0"
              title="Lesson Trash"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {lessonTrash.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {lessonTrash.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Next Lesson блок */}
      {hasAnyLesson && (
        <div className="flex-shrink-0 mb-5 rounded-xl border border-zinc-700/30 bg-zinc-800/30 px-5 py-4">
          {nextLesson ? (
            <div>
              <p className="text-xs text-zinc-500 mb-2">Next Lesson</p>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-base font-bold text-white truncate">{nextLesson.name}</p>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    {nextLesson.startTime} — {nextLesson.endTime}
                  </p>
                  {nextLesson.room && (
                    <p className="text-sm text-zinc-500">Room {nextLesson.room}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-emerald-400 font-medium whitespace-nowrap">
                    {getTimeUntil(nextLesson.startTime)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No upcoming lessons</p>
          )}
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-3 mb-5 flex-shrink-0">
        <div className="bg-zinc-800/30 rounded-xl px-4 py-3 border border-zinc-700/30">
          <p className="text-xs text-zinc-500">Total lessons</p>
          <p className="text-xl font-bold text-white mt-0.5">{totalLessons}</p>
        </div>
        <div className="bg-zinc-800/30 rounded-xl px-4 py-3 border border-zinc-700/30">
          <p className="text-xs text-zinc-500">Busiest day</p>
          <p className="text-xl font-bold text-emerald-400 mt-0.5">{busiestDay}</p>
        </div>
        <div className="bg-zinc-800/30 rounded-xl px-4 py-3 border border-zinc-700/30">
          <p className="text-xs text-zinc-500">Free slots</p>
          <p className="text-xl font-bold text-white mt-0.5">{freeSlots}</p>
        </div>
      </div>

      {/* Grid контейнер */}
      <div className="flex-1 relative min-h-0 rounded-xl border border-zinc-800/40 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 backdrop-blur-sm overflow-hidden">
        {/* Scroll контейнер */}
        <div className="absolute inset-0 overflow-auto rounded-xl">
          {/* Сетка расписания */}
          <div className="grid grid-cols-[56px_repeat(6,1fr)] gap-px bg-zinc-800/20 min-w-[900px]">

            {/* Corner cell */}
            <div className="sticky top-0 left-0 z-30 h-12 bg-zinc-950 rounded-tl-xl" />

            {/* Header дней недели */}
            {DAYS.map((day, i) => {
              const isToday = i === currentDayIndex;
              return (
                <div
                  key={day}
                  className={`sticky top-0 z-20 h-12 flex items-center justify-center text-sm font-semibold transition-colors duration-200
                    ${isToday
                      ? "text-emerald-300 bg-emerald-500/8 border-b-2 border-emerald-500/40"
                      : "text-zinc-400 bg-zinc-950 border-b border-zinc-800/50"
                    }`}
                >
                  {day}
                </div>
              );
            })}

            {/* Строки расписания */}
            {LESSONS.map((lesson) => (
              <React.Fragment key={lesson}>
                {/* Номер пары */}
                <div className="sticky left-0 z-10 flex items-center justify-center h-[72px] bg-zinc-950 text-xs text-zinc-500 font-mono border-b border-zinc-800/30">
                  {lesson}
                </div>

                {/* Ячейки по дням */}
                {DAYS.map((_, dayIdx) => {
                  const lessonData = getLesson(dayIdx, lesson);
                  const isOver = isDragTarget(dayIdx, lesson);
                  const isDragging = isDragSource(dayIdx, lesson);
                  const cellKey = `${dayIdx}-${lesson}`;
                  const isNew = newCells.has(cellKey);
                  const isDeleting = deletingCells.has(cellKey);
                  const isCurrentDay = dayIdx === currentDayIndex;

                  return (
                    <button
                      key={cellKey}
                      onClick={() => openModal(dayIdx, lesson)}
                      draggable={!!lessonData && !isDeleting}
                      onDragStart={lessonData ? (e) => handleDragStart(dayIdx, lesson, e) : undefined}
                      onDragOver={handleDragOver}
                      onDragEnter={() => setDragTarget({ day: dayIdx, lesson })}
                      onDragLeave={() => setDragTarget(null)}
                      onDrop={(e) => handleDrop(dayIdx, lesson, e)}
                      onDragEnd={handleDragEnd}
                      className={`
                        relative group min-h-[72px] bg-zinc-950/80 p-3 text-left
                        border-b border-r border-zinc-800/25
                        transition-all duration-150
                        ${lessonData
                          ? "hover:bg-zinc-900 hover:border-emerald-500/40 hover:shadow-[0_0_12px_rgba(16,185,129,0.12)] hover:scale-[1.02] hover:z-10"
                          : "hover:bg-zinc-900/60 hover:border-emerald-500/25 hover:shadow-[0_0_8px_rgba(16,185,129,0.08)] hover:scale-[1.02] hover:z-10"
                        }
                        ${isOver
                          ? "ring-2 ring-emerald-500/50 bg-emerald-500/5 border-emerald-500/60 scale-[1.03] shadow-xl z-10"
                          : ""
                        }
                        ${isDragging
                          ? "opacity-30 scale-[0.97]"
                          : ""
                        }
                        ${isCurrentDay && lessonData && !isDeleting
                          ? "bg-emerald-500/[0.04]"
                          : ""
                        }
                        ${isNew
                          ? "animate-fade-in"
                          : ""
                        }
                        ${isDeleting
                          ? "opacity-0 scale-95 pointer-events-none"
                          : ""
                        }
                      `}
                    >
                      {lessonData ? (
                        <>
                          <div className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-sm ${COLOR_MAP[lessonData.color]?.accent || "bg-emerald-500/70"}`} />

                          <div className="pl-3 min-w-0">
                            <div className={`text-sm font-semibold leading-tight truncate ${COLOR_MAP[lessonData.color]?.text || "text-white"}`}>
                              {lessonData.name}
                            </div>
                            {lessonData.startTime && lessonData.endTime && (
                              <div className="text-[11px] text-zinc-400 font-medium mt-0.5">
                                {lessonData.startTime} — {lessonData.endTime}
                              </div>
                            )}
                            {lessonData.room && (
                              <div className="text-xs text-zinc-500 mt-0.5 truncate">{lessonData.room}</div>
                            )}
                            {lessonData.teacher && (
                              <div className="text-xs text-zinc-600 truncate">{lessonData.teacher}</div>
                            )}
                            {isCurrentDay && (
                              <div className="text-[10px] text-emerald-500/70 font-medium mt-1">Today</div>
                            )}
                          </div>

                          <div className="absolute top-1 right-1 text-xs text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150">✏️</div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full cursor-pointer">
                          <span className="text-zinc-600 text-base opacity-0 group-hover:opacity-60 transition-opacity duration-200">+</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Drag & Drop hint */}
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-zinc-600">💡 Drag lessons between cells to quickly reorganize your schedule</p>
          </div>
        </div>

        {/* Empty state overlay */}
        {!hasAnyLesson && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-center bg-zinc-950/50 backdrop-blur-[2px] px-8 py-6 rounded-2xl border border-zinc-800/30 animate-fade-in">
              <div className="text-5xl mb-4 opacity-60">📚</div>
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">No lessons yet</h3>
              <p className="text-sm text-zinc-500 mb-4">Click any cell to add your first lesson</p>
              <button
                onClick={() => openModal(0, 1)}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 hover:scale-105 hover:shadow-emerald-500/40 active:scale-95 text-white px-5 py-2 rounded-xl font-medium text-sm transition-all duration-150 shadow-lg shadow-emerald-500/25 pointer-events-auto"
              >
                Add lesson
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно создания/редактирования урока */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => { setIsModalOpen(false); setSelectedCell(null); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 animate-scale-in overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white">
                {selectedCell && data[selectedCell.day]?.[selectedCell.lesson] ? "Edit Lesson" : "Add Lesson"}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                {DAYS[selectedCell?.day]} — Lesson {selectedCell?.lesson}
              </p>
            </div>

            <div className="p-5 space-y-4">
              <input
                type="text"
                placeholder="Subject name..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                autoFocus
              />

              {/* Start Time / End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={form.startTime || "08:00"}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={form.endTime || "08:45"}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Teacher"
                  value={form.teacher}
                  onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                  className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <input
                  type="text"
                  placeholder="Room"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <textarea
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
              />

              {/* Reminder */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Reminder</label>
                <select
                  value={form.reminder || "none"}
                  onChange={(e) => setForm({ ...form, reminder: e.target.value })}
                  className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-zinc-800 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color */}
              <div>
                <p className="text-xs text-zinc-500 mb-2">Color</p>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`w-7 h-7 rounded-full transition-all duration-200 ${
                        form.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110" : ""
                      } ${COLOR_MAP[c].accent}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={handleDelete}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedCell && data[selectedCell.day]?.[selectedCell.lesson]
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-zinc-600 cursor-not-allowed"
                }`}
                disabled={!selectedCell || !data[selectedCell.day]?.[selectedCell.lesson]}
              >
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => { setIsModalOpen(false); setSelectedCell(null); }}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 hover:scale-105 hover:shadow-emerald-500/40 active:scale-95 text-white px-5 py-2 rounded-xl font-medium text-sm transition-all duration-150 shadow-lg shadow-emerald-500/25"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Trash Modal */}
      {isLessonTrashOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsLessonTrashOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[90%] sm:w-[540px] lg:w-[620px] max-h-[80vh] sm:max-h-[70vh] bg-zinc-900 rounded-2xl shadow-2xl shadow-black/40 border border-zinc-800 flex flex-col animate-scale-in"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
              <h2 className="text-xl font-bold text-white">Lesson Trash</h2>
              <button
                onClick={() => setIsLessonTrashOpen(false)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {lessonTrash.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">Trash is empty</p>
              ) : (
                lessonTrash.map((item) => {
                  const daysLeft = Math.ceil(
                    TRASH_DAYS - (Date.now() - item.deletedAt) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-zinc-800/50 px-4 py-3 rounded-xl flex-shrink-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{item.name}</p>
                        <p className="text-zinc-400 text-xs mt-0.5">
                          {DAYS[item.day]} • Lesson {item.lesson}
                        </p>
                        {item.startTime && item.endTime && (
                          <p className="text-zinc-500 text-xs mt-0.5">
                            {item.startTime} — {item.endTime}
                          </p>
                        )}
                        {item.room && (
                          <p className="text-zinc-500 text-xs">Room {item.room}</p>
                        )}
                        <p className="text-zinc-600 text-xs mt-1">{daysLeft} days left</p>
                      </div>
                      <div className="flex gap-2 ml-4 flex-shrink-0">
                        <button
                          onClick={() => restoreLesson(item)}
                          className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-95 text-white px-4 py-1.5 rounded-xl font-medium text-xs transition-all duration-150 shadow-lg shadow-emerald-500/25"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => permanentlyDeleteLesson(item.id)}
                          className="px-3 py-1.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/30 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Undo Toast для уроков */}
      {recentlyDeletedLesson && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-5 bg-zinc-800/95 backdrop-blur-sm px-6 py-4 rounded-xl shadow-xl shadow-black/40 border border-zinc-700/50">
            <span className="text-zinc-200 text-base font-medium">Lesson deleted</span>
            <button
              onClick={undoLessonDelete}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-all duration-200 active:scale-95"
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Schedule;
