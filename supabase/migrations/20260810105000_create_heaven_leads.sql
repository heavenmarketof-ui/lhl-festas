-- Tabela de leads exclusivos da Plataforma Heaven Festas
CREATE TABLE public.heaven_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Dados do Interessado
    nome TEXT NOT NULL,
    empresa TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    email TEXT NOT NULL,
    cidade TEXT,
    estado TEXT,
    instagram TEXT,
    
    -- Dados do Negócio / Diagnóstico
    organizacao_hoje TEXT, -- Como organiza hoje (Caderno, Planilha, etc)
    atuacao TEXT[], -- Array de strings (Peg & Monte, Decoração, etc)
    dificuldade TEXT, -- Qual a maior dificuldade
    
    -- Metadados comerciais
    origem TEXT NOT NULL DEFAULT 'Landing Page Heaven',
    status TEXT NOT NULL DEFAULT 'Novo', -- Novo, Contatado, Demonstração agendada, Em teste, Convertido, Perdido
    
    -- Gestão
    observacoes TEXT,
    data_ultimo_contato TIMESTAMPTZ,
    data_proximo_acompanhamento TIMESTAMPTZ,
    
    -- Controle de notificações
    notificacao_email_status TEXT DEFAULT 'pendente', -- pendente, enviado, falhou
    notificacao_email_erro TEXT
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.heaven_leads TO authenticated;
GRANT ALL ON public.heaven_leads TO service_role;
GRANT INSERT ON public.heaven_leads TO anon;

-- RLS
ALTER TABLE public.heaven_leads ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Qualquer pessoa pode enviar um lead" ON public.heaven_leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Administradores podem ler leads da Heaven" ON public.heaven_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Administradores podem atualizar leads da Heaven" ON public.heaven_leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Administradores podem excluir leads da Heaven" ON public.heaven_leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.heaven_leads
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
