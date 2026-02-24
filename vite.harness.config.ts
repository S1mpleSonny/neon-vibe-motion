import { defineConfig } from 'vite'
import path from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  root: 'src/harness',
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/harness'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/harness/harness.html'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify('harness'),
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, 'public/h264mp4/*'),
          dest: 'h264mp4',
        },
        {
          src: path.resolve(__dirname, 'public/draco/*'),
          dest: 'draco',
        },
      ],
    }),
  ],
})
