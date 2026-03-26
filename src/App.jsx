import React, { useState, useEffect, useRef } from "react";
import TaskInput from "./components/TaskInput";
import TaskList from "./components/TaskList";
import Sidebar from "./components/Sidebar";
import MenuIcon from "./icons/MenuIcon";

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
    // На планшетах/мобильных - всегда закрыт
    if (window.innerWidth < 1024) {
      return false;
    }
    // На десктопе - загружаем из localStorage
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
    // По умолчанию на десктопе: открыт
    return true;
  });
  // Флаг: идёт ли загрузка из localStorage
  const isLoadingRef = useRef(true);
  // Флаг: пользователь уже взаимодействовал с toggle
  const userInteractedRef = useRef(false);

  // Отслеживание ширины окна
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      
      // На планшетах/мобильных - всегда закрыт, без localStorage
      if (!desktop) {
        userInteractedRef.current = false;
        setSidebarOpen(false);
        return;
      }
      
      // На десктопе - применяем localStorage логику
      if (userInteractedRef.current) return;
      
      const saved = localStorage.getItem(SIDEBAR_KEY);
      if (saved !== null) {
        setSidebarOpen(saved === 'true');
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Обработчик toggle
  const handleToggle = () => {
    // На планшетах/мобильных - просто переключаем без localStorage
    if (!isDesktop) {
      setSidebarOpen(!sidebarOpen);
      return;
    }
    
    // На десктопе - сохраняем в localStorage
    userInteractedRef.current = true;
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
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
        className="fixed top-4 left-4 z-30 p-2.5 bg-zinc-800/80 backdrop-blur-sm hover:bg-zinc-700 rounded-xl transition-all duration-200 border border-zinc-700/50"
      >
        <MenuIcon className="w-5 h-5 text-white" />
      </button>

      {/* Основной контент */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-80' : ''}`}>
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
