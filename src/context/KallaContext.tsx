import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  productLines as defaultProducts,
  CUSTOS_FIXOS_DEFAULT,
  CONTAINERS as defaultContainers,
  PREMISSAS_DEFAULT,
  sumCategory,
  type ProductLine,
} from "@/data/kallaData";

/* ── types ─────────────────────────────────── */

export interface DadosMes {
  mes: string;
  receita: number;
  cmv: number;
  custos: Record<string, number>;
}

export interface ContainerItem {
  id: string;
  invoice?: string;
  mes: string;
  barana: number;
  internacao: number | null;
  tarifas: number;
  desembaraco: number;
  total: number;
  completo: boolean;
}

export interface HistoricoItem {
  data: string;
  tipo: string;
  descricao: string;
  usuario: string;
}

/** Dados de vendas importados do Maiô */
export interface VendasData {
  periodoMin: string;
  periodoMax: string;
  totalPedidos: number;
  totalItens: number;
  receitaBruta: number;
  freteTotal: number;
  resumoMeses: { mes: string; pedidos: number; itens: number; receita: number; cmvReal: number; cmvPct: number }[];
  resumoProdutos: { produto: string; linha: string; qtd: number; receita: number; cmv: number; mcUnit: number }[];
  resumoVendedores: { nome: string; pedidos: number; receita: number; ticketMedio: number }[];
  formasPagamento: { forma: string; pct: number; valor: number }[];
  topClientes: { nome: string; valor: number; pedidos?: number; ultimaCompra?: string }[];
}

type CustosFixos = typeof CUSTOS_FIXOS_DEFAULT;

interface KallaState {
  meses: DadosMes[];
  containers: ContainerItem[];
  produtos: ProductLine[];
  custos: CustosFixos;
  historico: HistoricoItem[];
  premissas: typeof PREMISSAS_DEFAULT;
  vendas: VendasData | null;
}

interface KallaContextType extends KallaState {
  salvarFechamento: (d: DadosMes, sobrescrever?: boolean, usuario?: string) => boolean;
  adicionarContainer: (c: ContainerItem, usuario?: string) => boolean;
  atualizarContainer: (id: string, updates: Partial<ContainerItem>, usuario?: string) => void;
  removerContainer: (id: string, usuario?: string) => void;
  atualizarProduto: (idx: number, updates: Partial<ProductLine>, motivo: string, usuario?: string) => void;
  atualizarCustos: (novos: CustosFixos, usuario?: string) => void;
  adicionarPessoa: (cat: "pessoal", item: { nome: string; valor: number }, usuario?: string) => void;
  removerPessoa: (idx: number, usuario?: string) => void;
  salvarVendas: (data: VendasData, usuario?: string) => void;
  resetar: () => void;
  totalCF: number;
  totalCFPorCategoria: Record<string, number>;
  faturamentoEvolucao: { mes: string; valor: number }[];
  receitaTotal: number;
  ultimoMesFaturamento: number;
}

const KallaContext = createContext<KallaContextType | null>(null);

/* ── defaults ──────────────────────────────── */

const defaultMeses: DadosMes[] = [
  { mes: "Nov/25", receita: 4114, cmv: 1440, custos: { pessoal: 20000, predial: 12000, marketing: 8000, comercial: 5000, admin: 5063, logistica: 5000 } },
  { mes: "Dez/25", receita: 17653, cmv: 6179, custos: { pessoal: 35000, predial: 22000, marketing: 18000, comercial: 10000, admin: 8598, logistica: 8000 } },
  { mes: "Jan/26", receita: 70277, cmv: 24597, custos: { pessoal: 40000, predial: 28000, marketing: 22000, comercial: 13000, admin: 10595, logistica: 10000 } },
  { mes: "Fev/26", receita: 319041, cmv: 111664, custos: { pessoal: 45585, predial: 31363, marketing: 25790, comercial: 16057, admin: 12026, logistica: 9822 } },
];

function migrateContainers(): ContainerItem[] {
  return defaultContainers.map((c) => ({
    ...c,
    invoice: "",
    tarifas: 315,
    desembaraco: 2320,
  }));
}

/* ── localStorage helpers ──────────────────── */

const LS_KEYS = {
  meses: "kalla_meses",
  containers: "kalla_containers",
  produtos: "kalla_produtos",
  custos: "kalla_custos",
  historico: "kalla_historico",
  vendas: "kalla_vendas",
};

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLS(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}

/* ── provider ──────────────────────────────── */

