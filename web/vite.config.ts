import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import wasm from 'vite-plugin-wasm'
import tsconfigPaths from 'vite-tsconfig-paths'

const plugins = [
  tanstackRouter({ autoCodeSplitting: true, target: 'react' }),
  react(),
  tailwindcss(),
  tsconfigPaths(),
  wasm(),
]

export default defineConfig(({ mode }) => {
  return {
    base: process.env.CI ? '/noir-vite-template/' : '/',
    plugins,
    server: {
      open: mode === 'development',
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    optimizeDeps: {
      esbuildOptions: { target: 'esnext' },
      exclude: ['@noir-lang/noirc_abi', '@noir-lang/acvm_js'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'hazae41-result': ['@hazae41/result'],
          },
        },
      },
    },
  }
})
