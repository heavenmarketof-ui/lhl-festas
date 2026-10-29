import { describe, expect, it } from "vitest";
import { isValidCpf, isValidCnpj, validateReserva } from "@/lib/reserva-validation";

const valid = {
  nome: "Joana da Silva",
  cpf: "529.982.247-25",
  telefone: "(11) 99999-9999",
  email: "joana@example.com",
  rua: "Rua das Flores",
  numero: "123",
  bairro: "Centro",
  cidade: "Mauá",
  cep: "09300-000",
  tema: "Safari",
  modalidade: "Peg & Monte",
  plano: "Essencial",
  dataEvento: "2099-12-31",
  tipoFesta: "Aniversário",
};

describe("validação da reserva pública", () => {
  it("aceita um CPF válido e rejeita sequências inválidas", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });

  it("aceita formulário completo válido", () => {
    expect(validateReserva(valid)).toBeNull();
  });

  it("aceita Festa com Montagem sem seleção manual de kit", () => {
    expect(
      validateReserva({
        ...valid,
        modalidade: "Festa com Montagem",
        plano: "",
      }),
    ).toBeNull();
  });

  it("continua exigindo kit nas modalidades com retirada", () => {
    expect(validateReserva({ ...valid, modalidade: "Peg & Monte", plano: "" })).toContain("kit");
    expect(validateReserva({ ...valid, modalidade: "Festa na Mesa", plano: "" })).toContain("kit");
  });

  it("rejeita telefone, e-mail, CEP e data inválidos", () => {
    expect(validateReserva({ ...valid, telefone: "123" })).toContain("telefone");
    expect(validateReserva({ ...valid, email: "invalido" })).toContain("e-mail");
    expect(validateReserva({ ...valid, cep: "123" })).toContain("CEP");
    expect(validateReserva({ ...valid, dataEvento: "2020-01-01" })).toContain("data");
  });
});


describe("reservas de empresas e local do evento", () => {
  it("valida CNPJ e não exige CPF para a empresa", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
    expect(isValidCnpj("00.000.000/0000-00")).toBe(false);
    expect(validateReserva({...valid,tipoPessoa:"PJ",nome:"Empresa Exemplo",cpf:"11.222.333/0001-81",responsavel:"Ana Silva"})).toBeNull();
  });
  it("exige responsável e documento correto para cada contratante", () => {
    expect(validateReserva({...valid,tipoPessoa:"PJ",cpf:"11.222.333/0001-81"})).toContain("responsável");
    expect(validateReserva({...valid,tipoPessoa:"PF",cpf:"11.222.333/0001-81"})).toContain("CPF");
  });
  it("usa o endereço inicial sem exigir os campos do evento", () => {
    expect(validateReserva({...valid,mesmoEndereco:"Sim"})).toBeNull();
  });
  it("exige endereço e CEP do evento quando diferente", () => {
    expect(validateReserva({...valid,mesmoEndereco:"Não"})).toContain("endereço completo do evento");
    const outro = {...valid,mesmoEndereco:"Não",eventoRua:"Rua do Salão",eventoNumero:"22",eventoBairro:"Centro",eventoCidade:"São Caetano",eventoCep:"09500-000"};
    expect(validateReserva(outro)).toBeNull();
    expect(validateReserva({...outro,eventoCep:"123"})).toContain("CEP válido para o evento");
  });
});
