import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { PartnerLogo } from "@/components/PartnerLogo";
import { listSuppliers, upsertSupplier, deleteSupplier } from "@/lib/suppliers.functions";
import { getExpenses } from "@/lib/expenses.functions";
import { brl, BRANDS } from "@/lib/format";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores — Rosset Ecommerce" },
      { name: "description", content: "Cadastro e consulta de fornecedores do e-commerce." },
    ],
  }),
  component: Page,
});

type Supplier = Awaited<ReturnType<typeof listSuppliers>>[number];

function Page() {
  const qc = useQueryClient();
  const fnList = useServerFn(listSuppliers);
  const fnUpsert = useServerFn(upsertSupplier);
  const fnDelete = useServerFn(deleteSupplier);
  const fnExpenses = useServerFn(getExpenses);

  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => fnList() });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => fnExpenses() });

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null);

  const totalsByName = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) {
      const k = (e.fornecedor ?? "").toLowerCase();
      m.set(k, (m.get(k) ?? 0) + Number(e.valor));
    }
    return m;
  }, [expenses]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return suppliers.filter((x) => x.nome.toLowerCase().includes(s) || (x.cnpj ?? "").includes(s));
  }, [suppliers, search]);

  const upsertMut = useMutation({
    mutationFn: (d: Partial<Supplier>) => fnUpsert({ data: d as any }),
    onSuccess: () => {
      toast.success("Fornecedor salvo");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => {
      toast.success("Fornecedor removido");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell title="Fornecedores">
      <div className="max-w-[1400px] mx-auto p-6 space-y-4">
        <Card className="p-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou CNPJ" className="pl-9" />
          </div>
          <Button onClick={() => { setEditing({ marcas: [] }); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo fornecedor
          </Button>
        </Card>

        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3">Fornecedor</th>
                <th className="text-left px-5 py-3">Marcas</th>
                <th className="text-left px-5 py-3">Pacote padrão</th>
                <th className="text-left px-5 py-3">Prazo</th>
                <th className="text-right px-5 py-3">Total gasto</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <PartnerLogo name={s.dominio || s.nome} size={28} />
                      <div>
                        <div className="font-medium">{s.nome}</div>
                        <div className="text-xs text-muted-foreground">{s.cnpj || s.email || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(s.marcas ?? []).map((m) => (
                        <Badge key={m} variant="outline" className="text-[10px] font-normal">{m}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{s.pacote_padrao || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{s.prazo_dias ? `${s.prazo_dias} dias` : "—"}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium">{brl(totalsByName.get(s.nome.toLowerCase()) ?? 0)}</td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remover ${s.nome}?`)) deleteMut.mutate(s.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">Nenhum fornecedor cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing?.id ? "Editar fornecedor" : "Novo fornecedor"}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 mt-6">
              <Field label="Nome*"><Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CNPJ"><Input value={editing.cnpj ?? ""} onChange={(e) => setEditing({ ...editing, cnpj: e.target.value })} /></Field>
                <Field label="Prazo (dias)"><Input type="number" value={editing.prazo_dias ?? ""} onChange={(e) => setEditing({ ...editing, prazo_dias: e.target.value ? Number(e.target.value) : null })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Contato"><Input value={editing.contato ?? ""} onChange={(e) => setEditing({ ...editing, contato: e.target.value })} /></Field>
                <Field label="Telefone"><Input value={editing.telefone ?? ""} onChange={(e) => setEditing({ ...editing, telefone: e.target.value })} /></Field>
              </div>
              <Field label="Email"><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pacote padrão"><Input value={editing.pacote_padrao ?? ""} onChange={(e) => setEditing({ ...editing, pacote_padrao: e.target.value })} /></Field>
                <Field label="Subpacote padrão"><Input value={editing.subpacote_padrao ?? ""} onChange={(e) => setEditing({ ...editing, subpacote_padrao: e.target.value })} /></Field>
              </div>
              <Field label="Domínio (para logo Clearbit)"><Input placeholder="ex.: vtex.com" value={editing.dominio ?? ""} onChange={(e) => setEditing({ ...editing, dominio: e.target.value })} /></Field>
              <Field label="Marcas atendidas">
                <div className="flex flex-wrap gap-2">
                  {BRANDS.map((b) => {
                    const active = (editing.marcas ?? []).includes(b);
                    return (
                      <button key={b} type="button"
                        onClick={() => setEditing({ ...editing, marcas: active ? (editing.marcas ?? []).filter((m) => m !== b) : [...(editing.marcas ?? []), b] })}
                        className={`text-xs px-2.5 py-1 rounded-md border transition ${active ? "bg-accent text-accent-foreground border-accent" : "bg-background hover:bg-muted"}`}>
                        {b}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Observações"><Textarea value={editing.observacoes ?? ""} onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} /></Field>
            </div>
          )}
          <SheetFooter className="mt-6">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={!editing?.nome || upsertMut.isPending} onClick={() => upsertMut.mutate(editing!)}>Salvar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}