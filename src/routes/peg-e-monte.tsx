import { createFileRoute } from "@tanstack/react-router";
import ModalidadeLanding from "@/components/public/ModalidadeLanding";

const driveImage = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1600`;

const HERO = driveImage("1d5xpnRNkiSECrh5FlkSC8DnISWWDBMh9");
const GALLERY = [
  HERO,
  driveImage("133QbMl8xmGoa3XJD4sFGpjY51aDXmtpb"),
  driveImage("15zwnq9Ejv-JYvqGfE3K69Rn7DgXthDCq"),
  driveImage("1FTVXnS_eFo_gZHo1EGhQgq1nauyGq5pc"),
];

export const Route = createFileRoute("/peg-e-monte")({
  head: () => ({
    meta: [
      { title: "Peg & Monte | LHL Festas" },
      { name: "description", content: "Conheça o Peg & Monte da LHL Festas: escolha seu tema, retire o kit, monte e aproveite a festa." },
      { property: "og:title", content: "Peg & Monte | LHL Festas" },
      { property: "og:image", content: HERO },
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
      description="Uma solução prática para quem quer uma decoração bonita e organizada, com liberdade para montar no próprio espaço e aproveitar o evento do seu jeito."
      heroImage={HERO}
      heroAlt="Inspiração de decoração da LHL Festas"
      catalogHref="/catalogo?m=peg-e-monte&origem=peg-e-monte"
      budgetHref="/orcamento?modalidade=Peg%20%26%20Monte&origem=peg-e-monte"
      bullets={[
        "Kits preparados para facilitar a montagem no local da sua festa.",
        "Você retira os itens combinados e devolve após o evento.",
        "Diversos temas disponíveis no catálogo da LHL Festas.",
        "Nossa equipe orienta a escolha do kit mais adequado para sua comemoração.",
      ]}
      steps={[
        { title: "Escolha o tema", text: "Encontre no catálogo a decoração que mais combina com a sua comemoração." },
        { title: "Reserve", text: "Envie o pedido, a data e alinhe os detalhes com a equipe da LHL." },
        { title: "Retire e monte", text: "Busque o kit no horário combinado e faça a montagem no seu espaço." },
        { title: "Devolva", text: "Depois da festa, faça a devolução dos itens conforme o combinado." },
      ]}
      gallery={GALLERY}
      closingTitle="Praticidade sem abrir mão de uma festa bonita."
      closingText="Navegue pelos temas, escolha sua inspiração e envie a seleção para nosso orçamento. A equipe da LHL ajuda você a transformar a ideia em uma festa especial."
    />
  );
}
