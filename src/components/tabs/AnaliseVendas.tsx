import { useState, useMemo } from "react";
import { useKalla, type VendasData, type ProdutoVendaRow, type PedidoVendaRow } from "@/context/KallaContext";
import { formatBRL, formatBRL2, calcMC, calcMCPercent, avgCusto } from "@/data/kallaData";
import { findSku, SKU_MAP } from "@/data/skuMapping";
import { getCycleRange, getAvailableCycles } from "@/lib/dateUtils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, CartesianGrid,
} from "recharts";
import InfoTooltip from "@/components/InfoTooltip";
import { CalendarDays, Filter, ChevronDown, RefreshCcw } from "lucide-react";

const safe = (v: number) => (Number.isFinite(v) ? v : 0);

const PIE_COLORS = ["#3B82F6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#94A3B8"];

interface AnaliseVendasProps {
  onNavigate?: (tab: string) => void;
}

export default function AnaliseVendas({ onNavigate }: AnaliseVendasProps) {
  const { vendas, produtos, premissas } = useKalla();
  
  // Cutoff settings
  const [cutoffDay, setCutoffDay] = useState(1);
  const [selectedCycleIndex, setSelectedCycleIndex] = useState(-1);

  if (!vendas) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-card rounded-xl p-10 shadow-lg text-center max-w-md">
          <p className="text-5xl mb-4">📈</p>
          <h2 className="text-xl font-bold text-card-foreground mb-2">Nenhum dado de vendas importado ainda</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Vá em ⚙️ Atualizar para importar o relatório do Maiô.
          </p>
          <button
            onClick={() => onNavigate?.("atualizar")}
            className="px-6 py-3 bg-info text-primary-foreground rounded-lg font-medium hover:bg-info/90 transition-colors"
          >
            Ir para Importação
          </button>
        </div>
      </div>
    );
  }

  // Recalculate everything from raw rows if they exist
  const dashboardData = useMemo(() => {
    // Se não tiver dados brutos, volta ao resumo original (retrocompatibilidade)
    if (!vendas.produtosRaw || !vendas.pedidosRaw) {
      return {
        ...vendas,
        periodoLabel: `${vendas.periodoMin} a ${vendas.periodoMax}`,
        filtered: false
      };
    }

    const prodRaw = vendas.produtosRaw;
    const pedRaw = vendas.pedidosRaw;
    
    // Find absolute range
    const allDates = prodRaw.map(p => new Date(p.data)).filter(d => !isNaN(d.getTime()));
    const cycles = getAvailableCycles(allDates, cutoffDay);
    
    let filteredProds = prodRaw;
    let filteredPeds = pedRaw;
    let periodoLabel = `${vendas.periodoMin} a ${vendas.periodoMax}`;

    if (selectedCycleIndex >= 0 && cycles[selectedCycleIndex]) {
      const cycle = cycles[selectedCycleIndex];
      const { startDate, endDate } = getCycleRange(cycle.year, cycle.month, cutoffDay);
      
      periodoLabel = cycle.label;
      const startMs = startDate.getTime();
      const endMs = endDate.getTime();

      filteredProds = prodRaw.filter(p => {
        const d = new Date(p.data).getTime();
        return d >= startMs && d <= endMs;
      });

      const orderNumbers = new Set(filteredProds.map(p => p.numero));
      filteredPeds = pedRaw.filter(p => orderNumbers.has(p.numero));
    }

    // Summarize filtered data
    const totalPedidos = filteredPeds.length;
    const totalItens = filteredProds.reduce((s, p) => s + p.quantidade, 0);
    const receitaBruta = filteredProds.reduce((s, p) => s + p.precoTotal, 0);
    const freteTotal = filteredPeds.reduce((s, p) => s + p.valorFrete, 0);

    // Products
    const prodMap = new Map<string, { produto: string; linha: string; qtd: number; receita: number; cmv: number }>();
    filteredProds.forEach(p => {
      const sku = findSku(p.codigoProduto);
      const key = sku ? sku.skuKalla : p.codigoProduto;
      const existing = prodMap.get(key);
      const rowCmv = sku ? p.quantidade * sku.custoPosto : 0;
      if (existing) {
        existing.qtd += p.quantidade;
        existing.receita += p.precoTotal;
        existing.cmv += rowCmv;
      } else {
        prodMap.set(key, { 
          produto: sku ? sku.produto : p.descricao, 
          linha: sku ? sku.linha : "Outros", 
          qtd: p.quantidade, 
          receita: p.precoTotal, 
          cmv: rowCmv 
        });
      }
    });
    const resumoProdutos = Array.from(prodMap.values())
      .map(p => ({ ...p, mcUnit: p.qtd > 0 ? (p.receita - p.cmv) / p.qtd : 0 }))
      .sort((a, b) => b.receita - a.receita);

    // Vendedores
    const vendMap = new Map<string, { pedidosSet: Set<string>; receita: number }>();
    filteredProds.forEach(p => {
      const rep = p.representante || "Sem representante";
      if (!vendMap.has(rep)) vendMap.set(rep, { pedidosSet: new Set(), receita: 0 });
      const v = vendMap.get(rep)!;
      v.pedidosSet.add(p.numero);
      v.receita += p.precoTotal;
    });
    const resumoVendedores = Array.from(vendMap.entries())
      .map(([nome, d]) => ({ 
        nome, 
        pedidos: d.pedidosSet.size, 
        receita: d.receita, 
        ticketMedio: d.pedidosSet.size > 0 ? d.receita / d.pedidosSet.size : 0 
      }))
      .sort((a, b) => b.receita - a.receita);

    // Payments
    const fpMap = new Map<string, number>();
    filteredPeds.forEach(p => {
      const forma = p.formaPagamento || "Outros";
      fpMap.set(forma, (fpMap.get(forma) || 0) + p.valorTotal);
    });
    const fpTotal = Array.from(fpMap.values()).reduce((a, b) => a + b, 0);
    const formasPagamento = Array.from(fpMap.entries())
      .map(([forma, valor]) => ({ forma, valor, pct: fpTotal > 0 ? Math.round((valor / fpTotal) * 100) : 0 }))
      .sort((a, b) => b.valor - a.valor);

    // Top clients
    const cliMap = new Map<string, number>();
    filteredPeds.forEach(p => { cliMap.set(p.cliente, (cliMap.get(p.cliente) || 0) + p.valorTotal); });
    const topClientes = Array.from(cliMap.entries())
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    return {
      periodoLabel,
      totalPedidos,
      totalItens,
      receitaBruta,
      freteTotal,
      resumoMeses: cycles.map(c => ({ mes: c.label, pedidos: 0, itens: 0, receita: 0, cmvReal: 0, cmvPct: 0 })), // Placeholder
      resumoProdutos,
      resumoVendedores,
      formasPagamento,
      topClientes,
      filtered: selectedCycleIndex >= 0,
      cycles
    };
  }, [vendas, cutoffDay, selectedCycleIndex]);

  const v = dashboardData;
  const ticketMedioGeral = v.totalPedidos > 0 ? v.receitaBruta / v.totalPedidos : 0;

  const linhaMap = new Map<string, number>();
  v.resumoProdutos.forEach((p) => {
    linhaMap.set(p.linha, (linhaMap.get(p.linha) || 0) + p.receita);
  });
  const faturamentoLinha = Array.from(linhaMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
  const fatTotal = faturamentoLinha.reduce((s, f) => s + f.value, 0);
  const linhaPie = faturamentoLinha.map((f) => ({ ...f, pct: fatTotal > 0 ? Math.round((f.value / fatTotal) * 100) : 0 }));

  // Crescimento mensal (Apenas se não estiver filtrado, ou adaptado)
  const mesesComCrescimento = vendas.resumoMeses.map((m, i) => {
    const prev = i > 0 ? vendas.resumoMeses[i - 1].receita : 0;
    const crescimento = prev > 0 ? ((m.receita - prev) / prev) * 100 : 0;
    return { ...m, crescimento: i === 0 ? 0 : Math.round(crescimento) };
  });

  const recorrentes = v.topClientes.length; // Placeholder

  const pixEntry = v.formasPagamento.find((f) => f.forma.toLowerCase().includes("pix"));
  const cartaoEntry = v.formasPagamento.find((f) => f.forma.toLowerCase().includes("cart") || f.forma.toLowerCase().includes("créd"));

  const topProduto = v.resumoProdutos[0];
  const maiorTicket = v.resumoProdutos.length > 0
    ? v.resumoProdutos.reduce((best, p) => (p.qtd > 0 && (p.receita / p.qtd) > (best.receita / (best.qtd || 1)) ? p : best), v.resumoProdutos[0])
    : null;
  const menorMargem = v.resumoProdutos.length > 0
    ? v.resumoProdutos.reduce((worst, p) => {
        const mcPct = p.receita > 0 ? ((p.receita - p.cmv) / p.receita) * 100 : 100;
        const worstMcPct = worst.receita > 0 ? ((worst.receita - worst.cmv) / worst.receita) * 100 : 100;
        return mcPct < worstMcPct ? p : worst;
      }, v.resumoProdutos[0])
    : null;
  
  const cmvTotal = v.resumoProdutos.reduce((s, p) => s + p.cmv, 0);
  const cmvPctGeral = v.receitaBruta > 0 ? (cmvTotal / v.receitaBruta) * 100 : 0;
  const topVendedor = v.resumoVendedores[0];

  return (
    <div className="space-y-6">
      {/* FILTROS DE PERÍODO */}
      <div className="bg-card rounded-lg p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row items-end gap-4">
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <CalendarDays className="w-3 h-3" /> Tipo de Ciclo
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => { setCutoffDay(1); setSelectedCycleIndex(-1); }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${cutoffDay === 1 ? 'bg-navy text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Mês Calendário (1 a 31)
            </button>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <input 
                type="number" min={1} max={31} value={cutoffDay}
                onChange={(e) => {
                  const val = Math.min(31, Math.max(1, Number(e.target.value)));
                  setCutoffDay(val);
                  setSelectedCycleIndex(-1);
                }}
                className="w-12 bg-white rounded-md text-center text-xs font-bold border-none focus:ring-1 focus:ring-navy h-8"
              />
              <span className="flex-1 px-2 py-1.5 text-xs text-slate-500 font-medium">Ciclo customizado</span>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3 h-3" /> Período Selecionado
          </label>
          <select 
            value={selectedCycleIndex}
            onChange={(e) => setSelectedCycleIndex(Number(e.target.value))}
            className="w-full h-10 px-3 rounded-lg border-none bg-slate-100 text-sm font-medium focus:ring-2 focus:ring-navy"
          >
            <option value={-1}>DADOS CONSOLIDADOS (TODO PERÍODO)</option>
            {v.cycles?.map((c, i) => (
              <option key={i} value={i}>{c.label}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => { setCutoffDay(1); setSelectedCycleIndex(-1); }}
          className="h-10 px-4 rounded-lg bg-slate-50 text-slate-500 hover:text-navy hover:bg-white border border-slate-200 transition-all flex items-center gap-2 text-sm font-medium shadow-sm active:scale-95"
        >
          <RefreshCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      {/* SEÇÃO 1 — RESUMO DO PERÍODO */}
      <div className="bg-navy rounded-xl p-5 shadow-lg text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-cyan/20 transition-all duration-700"></div>
        <div className="relative z-10">
          <p className="text-[10px] uppercase font-bold tracking-widest text-cyan/70 mb-1">Análise de Performance</p>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {v.periodoLabel}
            {v.filtered && <span className="text-[10px] bg-cyan/20 text-cyan px-2 py-0.5 rounded-full uppercase tracking-tighter align-middle ml-2">Filtro Ativo</span>}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-info">
          <p className="text-xs text-muted-foreground">Total vendido <InfoTooltip text="Receita bruta total no período importado do Maiô, sem descontar impostos ou custos." /></p>
          <p className="text-xl font-bold text-card-foreground">{formatBRL(v.receitaBruta)}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-success">
          <p className="text-xs text-muted-foreground">Pedidos <InfoTooltip text="Número total de pedidos no período. Pedidos com múltiplos itens contam como um só." /></p>
          <p className="text-xl font-bold text-card-foreground">{v.totalPedidos}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-cyan">
          <p className="text-xs text-muted-foreground">Ticket médio <InfoTooltip text="Receita bruta dividida pelo número de pedidos. Indica o valor médio por compra." /></p>
          <p className="text-xl font-bold text-card-foreground">{formatBRL(safe(ticketMedioGeral))}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-warning">
          <p className="text-xs text-muted-foreground">Itens vendidos <InfoTooltip text="Quantidade total de itens/unidades vendidas no período, somando todos os produtos." /></p>
          <p className="text-xl font-bold text-card-foreground">{v.totalItens.toLocaleString("pt-BR")}</p>
        </div>
      </div>

      {/* SEÇÃO 2 — FATURAMENTO POR PRODUTO */}
      <div className="bg-card rounded-lg p-5 shadow-sm overflow-x-auto">
        <h3 className="font-semibold text-card-foreground mb-3">🏆 Faturamento por Produto</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["#", "Produto", "Qtd", "Receita", "% total", "PV médio", "Custo posto", "MC unit.", "MC%"].map((h) => (
                <th key={h} className="text-left py-2 px-2 text-muted-foreground text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.resumoProdutos.map((p, i) => {
              const pvMedio = p.qtd > 0 ? p.receita / p.qtd : 0;
              const custoUnit = p.qtd > 0 ? p.cmv / p.qtd : 0;
              const pctTotal = v.receitaBruta > 0 ? (p.receita / v.receitaBruta) * 100 : 0;
              const mcPct = p.receita > 0 ? ((p.receita - p.cmv) / p.receita) * 100 : 0;
              return (
                <tr key={p.produto} className="border-b border-border/30">
                  <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 px-2">
                    <span className="font-medium text-foreground">{p.produto}</span>
                    <span className="text-xs text-muted-foreground ml-1">({p.linha})</span>
                  </td>
                  <td className="py-2 px-2 text-foreground">{p.qtd.toFixed(0)}</td>
                  <td className="py-2 px-2 font-semibold text-info">{formatBRL(p.receita)}</td>
                  <td className="py-2 px-2 text-foreground">{safe(pctTotal).toFixed(1)}%</td>
                  <td className="py-2 px-2 text-foreground">{formatBRL2(safe(pvMedio))}</td>
                  <td className="py-2 px-2 text-foreground">{formatBRL2(safe(custoUnit))}</td>
                  <td className={`py-2 px-2 font-semibold ${p.mcUnit >= 0 ? "text-success" : "text-destructive"}`}>{formatBRL2(p.mcUnit)}</td>
                  <td className={`py-2 px-2 font-semibold ${mcPct > 25 ? "text-success" : mcPct > 15 ? "text-info" : "text-warning"}`}>{safe(mcPct).toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SEÇÃO 3 — FATURAMENTO POR LINHA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-3">📊 Receita por Linha</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={faturamentoLinha} layout="vertical" margin={{ left: 100, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={95} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                {faturamentoLinha.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-3">🥧 % por Linha</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={linhaPie} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                label={({ name, pct }) => `${name} ${pct}%`} labelLine={false} fontSize={10}>
                {linhaPie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatBRL(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SEÇÃO 4 — VENDAS POR VENDEDOR */}
      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-3">👥 Vendas por Vendedor</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Vendedor", "Pedidos", "Receita", "Ticket médio", "% total"].map((h) => (
                    <th key={h} className="text-left py-2 px-2 text-muted-foreground text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {v.resumoVendedores.map((vd) => {
                  const pct = v.receitaBruta > 0 ? (vd.receita / v.receitaBruta) * 100 : 0;
                  return (
                    <tr key={vd.nome} className="border-b border-border/30">
                      <td className="py-2 px-2 font-medium text-foreground">{vd.nome}</td>
                      <td className="py-2 px-2 text-foreground">{vd.pedidos}</td>
                      <td className="py-2 px-2 font-semibold text-info">{formatBRL(vd.receita)}</td>
                      <td className="py-2 px-2 text-foreground">{formatBRL(vd.ticketMedio)}</td>
                      <td className="py-2 px-2 text-foreground">{safe(pct).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={v.resumoVendedores}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Bar dataKey="receita" radius={[4, 4, 0, 0]} barSize={24}>
                {v.resumoVendedores.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SEÇÃO 5 — VENDAS POR MÊS */}
      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-3">📅 Vendas por Mês</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={mesesComCrescimento}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatBRL(v)} />
            <Bar dataKey="receita" radius={[4, 4, 0, 0]}>
              {mesesComCrescimento.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Mês", "Pedidos", "Receita", "CMV real", "CMV%", "Crescimento"].map((h) => (
                  <th key={h} className="text-left py-2 px-2 text-muted-foreground text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mesesComCrescimento.map((m) => (
                <tr key={m.mes} className="border-b border-border/30">
                  <td className="py-2 px-2 font-medium text-foreground">{m.mes}</td>
                  <td className="py-2 px-2 text-foreground">{m.pedidos}</td>
                  <td className="py-2 px-2 font-semibold text-info">{formatBRL(m.receita)}</td>
                  <td className="py-2 px-2 text-foreground">{formatBRL(m.cmvReal)}</td>
                  <td className="py-2 px-2 text-muted-foreground">{m.cmvPct.toFixed(1)}%</td>
                  <td className={`py-2 px-2 font-semibold ${m.crescimento > 0 ? "text-success" : m.crescimento < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {m.crescimento > 0 ? "+" : ""}{m.crescimento}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEÇÃO 6 — ANÁLISE DE CLIENTES */}
      <div className="bg-card rounded-lg p-5 shadow-sm overflow-x-auto">
        <h3 className="font-semibold text-card-foreground mb-3">👤 Análise de Clientes</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Cliente", "Receita", "Recorrente?"].map((h) => (
                <th key={h} className="text-left py-2 px-2 text-muted-foreground text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.topClientes.map((c) => (
              <tr key={c.nome} className="border-b border-border/30">
                <td className="py-2 px-2 font-medium text-foreground">{c.nome}</td>
                <td className="py-2 px-2 font-semibold text-info">{formatBRL(c.valor)}</td>
                <td className="py-2 px-2">
                  {(c.pedidos || 1) > 1 ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-success">Sim</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-muted-foreground">Não</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SEÇÃO 7 — FORMAS DE PAGAMENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-3">💳 Formas de Pagamento</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={v.formasPagamento.map((f) => ({ name: f.forma, value: f.valor }))}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  strokeWidth={2}
                >
                  {v.formasPagamento.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatBRL(val)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 min-w-0 flex-1">
              {v.formasPagamento.map((f, i) => (
                <div key={f.forma} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{f.forma}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBRL(f.valor)} ({f.pct}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-5 shadow-sm flex items-center">
          <div className="space-y-3 w-full">
            {v.formasPagamento.map((f) => (
              <div key={f.forma} className="flex items-center gap-3">
                <div className="flex-1 bg-secondary rounded-full h-5 overflow-hidden">
                  <div className="h-full bg-info/60 rounded-full" style={{ width: `${f.pct}%` }} />
                </div>
                <span className="text-xs text-foreground w-32 text-right truncate">{f.forma}</span>
                <span className="text-xs font-bold text-foreground w-12 text-right">{f.pct}%</span>
              </div>
            ))}
            {(pixEntry || cartaoEntry) && (
              <div className="bg-blue-50 rounded-lg p-3 border border-info/20 mt-3">
                <p className="text-xs text-foreground">
                  {pixEntry && <>💡 PIX representa <strong>{pixEntry.pct}%</strong> das vendas — taxa zero. </>}
                  {cartaoEntry && <>Cartão representa <strong>{cartaoEntry.pct}%</strong> — taxa 2,44%.</>}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO 8 — ALERTAS E INSIGHTS */}
      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-3">💡 Alertas e Insights</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topProduto && (
            <div className="bg-green-50 rounded-lg p-3 border border-success/20">
              <p className="text-sm text-foreground">
                🏆 Produto mais vendido: <strong>{topProduto.produto}</strong> com {topProduto.qtd.toFixed(0)} un e {formatBRL(topProduto.receita)}
              </p>
            </div>
          )}
          {maiorTicket && maiorTicket.qtd > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 border border-info/20">
              <p className="text-sm text-foreground">
                💰 Maior ticket médio: <strong>{maiorTicket.produto}</strong> a {formatBRL2(maiorTicket.receita / maiorTicket.qtd)}/un
              </p>
            </div>
          )}
          {menorMargem && menorMargem.receita > 0 && (
            <div className="bg-yellow-50 rounded-lg p-3 border border-warning/20">
              <p className="text-sm text-foreground">
                ⚠ Menor margem: <strong>{menorMargem.produto}</strong> com MC de {((menorMargem.receita - menorMargem.cmv) / menorMargem.receita * 100).toFixed(1)}%
              </p>
            </div>
          )}
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <p className="text-sm text-foreground">
              📊 CMV real: <strong>{cmvPctGeral.toFixed(1)}%</strong> vs estimativa anterior de 35% — diferença de {Math.abs(cmvPctGeral - 35).toFixed(1)} pp
            </p>
          </div>
          <div className="bg-cyan-50 rounded-lg p-3 border border-cyan/20">
            <p className="text-sm text-foreground">
              🔄 Clientes recorrentes: <strong>{recorrentes}</strong> de {v.topClientes.length} ({v.topClientes.length > 0 ? ((recorrentes / v.topClientes.length) * 100).toFixed(0) : 0}%)
            </p>
          </div>
          {topVendedor && (
            <div className="bg-green-50 rounded-lg p-3 border border-success/20">
              <p className="text-sm text-foreground">
                👤 Vendedor destaque: <strong>{topVendedor.nome}</strong> com {formatBRL(topVendedor.receita)} em {topVendedor.pedidos} pedidos
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
