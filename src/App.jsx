// Главный компонент App — ядро приложения
// Управляет всем состоянием: списки задач, корзина, поиск, фильтры, боковая панель
// Хранит данные в localStorage и синхронизирует их при каждом изменении
// Поток данных: App → TaskInput (добавление) → TaskList (отображение) → TaskItem (каждый элемент)
// Удаление: задача → trash (с deletedAt) → показ Undo toast на 4 сек → если Undo → восстановление из trash

import React, { useState, useEffect, useRef } from "react";
import TaskInput from "./components/TaskInput";
import TaskList from "./components/TaskList";
import Sidebar from "./components/Sidebar";
import Schedule from "./components/Schedule";
import Home from "./components/Home";
import Goals from "./components/Goals";
import AccountPage from "./components/AccountPage";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import ErrorBoundary from "./components/ErrorBoundary";
import WelcomeScreen from "./components/WelcomeScreen";
import { useAuth } from "./context/AuthContext";
import RightIcon from "./icons/RightIcon";
import ChevronIcon from "./icons/ChevronIcon";
import * as notificationService from "./services/notificationService";
import * as streakService from "./services/streakService";
import * as syncService from "./services/syncService";
import SyncImportDialog from "./components/SyncImportDialog";

// Ключи для localStorage
const LISTS_KEY = "todoLists";
const CURRENT_LIST_KEY = "currentListId";
const SIDEBAR_KEY = "sidebarOpen";
const TRASH_KEY = "taskTrash";
const CURRENT_PAGE_KEY = "currentPage";
const FILTER_KEY = "taskFilter";
const SEARCH_KEY = "taskSearch";
const GOALS_KEY = "goals";

// Константы
const TRASH_DAYS = 30;

