import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

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
    allowedHosts: ["bot-dev.tusolvex.com", ".trycloudflare.com"],
    hmr: {
      host: "bot-dev.tusolvex.com",
      protocol: "wss",
      clientPort: 443,
    },
    proxy: {
      // En dev, proxy al backend Hono local.
      "/api": "http://localhost:3000",
      // Webhooks entrantes (Evolution/Chatwoot) hacia el backend, vía la URL
      // pública bot-dev.tusolvex.com (PUBLIC_WEBHOOK_BASE_URL).
      "/webhooks": "http://localhost:3000",
    },
  },
});
