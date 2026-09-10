import { createFileRoute } from "@tanstack/react-router";
import PersonalizadosStore from "@/components/public/PersonalizadosStore";

export const Route = createFileRoute("/loja-personalizados")({
  head: () => ({
    meta: [
      { title: "Loja de Personalizados | LHL Festas" },
      { name: "description", content: "Caixinhas, lembrancinhas, toppers, convites e personalizados para festas. Monte sua seleção e finalize o orçamento com a LHL Festas pelo WhatsApp." },
      { name: "robots", content: "index,follow" },
    ],
    links: [
      { rel: "canonical", href: "https://www.lhlfestas.com.br/loja-personalizados" },
    ],
  }),
  component: PersonalizadosStore,
});
