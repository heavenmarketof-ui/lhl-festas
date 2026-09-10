import { createFileRoute } from "@tanstack/react-router";
import ModalidadeLanding from "@/components/public/ModalidadeLanding";
import { pegEMonteImages } from "@/assets/lhl";
import { getKitsByModalidade } from "@/data/kits";

const driveImage = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1800`;
const HERO = driveImage("13MMyb2SQfmKrkdjdccjtjZ3f49CovFTD");
const GALLERY = [HERO, ...pegEMonteImages].filter(Boolean);
const OPTIONS = getKitsByModalidade("peg-monte").map((kit, index) => ({
  title: kit.nome,
  description: kit.descricao,
  items: kit.itens.length ? kit.itens : [
    "Composição definida junto com a equipe",
    "Itens escolhidos conforme o projeto",
    "Montagem contratada à parte da retirada tradicional",
  ],
  badge: index === 0 ? "entrada da modalidade" : kit.id === "pm-personalizado-montagem" ? "sob medida" : undefined,
}));

export const Route = createFileRoute("/peg-e-monte")({
  head: () => ({
    meta: [
      { title: "Peg & Monte | LHL Festas" },
      { name: "description", content: "Conheça os kits Peg & Monte da LHL Festas: escolha a composição, retire, monte no seu espaço e devolva após a festa." },
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
      title="Seu cenário,"
      highlight="do seu jeito."
      description="No Peg & Monte você escolhe a composição, retira as peças combinadas, monta no local da festa e devolve depois do evento. É a modalidade para quem quer um cenário completo com liberdade para cuidar da montagem."
      heroImage={HERO}
      heroAlt="Decoração Peg & Monte real da LHL Festas"
      catalogHref="/catalogo?m=peg-e-monte&origem=peg-e-monte"
      budgetHref="/orcamento?modalidade=Peg%20%26%20Monte&origem=peg-e-monte"
      facts={[
        { title: "Você monta", text: "A retirada, montagem e devolução fazem parte da dinâmica tradicional do Peg & Monte." },
        { title: "3 kits principais", text: "Essencial, Completo e Premium atendem diferentes tamanhos de cenário." },
        { title: "Peças combinadas", text: "Painéis, cilindros, mesa, suportes, vasos, displays e tapete variam por kit." },
      ]}
      introTitle="Mais cenário, com liberdade para montar onde quiser."
      introText="O Peg & Monte é pensado para quem quer uma decoração estruturada e prefere fazer a montagem no próprio ritmo. A LHL separa o conjunto escolhido e orienta a retirada. Você leva as peças para o local do evento, monta a composição e, depois da festa, devolve conforme o combinado."
      idealFor={[
        "quem quer economizar na mão de obra de montagem",
        "salão de condomínio, casa, chácara ou espaço de festas",
        "quem gosta de montar e organizar a própria decoração",
        "quem quer um cenário com painéis, bases e peças coordenadas",
      ]}
      optionsTitle="Escolha o tamanho do seu cenário."
      optionsIntro="Os kits abaixo são a composição oficial do Peg & Monte. Os itens e escolhas ficam claros antes da reserva; valores são informados manualmente no atendimento."
      options={OPTIONS}
      includesTitle="Peças que transformam o espaço."
      includes={[
        "Painel redondo ou painel romano",
        "Trio de cilindros com capa",
        "Mesa decorativa conforme a opção",
        "Suportes para doces e bolo",
        "Vasos com flores ou buchinhos",
        "Displays de mesa",
        "Display de chão",
        "Tapete",
        "Elementos temáticos conforme disponibilidade",
      ]}
      includesNote="A composição exata depende do kit escolhido. No Completo, por exemplo, há escolhas entre painel e base; no Premium, o cenário recebe mais elementos."
      steps={[
        { title: "Escolha o kit", text: "Veja os cenários e identifique se Essencial, Completo ou Premium atende melhor sua festa." },
        { title: "Reserve", text: "Informe tema e data. A equipe confirma disponibilidade, composição, retirada e devolução." },
        { title: "Retire e monte", text: "Busque os itens no horário combinado e monte a decoração no seu espaço." },
        { title: "Devolva", text: "Após a comemoração, devolva as peças conforme as condições combinadas na reserva." },
      ]}
      gallery={GALLERY}
      galleryTitle="Cenários Peg & Monte montados em diferentes temas."
      faqs={[
        { question: "A LHL monta o Peg & Monte?", answer: "Na modalidade tradicional, não: o cliente retira, monta e devolve. Quando você quer que a LHL faça a montagem no local, isso precisa ser alinhado como serviço de montagem/projeto específico." },
        { question: "Preciso saber montar decoração?", answer: "Não precisa ser profissional. Os kits são pensados para uma montagem prática. A equipe explica a composição e os itens reservados antes da retirada." },
        { question: "Posso trocar painel ou cilindros?", answer: "Alguns kits já possuem escolhas previstas e outras alterações podem ser avaliadas conforme disponibilidade. Tudo é confirmado antes da reserva." },
        { question: "Tem caução?", answer: "As condições de caução, retirada e devolução são informadas no atendimento e registradas na reserva/contrato conforme o kit escolhido." },
      ]}
      closingTitle="Quer montar a festa com suas próprias mãos, mas com um cenário bonito de verdade?"
      closingText="Escolha uma inspiração, informe o tema e a data e deixe a LHL separar a composição certa para você retirar, montar e comemorar."
    />
  );
}
