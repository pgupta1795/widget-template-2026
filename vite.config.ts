import tailwindcss from '@tailwindcss/vite'
import tanstackRouter from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import {defineConfig} from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  base: './',
  plugins: [
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
    // rollupOptions: {
    //   output: {
    //     entryFileNames: 'build.js',
    //   },
    // },
  },
})
