import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("suppliers")
      .select("*")
      .order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    nome: string;
    cnpj?: string | null;
    contato?: string | null;
    email?: string | null;
    telefone?: string | null;
    marcas?: string[];
    pacote_padrao?: string | null;
    subpacote_padrao?: string | null;
    prazo_dias?: number | null;
    dominio?: string | null;
    observacoes?: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const payload = { ...data, marcas: data.marcas ?? [] };
    const q = data.id
      ? context.supabase.from("suppliers").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("suppliers").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("suppliers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });