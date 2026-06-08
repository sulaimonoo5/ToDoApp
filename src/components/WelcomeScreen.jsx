// Приветственный экран — показывается при старте приложения
// Двухэтапная анимация: приветствие → цитата/задачи
// greeting logic | quote system | task summary | startup animation

import React, { useState, useEffect } from "react";

const QUOTES = [
  "Stay focused. One step at a time.",
  "Small progress is still progress.",
  "A clear plan creates a calm mind.",
  "Make today count.",
  "Consistency beats intensity.",
  "One task at a time.",
  "Keep moving forward.",
  "Every day is a new opportunity.",
  "Done is better than perfect.",
  "Your future self will thank you.",
  "Build habits. Trust the process.",
  "Progress comes from repetition.",
  "Focus on what matters today.",
  "A little better every day.",
  "Start now. Improve later.",
];

function WelcomeScreen({ tasks, onComplete }) {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState(0);

  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  // Приветствие по времени суток
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return { text: "Welcome Back", emoji: "🌌" };
    if (hour < 12) return { text: "Good Morning", emoji: "☀️" };
    if (hour < 17) return { text: "Good Afternoon", emoji: "🌤️" };
    if (hour < 22) return { text: "Good Evening", emoji: "🌙" };
    return { text: "Welcome Back", emoji: "🌌" };
  };

  const greeting = getGreeting();

  // Информация о задачах
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const allDone = totalTasks > 0 && completedTasks === totalTasks;
  const pendingTasks = totalTasks - completedTasks;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    const t1 = setTimeout(() => setStage(1), 400);
    const t2 = setTimeout(onComplete, 2800);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div className="text-center px-6 max-w-sm">
        {/* Этап 1: приветствие */}
        <div
          className={`transition-all duration-700 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            {greeting.text}
          </h1>
          <div className="text-3xl mt-3">{greeting.emoji}</div>
        </div>

        {/* Этап 2: цитата или информация о задачах (через 400ms) */}
        <div
          className={`mt-8 transition-all duration-700 ease-out ${
            stage >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          {totalTasks > 0 && allDone ? (
            <>
              <p className="text-emerald-400 text-sm font-medium">
                All tasks completed. Great job.
              </p>
              <p className="text-zinc-500 text-xs mt-4 leading-relaxed">{quote}</p>
            </>
          ) : totalTasks > 0 ? (
            <>
              <p className="text-zinc-300 text-sm">
                {pendingTasks > 0
                  ? `You have ${pendingTasks} task${pendingTasks !== 1 ? "s" : ""} waiting today.`
                  : `All done for now.${completedTasks > 0 ? ` ${completedTasks} completed.` : ""}`}
              </p>
              <p className="text-zinc-500 text-xs mt-4 leading-relaxed">{quote}</p>
            </>
          ) : (
            <p className="text-zinc-300 text-sm leading-relaxed">{quote}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
