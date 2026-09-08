-- ============================================================
-- Central de Solicitações Financeiras
-- ============================================================

CREATE TABLE public.solicitacoes_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL DEFAULT 'compra_materiais',
  origem TEXT NOT NULL DEFAULT 'central_operacoes',
  status TEXT NOT NULL DEFAULT 'pendente',

  pedido_id TEXT,
  pedido_cliente TEXT,
  ordem_producao TEXT,
  origem_item_id TEXT,
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,

  fornecedor TEXT,
  categoria TEXT NOT NULL DEFAULT 'Fornecedor',
  conta TEXT NOT NULL DEFAULT 'Caixa',
  forma_pagamento TEXT NOT NULL DEFAULT 'PIX',
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  descricao TEXT NOT NULL DEFAULT '',
  observacoes TEXT,
  data_prevista DATE,

  criado_por UUID,
  criado_por_email TEXT,
  editado_por UUID,
  editado_por_email TEXT,
  editado_em TIMESTAMP WITH TIME ZONE,

  autorizado_por UUID,
  autorizado_por_email TEXT,
  autorizado_em TIMESTAMP WITH TIME ZONE,

  recusado_por UUID,
  recusado_por_email TEXT,
  recusado_em TIMESTAMP WITH TIME ZONE,
  recusa_motivo TEXT,

  cancelado_por UUID,
  cancelado_por_email TEXT,
  cancelado_em TIMESTAMP WITH TIME ZONE,

  lancamento_id UUID,
  lancado_em TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT solicitacoes_status_check CHECK (
    status IN ('pendente','autorizada','lancada','recusada','cancelada')
  ),
  CONSTRAINT solicitacoes_tipo_check CHECK (
    tipo IN ('compra_materiais','compra_patrimonio','pagamento_fornecedor',
             'despesa_operacional','reembolso','investimento','outros')
  ),
  CONSTRAINT solicitacoes_origem_check CHECK (
    origem IN ('central_operacoes','ordem_producao','compra_manual','patrimonio','estoque')
  ),
  CONSTRAINT solicitacoes_valor_check CHECK (valor >= 0)
);

GRANT SELECT ON public.solicitacoes_financeiras TO authenticated;
GRANT ALL ON public.solicitacoes_financeiras TO service_role;

ALTER TABLE public.solicitacoes_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem solicitacoes financeiras"
  ON public.solicitacoes_financeiras
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Idempotência: um item de compra da OP só pode ter uma solicitação viva.
CREATE UNIQUE INDEX solicitacoes_origem_item_unico
  ON public.solicitacoes_financeiras (origem_item_id)
  WHERE origem_item_id IS NOT NULL
    AND status IN ('pendente','autorizada','lancada');

-- Idempotência: um lançamento do Fluxo de Caixa nunca pode ser reutilizado.
CREATE UNIQUE INDEX solicitacoes_lancamento_unico
  ON public.solicitacoes_financeiras (lancamento_id)
  WHERE lancamento_id IS NOT NULL;

CREATE INDEX solicitacoes_status_idx ON public.solicitacoes_financeiras (status);
CREATE INDEX solicitacoes_created_idx ON public.solicitacoes_financeiras (created_at DESC);
CREATE INDEX solicitacoes_pedido_idx ON public.solicitacoes_financeiras (pedido_id);

CREATE TRIGGER solicitacoes_set_updated_at
  BEFORE UPDATE ON public.solicitacoes_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- Timeline / auditoria
-- ------------------------------------------------------------

CREATE TABLE public.solicitacoes_financeiras_eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID NOT NULL
    REFERENCES public.solicitacoes_financeiras(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  detalhe TEXT,
  ator UUID,
  ator_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.solicitacoes_financeiras_eventos TO authenticated;
GRANT ALL ON public.solicitacoes_financeiras_eventos TO service_role;

ALTER TABLE public.solicitacoes_financeiras_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem historico de solicitacoes"
  ON public.solicitacoes_financeiras_eventos
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX solicitacoes_eventos_idx
  ON public.solicitacoes_financeiras_eventos (solicitacao_id, created_at);