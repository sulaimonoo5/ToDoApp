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
      onAdd(trimmed) // Уже капитализирован
      setText('') // Очищаем input
      inputRef.current?.focus() // Возвращаем фокус
    }
  }

  return (
    <div className="sticky top-4 z-10 mb-4 sm:mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2 sm:gap-3 bg-zinc-800/70 backdrop-blur-sm rounded-2xl p-1.5 sm:p-2 shadow-xl shadow-black/20 border border-zinc-700/30">
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
      </form>
    </div>
  )
}

export default TaskInput
