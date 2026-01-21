import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: false,
    allowedHosts: [
      "web-app-camara-valen.rzd02y.easypanel.host",
      "web-app-camara-vlc.rzd02y.easypanel.host",
      "web-app-valencia-camara.rzd02y.easypanel.host",
      "web-app-vlc-camara.rzd02y.easypanel.host",
      "web-app-vlc-cam.rzd02y.easypanel.host",
      "localhost",
      "127.0.0.1",
      ".easypanel.host",
    ],
    cors: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: false,
    allowedHosts: [
      "web-app-camara-valen.rzd02y.easypanel.host",
      "web-app-camara-vlc.rzd02y.easypanel.host",
      "web-app-valencia-camara.rzd02y.easypanel.host",
      "web-app-vlc-camara.rzd02y.easypanel.host",
      "web-app-vlc-cam.rzd02y.easypanel.host",
      "localhost",
      "127.0.0.1",
      ".easypanel.host",
    ],
    cors: true,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: false,
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          charts: ['recharts'],
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
  },
}));
