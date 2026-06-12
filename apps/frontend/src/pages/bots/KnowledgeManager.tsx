import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Trash2, UploadCloud } from "lucide-react";
import type { ScoredChunk } from "@bot/shared";
import { useApi } from "@/lib/useApi";
import {
  Badge,
  Button,
  Card,
  ErrorText,
  Input,
  Textarea,
  type BadgeProps,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, { text: string; tone: BadgeProps["tone"] }> = {
  pending: { text: "En cola", tone: "warn" },
  indexing: { text: "Indexando…", tone: "info" },
  ready: { text: "Lista", tone: "ok" },
  failed: { text: "Falló", tone: "danger" },
};

/** Base de conocimiento del bot: fuentes, upload, FAQs y playground (US-009). */
export function KnowledgeManager({ botId, isAdmin }: { botId: string; isAdmin: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState<"text" | "faq" | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScoredChunk[] | null>(null);

  const { data: sources } = useQuery({
    queryKey: ["knowledge", botId],
    queryFn: () => api.listKnowledge(botId),
    refetchInterval: (q) =>
      q.state.data?.some((s) => s.status === "pending" || s.status === "indexing") ? 3000 : false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["knowledge", botId] });

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadKnowledgeFile(botId, file),
    onSuccess: invalidate,
  });
  const createSource = useMutation({
    mutationFn: () =>
      form === "text"
        ? api.createKnowledgeSource(botId, { kind: "text", title, content })
        : api.createKnowledgeSource(botId, { kind: "faq", question, answer }),
    onSuccess: () => {
      setForm(null);
      setTitle("");
      setContent("");
      setQuestion("");
      setAnswer("");
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (sourceId: string) => api.deleteKnowledgeSource(botId, sourceId),
    onSuccess: invalidate,
  });
  const reindex = useMutation({
    mutationFn: (sourceId: string) => api.reindexKnowledgeSource(botId, sourceId),
    onSuccess: invalidate,
  });
  const search = useMutation({
    mutationFn: () => api.searchKnowledge(botId, query),
    onSuccess: setResults,
  });

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) upload.mutate(f);
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInput.current?.click()}
          className={cn(
            "ds-dotgrid flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center text-sm transition-colors duration-200",
            dragOver
              ? "border-accent text-fg"
              : "border-line-strong text-fg3 hover:border-accent",
          )}
        >
          <UploadCloud className="h-6 w-6" />
          Arrastra archivos md, txt o pdf (máx. 10 MB) o haz clic para subir
          <input
            ref={fileInput}
            type="file"
            multiple
            accept=".md,.txt,.pdf,text/markdown,text/plain,application/pdf"
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
      )}
      {upload.error && <ErrorText>{(upload.error as Error).message}</ErrorText>}

      {isAdmin && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setForm(form === "text" ? null : "text")}
          >
            + Texto
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setForm(form === "faq" ? null : "faq")}
          >
            + FAQ
          </Button>
        </div>
      )}

      {form === "text" && (
        <Card className="space-y-3 p-5">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Pega aquí el contenido…"
            rows={6}
          />
          <Button
            onClick={() => createSource.mutate()}
            disabled={!title || !content || createSource.isPending}
          >
            Guardar fuente
          </Button>
        </Card>
      )}

      {form === "faq" && (
        <Card className="space-y-3 p-5">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Pregunta"
          />
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Respuesta"
            rows={3}
          />
          <Button
            onClick={() => createSource.mutate()}
            disabled={!question || !answer || createSource.isPending}
          >
            Guardar FAQ
          </Button>
        </Card>
      )}
      {createSource.error && <ErrorText>{(createSource.error as Error).message}</ErrorText>}

      <div>
        <h3 className="mb-3 font-display text-lg text-fg">Fuentes ({sources?.length ?? 0})</h3>
        <ul className="space-y-2">
          {sources?.map((s) => {
            const st = STATUS_LABEL[s.status] ?? STATUS_LABEL.pending!;
            return (
              <li key={s.id}>
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{s.title}</p>
                      <p className="font-mono text-xs uppercase tracking-wide text-fg3">
                        {s.kind} · {new Date(s.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={st.tone}>{st.text}</Badge>
                      {isAdmin && s.status === "failed" && (
                        <Button variant="outline" size="sm" onClick={() => reindex.mutate(s.id)}>
                          Reintentar
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            if (confirm(`¿Eliminar "${s.title}" y su índice?`)) remove.mutate(s.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {s.status === "failed" && s.error && (
                    <ErrorText className="mt-1 text-xs">{s.error}</ErrorText>
                  )}
                </Card>
              </li>
            );
          })}
          {sources?.length === 0 && (
            <p className="text-sm text-fg3">Aún no hay fuentes de conocimiento.</p>
          )}
        </ul>
      </div>

      <Card className="p-5">
        <h3 className="mb-3 font-display text-lg text-fg">Probar búsqueda</h3>
        <div className="flex gap-2">
          <Input
            className="flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && query && search.mutate()}
            placeholder="¿Qué buscaría un cliente?"
          />
          <Button onClick={() => search.mutate()} disabled={!query || search.isPending}>
            {search.isPending ? "Buscando…" : "Buscar"}
          </Button>
        </div>
        {search.error && <ErrorText className="mt-2">{(search.error as Error).message}</ErrorText>}
        {results && (
          <ul className="mt-3 space-y-2">
            {results.length === 0 && (
              <p className="text-sm text-fg3">Sin resultados sobre el umbral.</p>
            )}
            {results.map((r, i) => (
              <li key={i} className="rounded-sm border border-line bg-soft p-3">
                <p className="mb-1 font-mono text-xs text-fg3">score {r.score.toFixed(3)}</p>
                <p className="whitespace-pre-wrap text-sm text-fg2">{r.content}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
