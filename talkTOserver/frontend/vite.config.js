import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        basicSsl()
    ],
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        https: true,
        hmr: {
            host: 'intercome.alhassan.life',
            clientPort: 443,
        },
        proxy: {
            '/api': {
                target: 'http://backend:8000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            }
        }
    }
})

