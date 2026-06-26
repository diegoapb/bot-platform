import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Host público para el modo móvil/cloudflare (p.ej. bot-dev.tusolvex.com). Si se
// define, se permite ese host y se fuerza HMR sobre wss:443; si no (local/docker),
// Vite usa el host de la página y HMR funciona en localhost sin configurar nada.
const publicHost = process.env.VITE_PUBLIC_HOST;
// Destino del proxy /api. En docker apunta al servicio `backend`; en host, a localhost.
const proxyTarget = process.env.BACKEND_PROXY_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: publicHost ? [publicHost, ".trycloudflare.com"] : undefined,
    hmr: publicHost ? { host: publicHost, protocol: "wss", clientPort: 443 } : undefined,
    proxy: {
      // En dev, proxy al backend Hono.
      "/api": proxyTarget,
      // Webhooks entrantes (Evolution/Chatwoot) hacia el backend.
      "/webhooks": proxyTarget,
    },
  },
});
