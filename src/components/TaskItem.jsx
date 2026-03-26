import React, { useState, useRef, useEffect } from "react";
import EditIcon from "../icons/EditIcon";
import DeleteIcon from "../icons/DeleteIcon";

function TaskItem({
  task,
  onDelete,
  onToggle,
  onEdit,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  dragHandleProps,
  isMobile,
}) {
  // Состояние для анимации удаления
  const [isDeleting, setIsDeleting] = useState(false);
  // Состояние для режима редактирования
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const editInputRef = useRef(null);

  // Автофокус при входе в режим редактирования
  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [isEditing]);

  // Плавное удаление с анимацией
  const handleDelete = () => {
    setIsDeleting(true);
    // Удаляем после завершения анимации (200ms)
    setTimeout(() => onDelete(task.id), 200);
  };

  // Начать редактирование
  const startEdit = () => {
    setEditText(task.text);
    setIsEditing(true);
  };

  // Сохранить изменения
  const saveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== task.text) {
      onEdit(task.id, trimmed);
    }
    setIsEditing(false);
  };

  // Отменить редактирование
  const cancelEdit = () => {
    setEditText(task.text);
    setIsEditing(false);
  };

  // Обработка Enter и Escape при редактировании
  const handleEditKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <div
      className={`group flex items-center gap-2 sm:gap-3 bg-zinc-800/70 backdrop-blur-sm rounded-2xl px-4 sm:px-5 py-3 sm:py-4 shadow-lg shadow-black/10 border border-zinc-700/20 overflow-hidden ${isMobile ? "" : "hover:bg-zinc-800/90 hover:scale-[1.01] hover:shadow-xl hover:shadow-black/20"} transition-all duration-200 ${isDeleting ? "opacity-0 scale-95" : "opacity-100 scale-100"} ${isDragging ? "scale-105 opacity-80 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500" : ""}`}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, task.id)}>
      {/* Drag handle (решётка из точек) */}
      <div
        className={`cursor-grab active:cursor-grabbing text-zinc-500 ${isMobile ? "" : "invisible group-hover:visible"} transition-all duration-200 flex-shrink-0`}
        onMouseDown={(e) => e.stopPropagation()}>
        <svg
          className="w-4 sm:w-5 h-4 sm:h-5"
          fill="currentColor"
          viewBox="0 0 24 24">
          {/* Первая колонка */}
          <circle cx="5" cy="6" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="5" cy="18" r="1.5" />
          {/* Вторая колонка */}
          <circle cx="12" cy="6" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="18" r="1.5" />
          {/* Третья колонка */}
          <circle cx="19" cy="6" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
          <circle cx="19" cy="18" r="1.5" />
        </svg>
      </div>

      {/* Чекбокс для отметки выполнения */}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        onClick={(e) => e.stopPropagation()}
        className={`w-5 h-5 rounded-lg border-2 border-zinc-600 bg-zinc-700/50 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer accent-emerald-500 transition-all duration-200 ${isMobile ? "" : "hover:scale-110"} checked:active:scale-90`}
      />

      {/* Текст или input для редактирования */}
      {isEditing ? (
        <input
          ref={editInputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={saveEdit}
          className="flex-1 bg-zinc-700/80 px-4 py-2 rounded-xl text-white ring-2 ring-emerald-500 focus:outline-none transition-all duration-200"
        />
      ) : (
        <span
          className={`flex-1 cursor-grab transition-all duration-200 ${task.completed ? "line-through text-zinc-500 opacity-50" : "text-white"}`}>
          {task.text}
        </span>
      )}

      {/* Кнопки действий - на мобильных всегда видны, на десктопе только при hover */}
      <div
        className={`flex gap-1.5 ${isMobile ? "" : "opacity-0 group-hover:opacity-100"} transition-all duration-200`}>
        {/* Кнопка редактирования */}
        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              startEdit();
            }}
            className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700/50 rounded-xl transition-all duration-200">
            <EditIcon className="w-4 h-4" />
          </button>
        )}
        {/* Кнопка удаления */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-700/50 rounded-xl transition-all duration-200">
          <DeleteIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default TaskItem;
