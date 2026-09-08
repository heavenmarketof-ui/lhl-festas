import { createFileRoute } from "@tanstack/react-router";
import ModalidadeLanding from "@/components/public/ModalidadeLanding";
import { pegEMonteImages } from "@/assets/lhl";

const HERO = pegEMonteImages[0];
const GALLERY = pegEMonteImages.slice(0, 4);

export const Route = createFileRoute("/peg-e-monte")({
  head: () => ({
    meta: [
      { title: "Peg & Monte | LHL Festas" },
      { name: "description", content: "Conheça o Peg & Monte da LHL Festas: escolha o tema, alinhe o kit, retire, monte e devolva após a festa." },
      { property: "og:title", content: "Peg & Monte | LHL Festas" },
      { property: "og:url", content: "https://www.lhlfestas.com.br/peg-e-monte" },
    ],
    links: [{ rel: "canonical", href: "https://www.lhlfestas.com.br/peg-e-monte" }],
  }),
  component: PegEMontePage,
});

function PegEMontePage() {
  return (
    <ModalidadeLanding
      eyebrow="Peg & Monte"
      title="Você escolhe, retira, monta e"
      highlight="faz a festa acontecer."
      description="Uma solução prática para quem quer uma decoração maior e organizada, com liberdade para montar no próprio espaço e aproveitar o evento do seu jeito."
      heroImage={HERO}
      heroAlt="Inspiração de decoração Peg & Monte da LHL Festas"
      catalogHref="/catalogo?m=peg-e-monte&origem=peg-e-monte"
      budgetHref="/orcamento?modalidade=Peg%20%26%20Monte&origem=peg-e-monte"
      bullets={[
        "Kits preparados para facilitar a montagem no local da sua festa.",
        "Você retira os itens combinados e devolve após o evento.",
        "Diversos temas e composições disponíveis no catálogo.",
        "Nossa equipe orienta a escolha do kit mais adequado para a comemoração.",
      ]}
      steps={[
        { title: "Escolha uma inspiração", text: "Encontre no catálogo a decoração que mais combina com a sua comemoração." },
        { title: "Peça o orçamento", text: "Sua escolha e a data seguem para o atendimento sem precisar repetir informações." },
        { title: "Retire e monte", text: "Busque o kit no horário combinado e faça a montagem no seu espaço." },
        { title: "Devolva", text: "Depois da festa, faça a devolução dos itens conforme o combinado." },
      ]}
      gallery={GALLERY}
      closingTitle="Praticidade sem abrir mão de uma festa bonita."
      closingText="Navegue pelas inspirações, escolha sua composição e envie a seleção para o orçamento. A equipe da LHL acompanha o restante do processo."
    />
  );
}
