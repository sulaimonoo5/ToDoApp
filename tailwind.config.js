/** @type {import('tailwindcss').Config} */
module.exports = {
  // Пути к файлам с JSX/JS
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      // Кастомный цвет zinc-750 для hover эффекта карточек
      colors: {
        zinc: {
          750: '#2a2a2e'
        }
      },
      // Кастомная анимация для появления задач
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translate(-50%, 20px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' }
        }
      }
    }
  },
  plugins: []
}
