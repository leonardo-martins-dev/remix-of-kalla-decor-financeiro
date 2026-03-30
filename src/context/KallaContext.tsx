import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  productLines as defaultProducts,
  CUSTOS_FIXOS_DEFAULT,
  CONTAINERS as defaultContainers,
  PREMISSAS_DEFAULT,
  sumCategory,
  type ProductLine,
} from "@/data/kallaData";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

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
  dbReady: boolean;
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

/* ── Supabase data loaders ──────────────────── */

async function loadMesesFromDB(): Promise<DadosMes[] | null> {
  const { data, error } = await supabase
    .from("fechamentos_mensais")
    .select("mes, receita, cmv, custos")
    .order("created_at", { ascending: true });
  if (error || !data) return null;
  return data.map((r) => ({
    mes: r.mes,
    receita: Number(r.receita),
    cmv: Number(r.cmv),
    custos: r.custos as Record<string, number>,
  }));
}

async function loadContainersFromDB(): Promise<ContainerItem[] | null> {
  const { data, error } = await supabase
    .from("containers")
    .select("*")
    .order("created_at", { ascending: true });
  if (error || !data) return null;
  return data.map((r) => ({
    id: r.id,
    invoice: r.invoice || "",
    mes: r.mes,
    barana: Number(r.barana),
    internacao: r.internacao != null ? Number(r.internacao) : null,
    tarifas: Number(r.tarifas),
    desembaraco: Number(r.desembaraco),
    total: Number(r.total),
    completo: r.completo,
  }));
}

async function loadProdutosFromDB(): Promise<ProductLine[] | null> {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .order("id", { ascending: true });
  if (error || !data) return null;
  return data.map((r) => ({
    name: r.name,
    material: r.material,
    custos: r.custos as number[],
    pv: Number(r.pv),
    pm: Number(r.pm),
    pvB2B: Number(r.pv_b2b),
    pedMin: Number(r.ped_min),
    frete: Number(r.frete),
    embalUn: Number(r.embal_un),
    skus: r.skus as string[],
    mercadoB2C: r.mercado_b2c || "",
    mercadoB2B: r.mercado_b2b || "",
    posicao: r.posicao || "",
    concorrentes: r.concorrentes as { nome: string; preco: number }[],
    specs: r.specs as string[] | undefined,
  }));
}

async function loadCustosFromDB(): Promise<CustosFixos | null> {
  const { data, error } = await supabase
    .from("custos_fixos")
    .select("data")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  return data.data as CustosFixos;
}

async function loadHistoricoFromDB(): Promise<HistoricoItem[]> {
  const { data, error } = await supabase
    .from("historico")
    .select("data, tipo, descricao, usuario")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data;
}

