import { createFileRoute } from "@tanstack/react-router";
import ModalidadeLanding from "@/components/public/ModalidadeLanding";
import { personalizadoImages } from "@/assets/lhl";

const d = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1800`;
const HERO = d("12OGmQ4DEVI3ADHVu7weFGLDreXw49IIi");
const GALLERY = [
  HERO,
  personalizadoImages[0],
  d("1JctWsVWkfUZ8pHNdfT4szvCyKwbiU5Vf"),
  d("1YJUA1G3Qn2uwfSWn__iAbTWKDd-eMjTu"),
  d("1W6FsO5SegUa7yPvQmfuNinGkpZ4gYP-V"),
].filter(Boolean);

export const Route = createFileRoute("/tema-personalizado")({
  head: () => ({
    meta: [
      { title: "Festas Personalizadas | LHL Festas" },
      { name: "description", content: "Festas personalizadas da LHL Festas: envie uma ideia, referência, cores ou tema e receba uma proposta criada para o seu evento." },
      { property: "og:title", content: "Festas Personalizadas | LHL Festas" },
      { property: "og:image", content: HERO },
      { property: "og:url", content: "https://www.lhlfestas.com.br/tema-personalizado" },
    ],
    links: [{ rel: "canonical", href: "https://www.lhlfestas.com.br/tema-personalizado" }],
  }),
  component: TemaPersonalizadoPage,
});

function TemaPersonalizadoPage() {
  return (
    <ModalidadeLanding
      eyebrow="Festas Personalizadas"
      title="Sua referência vira"
      highlight="um projeto só seu."
      description="Quando o tema, as cores ou a composição que você imagina não cabem em um modelo pronto, a LHL cria uma proposta personalizada. Você envia a ideia e nós transformamos a referência em um cenário viável para a sua festa."
      heroImage={HERO}
      heroAlt="Festa personalizada real da LHL Festas"
      catalogHref="/catalogo?origem=tema-personalizado"
      budgetHref="/orcamento?tipoSolicitacao=tema-personalizado&origem=tema-personalizado"
      facts={[
        { title: "Briefing livre", text: "Você pode enviar tema, paleta, estilo, idade, nome ou uma imagem de referência." },
        { title: "Projeto exclusivo", text: "A composição é pensada para o evento em vez de seguir um kit fechado." },
        { title: "Orçamento manual", text: "A proposta é calculada após analisar peças, produção, montagem e logística necessárias." },
      ]}
      introTitle="Para ideias que merecem sair do óbvio."
      introText="A Festa Personalizada começa pela sua referência. Pode ser uma paleta de cores, um convite, uma imagem da internet, um tema pouco comum, uma comemoração adulta ou uma combinação que ainda não existe no catálogo. A LHL analisa o que já temos no acervo, o que precisa ser produzido ou adquirido e como transformar isso em um cenário bonito e possível."
      idealFor={[
        "quem não encontrou o tema desejado no catálogo",
        "quem tem uma referência visual específica",
        "festas adultas, 15 anos, chás e celebrações especiais",
        "quem quer cores, nome e elementos pensados para a ocasião",
      ]}
      optionsTitle="Existem várias formas de personalizar."
      optionsIntro="Não são pacotes fixos. São caminhos de criação que mostram como podemos partir da sua ideia até chegar à proposta final."
      options={[
        {
          title: "Tema fora do catálogo",
          badge: "criação sob medida",
          description: "Para personagens, assuntos, hobbies ou referências que ainda não aparecem nas nossas inspirações prontas.",
          items: ["Definição de cores e estilo", "Pesquisa de elementos do tema", "Painéis e displays personalizados", "Composição adaptada ao acervo disponível"],
        },
        {
          title: "Paleta e estilo",
          badge: "visual personalizado",
          description: "Quando a prioridade é criar uma atmosfera específica: elegante, romântica, retrô, minimalista, colorida ou delicada.",
          items: ["Paleta de cores definida com você", "Seleção de estruturas e acabamentos", "Flores, vasos e balões coordenados", "Nome, idade ou frase quando fizer sentido"],
        },
        {
          title: "Referência visual",
          badge: "inspirado na sua ideia",
          description: "Você envia uma foto e a LHL interpreta os principais elementos para criar uma versão compatível com o espaço, o acervo e o orçamento.",
          items: ["Leitura da referência", "Adaptação de estruturas", "Definição do que será produzido/comprado", "Projeto visual antes da execução quando necessário"],
        },
        {
          title: "Celebração especial",
          badge: "projeto autoral",
          description: "Para aniversários adultos, 15 anos, chá de bebê, batizado, bodas e outras ocasiões que pedem uma linguagem visual própria.",
          items: ["Conceito visual da comemoração", "Elementos personalizados", "Composição de mesa e cenário", "Montagem conforme a proposta aprovada"],
        },
      ]}
      includesTitle="Personalizar é combinar os detalhes certos."
      includes={[
        "Painéis com arte ou tecido",
        "Nome e idade personalizados",
        "Displays de chão e mesa",
        "Paleta exclusiva de balões",
        "Mesas, cilindros e bases",
        "Bolo fake e suportes",
        "Flores, vasos e elementos decorativos",
        "Números e letreiros em LED quando aplicável",
        "Produção de peças específicas conforme viabilidade",
      ]}
      includesNote="Nem todo projeto precisa de todos esses elementos. A proposta seleciona apenas o que faz sentido para a referência, o espaço e o resultado desejado."
      steps={[
        { title: "Envie a referência", text: "Conte o tema, data, local, cores e anexe uma imagem se tiver algo específico em mente." },
        { title: "A LHL analisa", text: "Separamos o que já existe no acervo e identificamos o que exige produção, compra ou adaptação." },
        { title: "Receba a proposta", text: "Apresentamos a composição e o valor para você aprovar antes da reserva e da produção." },
        { title: "Tiramos do papel", text: "Com a proposta aprovada, seguimos com preparação, personalização e montagem conforme combinado." },
      ]}
      gallery={GALLERY}
      galleryTitle="Ideias diferentes transformadas em cenários LHL."
      faqs={[
        { question: "Posso mandar uma foto da internet como referência?", answer: "Sim. A foto serve como direção visual. A LHL analisa cores, estruturas e elementos e cria uma proposta adaptada ao nosso acervo, ao espaço e ao orçamento, sem prometer uma reprodução idêntica." },
        { question: "Vocês fazem temas que nunca fizeram antes?", answer: "Podemos avaliar. A viabilidade depende da data, do prazo de produção e dos elementos necessários. Por isso a análise acontece antes da confirmação da proposta." },
        { question: "É possível personalizar só algumas partes?", answer: "Sim. A personalização pode estar apenas no painel, nome, displays, paleta de cores ou em outros detalhes, sem necessariamente transformar toda a composição." },
        { question: "Por que não há preço fixo nessa página?", answer: "Porque cada projeto pode exigir quantidades e peças diferentes. O valor é calculado após entender a referência e a estrutura necessária para executar a ideia." },
      ]}
      closingTitle="Se você consegue imaginar, vale mostrar para a gente."
      closingText="Envie sua referência e conte como será a comemoração. A LHL analisa a ideia e prepara uma proposta personalizada, com composição e valor definidos antes da confirmação."
    />
  );
}
