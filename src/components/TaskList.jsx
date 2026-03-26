import React, { useState, useRef } from 'react'
import TaskItem from './TaskItem'

function TaskList({ tasks, onDelete, onToggle, onReorder, onEdit, isMobile }) {
  // Состояние для отслеживания перетаскиваемого элемента
  const [draggingId, setDraggingId] = useState(null)
  const dragOverId = useRef(null)

  // Сортировка: невыполненные сверху, выполненные снизу
  const sortedTasks = [...tasks].sort((a, b) => {
    // Если оба в одной группе - сохраняем порядок
    if (a.completed === b.completed) return 0
    // Невыполненные сверху
    return a.completed ? 1 : -1
  })

  // Начать перетаскивание
  const handleDragStart = (e, id) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  // Элемент над которым находимся
  const handleDragOver = (e, id) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverId.current = id
  }

  // Отпустили элемент
  const handleDrop = (e, targetId) => {
    e.preventDefault()
    
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null)
      return
    }

    // Находим индексы в ОТСОРТИРОВАННОМ массиве
    const fromIndex = sortedTasks.findIndex(t => t.id === draggingId)
    const toIndex = sortedTasks.findIndex(t => t.id === targetId)

    if (fromIndex !== -1 && toIndex !== -1) {
      // Пересчитываем индексы в ОРИГИНАЛЬНОМ массиве
      const originalTasks = [...tasks]
      const fromOriginalIndex = originalTasks.findIndex(t => t.id === draggingId)
      const toOriginalIndex = originalTasks.findIndex(t => t.id === targetId)
      
      onReorder(fromOriginalIndex, toOriginalIndex)
    }

    setDraggingId(null)
    dragOverId.current = null
  }

  // Drag handle props для каждого элемента
  const getDragHandleProps = (id) => ({
    draggable: false
  })

  return (
    <div className="max-h-[calc(100vh-280px)] overflow-y-auto scroll-smooth space-y-2 pb-4">
      {/* Пустое состояние */}
      {tasks.length === 0 ? (
        <p className="text-zinc-500 text-center py-16 opacity-60 animate-pulse">No tasks yet</p>
      ) : (
        /* Список задач с анимацией появления */
        sortedTasks.map((task, index) => (
          <div
            key={task.id}
            className="animate-fade-in"
          >
            <TaskItem
              task={task}
              onDelete={onDelete}
              onToggle={onToggle}
              onEdit={onEdit}
              isDragging={draggingId === task.id}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              dragHandleProps={getDragHandleProps(task.id)}
              isMobile={isMobile}
            />
          </div>
        ))
      )}
    </div>
  )
}

export default TaskList
