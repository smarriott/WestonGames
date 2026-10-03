import { defineConfig } from 'vite';

export default defineConfig({
    base: './', // relative paths so dist/ works from any folder or host
    build: {
        assetsDir: 'assets',
        chunkSizeWarningLimit: 1600, // Phaser itself is ~1.2 MB
    },
});
