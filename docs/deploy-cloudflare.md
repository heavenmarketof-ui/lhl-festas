# Deploy oficial — LHL Festas

## Estado atual

O domínio `lhlfestas.com.br` já foi registrado, mas **não deve ser apontado para este projeto enquanto a migração estiver em desenvolvimento**.

O repositório oficial é `heavenmarketof-ui/lhl-festas`. O projeto antigo `heavenmarketof-ui/lhl-festas-abf33ac5` continua separado e não recebe alterações deste projeto.

## Arquitetura prevista

- Aplicação: TanStack Start + React + Vite.
- Runtime: Cloudflare Workers através do `@cloudflare/vite-plugin`.
- Configuração: `wrangler.jsonc`.
- Domínio final: `https://www.lhlfestas.com.br`.
- Backend operacional atual: Google Sheets / Apps Script, com Supabase mantido onde ainda é necessário.

## Antes do primeiro deploy

1. Confirmar que `npm ci` e `npm run build` passam no GitHub Actions.
2. Configurar no ambiente Cloudflare as variáveis privadas necessárias, sem colocá-las no Git.
3. Validar Home, Catálogo, Orçamento, Consultor, autenticação e Admin em uma URL temporária do Cloudflare.
4. Conferir leitura e escrita de dados em ambiente controlado.
5. Somente depois da aprovação final configurar o DNS do Registro.br/Cloudflare.

## Variáveis

A lista de nomes esperados está em `.env.example`. Valores reais nunca devem ser versionados.

## Regra do domínio

Metadados e URLs canônicas já podem usar `www.lhlfestas.com.br`. Isso **não publica o site nem altera DNS**. O domínio só passa a servir o novo sistema quando a configuração DNS for feita deliberadamente no encerramento da migração.