async function loadVendasFromDB(): Promise<VendasData | null> {
  const { data, error } = await supabase
    .from("vendas_data")
    .select("data")
    .order("imported_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  return data.data as VendasData;
}

/* ── Supabase data writers ──────────────────── */

async function addLogToDB(tipo: string, descricao: string, usuario: string) {
  const now = new Date().toLocaleDateString("pt-BR");
  await supabase.from("historico").insert({ data: now, tipo, descricao, usuario });
}

/* ── provider ──────────────────────────────── */

export function KallaProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [meses, setMeses] = useState<DadosMes[]>(defaultMeses);
  const [containers, setContainers] = useState<ContainerItem[]>(migrateContainers());
  const [produtos, setProdutos] = useState<ProductLine[]>(defaultProducts);
  const [custos, setCustos] = useState<CustosFixos>(CUSTOS_FIXOS_DEFAULT);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [vendas, setVendas] = useState<VendasData | null>(null);
  const [premissas] = useState(PREMISSAS_DEFAULT);
  const [dbReady, setDbReady] = useState(false);

  // Carregar dados do Supabase ao montar
  useEffect(() => {
    async function loadAll() {
      const [dbMeses, dbContainers, dbProdutos, dbCustos, dbHistorico, dbVendas] = await Promise.all([
        loadMesesFromDB(),
        loadContainersFromDB(),
        loadProdutosFromDB(),
        loadCustosFromDB(),
        loadHistoricoFromDB(),
        loadVendasFromDB(),
      ]);
      if (dbMeses && dbMeses.length > 0) setMeses(dbMeses);
      if (dbContainers && dbContainers.length > 0) setContainers(dbContainers);
      if (dbProdutos && dbProdutos.length > 0) setProdutos(dbProdutos);
      if (dbCustos) setCustos(dbCustos);
      if (dbHistorico.length > 0) setHistorico(dbHistorico);
      if (dbVendas) setVendas(dbVendas);
      setDbReady(true);
    }
    loadAll();
  }, []);

  const currentUser = session?.nome || "Sistema";

  const addLog = useCallback((tipo: string, descricao: string, usuario?: string) => {
    const user = usuario || currentUser;
    const now = new Date().toLocaleDateString("pt-BR");
    setHistorico((prev) => [{ data: now, tipo, descricao, usuario: user }, ...prev].slice(0, 50));
    addLogToDB(tipo, descricao, user);
  }, [currentUser]);

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
    // Sincronizar com Supabase
    if (exists >= 0) {
      supabase.from("fechamentos_mensais")
        .update({ receita: d.receita, cmv: d.cmv, custos: d.custos })
        .eq("mes", d.mes)
        .then();
    } else {
      supabase.from("fechamentos_mensais")
        .insert({ mes: d.mes, receita: d.receita, cmv: d.cmv, custos: d.custos, created_by: session?.supabaseUserId })
        .then();
    }
    addLog("Fechamento", `${d.mes} — Receita ${formatNum(d.receita)}`, usuario);
    return true;
  };

  const adicionarContainer = (c: ContainerItem, usuario?: string): boolean => {
    if (containers.some((x) => x.id === c.id)) return false;
    setContainers((prev) => [...prev, c]);
    supabase.from("containers").insert({
      id: c.id, invoice: c.invoice || "", mes: c.mes, barana: c.barana,
      internacao: c.internacao, tarifas: c.tarifas, desembaraco: c.desembaraco,
      total: c.total, completo: c.completo,
    }).then();
    addLog("Container", `${c.id} adicionado`, usuario);
    return true;
  };

  const atualizarContainer = (id: string, updates: Partial<ContainerItem>, usuario?: string) => {
    setContainers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    const dbUpdates: Record<string, unknown> = { ...updates };
    // Map camelCase to snake_case (não necessário aqui porque os nomes já são iguais)
    supabase.from("containers").update(dbUpdates).eq("id", id).then();
    addLog("Container", `${id} atualizado`, usuario);
  };

  const removerContainer = (id: string, usuario?: string) => {
    setContainers((prev) => prev.filter((c) => c.id !== id));
    supabase.from("containers").delete().eq("id", id).then();
    addLog("Container", `${id} removido`, usuario);
  };

  const atualizarProduto = (idx: number, updates: Partial<ProductLine>, motivo: string, usuario?: string) => {
    setProdutos((prev) => {
      const next = prev.map((p, i) => (i === idx ? { ...p, ...updates } : p));
      // Supabase sync — usando o ID do banco (idx + 1 porque serial começa em 1)
      const produto = next[idx];
      if (produto) {
        supabase.from("produtos").update({
          name: produto.name, material: produto.material, custos: produto.custos,
          pv: produto.pv, pm: produto.pm, pv_b2b: produto.pvB2B,
          ped_min: produto.pedMin, frete: produto.frete, embal_un: produto.embalUn,
          skus: produto.skus, mercado_b2c: produto.mercadoB2C, mercado_b2b: produto.mercadoB2B,
          posicao: produto.posicao, concorrentes: produto.concorrentes, specs: produto.specs || null,
          updated_at: new Date().toISOString(),
        }).eq("id", idx + 1).then();
      }
      return next;
    });
    addLog("Produto", `${produtos[idx]?.name} — ${motivo}`, usuario);
  };

  const atualizarCustos = (novos: CustosFixos, usuario?: string) => {
    setCustos(novos);
    supabase.from("custos_fixos").insert({
      data: novos,
      updated_by: session?.supabaseUserId,
    }).then();
    addLog("Custos", "Custos fixos atualizados", usuario);
  };

  const adicionarPessoa = (_cat: "pessoal", item: { nome: string; valor: number }, usuario?: string) => {
    setCustos((prev) => {
      const novos = {
        ...prev,
        pessoal: [...prev.pessoal, item],
      };
      supabase.from("custos_fixos").insert({
        data: novos,
        updated_by: session?.supabaseUserId,
      }).then();
      return novos;
    });
    addLog("Equipe", `${item.nome} adicionado(a)`, usuario);
  };

  const removerPessoa = (idx: number, usuario?: string) => {
    const nome = custos.pessoal[idx]?.nome;
    setCustos((prev) => {
      const novos = {
        ...prev,
        pessoal: prev.pessoal.filter((_, i) => i !== idx),
      };
      supabase.from("custos_fixos").insert({
        data: novos,
        updated_by: session?.supabaseUserId,
      }).then();
      return novos;
    });
    addLog("Equipe", `${nome} removido(a)`, usuario);
  };

  const salvarVendas = (data: VendasData, usuario?: string) => {
    setVendas(data);
    supabase.from("vendas_data").insert({
      data: data as unknown as Record<string, unknown>,
      imported_by: session?.supabaseUserId,
    }).then();
    addLog("Vendas", `Dados de vendas importados: ${data.periodoMin} a ${data.periodoMax}`, usuario);
  };

  const resetar = () => {
    setMeses(defaultMeses);
    setContainers(migrateContainers());
    setProdutos(defaultProducts);
    setCustos(CUSTOS_FIXOS_DEFAULT);
    setHistorico([]);
    setVendas(null);
  };

  return (
    <KallaContext.Provider
      value={{
        meses, containers, produtos, custos, historico, premissas, vendas, dbReady,
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
