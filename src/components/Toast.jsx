import React, { useState, useEffect, useCallback } from "react";
import { Check, X } from "lucide-react";

let toastId = 0;
const listeners = new Set();

function notify(message, type = "success", duration = 3000) {
  const id = ++toastId;
  listeners.forEach((fn) => fn({ id, message, type, duration }));
}

export { notify };

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.duration);
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[70] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl shadow-black/30 border animate-slide-up ${t.type === "success" ? "bg-emerald-500/90 border-emerald-400/30" : "bg-red-500/90 border-red-400/30"}`}>
          {t.type === "success" ? <Check className="w-4 h-4 text-white flex-shrink-0" /> : <X className="w-4 h-4 text-white flex-shrink-0" />}
          <span className="text-white text-sm font-medium">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
