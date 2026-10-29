import { modalidadeIdFromLabel } from "@/data/kits";

export type ReservaValidationInput = {
  tipoPessoa?: string;
  responsavel?: string;
  mesmoEndereco?: string;
  eventoRua?: string; eventoNumero?: string; eventoBairro?: string; eventoCidade?: string; eventoCep?: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  cep: string;
  tema: string;
  modalidade: string;
  plano: string;
  dataEvento: string;
  tipoFesta: string;
};

const digits = (value: string) => value.replace(/\D/g, "");

export function isValidCpf(value: string): boolean {
  const cpf = digits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === Number(cpf[10]);
}

export function isValidCnpj(value: string): boolean {
  const cnpj = value.toUpperCase().replace(/[.\/\-\s]/g, "");
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const check = (base: string) => {
    let weight = base.length - 7;
    const sum = [...base].reduce((total, char) => {const result = total + (char.charCodeAt(0)-48)*weight; weight = weight === 2 ? 9 : weight-1; return result;}, 0);
    return sum % 11 < 2 ? 0 : 11 - sum % 11;
  };
  return check(cnpj.slice(0,12)) === Number(cnpj[12]) && check(cnpj.slice(0,13)) === Number(cnpj[13]);
}

export function isValidPhone(value: string): boolean {
  const phone = digits(value);
  return phone.length === 10 || phone.length === 11;
}

export function isValidCep(value: string): boolean {
  return digits(value).length === 8;
}

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isFutureOrTodayIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const selected = new Date(`${value}T00:00:00`);
  if (Number.isNaN(selected.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected.getTime() >= today.getTime();
}

export function validateReserva(input: ReservaValidationInput): string | null {
  if (input.nome.trim().length < 3) return input.tipoPessoa === "PJ" ? "Informe a razão social da empresa." : "Informe seu nome completo.";
  if (input.tipoPessoa === "PJ") {
    if (!isValidCnpj(input.cpf)) return "Informe um CNPJ válido.";
    if ((input.responsavel || "").trim().length < 3) return "Informe o nome do responsável pelo contato.";
  } else if (!isValidCpf(input.cpf)) return "Informe um CPF válido.";
  if (input.mesmoEndereco === "Não") {
    if ([input.eventoRua,input.eventoBairro,input.eventoCidade].some(v=>(v||"").trim().length<2) || !(input.eventoNumero||"").trim()) return "Preencha o endereço completo do evento.";
    if (!isValidCep(input.eventoCep || "")) return "Informe um CEP válido para o evento.";
  }
  if (!isValidPhone(input.telefone)) return "Informe um telefone válido com DDD.";
  if (!isValidEmail(input.email)) return "Informe um e-mail válido.";
  if (input.rua.trim().length < 2 || !input.numero.trim() || input.bairro.trim().length < 2 || input.cidade.trim().length < 2) {
    return "Preencha o endereço completo.";
  }
  if (!isValidCep(input.cep)) return "Informe um CEP válido.";
  if (input.tema.trim().length < 2) return "Informe o tema da festa.";
  if (!input.tipoFesta) return "Selecione o tipo da festa.";
  if (!input.modalidade) return "Selecione a modalidade da sua festa.";

  const modalidadeId = modalidadeIdFromLabel(input.modalidade);
  const isMontagem = modalidadeId === "festa-com-montagem" || input.modalidade.toLowerCase().includes("montagem");
  if (!isMontagem && !input.plano) {
    return "Selecione o kit para Festa na Mesa ou Peg & Monte.";
  }

  if (!isFutureOrTodayIsoDate(input.dataEvento)) return "Informe uma data de evento válida, de hoje em diante.";
  return null;
}
