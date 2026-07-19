self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title ?? "New lead!";
  const options = {
    body: data.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: data,
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/admin/leads";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes("/admin") && "focus" in client) {
            client.focus();
            return;
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
