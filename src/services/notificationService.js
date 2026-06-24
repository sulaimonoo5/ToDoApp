// Централизованная система уведомлений
// Проверяет расписание каждые 30 секунд, посылает системные уведомления через Electron IPC
// Защита от дублей: notificationsLog в localStorage (key = `${day}_${lesson}_${reminder}_${date}`)
// Архитектура совместима с будущими модулями: Tasks, Calendar, Finance

import { playNotificationSound } from '../utils/notificationSound'

const SCHEDULE_KEY = 'scheduleData'
const NOTIFICATIONS_LOG_KEY = 'notificationsLog'
const CHECK_INTERVAL_MS = 30 * 1000

let intervalId = null

// ---- Helpers ----

const getTodayDateString = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const getTodayDayIndex = () => {
  const d = new Date().getDay()
  return d >= 1 && d <= 6 ? d - 1 : -1
}

const getScheduleData = () => {
  try {
    const saved = localStorage.getItem(SCHEDULE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch { return {} }
}

const getLog = () => {
  try {
    const saved = localStorage.getItem(NOTIFICATIONS_LOG_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch { return {} }
}

const saveLog = (log) => {
  localStorage.setItem(NOTIFICATIONS_LOG_KEY, JSON.stringify(log))
}

const parseTime = (str) => {
  if (!str) return null
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

// ---- Проверка расписания (запускается каждые 30 сек) ----

const checkSchedule = () => {
  const todayIndex = getTodayDayIndex()
  // Воскресенье или пустой день — уроков нет
  if (todayIndex === -1) return

  const schedule = getScheduleData()
  const dayData = schedule[todayIndex]
  if (!dayData) return

  const todayDate = getTodayDateString()
  const log = getLog()
  const nowTotal = new Date().getHours() * 60 + new Date().getMinutes()
  let changed = false

  for (const [lessonNumStr, lesson] of Object.entries(dayData)) {
    if (!lesson.startTime || !lesson.reminder || lesson.reminder === 'none') continue

    const reminderMinutes = parseInt(lesson.reminder, 10)
    if (isNaN(reminderMinutes)) continue

    const lessonTime = parseTime(lesson.startTime)
    if (lessonTime === null) continue

    // Временное окно уведомления: [lessonTime - reminder, lessonTime)
    const notificationTime = lessonTime - reminderMinutes
    if (nowTotal < notificationTime || nowTotal >= lessonTime) continue

    // Проверка дубликата
    const logKey = `${todayIndex}_${lessonNumStr}_${reminderMinutes}_${todayDate}`
    if (log[logKey]) continue

    // Формируем уведомление
    const minutesUntil = lessonTime - nowTotal
    const lines = [lesson.name]
    if (minutesUntil > 0) lines.push(`Starts in ${minutesUntil} min`)
    if (lesson.room) lines.push(`Room ${lesson.room}`)
    if (lesson.teacher) lines.push(`Teacher: ${lesson.teacher}`)

    const title = '📚 Upcoming Lesson'
    const body = lines.join('\n')

    // Отправляем системное уведомление через Electron IPC
    if (window.__NOTIFICATION_API__?.showNotification) {
      window.__NOTIFICATION_API__.showNotification({ title, body })
    }

    // Воспроизводим звук
    playNotificationSound()

    // Отладка в dev-режиме
    if (import.meta.env.DEV) {
      console.log(`[NotificationService] Sent: ${title} — ${body}`)
    }

    // Помечаем как отправленное (защита от дублей)
    log[logKey] = true
    changed = true
  }

  if (changed) {
    saveLog(log)
  }
}

// ---- Очистка устаревших записей (только за сегодня) ----

const cleanupOldEntries = () => {
  const todayDate = getTodayDateString()
  const log = getLog()
  let changed = false

  for (const key of Object.keys(log)) {
    // Формат ключа: day_lessonNum_reminder_YYYY-MM-DD
    const datePart = key.split('_').slice(3).join('_')
    if (datePart !== todayDate) {
      delete log[key]
      changed = true
    }
  }

  if (changed) {
    saveLog(log)
  }
}

// ---- Публичный API ----

export function start() {
  if (intervalId !== null) return

  cleanupOldEntries()
  checkSchedule()

  intervalId = setInterval(checkSchedule, CHECK_INTERVAL_MS)

  if (import.meta.env.DEV) {
    console.log('[NotificationService] Started (interval: 30s)')
  }
}

export function stop() {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null

    if (import.meta.env.DEV) {
      console.log('[NotificationService] Stopped')
    }
  }
}

export function isRunning() {
  return intervalId !== null
}
