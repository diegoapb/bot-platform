import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Channel, ChannelType, ConnectChannelInput } from "@bot/shared";
import { useApi } from "@/lib/useApi";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorText,
  Field,
  Input,
  Loading,
  Select,
} from "@/components/ui";

/**
 * Gestión de canales del bot (E11/US-026): lista de canales con estado,
 * conexión por tipo (Telegram, WhatsApp Cloud, Instagram, Messenger) y
 * desconexión. El canal WhatsApp vía Evolution aparece como fila informativa;
 * su ciclo de vida vive en la pestaña WhatsApp.
 */

const TYPE_LABEL: Record<string, string> = {
  whatsapp_evolution: "WhatsApp (QR / Baileys)",
  whatsapp_cloud: "WhatsApp Cloud API",
  telegram: "Telegram",
  instagram: "Instagram DM",
  messenger: "Facebook Messenger",
};

const STATUS_LABEL: Record<string, string> = {
  connected: "conectado",
  disconnected: "desconectado",
  error: "error",
  qr: "esperando QR",
};

const CONNECTABLE: ChannelType[] = ["telegram", "whatsapp_cloud", "instagram", "messenger"];

export function ChannelsPanel({ botId, isAdmin }: { botId: string; isAdmin: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const [type, setType] = useState<ChannelType>("telegram");
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: channels, isLoading } = useQuery({
    queryKey: ["channels", botId],
    queryFn: () => api.listChannels(botId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["channels", botId] });

  const connect = useMutation({
    mutationFn: (input: ConnectChannelInput) => api.connectChannel(botId, input),
    onSuccess: () => {
      setForm({});
      invalidate();
    },
  });

  const disconnect = useMutation({
    mutationFn: (channelId: string) => api.disconnectChannel(botId, channelId),
    onSuccess: invalidate,
  });

  if (isLoading) return <Loading />;

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const buildInput = (): ConnectChannelInput | null => {
    switch (type) {
      case "telegram":
        return form.botToken ? { type, botToken: form.botToken } : null;
      case "whatsapp_cloud":
        return form.phoneNumber && form.phoneNumberId && form.businessAccountId && form.apiKey
          ? {
              type,
              phoneNumber: form.phoneNumber,
              phoneNumberId: form.phoneNumberId,
              businessAccountId: form.businessAccountId,
              apiKey: form.apiKey,
            }
          : null;
      case "instagram":
      case "messenger":
        return form.pageId && form.pageName && form.userAccessToken && form.pageAccessToken
          ? {
              type,
              pageId: form.pageId,
              pageName: form.pageName,
              userAccessToken: form.userAccessToken,
              pageAccessToken: form.pageAccessToken,
            }
          : null;
    }
  };
  const input = buildInput();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-3 font-display text-lg text-fg">
          Canales del bot ({channels?.length ?? 0})
        </h3>
        <ul className="space-y-2">
          {channels?.map((ch: Channel) => (
            <li key={ch.id}>
              <Card className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-fg">
                      {TYPE_LABEL[ch.type] ?? ch.type}
                      {ch.displayName && (
                        <span className="ml-2 font-mono text-xs text-fg3">{ch.displayName}</span>
                      )}
                    </p>
                    {ch.virtual && (
                      <p className="text-xs text-fg3">Se gestiona en la pestaña WhatsApp.</p>
                    )}
                    {ch.error && <ErrorText className="text-xs">{ch.error}</ErrorText>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      dot
                      tone={
                        ch.status === "connected"
                          ? "ok"
                          : ch.status === "error"
                            ? "danger"
                            : ch.status === "qr"
                              ? "warn"
                              : "neutral"
                      }
                    >
                      {STATUS_LABEL[ch.status] ?? ch.status}
                    </Badge>
                    {isAdmin && !ch.virtual && ch.status === "connected" && (
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={disconnect.isPending}
                        onClick={() => {
                          if (
                            confirm(
                              `¿Desconectar ${TYPE_LABEL[ch.type] ?? ch.type}? El inbox de Chatwoot se elimina y el bot deja de atender ese canal.`,
                            )
                          ) {
                            disconnect.mutate(ch.id);
                          }
                        }}
                      >
                        Desconectar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
        {disconnect.isError && (
          <ErrorText className="mt-2">{(disconnect.error as Error).message}</ErrorText>
        )}
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Conectar canal</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field label="Tipo de canal">
              <Select value={type} onChange={(e) => setType(e.target.value as ChannelType)}>
                {CONNECTABLE.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </Field>

            {type === "telegram" && (
              <Field label="Bot token (de @BotFather)">
                <Input
                  value={form.botToken ?? ""}
                  onChange={set("botToken")}
                  placeholder="123456:ABC-DEF…"
                />
              </Field>
            )}

            {type === "whatsapp_cloud" && (
              <>
                <Field label="Número de teléfono (E.164)">
                  <Input
                    value={form.phoneNumber ?? ""}
                    onChange={set("phoneNumber")}
                    placeholder="+57300…"
                  />
                </Field>
                <Field label="Phone number ID (Meta)">
                  <Input value={form.phoneNumberId ?? ""} onChange={set("phoneNumberId")} />
                </Field>
                <Field label="Business account ID (Meta)">
                  <Input
                    value={form.businessAccountId ?? ""}
                    onChange={set("businessAccountId")}
                  />
                </Field>
                <Field label="API key (token permanente de Meta)">
                  <Input value={form.apiKey ?? ""} onChange={set("apiKey")} />
                </Field>
              </>
            )}

            {(type === "instagram" || type === "messenger") && (
              <>
                <p className="text-xs text-fg3">
                  {type === "instagram"
                    ? "La cuenta de Instagram debe estar vinculada a una página de Facebook."
                    : "Conecta la página de Facebook cuyo Messenger atenderá el bot."}
                </p>
                <Field label="Page ID">
                  <Input value={form.pageId ?? ""} onChange={set("pageId")} />
                </Field>
                <Field label="Nombre de la página">
                  <Input value={form.pageName ?? ""} onChange={set("pageName")} />
                </Field>
                <Field label="User access token">
                  <Input value={form.userAccessToken ?? ""} onChange={set("userAccessToken")} />
                </Field>
                <Field label="Page access token">
                  <Input value={form.pageAccessToken ?? ""} onChange={set("pageAccessToken")} />
                </Field>
              </>
            )}

            <Button
              variant="accent"
              disabled={!input || connect.isPending}
              onClick={() => input && connect.mutate(input)}
            >
              {connect.isPending ? "Conectando…" : "Conectar"}
            </Button>
            {connect.isError && <ErrorText>{(connect.error as Error).message}</ErrorText>}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
