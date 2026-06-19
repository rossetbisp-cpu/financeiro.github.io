import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export type ExpenseSplit = { marca: string; valor: number };

export const createExpenseEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    date: string;
    data_recebimento?: string | null;
    data_emissao?: string | null;
    data_vencimento?: string | null;
    valor_total: number;
    fornecedor: string;
    descricao?: string | null;
    pacote?: string | null;
    subpacote?: string | null;
    conta_contabil?: string | null;
    tipo_documento?: string[];
    rateio_modo: "interno" | "externo";
    splits: ExpenseSplit[];
    attachments?: { path: string; mime?: string; size?: number }[];
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const sum = data.splits.reduce((s, x) => s + Number(x.valor || 0), 0);
    if (Math.abs(sum - data.valor_total) > 0.02) {
      throw new Error(`Soma do rateio (${sum.toFixed(2)}) difere do valor total (${data.valor_total.toFixed(2)})`);
    }
    if (!data.splits.length) throw new Error("Informe ao menos uma marca no rateio");

    // Generate a uuid client-side via crypto
    const rateio_group_id = crypto.randomUUID();

    const rows = data.splits.map((s) => ({
      date: data.date,
      data_recebimento: data.data_recebimento ?? null,
      data_emissao: data.data_emissao ?? null,
      data_vencimento: data.data_vencimento ?? null,
      valor: Number(s.valor),
      fornecedor: data.fornecedor,
      descricao: data.descricao ?? null,
      pacote: data.pacote ?? null,
      subpacote: data.subpacote ?? null,
      conta_contabil: data.conta_contabil ?? null,
      c_custo: s.marca,
      marca: s.marca,
      tipo_documento: data.tipo_documento ?? null,
      rateio_modo: data.rateio_modo,
      rateio_group_id,
      created_by: userId,
    }));

    const { error: insErr } = await supabase.from("expenses").insert(rows);
    if (insErr) throw new Error(insErr.message);

    if (data.attachments?.length) {
      const attRows = data.attachments.map((a) => ({
        rateio_group_id,
        path: a.path,
        mime: a.mime ?? null,
        size_bytes: a.size ?? null,
        uploaded_by: userId,
      }));
      const { error: attErr } = await supabase.from("expense_attachments").insert(attRows);
      if (attErr) throw new Error(attErr.message);
    }

    return { ok: true, rateio_group_id, count: rows.length };
  });