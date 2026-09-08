drop policy if exists "Public read contract photos" on storage.objects;
drop policy if exists "Public upload contract photos" on storage.objects;
drop policy if exists "Public update contract photos" on storage.objects;
drop policy if exists "Public delete contract photos" on storage.objects;

-- Leitura direta: apenas administradoras. URLs assinadas já geradas continuam válidas.
create policy "Admins read contract photos"
on storage.objects for select to authenticated
using (bucket_id = 'contract-photos' and public.has_role(auth.uid(), 'admin'));

-- Formulário público de orçamento: envio restrito à pasta orcamento/.
create policy "Public upload orcamento photos"
on storage.objects for insert to anon
with check (bucket_id = 'contract-photos' and name like 'orcamento/%');

create policy "Public read orcamento photos"
on storage.objects for select to anon
using (bucket_id = 'contract-photos' and name like 'orcamento/%');

-- Painel administrativo: envio, substituição e exclusão.
create policy "Admins upload contract photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'contract-photos' and public.has_role(auth.uid(), 'admin'));

create policy "Admins update contract photos"
on storage.objects for update to authenticated
using (bucket_id = 'contract-photos' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'contract-photos' and public.has_role(auth.uid(), 'admin'));

create policy "Admins delete contract photos"
on storage.objects for delete to authenticated
using (bucket_id = 'contract-photos' and public.has_role(auth.uid(), 'admin'));