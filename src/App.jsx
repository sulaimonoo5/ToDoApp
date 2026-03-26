import React, { useState, useEffect, useRef } from "react";
import TaskInput from "./components/TaskInput";
import TaskList from "./components/TaskList";
import Sidebar from "./components/Sidebar";
import LeftIcon from "./icons/LeftIcon";
import RightIcon from "./icons/RightIcon";

// Ключи для localStorage
const TASKS_KEY = "todos";
const SIDEBAR_KEY = "sidebarOpen";

// Форматирование даты
const formatDate = () => {
  const date = new Date();
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

function App() {
  // Список задач
  const [tasks, setTasks] = useState([]);
  // Определение размера экрана
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  // Состояние sidebar (открыт/закрыт)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // На десктопе загружаем из localStorage
    if (window.innerWidth >= 1024) {
      const saved = localStorage.getItem(SIDEBAR_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return false;
  });
  // Флаг: идёт ли загрузка из localStorage
  const isLoadingRef = useRef(true);

  // Отслеживание ширины окна
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      
      // На планшетах/мобильных - всегда закрыт
      if (!desktop) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Обработчик toggle
  const handleToggle = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    
    // На десктопе сохраняем в localStorage
    if (isDesktop) {
      localStorage.setItem(SIDEBAR_KEY, String(newState));
    }
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
    <div className="min-h-screen bg-black">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={handleToggle} isMobile={!isDesktop} />

      {/* Основной контент */}
      <main className="flex-1">
        {/* Кнопка открытия sidebar */}
        <button
          onClick={handleToggle}
          className={`fixed top-4 left-4 z-50 p-2 sm:p-3 bg-zinc-800/80 backdrop-blur-sm rounded-xl hover:scale-110 active:scale-95 transition-all duration-200 ${sidebarOpen ? '-z-10 opacity-0 pointer-events-none' : ''}`}
        >
          <RightIcon className="w-5 h-5 text-zinc-400 hover:text-emerald-400 transition-all" />
        </button>

        <div className="max-w-2xl mx-auto pt-20 px-4 sm:px-6 pb-32">
          {/* Заголовок и статистика */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">Tasks</h1>
            <p className="text-zinc-500 text-xs sm:text-sm mb-4 sm:mb-6">{formatDate()}</p>
            
            {/* Разделитель */}
            <div className="border-b border-zinc-800 mb-4 sm:mb-6" />
            
            {/* Прогресс */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-400 text-xs sm:text-sm">
                {tasks.length === 0
                  ? "No tasks yet"
                  : `${completedCount} of ${tasks.length} completed`}
              </p>
              <p className="text-zinc-500 text-xs sm:text-sm">{Math.round(progress)}%</p>
            </div>
            {tasks.length > 0 && (
              <div className="w-full h-2 bg-zinc-800/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-green-600 rounded-full transition-all duration-500 shadow-lg shadow-emerald-500/20"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            
            {/* Celebration message when all tasks completed */}
            {tasks.length > 0 && completedCount === tasks.length && (
              <div className="mt-4 text-center animate-fade-in">
                <p className="text-emerald-400 text-sm sm:text-base font-medium">
                  All tasks completed
                </p>
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
            isMobile={!isDesktop}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
