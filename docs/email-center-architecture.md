# Central de e-mails LHL — preparação técnica

## Estado confirmado
- Endereço planejado: contato@lhlfestas.com.br.
- Worker independente Cloudflare: lhl-email-receiver (HTTP ativo; handler email ainda rejeita mensagens).
- Planilha oficial: LHL - Contratos, Google Sheets ID 1SxoV1mRXKhruP1BgSt0ak_P-IIdBXgHlGVaTeupvd_k.
- Abas relevantes: Contratos, LEADS, ORDENS_PRODUCAO e FluxoCaixa.
- O ERP usa src/lib/sheets-gateway.ts, que chama funções servidoras com autenticação Supabase; não expor credenciais da planilha ao cliente.

## Modelo de vinculação somente leitura
- Contratos: id, nomeCompleto, email, telefone, dataEvento.
- LEADS: id, nome, whatsappNormalizado, status, leadStage.
- Vincular remetente por e-mail normalizado a Contratos.email; não vincular automaticamente por nome.
- Quando não houver correspondência, manter mensagem não vinculada e permitir associação manual por admin.
- Nunca escrever automaticamente em Contratos, LEADS ou FluxoCaixa ao receber e-mails.

## Armazenamento isolado (proposto)
- mail_messages: id, message_id (único), thread_id, direction, from_address, to_addresses, subject, text_body, html_body_sanitized, received_at, sent_at, delivery_status, linked_contract_id, linked_lead_id.
- mail_attachments: id, message_id, storage_key, filename, content_type, size_bytes.
- mail_threads: id, subject, last_message_at, status, assigned_to.
- Armazenar conteúdo e anexos em serviço privado com autenticação de administrador, limites de tamanho, retenção e backup. Não usar Google Sheets como repositório de mensagens.
- Acesso pelo servidor, nunca por token de serviço no navegador.

## Recebimento
1. Provisionar banco e armazenamento privados e verificar acesso do backend.
2. Configurar segredos no Worker (sem incluir em Git).
3. Implementar handler email com parsing MIME robusto, limites, tratamento de anexos e idempotência por Message-ID; confirmar persistência antes de aceitar.
4. Testar entrada, duplicação, falha de banco, anexos e conteúdo HTML.
5. Só então ativar Email Routing de contato@lhlfestas.com.br para lhl-email-receiver.

## Envio
- Email Routing da Cloudflare é serviço de recebimento/encaminhamento, não uma caixa SMTP de envio.
- Escolher e configurar provedor transacional de saída com domínio verificado (SPF/DKIM/DMARC), guardar chave somente no backend.
- Registrar envios, erros, respostas e IDs do provedor; não declarar mensagem enviada sem confirmação.

## Segurança e implantação
- Admin protegido por useAdminSession/isAdmin em src/routes/admin.tsx.
- Não usar o Worker do site lhl-festas para recebimento de e-mails.
- Implementar nova rota /admin/emails e entrada no menu após endpoints autenticados estarem prontos.
- Preparar e testar em branch; não publicar em produção sem validação do armazenamento e envio.
