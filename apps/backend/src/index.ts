import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env.js";
import { health } from "./routes/health.js";
import { meRoutes } from "./routes/me.js";
import { botsRoutes } from "./routes/bots.js";
import { teamRoutes } from "./routes/team.js";
import { webhooks } from "./routes/webhooks.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.route("/health", health);
app.route("/api/me", meRoutes);
app.route("/api/bots", botsRoutes);
app.route("/api/team", teamRoutes);
app.route("/webhooks", webhooks);

app.notFound((c) => c.json({ ok: false, error: "Ruta no encontrada" }, 404));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`🤖 bot-plataform backend escuchando en :${info.port}`);
});
