
-- Lock down SECURITY DEFINER functions: only the database itself / triggers should run them
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.bootstrap_first_admin() from public, anon, authenticated;

-- Fix search_path on the trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tighten the public-insert policy expression (still allows any submission, but no longer literal "true")
drop policy "Public can insert orders" on public.orders;
create policy "Public can insert orders" on public.orders
  for insert to anon, authenticated
  with check (
    length(nome) > 0 and length(email) > 0 and length(cpf) > 0
  );
