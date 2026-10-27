/* Notificación de fin de descanso. Se carga dentro del service worker generado por Workbox (importScripts). */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Con la app en pantalla ya suena el temporizador propio: no se repite el aviso.
      if (wins.some((w) => w.visibilityState === 'visible')) {
        wins.forEach((w) => w.postMessage({ type: 'rest-push', data }));
        return;
      }
      await self.registration.showNotification(data.title || '¡A la siguiente serie!', {
        body: data.body || '',
        tag: 'ironmind-rest',
        renotify: true,
        requireInteraction: false,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-96.png',
        vibrate: [700, 180, 700, 180, 1000],
        data: { url: data.url || '/' },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) {
          await w.focus();
          if ('navigate' in w) await w.navigate(url).catch(() => undefined);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
