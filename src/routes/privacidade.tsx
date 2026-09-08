import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | LHL Festas" },
      { name: "description", content: "Saiba como a LHL Festas trata os dados enviados pelo site e suas preferências de privacidade." },
    ],
    links: [{ rel: "canonical", href: "https://www.lhlfestas.com.br/privacidade" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fff8ef] px-5 py-12 text-slate-800">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm sm:p-10">
        <Link to="/" className="text-sm font-semibold text-[#651421]">← Voltar para LHL Festas</Link>
        <h1 className="mt-6 text-3xl font-bold text-[#651421]">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-slate-500">Última atualização: 7 de setembro de 2026.</p>

        <div className="mt-8 space-y-7 leading-7">
          <section><h2 className="text-xl font-semibold">Quais dados usamos</h2><p className="mt-2">Quando você solicita orçamento, atendimento ou reserva, podemos receber os dados que você informa, como nome, telefone, e-mail, dados necessários ao contrato, endereço, informações da festa e mensagens enviadas à nossa equipe.</p></section>
          <section><h2 className="text-xl font-semibold">Para que usamos</h2><p className="mt-2">Usamos esses dados para responder ao atendimento, preparar orçamentos e contratos, organizar reservas, pagamentos, entrega, retirada, montagem e demais etapas necessárias à prestação do serviço.</p></section>
          <section><h2 className="text-xl font-semibold">Medição e campanhas</h2><p className="mt-2">Com sua permissão, ferramentas de analytics e publicidade podem ser carregadas para entendermos a origem dos acessos e o desempenho das campanhas. Se você escolher somente recursos essenciais, essas ferramentas não são iniciadas pelo site.</p></section>
          <section><h2 className="text-xl font-semibold">Compartilhamento</h2><p className="mt-2">Os dados podem ser processados por serviços utilizados para operar o site, atendimento, documentos, armazenamento e gestão do negócio, na medida necessária para essas finalidades. Não comercializamos os dados cadastrais enviados por clientes.</p></section>
          <section><h2 className="text-xl font-semibold">Segurança e retenção</h2><p className="mt-2">Adotamos medidas técnicas para limitar o acesso administrativo e reduzir exposição indevida. Os dados são mantidos pelo período necessário ao atendimento, execução do contrato, cumprimento de obrigações e exercício regular de direitos.</p></section>
          <section><h2 className="text-xl font-semibold">Seus direitos</h2><p className="mt-2">Você pode entrar em contato com a LHL Festas para solicitar informações sobre seus dados, correção, atualização ou demais direitos aplicáveis. Algumas informações podem precisar ser preservadas quando houver obrigação legal, contratual ou necessidade de defesa de direitos.</p></section>
          <section><h2 className="text-xl font-semibold">Contato</h2><p className="mt-2">Para assuntos de privacidade, utilize os canais oficiais de atendimento da LHL Festas informados neste site.</p></section>
        </div>
      </article>
    </main>
  );
}
