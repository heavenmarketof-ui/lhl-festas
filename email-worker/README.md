# Instalação do receptor de e-mails LHL

1. Cloudflare > Workers & Pages > D1 > criar banco **lhl-mail**.
2. Executar `schema.sql` no console D1.
3. Worker `lhl-email-receiver` > Settings > Bindings > D1: variável `MAIL_DB`, banco `lhl-mail`.
4. Implantar `worker.js` no Worker já criado.
5. Criar secret `MAIL_ADMIN_TOKEN` aleatório e forte (não expor ao navegador).
6. Testar `/health` e verificar `ready:true`. Testar persistência com e-mail controlado somente após schema e binding.
7. Só após confirmação, criar regra Cloudflare Email Routing: contato@lhlfestas.com.br -> Worker.
8. Endpoint `/internal/messages` é exclusivo para backend autenticado; **não** usar o token no front-end.
9. O corpo MIME bruto fica privado no D1, incluindo anexos embutidos. Para anexos maiores, planejar R2 e parsing MIME antes de uso amplo.
10. Para enviar/responder, integrar provedor de envio autenticado separadamente. Email Routing não fornece SMTP de saída.

**Segurança:** manter regra de rejeição atual enquanto banco e testes não estiverem prontos. Não compartilhar token em prints, repositório ou chat.
