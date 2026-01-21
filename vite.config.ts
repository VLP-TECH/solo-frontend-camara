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
}));
