import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { listSubmissions, getAttachmentUrl } from "@/lib/expenses.functions";
import { Paperclip, FileText, Inbox, Building2, Layers, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/envios")({
  head: () => ({ meta: [{ title: "Envios — Rosset Ecommerce" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listSubmissions);
  const fnUrl = useServerFn(getAttachmentUrl);
  const { data = [], isLoading } = useQuery({ queryKey: ["submissions"], queryFn: () => fn() as Promise<any[]> });
  const [opening, setOpening] = useState<string | null>(null);

  const openAttachment = async (path: string) => {
    try {
      setOpening(path);
      const r = await fnUrl({ data: { path } });
      window.open(r.url, "_blank", "noopener,noreferrer");
    } finally { setOpening(null); }
  };

  return (
    <AppShell title="Envios de despesas">
      <div className="max-w-[1500px] mx-auto p-6 space-y-6">
        <Card className="p-6 border-0 text-primary-foreground" style={{ background: "var(--gradient-navy)" }}>
          <h2 className="font-semibold tracking-tight flex items-center gap-2"><Inbox className="h-5 w-5" />Envios recebidos</h2>
          <p className="text-xs opacity-80 mt-1">Cada cartão é um lançamento feito por um usuário, com os anexos validados.</p>
        </Card>

        {isLoading && <Card className="p-12 text-center text-muted-foreground">Carregando…</Card>}
        {!isLoading && data.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">Nenhum envio ainda. Os lançamentos aparecerão aqui.</Card>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {data.map((g: any) => (
            <Card key={g.rateio_group_id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold tracking-tight truncate">{g.descricao || g.fornecedor || "Despesa"}</h3>
                  <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                    {g.fornecedor && <span className="flex items-center gap-1"><Building2 className="h-3 w-3"/>{g.fornecedor}</span>}
                    {g.pacote && <span className="flex items-center gap-1"><Layers className="h-3 w-3"/>{g.pacote}</span>}
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3"/>{new Date(g.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">{brl(g.total)}</div>
                  <Badge variant="outline" className="mt-1">{g.tipo_documento?.join(" + ") || "—"}</Badge>
                </div>
              </div>

              {Array.isArray(g.marcas) && g.marcas.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {g.marcas.map((m: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{m.marca}{m.valor ? ` · ${brl(m.valor)}` : ""}</Badge>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Paperclip className="h-3 w-3"/>Anexos ({g.attachments?.length ?? 0})</div>
                <div className="space-y-1.5">
                  {(g.attachments ?? []).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between text-sm bg-muted/40 rounded px-2 py-1.5">
                      <span className="truncate flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-muted-foreground" />{a.path.split("/").pop()}</span>
                      <Button variant="ghost" size="sm" disabled={opening === a.path} onClick={() => openAttachment(a.path)}>
                        {opening === a.path ? "Abrindo..." : "Abrir"}
                      </Button>
                    </div>
                  ))}
                  {(!g.attachments || g.attachments.length === 0) && (
                    <div className="text-xs text-muted-foreground italic">Sem anexos</div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}