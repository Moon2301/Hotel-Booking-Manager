import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    },
    server: {
        port: 8080,
        host: true,
        proxy: {
            '/api': {
                target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000',
                changeOrigin: true,
            },
            '/socket.io': {
                target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000',
                ws: true,
            },
        },
    },
});
