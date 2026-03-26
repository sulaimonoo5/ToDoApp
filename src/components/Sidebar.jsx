import React from 'react'

function Sidebar({ isOpen, onClose }) {
  const menuItems = [
    { name: 'Tasks', icon: '📋', active: true },
    { name: 'Schedule', icon: '📅', active: false },
    { name: 'Notes', icon: '📝', active: false },
  ]

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
      <aside className={`fixed top-0 left-0 h-full w-60 bg-zinc-900 border-r border-zinc-800 z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-8">Menu</h2>
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.name}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  item.active 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
