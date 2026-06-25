// Компонент TaskInput — форма для создания новой задачи
// Позволяет ввести текст задачи и выбрать приоритет (low/medium/high)
// После добавления сбрасывает поля и возвращает фокус на input

import React, { useState, useRef, useEffect } from 'react'

function TaskInput({ onAdd, goals = [] }) {
  const [text, setText] = useState('')
  const [priority, setPriority] = useState('low')
  const [goalId, setGoalId] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const capitalize = (str) => {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  const handleChange = (e) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    const capitalized = capitalize(value)
    setText(capitalized)
    setTimeout(() => {
      inputRef.current?.setSelectionRange(cursorPos, cursorPos)
    }, 0)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed) {
      onAdd(trimmed, priority, goalId || null)
      setText('')
      setPriority('low')
      setGoalId('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="mb-4 sm:mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2 sm:gap-3 bg-zinc-800/70 backdrop-blur-sm rounded-2xl p-1.5 sm:p-2 shadow-xl shadow-black/20 border border-zinc-700/30">
          <div className="flex gap-2 sm:gap-3">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={handleChange}
              placeholder="Add a new task..."
              className="flex-1 min-w-0 bg-transparent px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-white placeholder-zinc-500 focus:outline-none transition-all duration-200"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 hover:scale-105 hover:shadow-emerald-500/40 active:scale-95 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base transition-all duration-150 shadow-lg shadow-emerald-500/25 flex-shrink-0"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2">
            <span className="text-zinc-500 text-xs">Priority:</span>
            {['low', 'medium', 'high'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                  priority === p
                    ? p === 'high' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : p === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                    : 'bg-zinc-700/50 text-zinc-300 border border-zinc-600/50'
                    : 'bg-zinc-700/30 text-zinc-500 hover:bg-zinc-700/50 hover:text-zinc-300 border border-transparent'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
            {goals.length > 0 && (
              <>
                <span className="text-zinc-500 text-xs ml-2">Goal:</span>
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className="bg-zinc-700/50 text-zinc-300 text-xs px-2 py-1 rounded-lg border border-zinc-600/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  <option value="">None</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

export default TaskInput
