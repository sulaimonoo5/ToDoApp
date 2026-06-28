import React from "react";
import { TriangleAlert, X } from "lucide-react";

export default function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, variant, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl shadow-black/40 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <TriangleAlert className="w-5 h-5 text-amber-400" />
            <h3 className="text-white font-semibold text-sm">{title || "Confirm"}</h3>
          </div>
          <button onClick={onCancel} className="p-1 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-zinc-300 text-sm">{message || "Are you sure?"}</p>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-zinc-800">
          <button onClick={onCancel} className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-all duration-200">
            {cancelLabel || "Cancel"}
          </button>
          <button onClick={onConfirm} className={`flex-1 px-4 py-2 text-white text-sm font-medium rounded-xl transition-all duration-200 ${variant === "danger" ? "bg-red-500 hover:bg-red-400" : "bg-emerald-500 hover:bg-emerald-400"}`}>
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
