import { useState } from "react";
import { KallaProvider, useKalla } from "@/context/KallaContext";
import { useAuth } from "@/context/AuthContext";
import { formatBRL } from "@/data/kallaData";
import VisaoGeral from "@/components/tabs/VisaoGeral";
import Produtos from "@/components/tabs/Produtos";
import Custos from "@/components/tabs/Custos";
import Simulador from "@/components/tabs/Simulador";
import Orcamento from "@/components/tabs/Orcamento";
import ContainersTab from "@/components/tabs/ContainersTab";
import Equilibrio from "@/components/tabs/Equilibrio";
import Caixa from "@/components/tabs/Caixa";
import AnaliseVendas from "@/components/tabs/AnaliseVendas";
import Atualizar from "@/components/tabs/Atualizar";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const tabs = [
  { id: "visao", label: "📊 Visão Geral", component: VisaoGeral },
  { id: "produtos", label: "📦 Produtos", component: Produtos },
  { id: "custos", label: "💰 Custos", component: Custos },
  { id: "simulador", label: "🎯 Simulador", component: Simulador },
  { id: "orcamento", label: "📋 Orçamento", component: Orcamento },
  { id: "containers", label: "🚢 Containers", component: ContainersTab },
  { id: "equilibrio", label: "⚖️ Equilíbrio", component: Equilibrio },
  { id: "caixa", label: "🏦 Caixa", component: Caixa },
  { id: "vendas", label: "📈 Vendas", component: AnaliseVendas },
  { id: "atualizar", label: "⚙️ Atualizar", component: Atualizar },
];

function Dashboard() {
  const [activeTab, setActiveTab] = useState("visao");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const ActiveComponent = tabs.find((t) => t.id === activeTab)?.component || VisaoGeral;
  const { receitaTotal } = useKalla();
  const { session, logout } = useAuth();
  const activeLabel = tabs.find((t) => t.id === activeTab)?.label || "";

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-gradient-to-r from-navy to-slate-800 text-primary-foreground px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-[1300px] mx-auto flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold tracking-wide truncate">KALLA DECOR — Central de Gestão</h1>
            <p className="text-cyan text-xs sm:text-sm font-medium">NoPonto Consultoria</p>
          </div>
          <div className="flex items-center gap-4 shrink-0 ml-2">
            <div className="text-right">
              <p className="text-xs opacity-70">Faturamento Total</p>
              <p className="text-lg sm:text-2xl font-bold">{formatBRL(receitaTotal)}</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 border-l border-primary-foreground/20 pl-4">
              <span className="text-[13px] text-primary-foreground">Olá, {session?.nome}</span>
              <button
                onClick={logout}
                className="text-[13px] text-muted-foreground hover:text-primary-foreground transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop nav */}
      <nav aria-label="Navegação principal" className="hidden md:block bg-navy/95 border-b border-primary-foreground/10 overflow-x-auto">
        <div className="max-w-[1300px] mx-auto flex" role="tablist">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary-foreground text-navy rounded-t-md"
                  : "text-gray-300 hover:text-primary-foreground"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile nav */}
      <div className="md:hidden bg-navy/95 border-b border-primary-foreground/10">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-primary-foreground text-sm font-medium">{activeLabel}</span>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button aria-label="Abrir menu de navegação" className="text-primary-foreground p-1.5 rounded hover:bg-primary-foreground/10">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-navy border-primary-foreground/10 w-64 p-0">
              <div className="p-4 border-b border-primary-foreground/10">
                <p className="text-primary-foreground font-bold text-sm">Navegação</p>
              </div>
              <nav aria-label="Menu de navegação mobile" className="flex flex-col py-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`px-4 py-3 text-left text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary-foreground/10 text-primary-foreground border-l-2 border-cyan"
                        : "text-gray-300 hover:text-primary-foreground hover:bg-primary-foreground/5"
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </nav>
              <div className="mt-auto border-t border-primary-foreground/10 p-4">
                <p className="text-primary-foreground text-[13px] mb-2">Olá, {session?.nome}</p>
                <button
                  onClick={logout}
                  className="text-muted-foreground text-[13px] hover:text-primary-foreground transition-colors"
                >
                  Sair
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <main className="flex-1 py-4 sm:py-6 px-2 sm:px-4" role="tabpanel" id={`panel-${activeTab}`}>
        <div className="max-w-[1300px] mx-auto">
          <ActiveComponent onNavigate={setActiveTab} />
        </div>
      </main>

      <footer className="bg-navy text-primary-foreground/60 text-center text-xs sm:text-sm py-3 sm:py-4">
        NoPonto Consultoria — Kalla Decor — Mar/2026
      </footer>
    </div>
  );
}

export default function Index() {
  return (
    <KallaProvider>
      <Dashboard />
    </KallaProvider>
  );
}
