
DROP POLICY IF EXISTS "Authenticated read contract photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload contract photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update contract photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete contract photos" ON storage.objects;

CREATE POLICY "Public read contract photos" ON storage.objects FOR SELECT USING (bucket_id = 'contract-photos');
CREATE POLICY "Public upload contract photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contract-photos');
CREATE POLICY "Public update contract photos" ON storage.objects FOR UPDATE USING (bucket_id = 'contract-photos') WITH CHECK (bucket_id = 'contract-photos');
CREATE POLICY "Public delete contract photos" ON storage.objects FOR DELETE USING (bucket_id = 'contract-photos');
