import React, { useState, useRef, useEffect } from 'react'

function TaskInput({ onAdd }) {
  // Текст, вводимый пользователем
  const [text, setText] = useState('')
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

  // Обработка отправки формы (Enter или кнопка)
  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed) {
      const capitalized = capitalize(trimmed)
      console.log('[Input] Submitting:', capitalized)
      onAdd(capitalized) // Отправляем с заглавной буквой
      setText('') // Очищаем input
      inputRef.current?.focus() // Возвращаем фокус
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
