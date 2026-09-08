# Sistema Oficial LHL Festas

Este repositório é o projeto independente e oficial da LHL Festas.

## Regra de separação

Este projeto **não é sincronizado com o Lovable** e não deve ser enviado para o projeto antigo.

- `heavenmarketof-ui/lhl-festas` → desenvolvimento oficial independente.
- `heavenmarketof-ui/lhl-festas-abf33ac5` → sistema antigo / referência de leitura enquanto a migração não termina.

O sistema antigo continua operando normalmente até que este projeto esteja totalmente validado e pronto para assumir o domínio oficial.

## Arquitetura atual

- React 19
- TanStack Start / Router
- Vite 7
- Node.js 22
- Tailwind CSS
- Google Sheets + Apps Script para dados operacionais já existentes
- Supabase para recursos que ainda dependem da integração atual
- Cloudflare preparado como destino de hospedagem independente

## Áreas públicas

- Home
- Catálogo
- Festa na Mesa
- Peg & Monte
- Tema Personalizado
- Orçamento
- Reserva e páginas de confirmação ainda mantidas durante a migração

Domínio oficial planejado:

`https://www.lhlfestas.com.br`

## Admin

A estrutura administrativa nova está organizada em:

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

### Regra operacional central

Pré-contrato sem recebimento confirmado não libera operação.

Um recebimento real de contrato libera Agenda, Operação, Produção e Compras. Caução é garantia e **não** conta como receita nem como pagamento do serviço.

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

O workflow `.github/workflows/validate.yml` executa o build automaticamente no GitHub quando há alterações nas branches de desenvolvimento e em pull requests.

A intenção é detectar problemas de compilação sem depender do Lovable ou de uma publicação externa.

## Variáveis e segredos

Segredos nunca devem ser versionados.

Arquivos locais como `.env`, `.env.local` e variantes permanecem fora do Git através do `.gitignore`.

Variáveis atualmente usadas pelo projeto incluem, conforme o ambiente:

- `GAS_SHARED_TOKEN`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Nunca coloque os valores reais dessas variáveis no README, em commits ou em arquivos versionados.

## Diretriz de migração

Enquanto a migração estiver em andamento:

1. desenvolver e testar somente neste repositório;
2. usar o sistema antigo apenas como referência e operação atual;
3. preservar compatibilidade com os dados existentes;
4. validar fluxo comercial, financeiro e operacional antes do corte;
5. somente depois conectar `www.lhlfestas.com.br` ao novo sistema.
