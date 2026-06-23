import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { brl } from "@/lib/format";
import { getExpenses, updateExpenseStatus } from "@/lib/expenses.functions";
import { CalendarDays, Layers, Building2, Tag, Receipt, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/despesas")({
  head: () => ({ meta: [{ title: "Despesas — Rosset Ecommerce" }] }),
  component: Page,
});

type Status = "prevista" | "recebida" | "aprovacao" | "paga";
const STATUS_LABELS: Record<Status, string> = {
  prevista: "Prevista",
  recebida: "Recebida",
  aprovacao: "Em aprovação",
  paga: "Paga",
};
const STATUS_CLASS: Record<Status, string> = {
  prevista: "bg-muted text-muted-foreground border-border",
  recebida: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  aprovacao: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  paga: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

function Page() {
  const fetchExpenses = useServerFn(getExpenses);
  const fnUpdate = useServerFn(updateExpenseStatus);
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => fetchExpenses() as Promise<any[]> });

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [marca, setMarca] = useState("all");
  const [fornecedor, setFornecedor] = useState("all");
  const [pacote, setPacote] = useState("all");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [search, setSearch] = useState("");

  const marcas = useMemo(() => Array.from(new Set(data.map((r) => r.marca).filter(Boolean))).sort() as string[], [data]);
  const fornecedores = useMemo(() => Array.from(new Set(data.map((r) => r.fornecedor).filter(Boolean))).sort() as string[], [data]);
  const pacotes = useMemo(() => Array.from(new Set(data.map((r) => r.pacote).filter(Boolean))).sort() as string[], [data]);

  // Group by rateio_group_id so each submission shows once
  const grouped = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of data) {
      const key = r.rateio_group_id ?? r.id;
      if (!m.has(key)) {
        m.set(key, { ...r, _ids: [r.id], _marcas: new Set<string>(), total: 0 });
      }
      const g = m.get(key);
      if (r.marca) g._marcas.add(r.marca);
      g.total += Number(r.valor);
      g._ids.push(r.id);
    }
    return Array.from(m.values()).map((g) => ({ ...g, marcas: Array.from(g._marcas) as string[] }));
  }, [data]);

  const filtered = useMemo(() => grouped.filter((r) => {
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    if (marca !== "all" && !r.marcas.includes(marca)) return false;
    if (fornecedor !== "all" && r.fornecedor !== fornecedor) return false;
    if (pacote !== "all" && r.pacote !== pacote) return false;
    if (status !== "all" && r.status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${r.descricao ?? ""} ${r.fornecedor ?? ""} ${r.pacote ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [grouped, from, to, marca, fornecedor, pacote, status, search]);

  const totalFiltrado = filtered.reduce((s, r) => s + Number(r.total), 0);

  const updateMut = useMutation({
    mutationFn: (v: { rateio_group_id: string; status: Status }) => fnUpdate({ data: v }),
    onSuccess: () => { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["expenses"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell title="Despesas">
      <div className="max-w-[1500px] mx-auto p-6 space-y-6">
        <Card className="p-6 border-0 text-primary-foreground" style={{ background: "var(--gradient-navy)" }}>
          <h2 className="font-semibold tracking-tight flex items-center gap-2"><Receipt className="h-5 w-5" />Despesas lançadas</h2>
          <p className="text-xs opacity-80 mt-1">Filtre por período, marca, fornecedor, pacote e status. Atualize a cobrança em um clique.</p>
        </Card>

        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-3 w-3"/>De</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-3 w-3"/>Até</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><Tag className="h-3 w-3"/>Marca</label>
              <Select value={marca} onValueChange={setMarca}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {marcas.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3 w-3"/>Fornecedor</label>
              <Select value={fornecedor} onValueChange={setFornecedor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {fornecedores.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><Layers className="h-3 w-3"/>Pacote</label>
              <Select value={pacote} onValueChange={setPacote}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {pacotes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5"><Search className="h-3 w-3"/>Buscar</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Descrição, fornecedor..." />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-muted-foreground">{filtered.length} despesas</span>
            <span className="font-semibold tabular-nums">{brl(totalFiltrado)}</span>
          </div>
        </Card>

        <div className="space-y-2">
          {filtered.map((r) => {
            const st = (r.status ?? "prevista") as Status;
            const title = r.descricao || r.fornecedor || "Despesa";
            return (
              <Card key={r.rateio_group_id ?? r.id} className="p-4 hover:shadow-[var(--shadow-elegant)] transition">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold tracking-tight truncate">{title}</h3>
                      <Badge variant="outline" className={STATUS_CLASS[st]}>{STATUS_LABELS[st]}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                      {r.fornecedor && <span className="flex items-center gap-1"><Building2 className="h-3 w-3"/>{r.fornecedor}</span>}
                      {r.pacote && <span className="flex items-center gap-1"><Layers className="h-3 w-3"/>{r.pacote}{r.subpacote ? ` • ${r.subpacote}` : ""}</span>}
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3"/>Emissão {r.date}</span>
                      {r.data_vencimento && <span className="flex items-center gap-1">Venc. {r.data_vencimento}</span>}
                    </div>
                    {r.marcas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.marcas.map((m: string) => (
                          <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    <div className="font-semibold tabular-nums text-lg">{brl(r.total)}</div>
                    <Select
                      value={st}
                      onValueChange={(v) => r.rateio_group_id && updateMut.mutate({ rateio_group_id: r.rateio_group_id, status: v as Status })}
                    >
                      <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card className="p-12 text-center text-muted-foreground">Nenhuma despesa encontrada com os filtros atuais.</Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}