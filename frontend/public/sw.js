const CACHE = "fenix-v3"

self.addEventListener("install", (e) => {
  self.skipWaiting()
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Solo cachear assets estáticos — NUNCA navigation ni manifest (permite actualizaciones de PWA)
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return
  if (e.request.mode === "navigate") return

  const url = new URL(e.request.url)

  // El manifest NUNCA se cachea — Chrome necesita leerlo fresco para detectar cambios de ícono
  if (url.pathname === "/manifest.json") return

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image/") ||
    url.pathname === "/fenix-icon.png" ||
    url.pathname === "/fenix-icon-512.png"

  if (!isStatic) return

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached
      return fetch(e.request).then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
        return res
      })
    })
  )
})

// ── Push notifications (VAPID) ────────────────────────────────────────────────

self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? { title: "FÉNIX", body: "Recordatorio" }
  e.waitUntil(
    self.registration.showNotification(data.title ?? "FÉNIX", {
      body: data.body ?? "",
      icon: "/fenix-icon-512.png",
      badge: "/fenix-icon-512.png",
      tag: data.tag ?? "fenix-reminder",
      renotify: true,
    })
  )
})

self.addEventListener("notificationclick", (e) => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      const existing = cs.find((c) => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return clients.openWindow("/")
    })
  )
})

// ── Client-side scheduling ────────────────────────────────────────────────────

const _timers = []

function scheduleReminders(reminders) {
  _timers.forEach(clearTimeout)
  _timers.length = 0

  const now = new Date()
  const todayDay = now.getDay()

  reminders.forEach((r) => {
    if (!r.active || !r.days.includes(todayDay)) return
    const [h, m] = r.time.split(":").map(Number)
    const fire = new Date(now)
    fire.setHours(h, m, 0, 0)
    const ms = fire.getTime() - now.getTime()
    if (ms <= 0) return
    const tid = setTimeout(() => {
      self.registration.showNotification("FÉNIX", {
        body: r.label,
        icon: "/fenix-icon-512.png",
        badge: "/fenix-icon-512.png",
        tag: `reminder-${r.id}`,
        renotify: true,
      })
    }, ms)
    _timers.push(tid)
  })
}

self.addEventListener("message", (e) => {
  if (e.data?.type === "SCHEDULE_REMINDERS") {
    scheduleReminders(e.data.reminders ?? [])
  }
})
