import { defineConfig } from 'vite';
import { refurbish } from 'refurbish/vite';

export default defineConfig({
  plugins: [
    refurbish(),
  ],
  esbuild: {
    jsxFactory: 'R.c',
    jsxFragment: 'R.f',
  }
});