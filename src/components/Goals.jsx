import React, { useState } from "react";
import RightIcon from "../icons/RightIcon";
import { CalendarDays, Clock, Target } from "lucide-react";

const getDateStr = (d) => {
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
};
const getTimeStr = (d) => `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;

const defaultForm = { name: "", description: "" };

function Goals({ onToggleSidebar, sidebarOpen, goals, lists, now, onAddGoal, onEditGoal, onDeleteGoal }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });
  const [editingId, setEditingId] = useState(null);

  const allTasks = lists.reduce((acc, l) => [...acc, ...l.tasks], []);

  const getProgress = (goalId) => {
    const linked = allTasks.filter((t) => t.goalId === goalId);
    const total = linked.length;
    const completed = linked.filter((t) => t.completed).length;
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setShowModal(true);
  };

  const openEdit = (goal) => {
    setEditingId(goal.id);
    setForm({ name: goal.name, description: goal.description || "" });
    setShowModal(true);
  };

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) return;
    if (editingId) {
      onEditGoal(editingId, form);
    } else {
      onAddGoal(form);
    }
    setShowModal(false);
    setForm({ ...defaultForm });
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="sticky top-0 z-20 bg-black/70 backdrop-blur-md border-b border-zinc-800/50 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 py-3">
            <button
              onClick={onToggleSidebar}
              className={`p-2 sm:p-3 bg-zinc-800/80 backdrop-blur-sm rounded-xl hover:scale-110 active:scale-95 transition-all duration-200 flex-shrink-0 ${sidebarOpen ? "opacity-0 pointer-events-none" : ""}`}
              aria-label="Toggle sidebar"
            >
              <RightIcon className="w-5 h-5 text-zinc-400 hover:text-emerald-400 transition-all" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Goals</h1>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-zinc-400 whitespace-nowrap"><CalendarDays className="w-3 h-3 inline mr-1" />{getDateStr(now)}</span>
              <span className="text-xs text-zinc-400 font-mono whitespace-nowrap"><Clock className="w-3 h-3 inline mr-1" />{getTimeStr(now)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-8 space-y-5">
          {goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <Target className="w-12 h-12 text-zinc-500 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">No goals yet</h3>
              <p className="text-sm text-zinc-500 mb-6 text-center">Create your first goal and start tracking progress</p>
              <button
                onClick={openCreate}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 hover:scale-105 hover:shadow-emerald-500/40 active:scale-95 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 shadow-lg shadow-emerald-500/25"
              >
                + Add Goal
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {goals.map((goal) => {
                  const { total, completed, percent } = getProgress(goal.id);
                  const created = new Date(goal.createdAt);
                  return (
                    <div
                      key={goal.id}
                      className="bg-zinc-800/30 rounded-xl border border-zinc-700/30 px-5 py-4 animate-fade-in opacity-0 translate-y-2 transition-all duration-200"
                      style={{ animation: "fadeIn 0.2s ease forwards" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white font-semibold truncate">{goal.name}</h3>
                          {goal.description && (
                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{goal.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-emerald-400 font-bold text-lg">{percent}%</span>
                        </div>
                      </div>

                      <div className="w-full h-2 bg-zinc-800/50 rounded-full overflow-hidden mt-3">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-green-600 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-2.5">
                        <span className="text-xs text-zinc-500">
                          {total === 0 ? "No linked tasks" : `${completed}/${total} tasks completed`}
                        </span>
                        <span className="text-[11px] text-zinc-600">
                          {created.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>

                      <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800/50">
                        <button
                          onClick={() => openEdit(goal)}
                          className="flex-1 text-xs text-zinc-400 hover:text-emerald-400 bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-all duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { if (window.confirm('Delete this goal?')) onDeleteGoal(goal.id); }}
                          className="flex-1 text-xs text-zinc-400 hover:text-red-400 bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-all duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={openCreate}
                className="w-full bg-zinc-800/30 hover:bg-zinc-800/50 border border-dashed border-zinc-700/40 rounded-xl py-4 text-center transition-all duration-200 group"
              >
                <span className="text-sm text-zinc-500 group-hover:text-emerald-400 transition-colors">+ Add New Goal</span>
              </button>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => { setShowModal(false); setEditingId(null); setForm({ ...defaultForm }); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 animate-scale-in overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white">{editingId ? "Edit Goal" : "New Goal"}</h2>
              <p className="text-xs text-zinc-500 mt-1">{editingId ? "Update your goal details" : "Create a new goal to track"}</p>
            </div>

            <div className="p-5 space-y-4">
              <input
                type="text"
                placeholder="Goal name..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full bg-zinc-800/50 px-4 py-2.5 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
              />
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!form.name.trim()}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-medium py-2.5 rounded-xl transition-all duration-200 disabled:opacity-40"
                >
                  {editingId ? "Save Changes" : "Create Goal"}
                </button>
                <button
                  onClick={() => { setShowModal(false); setEditingId(null); setForm({ ...defaultForm }); }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Goals;
