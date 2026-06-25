// Компонент TaskList — отображает отсортированный список задач с поддержкой drag & drop
// Сортирует задачи: сначала невыполненные (по приоритету high→low), затем выполненные (по приоритету)
// Разделяет невыполненные и выполненные визуальным разделителем "Completed"
// Drag & drop синхронизирует индексы между отсортированным и оригинальным массивом

import React, { useState, useRef } from 'react'
import TaskItem from './TaskItem'

function TaskList({ tasks, onDelete, onToggle, onReorder, onEdit, isMobile, goals = [] }) {
  // ID перетаскиваемого элемента (для стилизации)
  const [draggingId, setDraggingId] = useState(null)
  // ID элемента-цели (для отображения индикатора сброса)
  const [dropTargetId, setDropTargetId] = useState(null)
  // ref для хранения ID цели во время dragOver (чтобы не вызывать re-render)
  const dragOverId = useRef(null)

  // Числовые значения приоритетов для сортировки
  const priorityValues = { high: 3, medium: 2, low: 1 }

  // Сортировка: сначала невыполненные, затем по приоритету (high > medium > low)
  const sortedTasks = [...tasks].sort((a, b) => {
    // Невыполненные идут перед выполненными
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1
    }
    // Внутри группы сортируем по приоритету (high=3, medium=2, low=1)
    const priorityA = priorityValues[a.priority] || 1
    const priorityB = priorityValues[b.priority] || 1
    if (priorityA !== priorityB) {
      return priorityB - priorityA
    }
    // При одинаковом приоритете сохраняем исходный порядок
    return 0
  })

  // Разделяем отсортированные задачи на две группы
  const incompleteTasks = sortedTasks.filter(t => !t.completed)
  const completedTasks = sortedTasks.filter(t => t.completed)

  // Начало перетаскивания — запоминаем ID задачи
  const handleDragStart = (e, id) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  // Элемент, над которым находится курсор — показываем индикатор
  const handleDragOver = (e, id) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverId.current = id
    if (id !== draggingId) {
      setDropTargetId(id)
    }
  }

  // Сброс — финальное перемещение задачи
  const handleDrop = (e, targetId) => {
    e.preventDefault()
    
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null)
      return
    }

    // Находим индексы в отсортированном массиве (визуальный порядок)
    const fromIndex = sortedTasks.findIndex(t => t.id === draggingId)
    const toIndex = sortedTasks.findIndex(t => t.id === targetId)

    if (fromIndex !== -1 && toIndex !== -1) {
      // Пересчитываем в индексы оригинального массива (реальный порядок в state)
      const originalTasks = [...tasks]
      const fromOriginalIndex = originalTasks.findIndex(t => t.id === draggingId)
      const toOriginalIndex = originalTasks.findIndex(t => t.id === targetId)
      
      // Передаём в App для обновления state
      onReorder(fromOriginalIndex, toOriginalIndex)
    }

    // Сброс состояний drag & drop
    setDraggingId(null)
    dragOverId.current = null
    setDropTargetId(null)
  }

  return (
    <div className="space-y-2 pb-4">
      {/* Пустое состояние — иконка + подсказка */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in select-none">
          <svg className="w-12 h-12 text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-zinc-500 text-sm font-medium">Nothing here yet</p>
          <p className="text-zinc-600 text-xs mt-1.5">Start by creating your first task</p>
        </div>
      ) : (
        <>
          {/* Секция невыполненных задач */}
          {incompleteTasks.map((task) => (
            <div key={task.id} className="animate-fade-in">
              {/* Индикатор сброса (зелёная полоска) */}
              {draggingId && dropTargetId === task.id && (
                <div className="h-1 bg-emerald-500 rounded-full mb-2 shadow-lg shadow-emerald-500/50" />
              )}
              <TaskItem
                task={task}
                onDelete={onDelete}
                onToggle={onToggle}
                onEdit={onEdit}
                isDragging={draggingId === task.id}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isMobile={isMobile}
                goals={goals}
              />
            </div>
          ))}

          {/* Разделитель между невыполненными и выполненными задачами */}
          {incompleteTasks.length > 0 && completedTasks.length > 0 && (
            <div className="flex items-center gap-3 py-3">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-zinc-600 text-xs uppercase tracking-wider">Completed</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
          )}

          {/* Секция выполненных задач (плавный стиль, без исчезновения) */}
          {completedTasks.map((task) => (
            <div key={task.id} className="animate-fade-in">
              {/* Индикатор сброса и для выполненной секции */}
              {draggingId && dropTargetId === task.id && (
                <div className="h-1 bg-emerald-500 rounded-full mb-2 shadow-lg shadow-emerald-500/50" />
              )}
              <TaskItem
                task={task}
                onDelete={onDelete}
                onToggle={onToggle}
                onEdit={onEdit}
                isDragging={draggingId === task.id}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isMobile={isMobile}
                goals={goals}
              />
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export default TaskList
