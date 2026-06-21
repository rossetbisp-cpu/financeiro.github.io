-- Roles system
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- user_roles policies
DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Tighten expenses
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON public.expenses;
CREATE POLICY "approved view expenses" ON public.expenses FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "approved insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "approved update expenses" ON public.expenses FOR UPDATE TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "approved delete expenses" ON public.expenses FOR DELETE TO authenticated USING (public.is_approved(auth.uid()));

-- Tighten suppliers
DROP POLICY IF EXISTS "auth read suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "auth insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "auth update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "auth delete suppliers" ON public.suppliers;
CREATE POLICY "approved read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "approved insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "approved update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "approved delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (public.is_approved(auth.uid()));

-- Tighten brand_shares
DROP POLICY IF EXISTS "auth all brand_shares" ON public.brand_shares;
CREATE POLICY "approved all brand_shares" ON public.brand_shares FOR ALL TO authenticated
  USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));

-- Tighten expense_attachments
DROP POLICY IF EXISTS "auth all attachments" ON public.expense_attachments;
CREATE POLICY "approved all attachments" ON public.expense_attachments FOR ALL TO authenticated
  USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));

-- Tighten storage bucket expense-docs
DROP POLICY IF EXISTS "auth read expense-docs" ON storage.objects;
DROP POLICY IF EXISTS "auth insert expense-docs" ON storage.objects;
DROP POLICY IF EXISTS "auth update expense-docs" ON storage.objects;
DROP POLICY IF EXISTS "auth delete expense-docs" ON storage.objects;
CREATE POLICY "approved read expense-docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'expense-docs' AND public.is_approved(auth.uid()));
CREATE POLICY "approved insert expense-docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'expense-docs'
    AND public.is_approved(auth.uid())
    AND lower(storage.extension(name)) IN ('pdf','jpg','jpeg','png','xlsx','xls')
  );
CREATE POLICY "approved update expense-docs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'expense-docs' AND public.is_approved(auth.uid()));
CREATE POLICY "approved delete expense-docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'expense-docs' AND public.is_approved(auth.uid()));