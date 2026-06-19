
CREATE POLICY "auth read expense-docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'expense-docs');
CREATE POLICY "auth insert expense-docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'expense-docs');
CREATE POLICY "auth update expense-docs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'expense-docs');
CREATE POLICY "auth delete expense-docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'expense-docs');
