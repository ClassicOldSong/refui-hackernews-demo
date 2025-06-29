/* globals clients */

import { precacheAndRoute } from 'workbox-precaching'
import { StaleWhileRevalidate } from 'workbox-strategies'
import { registerRoute } from 'workbox-routing'

const toPrecache = self.__WB_MANIFEST

precacheAndRoute(toPrecache)

registerRoute(({ url }) => {
	return url.pathname === '/' || url.pathname.includes('index.html')
}, new StaleWhileRevalidate())

self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('notificationclick', (event) => {
	event.notification.close()

	event.waitUntil(
		clients
			.matchAll({
				includeUncontrolled: true,
				type: 'window'
			})
			.then((clientList) => {
				if (event.notification.data) {
					const { serialNumber } = event.notification.data
					for (const client of clientList) {
						if (client.url.includes(`sn=${serialNumber}`) && 'focus' in client) {
							return client.focus()
						}
					}
				}

				if (clients.openWindow) return clients.openWindow('/')
			})
	)
})
