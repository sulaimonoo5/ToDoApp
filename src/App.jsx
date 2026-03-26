import React, { useState, useEffect, useRef } from "react";
import TaskInput from "./components/TaskInput";
import TaskList from "./components/TaskList";
import Sidebar from "./components/Sidebar";
import LeftIcon from "./icons/LeftIcon";
import RightIcon from "./icons/RightIcon";
import ChevronIcon from "./icons/ChevronIcon";

// Ключи для localStorage
const LISTS_KEY = "todoLists";
const CURRENT_LIST_KEY = "currentListId";
const SIDEBAR_KEY = "sidebarOpen";
const TRASH_KEY = "taskTrash";

// Константы
const TRASH_DAYS = 30;

// Форматирование даты
const formatDate = () => {
  const date = new Date();
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};

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
  const currentList = lists.find(l => l.id === currentListId);
  return currentList ? currentList.tasks : [];
};

function App() {
  // Списки задач
  const [lists, setLists] = useState([]);
  // Текущий активный список
  const [currentListId, setCurrentListId] = useState(null);
  // Dropdown открыт?
  const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
  // Создание нового списка (input)
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  // Редактирование списка
  const [editingListId, setEditingListId] = useState(null);
  const [editingListName, setEditingListName] = useState('');
  // Trash modal
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  // Trash задачи
  const [trash, setTrash] = useState([]);
  // Поиск
  const [searchQuery, setSearchQuery] = useState('');
  // Фильтр: all / active / completed
  const [filter, setFilter] = useState('all');
  // Undo toast
  const [recentlyDeleted, setRecentlyDeleted] = useState(null);
  const undoTimeoutRef = useRef(null);
  // Определение размера экрана
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  // Состояние sidebar (открыт/закрыт)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Флаг: идёт ли загрузка из localStorage
  const isLoadingRef = useRef(true);
  // Ref для dropdown
  const dropdownRef = useRef(null);

  // Текущие задачи
  const tasks = getTasksFromLists(lists, currentListId);
  // Текущий список
  const currentList = lists.find(l => l.id === currentListId);

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

  // Закрытие dropdown и trash при клике вне их + ESC для закрытия trash
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsListDropdownOpen(false);
        setIsCreatingList(false);
      }
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isTrashOpen) {
        setIsTrashOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
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
      
      if (storedCurrentListId && parsedLists.find(l => l.id === storedCurrentListId)) {
        setCurrentListId(storedCurrentListId);
      } else if (parsedLists.length > 0) {
        setCurrentListId(parsedLists[0].id);
      }
    } else {
      // Создаём первый список по умолчанию
      const defaultList = createNewList('My Tasks');
      setLists([defaultList]);
      setCurrentListId(defaultList.id);
    }
    
    // Загрузка и очистка корзины
    if (storedTrash) {
      const parsedTrash = JSON.parse(storedTrash);
      // Удаляем задачи старше 30 дней
      const validTrash = parsedTrash.filter(t => !isTrashExpired(t.deletedAt));
      setTrash(validTrash);
    }
    
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
        setSidebarOpen(savedSidebar === 'true');
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
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Сохранение sidebar в localStorage при изменении (только для десктопа)
  useEffect(() => {
    if (!isLoadingRef.current && isDesktop) {
      localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen));
    }
  }, [sidebarOpen, isDesktop]);

  // Обработчик toggle
  const handleToggle = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
  };

  // Создать новый список
  const createList = () => {
    if (newListName.trim()) {
      const newList = createNewList(newListName);
      setLists([...lists, newList]);
      setCurrentListId(newList.id);
      setNewListName('');
      setIsCreatingList(false);
      setIsListDropdownOpen(false);
    }
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
      setLists(lists.map(list => 
        list.id === editingListId 
          ? { ...list, name: editingListName.trim() }
          : list
      ));
    }
    setEditingListId(null);
    setEditingListName('');
  };

  // Удалить список
  const deleteList = (listId) => {
    if (lists.length === 1) return;
    
    const newLists = lists.filter(l => l.id !== listId);
    setLists(newLists);
    
    if (currentListId === listId) {
      setCurrentListId(newLists[0].id);
    }
    
    setIsListDropdownOpen(false);
  };

  // Добавить новую задачу
  const addTask = (text, priority = 'low') => {
    const newTask = {
      id: Date.now().toString(),
      text,
      completed: false,
      priority,
    };
    setLists(lists.map(list => 
      list.id === currentListId 
        ? { ...list, tasks: [...list.tasks, newTask] }
        : list
    ));
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
      setLists(lists.map(list => 
        list.id === currentListId 
          ? { ...list, tasks: list.tasks.filter(t => t.id !== id) }
          : list
      ));
      
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => {
        setRecentlyDeleted(null);
      }, 4000);
    }
  };

  // Undo удаление
  const undoDelete = () => {
    if (recentlyDeleted) {
      setLists(lists.map(list => 
        list.id === currentListId 
          ? { ...list, tasks: [...list.tasks, recentlyDeleted] }
          : list
      ));
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      setRecentlyDeleted(null);
    }
  };

  // Восстановить задачу из корзины
  const restoreTask = (trashItem) => {
    const { id, listId, deletedAt, ...taskData } = trashItem;
    
    const targetList = lists.find(l => l.id === listId);
    if (targetList) {
      setLists(lists.map(list => 
        list.id === listId 
          ? { ...list, tasks: [...list.tasks, { id, ...taskData }] }
          : list
      ));
    } else {
      setLists(lists.map(list => 
        list.id === currentListId 
          ? { ...list, tasks: [...list.tasks, { id, ...taskData }] }
          : list
      ));
    }
    
    setTrash(trash.filter(t => t.id !== id));
  };

  // Удалить задачу навсегда
  const permanentlyDeleteTask = (id) => {
    setTrash(trash.filter(t => t.id !== id));
  };

  // Переключить статус выполнения задачи
  const toggleTask = (id) => {
    setLists(lists.map(list => 
      list.id === currentListId 
        ? { ...list, tasks: list.tasks.map(task => 
            task.id === id ? { ...task, completed: !task.completed } : task
          )}
        : list
    ));
  };

  // Редактировать текст и приоритет задачи
  const editTask = (id, newText, newPriority) => {
    setLists(lists.map(list => 
      list.id === currentListId 
        ? { ...list, tasks: list.tasks.map(task => 
            task.id === id ? { ...task, text: newText, priority: newPriority } : task
          )}
        : list
    ));
  };

  // Переместить задачу (для drag & drop)
  const reorderTasks = (fromIndex, toIndex) => {
    setLists(lists.map(list => {
      if (list.id !== currentListId) return list;
      const newTasks = [...list.tasks];
      const [moved] = newTasks.splice(fromIndex, 1);
      newTasks.splice(toIndex, 0, moved);
      return { ...list, tasks: newTasks };
    }));
  };

  // Подсчёт выполненных задач
  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-black">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={handleToggle} isMobile={!isDesktop} />

      {/* Основной контент */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen && isDesktop ? 'ml-80' : ''}`}>
        {/* Кнопка открытия sidebar */}
        <button
          onClick={handleToggle}
          className={`fixed top-4 z-50 p-2 sm:p-3 bg-zinc-800/80 backdrop-blur-sm rounded-xl hover:scale-110 active:scale-95 transition-all duration-200 ${sidebarOpen && isDesktop ? 'left-84' : 'left-4'} ${sidebarOpen ? '-z-10 opacity-0 pointer-events-none' : ''}`}
        >
          <RightIcon className="w-5 h-5 text-zinc-400 hover:text-emerald-400 transition-all" />
        </button>

        <div className="max-w-2xl mx-auto pt-20 px-4 sm:px-6 pb-32">
          {/* Заголовок и статистика */}
          <div className="mb-6 sm:mb-8">
            {/* Переключатель списков */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{getGreeting()}</h1>
              
              <div className="flex items-center gap-2">
                {/* Dropdown переключатель списков */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsListDropdownOpen(!isListDropdownOpen)}
                    className="flex items-center gap-2 bg-zinc-800/70 hover:bg-zinc-700/70 px-4 py-2 rounded-xl transition-all duration-200"
                  >
                    <span className="text-white text-sm sm:text-base max-w-[120px] sm:max-w-[180px] truncate">
                      {currentList ? currentList.name : 'Select List'}
                    </span>
                    <ChevronIcon className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isListDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Dropdown меню */}
                  {isListDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-72 bg-zinc-800 rounded-xl shadow-xl shadow-black/30 border border-zinc-700/50 py-2 z-50 animate-fade-in">
                      {lists.map((list) => (
                        <div
                          key={list.id}
                          className={`flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-200 ${
                            list.id === currentListId
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {editingListId === list.id ? (
                            <input
                              type="text"
                              value={editingListName}
                              onChange={(e) => setEditingListName(e.target.value.slice(0, 25))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditList();
                                if (e.key === 'Escape') {
                                  setEditingListId(null);
                                  setEditingListName('');
                                }
                              }}
                              onBlur={saveEditList}
                              autoFocus
                              className="flex-1 bg-zinc-700/50 px-2 py-1 rounded text-white text-sm focus:outline-none"
                            />
                          ) : (
                            <button
                              onClick={() => switchToList(list.id)}
                              className="flex-1 text-left"
                            >
                              {list.name}
                            </button>
                          )}
                          
                          {list.id === currentListId && (
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => startEditList(list)}
                                className="p-1 text-zinc-400 hover:text-emerald-400 transition-colors"
                                title="Rename"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {lists.length > 1 && (
                                <button
                                  onClick={() => deleteList(list.id)}
                                  className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Разделитель */}
                      <div className="border-t border-zinc-700/50 my-2" />
                      
                      {/* Создать новый список */}
                      {isCreatingList ? (
                        <div className="px-3 py-2">
                          <input
                            type="text"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value.slice(0, 25))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') createList();
                              if (e.key === 'Escape') {
                                setIsCreatingList(false);
                                setNewListName('');
                              }
                            }}
                            placeholder="List name..."
                            autoFocus
                            className="w-full bg-zinc-700/50 px-3 py-2 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={createList}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-medium py-1.5 rounded-lg transition-all duration-200"
                            >
                              Create
                            </button>
                            <button
                              onClick={() => {
                                setIsCreatingList(false);
                                setNewListName('');
                              }}
                              className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-medium py-1.5 rounded-lg transition-all duration-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsCreatingList(true)}
                          className="w-full text-left px-4 py-2.5 text-sm text-emerald-400 hover:bg-zinc-700 transition-all duration-200"
                        >
                          + Create new list
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Кнопка корзины */}
                <button
                  onClick={() => setIsTrashOpen(true)}
                  className="relative p-2 bg-zinc-800/70 hover:bg-zinc-700/70 rounded-xl transition-all duration-200"
                  title="Trash"
                >
                  <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {trash.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                      {trash.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            <p className="text-zinc-500 text-xs sm:text-sm mb-2">Stay focused. One step at a time.</p>
            <p className="text-zinc-600 text-xs mb-4 sm:mb-6">{formatDate()}</p>
            
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

          {/* Поиск и фильтры */}
          <div className="mb-4 space-y-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-zinc-800/50 backdrop-blur-sm px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all duration-200"
            />
            <div className="flex gap-2">
              {['all', 'active', 'completed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                    filter === f
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-white'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Поле ввода новой задачи */}
          <TaskInput onAdd={addTask} />

          {/* Фильтрованные задачи */}
          {(() => {
            let filtered = tasks;
            if (searchQuery) {
              filtered = filtered.filter(t => t.text.toLowerCase().includes(searchQuery.toLowerCase()));
            }
            if (filter === 'active') filtered = filtered.filter(t => !t.completed);
            if (filter === 'completed') filtered = filtered.filter(t => t.completed);
            return (
              <TaskList 
                tasks={filtered} 
                onDelete={deleteTask} 
                onToggle={toggleTask}
                onReorder={reorderTasks}
                onEdit={editTask}
                isMobile={!isDesktop}
              />
            );
          })()}
        </div>
      </main>

      {/* Trash Modal */}
      {isTrashOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">Trash</h2>
              <button
                onClick={() => setIsTrashOpen(false)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {trash.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">Trash is empty</p>
              ) : (
                trash.map((item) => {
                  const daysLeft = Math.ceil(TRASH_DAYS - (Date.now() - item.deletedAt) / (1000 * 60 * 60 * 24));
                  const listName = lists.find(l => l.id === item.listId)?.name || 'Unknown list';
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between bg-zinc-800/50 px-4 py-3 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{item.text}</p>
                        <p className="text-zinc-500 text-xs mt-1">
                          From: {listName} • {daysLeft} days left
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => restoreTask(item)}
                          className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-500/30 transition-all"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => permanentlyDeleteTask(item.id)}
                          className="px-3 py-1.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/30 transition-all"
                        >
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
          <div className="flex items-center gap-5 bg-zinc-800/95 backdrop-blur-sm px-6 py-4 rounded-xl shadow-xl shadow-black/40 border border-zinc-700/50">
            <span className="text-zinc-200 text-base font-medium">Task deleted</span>
            <button
              onClick={undoDelete}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-all duration-200 active:scale-95"
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
