// Расписание занятий (Study Planner)
// Таблица: строки = пары (1-12), колонки = дни (Пн-Сб)
// Клик по ячейке → модалка добавления/редактирования
// Drag & Drop между ячейками
// localStorage ключ: scheduleData
// Удаление: урок → lessonTrash (с deletedAt) → Undo toast на 4 сек → если Undo → восстановление

import React, { useState, useEffect, useRef } from "react";
import RightIcon from "../icons/RightIcon";
import { updateStreak } from "../services/streakService";
import * as api from "../services/api";
import { notify } from "./Toast";
import ConfirmDialog from "./ConfirmDialog";
import { getSocket } from "../services/socket";
import { CalendarDays, Clock, Trash2, Check, Pencil, Lightbulb, BookOpen, X, RotateCcw } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LESSONS = Array.from({ length: 12 }, (_, i) => i + 1);
const TRASH_DAYS = 30;
const SCHEDULE_KEY = "scheduleData";
const LESSON_TRASH_KEY = "lessonTrash";

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

  // Таймер для живого обновления Next Lesson
  const [now, setNow] = useState(() => new Date());

  // Trash + Undo для уроков
  const [lessonTrash, setLessonTrash] = useState([]);
  const [isLessonTrashOpen, setIsLessonTrashOpen] = useState(false);
  const [recentlyDeletedLesson, setRecentlyDeletedLesson] = useState(null);
  const lessonUndoTimeoutRef = useRef(null);
  const isLoadingRef = useRef(true);
  const [selectedLessonTrash, setSelectedLessonTrash] = useState(new Set());
  const [lessonConfirmDialog, setLessonConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null, variant: "danger" });

  // ------ localStorage: загрузка scheduleData и lessonTrash при старте ------
  useEffect(() => {
    try {
      const savedSchedule = localStorage.getItem(SCHEDULE_KEY);
      if (savedSchedule) setData(JSON.parse(savedSchedule));
    } catch {}

    try {
      const savedTrash = localStorage.getItem(LESSON_TRASH_KEY);
      if (savedTrash) {
        const parsed = JSON.parse(savedTrash);
        const valid = parsed.filter((t) => !isTrashExpired(t.deletedAt));
        setLessonTrash(valid);
      }
    } catch {}

    isLoadingRef.current = false;
  }, []);

  // ------ localStorage: сохранение scheduleData ------
  useEffect(() => {
    if (!isLoadingRef.current) {
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(data));
    }
  }, [data]);

  // ------ localStorage: сохранение lessonTrash ------
  useEffect(() => {
    if (!isLoadingRef.current) {
      localStorage.setItem(LESSON_TRASH_KEY, JSON.stringify(lessonTrash));
    }
  }, [lessonTrash]);

  // Таймер обновления Next Lesson каждые 60 секунд
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isTrashExpired = (deletedAt) => {
    const now = Date.now();
    const daysDiff = (now - deletedAt) / (1000 * 60 * 60 * 24);
    return daysDiff > TRASH_DAYS;
  };

  // Socket listeners for real-time sync
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const mySessionId = localStorage.getItem("session_id");
    const handler = ({ type, payload, sessionId }) => {
      if (sessionId === mySessionId) return;
      switch (type) {
        case "lesson:add":
        case "lesson:update": {
          const { day, lesson } = payload.lesson;
          setData((prev) => {
            const next = { ...prev };
            if (!next[day]) next[day] = {};
            next[day] = { ...next[day], [lesson]: payload.lesson };
            return next;
          });
          break;
        }
        case "lesson:delete": {
          const { day, lesson } = payload.lesson;
          setData((prev) => {
            const next = { ...prev };
            if (next[day]) {
              const newDay = { ...next[day] };
              delete newDay[lesson];
              if (Object.keys(newDay).length === 0) delete next[day];
              else next[day] = newDay;
            }
            return next;
          });
          setLessonTrash((pv) => {
            if (pv.find((t) => t.day === day && t.lesson === lesson)) return pv;
            return [...pv, { ...payload.lesson, day, lesson, id: `lesson_${Date.now()}`, deletedAt: Date.now() }];
          });
          break;
        }
        case "lesson:restore": {
          const lr = payload.item;
          setLessonTrash((pv) => pv.filter((t) => !(t.day === lr.day && t.lesson === lr.lesson)));
          setData((prev) => {
            const next = { ...prev };
            if (!next[lr.day]) next[lr.day] = {};
            next[lr.day] = { ...next[lr.day], [lr.lesson]: lr };
            return next;
          });
          break;
        }
        case "lesson:delete-permanent": {
          setLessonTrash((pv) => pv.filter((t) => !(t.day === payload.day && t.lesson === payload.lesson)));
          break;
        }
        case "trash:restore-all": {
          if (payload.type === "lessons") {
            setLessonTrash([]);
          }
          break;
        }
        case "trash:delete-all": {
          if (payload.type === "lessons") {
            setLessonTrash([]);
            setSelectedLessonTrash(new Set());
          }
          break;
        }
        case "trash:restore-selected": {
          if (payload.type === "lessons" && payload.items) {
            for (const item of payload.items) {
              setLessonTrash((pv) => pv.filter((t) => !(t.day === item.day && t.lesson === item.lesson)));
              setData((prev) => {
                const next = { ...prev };
                if (!next[item.day]) next[item.day] = {};
                next[item.day] = { ...next[item.day], [item.lesson]: item };
                return next;
              });
            }
            setSelectedLessonTrash(new Set());
          }
          break;
        }
        case "trash:delete-selected": {
          if (payload.type === "lessons" && payload.ids) {
            for (const id of payload.ids) {
              setLessonTrash((pv) => pv.filter((t) => !(t.day === id.day && t.lesson === id.lesson)));
            }
            setSelectedLessonTrash(new Set());
          }
          break;
        }
      }
    };
    s.on("sync:patch", handler);
    return () => s.off("sync:patch", handler);
  }, []);

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

  const today = now.getDay();
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

  // ------ Next Lesson (живой виджет) ------
  const getNextLessonInfo = () => {
    if (currentDayIndex === -1) return { status: 'noLessons' };

    const dayData = data[currentDayIndex];
    if (!dayData) return { status: 'noLessons' };

    const nowMinutes = now.getHours() * 60 + now.getMinutes();

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

    if (lessons.length === 0) return { status: 'noLessons' };

    for (const lesson of lessons) {
      const [startH, startM] = (lesson.startTime || "00:00").split(":").map(Number);
      const [endH, endM] = (lesson.endTime || "23:59").split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (nowMinutes < startMinutes) {
        return { lesson, status: 'upcoming', diff: startMinutes - nowMinutes };
      }
      if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
        return { lesson, status: 'inProgress', diff: 0 };
      }
    }

    return { status: 'noMoreToday' };
  };

  const formatNextLesson = (info) => {
    if (!info || info.status === 'noLessons' || info.status === 'noMoreToday') {
      return { badge: '', badgeColor: 'text-zinc-500' };
    }

    const { status, diff } = info;

    if (status === 'inProgress') {
      return { badge: 'In progress', badgeColor: 'text-emerald-400' };
    }

    if (diff <= 0) {
      return { badge: 'Starts now', badgeColor: 'text-emerald-400' };
    }

    let badge;
    if (diff < 60) {
      badge = `Starts in ${diff} min`;
    } else {
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      badge = mins === 0 ? `Starts in ${hours}h` : `Starts in ${hours}h ${mins}m`;
    }

    return {
      badge,
      badgeColor: diff <= 1 ? 'text-emerald-400' : 'text-emerald-400',
    };
  };

  const nextLessonInfo = getNextLessonInfo();
  const { badge, badgeColor } = formatNextLesson(nextLessonInfo);
  const showNextBlock = totalLessons > 0;

  // Дата и время для единого Header
  const getDateStr = (d) => {
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  };
  const getTimeStr = (d) => `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;

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

    // Sync lesson to server
    const lessonPayload = { day: selectedCell.day, lesson: selectedCell.lesson, ...form, name: form.name.trim() };
    api.patch(isNew ? "lesson:add" : "lesson:update", { lesson: lessonPayload }).catch(() => {});
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

    // Анимация удаления + НЕМЕДЛЕННОЕ удаление из data
    setDeletingCells((prev) => new Set(prev).add(key));
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

    // Убираем анимацию через 200мс
    setTimeout(() => {
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

    // Sync to server
    const lessonPayload = { day: selectedCell.day, lesson: selectedCell.lesson, ...lessonData };
    api.patch("lesson:delete", { lesson: lessonPayload }).catch(() => {});
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

    const { deletedAt: dd, id: di, ...restoreData } = recentlyDeletedLesson;
    api.patch("lesson:restore", { item: { day, lesson, ...restoreData } }).catch(() => {});
    notify("Lesson restored");
  };

  const toggleLessonAttended = (day, lesson) => {
    const lessonData = data[day]?.[lesson];
    if (!lessonData) return;
    const newAttended = !lessonData.attended;
    setData((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] || {}),
        [lesson]: { ...lessonData, attended: newAttended },
      },
    }));
    if (newAttended) {
      updateStreak(new Date());
    }
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
    api.patch("lesson:restore", { item: trashItem }).catch(() => {});
    notify("Lesson restored");
  };

  const permanentlyDeleteLesson = (id) => {
    const item = lessonTrash.find((t) => t.id === id);
    setLessonTrash((prev) => prev.filter((item) => item.id !== id));
    if (item) {
      api.patch("lesson:delete-permanent", { day: item.day, lesson: item.lesson }).catch(() => {});
      notify("Lesson permanently deleted");
    }
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

  const toggleSelectLessonTrash = (id) => {
    setSelectedLessonTrash((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllLessonTrash = () => {
    if (selectedLessonTrash.size === lessonTrash.length) {
      setSelectedLessonTrash(new Set());
    } else {
      setSelectedLessonTrash(new Set(lessonTrash.map((t) => t.id)));
    }
  };

  const restoreSelectedLessonTrash = () => {
    const selected = lessonTrash.filter((t) => selectedLessonTrash.has(t.id));
    if (selected.length === 0) return;
    for (const item of selected) {
      const { id, deletedAt, ...lessonData } = item;
      const key = `${item.day}-${item.lesson}`;
      setData((prev) => ({
        ...prev,
        [item.day]: { ...(prev[item.day] || {}), [item.lesson]: lessonData },
      }));
      setNewCells((prev) => new Set(prev).add(key));
      setTimeout(() => setNewCells((prev) => { const n = new Set(prev); n.delete(key); return n; }), 300);
    }
    setLessonTrash((prev) => prev.filter((t) => !selectedLessonTrash.has(t.id)));
    api.patch("trash:restore-selected", { type: "lessons", items: selected }).catch(() => {});
    setSelectedLessonTrash(new Set());
    notify(`${selected.length} lesson(s) restored`);
  };

  const deleteSelectedLessonTrash = () => {
    const ids = lessonTrash.filter((t) => selectedLessonTrash.has(t.id)).map((t) => ({ day: t.day, lesson: t.lesson }));
    setLessonTrash((prev) => prev.filter((t) => !selectedLessonTrash.has(t.id)));
    api.patch("trash:delete-selected", { type: "lessons", ids }).catch(() => {});
    setSelectedLessonTrash(new Set());
    notify(`${ids.length} lesson(s) permanently deleted`);
  };

  const restoreAllLessonTrash = () => {
    const items = [...lessonTrash];
    for (const item of items) {
      const { id, deletedAt, ...lessonData } = item;
      const key = `${item.day}-${item.lesson}`;
      setData((prev) => ({
        ...prev,
        [item.day]: { ...(prev[item.day] || {}), [item.lesson]: lessonData },
      }));
      setNewCells((prev) => new Set(prev).add(key));
      setTimeout(() => setNewCells((prev) => { const n = new Set(prev); n.delete(key); return n; }), 300);
    }
    setLessonTrash([]);
    api.patch("trash:restore-all", { type: "lessons" }).catch(() => {});
    notify("All lessons restored");
  };

  const deleteAllLessonTrash = () => {
    const count = lessonTrash.length;
    setLessonTrash([]);
    setSelectedLessonTrash(new Set());
    api.patch("trash:delete-all", { type: "lessons" }).catch(() => {});
    notify(`${count} lesson(s) permanently deleted`);
  };

  const showLessonConfirm = (title, message, onConfirm, variant = "danger") => {
    setLessonConfirmDialog({ open: true, title, message, onConfirm, variant });
  };

  const closeLessonConfirm = () => {
    setLessonConfirmDialog({ open: false, title: "", message: "", onConfirm: null, variant: "danger" });
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
    <div className="flex flex-col h-full animate-fade-in">
      {/* Единый закреплённый Header */}
      <div className="sticky top-0 z-20 bg-black/70 backdrop-blur-md border-b border-zinc-800/50 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 py-3">
            <button
              onClick={onToggleSidebar}
              className={`p-2 sm:p-3 bg-zinc-800/80 backdrop-blur-sm rounded-xl hover:scale-110 active:scale-95 transition-all duration-200 flex-shrink-0 ${sidebarOpen ? "opacity-0 pointer-events-none" : ""}`}
              aria-label="Toggle sidebar"
            >
              <RightIcon className="w-5 h-5 text-zinc-400 hover:text-emerald-400 transition-all" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Study Schedule</h1>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsLessonTrashOpen(true)}
                className="relative p-2 bg-zinc-800/70 hover:bg-zinc-700/70 rounded-xl transition-all duration-200"
                title="Lesson Trash"
              >
                <Trash2 className="w-5 h-5 text-zinc-400" />
                {lessonTrash.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {lessonTrash.length}
                  </span>
                )}
              </button>
              <span className="hidden sm:inline text-xs text-zinc-400 whitespace-nowrap"><CalendarDays className="w-3 h-3 inline mr-1" />{getDateStr(now)}</span>
              <span className="text-xs text-zinc-400 font-mono whitespace-nowrap"><Clock className="w-3 h-3 inline mr-1" />{getTimeStr(now)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable контент */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-8 space-y-5">

          {/* Next Lesson — живой виджет */}
          {showNextBlock && (
            <div className="rounded-xl border border-zinc-700/30 bg-zinc-800/30 px-5 py-4">
              <p className="text-xs text-zinc-500 mb-2">Next Lesson</p>

              {nextLessonInfo && (nextLessonInfo.status === 'upcoming' || nextLessonInfo.status === 'inProgress') ? (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-white truncate">{nextLessonInfo.lesson.name}</p>
                    <p className="text-sm text-zinc-400 mt-0.5">
                      {nextLessonInfo.lesson.startTime} — {nextLessonInfo.lesson.endTime}
                    </p>
                    {nextLessonInfo.lesson.room && (
                      <p className="text-sm text-zinc-500 mt-0.5">Room {nextLessonInfo.lesson.room}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <p key={badge} className={`text-xs font-medium whitespace-nowrap animate-fade-in ${badgeColor}`}>
                      {badge}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500">No more lessons today</p>
                  {(nextLessonInfo && nextLessonInfo.status === 'noMoreToday') && (
                    <p className="text-xs text-zinc-600 font-medium"><Check className="w-3 h-3 inline mr-0.5" />Done</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Статистика */}
          <div className="grid grid-cols-3 gap-3">
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
          <div className="min-h-[500px] relative rounded-xl border border-zinc-800/40 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 backdrop-blur-sm overflow-hidden">
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
                            ${lessonData?.attended
                              ? "opacity-70"
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

                              <div className="pl-3 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    onClick={(e) => { e.stopPropagation(); toggleLessonAttended(dayIdx, lesson); }}
                                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full border-2 cursor-pointer flex-shrink-0 transition-colors duration-150 ${
                                      lessonData.attended
                                        ? "bg-emerald-500 border-emerald-500"
                                        : "border-zinc-600 hover:border-zinc-500"
                                    }`}
                                  >
                                    {lessonData.attended && (
                                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                    )}
                                  </span>
                                  <span className={`text-sm font-semibold leading-tight truncate ${COLOR_MAP[lessonData.color]?.text || "text-white"}`}>
                                    {lessonData.name}
                                  </span>
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

                              <div className="absolute top-1 right-1 text-xs text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150"><Pencil className="w-3 h-3" /></div>
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
                <p className="text-xs text-zinc-600"><Lightbulb className="w-3 h-3 inline mr-1" />Drag lessons between cells to quickly reorganize your schedule</p>
              </div>
            </div>

            {/* Empty state overlay */}
            {!hasAnyLesson && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="text-center bg-zinc-950/50 backdrop-blur-[2px] px-8 py-6 rounded-2xl border border-zinc-800/30 animate-fade-in">
                  <BookOpen className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
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
        </div>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsLessonTrashOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-[90%] sm:w-[540px] lg:w-[620px] max-h-[80vh] sm:max-h-[70vh] bg-zinc-900 rounded-2xl shadow-2xl shadow-black/40 border border-zinc-800 flex flex-col animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">Lesson Trash</h2>
                {lessonTrash.length > 0 && <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{lessonTrash.length} items</span>}
              </div>
              <div className="flex items-center gap-2">
                {lessonTrash.length > 0 && (
                  <>
                    <button onClick={selectAllLessonTrash} className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-lg hover:bg-zinc-800 transition-all">
                      {selectedLessonTrash.size === lessonTrash.length ? "Deselect All" : "Select All"}
                    </button>
                    <button onClick={restoreAllLessonTrash} className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-all">
                      <RotateCcw className="w-3.5 h-3.5 inline mr-1" />Restore All
                    </button>
                    <button onClick={() => showLessonConfirm("Delete All", "These items will be permanently deleted. This action cannot be undone.", deleteAllLessonTrash)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-all">
                      <Trash2 className="w-3.5 h-3.5 inline mr-1" />Delete All
                    </button>
                  </>
                )}
                <button onClick={() => setIsLessonTrashOpen(false)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {selectedLessonTrash.size > 0 && (
              <div className="flex items-center gap-2 px-5 py-2 bg-zinc-800/30 border-b border-zinc-800/50">
                <span className="text-xs text-zinc-400">{selectedLessonTrash.size} selected</span>
                <button onClick={restoreSelectedLessonTrash} className="text-xs px-2.5 py-1 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-all">
                  <RotateCcw className="w-3 h-3 inline mr-1" />Restore Selected
                </button>
                <button onClick={() => showLessonConfirm("Delete Selected", `${selectedLessonTrash.size} item(s) will be permanently deleted. This action cannot be undone.`, deleteSelectedLessonTrash)} className="text-xs px-2.5 py-1 rounded-lg text-red-400 hover:bg-red-500/20 transition-all">
                  <Trash2 className="w-3 h-3 inline mr-1" />Delete Selected
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
              {lessonTrash.length === 0 ? (
                <p className="text-zinc-500 text-center py-8 text-sm">Trash is empty</p>
              ) : (
                lessonTrash.map((item) => {
                  const daysLeft = Math.ceil(TRASH_DAYS - (Date.now() - item.deletedAt) / (1000 * 60 * 60 * 24));
                  const checked = selectedLessonTrash.has(item.id);
                  return (
                    <div key={item.id} className={`flex items-center gap-3 bg-zinc-800/50 px-4 py-3 rounded-xl transition-all ${checked ? "ring-2 ring-emerald-500/30 bg-zinc-800/80" : ""}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleSelectLessonTrash(item.id)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 accent-emerald-500 cursor-pointer flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${checked ? "text-white" : "text-zinc-300"}`}>{item.name}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">
                          {DAYS[item.day]} &middot; Lesson {item.lesson}
                        </p>
                        {item.startTime && item.endTime && <p className="text-zinc-500 text-xs">{item.startTime} &mdash; {item.endTime}</p>}
                        {item.room && <p className="text-zinc-500 text-xs">Room {item.room}</p>}
                        <p className="text-zinc-500 text-xs mt-0.5">{daysLeft} days left</p>
                      </div>
                      <button onClick={() => restoreLesson(item)} className="px-2.5 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-500/30 transition-all flex-shrink-0" title="Restore">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => permanentlyDeleteLesson(item.id)} className="px-2.5 py-1.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/30 transition-all flex-shrink-0" title="Delete forever">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
          <div className="flex items-center gap-2 sm:gap-5 bg-zinc-800/95 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-4 rounded-xl shadow-xl shadow-black/40 border border-zinc-700/50">
            <span className="text-zinc-200 text-sm sm:text-base font-medium truncate min-w-0">Lesson deleted</span>
            <button
              onClick={undoLessonDelete}
              className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg transition-all duration-200 active:scale-95"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={lessonConfirmDialog.open}
        title={lessonConfirmDialog.title}
        message={lessonConfirmDialog.message}
        variant={lessonConfirmDialog.variant}
        confirmLabel={lessonConfirmDialog.variant === "danger" ? "Delete" : "Confirm"}
        onConfirm={() => { lessonConfirmDialog.onConfirm?.(); closeLessonConfirm(); }}
        onCancel={closeLessonConfirm}
      />
    </div>
  );
}

export default Schedule;
