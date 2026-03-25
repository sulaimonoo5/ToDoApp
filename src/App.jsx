"use client";
import React, { useState, useEffect, useRef, use } from "react";
import TaskInput from "./components/TaskInput";
import TaskList from "./components/TaskList";

// Ключ для хранения задач в localStorage
const STORAGE_KEY = "todos";

function App() {
  // Список задач
  const [tasks, setTasks] = useState([]);
  // Флаг: идёт ли загрузка из localStorage (для предотвращения race condition)
  const isLoadingRef = useRef(true);

  // Загрузка задач из localStorage при старте
  useEffect(() => {
    console.log("[Load] Checking localStorage...");
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log("[Load] Found tasks:", parsed.length);
      setTasks(parsed);
    } else {
      console.log("[Load] No saved tasks found");
    }
    // Загрузка завершена — разрешаем сохранение
    isLoadingRef.current = false;
  }, []);

  // Сохранение задач в localStorage при изменении
  useEffect(() => {
    // Не сохранять пустой массив пока идёт загрузка (предотвращает race condition)
    if (isLoadingRef.current) {
      console.log("[Save] Skipping (still loading)...");
      return;
    }
    console.log("[Save] Saving tasks:", tasks.length);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // Добавить новую задачу
  const addTask = (text) => {
    const newTask = {
      id: Date.now().toString(), // Уникальный id на основе времени
      text, // Текст задачи
      completed: false, // По умолчанию не выполнена
    };
    console.log("[Add] New task:", text);
    setTasks([...tasks, newTask]);
  };

  // Удалить задачу по id
  const deleteTask = (id) => {
    console.log("[Delete] Task id:", id);
    setTasks(tasks.filter((task) => task.id !== id));
  };

  // Переключить статус выполнения задачи
  const toggleTask = (id) => {
    console.log("[Toggle] Task id:", id);
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  // Подсчёт выполненных задач
  const completedCount = tasks.filter((t) => t.completed).length;
  // Процент выполнения для progress bar
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="max-w-xl mx-auto pt-16 px-6 min-h-screen">
      {/* Заголовок и статистика */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">Tasks</h1>
        <p className="text-zinc-400 mb-3">
          {tasks.length === 0
            ? "No tasks yet"
            : `${completedCount} of ${tasks.length} completed`}
        </p>
        {/* Progress bar показывается только если есть задачи */}
        {tasks.length > 0 && (
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Поле ввода новой задачи */}
      <TaskInput onAdd={addTask} />

      {/* Список задач */}
      <TaskList tasks={tasks} onDelete={deleteTask} onToggle={toggleTask} />
    </div>
  );
}

export default App;
