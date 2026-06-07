# Arquitectura

## Visión general

```
[ Frontend Vite/React ]  ──/api──▶  [ Backend Hono ]  ──▶  [ Postgres (Dokploy) ]
        │                                  │
        │                                  ├──▶ Evolution API (Baileys / WhatsApp)
        │                                  └──▶ Chatwoot
        ▼
    Clerk (auth + organizations)
```

## Componentes

| Componente | Stack | Responsabilidad |
|---|---|---|
| Frontend | Vite + React + Clerk | UI multi-tenant. |
| Backend | Hono (Node 20) | API, auth, orquestación de integraciones. |
| DB | Postgres 15 (Dokploy) | Persistencia de tenants, bots, conversaciones. |
| Auth | Clerk Organizations | Identidad + tenants (`org_id`). |
| WhatsApp | Evolution API (Baileys) | Conexión QR y envío/recepción. |
| Atención | Chatwoot | Inbox conversacional. |

## Flujos clave

1. **Onboarding de tenant** — usuario se registra en Clerk → crea organización → queda `org:admin` → puede registrar bots.
2. **Registro de número WhatsApp** — _(detallar pasos: crear instance en Evolution, QR, persistir, webhook)._
3. **Mensaje entrante** — Evolution webhook → backend → Chatwoot.

## Decisiones (ADR ligeros)

### ADR-001 — Multitenancy vía Clerk Organizations
**Decisión**: cada tenant = una Clerk org; el `org_id` se usa como `tenantId` en la DB.
**Por qué**: evita reinventar invitaciones/roles.
**Trade-off**: dependencia fuerte de Clerk.

### ADR-002 — _(añadir cuando ocurra)_
