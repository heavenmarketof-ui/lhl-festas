import { createFileRoute } from "@tanstack/react-router";
import ModalidadeLanding from "@/components/public/ModalidadeLanding";
import { festaNaMesaImages } from "@/assets/lhl";

const HERO = festaNaMesaImages[0];
const GALLERY = festaNaMesaImages.slice(0, 4);

export const Route = createFileRoute("/festa-na-mesa")({
  head: () => ({
    meta: [
      { title: "Festa na Mesa | LHL Festas" },
      { name: "description", content: "Conheça a Festa na Mesa da LHL Festas, escolha uma inspiração e solicite uma composição para sua comemoração." },
      { property: "og:title", content: "Festa na Mesa | LHL Festas" },
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
      title="Uma composição charmosa para"
      highlight="celebrar com personalidade."
      description="Uma opção prática para valorizar a mesa principal e criar um cenário especial, com diferentes composições conforme o estilo e o tamanho da comemoração."
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
        { title: "Escolha uma inspiração", text: "Navegue pelo catálogo e encontre uma decoração que combine com a sua festa." },
        { title: "Peça o orçamento", text: "Sua escolha e a data seguem para o atendimento sem você precisar começar de novo." },
        { title: "Alinhe os detalhes", text: "Confirmamos composição, disponibilidade, valores e logística da sua reserva." },
        { title: "Celebre", text: "Com tudo definido, é hora de aproveitar o seu momento especial." },
      ]}
      gallery={GALLERY}
      closingTitle="Seu momento merece uma composição que tenha a sua cara."
      closingText="Escolha uma inspiração no catálogo ou conte para nós o que você imaginou. A LHL prepara a proposta conforme o seu evento."
    />
  );
}
