import { defineConfig } from 'vite';
import { refurbish } from 'refurbish/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		refurbish(),
		VitePWA({
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'sw.js',
			manifest: {
				name: 'HackerNews Reader',
				short_name: 'HN-rEFui',
				theme_color: '#ff6600',
				display: 'standalone',
				display_override: ['window-controls-overlay'],
				icons: [
					{
						src: '/logl.svg',
						sizes: 'any',
						type: 'image/svg+xml',
					}
				],
			},
		}),
	],
	esbuild: {
		jsxFactory: 'R.c',
		jsxFragment: 'R.f',
	}
});
