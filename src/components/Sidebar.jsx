import React from "react";

function Sidebar({ isOpen, onClose }) {
  const menuItems = [
    { name: "Tasks", icon: "📋", active: true },
    { name: "Schedule", icon: "📅", active: false },
    { name: "Notes", icon: "📝", active: false },
  ];

  return (
    <>
      {/* Overlay для мобильных */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-zinc-900 border-r border-zinc-800 z-50 transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="py-6 px-5 h-full flex flex-col">
          {/* Header с кнопкой закрытия */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {menuItems.map((item, index) => (
              <button
                key={item.name}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  item.active
                    ? "bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-500"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white hover:translate-x-1"
                }`}>
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="pt-6 border-t border-zinc-800">
            <p className="text-xs text-zinc-600">All-in-One App v1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
