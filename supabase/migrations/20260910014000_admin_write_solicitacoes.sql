-- ============================================================
-- Central de Solicitações Financeiras
-- Escritas administrativas via sessão autenticada + RLS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.solicitacoes_financeiras
TO authenticated;

GRANT SELECT, INSERT
ON public.solicitacoes_financeiras_eventos
TO authenticated;

DROP POLICY IF EXISTS "Admins gerenciam solicitacoes financeiras"
ON public.solicitacoes_financeiras;

CREATE POLICY "Admins gerenciam solicitacoes financeiras"
ON public.solicitacoes_financeiras
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins registram historico de solicitacoes"
ON public.solicitacoes_financeiras_eventos;

CREATE POLICY "Admins registram historico de solicitacoes"
ON public.solicitacoes_financeiras_eventos
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Um mesmo item de compra deve continuar protegido contra duplicidade também
-- quando a compra já foi realizada, mas ainda não foi lançada no financeiro.
DROP INDEX IF EXISTS public.solicitacoes_origem_item_unico;

CREATE UNIQUE INDEX solicitacoes_origem_item_unico
ON public.solicitacoes_financeiras (origem_item_id)
WHERE origem_item_id IS NOT NULL
  AND status IN ('pendente', 'autorizada', 'comprada', 'lancada');
