// ============================================================================
// GESTÃO — RELATÓRIO A4 (layout exclusivo de impressão, não é screenshot).
// 100% apresentação: recebe o MESMO dataset já calculado na tela.
// ============================================================================
import { A4_W, A4_H } from "@/lib/gestao/pdf";
import { fmtBRL } from "@/lib/financeiro-api";
import type { GestaoData, ModalidadeResumo, Serie } from "@/lib/gestao/aggregate";
import {
  BarrasCard, DonutCard, LinhaCard, RankCard, TabelaRank, Vazio,
  fmtNum, fmtPerc,
} from "./charts";
import logo from "@/assets/lhl-logo.png";

const MODALIDADES_FIXAS = ["Festa na Mesa", "Peg & Monte", "Festa com Montagem"];

function Kpis({ data }: { data: GestaoData }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {data.kpis.map((k) => (
        <div key={k.label} className="rounded-lg border border-[#eadfd9] bg-white p-2.5 shadow-sm">
          <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-[#8a6f68]">{k.label}</p>
          <p className="text-[14px] font-bold text-[#4b3832]">
            {k.formato === "moeda" ? fmtBRL(k.valor) : fmtNum(k.valor)}
          </p>
          {k.variacao != null && (
            <p className="text-[9px] text-neutral-500">
              {k.variacao >= 0 ? "▲" : "▼"} {fmtPerc(Math.abs(k.variacao))} vs. anterior
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function MiniKpis({ m, ticketGeral }: { m: ModalidadeResumo; ticketGeral?: number }) {
  const itens: [string, string][] = [
    ["Pedidos", fmtNum(m.pedidos)],
    ["Faturamento", fmtBRL(m.faturamento)],
    ["Ticket médio", fmtBRL(m.ticket)],
    ["Clientes", fmtNum(m.clientes)],
    ["% dos pedidos", fmtPerc(m.percPedidos)],
    ["% do faturamento", fmtPerc(m.percFaturamento)],
  ];
  if (ticketGeral != null) itens.push(["Ticket geral (comparação)", fmtBRL(ticketGeral)]);
  return (
    <div className="grid grid-cols-4 gap-2">
      {itens.map(([l, v]) => (
        <div key={l} className="rounded-lg border border-[#eadfd9] bg-white p-2.5 shadow-sm">
          <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-[#8a6f68]">{l}</p>
          <p className="text-[13px] font-semibold text-[#4b3832]">{v}</p>
        </div>
      ))}
    </div>
  );
}

export function GestaoPdfReport({ data }: { data: GestaoData }) {
  const d = data;
  const geradoEm = new Date(d.geradoEm || Date.now()).toLocaleString("pt-BR");

  const carteira: Serie[] = d.carteiraFutura.map((c) => ({
    label: c.mes, Vendido: c.vendido, Recebido: c.recebido, "A receber": c.aReceber,
  }));
  const carteiraPedidos: Serie[] = d.carteiraFutura.map((c) => ({ label: c.mes, Pedidos: c.pedidos }));

  const modalidadesOrdenadas = [
    ...MODALIDADES_FIXAS
      .map((n) => d.modalidades.find((m) => m.nome === n))
      .filter(Boolean) as ModalidadeResumo[],
    ...d.modalidades.filter((m) => !MODALIDADES_FIXAS.includes(m.nome)),
  ];

  const secoes: { titulo: string; body: React.ReactNode }[] = [
    {
      titulo: "1. Resumo Executivo",
      body: (
        <>
          <Kpis data={d} />
          <LinhaCard titulo="Evolução do faturamento (Faturado × Recebido)" data={d.evolucao}
            series={[{ key: "Faturado" }, { key: "Recebido" }]} altura={200} />
          <BarrasCard titulo="Faturamento entregue por modalidade" formato="moeda" altura={190}
            data={d.modalidades.map((m) => ({ label: m.nome, Faturamento: m.faturamento }))}
            series={[{ key: "Faturamento" }]} />
        </>
      ),
    },
    {
      titulo: "2. Vendas",
      body: (
        <>
          <LinhaCard titulo="Evolução dos pedidos" formato="numero" data={d.evolucao}
            series={[{ key: "Pedidos" }]} altura={195} />
          <LinhaCard titulo="Evolução do ticket médio" data={d.evolucao}
            series={[{ key: "Ticket", nome: "Ticket médio" }]} altura={195} />
          <BarrasCard titulo="Kits mais vendidos" formato="numero" altura={200}
            data={d.kitsQtd.map((k) => ({ label: k.nome, Pedidos: k.qtd ?? 0 }))}
            series={[{ key: "Pedidos" }]} />
        </>
      ),
    },
    {
      titulo: "2. Vendas — Kits e Temas",
      body: (
        <>
          <RankCard titulo="Faturamento por kit" itens={d.kitsValor} altura={230} />
          <RankCard titulo="Temas mais contratados" itens={d.temasQtd} campo="qtd" altura={230} />
          <RankCard titulo="Faturamento entregue por tema" itens={d.temasValor} altura={230} />
        </>
      ),
    },
    {
      titulo: "3. Modalidades",
      body: (
        <>
          <BarrasCard titulo="Pedidos por modalidade" formato="numero" altura={185}
            data={d.modalidades.map((m) => ({ label: m.nome, Pedidos: m.pedidos }))}
            series={[{ key: "Pedidos" }]} />
          <BarrasCard titulo="Ticket médio por modalidade" altura={185}
            data={d.modalidades.map((m) => ({ label: m.nome, Ticket: m.ticket }))}
            series={[{ key: "Ticket", nome: "Ticket médio" }]} />
          <DonutCard titulo="Participação do faturamento por modalidade" itens={d.participacao} altura={230} />
        </>
      ),
    },
    ...modalidadesOrdenadas.map((m, i) => ({
      titulo: `${4 + i}. ${m.nome}`,
      body: (
        <>
          <MiniKpis m={m} ticketGeral={m.nome === "Festa com Montagem" ? d.resumo.ticket : undefined} />
          <LinhaCard titulo="Evolução dos pedidos e faturamento" data={m.evolucao}
            series={[{ key: "Faturamento" }, { key: "Ticket", nome: "Ticket médio" }]} altura={190} />
          <RankCard titulo="Kits mais vendidos" itens={m.kits} campo="qtd" altura={190} />
        </>
      ),
    })),
    {
      titulo: `${4 + modalidadesOrdenadas.length}. Clientes`,
      body: (
        <>
          <div className="grid grid-cols-4 gap-2">
            {([
              ["Clientes únicos", fmtNum(d.clientes.unicos)],
              ["Novos clientes", fmtNum(d.clientes.novos)],
              ["Recorrentes", fmtNum(d.clientes.recorrentes)],
              ["Taxa de recorrência", d.clientes.taxaRecorrencia == null ? "Dados insuficientes" : fmtPerc(d.clientes.taxaRecorrencia)],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} className="rounded-lg border border-[#eadfd9] bg-white p-2.5 shadow-sm">
                <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-[#8a6f68]">{l}</p>
                <p className="text-[13px] font-semibold text-[#4b3832]">{v}</p>
              </div>
            ))}
          </div>
          <BarrasCard titulo="Novos × Recorrentes" formato="numero" altura={185}
            data={d.clientes.evolucao} series={[{ key: "Novos" }, { key: "Recorrentes" }]} />
          <TabelaRank titulo="Clientes com maior faturamento" itens={d.clientes.topPorFaturamento} />
        </>
      ),
    },
    {
      titulo: `${5 + modalidadesOrdenadas.length}. Financeiro`,
      body: (
        <>
          <div className="grid grid-cols-4 gap-2">
            {([
              ["Faturamento entregue", fmtBRL(d.resumo.faturamento)],
              ["Recebido", fmtBRL(d.resumo.recebido)],
              ["A receber no período", fmtBRL(d.resumo.aReceber)],
              ["Saldo total clientes", fmtBRL(d.resumo.saldoTotalClientes)],
              ["Saídas", fmtBRL(d.resumo.saidas)],
              ["Resultado de caixa", fmtBRL(d.resumo.resultadoCaixa)],
              ["Lucro estimado apurado", fmtBRL(d.financeiro.lucroEstimado)],
              ["Margem estimada apurada", fmtPerc(d.financeiro.margemLucroPercentual)],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} className="rounded-lg border border-[#eadfd9] bg-white p-2.5 shadow-sm">
                <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-[#8a6f68]">{l}</p>
                <p className="text-[13px] font-semibold text-[#4b3832]">{v}</p>
              </div>
            ))}
          </div>
          <BarrasCard titulo="Entradas × Saídas" data={d.entradasSaidas}
            series={[{ key: "Entradas" }, { key: "Saídas" }]} altura={185} />
          <LinhaCard titulo="Evolução do resultado de caixa" data={d.financeiro.resultadoEvolucao}
            series={[{ key: "Resultado" }]} altura={185} />
          <DonutCard titulo="Composição das saídas por categoria" itens={d.financeiro.saidasPorCategoria} altura={210} />
        </>
      ),
    },
    {
      titulo: `${6 + modalidadesOrdenadas.length}. Compras e Lucro`,
      body: (
        <>
          {d.financeiro.comprasDisponivel ? (
            <BarrasCard titulo="Compras: previsto × real" altura={190}
              data={[{ label: d.periodo.label, Previsto: d.financeiro.comprasPrevisto, Real: d.financeiro.comprasReal }]}
              series={[{ key: "Previsto" }, { key: "Real" }]} />
          ) : <Vazio />}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg border border-[#eadfd9] bg-white p-2.5 shadow-sm">
              <p className="text-[9px] uppercase text-neutral-500">Economia / Estouro</p>
              <p className="text-[12px] font-semibold">{d.financeiro.comprasDisponivel ? fmtBRL(d.financeiro.economia) : "Dados insuficientes"}</p>
            </div>
            <div className="rounded-lg border border-[#eadfd9] bg-white p-2.5 shadow-sm">
              <p className="text-[9px] uppercase text-neutral-500">Compras vinculadas</p>
              <p className="text-[12px] font-semibold">{fmtBRL(d.financeiro.custosDiretos)}</p>
            </div>
            <div className="rounded-lg border border-[#eadfd9] bg-white p-2.5 shadow-sm">
              <p className="text-[9px] uppercase text-neutral-500">Lucro estimado</p>
              <p className="text-[12px] font-semibold">{fmtBRL(d.financeiro.lucroEstimado)}</p>
            </div>
            <div className="rounded-lg border border-[#eadfd9] bg-white p-2.5 shadow-sm">
              <p className="text-[9px] uppercase text-neutral-500">Margem estimada</p>
              <p className="text-[12px] font-semibold">{fmtPerc(d.financeiro.margemLucroPercentual)}</p>
            </div>
          </div>
          <div className="rounded-lg border border-[#eadfd9] bg-white p-2.5 shadow-sm">
            <p className="mb-1 text-[9px] uppercase text-neutral-500">Lucro por venda — apuração dos contratos</p>
            <div className="space-y-1">
              {d.financeiro.lucroPorVenda.slice(0, 6).map((v) => (
                <div key={v.contratoId} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-neutral-200 py-1 text-[9px] last:border-0">
                  <span className="truncate">{v.cliente} · {v.tema}</span>
                  <span>Venda {fmtBRL(v.valorVendido)}</span>
                  <span>Compras {fmtBRL(v.compras)}</span>
                  <strong>{v.apurado ? `Lucro ${fmtBRL(v.lucroEstimado)}` : "Ainda não apurado"}</strong>
                </div>
              ))}
            </div>
          </div>
          <BarrasCard titulo="Recebido × A receber" data={d.recebidoAReceber}
            series={[{ key: "Recebido" }, { key: "A receber" }]} altura={200} />
        </>
      ),
    },
    {
      titulo: `${7 + modalidadesOrdenadas.length}. Carteira Futura`,
      body: (
        <>
          <BarrasCard titulo="Carteira futura — vendido × recebido × a receber" data={carteira}
            series={[{ key: "Vendido" }, { key: "Recebido" }, { key: "A receber" }]} altura={220} />
          <BarrasCard titulo="Pedidos por mês do evento" formato="numero" data={carteiraPedidos}
            series={[{ key: "Pedidos" }]} altura={200} />
        </>
      ),
    },
    {
      titulo: `${8 + modalidadesOrdenadas.length}. Operação`,
      body: (
        <>
          <div className="grid grid-cols-5 gap-2">
            {([
              ["Compras realizadas", fmtNum(d.operacao.comprasRealizadas)],
              ["Valor em compras", fmtBRL(d.operacao.valorCompras)],
              ["Itens produzidos", fmtNum(d.operacao.itensProduzidos)],
              ["Kits concluídos", fmtNum(d.operacao.kitsProntos)],
              ["Eventos realizados", fmtNum(d.operacao.eventosRealizados)],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} className="rounded-lg border border-[#eadfd9] bg-white p-2.5 shadow-sm">
                <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-[#8a6f68]">{l}</p>
                <p className="text-[13px] font-semibold text-[#4b3832]">{v}</p>
              </div>
            ))}
          </div>
          <RankCard titulo="Itens mais comprados" itens={d.operacao.itensMaisComprados} campo="qtd" altura={200} />
          <RankCard titulo="Materiais com maior gasto" itens={d.operacao.gastoPorMaterial} altura={200} />
        </>
      ),
    },
    {
      titulo: `${9 + modalidadesOrdenadas.length}. Sazonalidade`,
      body: (
        <>
          <BarrasCard titulo="Festas e faturamento por mês" data={d.sazonalidade.porMes}
            series={[{ key: "Faturamento" }]} altura={185} />
          <BarrasCard titulo="Festas por dia da semana" formato="numero" data={d.sazonalidade.porDiaSemana}
            series={[{ key: "Festas" }]} altura={185} />
          <RankCard titulo="Antecedência das reservas" itens={d.sazonalidade.distribuicaoAntecedencia} campo="qtd" altura={185} />
        </>
      ),
    },
    {
      titulo: `${10 + modalidadesOrdenadas.length}. Destaques do Período`,
      body: (
        <>
          <div className="space-y-1.5">
            {d.destaques.length ? d.destaques.map((x) => (
              <div key={x.titulo} className="flex justify-between rounded-md border border-neutral-300 p-2 text-[11px]">
                <span className="text-neutral-600">{x.titulo}</span>
                <span className="font-semibold text-neutral-900">{x.valor}</span>
              </div>
            )) : <Vazio />}
          </div>
          <div className="rounded-md border border-neutral-300 p-2 text-[11px] text-neutral-600">
            <p><strong>Antecedência média:</strong> {d.sazonalidade.antecedenciaMedia == null ? "Dados insuficientes" : `${d.sazonalidade.antecedenciaMedia} dias`}</p>
            <p><strong>Reservas de última hora:</strong> {d.sazonalidade.ultimaHora.map((u) => `${u.faixa}: ${u.qtd}`).join(" · ") || "Dados insuficientes"}</p>
            <p><strong>Cancelamentos:</strong> {d.sazonalidade.cancelamentos.disponivel
              ? `${d.sazonalidade.cancelamentos.qtd} (${fmtPerc(d.sazonalidade.cancelamentos.taxa)}) — ${fmtBRL(d.sazonalidade.cancelamentos.valor)}`
              : "Dados insuficientes"}</p>
          </div>
        </>
      ),
    },
  ];

  const total = secoes.length + 1;

  return (
    <div style={{ width: A4_W, background: "#fffaf7", color: "#3f312d" }}>
      {/* Capa */}
      <div
        className="a4-page flex flex-col items-center justify-center text-center"
        style={{ width: A4_W, height: A4_H, padding: 64, background: "linear-gradient(160deg,#fffaf7 0%,#f8eee9 100%)" }}
      >
        <div className="mb-8 h-1 w-24 rounded-full bg-[#c9a35c]" />
        <img src={logo} alt="LHL Festas" style={{ width: 190 }} />
        <h1 className="mt-5 text-[30px] font-bold tracking-[0.08em] text-[#4b3832]">LHL FESTAS</h1>
        <p className="mt-2 text-[14px] font-medium uppercase tracking-[0.34em] text-[#a26f79]">Relatório de Gestão</p>
        <div className="mt-10 w-[360px] rounded-2xl border border-[#dfcfc7] bg-white/90 px-10 py-6 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9b7d74]">Período analisado</p>
          <p className="mt-1 text-[22px] font-bold text-[#4b3832]">{d.periodo.label}</p>
          <p className="mt-2 text-[11px] text-[#8a746d]">{d.periodo.inicio.split("-").reverse().join("/")} a {d.periodo.fim.split("-").reverse().join("/")}</p>
        </div>
        <p className="mt-8 text-[10px] uppercase tracking-[0.12em] text-[#9b8178]">Inteligência financeira e operacional</p>
        <p className="mt-2 text-[10px] text-[#a18d86]">Gerado em {geradoEm}</p>
      </div>

      {secoes.map((s, i) => (
        <div
          key={s.titulo + i}
          className="a4-page flex flex-col"
          style={{ width: A4_W, height: A4_H, padding: 34, background: "#fffaf7" }}
        >
          <div className="mb-4 flex items-center justify-between border-b border-[#e3d5ce] pb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#76564e]">LHL Festas — Gestão</span>
            <span className="text-[10px] font-medium text-[#9b8178]">{d.periodo.label}</span>
          </div>
          <div className="mb-3 border-l-4 border-[#b77984] pl-3"><h2 className="text-[18px] font-bold tracking-tight text-[#4b3832]">{s.titulo}</h2></div>
          <div className="flex-1 space-y-3 overflow-hidden">{s.body}</div>
          <div className="mt-2 flex items-center justify-between border-t border-[#e3d5ce] pt-2 text-[9px] text-[#9b8178]">
            <span>Período: {d.periodo.label}</span>
            <span>Página {i + 2} de {total}</span>
            <span>Gerado em {geradoEm}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
