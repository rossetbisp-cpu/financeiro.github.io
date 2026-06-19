import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getExpenses } from "@/lib/expenses.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PartnerLogo } from "@/components/PartnerLogo";
import { brl, compactBrl } from "@/lib/format";
import { AppShell } from "@/components/AppShell";
import {
  ReceiptText,
  Building2,
  Layers,
  CalendarDays,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Legend,
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
  const fetchExpenses = useServerFn(getExpenses);
  const { data, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => fetchExpenses() as Promise<Expense[]>,
  });

  const [pacote, setPacote] = useState<string>("all");
  const [fornecedor, setFornecedor] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState<string>("all");

  // chart controls
  const [chartDim, setChartDim] = useState<"pacote" | "fornecedor">("pacote");
  const [chartSelected, setChartSelected] = useState<string[]>([]);

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

  // Series chart — by dimension
  const dimOptions = useMemo(() => {
    const key = chartDim === "pacote" ? "pacote" : "fornecedor";
    return Array.from(
      new Set(filtered.map((r) => (r[key as keyof Expense] as string) ?? "—"))
    )
      .filter(Boolean)
      .sort();
  }, [filtered, chartDim]);

  const activeSeries = chartSelected.length
    ? chartSelected.filter((s) => dimOptions.includes(s))
    : dimOptions.slice(0, 5);

  const seriesByMonth = useMemo(() => {
    const key = chartDim === "pacote" ? "pacote" : "fornecedor";
    const months = Array.from(new Set(filtered.map((r) => r.date.slice(0, 7)))).sort();
    return months.map((m) => {
      const row: Record<string, number | string> = { m };
      for (const s of activeSeries) row[s] = 0;
      for (const r of filtered) {
        if (r.date.slice(0, 7) !== m) continue;
        const v = (r[key as keyof Expense] as string) ?? "—";
        if (!activeSeries.includes(v)) continue;
        row[v] = (row[v] as number) + Number(r.valor);
      }
      return row;
    });
  }, [filtered, chartDim, activeSeries]);

  const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--accent)"];

  return (
    <AppShell title="Dashboard">
      <div className="max-w-[1500px] mx-auto p-6 space-y-6">
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

        {/* Gastos por Pacote — cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" /> Gastos por pacote
            </h2>
            <Badge variant="secondary">{byPacote.length} pacotes</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {byPacote.map((p) => {
              const pct = total > 0 ? (p.total / total) * 100 : 0;
              return (
                <Card key={p.name} className="p-4 hover:shadow-[var(--shadow-elegant)] transition-shadow cursor-pointer" onClick={() => setPacote(pacote === p.name ? "all" : p.name)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Pacote</div>
                      <div className="font-semibold tracking-tight">{p.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums">{brl(p.total)}</div>
                      <div className="text-xs text-muted-foreground">{pct.toFixed(1)}% do total</div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                    <div className="h-full" style={{ width: `${pct}%`, background: "var(--gradient-navy)" }} />
                  </div>
                  <div className="space-y-1">
                    {p.subs.slice(0, 4).map((s) => (
                      <div key={s.name} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate">{s.name}</span>
                        <span className="tabular-nums">{brl(s.total)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Interactive chart */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold tracking-tight flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" /> Evolução mensal
              </h3>
              <p className="text-xs text-muted-foreground">Selecione o tipo de dado e as séries.</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <ToggleGroup type="single" value={chartDim} onValueChange={(v) => { if (v) { setChartDim(v as "pacote" | "fornecedor"); setChartSelected([]); } }}>
                <ToggleGroupItem value="pacote" size="sm">Por pacote</ToggleGroupItem>
                <ToggleGroupItem value="fornecedor" size="sm">Por fornecedor</ToggleGroupItem>
              </ToggleGroup>
              <Select
                value="__placeholder__"
                onValueChange={(v) => {
                  if (v === "__clear__") { setChartSelected([]); return; }
                  setChartSelected((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
                }}
              >
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder={`Adicionar ${chartDim === "pacote" ? "pacotes" : "fornecedores"}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__clear__">Limpar seleção</SelectItem>
                  {dimOptions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {chartSelected.includes(o) ? "✓ " : ""}{o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {activeSeries.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {activeSeries.map((s, i) => (
                <Badge key={s} variant="outline" className="font-normal gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: chartColors[i % chartColors.length] }} />
                  {s}
                </Badge>
              ))}
            </div>
          )}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seriesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="m" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tickFormatter={(v) => compactBrl(v)} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(v: number) => brl(v)}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {activeSeries.map((s, i) => (
                  <Bar key={s} dataKey={s} stackId="a" fill={chartColors[i % chartColors.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Total mensal chart */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Wallet className="h-4 w-4 text-accent" /> Total geral por mês</h3>
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
      </div>
    </AppShell>
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