import type { StoredOrder, OrderStatus, KitChecklist } from "./orders-storage";
import { toDateISO, toTimeHHmm } from "./date-utils";
import { sheetGet, sheetPost, sheetPublicPost, sheetPublicOrder, rowsOf } from "./sheets-gateway";
import { cachedRead, invalidate, type CachedReadOptions } from "./gas-cache";

/** Chave de cache da aba de contratos (compartilhada por todo o admin). */
export const ORDERS_CACHE_KEY = "ordersList";

export type SheetOrderPayload = {
  id: string;
  createdAt: string;
  status: OrderStatus | "Excluído";
  nomeCompleto: string;
  cpf: string;
  rg: string;
  telefone: string;
  email: string;
  endereco: string;
  cidadeUf: string;
  tema: string;
  modalidade: string;
  plano: string;
  dataEvento: string;
  dataRetirada?: string;
  horaRetirada?: string;
  dataDevolucao?: string;
  horaDevolucao?: string;
  nomeAniversariante?: string;
  idadeAniversariante?: string;
  tipoFesta?: string;
  valorTotal: string | number;
  valorSinal: string | number;
  valorRestante: string | number;
  caucao: string | number;
  demaisPecas?: string;
  observacoes?: string;
  kitJson?: string;
  origemCliente?: string;
  veioAnuncio?: string;
  pagamentoFinalizado?: string;
  devolucaoConfirmada?: string;
  ativo?: string;
  observacoesInternas?: string;
  sinalRecebido?: string;
  pagamentoFinalRecebido?: string;
  caucaoDevolvida?: string;
  dataPagamentoFinal?: string;
  dataDevolucaoCaucao?: string;
  clienteRecorrente?: string;
  aceiteContrato?: string;
  dataHoraAceite?: string;
  fotoDecoracaoUrl?: string;
  checklistMontado?: string;
  kitSeparado?: string;
  caucaoRecebida?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
  balaoTipo?: string;
  itensExclusivos?: string;
  itensComprar?: string;
  itensProduzir?: string;
  servicoMontagem?: string;
};

/**
 * POST sem preflight CORS — usa text/plain para o Apps Script ler em e.postData.contents.
 */
export async function postOrderToSheet(payload: SheetOrderPayload): Promise<void> {
  // Reserva pública: ação da lista branca no servidor.
  await sheetPublicPost({ action: "create", ...payload });
}

export async function updateOrderOnSheet(payload: SheetOrderPayload): Promise<void> {
  const normalizedPayload = {
    ...payload,
    servicoMontagem: payload.servicoMontagem || "Não",
  };
  await sheetPost({ action: "update", ...normalizedPayload });
  invalidate(ORDERS_CACHE_KEY);
}

export async function setOrderStatusOnSheet(
  id: string,
  status: OrderStatus | "Excluído",
): Promise<void> {
  await sheetPost({ action: "updateStatus", id, status });
  invalidate(ORDERS_CACHE_KEY);
}

type SheetRow = Partial<SheetOrderPayload> & Record<string, unknown>;

