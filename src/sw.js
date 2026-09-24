// App Service Worker (injectManifest; прекэш = app shell из __WB_MANIFEST).
// Назначение:
//  - showNotification (системный звук/вибрация через платформу) пока приложение
//    активно — используется ClientNotificationService.
//  - push: сервер → закрытое/установленное приложение (PWA Android; iOS — как
//    позволяет WebKit).
//  - notificationclick: открыть/сфокусировать и переключиться на Study Schedule.
//  - pushsubscriptionchange: попросить страницу переподписаться.
// Один SW — никакого дублирования.

import { precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);

const DEFAULT_ICON = "/icon-192.png";
const DEFAULT_BADGE = "/icon-192.png";
const SCHEDULE_URL = "./#/schedule";

// ---- push: сервер → закрытое приложение ----
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // не наш payload — игнорируем
  }
  if (!data.title) return;

  const options = {
    body: data.body || "",
    icon: data.icon || DEFAULT_ICON,
    badge: data.badge || DEFAULT_BADGE,
    tag: data.tag,
    data: { url: data.url || SCHEDULE_URL },
  };

  // Один показ с одинаковым tag помогают платформе дедуплицировать
  // (клиент и так делает то же самое через свои суффиксы).
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ---- клик: открыть/переключить приложение на Study Schedule ----
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || SCHEDULE_URL;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      // Уже открыто окно → фокусируем и говорим странице переключиться на Schedule.
      for (const client of windowClients) {
        if ("focus" in client) {
          await client.focus();
          client.postMessage({ type: "NOTIFICATION_NAVIGATE", page: "schedule" });
          return;
        }
      }

      // Закрыто → открываем приложение (App читает hash при монтировании).
      try {
        await self.clients.openWindow(new URL(targetUrl, self.registration.scope).href);
      } catch {
        // игнорируем
      }
    })()
  );
});

// ---- pushsubscriptionchange: попросить страницу переподписаться ----
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windowClients) {
        client.postMessage({ type: "NOTIFICATION_RESUBSCRIBE" });
      }
    })()
  );
});
