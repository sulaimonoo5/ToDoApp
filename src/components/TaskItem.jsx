import React, { useState, useRef, useEffect } from 'react'
import EditIcon from '../icons/EditIcon'
import DeleteIcon from '../icons/DeleteIcon'

function TaskItem({ task, onDelete, onToggle, onEdit, isDragging, onDragStart, onDragOver, onDrop, dragHandleProps }) {
  // Состояние для анимации удаления
  const [isDeleting, setIsDeleting] = useState(false)
  // Состояние для режима редактирования
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(task.text)
  const editInputRef = useRef(null)

  // Автофокус при входе в режим редактирования
  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }
  }, [isEditing])

  // Плавное удаление с анимацией
  const handleDelete = () => {
    setIsDeleting(true)
    // Удаляем после завершения анимации (200ms)
    setTimeout(() => onDelete(task.id), 200)
  }

  // Начать редактирование
  const startEdit = () => {
    setEditText(task.text)
    setIsEditing(true)
  }

  // Сохранить изменения
  const saveEdit = () => {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== task.text) {
      onEdit(task.id, trimmed)
    }
    setIsEditing(false)
  }

  // Отменить редактирование
  const cancelEdit = () => {
    setEditText(task.text)
    setIsEditing(false)
  }

  // Обработка Enter и Escape при редактировании
  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  return (
    <div 
      className={`group flex items-center gap-3 bg-zinc-800 rounded-xl px-4 py-3 shadow-sm hover:bg-zinc-750 hover:scale-[1.01] hover:shadow-md transition-all duration-200 ${isDeleting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} ${isDragging ? 'ring-2 ring-emerald-500' : ''}`}
      draggable={!isEditing}
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, task.id)}
    >
      {/* Drag handle (иконка для перетаскивания) */}
      <div 
        {...dragHandleProps}
        className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 transition-colors"
        onMouseDown={(e) => {
          // Предотвращаем startEdit при клике на drag handle
          e.stopPropagation()
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Чекбокс для отметки выполнения */}
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        onClick={(e) => e.stopPropagation()}
        className="w-5 h-5 rounded border-2 border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer accent-emerald-500 transition-transform duration-200 hover:scale-110 checked:active:scale-90"
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
          className="flex-1 bg-zinc-700 px-3 py-1 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      ) : (
        <span className={`flex-1 cursor-grab transition-all duration-200 ${task.completed ? 'line-through text-zinc-500 opacity-60' : 'text-white'}`}>
          {task.text}
        </span>
      )}

      {/* Кнопки действий видны только при hover */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Кнопка редактирования */}
        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              startEdit()
            }}
            className="p-1.5 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <EditIcon className="w-4 h-4" />
          </button>
        )}
        {/* Кнопка удаления */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          <DeleteIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default TaskItem