function parseKit(raw: unknown): KitChecklist {
  const empty: KitChecklist = {
    bandejas: 0, cilindros: 0, displays: 0, baloes: 0,
    mesa: 0, tapete: 0, vasoGrego: 0, boloFake: 0,
    arcoSuporte: 0, buchinhoFloreira: 0,
    numeroLed: 0, painelPersonalizado: 0,
    escadinha: 0, happyBirthday: 0,
  };
  if (!raw) return empty;
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
    if (obj && typeof obj === "object") {
      const out = { ...empty };
      for (const k of Object.keys(empty) as (keyof KitChecklist)[]) {
        const v = (obj as Record<string, unknown>)[k];
        out[k] = Number(v) || 0;
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return empty;
}

/**
 * GET dos contratos da planilha. Aceita formato { data: [...] } ou array direto.
 * Por padrão exclui registros com status "Excluído".
 */
export async function fetchOrdersFromSheet(
  opts?: { includeDeleted?: boolean } & CachedReadOptions,
): Promise<StoredOrder[]> {
  const orders = await cachedRead(
    ORDERS_CACHE_KEY,
    async () => (rowsOf(await sheetGet()) as SheetRow[]).map((r): StoredOrder => mapRow(r)),
    opts,
  );

  if (opts?.includeDeleted) return orders;
  return orders.filter((o) => String(o.status) !== "Excluído");
}

function mapRow(r: SheetRow): StoredOrder {
  {
    const id = String(r.id ?? crypto.randomUUID());
    const status = (r.status as OrderStatus) ?? "Pendente";

    return {
      id,
      nome: String(r.nomeCompleto ?? (r as any).nome ?? ""),
      cpf: String(r.cpf ?? ""),
      rg: String(r.rg ?? ""),
      telefone: String(r.telefone ?? ""),
      email: String(r.email ?? ""),
      endereco: String(r.endereco ?? ""),
      cidadeUf: String(r.cidadeUf ?? ""),
      tema: String(r.tema ?? ""),
      modalidade: String(r.modalidade ?? ""),
      plano: String(r.plano ?? ""),
      status: status as OrderStatus,
      createdAt: String(r.createdAt ?? new Date().toISOString()),
      details: {
        dataEvento: toDateISO(r.dataEvento),
        dataRetirada: toDateISO(r.dataRetirada),
        horaRetirada: toTimeHHmm(r.horaRetirada),
        dataDevolucao: toDateISO(r.dataDevolucao),
        horaDevolucao: toTimeHHmm(r.horaDevolucao),
        nomeAniversariante: String((r as any).nomeAniversariante ?? ""),
        idadeAniversariante: String((r as any).idadeAniversariante ?? ""),
        tipoFesta: String((r as any).tipoFesta ?? ""),
        valorTotal: String(r.valorTotal ?? ""),
        valorSinal: String(r.valorSinal ?? ""),
        valorRestante: String(r.valorRestante ?? ""),
        valorCaucao: String(r.caucao ?? (r as any).valorCaucao ?? ""),
        kit: parseKit((r as any).kitJson ?? (r as any).kit),
        demaisPecas: String(r.demaisPecas ?? ""),
        observacoes: String(r.observacoes ?? ""),
        origemCliente: String((r as any).origemCliente ?? ""),
        veioAnuncio: String((r as any).veioAnuncio ?? "Não"),
        pagamentoFinalizado: String((r as any).pagamentoFinalizado ?? "Não"),
        devolucaoConfirmada: String((r as any).devolucaoConfirmada ?? "Não"),
        ativo: String((r as any).ativo ?? "Sim"),
        observacoesInternas: String((r as any).observacoesInternas ?? ""),
        sinalRecebido: String((r as any).sinalRecebido ?? "Não"),
        pagamentoFinalRecebido: String((r as any).pagamentoFinalRecebido ?? "Não"),
        caucaoDevolvida: String((r as any).caucaoDevolvida ?? "Não"),
        dataPagamentoFinal: toDateISO((r as any).dataPagamentoFinal),
        dataDevolucaoCaucao: toDateISO((r as any).dataDevolucaoCaucao),
        clienteRecorrente: String((r as any).clienteRecorrente ?? "Não"),
        aceiteContrato: String((r as any).aceiteContrato ?? ""),
        dataHoraAceite: String((r as any).dataHoraAceite ?? ""),
        fotoDecoracaoUrl: String((r as any).fotoDecoracaoUrl ?? ""),
        checklistMontado: String((r as any).checklistMontado ?? "Não"),
        kitSeparado: String((r as any).kitSeparado ?? "Não"),
        caucaoRecebida: String((r as any).caucaoRecebida ?? "Não"),
        rua: String((r as any).rua ?? ""),
        numero: String((r as any).numero ?? ""),
        bairro: String((r as any).bairro ?? ""),
        cidade: String((r as any).cidade ?? ""),
        cep: String((r as any).cep ?? ""),
        balaoTipo: String((r as any).balaoTipo ?? ""),
        itensExclusivos: String((r as any).itensExclusivos ?? ""),
        itensComprar: String((r as any).itensComprar ?? ""),
        itensProduzir: String((r as any).itensProduzir ?? ""),
        servicoMontagem: String((r as any).servicoMontagem || (r as any).montagem || "Não"),
      },
    };
  }
}

/** Converte uma linha bruta da planilha em StoredOrder (uso interno/gateway). */
export function mapSheetRow(r: SheetRow): StoredOrder {
  return mapRow(r);
}

/** Busca pública de UM contrato (link do cliente) — via Server Function. */
export async function fetchOrderByIdPublic(id: string): Promise<StoredOrder | undefined> {
  const row = (await sheetPublicOrder(id)) as SheetRow | null;
  return row ? mapRow(row) : undefined;
}
