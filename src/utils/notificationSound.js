// Notification Sound Utility
// Архитектура для подключения звукового файла уведомления

export function playNotificationSound() {
  try {
    const audio = new Audio('/sounds/notification.mp3')
    audio.volume = 0.3
    audio.play().catch(() => {
      // Файл пока отсутствует — тихий fallback
    })
  } catch {
    // Audio API недоступна
  }
}
