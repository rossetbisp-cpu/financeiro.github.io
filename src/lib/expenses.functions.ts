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
    rateio_modo: "interno" | "externo" | "pendente";
    splits?: ExpenseSplit[];
    attachments?: { path: string; mime?: string; size?: number }[];
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rateio_group_id = crypto.randomUUID();

    let splits = data.splits ?? [];
    if (data.rateio_modo === "pendente" || splits.length === 0) {
      // single row, rateio pending — user will split later
      splits = [{ marca: "PENDENTE", valor: Number(data.valor_total) }];
    } else {
      const sum = splits.reduce((s, x) => s + Number(x.valor || 0), 0);
      if (Math.abs(sum - data.valor_total) > 0.02) {
        throw new Error(`Soma do rateio (${sum.toFixed(2)}) difere do valor total (${data.valor_total.toFixed(2)})`);
      }
    }

    const rows = splits.map((s) => ({
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
      status: "prevista",
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

export const updateExpenseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rateio_group_id?: string | null; id?: string; status: "prevista" | "recebida" | "aprovacao" | "paga" }) => d)
  .handler(async ({ data, context }) => {
    const q = context.supabase.from("expenses").update({ status: data.status });
    const { error } = data.rateio_group_id
      ? await q.eq("rateio_group_id", data.rateio_group_id)
      : await q.eq("id", data.id!);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: exps, error } = await supabase
      .from("expenses")
      .select("*")
      .not("rateio_group_id", "is", null)
      .not("created_by", "is", null)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    const groups = new Map<string, any>();
    for (const r of exps ?? []) {
      const gid = r.rateio_group_id as string;
      if (!groups.has(gid)) {
        groups.set(gid, {
          rateio_group_id: gid,
          created_at: r.created_at,
          fornecedor: r.fornecedor,
          descricao: r.descricao,
          pacote: r.pacote,
          subpacote: r.subpacote,
          date: r.date,
          data_vencimento: r.data_vencimento,
          data_recebimento: r.data_recebimento,
          tipo_documento: r.tipo_documento,
          rateio_modo: r.rateio_modo,
          status: r.status,
          total: 0,
          marcas: [] as { marca: string; valor: number }[],
        });
      }
      const g = groups.get(gid);
      g.total += Number(r.valor);
      g.marcas.push({ marca: r.marca ?? r.c_custo ?? "—", valor: Number(r.valor) });
    }
    const gids = Array.from(groups.keys());
    if (gids.length) {
      const { data: atts } = await supabase
        .from("expense_attachments")
        .select("*")
        .in("rateio_group_id", gids);
      for (const a of atts ?? []) {
        const g = groups.get(a.rateio_group_id as string);
        if (g) (g.attachments ??= []).push(a);
      }
    }
    return Array.from(groups.values());
  });

export const getAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("expense-docs")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });