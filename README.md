# Sistema Oficial LHL Festas

Este repositório é o projeto oficial e independente da LHL Festas.

## Arquitetura atual

- React 19
- TanStack Start / Router
- Vite 7
- Node.js 22
- Tailwind CSS
- Google Sheets + Apps Script para dados operacionais
- Supabase para autenticação e recursos ainda mantidos nessa base
- Cloudflare como hospedagem de produção
- Catálogo público armazenado no próprio repositório em `src/data/catalogo-oficial.json`

## Áreas públicas

- Home
- Catálogo
- Festa na Mesa
- Peg & Monte
- Decoração com Montagem
- Tema Personalizado
- Loja de Personalizados
- Orçamento
- Reserva e páginas de confirmação

Domínio oficial:

`https://www.lhlfestas.com.br`

## Admin

A estrutura administrativa está organizada em:

- Hoje
- CRM / Leads
- Clientes
- Festas
- Agenda
- Operação
- Produção
- Financeiro
- Gestão
- Patrimônio
- Solicitações
- Auditoria

## Desenvolvimento

Requisito: Node.js 22.

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Build de produção:

```sh
npm run build
```

## Validação automática

O workflow `.github/workflows/validate.yml` valida alterações de desenvolvimento e pull requests.

O workflow `.github/workflows/deploy-cloudflare.yml` executa testes, build e publicação da branch `main` no Cloudflare.

## Variáveis e segredos

Segredos nunca devem ser versionados.

Arquivos locais como `.env`, `.env.local` e variantes permanecem fora do Git através do `.gitignore`.

As variáveis usadas pelo projeto são documentadas em `.env.example`.

## Fonte oficial

A branch `main` deste repositório é a fonte oficial de produção. Alterações devem ser desenvolvidas, validadas e publicadas a partir deste projeto.
