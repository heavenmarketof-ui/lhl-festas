# Central de e-mails LHL — implantação

## Objetivo
Adicionar a caixa contato@lhlfestas.com.br ao Admin, com recebimento, envio, respostas, anexos e associação a leads/contratos. **Não alterar a produção antes de validar o provedor e o DNS.**

## Arquitetura
- Frontend: rota protegida /admin.emails, dentro do shell atual, usando autenticação e autorização existentes.
- Persistência: Supabase, com RLS para administradores autorizados; tabelas email_threads, email_messages, email_attachments, email_events e email_idempotency.
- Backend: endpoints autenticados para listar, ler, compor, responder e enviar; nunca expor chave do provedor ao navegador.
- Provedor sugerido: Resend (envio e webhook de recebimento, condicionado à disponibilidade atual do plano e domínio). Cloudflare Email Routing é alternativa para encaminhamento, não uma caixa postal por si só.
- Webhook: validar assinatura no servidor com corpo bruto; deduplicar pelo ID do evento; armazenar metadados e conteúdo; validar limites/tipos de anexos.
- DNS: conferir MX/SPF/DKIM/DMARC existentes antes de qualquer mudança; não substituir MX ativo sem plano de migração.
- E-mails de resposta: preservar Message-ID, In-Reply-To e References para threading.
- Segurança: RLS, verificação de sessão, rate limits, sanitização de HTML, proteção contra XSS e links inseguros, anexos privados com URLs temporárias, logs sem conteúdo sensível.
- Observabilidade: status de envio, falhas e reprocessamento seguro; mensagens recebidas nunca devem depender da abertura do painel.

## Entrega em etapas
1. Validar domínio, DNS, disponibilidade do provedor e acesso às credenciais.
2. Criar migrations, políticas de acesso, armazenamento privado e contratos de API.
3. Implementar recebimento por webhook e envio autenticado; testar em ambiente de homologação.
4. Construir /admin/emails: entrada, não lidos, enviados, rascunhos, detalhes, responder, anexos e busca.
5. Associar mensagens a cliente, lead e contrato, com alertas na operação da Josi.
6. Testar ponta a ponta com endereço externo, incluindo resposta, anexo, spam, falhas e duplicação.
7. Publicar somente após testes e confirmação de configuração DNS.

## Critérios de aceite
- contato@lhlfestas.com.br recebe e envia mensagens com autenticação do domínio válida.
- Usuários não autorizados não podem ler ou enviar e-mails.
- E-mails não se perdem ao atualizar a página; não há duplicação por webhook repetido.
- Responder mantém o histórico; anexos não ficam publicamente acessíveis.
- O ERP atual continua funcionando sem regressões.

## Dependências externas
A configuração DNS e as chaves de API exigem acesso administrativo às contas Cloudflare/Resend e devem ser fornecidas por meio de secrets do ambiente, nunca commitadas no GitHub.
