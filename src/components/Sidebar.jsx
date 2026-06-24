// Компонент Sidebar — навигационная боковая панель
// Содержит пункты меню (Tasks, Schedule) и кнопку закрытия
// Принимает currentPage и onPageChange для переключения между страницами
// На мобильных: открывается поверх контента с полупрозрачным overlay (клик по нему закрывает)
// Анимация: translate-x transition (300ms ease-in-out)

import React from "react";
import LeftIcon from "../icons/LeftIcon";

function Sidebar({ isOpen, onClose, currentPage, onPageChange }) {
  // Пункты меню боковой панели
  const menuItems = [
    { name: "Home", icon: "🏠", page: "home" },
    { name: "Tasks", icon: "📋", page: "tasks" },
    { name: "Schedule", icon: "📅", page: "schedule" },
  ];

  // Обработчик клика: переключает страницу и закрывает sidebar на мобильных
  const handleClick = (page) => {
    onPageChange(page);
    onClose();
  };

  return (
    <>
      {/* Затемнённый overlay под sidebar — только на мобильных (lg:hidden) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Сама боковая панель — фиксированная, 320px ширины */}
      <aside
        className={`fixed top-0 left-0 h-screen w-80 bg-zinc-900 border-r border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="py-6 px-5 h-full flex flex-col">
          {/* Верхняя часть: заголовок + кнопка закрытия */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 bg-zinc-800/80 backdrop-blur-sm rounded-xl hover:scale-110 active:scale-95 transition-all duration-200"
            >
              <LeftIcon className="w-5 h-5 text-zinc-400 hover:text-emerald-400 transition-colors" />
            </button>
          </div>

          {/* Список навигации */}
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.page}
                onClick={() => handleClick(item.page)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  currentPage === item.page
                    ? "bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-500"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white hover:translate-x-1"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </button>
            ))}
          </nav>

          {/* Нижняя часть: версия приложения */}
          <div className="pt-6 border-t border-zinc-800">
            <p className="text-xs text-zinc-600">All-in-One App v1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;