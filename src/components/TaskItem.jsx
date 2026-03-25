import React, { useState } from 'react'

function TaskItem({ task, onDelete, onToggle }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = () => {
    setIsDeleting(true)
    setTimeout(() => onDelete(task.id), 200)
  }

  return (
    <div className={`group flex items-center gap-4 bg-zinc-800 rounded-xl px-5 py-4 shadow-sm hover:bg-zinc-750 hover:scale-[1.01] hover:shadow-md transition-all duration-200 ${isDeleting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
        className="w-5 h-5 rounded border-2 border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer accent-emerald-500 transition-transform duration-200 hover:scale-110 checked:active:scale-90"
      />
      <span className={`flex-1 transition-all duration-200 ${task.completed ? 'line-through text-zinc-500 opacity-60' : 'text-white'}`}>
        {task.text}
      </span>
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all duration-200 text-sm"
      >
        Delete
      </button>
    </div>
  )
}

export default TaskItem
