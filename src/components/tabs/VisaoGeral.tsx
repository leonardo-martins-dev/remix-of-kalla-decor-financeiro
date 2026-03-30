import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, LabelList,
} from "recharts";
import { useKalla } from "@/context/KallaContext";
import { formatBRL, calcMC, calcMCPercent, avgCusto } from "@/data/kallaData";
import InfoTooltip from "@/components/InfoTooltip";

type MesKey = string;

export default function VisaoGeral() {
  const { meses, faturamentoEvolucao, totalCF, totalCFPorCategoria, receitaTotal, produtos, premissas } = useKalla();

  const mesOptions = ["Todos", ...meses.map((m) => m.mes)];
  const [mesSelecionado, setMesSelecionado] = useState<MesKey>(meses.length > 0 ? meses[meses.length - 1].mes : "Todos");

  const getDados = () => {
    if (mesSelecionado === "Todos") {
      const cfMedio = totalCF;
      return { receita: receitaTotal, cf: cfMedio, ebitda: receitaTotal - cfMedio * meses.length };
    }
    const m = meses.find((x) => x.mes === mesSelecionado);
    if (!m) return { receita: 0, cf: totalCF, ebitda: -totalCF };
    const cfMes = Object.values(m.custos).reduce((a, b) => a + b, 0);
    return { receita: m.receita, cf: cfMes, ebitda: m.receita - m.cmv - cfMes };
  };
  const dados = getDados();
  const pe = dados.cf / 0.546;
  const ultimoMes = meses.length > 0 ? meses[meses.length - 1] : null;

  // Custos fixos pizza
  const catColors: Record<string, string> = {
    pessoal: "#3B82F6", predial: "#8B5CF6", marketing: "#06B6D4",
    comercial: "#F59E0B", admin: "#EF4444", logistica: "#10B981",
  };
  const catLabels: Record<string, string> = {
    pessoal: "Pessoal", predial: "Predial", marketing: "Marketing",
    comercial: "Comercial", admin: "Admin", logistica: "Logística",
  };
  const custosFixosPie = Object.entries(totalCFPorCategoria).map(([key, value]) => ({
    name: catLabels[key] || key, value, color: catColors[key] || "#94A3B8",
  }));

  const custosEvolucao = meses.map((m) => ({
    mes: m.mes,
    ...Object.fromEntries(Object.entries(m.custos).map(([k, v]) => [catLabels[k] || k, v])),
  }));

  // MC por linha — computed dynamically from produtos context
  const mcLinhas = produtos.map((p) => {
    const cm = avgCusto(p.custos);
    const mc = calcMC(p.pv, cm, 0, 1, 0, premissas, false);
    const mcPct = calcMCPercent(p.pv, mc);
    return { name: p.name, mc: Number.isFinite(mcPct) ? Math.round(mcPct * 10) / 10 : 0, mcMercado: null as number | null };
  }).sort((a, b) => b.mc - a.mc);

  function getBarColor(mc: number) {
    if (mc > 30) return "#10B981";
    if (mc > 15) return "#3B82F6";
    if (mc > 0) return "#F59E0B";
    return "#EF4444";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-foreground">Período:</label>
        <select value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)}
          className="px-3 py-2 rounded-md border border-border bg-card text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {mesOptions.map((m) => (
            <option key={m} value={m}>{m === "Todos" ? "Todos (acumulado)" : m}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-info">
          <p className="text-sm text-muted-foreground">
            {mesSelecionado === "Todos" ? "Receita Acumulada" : `Receita ${mesSelecionado}`}
            <InfoTooltip text="Soma total do faturamento bruto no período selecionado, com base nos dados importados do Maiô." />
          </p>
          <p className="text-2xl font-bold text-card-foreground">{formatBRL(dados.receita)}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-success">
          <p className="text-sm text-muted-foreground">
            {ultimoMes ? ultimoMes.mes : "—"}
            <InfoTooltip text="Faturamento do mês mais recente importado. Indica a tendência atual de vendas." />
          </p>
          <p className="text-2xl font-bold text-card-foreground">{ultimoMes ? formatBRL(ultimoMes.receita) : "—"}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-destructive">
          <p className="text-sm text-muted-foreground">
            {mesSelecionado === "Todos" ? "CF médio/mês" : `CF ${mesSelecionado}`}
            <InfoTooltip text="Custos Fixos mensais: soma de pessoal, predial, marketing, comercial, admin e logística. Editável na aba Custos." />
          </p>
          <p className="text-2xl font-bold text-card-foreground">{formatBRL(dados.cf)}</p>
        </div>
        <div className={`rounded-lg p-4 shadow-sm border-l-4 ${dados.ebitda >= 0 ? "border-l-success bg-green-50" : "border-l-destructive bg-red-50"}`}>
          <p className="text-sm text-muted-foreground">
            {mesSelecionado === "Todos" ? "EBITDA Acumulado" : `EBITDA ${mesSelecionado}`}
            <InfoTooltip text="Receita menos CMV e Custos Fixos. Indica o lucro operacional antes de impostos, juros e depreciação." />
          </p>
          <p className={`text-2xl font-bold ${dados.ebitda >= 0 ? "text-success" : "text-destructive"}`}>
            {formatBRL(dados.ebitda)}
          </p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-warning">
          <p className="text-sm text-muted-foreground">
            Ponto equilíbrio
            <InfoTooltip text="Faturamento mínimo para cobrir todos os custos fixos, considerando MC média de 54,6%. Abaixo desse valor, a operação gera prejuízo." />
          </p>
          <p className="text-2xl font-bold text-card-foreground">{formatBRL(pe)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4">
            {mesSelecionado === "Todos" ? "📈 Evolução do Faturamento" : `📊 Receita vs Custos — ${mesSelecionado}`}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            {mesSelecionado === "Todos" ? (
              <AreaChart data={faturamentoEvolucao}>
                <defs>
                  <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Area type="monotone" dataKey="valor" stroke="#06B6D4" fill="url(#colorFat)" strokeWidth={2} />
              </AreaChart>
            ) : (
              <BarChart data={[{ name: "Receita", valor: dados.receita }, { name: "Custos Fixos", valor: dados.cf }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  <Cell fill="#10B981" />
                  <Cell fill="#EF4444" />
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4">🥧 Custos Fixos por Categoria</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={custosFixosPie} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false} fontSize={11}>
                {custosFixosPie.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatBRL(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-4">📊 Evolução de Custos por Categoria</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={custosEvolucao}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatBRL(v)} />
            {Object.values(catLabels).map((label) => (
              <Bar key={label} dataKey={label} stackId="custos" fill={catColors[Object.keys(catLabels).find(k => catLabels[k] === label) || ""] || "#94A3B8"} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-2">📊 Margem de Contribuição % por Linha</h3>
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: "#10B981" }} /> Kalla (calculado com preços atuais)</span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={mcLinhas} layout="vertical" margin={{ left: 120, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
            <Tooltip formatter={(v: number | null) => (v != null ? `${v}%` : "—")} />
            <Bar dataKey="mc" name="MC Kalla" radius={[0, 4, 4, 0]} barSize={14}>
              {mcLinhas.map((item, i) => <Cell key={i} fill={getBarColor(item.mc)} />)}
              <LabelList dataKey="mc" position="right" formatter={(v: number) => `${v}%`} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
