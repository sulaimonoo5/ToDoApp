import React, { useState, useRef, useEffect } from 'react'

function TaskInput({ onAdd }) {
  const [text, setText] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (text.trim()) {
      onAdd(text.trim())
      setText('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="sticky top-4 z-10 mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2 bg-zinc-800/95 backdrop-blur-sm rounded-xl p-2 shadow-lg">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 bg-transparent px-3 py-2 text-white placeholder-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white px-5 py-2 rounded-lg font-medium transition-all duration-200"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  )
}

export default TaskInput
