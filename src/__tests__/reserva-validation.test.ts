import { describe, expect, it } from "vitest";
import { isValidCpf, validateReserva } from "@/lib/reserva-validation";

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

  it("rejeita telefone, e-mail, CEP e data inválidos", () => {
    expect(validateReserva({ ...valid, telefone: "123" })).toContain("telefone");
    expect(validateReserva({ ...valid, email: "invalido" })).toContain("e-mail");
    expect(validateReserva({ ...valid, cep: "123" })).toContain("CEP");
    expect(validateReserva({ ...valid, dataEvento: "2020-01-01" })).toContain("data");
  });
});
