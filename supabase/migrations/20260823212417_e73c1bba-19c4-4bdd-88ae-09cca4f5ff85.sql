CREATE TABLE public.contrato_parcelas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id text NOT NULL,
  contrato_cliente text NOT NULL DEFAULT '',
  numero integer NOT NULL,
  total integer NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  vencimento date,
  status text NOT NULL DEFAULT 'a_gerar',
  valor_pago numeric,
  pago_em timestamp with time zone,
  lancamento_id text,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_parcelas TO authenticated;
GRANT ALL ON public.contrato_parcelas TO service_role;

ALTER TABLE public.contrato_parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam parcelas de contrato"
ON public.contrato_parcelas FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX contrato_parcelas_contrato_idx ON public.contrato_parcelas (contrato_id);
CREATE UNIQUE INDEX contrato_parcelas_unica ON public.contrato_parcelas (contrato_id, numero);

CREATE TRIGGER contrato_parcelas_set_updated_at
BEFORE UPDATE ON public.contrato_parcelas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();