// Форматирование даты
const formatDate = () => {
  const date = new Date();
  const options = { weekday: "long", month: "long", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
};

// Для единого Header — дата и время
const getDateStr = (d) => {
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
};
const getTimeStr = (d) => `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;

// Создание нового списка
const createNewList = (name) => ({
  id: Date.now().toString(),
  name: name.trim(),
  tasks: [],
});

// Проверка, истёк ли срок хранения в корзине (30 дней)
const isTrashExpired = (deletedAt) => {
  const now = Date.now();
  const daysDiff = (now - deletedAt) / (1000 * 60 * 60 * 24);
  return daysDiff > TRASH_DAYS;
};

// Получение текущих задач из списков
const getTasksFromLists = (lists, currentListId) => {
  const currentList = lists.find((l) => l.id === currentListId);
  return currentList ? currentList.tasks : [];
};

function App() {
  const { user, loading } = useAuth();
  const [authPage, setAuthPage] = useState("login");
  // Списки задач
  const [lists, setLists] = useState([]);
  // Goals
  const [goals, setGoals] = useState([]);
  // Текущий активный список
  const [currentListId, setCurrentListId] = useState(null);
  // Dropdown открыт?
  const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
  // Создание нового списка (input)
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListError, setNewListError] = useState("");
  // Редактирование списка
  const [editingListId, setEditingListId] = useState(null);
  const [editingListName, setEditingListName] = useState("");
  // Trash modal
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  // Trash задачи
  const [trash, setTrash] = useState([]);
  // Поиск
  const [searchQuery, setSearchQuery] = useState(() => {
    try { return localStorage.getItem(SEARCH_KEY) || ""; }
    catch { return ""; }
  });
  // Фильтр: all / active / completed
  const [filter, setFilter] = useState(() => {
    try {
      const saved = localStorage.getItem(FILTER_KEY);
      return ["all", "active", "completed"].includes(saved) ? saved : "all";
    } catch { return "all"; }
  });
  // Undo toast
  const [recentlyDeleted, setRecentlyDeleted] = useState(null);
  const undoTimeoutRef = useRef(null);
  // Определение размера экрана
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  // Состояние sidebar (открыт/закрыт)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Текущая страница: "home" | "tasks" | "schedule"
  // Всегда стартует с Home при новом запуске, внутри сессии сохраняет последнюю выбранную страницу
  const [currentPage, setCurrentPage] = useState("home");
  // Флаг: идёт ли загрузка из localStorage
  const isLoadingRef = useRef(true);
  // Часы для единого Header
  const [now, setNow] = useState(new Date());
  // Ref для dropdown
  const dropdownRef = useRef(null);
  // Текущая страница: 'tasks' | 'schedule'
  // Показывать WelcomeScreen при старте (только один раз за сессию)
  const [showWelcome, setShowWelcome] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const serverLoadedRef = useRef(false);
  const syncTimeoutRef = useRef(null);
  const prevUserRef = useRef(null);
  const syncIntervalRef = useRef(null);

  // Текущие задачи
  const tasks = getTasksFromLists(lists, currentListId);
  // Текущий список
  const currentList = lists.find((l) => l.id === currentListId);

  // Определение динамического заголовка
  const getGreeting = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return "This Weekend";
    }
    const hour = today.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Закрытие dropdown при клике вне его + ESC для закрытия trash
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsListDropdownOpen(false);
        setIsCreatingList(false);
        setNewListError("");
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isTrashOpen) {
        setIsTrashOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTrashOpen]);

  // Блокировка scroll заднего фона при открытом Trash
  useEffect(() => {
    if (isTrashOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isTrashOpen]);

  // Загрузка списков из localStorage при старте
  useEffect(() => {
    const storedLists = localStorage.getItem(LISTS_KEY);
    const storedCurrentListId = localStorage.getItem(CURRENT_LIST_KEY);
    const storedTrash = localStorage.getItem(TRASH_KEY);

    if (storedLists) {
      const parsedLists = JSON.parse(storedLists);
      setLists(parsedLists);

      if (
        storedCurrentListId &&
        parsedLists.find((l) => l.id === storedCurrentListId)
      ) {
        setCurrentListId(storedCurrentListId);
      } else if (parsedLists.length > 0) {
        setCurrentListId(parsedLists[0].id);
      }
    } else {
      // Создаём первый список по умолчанию
      const defaultList = createNewList("My Tasks");
      setLists([defaultList]);
      setCurrentListId(defaultList.id);
    }

    // Загрузка и очистка корзины
    if (storedTrash) {
      const parsedTrash = JSON.parse(storedTrash);
      // Удаляем задачи старше 30 дней
      const validTrash = parsedTrash.filter(
        (t) => !isTrashExpired(t.deletedAt),
      );
      setTrash(validTrash);
    }

    // Загрузка goals из localStorage
    try {
      const storedGoals = localStorage.getItem(GOALS_KEY);
      if (storedGoals) setGoals(JSON.parse(storedGoals));
    } catch {}

    isLoadingRef.current = false;
  }, []);

  // Сохранение списков в localStorage
  useEffect(() => {
    if (!isLoadingRef.current) {
      localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
    }
  }, [lists]);

  // Сохранение корзины в localStorage
  useEffect(() => {
    if (!isLoadingRef.current) {
      localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
    }
  }, [trash]);

  // Сохранение goals в localStorage
  useEffect(() => {
    if (!isLoadingRef.current) {
      localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    }
  }, [goals]);

  // Сохранение текущего списка в localStorage
  useEffect(() => {
    if (!isLoadingRef.current && currentListId) {
      localStorage.setItem(CURRENT_LIST_KEY, currentListId);
    }
  }, [currentListId]);

  // Загрузка состояния sidebar из localStorage при старте (только для десктопа)
  useEffect(() => {
    if (isDesktop) {
      const savedSidebar = localStorage.getItem(SIDEBAR_KEY);
      if (savedSidebar !== null) {
        setSidebarOpen(savedSidebar === "true");
      }
    } else {
      setSidebarOpen(false);
    }
  }, [isDesktop]);

  // Отслеживание ширины окна
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Сохранение sidebar в localStorage при изменении (только для десктопа)
  useEffect(() => {
    if (!isLoadingRef.current && isDesktop) {
      localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen));
    }
  }, [sidebarOpen, isDesktop]);

  // Сохранение currentPage в localStorage
  useEffect(() => {
    localStorage.setItem(CURRENT_PAGE_KEY, currentPage);
  }, [currentPage]);

  // Сохранение searchQuery в localStorage
  useEffect(() => {
    localStorage.setItem(SEARCH_KEY, searchQuery);
  }, [searchQuery]);

  // Сохранение filter в localStorage
  useEffect(() => {
    localStorage.setItem(FILTER_KEY, filter);
  }, [filter]);

  // Загрузка данных с сервера при авторизации / начальной загрузке
  useEffect(() => {
    if (loading || serverLoadedRef.current) return;
    if (user) {
      syncService.loadFromServer()
        .then(({ data }) => {
          serverLoadedRef.current = true;
          const storedLists = localStorage.getItem(LISTS_KEY);
          if (storedLists) setLists(JSON.parse(storedLists));
          const storedGoals = localStorage.getItem(GOALS_KEY);
          if (storedGoals) setGoals(JSON.parse(storedGoals));
          if (data && syncService.hasLocalData() && (!data.lists || data.lists.length === 0) && !syncService.isDataImported()) {
            setShowImportDialog(true);
          }
        })
        .catch(() => { serverLoadedRef.current = true; });
    } else {
      serverLoadedRef.current = false;
    }
  }, [user, loading]);

  // Авто-синхронизация при изменении списков или целей
  useEffect(() => {
    if (serverLoadedRef.current && user) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        syncService.saveToServer().catch(() => {});
      }, 2000);
    }
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, [lists, goals, user]);

  // Периодическая синхронизация каждые 30 секунд (для schedule/streak)
  useEffect(() => {
    if (user) {
      syncIntervalRef.current = setInterval(() => {
        syncService.saveToServer().catch(() => {});
      }, 30000);
    }
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [user]);

  // Запуск Notification Service (читает localStorage напрямую)
  useEffect(() => {
    notificationService.start();
    return () => notificationService.stop();
  }, []);

  // Таймер обновления часов в Header
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Отключение pull-to-refresh на мобильных — CSS overscroll-behavior в index.html + body overflow:hidden

  // Обработчик toggle
  const handleToggle = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
  };

  // Создать новый список
  const createList = () => {
    if (!newListName.trim()) {
      setNewListError("Please enter a list name");
      return;
    }
    const newList = createNewList(newListName);
    setLists([...lists, newList]);
    setCurrentListId(newList.id);
    setNewListName("");
    setNewListError("");
    setIsCreatingList(false);
    setIsListDropdownOpen(false);
  };

  // Переключиться на список
  const switchToList = (listId) => {
    setCurrentListId(listId);
    setIsListDropdownOpen(false);
  };

  // Начать редактирование списка
  const startEditList = (list) => {
    setEditingListId(list.id);
    setEditingListName(list.name);
  };

  // Сохранить изменённый список
  const saveEditList = () => {
    if (editingListName.trim()) {
      setLists(
        lists.map((list) =>
          list.id === editingListId
            ? { ...list, name: editingListName.trim() }
            : list,
        ),
      );
    }
    setEditingListId(null);
    setEditingListName("");
  };

  // Удалить список
  const deleteList = (listId) => {
    if (lists.length === 1) return;

    const newLists = lists.filter((l) => l.id !== listId);
    setLists(newLists);

    if (currentListId === listId) {
      setCurrentListId(newLists[0].id);
    }

    setIsListDropdownOpen(false);
  };

  // Добавить новую задачу
  const addTask = (text, priority = "low", goalId = null) => {
    const newTask = {
      id: Date.now().toString(),
      text,
      completed: false,
      priority,
      goalId,
    };
    setLists(
      lists.map((list) =>
        list.id === currentListId
          ? { ...list, tasks: [...list.tasks, newTask] }
          : list,
      ),
    );
  };

  // Удалить задачу (в trash)
  const deleteTask = (id) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    if (taskToDelete) {
      // Добавляем в trash
      const trashItem = {
        ...taskToDelete,
        listId: currentListId,
        deletedAt: Date.now(),
      };
      setTrash([...trash, trashItem]);

      // Показываем undo toast
      setRecentlyDeleted(taskToDelete);

      // Удаляем из списка
      setLists(
        lists.map((list) =>
          list.id === currentListId
            ? { ...list, tasks: list.tasks.filter((t) => t.id !== id) }
            : list,
        ),
      );

      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => {
        setRecentlyDeleted(null);
      }, 4000);
    }
  };

  // Undo удаление: восстанавливаем задачу в список и ОДНОВРЕМЕННО удаляем из trash
  const undoDelete = () => {
    if (recentlyDeleted) {
      // Возвращаем задачу обратно в текущий список
      setLists(
        lists.map((list) =>
          list.id === currentListId
            ? { ...list, tasks: [...list.tasks, recentlyDeleted] }
            : list,
        ),
      );
      // Удаляем задачу из корзины, чтобы не было дубликатов при открытии Trash
      setTrash(trash.filter((t) => t.id !== recentlyDeleted.id));
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      setRecentlyDeleted(null);
    }
  };

  // Восстановить задачу из корзины
  const restoreTask = (trashItem) => {
    const { id, listId, deletedAt, ...taskData } = trashItem;

    const targetList = lists.find((l) => l.id === listId);
    if (targetList) {
      setLists(
        lists.map((list) =>
          list.id === listId
            ? { ...list, tasks: [...list.tasks, { id, ...taskData }] }
            : list,
        ),
      );
    } else {
      setLists(
        lists.map((list) =>
          list.id === currentListId
            ? { ...list, tasks: [...list.tasks, { id, ...taskData }] }
            : list,
        ),
      );
    }

    setTrash(trash.filter((t) => t.id !== id));
  };

  // Удалить задачу навсегда
  const permanentlyDeleteTask = (id) => {
    setTrash(trash.filter((t) => t.id !== id));
  };

  // Переключить статус выполнения задачи
  const toggleTask = (id) => {
    const taskToToggle = tasks.find((t) => t.id === id);
    const wasUncompleted = taskToToggle && !taskToToggle.completed;
    setLists(
      lists.map((list) =>
        list.id === currentListId
          ? {
              ...list,
              tasks: list.tasks.map((task) =>
                task.id === id
                  ? {
                      ...task,
                      completed: !task.completed,
                      completedAt: !task.completed ? new Date().toISOString() : undefined,
                    }
                  : task,
              ),
            }
          : list,
      ),
    );
    if (wasUncompleted) {
      streakService.updateStreak(new Date());
    }
  };

  // Редактировать текст и приоритет задачи
  const editTask = (id, newText, newPriority, newGoalId) => {
    setLists(
      lists.map((list) =>
        list.id === currentListId
          ? {
              ...list,
              tasks: list.tasks.map((task) =>
                task.id === id
                  ? { ...task, text: newText, priority: newPriority, goalId: newGoalId || null }
                  : task,
              ),
            }
          : list,
      ),
    );
  };

  // Переместить задачу (для drag & drop)
  const reorderTasks = (fromIndex, toIndex) => {
    setLists(
      lists.map((list) => {
        if (list.id !== currentListId) return list;
        const newTasks = [...list.tasks];
        const [moved] = newTasks.splice(fromIndex, 1);
        newTasks.splice(toIndex, 0, moved);
        return { ...list, tasks: newTasks };
      }),
    );
  };

  // Goals CRUD
  const addGoal = ({ name, description }) => {
    const newGoal = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };
    setGoals([...goals, newGoal]);
  };

  const editGoal = (id, { name, description }) => {
    setGoals(
      goals.map((g) =>
        g.id === id
          ? { ...g, name: name.trim(), description: description.trim() }
          : g,
      ),
    );
  };

  const deleteGoal = (id) => {
    setGoals(goals.filter((g) => g.id !== id));
  };

  // Импорт локальных данных после регистрации
  const handleImport = async () => {
    setImporting(true);
    try {
      await syncService.importLocalData();
      setShowImportDialog(false);
      setImporting(false);
      const storedLists = localStorage.getItem(LISTS_KEY);
      if (storedLists) setLists(JSON.parse(storedLists));
      const storedGoals = localStorage.getItem(GOALS_KEY);
      if (storedGoals) setGoals(JSON.parse(storedGoals));
    } catch {
      setImporting(false);
      setShowImportDialog(false);
    }
  };

  const handleSkipImport = () => {
    syncService.clearImportedFlag();
    setShowImportDialog(false);
  };

  // Подсчёт выполненных задач
  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <ErrorBoundary>
    {loading ? (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-zinc-400 text-sm animate-pulse">Loading...</div>
      </div>
    ) : !user ? (
      authPage === "register" ? (
        <RegisterPage onNavigate={setAuthPage} />
      ) : (
        <LoginPage onNavigate={setAuthPage} />
      )
    ) : (
    <div className="h-screen overflow-hidden bg-black">
      {/* WelcomeScreen — только при полном запуске, не при переключении страниц */}
      {showWelcome && (
        <WelcomeScreen onComplete={() => setShowWelcome(false)} />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={handleToggle}
        isMobile={!isDesktop}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Основной контент — flex-колонка с локальным scroll только у списка задач */}
      <main
        className={`flex-1 h-full overflow-hidden transition-all duration-300 ${sidebarOpen && isDesktop ? "ml-80" : ""}`}>

        {currentPage === "home" ? (
          <Home
            onToggleSidebar={handleToggle}
            sidebarOpen={sidebarOpen}
            tasks={tasks}
            lists={lists}
            goals={goals}
            now={now}
            onPageChange={setCurrentPage}
            onToggle={toggleTask}
          />
        ) : currentPage === "tasks" ? (
          <div className="flex flex-col h-full">
            {/* Единый закреплённый Header */}
            <div className="sticky top-0 z-20 bg-black/70 backdrop-blur-md border-b border-zinc-800/50 flex-shrink-0">
              <div className="max-w-5xl mx-auto px-4 sm:px-6">
                <div className="flex items-center gap-3 sm:gap-4 py-3">
                  <button
                    onClick={handleToggle}
                    className={`p-2 sm:p-3 bg-zinc-800/80 backdrop-blur-sm rounded-xl hover:scale-110 active:scale-95 transition-all duration-200 flex-shrink-0 ${sidebarOpen && isDesktop ? "opacity-0 pointer-events-none" : ""}`}
                    aria-label="Toggle sidebar">
                    <RightIcon className="w-5 h-5 text-zinc-400 hover:text-emerald-400 transition-all" />
                  </button>

                  <h1 className="text-xl sm:text-2xl font-bold text-white flex-shrink-0">{getGreeting()}</h1>

                  <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {/* Dropdown переключатель списков */}
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setIsListDropdownOpen(!isListDropdownOpen)}
                        className="flex items-center gap-2 bg-zinc-800/70 hover:bg-zinc-700/70 w-[110px] sm:w-[145px] flex-shrink-0 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all duration-200">
                        <span className="text-white text-xs sm:text-sm truncate min-w-0">{currentList ? currentList.name : "Select List"}</span>
                        <ChevronIcon className={`w-3.5 h-3.5 text-zinc-400 flex-shrink-0 transition-transform duration-200 ${isListDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isListDropdownOpen && (
                        <div className="absolute top-full right-0 mt-2 w-72 max-h-44 overflow-y-auto bg-zinc-800 rounded-xl shadow-xl shadow-black/30 border border-zinc-700/50 py-2 z-50 animate-fade-in">
                          {lists.map((list) => (
                            <div key={list.id} className={`flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-200 min-w-0 overflow-hidden ${list.id === currentListId ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-300 hover:bg-zinc-700"}`}>
                              {editingListId === list.id ? (
                                <input type="text" value={editingListName} onChange={(e) => setEditingListName(e.target.value.slice(0, 50))} onKeyDown={(e) => { if (e.key === "Enter") saveEditList(); if (e.key === "Escape") { setEditingListId(null); setEditingListName(""); } }} onBlur={saveEditList} autoFocus className="flex-1 bg-zinc-700/50 px-2 py-1 rounded text-white text-sm focus:outline-none" />
        ) : currentPage === "account" ? (
          <AccountPage onBack={() => setCurrentPage("home")} />
        ) : (
                                <button onClick={() => switchToList(list.id)} className="flex-1 text-left truncate min-w-0">{list.name}</button>
                              )}
                              {list.id === currentListId && (
                                <div className="flex gap-1 ml-2">
                                  <button onClick={() => startEditList(list)} className="p-1 text-zinc-400 hover:text-emerald-400 transition-colors" title="Rename">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </button>
                                  {lists.length > 1 && (
                                    <button onClick={() => deleteList(list.id)} className="p-1 text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          <div className="border-t border-zinc-700/50 my-2" />
                          {isCreatingList ? (
                            <div className="px-3 py-2">
                              <input type="text" value={newListName} onChange={(e) => { setNewListName(e.target.value.slice(0, 50)); if (newListError) setNewListError(""); }} onKeyDown={(e) => { if (e.key === "Enter") createList(); if (e.key === "Escape") { setIsCreatingList(false); setNewListName(""); setNewListError(""); } }} placeholder="List name..." autoFocus className={`w-full bg-zinc-700/50 px-3 py-2 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none transition-all duration-200 ${newListError ? "ring-2 ring-red-500/60" : "focus:ring-2 focus:ring-emerald-500/50"}`} />
                              {newListError && <p className="text-red-400 text-xs mt-1.5 animate-fade-in">{newListError}</p>}
                              <div className="flex gap-2 mt-2">
                                <button onClick={createList} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-medium py-1.5 rounded-lg transition-all duration-200">Create</button>
                                <button onClick={() => { setIsCreatingList(false); setNewListName(""); setNewListError(""); }} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-medium py-1.5 rounded-lg transition-all duration-200">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setIsCreatingList(true); setNewListError(""); }} className="w-full text-left px-4 py-2.5 text-sm text-emerald-400 hover:bg-zinc-700 transition-all duration-200">+ Create new list</button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Кнопка корзины */}
                    <button onClick={() => setIsTrashOpen(true)} className="relative p-2 bg-zinc-800/70 hover:bg-zinc-700/70 rounded-xl transition-all duration-200" title="Trash">
                      <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      {trash.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{trash.length}</span>}
                    </button>

                    {/* Дата и время */}
                    <span className="hidden sm:inline text-xs text-zinc-400 whitespace-nowrap">📅 {getDateStr(now)}</span>
                    <span className="text-xs text-zinc-400 font-mono whitespace-nowrap">🕒 {getTimeStr(now)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable контент */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-8 space-y-4">
                <p className="text-zinc-500 text-xs sm:text-sm mb-2">Stay focused. One step at a time.</p>
                <p className="text-zinc-600 text-xs">{formatDate()}</p>

                <div className="border-b border-zinc-800" />

                {/* Прогресс */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-zinc-400 text-xs sm:text-sm">
                      {tasks.length === 0 ? "No tasks yet" : `${completedCount} of ${tasks.length} completed`}
                    </p>
                    <p className="text-zinc-500 text-xs sm:text-sm">{Math.round(progress)}%</p>
                  </div>
                  {tasks.length > 0 && (
                    <div className="w-full h-2 bg-zinc-800/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-green-600 rounded-full transition-all duration-500 shadow-lg shadow-emerald-500/20" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                  {tasks.length > 0 && completedCount === tasks.length && (
                    <div className="mt-4 text-center animate-fade-in">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-emerald-400 text-sm font-medium">All tasks completed</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Поиск и фильтры */}
                <div className="space-y-3">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full bg-zinc-800/50 backdrop-blur-sm px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all duration-200" />
                  <div className="flex gap-2">
                    {["all", "active", "completed"].map((f) => (
                      <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${filter === f ? "bg-emerald-500 text-white" : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-white"}`}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TaskInput */}
                <TaskInput onAdd={addTask} goals={goals} />

                {/* TaskList */}
                <div className="min-h-0">
                  {(() => {
                    let filtered = tasks;
                    if (searchQuery) filtered = filtered.filter((t) => t.text.toLowerCase().includes(searchQuery.toLowerCase()));
                    if (filter === "active") filtered = filtered.filter((t) => !t.completed);
                    if (filter === "completed") filtered = filtered.filter((t) => t.completed);
                    return <TaskList tasks={filtered} onDelete={deleteTask} onToggle={toggleTask} onReorder={reorderTasks} onEdit={editTask} isMobile={!isDesktop} goals={goals} />;
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : currentPage === "schedule" ? (
          <Schedule onToggleSidebar={handleToggle} sidebarOpen={sidebarOpen} />
        ) : currentPage === "goals" ? (
          <Goals
            onToggleSidebar={handleToggle}
            sidebarOpen={sidebarOpen}
            goals={goals}
            lists={lists}
            now={now}
            onAddGoal={addGoal}
            onEditGoal={editGoal}
            onDeleteGoal={deleteGoal}
          />
        ) : (
          <Home
            onToggleSidebar={handleToggle}
            sidebarOpen={sidebarOpen}
            tasks={tasks}
            lists={lists}
            onPageChange={setCurrentPage}
            onToggle={toggleTask}
          />
        )}
      </main>

      {/* Trash Modal — фиксированное модальное окно с блокировкой scroll фона */}
      {isTrashOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsTrashOpen(false)}>
          {/* Контейнер модалки — клик внутри НЕ закрывает (stopPropagation) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[90%] sm:w-[540px] lg:w-[620px] max-h-[80vh] sm:max-h-[70vh] bg-zinc-900 rounded-2xl shadow-2xl shadow-black/40 border border-zinc-800 flex flex-col animate-scale-in">
            {/* Header — фиксирован сверху */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
              <h2 className="text-xl font-bold text-white">Trash</h2>
              <button
                onClick={() => setIsTrashOpen(false)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Список задач — ТОЛЬКО здесь внутренний скролл */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {trash.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">Trash is empty</p>
              ) : (
                trash.map((item) => {
                  const daysLeft = Math.ceil(
                    TRASH_DAYS -
                      (Date.now() - item.deletedAt) / (1000 * 60 * 60 * 24),
                  );
                  const listName =
                    lists.find((l) => l.id === item.listId)?.name ||
                    "Unknown list";

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-zinc-800/50 px-4 py-3 rounded-xl flex-shrink-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">
                          {item.text}
                        </p>
                        <p className="text-zinc-500 text-xs mt-1">
                          From: {listName} • {daysLeft} days left
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4 flex-shrink-0">
                        <button
                          onClick={() => restoreTask(item)}
                          className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-500/30 transition-all">
                          Restore
                        </button>
                        <button
                          onClick={() => permanentlyDeleteTask(item.id)}
                          className="px-3 py-1.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/30 transition-all">
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
          </div>
        </div>
      </div>
      )}

      {/* Undo Toast */}
      {recentlyDeleted && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-2 sm:gap-5 bg-zinc-800/95 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-4 rounded-xl shadow-xl shadow-black/40 border border-zinc-700/50">
            <span className="text-zinc-200 text-sm sm:text-base font-medium truncate min-w-0">
              Task deleted
            </span>
            <button
              onClick={undoDelete}
              className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs sm:text-sm px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg transition-all duration-200 active:scale-95">
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
    )}
      {showImportDialog && (
        <SyncImportDialog
          onImport={handleImport}
          onSkip={handleSkipImport}
          importing={importing}
        />
      )}
    </ErrorBoundary>
  );
}

export default App;
