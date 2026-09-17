import { resolveKit } from "@/data/kits";
import { emptyKit, type KitChecklist } from "@/lib/orders-storage";

export type ContractKitDefaults = {
  kit: KitChecklist;
  caucao: string;
  servicoMontagem: "Sim" | "Não";
  balaoTipo: string;
  pendencias: string[];
};

const item = (overrides: Partial<KitChecklist>): KitChecklist => ({
  ...emptyKit,
  ...overrides,
});

const CHECKLISTS: Record<string, Pick<ContractKitDefaults, "kit" | "balaoTipo" | "pendencias">> = {
  "fm-so-um-bolinho": {
    kit: item({ painelPersonalizado: 1, bandejas: 1 }),
    balaoTipo: "",
    pendencias: [],
  },
  "fm-essencial": {
    kit: item({ painelPersonalizado: 1, bandejas: 1, vasoGrego: 1, buchinhoFloreira: 1 }),
    balaoTipo: "Balões no painel",
    pendencias: [],
  },
  "fm-completo": {
    kit: item({
      painelPersonalizado: 1,
      bandejas: 1,
      vasoGrego: 1,
      buchinhoFloreira: 1,
      displays: 1,
      mesa: 1,
    }),
    balaoTipo: "Balões no painel",
    pendencias: [],
  },
  "fm-premium": {
    kit: item({
      mesa: 1,
      painelPersonalizado: 1,
      arcoSuporte: 1,
      bandejas: 1,
      boloFake: 1,
      vasoGrego: 1,
      buchinhoFloreira: 1,
      displays: 1,
    }),
    balaoTipo: "Balões no arco romano de mesa, Guirlanda de balões na frente da mesa",
    pendencias: [],
  },
  "fm-diamante": {
    kit: item({
      arcoSuporte: 1,
      painelPersonalizado: 1,
      mesa: 1,
      boloFake: 1,
      bandejas: 1,
      vasoGrego: 1,
      buchinhoFloreira: 1,
      displays: 2,
      tapete: 1,
    }),
    balaoTipo: "Balões no painel, Arco de balões 2 m",
    pendencias: [],
  },
  "pm-essencial": {
    kit: item({
      arcoSuporte: 1,
      cilindros: 3,
      bandejas: 1,
      vasoGrego: 1,
      buchinhoFloreira: 1,
      displays: 1,
    }),
    balaoTipo: "",
    pendencias: [],
  },
  "pm-completo": {
    kit: item({
      arcoSuporte: 1,
      bandejas: 1,
      vasoGrego: 2,
      buchinhoFloreira: 2,
      displays: 2,
      tapete: 1,
    }),
    balaoTipo: "",
    pendencias: ["Confirmar se a base será trio de cilindros ou mesa decorativa."],
  },
  "pm-premium": {
    kit: item({
      arcoSuporte: 2,
      mesa: 1,
      cilindros: 3,
      bandejas: 1,
      vasoGrego: 2,
      buchinhoFloreira: 2,
      displays: 2,
      tapete: 1,
    }),
    balaoTipo: "",
    pendencias: [],
  },
  "pm-personalizado-montagem": {
    kit: item({}),
    balaoTipo: "",
    pendencias: ["Composição personalizada: preencher somente os itens realmente negociados."],
  },
  "fcm-personalizada": {
    kit: item({}),
    balaoTipo: "",
    pendencias: ["Composição personalizada: preencher somente os itens realmente negociados."],
  },
};

export function getContractKitDefaults(
  modalidade?: string,
  plano?: string,
): ContractKitDefaults | undefined {
  const officialKit = resolveKit(modalidade, plano);
  if (!officialKit) return undefined;

  const template = CHECKLISTS[officialKit.id] ?? {
    kit: item({}),
    balaoTipo: "",
    pendencias: [],
  };
  const montagem =
    officialKit.modalidade === "festa-com-montagem" ||
    officialKit.id === "pm-personalizado-montagem";

  return {
    kit: { ...template.kit },
    caucao: String(montagem ? 0 : officialKit.caucao),
    servicoMontagem: montagem ? "Sim" : "Não",
    balaoTipo: template.balaoTipo,
    pendencias: [...template.pendencias],
  };
}
