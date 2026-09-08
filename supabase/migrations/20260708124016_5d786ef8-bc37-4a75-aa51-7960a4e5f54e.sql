
CREATE POLICY "Authenticated read contract photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'contract-photos');
CREATE POLICY "Authenticated upload contract photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'contract-photos');
CREATE POLICY "Authenticated update contract photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'contract-photos');
CREATE POLICY "Authenticated delete contract photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'contract-photos');
