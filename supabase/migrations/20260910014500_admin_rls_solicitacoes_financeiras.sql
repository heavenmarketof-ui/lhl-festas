-- ============================================================
-- Central de Solicitações Financeiras — escrita administrativa via RLS
-- ============================================================
-- O Worker não deve depender de service_role para as ações normais do painel.
-- A sessão autenticada do administrador é validada por public.has_role e a
-- própria RLS limita quem pode criar/alterar solicitações e registrar eventos.

GRANT INSERT, UPDATE ON public.solicitacoes_financeiras TO authenticated;
GRANT INSERT ON public.solicitacoes_financeiras_eventos TO authenticated;

DROP POLICY IF EXISTS "Admins criam solicitacoes financeiras" ON public.solicitacoes_financeiras;
CREATE POLICY "Admins criam solicitacoes financeiras"
  ON public.solicitacoes_financeiras
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins atualizam solicitacoes financeiras" ON public.solicitacoes_financeiras;
CREATE POLICY "Admins atualizam solicitacoes financeiras"
  ON public.solicitacoes_financeiras
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins registram historico de solicitacoes" ON public.solicitacoes_financeiras_eventos;
CREATE POLICY "Admins registram historico de solicitacoes"
  ON public.solicitacoes_financeiras_eventos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
