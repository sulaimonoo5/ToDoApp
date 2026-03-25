import React, { useState, useEffect } from 'react'
import TaskInput from './components/TaskInput'
import TaskList from './components/TaskList'

const STORAGE_KEY = 'todos'

function App() {
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setTasks(JSON.parse(stored))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  const addTask = (text) => {
    const newTask = {
      id: Date.now().toString(),
      text,
      completed: false
    }
    setTasks([...tasks, newTask])
  }

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id))
  }

  const toggleTask = (id) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ))
  }

  const completedCount = tasks.filter(t => t.completed).length
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0

  return (
    <div className="max-w-xl mx-auto pt-16 px-6 min-h-screen">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">Tasks</h1>
        <p className="text-zinc-400 mb-3">
          {tasks.length === 0 ? 'No tasks yet' : `${completedCount} of ${tasks.length} completed`}
        </p>
        {tasks.length > 0 && (
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      <TaskInput onAdd={addTask} />
      <TaskList
        tasks={tasks}
        onDelete={deleteTask}
        onToggle={toggleTask}
      />
    </div>
  )
}

export default App
