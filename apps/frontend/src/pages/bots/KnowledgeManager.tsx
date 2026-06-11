import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { ScoredChunk } from "@bot/shared";
import { useApi } from "@/lib/useApi";

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "En cola", cls: "bg-yellow-100 text-yellow-800" },
  indexing: { text: "Indexando…", cls: "bg-blue-100 text-blue-800" },
  ready: { text: "Lista", cls: "bg-green-100 text-green-800" },
  failed: { text: "Falló", cls: "bg-red-100 text-red-800" },
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
    // Auto-refresh mientras haya fuentes procesándose (2.2).
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
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center text-sm ${
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 text-muted-foreground"
          }`}
        >
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
      {upload.error && <p className="text-sm text-red-600">{(upload.error as Error).message}</p>}

      {isAdmin && (
        <div className="flex gap-2">
          <button onClick={() => setForm(form === "text" ? null : "text")} className="rounded-md border px-3 py-1.5 text-sm">
            + Texto
          </button>
          <button onClick={() => setForm(form === "faq" ? null : "faq")} className="rounded-md border px-3 py-1.5 text-sm">
            + FAQ
          </button>
        </div>
      )}

      {form === "text" && (
        <div className="space-y-2 rounded-lg border p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Pega aquí el contenido…"
            rows={6}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <button
            onClick={() => createSource.mutate()}
            disabled={!title || !content || createSource.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            Guardar fuente
          </button>
        </div>
      )}

      {form === "faq" && (
        <div className="space-y-2 rounded-lg border p-4">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Pregunta"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Respuesta"
            rows={3}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <button
            onClick={() => createSource.mutate()}
            disabled={!question || !answer || createSource.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            Guardar FAQ
          </button>
        </div>
      )}
      {createSource.error && (
        <p className="text-sm text-red-600">{(createSource.error as Error).message}</p>
      )}

      <div>
        <h3 className="mb-2 font-medium">Fuentes ({sources?.length ?? 0})</h3>
        <ul className="space-y-2">
          {sources?.map((s) => {
            const st = STATUS_LABEL[s.status] ?? STATUS_LABEL.pending!;
            return (
              <li key={s.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.kind} · {new Date(s.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${st.cls}`}>{st.text}</span>
                    {isAdmin && s.status === "failed" && (
                      <button
                        onClick={() => reindex.mutate(s.id)}
                        className="rounded-md border px-2 py-1 text-xs"
                      >
                        Reintentar
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar "${s.title}" y su índice?`)) remove.mutate(s.id);
                        }}
                        className="rounded-md border px-2 py-1 text-xs text-red-600"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
                {s.status === "failed" && s.error && (
                  <p className="mt-1 text-xs text-red-600">{s.error}</p>
                )}
              </li>
            );
          })}
          {sources?.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no hay fuentes de conocimiento.</p>
          )}
        </ul>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-2 font-medium">Probar búsqueda</h3>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && query && search.mutate()}
            placeholder="¿Qué buscaría un cliente?"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button
            onClick={() => search.mutate()}
            disabled={!query || search.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {search.isPending ? "Buscando…" : "Buscar"}
          </button>
        </div>
        {search.error && (
          <p className="mt-2 text-sm text-red-600">{(search.error as Error).message}</p>
        )}
        {results && (
          <ul className="mt-3 space-y-2">
            {results.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin resultados sobre el umbral.</p>
            )}
            {results.map((r, i) => (
              <li key={i} className="rounded-md border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-mono text-muted-foreground">
                  score {r.score.toFixed(3)}
                </p>
                <p className="whitespace-pre-wrap text-sm">{r.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
