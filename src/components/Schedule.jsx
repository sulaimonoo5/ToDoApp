// Расписание занятий (Study Planner)
// Таблица: строки = пары (1-14), колонки = дни (Пн-Сб)
// Клик по ячейке → модалка добавления/редактирования
// localStorage ключ: scheduleData

import React, { useState, useEffect } from "react";

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

function Schedule() {
  // data[dayIndex][lessonIndex] = { name, teacher, room, notes, color }
  const [data, setData] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [form, setForm] = useState({ name: "", teacher: "", room: "", notes: "", color: "emerald" });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("scheduleData");
      if (saved) setData(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("scheduleData", JSON.stringify(data));
  }, [data]);

  // Определяем текущий день для подсветки (0=Mon, 5=Sat, -1=weekend)
  const today = new Date().getDay();
  const currentDayIndex = today >= 1 && today <= 6 ? today - 1 : -1;

  // Есть ли хотя бы один урок в расписании
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

  return (
    // Анимация появления страницы: opacity 0→1, translateY 10→0
    <div className="flex flex-col h-full animate-fade-in pt-8 px-4 sm:px-6 max-w-5xl mx-auto w-full">
      {/* Header секция */}
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Study Schedule</h1>
        <p className="text-sm text-zinc-500 mt-1.5">Plan your weekly lessons — click any cell to add a subject</p>
      </div>

      {/* Grid контейнер — всегда отображается, содержит сетку и overlay empty state */}
      <div className="flex-1 relative min-h-0 rounded-xl border border-zinc-800/40 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 backdrop-blur-sm overflow-hidden">
        {/* Scroll контейнер — вся прокрутка (X + Y) только здесь, mobile responsive fix: overflow-x-auto */}
        <div className="absolute inset-0 overflow-auto rounded-xl">
          {/* Сетка расписания с gap-px для линий сетки — grid always visible */}
          <div className="grid grid-cols-[56px_repeat(6,1fr)] gap-px bg-zinc-800/20 min-w-[900px]">

            {/* Corner cell — sticky top + left */}
            <div className="sticky top-0 left-0 z-30 h-10 bg-zinc-950 rounded-tl-xl" />

            {/* Header дней недели — sticky top */}
            {DAYS.map((day, i) => {
              const isToday = i === currentDayIndex;
              return (
                <div
                  key={day}
                  className={`sticky top-0 z-20 h-10 flex items-center justify-center text-sm font-semibold transition-colors duration-200
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
                {/* Номер пары — sticky left */}
                <div className="sticky left-0 z-10 flex items-center justify-center h-14 bg-zinc-950 text-xs text-zinc-500 font-mono border-b border-zinc-800/30">
                  {lesson}
                </div>

                {/* Ячейки по дням */}
                {DAYS.map((_, dayIdx) => {
                  const lessonData = getLesson(dayIdx, lesson);
                  return (
                    <button
                      key={`${lesson}-${dayIdx}`}
                      onClick={() => openModal(dayIdx, lesson)}
                      className={`
                        relative group min-h-[56px] bg-zinc-950/80 p-2 text-left
                        border-b border-r border-zinc-800/25
                        transition-all duration-150
                        ${lessonData
                          ? "hover:bg-zinc-900 hover:border-emerald-500/40 hover:shadow-[0_0_12px_rgba(16,185,129,0.12)] hover:scale-[1.02] hover:z-10"
                          : "hover:bg-zinc-900/60 hover:border-emerald-500/25 hover:shadow-[0_0_8px_rgba(16,185,129,0.08)] hover:scale-[1.02] hover:z-10"
                        }
                      `}
                    >
                      {lessonData ? (
                        <>
                          {/* Цветовая акцентная полоска слева — вместо полной заливки */}
                          <div className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-sm ${COLOR_MAP[lessonData.color]?.accent || "bg-emerald-500/70"}`} />

                          <div className="pl-2.5">
                            <div className={`text-xs font-semibold leading-tight ${COLOR_MAP[lessonData.color]?.text || "text-white"}`}>
                              {lessonData.name}
                            </div>
                            {lessonData.room && (
                              <div className="text-[10px] text-zinc-500 mt-0.5">{lessonData.room}</div>
                            )}
                            {lessonData.teacher && (
                              <div className="text-[10px] text-zinc-600 truncate">{lessonData.teacher}</div>
                            )}
                          </div>

                          {/* Иконка редактирования при hover */}
                          <div className="absolute top-1 right-1 text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150">✏️</div>
                        </>
                      ) : (
                        /* Пустая ячейка — "+" появляется при hover */
                        <div className="flex items-center justify-center h-full">
                          <span className="text-zinc-600 text-base opacity-0 group-hover:opacity-60 transition-opacity duration-200">
                            +
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Empty state overlay — поверх grid, pointer-events-none чтобы не блокировать клики по ячейкам */}
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

      {/* Модальное окно — без изменений */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsModalOpen(false)}
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-400 active:scale-95 transition-all"
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
