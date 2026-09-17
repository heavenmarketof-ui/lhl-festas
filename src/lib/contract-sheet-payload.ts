import type { SheetOrderPayload } from "@/lib/sheets-api";
import type { ContractDetails, StoredOrder } from "@/lib/orders-storage";

export type ContractClientFields = {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  tema: string;
  modalidade: string;
  plano: string;
};

export function buildContractSheetPayload({
  order,
  client,
  details,
  enderecoCompleto,
  itensComprar,
  itensProduzir,
}: {
  order: StoredOrder;
  client: ContractClientFields;
  details: ContractDetails;
  enderecoCompleto: string;
  itensComprar: string;
  itensProduzir: string;
}): SheetOrderPayload {
  return {
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    nomeCompleto: client.nome,
    cpf: client.cpf,
    rg: order.rg,
    telefone: client.telefone,
    email: client.email,
    endereco: enderecoCompleto,
    cidadeUf: details.cidade,
    tema: client.tema,
    modalidade: client.modalidade,
    plano: client.plano,
    dataEvento: details.dataEvento,
    horaInicioFesta: details.horaInicioFesta,
    horaTerminoFesta: details.horaTerminoFesta,
    horaMontagem: details.horaMontagem,
    dataRetirada: details.dataRetirada,
    horaRetirada: details.horaRetirada,
    dataDevolucao: details.dataDevolucao,
    horaDevolucao: details.horaDevolucao,
    nomeAniversariante: details.nomeAniversariante,
    idadeAniversariante: details.idadeAniversariante,
    tipoFesta: details.tipoFesta,
    valorTotal: details.valorTotal,
    valorSinal: details.valorSinal,
    valorRestante: details.valorRestante,
    caucao: details.valorCaucao,
    demaisPecas: details.demaisPecas,
    observacoes: details.observacoes,
    kitJson: JSON.stringify(details.kit),
    origemCliente: details.origemCliente,
    veioAnuncio: details.veioAnuncio,
    pagamentoFinalizado: details.pagamentoFinalizado,
    devolucaoConfirmada: details.devolucaoConfirmada,
    ativo: details.ativo,
    observacoesInternas: details.observacoesInternas,
    sinalRecebido: details.sinalRecebido,
    pagamentoFinalRecebido: details.pagamentoFinalRecebido,
    caucaoDevolvida: details.caucaoDevolvida,
    dataPagamentoFinal: details.dataPagamentoFinal,
    dataDevolucaoCaucao: details.dataDevolucaoCaucao,
    clienteRecorrente: details.clienteRecorrente,
    aceiteContrato: details.aceiteContrato,
    dataHoraAceite: details.dataHoraAceite,
    fotoDecoracaoUrl: details.fotoDecoracaoUrl,
    checklistMontado: details.checklistMontado,
    kitSeparado: details.kitSeparado,
    caucaoRecebida: details.caucaoRecebida,
    rua: details.rua,
    numero: details.numero,
    bairro: details.bairro,
    cidade: details.cidade,
    cep: details.cep,
    balaoTipo: details.balaoTipo,
    servicoMontagem: details.servicoMontagem,
    itensExclusivos: details.itensExclusivos,
    itensComprar,
    itensProduzir,
  };
}
