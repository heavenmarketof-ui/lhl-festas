# Migração das regras de negócio — Sistema LHL

Este documento é a referência de migração das regras amadurecidas no sistema atual para o novo site/admin oficial da LHL Festas.

## Regra de ouro

O novo sistema não deve copiar apenas a aparência do sistema atual. Deve preservar as regras de negócio de pagamento, autorização, compra, operação, agenda, histórico e indicadores.

## Já presentes no novo projeto e mantidos como regra obrigatória

- Gestão separa Pedidos, Vendas, Faturamento, Recebido e Saídas.
- Vendas usam data de fechamento; faturamento usa data do evento/entrega.
- Ticket médio = valor vendido / quantidade de vendas.
- Caução fica fora de faturamento/receita.
- Comparação do período atual usa intervalo equivalente do período anterior.
- Saldo total de clientes aparece somente na visão anual.
- Fluxo de compra possui estados distintos: Aguardando orçamento → Orçamento recebido → Aguardando autorização → Compra autorizada → Compra realizada → Pago.
- Compra realizada não implica lançamento automático no Fluxo de Caixa.
- Registro de compra pergunta se o usuário deseja lançar no Fluxo de Caixa.
- Pagamento/saída financeira é uma etapa separada da confirmação operacional da compra.
- IDs/origens devem ser estáveis para evitar duplicidades.

## Migração obrigatória — validar/implementar

### Operação e sinal

- Pré-contrato não libera operação.
- Contrato sem recebimento real confirmado não libera compras, produção, itens de compra ou Central de Operações.
- Fluxo soberano: Contrato → recebimento confirmado → operação liberada.
- A mesma regra deve controlar sincronização para Google Calendar.

### Central de Solicitações

- Exibir sempre cliente + tema + data da festa.
- Busca deve localizar também pelo tema.
- Revogar autorização e Remover item são ações diferentes.
- Revogar remove somente a autorização; o item permanece no planejamento.
- Remover item deve refletir contrato → solicitação → operação, preservando histórico/tombstone para impedir recriação em sincronizações.
- Item já comprado/pago não pode ser removido de forma destrutiva.
- Compra registrada sai da fila ativa, mas permanece no histórico.
- Registrar compra deve ser possível diretamente pela Central.

### Financeiro

- Nenhum lançamento financeiro silencioso.
- Ao escolher lançar uma compra no caixa: primeiro criar/confirmar saída; depois marcar solicitação como paga/lançada; só então retirar da fila financeira.
- Em falha financeira, o item permanece disponível para correção.
- Evitar falso timeout: demora deve mostrar estado de processamento, não erro automático.
- Proteção contra duplicidade de lançamentos/pagamentos.

### Boletos

- Cada parcela deve possuir ID estável e válido.
- Permitir cancelar somente boletos/parcelas pendentes.
- Pagamentos já realizados nunca são apagados ao cancelar boletos.
- Pagamento de boleto exige confirmação antes de gerar recebimento financeiro.

### Central de Operações

- Deve ser a principal tela operacional da Josi.
- Prioridade principal por data da festa; urgência como segundo critério.
- Concentrar festas próximas, compras, pendências, produção, preparação, calendário e situação do kit.
- Identificar kit pronto quando não houver compras/produção pendentes.

### Agenda interna compartilhada

- Eventos internos não podem depender de localStorage.
- Armazenamento deve ser central e compartilhado entre aparelhos.
- Tipos: Somente compromisso; Bloquear novas festas com montagem; Bloqueio total.
- Campos: título, data, observações, tipo de bloqueio.
- Não adicionar legenda extra poluindo o calendário; o tipo fica associado ao evento.

### Google Calendar

- Sincronização é somente Sistema LHL → Google Calendar.
- Alterações feitas diretamente no Google não modificam o Sistema LHL.
- Destinos: calendário do Vitor e calendário da Josi.
- Sem Google Meet e sem convidados automáticos.
- Evento comercial só é enviado quando o contrato estiver realmente liberado por recebimento confirmado.
- Usar identificador estável LHL_CONTRATO_ID para evitar duplicidade.
- Sincronização incremental em janela futura (aprox. 90 dias), com limite por rodada.

### Site público / marketing

- Consultor permanece módulo independente, principalmente Home e Orçamento.
- CTA principal do Consultor direciona ao WhatsApp e preserva origem `consultor-festas-lhl`.
- Preservar UTMs, gclid, fbclid, GTM/dataLayer, Meta Pixel, SEO e performance.
- Valores dos kits nunca são exibidos automaticamente.
- Valor final do contrato continua sendo preenchido manualmente após negociação.

## Ordem de implementação no novo projeto

1. Soberania do sinal e bloqueio operacional.
2. Solicitações: tema/data, revogar/remover, histórico e registro de compra.
3. Financeiro: confirmação, ordem transacional e idempotência.
4. Boletos.
5. Central de Operações.
6. Agenda compartilhada.
7. Google Calendar unidirecional.
8. Auditoria final de Gestão.
9. Site público, Consultor e telemetria.

Estas regras devem ser consideradas requisitos de aceite antes da publicação do domínio oficial.