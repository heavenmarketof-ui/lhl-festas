import { createFileRoute } from "@tanstack/react-router";
import ModalidadeLanding from "@/components/public/ModalidadeLanding";
import { festaNaMesaImages } from "@/assets/lhl";
import { getKitsByModalidade } from "@/data/kits";

const driveImage = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1800`;
const HERO = driveImage("1oe1H1YUXprHITr2hQbuqmDnvu_4Rf2SQ");
const GALLERY = [
  HERO,
  festaNaMesaImages[0],
  festaNaMesaImages[3],
  festaNaMesaImages[5],
  festaNaMesaImages[8],
  festaNaMesaImages[10],
  festaNaMesaImages[14],
  festaNaMesaImages[21],
].filter(Boolean);
const OPTIONS = getKitsByModalidade("festa-na-mesa").map((kit, index, all) => ({
  title: kit.nome,
  description: kit.descricao,
  items: kit.itens,
  badge: index === 0 ? "mais enxuta" : index === all.length - 1 ? "mais completa" : undefined,
}));

export const Route = createFileRoute("/festa-na-mesa")({
  head: () => ({
    meta: [
      { title: "Festa na Mesa | LHL Festas" },
      { name: "description", content: "Conheça as opções Festa na Mesa da LHL Festas: Só um Bolinho, Essencial, Completo, Premium e Diamante." },
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
      title="Pequena no espaço."
      highlight="Grande no encanto."
      description="A Festa na Mesa concentra a decoração na mesa principal e cria um cenário bonito sem exigir uma estrutura grande. É ideal para comemorações em casa, salão de condomínio, restaurante ou ambientes mais compactos."
      heroImage={HERO}
      heroAlt="Festa na Mesa real da LHL Festas"
      catalogHref="/catalogo?m=festa-na-mesa&origem=festa-na-mesa"
      budgetHref="/orcamento?modalidade=Festa%20na%20Mesa&origem=festa-na-mesa"
      facts={[
        { title: "5 opções", text: "Do Só um Bolinho ao Diamante, com níveis diferentes de composição." },
        { title: "Foco na mesa", text: "O cenário valoriza a mesa principal sem ocupar uma área grande da festa." },
        { title: "Tema à sua escolha", text: "A composição acompanha o tema e as cores escolhidas para a comemoração." },
      ]}
      introTitle="A escolha certa quando menos espaço pede mais charme."
      introText="Na Festa na Mesa, cada peça tem função visual. Painel, suportes, vasos, displays, bolo fake e balões entram de forma proporcional, criando um ponto principal para o bolo, os doces e as fotos. Você escolhe o nível de composição e a LHL orienta qual opção faz mais sentido para o tamanho da sua comemoração."
      idealFor={[
        "uma comemoração em casa ou ambiente compacto",
        "um cenário bonito sem ocupar muito espaço",
        "destacar bolo, doces e fotos da família",
        "uma solução prática com diferentes níveis de composição",
      ]}
      optionsTitle="Cinco maneiras de montar sua Festa na Mesa."
      optionsIntro="Os nomes e itens abaixo são os kits oficiais da LHL. Não exibimos preço automático: valor, tema, disponibilidade e eventuais ajustes são confirmados no orçamento."
      options={OPTIONS}
      includesTitle="Detalhes que deixam a mesa com cara de festa."
      includes={[
        "Painel de mesa com o tema",
        "Suportes para bolo e doces",
        "Mesa para decoração",
        "Vasos, flores ou buchinhos",
        "Displays de mesa",
        "Bolo fake",
        "Balões e mini arcos",
        "Tapete e display de chão nas opções maiores",
        "Personalização conforme o tema escolhido",
      ]}
      includesNote="Cada kit possui uma composição própria. Itens adicionais podem ser avaliados no atendimento conforme disponibilidade e proposta."
      steps={[
        { title: "Escolha", text: "Veja os temas e identifique qual nível de composição combina com a sua comemoração." },
        { title: "Envie a data", text: "No orçamento, informe a data, o tema e a opção que mais gostou." },
        { title: "Alinhe", text: "Confirmamos disponibilidade, composição final, logística e condições da reserva." },
        { title: "Comemore", text: "Com tudo reservado, você recebe as orientações necessárias para o seu evento." },
      ]}
      gallery={GALLERY}
      galleryTitle="Festa na Mesa em temas e estilos diferentes."
      faqs={[
        { question: "Qual é a diferença entre os kits?", answer: "A diferença principal está na quantidade e no tipo de elementos da composição. Os kits menores concentram o essencial; Premium e Diamante acrescentam mais estrutura, balões, displays e elementos de chão." },
        { question: "Posso escolher qualquer tema?", answer: "Você pode escolher uma inspiração disponível no catálogo ou contar qual tema procura. A equipe confirma a disponibilidade e orienta a melhor composição para a data." },
        { question: "Dá para acrescentar itens ao kit?", answer: "Sim. Dependendo do projeto e da disponibilidade, podemos avaliar adicionais. O orçamento final sempre é alinhado antes da reserva." },
        { question: "O preço aparece no site?", answer: "Não. A LHL confirma o valor manualmente no atendimento, porque tema, disponibilidade e composição podem exigir ajustes." },
      ]}
      closingTitle="Sua comemoração pode ser compacta sem parecer simples."
      closingText="Escolha o tema, conte a data e mostre qual composição mais combina com você. A LHL prepara o orçamento e orienta a melhor Festa na Mesa para o seu momento."
    />
  );
}
