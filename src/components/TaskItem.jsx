// Компонент TaskItem — одна задача в списке
// Отображает: drag handle, чекбокс выполнения, текст (или input для редактирования), кнопки Edit/Delete
// Поддерживает: отметку выполнения, редактирование текста и приоритета, удаление с анимацией, drag & drop
// Цвет левой границы (border-l-4) зависит от приоритета: high=emerald, medium=amber, low=zinc

import React, { useState, useRef, useEffect } from "react";
import EditIcon from "../icons/EditIcon";
import DeleteIcon from "../icons/DeleteIcon";
import { GripVertical, Target } from "lucide-react";

function TaskItem({
  task,
  onDelete,
  onToggle,
  onEdit,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  isMobile,
  goals = [],
}) {
  // Флаг анимации удаления (плавное исчезание)
  const [isDeleting, setIsDeleting] = useState(false);
  // Флаг режима редактирования (текст + приоритет + goal)
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editGoalId, setEditGoalId] = useState(task.goalId || "");
  const editInputRef = useRef(null);

  // Автофокус и выделение текста при входе в режим редактирования
  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [isEditing]);

  // Запуск анимации удаления, затем вызов onDelete через 200ms
  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => onDelete(task.id), 200);
  };

  // Вход в режим редактирования с текущими значениями
  const startEdit = () => {
    setEditText(task.text);
    setEditPriority(task.priority);
    setEditGoalId(task.goalId || "");
    setIsEditing(true);
  };

  // Сохранение изменений (только если текст не пустой и были реальные изменения)
  const saveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed) {
      const newGoal = editGoalId || null;
      const hasChanges = trimmed !== task.text || editPriority !== task.priority || newGoal !== (task.goalId || null);
      if (hasChanges) {
        onEdit(task.id, trimmed, editPriority, newGoal);
      }
    }
    setIsEditing(false);
  };

  // Отмена редактирования — возвращаем исходные значения
  const cancelEdit = () => {
    setEditText(task.text);
    setEditPriority(task.priority);
    setIsEditing(false);
  };

  // Enter сохраняет, Escape отменяет
  const handleEditKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  // Цвет левой границы по приоритету
  const getPriorityBorder = () => {
    switch (task.priority) {
      case 'high': return 'border-l-emerald-500';
      case 'medium': return 'border-l-amber-400';
      default: return 'border-l-zinc-500';
    }
  };

  return (
    <div
      className={`group flex items-center gap-2 sm:gap-3 bg-zinc-800/70 backdrop-blur-sm rounded-2xl px-4 sm:px-5 py-3 sm:py-4 shadow-lg shadow-black/10 border border-zinc-700/20 border-l-4 ${getPriorityBorder()} overflow-hidden ${isMobile ? "" : "hover:bg-zinc-800/90 hover:scale-[1.01] hover:shadow-xl hover:shadow-black/20"} transition-all duration-200 ${isDeleting ? "opacity-0 scale-95" : "opacity-100 scale-100"} ${isDragging ? "scale-105 opacity-80 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500" : ""}`}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, task.id)}>
      {/* Drag handle (решётка из 9 точек) — виден при hover на десктопе, всегда на мобильных */}
      <div
        className={`cursor-grab active:cursor-grabbing text-zinc-500 ${isMobile ? "" : "invisible group-hover:visible"} transition-all duration-200 flex-shrink-0`}
        onMouseDown={(e) => e.stopPropagation()}>
        <GripVertical className="w-4 sm:w-5 h-4 sm:h-5" />
      </div>

      {/* Чекбокс — переключает completed статус */}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        onClick={(e) => e.stopPropagation()}
        className={`w-5 h-5 rounded-lg border-2 border-zinc-600 bg-zinc-700/50 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer accent-emerald-500 transition-all duration-200 ${isMobile ? "" : "hover:scale-110"}`}
      />

      {/* В режиме редактирования: input + селектор приоритета + Save, иначе просто текст */}
      {isEditing ? (
        <div className="flex-1 space-y-2">
          <input
            ref={editInputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleEditKeyDown}
            className="w-full bg-zinc-700/80 px-4 py-2 rounded-xl text-white ring-2 ring-emerald-500 focus:outline-none transition-all duration-200"
          />
          {/* Селектор приоритета при редактировании */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs">Priority:</span>
            {['low', 'medium', 'high'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={(e) => { e.stopPropagation(); setEditPriority(p); }}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-all duration-200 ${
                  editPriority === p
                    ? p === 'high' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : p === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                    : 'bg-zinc-700/50 text-zinc-300 border border-zinc-600/50'
                    : 'bg-zinc-700/30 text-zinc-500 hover:bg-zinc-700/50 hover:text-zinc-300 border border-transparent'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
            <button
              onClick={(e) => { e.stopPropagation(); saveEdit(); }}
              className="ml-auto bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-medium px-3 py-0.5 rounded-lg transition-all duration-200"
            >
              Save
            </button>
          </div>
          {goals.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-xs">Goal:</span>
              <select
                value={editGoalId}
                onChange={(e) => setEditGoalId(e.target.value)}
                className="bg-zinc-700/50 text-zinc-300 text-xs px-2 py-1 rounded-lg border border-zinc-600/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 max-w-[180px]"
              >
                <option value="">No Goal</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      ) : (
        <span
          className={`flex-1 cursor-grab transition-all duration-200 ${task.completed ? "line-through text-zinc-400 opacity-60" : "text-white"}`}>
          {task.text}
        </span>
      )}
      {!isEditing && task.goalId && (() => {
        const goal = goals.find((g) => g.id === task.goalId);
        return goal ? <span className="text-[10px] text-emerald-500/60 ml-1 flex-shrink-0"><Target className="w-3 h-3 inline mr-0.5" />{goal.name}</span> : null;
      })()}

      {/* Кнопки Edit и Delete — на мобильных всегда видимы, на десктопе при hover */}
      <div className={`flex gap-1.5 ${isMobile ? "" : "opacity-0 group-hover:opacity-100"} transition-all duration-200`}>
        {!isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); startEdit(); }}
            className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700/50 rounded-xl transition-all duration-200"
          >
            <EditIcon className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700/50 rounded-xl transition-all duration-200"
        >
          <DeleteIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default TaskItem;
