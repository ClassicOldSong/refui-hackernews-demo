import './style.css'
import { registerSW } from 'virtual:pwa-register'
import { createDOMRenderer } from 'refui/dom';
import { defaults } from 'refui/browser';
import { signal, watch, read, onDispose, useAction } from 'refui';
import App from './components/App.jsx';

// Check update per 6 hour
const intervalMS = 6 * 60 * 60 * 1000

const [whenNeedRefresh, notifyNeedRefresh] = useAction(false)
const [whenOfflineReady, notifyOfflineReady] = useAction(false)
const [whenInstallPrompt, notifyInstallPrompt] = useAction(null)
const checkSWUpdate = signal()

const updateSW = registerSW({
	onNeedRefresh() {
		notifyNeedRefresh(true)
	},
	onOfflineReady() {
		notifyOfflineReady(true)
	},
	onRegisteredSW(swUrl, r) {
		if (r) {
			checkSWUpdate.value = async () => {
				if (!(!r.installing && navigator)) return

				if ('connection' in navigator && !navigator.onLine) return

				const resp = await fetch(swUrl, {
					cache: 'no-store',
					headers: {
						cache: 'no-store',
						'cache-control': 'no-cache'
					}
				})

				if (resp?.status === 200) await r.update()
			}

			setInterval(checkSWUpdate.value, intervalMS)
		}
	}
})

window.addEventListener('beforeinstallprompt', (event) => {
	event.preventDefault()
	notifyInstallPrompt(event)
})

const renderer = createDOMRenderer(defaults);
const root = document.getElementById('app')

renderer.useMacro({
	name: 'syncTheme',
	handler(_node, themeState) {
		if (!themeState) return

		const applyTheme = () => {
			const isDark = !!read(themeState)
			document.body.classList.toggle('dark-mode', isDark)

			const metaTag = document.head.querySelector('meta[name="theme-color"]')
			if (!metaTag || !root) {
				return
			}

			const mapped = root.computedStyleMap?.().get('background-color')
			const color =
				(typeof mapped?.toString === 'function' && mapped.toString()) ||
				window.getComputedStyle(root).getPropertyValue('background-color')

			if (color) {
				metaTag.content = color.trim()
			}
		}

		const stop = watch(() => {
			read(themeState)
			applyTheme()
		})

		onDispose(() => {
			stop()
			document.body.classList.remove('dark-mode')
		})

		applyTheme()
	}
})

renderer.render(root, App, {
	whenNeedRefresh,
	whenOfflineReady,
	whenInstallPrompt,
	checkSWUpdate,
	updateSW
});
