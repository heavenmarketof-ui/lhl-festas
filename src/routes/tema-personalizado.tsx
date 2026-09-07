import { createFileRoute } from "@tanstack/react-router";
import ModalidadeLanding from "@/components/public/ModalidadeLanding";

const driveImage = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1600`;

const HERO = driveImage("12OGmQ4DEVI3ADHVu7weFGLDreXw49IIi");
const GALLERY = [
  HERO,
  driveImage("1JctWsVWkfUZ8pHNdfT4szvCyKwbiU5Vf"),
  driveImage("1YJUA1G3Qn2uwfSWn__iAbTWKDd-eMjTu"),
  driveImage("1W6FsO5SegUa7yPvQmfuNinGkpZ4gYP-V"),
];

export const Route = createFileRoute("/tema-personalizado")({
  head: () => ({
    meta: [
      { title: "Tema Personalizado | LHL Festas" },
      { name: "description", content: "Envie sua ideia ou referência e solicite uma proposta de tema personalizado com a LHL Festas." },
      { property: "og:title", content: "Tema Personalizado | LHL Festas" },
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
      eyebrow="Tema Personalizado"
      title="Uma ideia só sua, transformada em"
      highlight="uma festa especial."
      description="Se você não encontrou exatamente o que procura no catálogo, envie sua inspiração. Nossa equipe analisa a proposta e monta um orçamento personalizado para o seu evento."
      heroImage={HERO}
      heroAlt="Decoração personalizada da LHL Festas"
      catalogHref="/catalogo?origem=tema-personalizado"
      budgetHref="/orcamento?tipoSolicitacao=tema-personalizado&origem=tema-personalizado"
      bullets={[
        "Você pode enviar uma ideia, imagem de referência, cores ou estilo desejado.",
        "A proposta é analisada conforme o tipo de festa e a disponibilidade dos itens.",
        "Podemos combinar peças do acervo com elementos criados para o seu projeto.",
        "O valor é definido após a análise da proposta e não aparece automaticamente no site.",
      ]}
      steps={[
        { title: "Conte sua ideia", text: "Envie o tema, estilo, cores ou uma imagem que represente o que você imaginou." },
        { title: "Analisamos", text: "A equipe verifica a melhor composição e a viabilidade para a data do evento." },
        { title: "Receba a proposta", text: "Preparamos o orçamento e alinhamos os detalhes com você pelo WhatsApp." },
        { title: "Confirme", text: "Com a proposta aprovada, seguimos para a reserva e os próximos combinados." },
      ]}
      gallery={GALLERY}
      closingTitle="Tem uma referência diferente? Pode mandar para a gente."
      closingText="No orçamento você pode anexar uma imagem e explicar sua ideia. Assim nossa equipe entende melhor o que você procura antes de preparar a proposta."
    />
  );
}
