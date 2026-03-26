import React, { useState, useEffect, useRef } from "react";
import TaskInput from "./components/TaskInput";
import TaskList from "./components/TaskList";
import Sidebar from "./components/Sidebar";
import MenuIcon from "./icons/MenuIcon";

// Ключи для localStorage
const TASKS_KEY = "todos";
const SIDEBAR_KEY = "sidebarOpen";

function App() {
  // Список задач
  const [tasks, setTasks] = useState([]);
  // Состояние sidebar (открыт/закрыт)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Загрузка состояния из localStorage при инициализации
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
    // По умолчанию: открыт на большом экране
    return window.innerWidth >= 1024;
  });
  // Флаг: идёт ли загрузка из localStorage
  const isLoadingRef = useRef(true);
  // Флаг: пользователь уже взаимодействовал с toggle
  const userInteractedRef = useRef(false);

  // Отслеживание ширины окна (только при первом рендере)
  useEffect(() => {
    const handleResize = () => {
      // Не менять состояние если пользователь уже взаимодействовал
      if (userInteractedRef.current) return;
      
      const wide = window.innerWidth >= 1024;
      // Если localStorage пуст - применяем автологику
      if (localStorage.getItem(SIDEBAR_KEY) === null) {
        setSidebarOpen(wide);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Обработчик toggle
  const handleToggle = () => {
    userInteractedRef.current = true;
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    // Сохраняем в localStorage
    localStorage.setItem(SIDEBAR_KEY, String(newState));
  };

  // Загрузка задач из localStorage при старте
  useEffect(() => {
    const stored = localStorage.getItem(TASKS_KEY);
    if (stored) {
      setTasks(JSON.parse(stored));
    }
    isLoadingRef.current = false;
  }, []);

  // Сохранение задач в localStorage при изменении
  useEffect(() => {
    if (isLoadingRef.current) return;
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // Добавить новую задачу
  const addTask = (text) => {
    const newTask = {
      id: Date.now().toString(),
      text,
      completed: false,
    };
    setTasks([...tasks, newTask]);
  };

  // Удалить задачу по id
  const deleteTask = (id) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  // Переключить статус выполнения задачи
  const toggleTask = (id) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  // Редактировать текст задачи
  const editTask = (id, newText) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, text: newText } : task
      )
    );
  };

  // Переместить задачу (для drag & drop)
  const reorderTasks = (fromIndex, toIndex) => {
    const newTasks = [...tasks];
    const [moved] = newTasks.splice(fromIndex, 1);
    newTasks.splice(toIndex, 0, moved);
    setTasks(newTasks);
  };

  // Подсчёт выполненных задач
  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={handleToggle}
      />

      {/* Кнопка открытия меню */}
      <button
        onClick={handleToggle}
        className="fixed top-4 left-4 z-30 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
      >
        <MenuIcon className="w-6 h-6 text-white" />
      </button>

      {/* Основной контент */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-80' : ''}`}>
        <div className="max-w-xl mx-auto pt-16 px-6">
          {/* Заголовок и статистика */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-2">Tasks</h1>
            <p className="text-zinc-400 mb-3">
              {tasks.length === 0
                ? "No tasks yet"
                : `${completedCount} of ${tasks.length} completed`}
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

          {/* Поле ввода новой задачи */}
          <TaskInput onAdd={addTask} />

          {/* Список задач */}
          <TaskList 
            tasks={tasks} 
            onDelete={deleteTask} 
            onToggle={toggleTask}
            onReorder={reorderTasks}
            onEdit={editTask}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
