import React, { useState, useRef, useEffect } from 'react'

function TaskInput({ onAdd }) {
  // Текст, вводимый пользователем
  const [text, setText] = useState('')
  // Приоритет задачи
  const [priority, setPriority] = useState('low')
  // Ссылка на input для автофокуса
  const inputRef = useRef(null)

  // Автофокус на input при загрузке
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Капитализация: первая буква заглавная, остальные строчные
  const capitalize = (str) => {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  // Обработка ввода с автокапитализацией первой буквы
  const handleChange = (e) => {
    const value = e.target.value
    // Капитализируем первую букву при вводе
    const cursorPos = e.target.selectionStart
    const capitalized = capitalize(value)
    setText(capitalized)
    // Возвращаем курсор на место (иначе он прыгнет в конец)
    setTimeout(() => {
      inputRef.current?.setSelectionRange(cursorPos, cursorPos)
    }, 0)
  }

  // Обработка отправки формы (Enter или кнопка)
  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed) {
      onAdd(trimmed, priority)
      setText('')
      setPriority('low')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="sticky top-4 z-10 mb-4 sm:mb-6">
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
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-95 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base transition-all duration-200 shadow-lg shadow-emerald-500/25 flex-shrink-0"
            >
              Add
            </button>
          </div>
          <div className="flex items-center gap-2 px-2">
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
          </div>
        </div>
      </form>
    </div>
  )
}

export default TaskInput
