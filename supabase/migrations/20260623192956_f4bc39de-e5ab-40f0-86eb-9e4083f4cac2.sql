ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'prevista' 
  CHECK (status IN ('prevista','recebida','aprovacao','paga'));

CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_rateio_group ON public.expenses(rateio_group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_fornecedor ON public.expenses(fornecedor);

-- Backfill historical rows to 'paga' (already happened)
UPDATE public.expenses SET status = 'paga' WHERE created_by IS NULL;