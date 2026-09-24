// Centralized notification system.
// - Reminder computation + dedup (unchanged): local scheduleData, 30s interval,
//   notificationsLog in localStorage.
// - Delivery:
//   * Electron → native system notification via IPC (kept as before).
//   * Web/PWA → Service Worker registration.showNotification (system sound +
//     vibration on Android), fallback to `new Notification`.
// - Web Push subscription session (installed PWA, closed app): persists
//     subscription to the backend (VAPID keys live only on the server).
// Compatible with future modules: Tasks, Calendar, Finance.

import * as api from "./api";
import { getDeviceInfo } from "../utils/deviceInfo";

const SCHEDULE_KEY = "scheduleData";
const NOTIFICATIONS_LOG_KEY = "notificationsLog";
const CHECK_INTERVAL_MS = 30 * 1000;

let intervalId = null;
let cachedPublicKey = null;

// ---- Helpers ----

const getTodayDateString = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getTodayDayIndex = () => {
  const d = new Date().getDay();
  return d >= 1 && d <= 6 ? d - 1 : -1;
};

const getScheduleData = () => {
  try {
    const saved = localStorage.getItem(SCHEDULE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const getLog = () => {
  try {
    const saved = localStorage.getItem(NOTIFICATIONS_LOG_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const saveLog = (log) => {
  localStorage.setItem(NOTIFICATIONS_LOG_KEY, JSON.stringify(log));
};

const parseTime = (str) => {
  if (!str) return null;
  const [h, m] = str.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
};

// ---- Delivery ----

// Show a system notification regardless of environment.
async function showSystemNotification(title, body, tag) {
  // Electron: native notification via IPC (existing app behavior).
  if (window.__NOTIFICATION_API__?.showNotification) {
    try {
      window.__NOTIFICATION_API__.showNotification({ title, body });
      return;
    } catch {
      // fall through to web notification
    }
  }

  // Web/Android/iOS: Service Worker notification (system sound + vibration on
  // Android; iOS shows while the app is active).
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        tag,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: "./#/schedule" },
      });
      return;
    } catch {
      // fall through
    }
  }

  // Plain browser fallback (non-installed desktop PWA).
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/icon-192.png" });
    } catch {
      // ignore
    }
  }
}

// ---- Schedule check (unchanged computation + dedup) ----

const checkSchedule = () => {
  const todayIndex = getTodayDayIndex();
  if (todayIndex === -1) return;

  const schedule = getScheduleData();
  const dayData = schedule[todayIndex];
  if (!dayData) return;

  const todayDate = getTodayDateString();
  const log = getLog();
  const nowTotal = new Date().getHours() * 60 + new Date().getMinutes();
  let changed = false;

  for (const [lessonNumStr, lesson] of Object.entries(dayData)) {
    if (!lesson.startTime || !lesson.reminder || lesson.reminder === "none") continue;

    const reminderMinutes = parseInt(lesson.reminder, 10);
    if (isNaN(reminderMinutes)) continue;

    const lessonTime = parseTime(lesson.startTime);
    if (lessonTime === null) continue;

    const notificationTime = lessonTime - reminderMinutes;
    if (nowTotal < notificationTime || nowTotal >= lessonTime) continue;

    const logKey = `${todayIndex}_${lessonNumStr}_${reminderMinutes}_${todayDate}`;
    if (log[logKey]) continue;

    const minutesUntil = lessonTime - nowTotal;
    const lines = [lesson.name];
    if (minutesUntil > 0) lines.push(`Starts in ${minutesUntil} min`);
    if (lesson.room) lines.push(`Room ${lesson.room}`);
    if (lesson.teacher) lines.push(`Teacher: ${lesson.teacher}`);

    const title = "Upcoming Lesson";
    const body = lines.join("\n");
    const tag = `reminder_${todayIndex}_${lessonNumStr}`;

    showSystemNotification(title, body, tag);

    if (import.meta.env.DEV) {
      console.log(`[NotificationService] Sent: ${title} — ${body}`);
    }

    log[logKey] = true;
    changed = true;
  }

  if (changed) {
    saveLog(log);
  }
};

const cleanupOldEntries = () => {
  const todayDate = getTodayDateString();
  const log = getLog();
  let changed = false;

  for (const key of Object.keys(log)) {
    const datePart = key.split("_").slice(3).join("_");
    if (datePart !== todayDate) {
      delete log[key];
      changed = true;
    }
  }

  if (changed) {
    saveLog(log);
  }
};

// ---- Web Push session ----

export function getPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

// Must be called from a user gesture (permission prompt).
export async function requestPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") {
    await syncSession();
    return "granted";
  }
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    if (result === "granted") await syncSession();
    return result;
  } catch {
    return Notification.permission;
  }
}

async function getVapidPublicKey() {
  if (cachedPublicKey) return cachedPublicKey;
  try {
    const res = await fetch("/api/push/publicKey");
    if (!res.ok) return null;
    const data = await res.json();
    cachedPublicKey = data.publicKey || null;
    return cachedPublicKey;
  } catch {
    return null;
  }
}

async function persistSubscription(sub) {
  const token = localStorage.getItem("access_token");
  if (!token) return;
  const di = getDeviceInfo();
  const label = [di.os, di.browser, di.deviceType].filter(Boolean).join(" ") || "Unknown device";
  const keys = sub.toJSON().keys;
  try {
    await api.pushSubscribe({
      endpoint: sub.endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      deviceLabel: label,
    });
  } catch {
    // non-fatal (user may be offline / server unreachable)
  }
}

export async function subscribePush() {
  if (typeof Notification !== "undefined" && Notification.permission !== "granted") return null;
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      const rawKey = await getVapidPublicKey();
      if (!rawKey) return null;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(rawKey),
      });
    }

    await persistSubscription(sub);
    return sub;
  } catch {
    // pushManager may be unavailable (Electron, iOS) — local notifications
    // still work; this is not fatal.
    return null;
  }
}

export async function unsubscribePush() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    try {
      await api.pushUnsubscribe({ endpoint: sub.endpoint });
    } catch {
      // ignore
    }
    try {
      await sub.unsubscribe();
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

// Align subscriptions with the current session: if the user is signed in and
// notifications are granted, make sure a subscription exists; if signed out,
// unbind this device.
export async function syncSession() {
  const token = localStorage.getItem("access_token");
  if (!token) {
    await unsubscribePush();
    return;
  }
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    await subscribePush();
  }
}

// ---- Public lifecycle ----

export function start() {
  if (intervalId !== null) return;

  cleanupOldEntries();
  checkSchedule();

  intervalId = setInterval(checkSchedule, CHECK_INTERVAL_MS);

  if (import.meta.env.DEV) {
    console.log("[NotificationService] Started (interval: 30s)");
  }
}

export function stop() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;

    if (import.meta.env.DEV) {
      console.log("[NotificationService] Stopped");
    }
  }
}

export function isRunning() {
  return intervalId !== null;
}