import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mail, FileText, BellRing, CheckCircle2, ClipboardList,
  PieChart, UserCheck, Wallet, Receipt, PartyPopper, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/instrucoes")({
  head: () => ({
    meta: [
      { title: "Instruções — Fluxo de Pagamento Rosset" },
      { name: "description", content: "Passo a passo do fluxo de pagamento do departamento de e-commerce." },
    ],
  }),
  component: Page,
});

const steps = [
  { n: 1, icon: FileText, title: "Emissão e envio", body: "O fluxo inicia na emissão dos boletos e notas fiscais pelos fornecedores. Eles enviam para cobranca.digital@rosset.com.br e para os pontos focais da área." },
  { n: 2, icon: BellRing, title: "Recebimento e notificação", body: "Após a notificação, cada responsável deve realizar a checagem dos documentos recebidos." },
  { n: 3, icon: CheckCircle2, title: "Checagem das informações", body: "Validar: data de vencimento (mínimo 15 dias do processamento), valor condizente ao negociado e modalidade de rateio (interno ou externo)." },
  { n: 4, icon: ClipboardList, title: "Inserção no formulário", body: "Com tudo conferido, lance os dados no formulário ‘Lançar Despesa’ — ele organiza tudo para o responsável." },
  { n: 5, icon: PieChart, title: "Rateio e checagem final", body: "O responsável faz os devidos rateios entre marcas e envia para Contas a Pagar." },
  { n: 6, icon: UserCheck, title: "Aprovações", body: "A cobrança entra no sistema de pagamentos e inicia o fluxo de aprovação (Gerente/Head → Diretoria)." },
  { n: 7, icon: ClipboardList, title: "Contas a Pagar", body: "Contas a Pagar insere as cobranças no sistema de pagamentos." },
  { n: 8, icon: Wallet, title: "Pagamento", body: "Após todas as aprovações, Contas a Pagar realiza o pagamento do título." },
  { n: 9, icon: Receipt, title: "Comprovantes", body: "Os comprovantes são enviados ao responsável por gerir os pagamentos." },
  { n: 10, icon: PartyPopper, title: "Processo encerrado", body: "Pronto! Encerramos o processo com organização, transparência e parceria." },
];

function Page() {
  return (
    <AppShell title="Instruções">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <Card className="p-8 border-0 text-primary-foreground relative overflow-hidden" style={{ background: "var(--gradient-navy)" }}>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 justify-between">
            <div className="space-y-3 max-w-2xl">
              <div className="text-xs uppercase tracking-[0.3em] opacity-70">Rosset Têxtil</div>
              <h2 className="text-3xl font-semibold tracking-tight">Fluxo de pagamento — passo a passo</h2>
              <p className="text-sm opacity-85">
                Organização, confiança e parceria em cada pagamento. Siga as 10 etapas
                abaixo para garantir um processo limpo e auditável.
              </p>
              <div className="flex items-center gap-2 text-sm bg-white/10 rounded-md px-3 py-2 w-fit">
                <Mail className="h-4 w-4" />
                <span className="font-medium">cobranca.digital@rosset.com.br</span>
              </div>
            </div>
            <Button asChild variant="secondary" size="lg">
              <Link to="/lancar">Lançar despesa <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </div>
        </Card>

        <ol className="relative border-l-2 border-border ml-3 space-y-4">
          {steps.map((s) => (
            <li key={s.n} className="ml-6">
              <span className="absolute -left-[17px] flex items-center justify-center w-8 h-8 rounded-full text-primary-foreground text-xs font-bold shadow-[var(--shadow-elegant)]" style={{ background: "var(--gradient-navy)" }}>
                {s.n}
              </span>
              <Card className="p-5 hover:shadow-[var(--shadow-elegant)] transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-md bg-accent/10 text-accent grid place-items-center shrink-0">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold tracking-tight">{s.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ol>

        <p className="text-center text-sm text-muted-foreground italic">
          ❤ Seguimos juntos, tecendo relações de confiança todos os dias.
        </p>
      </div>
    </AppShell>
  );
}