import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getExpenses } from "@/lib/expenses.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PartnerLogo } from "@/components/PartnerLogo";
import { brl, compactBrl } from "@/lib/format";
import {
  TrendingDown,
  LogOut,
  ReceiptText,
  Building2,
  Layers,
  CalendarDays,
  Search,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "DRE — Ecommerce Costs" },
      { name: "description", content: "Painel financeiro do departamento de e-commerce." },
    ],
  }),
  component: Dashboard,
});

type Expense = {
  id: string;
  date: string;
  pacote: string | null;
  subpacote: string | null;
  conta_contabil: string | null;
  c_custo: string | null;
  descricao: string | null;
  valor: number;
  fornecedor: string | null;
};

function Dashboard() {
  const navigate = useNavigate();
  const fetchExpenses = useServerFn(getExpenses);
  const { data, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => fetchExpenses() as Promise<Expense[]>,
  });

  const [pacote, setPacote] = useState<string>("all");
  const [fornecedor, setFornecedor] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState<string>("all");

  const all = data ?? [];

  const pacotes = useMemo(
    () => Array.from(new Set(all.map((r) => r.pacote).filter(Boolean))).sort() as string[],
    [all]
  );
  const fornecedores = useMemo(
    () => Array.from(new Set(all.map((r) => r.fornecedor).filter(Boolean))).sort() as string[],
    [all]
  );
  const months = useMemo(() => {
    const s = new Set(all.map((r) => r.date.slice(0, 7)));
    return Array.from(s).sort();
  }, [all]);

  const filtered = useMemo(() => {
    return all.filter((r) => {
      if (pacote !== "all" && r.pacote !== pacote) return false;
      if (fornecedor !== "all" && r.fornecedor !== fornecedor) return false;
      if (month !== "all" && !r.date.startsWith(month)) return false;
      if (search && !(r.descricao ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [all, pacote, fornecedor, month, search]);

  const total = filtered.reduce((s, r) => s + Number(r.valor), 0);
  const avgPerMonth = month === "all" && months.length > 0 ? total / months.length : total;

  const byPacote = useMemo(() => {
    const map = new Map<string, { total: number; subs: Map<string, number> }>();
    for (const r of filtered) {
      const p = r.pacote ?? "—";
      const s = r.subpacote ?? "—";
      if (!map.has(p)) map.set(p, { total: 0, subs: new Map() });
      const e = map.get(p)!;
      e.total += Number(r.valor);
      e.subs.set(s, (e.subs.get(s) ?? 0) + Number(r.valor));
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        total: v.total,
        subs: Array.from(v.subs.entries())
          .map(([n, t]) => ({ name: n, total: t }))
          .sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const byFornecedor = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const f = r.fornecedor ?? "—";
      map.set(f, (map.get(f) ?? 0) + Number(r.valor));
    }
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const m = r.date.slice(0, 7);
      map.set(m, (map.get(m) ?? 0) + Number(r.valor));
    }
    return Array.from(map.entries())
      .sort()
      .map(([m, total]) => ({ m, total }));
  }, [filtered]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md grid place-items-center text-primary-foreground" style={{ background: "var(--gradient-navy)" }}>
              <TrendingDown className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-semibold tracking-tight">Ecommerce Costs</h1>
              <p className="text-xs text-muted-foreground">DRE departamental · 2026</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Filters */}
        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-3 w-3" />Mês</label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {months.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Layers className="h-3 w-3" />Pacote</label>
              <Select value={pacote} onValueChange={setPacote}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pacotes</SelectItem>
                  {pacotes.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3 w-3" />Fornecedor</label>
              <Select value={fornecedor} onValueChange={setFornecedor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os parceiros</SelectItem>
                  {fornecedores.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Search className="h-3 w-3" />Buscar</label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Descrição..." />
            </div>
          </div>
        </Card>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard label="Despesa total" value={brl(total)} sub={`${filtered.length} lançamentos`} />
          <KpiCard label="Média / mês" value={brl(avgPerMonth)} sub={month === "all" ? `${months.length} meses` : month} />
          <KpiCard label="Parceiros ativos" value={String(byFornecedor.length)} sub="fornecedores no filtro" />
          <KpiCard label="Pacotes" value={String(byPacote.length)} sub="categorias de despesa" />
        </div>

        {/* Chart */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Despesas por mês</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="m" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tickFormatter={(v) => compactBrl(v)} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(v: number) => brl(v)}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                />
                <Bar dataKey="total" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* DRE table + Top partners */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-0 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><ReceiptText className="h-4 w-4" />Demonstrativo por pacote</h3>
              <Badge variant="secondary">{byPacote.length} pacotes</Badge>
            </div>
            <div className="divide-y">
              {byPacote.map((p) => {
                const pct = total > 0 ? (p.total / total) * 100 : 0;
                return (
                  <div key={p.name} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-right">
                        <div className="font-semibold tabular-nums">{brl(p.total)}</div>
                        <div className="text-xs text-muted-foreground">{pct.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, background: "var(--gradient-navy)" }} />
                    </div>
                    <div className="mt-3 grid gap-1 pl-3 border-l-2 border-border">
                      {p.subs.slice(0, 5).map((s) => (
                        <div key={s.name} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{s.name}</span>
                          <span className="tabular-nums">{brl(s.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="px-5 py-4 bg-muted/40 flex items-center justify-between">
                <span className="font-semibold">TOTAL DE DESPESAS</span>
                <span className="font-semibold tabular-nums text-lg">{brl(total)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" />Parceiros</h3>
              <Badge variant="secondary">{byFornecedor.length}</Badge>
            </div>
            <ScrollArea className="h-[520px]">
              <div className="divide-y">
                {byFornecedor.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => setFornecedor(fornecedor === f.name ? "all" : f.name)}
                    className={`w-full px-5 py-3 flex items-center gap-3 hover:bg-muted/50 text-left transition ${fornecedor === f.name ? "bg-muted/60" : ""}`}
                  >
                    <PartnerLogo name={f.name} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{f.name}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{brl(f.total)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Recent transactions */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Lançamentos recentes</h3>
            <Badge variant="secondary">{filtered.length}</Badge>
          </div>
          <ScrollArea className="h-[400px]">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground sticky top-0">
                <tr>
                  <th className="text-left px-5 py-2.5">Data</th>
                  <th className="text-left px-5 py-2.5">Pacote</th>
                  <th className="text-left px-5 py-2.5">Descrição</th>
                  <th className="text-left px-5 py-2.5">Fornecedor</th>
                  <th className="text-right px-5 py-2.5">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.slice(0, 200).map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-5 py-2.5 tabular-nums whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge variant="outline" className="font-normal">{r.pacote}</Badge>
                    </td>
                    <td className="px-5 py-2.5 max-w-xs truncate text-muted-foreground" title={r.descricao ?? ""}>
                      {r.descricao}
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <PartnerLogo name={r.fornecedor ?? "—"} size={22} />
                        <span className="truncate max-w-[180px]">{r.fornecedor}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-medium">{brl(Number(r.valor))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </Card>

        {isLoading && (
          <div className="text-center text-muted-foreground py-12">Carregando…</div>
        )}
      </main>
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tracking-tight mt-1 tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </Card>
  );
}