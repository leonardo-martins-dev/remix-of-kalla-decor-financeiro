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
import Usuarios from "@/components/tabs/Usuarios";
import { 
  Menu, LayoutDashboard, Package, CircleDollarSign, Target, 
  ClipboardList, Ship, Scale, Wallet, TrendingUp, Settings, LogOut, Shield
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const tabs = [
  { id: "visao", label: "Visão Geral", icon: LayoutDashboard, component: VisaoGeral },
  { id: "produtos", label: "Produtos", icon: Package, component: Produtos },
  { id: "custos", label: "Custos", icon: CircleDollarSign, component: Custos },
  { id: "simulador", label: "Simulador", icon: Target, component: Simulador },
  { id: "orcamento", label: "Orçamento", icon: ClipboardList, component: Orcamento },
  { id: "containers", label: "Containers", icon: Ship, component: ContainersTab },
  { id: "equilibrio", label: "Equilíbrio", icon: Scale, component: Equilibrio },
  { id: "caixa", label: "Caixa", icon: Wallet, component: Caixa },
  { id: "vendas", label: "Vendas", icon: TrendingUp, component: AnaliseVendas },
  { id: "atualizar", label: "Atualizar", icon: Settings, component: Atualizar },
  { id: "usuarios", label: "Usuários", icon: Shield, component: Usuarios },
];

function DashboardSidebar({ activeTab, onTabChange, isMobile = false, allowedTabs }: { activeTab: string, onTabChange: (id: string) => void, isMobile?: boolean, allowedTabs: typeof tabs }) {
  const { session, logout } = useAuth();
  
  return (
    <div className={`flex flex-col h-full bg-white border-r border-slate-200 ${isMobile ? 'w-full' : 'w-64'}`}>
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
          KALLA DECOR
        </h1>
        <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-1">Gestão Financeira</p>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {allowedTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? "bg-slate-100 text-navy shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-navy' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 mt-auto border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-2">
          <p className="text-sm font-medium text-slate-900 truncate">Olá, {session?.nome}</p>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors w-full"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair da plataforma
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { session } = useAuth();
  
  const allowedTabs = tabs.filter(t => {
    if (session?.perfil === "admin" || session?.perfil === "financeiro") return true;
    if (session?.perfil === "consultor") return ["simulador", "orcamento"].includes(t.id);
    return false;
  });

  const defaultTab = allowedTabs.length > 0 ? allowedTabs[0].id : "simulador";
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const ActiveComponent = allowedTabs.find((t) => t.id === activeTab)?.component || (allowedTabs[0]?.component || Simulador);
  const { receitaTotal } = useKalla();
  const activeLabel = allowedTabs.find((t) => t.id === activeTab)?.label || "";

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50/50">
      {/* Sidebar Desktop */}
      <aside className="hidden md:block z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} allowedTabs={allowedTabs} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Header Mobile & Global Faturamento */}
        <header className="bg-white/70 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 sm:px-8 py-4">
            <div className="flex items-center gap-3">
              {/* Menu Mobile Trigger */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <Menu className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 border-none">
                  <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} isMobile allowedTabs={allowedTabs} />
                </SheetContent>
              </Sheet>

              <div>
                <h2 className="text-lg font-semibold text-slate-900 hidden sm:block">{activeLabel}</h2>
                <h2 className="text-base font-semibold text-slate-900 sm:hidden">Kalla Decor</h2>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Faturamento Total</p>
                <p className="text-lg sm:text-xl font-bold text-navy">{formatBRL(receitaTotal)}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Title for mobile since it's hidden in header to save space */}
            <h1 className="text-2xl font-bold text-slate-900 sm:hidden mb-6">{activeLabel}</h1>
            
            <ActiveComponent onNavigate={setActiveTab} />
          </div>
        </main>
      </div>
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
