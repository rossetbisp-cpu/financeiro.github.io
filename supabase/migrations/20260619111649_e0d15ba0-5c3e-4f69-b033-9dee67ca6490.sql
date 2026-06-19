
-- Suppliers
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  contato text,
  email text,
  telefone text,
  marcas text[] NOT NULL DEFAULT '{}',
  pacote_padrao text,
  subpacote_padrao text,
  prazo_dias int,
  dominio text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Brand shares
CREATE TABLE public.brand_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  brand text NOT NULL,
  share numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(month, brand)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_shares TO authenticated;
GRANT ALL ON public.brand_shares TO service_role;
ALTER TABLE public.brand_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all brand_shares" ON public.brand_shares FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Expenses extension
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS rateio_group_id uuid;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS marca text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS data_emissao date;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS data_vencimento date;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS data_recebimento date;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tipo_documento text[];
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS rateio_modo text;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS created_by uuid;

-- Attachments
CREATE TABLE public.expense_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rateio_group_id uuid,
  path text NOT NULL,
  mime text,
  size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_attachments TO authenticated;
GRANT ALL ON public.expense_attachments TO service_role;
ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all attachments" ON public.expense_attachments FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
