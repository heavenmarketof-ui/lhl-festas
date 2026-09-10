import { createFileRoute } from "@tanstack/react-router";
import ModalidadeLanding from "@/components/public/ModalidadeLanding";

const d = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1800`;

// Curadoria exclusiva aprovada para Temas Personalizados.
// O tema personalizado pode ser aplicado em Festa na Mesa, Peg & Monte
// ou Festa com Montagem — não é uma modalidade separada.
const Retro = d("12OGmQ4DEVI3ADHVu7weFGLDreXw49IIi");
const Futebol = d("1lPR3hKeeyibMSse1xzyK6ZfSz0zUV4ov");
const QuinzeAnos = d("1sPR9r8RFE32InQjk1puq0L1v1Dw4gE3_");
const HotWheels = d("1cV_1w12vvHJb9j72npN7Yd1jX5x-x95L");
const Brandili = d("1gHPUNzUDwzgfH0K5F0KIXaE0OkYSfhQ7");

const HERO = Retro;
const GALLERY = [Retro, Futebol, QuinzeAnos, HotWheels, Brandili];

export const Route = createFileRoute("/tema-personalizado")({
  head: () => ({
    meta: [
      { title: "Temas Personalizados | LHL Festas" },
      {
        name: "description",
        content:
          "Temas personalizados da LHL Festas para Festa na Mesa, Peg & Monte ou Festa com Montagem. Personalize com nome, foto, cores, frases ou uma ideia criada sob medida.",
      },
      { property: "og:title", content: "Temas Personalizados | LHL Festas" },
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
      eyebrow="Temas Personalizados"
      title="A sua ideia vira"
      highlight="uma decoração só sua."
      description="O Tema Personalizado pode fazer parte de uma Festa na Mesa, de um Peg & Monte ou de uma Decoração com Montagem. Você escolhe como quer comemorar e a LHL desenvolve a identidade visual da festa a partir do seu desejo."
      heroImage={HERO}
      heroAlt="Tema personalizado retrô criado pela LHL Festas"
      catalogHref="/catalogo?origem=tema-personalizado"
      budgetHref="/orcamento?tipoSolicitacao=tema-personalizado&origem=tema-personalizado"
      facts={[
        {
          title: "Festa na Mesa",
          text: "Personalização aplicada a uma composição compacta para a mesa principal.",
        },
        {
          title: "Peg & Monte",
          text: "Seu tema exclusivo em um kit para retirar, montar e devolver após a comemoração.",
        },
        {
          title: "Com Montagem",
          text: "Projeto personalizado com montagem e desmontagem realizadas pela equipe LHL no local.",
        },
      ]}
      introTitle="Tema Personalizado é a identidade da festa — não uma modalidade separada."
      introText="Primeiro entendemos como você quer comemorar: Festa na Mesa, Peg & Monte ou Decoração com Montagem. Depois criamos a personalização. Ela pode trazer o nome da pessoa, idade, foto, frases especiais, uma paleta de cores específica ou até um tema totalmente livre desenvolvido de acordo com o que você imaginou."
      idealFor={[
        "quem quer colocar o nome ou a idade da pessoa na decoração",
        "quem deseja usar uma foto do aniversariante ou homenageado",
        "quem procura um tema que não existe pronto no catálogo",
        "quem quer uma criação baseada em cores, hobbies, profissão, estilo ou uma ideia própria",
      ]}
      optionsTitle="Existem muitas maneiras de deixar a festa com a sua identidade."
      optionsIntro="A personalização é construída de acordo com a história que você quer contar e pode ser simples ou ocupar todo o cenário. Estes são alguns dos caminhos mais comuns."
      options={[
        {
          title: "Nome, idade e frases",
          badge: "identidade pessoal",
          description:
            "Criamos a composição destacando o nome, a idade ou uma frase que tenha significado para a comemoração.",
          items: [
            "Nome personalizado",
            "Idade em destaque",
            "Frases especiais",
            "Artes coordenadas para painel e displays",
          ],
        },
        {
          title: "Foto da pessoa",
          badge: "homenagem personalizada",
          description:
            "A foto do aniversariante ou homenageado pode fazer parte do painel ou de outros elementos visuais do projeto.",
          items: [
            "Foto integrada à arte",
            "Painel personalizado",
            "Elementos gráficos coordenados",
            "Adaptação para adulto, infantil ou comemoração especial",
          ],
        },
        {
          title: "Tema criado sob medida",
          badge: "ideia livre",
          description:
            "Você pode nos contar apenas o que gosta, enviar uma referência ou explicar a ideia. A partir disso, montamos uma direção visual para a festa.",
          items: [
            "Tema fora do catálogo",
            "Hobbies, profissões e interesses",
            "Paleta de cores exclusiva",
            "Composição visual criada conforme o desejo do cliente",
          ],
        },
        {
          title: "Projetos especiais",
          badge: "adulto, 15 anos e corporativo",
          description:
            "Também personalizamos aniversários adultos, 15 anos, ações de empresas e outras celebrações que pedem uma linguagem visual própria.",
          items: [
            "Identidade visual da ocasião",
            "Logo, cores ou conceito da marca quando aplicável",
            "Elementos cenográficos personalizados",
            "Adaptação ao espaço e à modalidade escolhida",
          ],
        },
      ]}
      includesTitle="O que pode ser personalizado no seu projeto?"
      includes={[
        "Nome e idade",
        "Foto do aniversariante ou homenageado",
        "Frases e mensagens especiais",
        "Painéis com arte exclusiva",
        "Displays de chão e de mesa",
        "Paleta de cores e balões",
        "Bolo fake e elementos decorativos",
        "Peças temáticas criadas para a proposta",
        "Identidade visual para festas adultas, infantis ou corporativas",
      ]}
      includesNote="A personalização é adaptada à modalidade escolhida. Uma Festa na Mesa terá uma composição mais compacta; no Peg & Monte os itens são preparados para retirada; e na Festa com Montagem a LHL executa o cenário no local."
      steps={[
        {
          title: "Escolha como comemorar",
          text: "Defina se prefere Festa na Mesa, Peg & Monte ou uma Decoração com Montagem no local.",
        },
        {
          title: "Conte a sua ideia",
          text: "Envie nome, idade, foto, cores, referências ou simplesmente explique o que gostaria de ver na festa.",
        },
        {
          title: "Criamos a proposta",
          text: "A LHL combina a personalização com a estrutura adequada e apresenta a composição e o valor para aprovação.",
        },
        {
          title: "Transformamos em festa",
          text: "Com tudo aprovado, preparamos os itens e seguimos com retirada ou montagem, conforme a modalidade escolhida.",
        },
      ]}
      gallery={GALLERY}
      galleryTitle="Personalizações diferentes para histórias diferentes."
      faqs={[
        {
          question: "Tema Personalizado é uma modalidade diferente?",
          answer:
            "Não. O tema personalizado pode ser aplicado em Festa na Mesa, Peg & Monte ou Festa com Montagem. A modalidade define como a decoração será entregue e montada; a personalização define a identidade visual da festa.",
        },
        {
          question: "Posso colocar meu nome ou minha foto na decoração?",
          answer:
            "Sim. Podemos desenvolver a arte com nome, idade, foto da pessoa, frases e outros elementos pessoais, conforme a proposta aprovada.",
        },
        {
          question: "E se eu não tiver um tema pronto em mente?",
          answer:
            "Sem problema. Você pode contar cores, gostos, hobbies, profissão, estilo ou o clima que deseja para a festa. A LHL usa essas informações para montar uma proposta visual personalizada.",
        },
        {
          question: "Posso mandar uma referência da internet?",
          answer:
            "Sim. A referência nos ajuda a entender estilo, cores e composição. Criamos uma versão adaptada ao acervo, ao espaço, à modalidade e ao orçamento, sem prometer uma cópia idêntica.",
        },
        {
          question: "Por que o valor não aparece pronto no site?",
          answer:
            "Porque a personalização pode envolver quantidades, peças e níveis de produção diferentes. O valor é definido depois de entendermos a ideia e a modalidade escolhida.",
        },
      ]}
      closingTitle="Sua festa não precisa parecer com a de todo mundo."
      closingText="Conte o que você imaginou — pode ser um nome, uma foto, uma cor, uma referência ou apenas uma ideia. A LHL transforma isso em uma proposta personalizada e adapta o projeto para Festa na Mesa, Peg & Monte ou Decoração com Montagem."
    />
  );
}
