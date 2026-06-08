// Расписание занятий (Study Planner)
// Таблица: строки = пары (1-14), колонки = дни (Пн-Сб)
// Клик по ячейке → модалка добавления/редактирования
// Drag & Drop между ячейками
// localStorage ключ: scheduleData

import React, { useState, useEffect } from "react";
import RightIcon from "../icons/RightIcon";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LESSONS = Array.from({ length: 14 }, (_, i) => i + 1);

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

function Schedule({ onToggleSidebar, sidebarOpen }) {
  const [data, setData] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [form, setForm] = useState({ name: "", teacher: "", room: "", notes: "", color: "emerald" });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Drag & Drop state
  const [dragSource, setDragSource] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("scheduleData");
      if (saved) setData(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("scheduleData", JSON.stringify(data));
  }, [data]);

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

  const today = new Date().getDay();
  const currentDayIndex = today >= 1 && today <= 6 ? today - 1 : -1;

  const hasAnyLesson = Object.values(data).some((day) => day && Object.keys(day).length > 0);

  const openModal = (day, lesson) => {
    const existing = data[day]?.[lesson];
    setSelectedCell({ day, lesson });
    if (existing) {
      setForm({ ...existing });
    } else {
      setForm({ name: "", teacher: "", room: "", notes: "", color: "emerald" });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    setData((prev) => ({
      ...prev,
      [selectedCell.day]: {
        ...(prev[selectedCell.day] || {}),
        [selectedCell.lesson]: { ...form, name: form.name.trim() },
      },
    }));
    setIsModalOpen(false);
    setSelectedCell(null);
  };

  const handleDelete = () => {
    if (!selectedCell) return;
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
    setIsModalOpen(false);
    setSelectedCell(null);
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
      {/* Schedule header layout — sidebar toggle + title + subtitle, NOT fixed */}
      <div className="flex-shrink-0 flex items-start gap-4 pt-14 sm:pt-16 pb-6">
        <button
          onClick={onToggleSidebar}
          className={`p-2 sm:p-3 bg-zinc-800/80 backdrop-blur-sm rounded-xl hover:scale-110 active:scale-95 transition-all duration-200 flex-shrink-0 ${sidebarOpen ? "opacity-0 pointer-events-none" : ""}`}
          aria-label="Toggle sidebar"
        >
          <RightIcon className="w-5 h-5 text-zinc-400 hover:text-emerald-400 transition-all" />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">Study Schedule</h1>
          <p className="text-sm text-zinc-500 mt-1">Plan your weekly lessons — click any cell to add a subject</p>
        </div>
      </div>

      {/* Grid контейнер */}
      <div className="flex-1 relative min-h-0 rounded-xl border border-zinc-800/40 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 backdrop-blur-sm overflow-hidden">
        {/* Scroll контейнер */}
        <div className="absolute inset-0 overflow-auto rounded-xl">
          {/* Сетка расписания — grid always visible */}
          <div className="grid grid-cols-[56px_repeat(6,1fr)] gap-px bg-zinc-800/20 min-w-[900px]">

            {/* Corner cell — sticky top + left */}
            <div className="sticky top-0 left-0 z-30 h-12 bg-zinc-950 rounded-tl-xl" />

            {/* Header дней недели — sticky top */}
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
                {/* Номер пары — sticky left, responsive cell sizing */}
                <div className="sticky left-0 z-10 flex items-center justify-center h-[72px] bg-zinc-950 text-xs text-zinc-500 font-mono border-b border-zinc-800/30">
                  {lesson}
                </div>

                {/* Ячейки по дням с drag & drop поддержкой */}
                {DAYS.map((_, dayIdx) => {
                  const lessonData = getLesson(dayIdx, lesson);
                  const isOver = isDragTarget(dayIdx, lesson);
                  const isDragging = isDragSource(dayIdx, lesson);
                  return (
                    <button
                      key={`${lesson}-${dayIdx}`}
                      onClick={() => openModal(dayIdx, lesson)}
                      draggable={!!lessonData}
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
                          ? "ring-2 ring-emerald-500/50 bg-emerald-500/5 border-emerald-500/60 scale-[1.02] z-10"
                          : ""
                        }
                        ${isDragging
                          ? "opacity-30 scale-[0.97]"
                          : ""
                        }
                      `}
                    >
                      {lessonData ? (
                        <>
                          {/* Цветовая акцентная полоска слева */}
                          <div className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-sm ${COLOR_MAP[lessonData.color]?.accent || "bg-emerald-500/70"}`} />

                          <div className="pl-3">
                            <div className={`text-sm font-semibold leading-tight ${COLOR_MAP[lessonData.color]?.text || "text-white"}`}>
                              {lessonData.name}
                            </div>
                            {lessonData.room && (
                              <div className="text-xs text-zinc-500 mt-0.5">{lessonData.room}</div>
                            )}
                            {lessonData.teacher && (
                              <div className="text-xs text-zinc-600 truncate">{lessonData.teacher}</div>
                            )}
                          </div>

                          {/* Иконка редактирования при hover */}
                          <div className="absolute top-1 right-1 text-xs text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150">✏️</div>
                        </>
                      ) : (
                        /* Пустая ячейка — "+" при hover */
                        <div className="flex items-center justify-center h-full">
                          <span className="text-zinc-600 text-base opacity-0 group-hover:opacity-60 transition-opacity duration-200">+</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Empty state overlay — pointer-events-none для кликов сквозь */}
        {!hasAnyLesson && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-center bg-zinc-950/50 backdrop-blur-[2px] px-8 py-6 rounded-2xl border border-zinc-800/30 animate-fade-in">
              <div className="text-5xl mb-4 opacity-60">📚</div>
              <h3 className="text-lg font-semibold text-zinc-300 mb-1">No lessons yet</h3>
              <p className="text-sm text-zinc-500">Click any cell to add a subject</p>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно */}
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
                {/* Save button — emerald gradient в стиле главной кнопки Add */}
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
    </div>
  );
}

export default Schedule;
