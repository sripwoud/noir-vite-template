import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import wasm from 'vite-plugin-wasm'
import tsconfigPaths from 'vite-tsconfig-paths'

const plugins = [react(), tailwindcss(), TanStackRouterVite(), tsconfigPaths(), wasm()]

export default defineConfig(({ mode }) => {
  return {
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
