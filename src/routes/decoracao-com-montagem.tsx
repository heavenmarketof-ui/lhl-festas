import { createFileRoute } from "@tanstack/react-router";
import ModalidadeLanding from "@/components/public/ModalidadeLanding";
import { extrasImages, heroImages, inspireSeImages } from "@/assets/lhl";

const HERO = extrasImages[0] || heroImages[1];
const GALLERY = [HERO, heroImages[1], inspireSeImages[1], heroImages[3]].filter(Boolean);

export const Route = createFileRoute("/decoracao-com-montagem")({
  head: () => ({
    meta: [
      { title: "Decoração com Montagem | LHL Festas" },
      {
        name: "description",
        content: "Decoração com montagem e desmontagem pela LHL Festas. Conte sua ideia, alinhe a composição e receba uma proposta para o seu evento.",
      },
      { property: "og:title", content: "Decoração com Montagem | LHL Festas" },
      { property: "og:url", content: "https://www.lhlfestas.com.br/decoracao-com-montagem" },
    ],
    links: [{ rel: "canonical", href: "https://www.lhlfestas.com.br/decoracao-com-montagem" }],
  }),
  component: DecoracaoComMontagemPage,
});

function DecoracaoComMontagemPage() {
  return (
    <ModalidadeLanding
      eyebrow="Decoração com montagem"
      title="A LHL prepara o cenário e"
      highlight="monta tudo para você."
      description="Uma proposta feita para quem quer viver a comemoração sem se preocupar com a montagem. Alinhamos a composição, levamos os itens, montamos no local e realizamos a desmontagem conforme o combinado."
      heroImage={HERO}
      heroAlt="Decoração com montagem da LHL Festas"
      catalogHref="/catalogo?origem=decoracao-com-montagem"
      budgetHref="/orcamento?tipoSolicitacao=festa-com-montagem&origem=decoracao-com-montagem"
      bullets={[
        "Montagem e desmontagem realizadas pela equipe da LHL.",
        "Composição alinhada de acordo com tema, espaço e estilo da festa.",
        "Possibilidade de incluir painéis, mesas, balões, flores e outros elementos conforme a proposta.",
        "Atendimento personalizado para definir logística e detalhes do evento.",
      ]}
      steps={[
        { title: "Conte sua ideia", text: "Envie o tema, a data e, se quiser, uma referência visual do que você imaginou." },
        { title: "Receba a proposta", text: "Alinhamos composição, itens, valores, endereço e condições do evento." },
        { title: "A LHL monta", text: "No dia combinado, nossa equipe realiza a montagem no local da festa." },
        { title: "A LHL desmonta", text: "Após o evento, fazemos a retirada e concluímos a operação conforme o combinado." },
      ]}
      gallery={GALLERY}
      closingTitle="Sua festa pronta para receber os convidados."
      closingText="Envie sua referência ou escolha uma inspiração no catálogo. A LHL organiza a proposta e cuida da execução no local."
    />
  );
}
