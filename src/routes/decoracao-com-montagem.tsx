import { createFileRoute } from "@tanstack/react-router";
import ModalidadeLanding from "@/components/public/ModalidadeLanding";

const d = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1800`;
const HERO = d("1RhHiAwt-AMy_SYeYb3DeR5oAP9AInWQ6");
const GALLERY = [
  HERO,
  d("1YJUA1G3Qn2uwfSWn__iAbTWKDd-eMjTu"),
  d("1lPR3hKeeyibMSse1xzyK6ZfSz0zUV4ov"),
  d("1d5xpnRNkiSECrh5FlkSC8DnISWWDBMh9"),
  d("1JctWsVWkfUZ8pHNdfT4szvCyKwbiU5Vf"),
  d("1U6PvbuxKOGNEJKFktWuzZmdWiNXlQp6m"),
  d("1gHPUNzUDwzgfH0K5F0KIXaE0OkYSfhQ7"),
];

export const Route = createFileRoute("/decoracao-com-montagem")({
  head: () => ({
    meta: [
      { title: "Festas com Montagem | LHL Festas" },
      { name: "description", content: "Festas com montagem e desmontagem pela LHL Festas: projeto personalizado, transporte, montagem no local e retirada após o evento." },
      { property: "og:title", content: "Festas com Montagem | LHL Festas" },
      { property: "og:image", content: HERO },
      { property: "og:url", content: "https://www.lhlfestas.com.br/decoracao-com-montagem" },
    ],
    links: [{ rel: "canonical", href: "https://www.lhlfestas.com.br/decoracao-com-montagem" }],
  }),
  component: DecoracaoComMontagemPage,
});

function DecoracaoComMontagemPage() {
  return (
    <ModalidadeLanding
      eyebrow="Festas com Montagem"
      title="Você celebra."
      highlight="A LHL cuida do cenário."
      description="Nesta modalidade, a LHL vai até o local do evento e executa a decoração combinada. Planejamos a composição, levamos as peças, montamos o cenário e realizamos a desmontagem conforme o horário acertado."
      heroImage={HERO}
      heroAlt="Festa com montagem realizada pela LHL Festas"
      catalogHref="/catalogo?origem=decoracao-com-montagem"
      budgetHref="/orcamento?tipoSolicitacao=festa-com-montagem&origem=decoracao-com-montagem"
      facts={[
        { title: "Montagem no local", text: "A equipe LHL leva e monta a decoração no endereço combinado." },
        { title: "Projeto sob medida", text: "A composição considera tema, espaço, quantidade de elementos e estilo desejado." },
        { title: "Montagem + retirada", text: "A operação inclui a execução do cenário e a desmontagem conforme a proposta." },
      ]}
      introTitle="Para quem quer chegar à festa e encontrar tudo pronto."
      introText="Festa com Montagem não é Peg & Monte. Aqui, a responsabilidade pela execução do cenário é da LHL. A composição é construída para o evento e pode combinar painéis, mesas, cilindros, balões, displays, tapetes, vasos, flores, bolo fake, iluminação decorativa e outros elementos conforme o projeto."
      idealFor={[
        "quem não quer se preocupar com transporte e montagem",
        "festas com cenários maiores ou mais detalhados",
        "eventos em salão, buffet, residência ou espaço alugado",
        "quem quer um projeto visual pensado para o ambiente",
      ]}
      optionsTitle="O projeto cresce conforme a sua festa."
      optionsIntro="Não trabalhamos aqui com três pacotes engessados. Estes são exemplos de níveis de composição que ajudam a entender o que pode mudar de um projeto para outro; a proposta final é feita sob medida."
      options={[
        {
          title: "Composição compacta",
          badge: "exemplo de projeto",
          description: "Um cenário mais enxuto, pensado para destacar a mesa principal sem ocupar uma área grande.",
          items: ["1 painel principal", "Mesa ou cilindros", "Balões em composição proporcional", "Bolo fake e suportes", "Displays e acabamento temático"],
        },
        {
          title: "Composição completa",
          badge: "exemplo de projeto",
          description: "Mais volume visual, com elementos de diferentes alturas e uma leitura de cenário mais completa.",
          items: ["2 ou mais painéis conforme projeto", "Mesa decorativa e bases", "Tapete", "Balões em maior extensão", "Displays de chão e mesa", "Vasos, flores e elementos cenográficos"],
        },
        {
          title: "Projeto especial",
          badge: "sob medida",
          description: "Para referências mais elaboradas, temas específicos, festas adultas, 15 anos, chá de bebê ou cenários que exigem peças e produção especial.",
          items: ["Estudo da referência enviada", "Composição livre de estruturas", "Itens personalizados", "Possibilidade de LEDs e elementos especiais", "Montagem e desmontagem planejadas para o local"],
        },
      ]}
      includesTitle="Cada cenário pode combinar elementos diferentes."
      includes={[
        "Painéis redondos e romanos",
        "Mesas decorativas e boiserie",
        "Cilindros e bases",
        "Tapetes",
        "Balões orgânicos e desconstruídos",
        "Displays de chão e mesa",
        "Bolo fake e bandejas",
        "Vasos, flores e peças decorativas",
        "Números, letreiros e LEDs conforme projeto",
      ]}
      includesNote="A lista acima mostra possibilidades, não um pacote obrigatório. A composição é definida de acordo com a referência, o espaço, o tema e o orçamento aprovado."
      steps={[
        { title: "Conte a ideia", text: "Envie tema, data, endereço e, se tiver, uma foto de referência do cenário que imagina." },
        { title: "Criamos a proposta", text: "Definimos a composição e alinhamos valores, logística, horário de montagem e desmontagem." },
        { title: "Montamos", text: "No dia do evento, a equipe leva os itens e monta o cenário no local combinado." },
        { title: "Desmontamos", text: "Depois da festa, retornamos para a retirada conforme a janela de horário acordada." },
      ]}
      gallery={GALLERY}
      galleryTitle="Cenários montados pela LHL para diferentes histórias."
      faqs={[
        { question: "Festa com Montagem é a mesma coisa que Peg & Monte?", answer: "Não. No Peg & Monte tradicional, o cliente retira, monta e devolve. Na Festa com Montagem, a LHL executa a montagem no local e depois realiza a desmontagem conforme o combinado." },
        { question: "Vocês reproduzem exatamente uma foto de referência?", answer: "A referência serve para entendermos estilo, cores e elementos desejados. A proposta é adaptada ao acervo, ao espaço, à disponibilidade e ao orçamento, mantendo a identidade da ideia sem prometer uma cópia idêntica." },
        { question: "O que está incluso no valor?", answer: "A proposta descreve exatamente a composição aprovada e informa o serviço de montagem e desmontagem. Como cada festa pode ser diferente, o valor é definido manualmente após a análise." },
        { question: "Vocês montam em qualquer local?", answer: "A disponibilidade depende da data, endereço, acesso e condições do espaço. Essas informações são verificadas no orçamento antes da confirmação." },
      ]}
      closingTitle="No dia da festa, sua principal tarefa deve ser aproveitar."
      closingText="Mande sua referência, data e local. A LHL transforma essas informações em uma proposta clara e cuida da montagem do cenário para você."
    />
  );
}
