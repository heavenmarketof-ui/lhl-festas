import { createFileRoute } from "@tanstack/react-router";
import ModalidadeLanding from "@/components/public/ModalidadeLanding";

const driveImage = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1600`;

const HERO = driveImage("1lPR3hKeeyibMSse1xzyK6ZfSz0zUV4ov");
const GALLERY = [
  HERO,
  driveImage("1YJUA1G3Qn2uwfSWn__iAbTWKDd-eMjTu"),
  driveImage("1W6FsO5SegUa7yPvQmfuNinGkpZ4gYP-V"),
  driveImage("1JctWsVWkfUZ8pHNdfT4szvCyKwbiU5Vf"),
];

export const Route = createFileRoute("/festa-na-mesa")({
  head: () => ({
    meta: [
      { title: "Festa na Mesa | LHL Festas" },
      { name: "description", content: "Conheça a modalidade Festa na Mesa da LHL Festas e escolha o tema ideal para sua celebração." },
      { property: "og:title", content: "Festa na Mesa | LHL Festas" },
      { property: "og:image", content: HERO },
      { property: "og:url", content: "https://www.lhlfestas.com.br/festa-na-mesa" },
    ],
    links: [{ rel: "canonical", href: "https://www.lhlfestas.com.br/festa-na-mesa" }],
  }),
  component: FestaNaMesaPage,
});

function FestaNaMesaPage() {
  return (
    <ModalidadeLanding
      eyebrow="Festa na Mesa"
      title="Uma festa linda, completa e"
      highlight="cheia de personalidade."
      description="Uma composição pensada para transformar pequenos e grandes momentos em uma celebração especial, com peças que conversam entre si e um visual pronto para encantar."
      heroImage={HERO}
      heroAlt="Festa na Mesa da LHL Festas"
      catalogHref="/catalogo?m=festa-na-mesa&origem=festa-na-mesa"
      budgetHref="/orcamento?modalidade=Festa%20na%20Mesa&origem=festa-na-mesa"
      bullets={[
        "Composições pensadas para valorizar a mesa principal e o tema escolhido.",
        "Opções para diferentes estilos de celebração e tamanhos de ambiente.",
        "Temas variados e possibilidade de proposta personalizada.",
        "Atendimento da LHL para ajudar na escolha do conjunto ideal.",
      ]}
      steps={[
        { title: "Escolha o tema", text: "Navegue pelo catálogo e encontre a decoração que combina com a sua festa." },
        { title: "Peça o orçamento", text: "Envie sua escolha e a data do evento para nossa equipe." },
        { title: "Confirme a reserva", text: "Alinhamos os detalhes, itens e condições da sua comemoração." },
        { title: "Celebre", text: "Com tudo definido, é hora de aproveitar o seu momento especial." },
      ]}
      gallery={GALLERY}
      closingTitle="Seu momento merece uma composição que tenha a sua cara."
      closingText="Escolha um tema no catálogo ou conte para nós o que você imaginou. A LHL prepara uma proposta personalizada para a sua comemoração."
    />
  );
}