export function KallaProvider({ children }: { children: ReactNode }) {
  const [meses, setMeses] = useState<DadosMes[]>(() => loadLS(LS_KEYS.meses, defaultMeses));
  const [containers, setContainers] = useState<ContainerItem[]>(() => loadLS(LS_KEYS.containers, migrateContainers()));
  const [produtos, setProdutos] = useState<ProductLine[]>(() => loadLS(LS_KEYS.produtos, defaultProducts));
  const [custos, setCustos] = useState<CustosFixos>(() => loadLS(LS_KEYS.custos, CUSTOS_FIXOS_DEFAULT));
  const [historico, setHistorico] = useState<HistoricoItem[]>(() => loadLS(LS_KEYS.historico, []));
  const [vendas, setVendas] = useState<VendasData | null>(() => loadLS(LS_KEYS.vendas, null));
  const [premissas] = useState(PREMISSAS_DEFAULT);

  useEffect(() => { saveLS(LS_KEYS.meses, meses); }, [meses]);
  useEffect(() => { saveLS(LS_KEYS.containers, containers); }, [containers]);
  useEffect(() => { saveLS(LS_KEYS.produtos, produtos); }, [produtos]);
  useEffect(() => { saveLS(LS_KEYS.custos, custos); }, [custos]);
  useEffect(() => { saveLS(LS_KEYS.historico, historico); }, [historico]);
  useEffect(() => { saveLS(LS_KEYS.vendas, vendas); }, [vendas]);

  const addLog = (tipo: string, descricao: string, usuario?: string) => {
    const user = usuario || "Sistema";
    const now = new Date().toLocaleDateString("pt-BR");
    setHistorico((prev) => [{ data: now, tipo, descricao, usuario: user }, ...prev].slice(0, 50));
  };

  type CatKey = keyof CustosFixos;
  const totalCFPorCategoria: Record<string, number> = {};
  (Object.keys(custos) as CatKey[]).forEach((k) => {
    totalCFPorCategoria[k] = sumCategory(custos[k]);
  });
  const totalCF = Object.values(totalCFPorCategoria).reduce((a, b) => a + b, 0);

  const faturamentoEvolucao = meses.map((m) => ({ mes: m.mes, valor: m.receita }));
  const receitaTotal = meses.reduce((s, m) => s + m.receita, 0);
  const ultimoMesFaturamento = meses.length > 0 ? meses[meses.length - 1].receita : 0;

  const salvarFechamento = (d: DadosMes, sobrescrever = false, usuario?: string): boolean => {
    const exists = meses.findIndex((m) => m.mes === d.mes);
    if (exists >= 0 && !sobrescrever) return false;
    setMeses((prev) => {
      const next = exists >= 0 ? prev.map((m, i) => (i === exists ? d : m)) : [...prev, d];
      return next;
    });
    addLog("Fechamento", `${d.mes} — Receita ${formatNum(d.receita)}`, usuario);
    return true;
  };

  const adicionarContainer = (c: ContainerItem, usuario?: string): boolean => {
    if (containers.some((x) => x.id === c.id)) return false;
    setContainers((prev) => [...prev, c]);
    addLog("Container", `${c.id} adicionado`, usuario);
    return true;
  };

  const atualizarContainer = (id: string, updates: Partial<ContainerItem>, usuario?: string) => {
    setContainers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    addLog("Container", `${id} atualizado`, usuario);
  };

  const removerContainer = (id: string, usuario?: string) => {
    setContainers((prev) => prev.filter((c) => c.id !== id));
    addLog("Container", `${id} removido`, usuario);
  };

  const atualizarProduto = (idx: number, updates: Partial<ProductLine>, motivo: string, usuario?: string) => {
    setProdutos((prev) => prev.map((p, i) => (i === idx ? { ...p, ...updates } : p)));
    addLog("Produto", `${produtos[idx]?.name} — ${motivo}`, usuario);
  };

  const atualizarCustos = (novos: CustosFixos, usuario?: string) => {
    setCustos(novos);
    addLog("Custos", "Custos fixos atualizados", usuario);
  };

  const adicionarPessoa = (_cat: "pessoal", item: { nome: string; valor: number }, usuario?: string) => {
    setCustos((prev) => ({
      ...prev,
      pessoal: [...prev.pessoal, item],
    }));
    addLog("Equipe", `${item.nome} adicionado(a)`, usuario);
  };

  const removerPessoa = (idx: number, usuario?: string) => {
    const nome = custos.pessoal[idx]?.nome;
    setCustos((prev) => ({
      ...prev,
      pessoal: prev.pessoal.filter((_, i) => i !== idx),
    }));
    addLog("Equipe", `${nome} removido(a)`, usuario);
  };

  const salvarVendas = (data: VendasData, usuario?: string) => {
    setVendas(data);
    addLog("Vendas", `Dados de vendas importados: ${data.periodoMin} a ${data.periodoMax}`, usuario);
  };

  const resetar = () => {
    setMeses(defaultMeses);
    setContainers(migrateContainers());
    setProdutos(defaultProducts);
    setCustos(CUSTOS_FIXOS_DEFAULT);
    setHistorico([]);
    setVendas(null);
    Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
  };

  return (
    <KallaContext.Provider
      value={{
        meses, containers, produtos, custos, historico, premissas, vendas,
        salvarFechamento, adicionarContainer, atualizarContainer, removerContainer,
        atualizarProduto, atualizarCustos, adicionarPessoa, removerPessoa,
        salvarVendas, resetar,
        totalCF, totalCFPorCategoria, faturamentoEvolucao, receitaTotal, ultimoMesFaturamento,
      }}
    >
      {children}
    </KallaContext.Provider>
  );
}

export function useKalla() {
  const ctx = useContext(KallaContext);
  if (!ctx) throw new Error("useKalla must be inside KallaProvider");
  return ctx;
}

function formatNum(v: number) {
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}
