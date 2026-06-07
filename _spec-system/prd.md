# PRD — bot-plataform

> Documento vivo. Cuando algo cambie, actualízalo y deja la fecha del cambio.

## 1. Problema

_(¿Qué dolor real resuelve la plataforma? Para quién es urgente.)_

## 2. Usuarios

| Rol | Descripción | Necesidad principal |
|---|---|---|
| Super admin de plataforma | Equipo woofly | Gestionar tenants, ver salud global. |
| Admin de tenant (`org:admin`) | Cliente que contrata | Registrar números WhatsApp, configurar bots. |
| Miembro de tenant (`org:member`) | Operador interno | Atender conversaciones. |

## 3. Alcance (v1)

**Dentro**:
- Registro y autenticación multi-tenant (Clerk Organizations).
- Conexión de número WhatsApp vía Baileys (Evolution API).
- Integración con Chatwoot para atención.

**Fuera (por ahora)**:
- _(lista lo que NO entra en v1 para evitar scope creep)_

## 4. Métricas de éxito

- _(KPI 1)_
- _(KPI 2)_

## 5. Restricciones / supuestos

- _(legales, técnicos, de costo)_

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| _(p. ej. baneos de WhatsApp por Baileys)_ | _(estrategia)_ |
