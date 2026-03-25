import React from 'react'
import TaskItem from './TaskItem'

function TaskList({ tasks, onDelete, onToggle }) {
  return (
    <div className="max-h-[calc(100vh-280px)] overflow-y-auto scroll-smooth space-y-2 pb-4">
      {tasks.length === 0 ? (
        <p className="text-zinc-500 text-center py-16 opacity-60 animate-pulse">No tasks yet</p>
      ) : (
        tasks.map(task => (
          <div
            key={task.id}
            className="animate-fade-in"
          >
            <TaskItem
              task={task}
              onDelete={onDelete}
              onToggle={onToggle}
            />
          </div>
        ))
      )}
    </div>
  )
}

export default TaskList
