import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { brl, BRANDS, RATEIO_PRESETS, type Brand } from "@/lib/format";
import { createExpenseEntry } from "@/lib/expenses.functions";
import { listSuppliers } from "@/lib/suppliers.functions";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, FilePlus2, Upload, X, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/lancar")({
  head: () => ({
    meta: [
      { title: "Lançar despesa — Rosset Ecommerce" },
      { name: "description", content: "Formulário de lançamento de despesas com rateio entre marcas." },
    ],
  }),
  component: Page,
});

const today = () => new Date().toISOString().slice(0, 10);

function Page() {
  const navigate = useNavigate();
  const fnCreate = useServerFn(createExpenseEntry);
  const fnSuppliers = useServerFn(listSuppliers);
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => fnSuppliers() });

  const [fornecedor, setFornecedor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pacote, setPacote] = useState("");
  const [subpacote, setSubpacote] = useState("");
  const [dataRecebimento, setDataRecebimento] = useState(today());
  const [dataEmissao, setDataEmissao] = useState(today());
  const [dataVencimento, setDataVencimento] = useState("");
  const [valorTotal, setValorTotal] = useState<number>(0);
  const [tipoDoc, setTipoDoc] = useState<string[]>(["Nota", "Boleto"]);
  const [rateioModo, setRateioModo] = useState<"interno" | "externo">("interno");
  const [splits, setSplits] = useState<Record<Brand, number>>({} as any);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const selectedSupplier = suppliers.find((s) => s.nome === fornecedor);

  // Pre-fill pacote when supplier picked
  const onPickSupplier = (name: string) => {
    setFornecedor(name);
    const s = suppliers.find((x) => x.nome === name);
    if (s) {
      if (s.pacote_padrao) setPacote(s.pacote_padrao);
      if (s.subpacote_padrao) setSubpacote(s.subpacote_padrao);
      if (s.marcas?.length) {
        const init: Record<string, number> = {};
        for (const b of s.marcas) init[b] = 0;
        setSplits(init as any);
      }
    }
  };

  const splitSum = useMemo(() => Object.values(splits).reduce((s, v) => s + Number(v || 0), 0), [splits]);
  const diff = valorTotal - splitSum;
  const balanced = Math.abs(diff) < 0.02 && valorTotal > 0;

  const setBrandValue = (b: Brand, v: number) => setSplits({ ...splits, [b]: v });

  const applyPreset = (brands: Brand[]) => {
    if (!valorTotal) return toast.error("Informe primeiro o valor total");
    const per = valorTotal / brands.length;
    const next: Record<string, number> = {};
    for (const b of brands) next[b] = Math.round(per * 100) / 100;
    // adjust rounding diff
    const sum = Object.values(next).reduce((s, v) => s + v, 0);
    const d = Math.round((valorTotal - sum) * 100) / 100;
    if (d !== 0) next[brands[0]] = Math.round((next[brands[0]] + d) * 100) / 100;
    setSplits(next as any);
  };

  const splitEqually = () => {
    const brands = Object.keys(splits) as Brand[];
    if (brands.length === 0) return toast.error("Selecione marcas primeiro");
    applyPreset(brands);
  };

  const toggleBrand = (b: Brand) => {
    if (b in splits) {
      const { [b]: _, ...rest } = splits;
      setSplits(rest as any);
    } else {
      setSplits({ ...splits, [b]: 0 });
    }
  };

  const submitMut = useMutation({
    mutationFn: async () => {
      setUploading(true);
      // upload attachments
      const uploaded: { path: string; mime?: string; size?: number }[] = [];
      for (const f of files) {
        const allowedMime = new Set([
          "application/pdf",
          "image/jpeg",
          "image/png",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ]);
        const allowedExt = /\.(pdf|jpe?g|png|xlsx|xls)$/i;
        if (!allowedMime.has(f.type) || !allowedExt.test(f.name)) {
          setUploading(false);
          throw new Error(`Tipo de arquivo não permitido: ${f.name}. Aceitos: PDF, JPG, PNG, XLSX.`);
        }
        if (f.size > 15 * 1024 * 1024) {
          setUploading(false);
          throw new Error(`Arquivo muito grande (máx 15MB): ${f.name}`);
        }
        const path = `${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${f.name}`;
        const { error } = await supabase.storage.from("expense-docs").upload(path, f, { upsert: false, contentType: f.type });
        if (error) throw new Error(`Upload falhou: ${error.message}`);
        uploaded.push({ path, mime: f.type, size: f.size });
      }
      setUploading(false);
      const splitsArr = Object.entries(splits)
        .filter(([, v]) => Number(v) > 0)
        .map(([marca, valor]) => ({ marca, valor: Number(valor) }));
      return fnCreate({
        data: {
          date: dataEmissao || today(),
          data_recebimento: dataRecebimento || null,
          data_emissao: dataEmissao || null,
          data_vencimento: dataVencimento || null,
          valor_total: valorTotal,
          fornecedor,
          descricao,
          pacote: pacote || null,
          subpacote: subpacote || null,
          tipo_documento: tipoDoc,
          rateio_modo: rateioModo,
          splits: splitsArr,
          attachments: uploaded,
        },
      });
    },
    onSuccess: (r: any) => {
      toast.success(`Despesa lançada: ${r.count} linhas geradas`);
      navigate({ to: "/dashboard" });
    },
    onError: (e: any) => { setUploading(false); toast.error(e.message); },
  });

  const canSubmit = fornecedor && valorTotal > 0 && balanced && dataVencimento && !submitMut.isPending;

  return (
    <AppShell title="Lançar Despesa">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Card className="p-6 border-0 text-primary-foreground" style={{ background: "var(--gradient-navy)" }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-white/10 grid place-items-center"><FilePlus2 className="h-5 w-5" /></div>
            <div>
              <h2 className="font-semibold tracking-tight">Novo lançamento</h2>
              <p className="text-xs opacity-80">Carimbo de data/hora será gerado automaticamente ao salvar.</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <SectionTitle n={1} title="Documentos & datas" />
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Data de recebimento da nota/boleto"><Input type="date" value={dataRecebimento} onChange={(e) => setDataRecebimento(e.target.value)} /></Field>
            <Field label="Data de emissão da nota"><Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} /></Field>
            <Field label="Data de vencimento*"><Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} /></Field>
          </div>
          <Field label="Quais documentos você deseja enviar?">
            <div className="flex flex-wrap gap-2">
              {["Nota", "Boleto", "Kit", "Comprovante", "Contrato"].map((t) => {
                const active = tipoDoc.includes(t);
                return (
                  <button key={t} type="button" onClick={() => setTipoDoc(active ? tipoDoc.filter(x => x !== t) : [...tipoDoc, t])}
                    className={`text-xs px-3 py-1.5 rounded-md border transition ${active ? "bg-accent text-accent-foreground border-accent" : "bg-background hover:bg-muted"}`}>
                    {t}
                  </button>
                );
              })}
            </div>
          </Field>
        </Card>

        <Card className="p-6 space-y-5">
          <SectionTitle n={2} title="Fornecedor & valor" />
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Qual fornecedor você está fazendo o envio?*">
              <Select value={fornecedor} onValueChange={onPickSupplier}>
                <SelectTrigger><SelectValue placeholder="Selecione um fornecedor" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (<SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>))}
                </SelectContent>
              </Select>
              {suppliers.length === 0 && <p className="text-xs text-muted-foreground mt-1">Cadastre fornecedores em <a className="underline" href="/fornecedores">/fornecedores</a>.</p>}
            </Field>
            <Field label="Valor total*">
              <Input type="number" step="0.01" value={valorTotal || ""} onChange={(e) => setValorTotal(Number(e.target.value))} />
            </Field>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Pacote"><Input value={pacote} onChange={(e) => setPacote(e.target.value)} placeholder="Ex.: Mídia, Plataforma, Logística" /></Field>
            <Field label="Subpacote"><Input value={subpacote} onChange={(e) => setSubpacote(e.target.value)} placeholder="Ex.: Google, Meta, Vtex" /></Field>
          </div>
          <Field label="Descrição"><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhe do serviço/produto" /></Field>
        </Card>

        <Card className="p-6 space-y-5">
          <SectionTitle n={3} title="Rateio entre marcas" />
          <div className="flex flex-wrap gap-3 items-center">
            <ToggleGroup type="single" value={rateioModo} onValueChange={(v) => v && setRateioModo(v as any)}>
              <ToggleGroupItem value="interno" size="sm">Rateio interno</ToggleGroupItem>
              <ToggleGroupItem value="externo" size="sm">Rateio externo</ToggleGroupItem>
            </ToggleGroup>
            <span className="text-xs text-muted-foreground">
              {rateioModo === "interno"
                ? "Indique as marcas que participam — soma deve fechar com o valor total."
                : "Valor já vem segregado pelo fornecedor por marca."}
            </span>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Marcas participantes</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {BRANDS.map((b) => {
                const active = b in splits;
                return (
                  <button key={b} type="button" onClick={() => toggleBrand(b)}
                    className={`text-xs px-3 py-1.5 rounded-md border transition ${active ? "bg-accent text-accent-foreground border-accent" : "bg-background hover:bg-muted"}`}>
                    {b}
                  </button>
                );
              })}
            </div>
          </div>

          {rateioModo === "interno" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground mr-1 self-center"><Sparkles className="h-3 w-3 inline mr-1" />Presets:</span>
                {RATEIO_PRESETS.map((p) => (
                  <Button key={p.label} variant="outline" size="sm" onClick={() => applyPreset(p.brands)}>{p.label}</Button>
                ))}
                <Button variant="secondary" size="sm" onClick={splitEqually}>Dividir igualmente</Button>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {Object.keys(splits).map((b) => (
              <div key={b} className="flex items-center gap-2">
                <Badge variant="outline" className="min-w-[140px] justify-center">{b}</Badge>
                <Input type="number" step="0.01" value={(splits as any)[b] || ""} onChange={(e) => setBrandValue(b as Brand, Number(e.target.value))} />
              </div>
            ))}
          </div>

          {Object.keys(splits).length > 0 && (
            <div className={`flex items-center justify-between text-sm p-3 rounded-md border ${balanced ? "bg-success/5 border-success/30 text-success" : "bg-destructive/5 border-destructive/30 text-destructive"}`}>
              <span className="flex items-center gap-2">
                {balanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                Soma: <strong className="tabular-nums">{brl(splitSum)}</strong> / Total: <strong className="tabular-nums">{brl(valorTotal)}</strong>
              </span>
              {!balanced && valorTotal > 0 && <span className="tabular-nums">Diferença: {brl(diff)}</span>}
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <SectionTitle n={4} title="Anexos" />
          <label className="border-2 border-dashed border-border rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:border-accent transition">
            <Upload className="h-6 w-6 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Carregue todos os documentos para validação</span>
            <span className="text-xs text-muted-foreground/70 mt-1">PDF, JPG, PNG, XLSX</span>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])}
            />
          </label>
          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/40">
                  <span className="truncate">{f.name} <span className="text-xs text-muted-foreground">({(f.size / 1024).toFixed(0)} KB)</span></span>
                  <Button variant="ghost" size="icon" onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex justify-end gap-3 pb-6">
          <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>Cancelar</Button>
          <Button disabled={!canSubmit} onClick={() => submitMut.mutate()}>
            {(uploading || submitMut.isPending) ? "Enviando..." : "Salvar lançamento"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b">
      <span className="h-6 w-6 rounded-full text-xs font-bold text-primary-foreground grid place-items-center" style={{ background: "var(--gradient-navy)" }}>{n}</span>
      <h3 className="font-semibold tracking-tight">{title}</h3>
    </div>
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