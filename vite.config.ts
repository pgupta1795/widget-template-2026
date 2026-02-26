import tailwindcss from '@tailwindcss/vite'
import tanstackRouter from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import type {Plugin} from 'vite'
import {defineConfig} from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

function cacheVersionPlugin(): Plugin {
	return {
		name: "cache-version",
		apply: "build",
		transformIndexHtml(html) {
			const version = Math.floor(Math.random() * 1e15).toString()
			return html
				.replace(
					/(<script[^>]+\bsrc=["'])([^"'?]+)(["'])/g,
					`$1$2?v=${version}$3`,
				)
				.replace(
					/(<link[^>]+\brel=["']stylesheet["'][^>]+\bhref=["'])([^"'?]+)(["'])/g,
					`$1$2?v=${version}$3`,
				)
				.replace(
					/(<link[^>]+\bhref=["'])([^"'?]+\.css)(["'][^>]*>)/g,
					`$1$2?v=${version}$3`,
				)
		},
	}
}

export default defineConfig({
  base: './',
  plugins: [
    cacheVersionPlugin(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    viteReact(),
  ],
  define: { 'process.env': {} },
  server: {
    host: '0.0.0.0',
    port: 3999,
    watch: { usePolling: true },
  },
  preview: {
    host: '0.0.0.0',
    port: 3999,
  },
  build: {
    emptyOutDir: true,
    // outDir: 'build',
    assetsDir: '',
    sourcemap: true,
    minify: true,
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
})
