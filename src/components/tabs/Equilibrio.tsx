import { useState } from "react";
import { useKalla } from "@/context/KallaContext";
import { formatBRL } from "@/data/kallaData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LineChart, Line, CartesianGrid, Legend } from "recharts";
import InfoTooltip from "@/components/InfoTooltip";

export default function Equilibrio() {
  const { totalCF: totalCFBase, faturamentoEvolucao, ultimoMesFaturamento } = useKalla();

  const [mcSlider, setMcSlider] = useState(54.6);
  const [cfAjuste, setCfAjuste] = useState(0);
  const [crescimento, setCrescimento] = useState(30);

  const totalCF = totalCFBase + cfAjuste;
  const pe = totalCF / (mcSlider / 100);
  const fev = ultimoMesFaturamento;
  const ratio = pe > 0 ? fev / pe : 0;
  const acima = ratio >= 1;
  const margemSeguranca = acima ? ((fev - pe) / fev * 100) : 0;
  const lucroEstimado = fev - totalCF - (fev * (1 - mcSlider / 100));

  const projecao = Array.from({ length: 6 }, (_, i) => {
    const fatorCrescimento = Math.pow(1 + crescimento / 100, i);
    const fatProj = fev * fatorCrescimento;
    return {
      mes: `Mês ${i + 1}`,
      faturamento: Math.round(fatProj),
      pe: Math.round(pe),
      lucro: Math.round(fatProj * (mcSlider / 100) - totalCF),
    };
  });

  const sensibilidade = [
    { label: "MC 45%", pe: totalCF / 0.45 },
    { label: "MC 50%", pe: totalCF / 0.50 },
    { label: "MC 55%", pe: totalCF / 0.55 },
    { label: "MC 60%", pe: totalCF / 0.60 },
    { label: "CF -10k", pe: (totalCF - 10000) / (mcSlider / 100) },
    { label: "CF -20k", pe: (totalCF - 20000) / (mcSlider / 100) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-5 shadow-sm">
          <p className="text-xs text-muted-foreground mb-1">CF/mês (da aba Custos)</p>
          <p className="text-xl font-bold text-card-foreground">{formatBRL(totalCFBase)}</p>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-card-foreground">Ajuste CF</label>
              <span className="text-sm font-bold text-info">{cfAjuste >= 0 ? "+" : ""}{formatBRL(cfAjuste)}</span>
            </div>
            <input type="range" min={-30000} max={30000} step={1000} value={cfAjuste} onChange={(e) => setCfAjuste(Number(e.target.value))}
              className="w-full accent-info" />
            <p className="text-xs text-muted-foreground mt-1">CF ajustado: {formatBRL(totalCF)}</p>
          </div>
        </div>

        <div className="bg-card rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-card-foreground">MC%</label>
            <span className="text-lg font-bold text-info">{mcSlider.toFixed(1)}%</span>
          </div>
          <input type="range" min={10} max={70} step={0.5} value={mcSlider} onChange={(e) => setMcSlider(Number(e.target.value))}
            className="w-full accent-info" />
        </div>

        <div className="bg-card rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-card-foreground">Crescimento mensal</label>
            <span className="text-lg font-bold text-info">{crescimento}%</span>
          </div>
          <input type="range" min={-20} max={100} step={5} value={crescimento} onChange={(e) => setCrescimento(Number(e.target.value))}
            className="w-full accent-info" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-info">
          <p className="text-xs text-muted-foreground">Ponto de Equilíbrio <InfoTooltip text="Faturamento mínimo mensal para cobrir todos os custos fixos. Calculado como CF ÷ MC%." /></p>
          <p className="text-xl font-bold text-card-foreground">{formatBRL(pe)}</p>
        </div>
        <div className={`rounded-lg p-4 shadow-sm border-l-4 ${acima ? "border-l-success" : "border-l-destructive"}`}>
          <p className="text-xs text-muted-foreground">Último mês vs PE <InfoTooltip text="Razão entre faturamento do último mês e o PE. Acima de 1× significa que a empresa está operando acima do equilíbrio." /></p>
          <p className="text-xl font-bold text-card-foreground">{ratio.toFixed(2)}× {acima ? "✓" : "✗"}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-cyan">
          <p className="text-xs text-muted-foreground">Margem de Segurança <InfoTooltip text="Percentual do faturamento que excede o PE. Quanto maior, mais protegida a empresa está contra queda nas vendas." /></p>
          <p className="text-xl font-bold text-card-foreground">{margemSeguranca.toFixed(1)}%</p>
        </div>
        <div className={`rounded-lg p-4 shadow-sm border-l-4 ${lucroEstimado >= 0 ? "border-l-success" : "border-l-destructive"}`}>
          <p className="text-xs text-muted-foreground">Lucro Estimado <InfoTooltip text="Estimativa de lucro operacional: Faturamento × MC% menos Custos Fixos. Não inclui impostos sobre resultado." /></p>
          <p className="text-xl font-bold text-card-foreground">{formatBRL(lucroEstimado)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4">📊 Faturamento Real vs PE</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={faturamentoEvolucao}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <ReferenceLine y={pe} stroke="hsl(var(--destructive))" strokeDasharray="5 5"
                label={{ value: `PE ${formatBRL(pe)}`, fill: "hsl(var(--destructive))", fontSize: 11 }} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {faturamentoEvolucao.map((f, i) => (
                  <Cell key={i} fill={f.valor >= pe ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-card-foreground mb-4">📈 Projeção {crescimento}% a.m.</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={projecao}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Legend />
              <Line type="monotone" dataKey="faturamento" stroke="hsl(var(--info))" strokeWidth={2} name="Faturamento" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="pe" stroke="hsl(var(--destructive))" strokeDasharray="5 5" strokeWidth={1.5} name="PE" dot={false} />
              <Line type="monotone" dataKey="lucro" stroke="hsl(var(--success))" strokeWidth={2} name="Lucro" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-3">📋 Análise de Sensibilidade</h3>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {sensibilidade.map((s) => {
            const sRatio = fev / s.pe;
            return (
              <div key={s.label} className={`rounded-lg p-3 text-center ${sRatio >= 1 ? "bg-success/10" : "bg-destructive/10"}`}>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold text-card-foreground">{formatBRL(s.pe)}</p>
                <p className={`text-xs font-medium ${sRatio >= 1 ? "text-success" : "text-destructive"}`}>
                  {sRatio.toFixed(2)}×
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
