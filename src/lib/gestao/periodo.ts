// ============================================================================
// GESTÃO — CAMADA 100% READ-ONLY
// Helpers de período: construção, rótulos, navegação e granularidade.
// Nenhuma função deste arquivo escreve dados.
// ============================================================================

export type PeriodoTipo = "mensal" | "trimestral" | "semestral" | "anual" | "personalizado";

export type Periodo = {
  tipo: PeriodoTipo;
  /** ISO yyyy-mm-dd inclusive */
  inicio: string;
  /** ISO yyyy-mm-dd inclusive */
  fim: string;
  label: string;
  /** Sufixo amigável para nome de arquivo */
  slug: string;
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate();

export type PeriodoCursor = {
  tipo: PeriodoTipo;
  ano: number;
  /** 1-12 (mensal) */
  mes: number;
  /** 1-4 */
  trimestre: number;
  /** 1-2 */
  semestre: number;
  /** personalizado */
  inicio: string;
  fim: string;
};

export function cursorAtual(hoje = new Date()): PeriodoCursor {
  const y = hoje.getFullYear();
  const m = hoje.getMonth() + 1;
  return {
    tipo: "mensal",
    ano: y,
    mes: m,
    trimestre: Math.ceil(m / 3),
    semestre: m <= 6 ? 1 : 2,
    inicio: iso(y, m, 1),
    fim: iso(y, m, lastDay(y, m)),
  };
}

export function buildPeriodo(c: PeriodoCursor): Periodo {
  switch (c.tipo) {
    case "mensal": {
      const inicio = iso(c.ano, c.mes, 1);
      const fim = iso(c.ano, c.mes, lastDay(c.ano, c.mes));
      return {
        tipo: c.tipo, inicio, fim,
        label: `${MESES[c.mes - 1]} de ${c.ano}`,
        slug: `${MESES[c.mes - 1]}-${c.ano}`,
      };
    }
    case "trimestral": {
      const m0 = (c.trimestre - 1) * 3 + 1;
      const m1 = m0 + 2;
      return {
        tipo: c.tipo,
        inicio: iso(c.ano, m0, 1),
        fim: iso(c.ano, m1, lastDay(c.ano, m1)),
        label: `${c.trimestre}º Trimestre de ${c.ano}`,
        slug: `${c.trimestre}-Trimestre-${c.ano}`,
      };
    }
    case "semestral": {
      const m0 = c.semestre === 1 ? 1 : 7;
      const m1 = m0 + 5;
      return {
        tipo: c.tipo,
        inicio: iso(c.ano, m0, 1),
        fim: iso(c.ano, m1, lastDay(c.ano, m1)),
        label: `${c.semestre}º Semestre de ${c.ano}`,
        slug: `${c.semestre}-Semestre-${c.ano}`,
      };
    }
    case "anual":
      return {
        tipo: c.tipo,
        inicio: iso(c.ano, 1, 1),
        fim: iso(c.ano, 12, 31),
        label: `Ano ${c.ano}`,
        slug: `${c.ano}`,
      };
    default: {
      const inicio = c.inicio || iso(c.ano, 1, 1);
      const fim = c.fim || iso(c.ano, 12, 31);
      const br = (s: string) => s.split("-").reverse().join("/");
      return {
        tipo: "personalizado", inicio, fim,
        label: `${br(inicio)} a ${br(fim)}`,
        slug: `${inicio.split("-").reverse().join("-")}-a-${fim.split("-").reverse().join("-")}`,
      };
    }
  }
}

/** Move o cursor n passos (−1 anterior, +1 próximo) respeitando o tipo. */
export function moveCursor(c: PeriodoCursor, step: number): PeriodoCursor {
  const n = { ...c };
  if (c.tipo === "mensal") {
    const total = (c.ano * 12 + (c.mes - 1)) + step;
    n.ano = Math.floor(total / 12);
    n.mes = (total % 12) + 1;
  } else if (c.tipo === "trimestral") {
    const total = (c.ano * 4 + (c.trimestre - 1)) + step;
    n.ano = Math.floor(total / 4);
    n.trimestre = (total % 4) + 1;
  } else if (c.tipo === "semestral") {
    const total = (c.ano * 2 + (c.semestre - 1)) + step;
    n.ano = Math.floor(total / 2);
    n.semestre = (total % 2) + 1;
  } else if (c.tipo === "anual") {
    n.ano = c.ano + step;
  } else {
    const dias = diasEntre(c.inicio, c.fim) + 1;
    n.inicio = addDias(c.inicio, dias * step);
    n.fim = addDias(c.fim, dias * step);
  }
  return n;
}

/** Período imediatamente anterior equivalente (para comparações). */
export function periodoAnterior(c: PeriodoCursor): Periodo {
  return buildPeriodo(moveCursor(c, -1));
}

export function addDias(isoDate: string, dias: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function diasEntre(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return 0;
  return Math.round((db - da) / 86400000);
}

export function dentro(p: Periodo, dataISO: string): boolean {
  if (!dataISO) return false;
  return dataISO >= p.inicio && dataISO <= p.fim;
}

export type Bucket = { key: string; label: string; inicio: string; fim: string };

/** Granularidade legível conforme o intervalo do período. */
export function buckets(p: Periodo): Bucket[] {
  const dias = diasEntre(p.inicio, p.fim) + 1;
  const out: Bucket[] = [];

  if (dias <= 10) {
    for (let i = 0; i < dias; i++) {
      const d = addDias(p.inicio, i);
      out.push({ key: d, label: d.slice(8, 10) + "/" + d.slice(5, 7), inicio: d, fim: d });
    }
    return out;
  }

  if (dias <= 45) {
    // semanas
    let cursor = p.inicio;
    let i = 1;
    while (cursor <= p.fim) {
      const fim = addDias(cursor, 6) > p.fim ? p.fim : addDias(cursor, 6);
      out.push({ key: cursor, label: `Sem ${i}`, inicio: cursor, fim });
      cursor = addDias(fim, 1);
      i++;
    }
    return out;
  }

  // meses
  const start = new Date(`${p.inicio}T00:00:00`);
  const end = new Date(`${p.fim}T00:00:00`);
  let y = start.getFullYear();
  let m = start.getMonth() + 1;
  while (y * 12 + m <= end.getFullYear() * 12 + (end.getMonth() + 1)) {
    const bi = iso(y, m, 1);
    const bf = iso(y, m, lastDay(y, m));
    out.push({
      key: `${y}-${pad(m)}`,
      label: dias > 400 ? `${MESES_CURTOS[m - 1]}/${String(y).slice(2)}` : MESES_CURTOS[m - 1],
      inicio: bi < p.inicio ? p.inicio : bi,
      fim: bf > p.fim ? p.fim : bf,
    });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

export function bucketDe(bs: Bucket[], dataISO: string): Bucket | undefined {
  return bs.find((b) => dataISO >= b.inicio && dataISO <= b.fim);
}

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function diaSemana(dataISO: string): number | null {
  if (!dataISO) return null;
  const d = new Date(`${dataISO}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getDay();
}

export function nomeMes(m: number): string {
  return MESES[m - 1] ?? "";
}
