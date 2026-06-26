import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env.js";
import { health } from "./routes/health.js";
import { meRoutes } from "./routes/me.js";
import { botsRoutes } from "./routes/bots.js";
import { agentsRoutes } from "./routes/agents.js";
import { collectionsRoutes } from "./routes/collections.js";
import { teamRoutes } from "./routes/team.js";
import { adminRoutes } from "./routes/admin.js";
import { webhooks } from "./routes/webhooks.js";
import { identityRoutes } from "./routes/identity.js";
import { channelsRoutes } from "./routes/channels.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { catalogRoutes } from "./routes/catalog.js";
import { conversationsRoutes } from "./routes/conversations.js";
import { contactsRoutes } from "./routes/contacts.js";
import { metricsRoutes } from "./routes/metrics.js";
import { generationsRoutes } from "./routes/generations.js";
import { startMemoryConsolidationJob } from "./jobs/memory-consolidation.js";

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
app.route("/api/bots", channelsRoutes);
app.route("/api/bots", identityRoutes);
app.route("/api/bots", knowledgeRoutes);
app.route("/api/bots", catalogRoutes);
// E13: agentes desacoplados + biblioteca de conocimiento.
app.route("/api/agents", agentsRoutes);
app.route("/api/collections", collectionsRoutes);
app.route("/api", conversationsRoutes);
app.route("/api", contactsRoutes);
app.route("/api", generationsRoutes);
app.route("/api/metrics", metricsRoutes);
app.route("/api/team", teamRoutes);
app.route("/api/admin", adminRoutes);
app.route("/webhooks", webhooks);

app.notFound((c) => c.json({ ok: false, error: "Ruta no encontrada" }, 404));

startMemoryConsolidationJob();

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`🤖 bot-plataform backend escuchando en :${info.port}`);
});
