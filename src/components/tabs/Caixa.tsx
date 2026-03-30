import { useState } from "react";
import { useKalla } from "@/context/KallaContext";
import { formatBRL } from "@/data/kallaData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import InfoTooltip from "@/components/InfoTooltip";

export default function Caixa() {
  const { totalCF, containers } = useKalla();

  const [meses, setMeses] = useState(4);
  const [numContainers, setNumContainers] = useState(1);
  const [reservaEmergencia, setReservaEmergencia] = useState(20000);

  const totalContainers = containers.reduce((s, c) => s + c.total, 0);
  const custoMedioContainer = containers.length > 0 ? totalContainers / containers.length : 0;

  const operacional = totalCF * meses;
  const containerCusto = custoMedioContainer * numContainers;
  const total = operacional + containerCusto + reservaEmergencia;

  const waterfall = [
    { name: "Operacional", valor: operacional, tipo: "custo" },
    { name: "Containers", valor: containerCusto, tipo: "container" },
    { name: "Emergência", valor: reservaEmergencia, tipo: "reserva" },
  ];

  const getBarColor = (tipo: string) => {
    switch (tipo) {
      case "custo": return "hsl(var(--info))";
      case "container": return "hsl(var(--cyan))";
      case "reserva": return "hsl(var(--warning))";
      default: return "hsl(var(--muted))";
    }
  };

  const cenarios = [
    { label: "Mínimo", meses: 2, cont: 0, emergencia: 10000 },
    { label: "Conservador", meses: 4, cont: 1, emergencia: 20000 },
    { label: "Seguro", meses: 6, cont: 2, emergencia: 30000 },
    { label: "Máximo", meses: 8, cont: 3, emergencia: 50000 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-card-foreground">Meses de reserva</label>
            <span className="text-lg font-bold text-info">{meses}</span>
          </div>
          <input type="range" min={2} max={8} value={meses} onChange={(e) => setMeses(Number(e.target.value))} className="w-full accent-info" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>2</span><span>8</span></div>
        </div>
        <div className="bg-card rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-card-foreground">Containers simultâneos</label>
            <span className="text-lg font-bold text-info">{numContainers}</span>
          </div>
          <input type="range" min={0} max={3} value={numContainers} onChange={(e) => setNumContainers(Number(e.target.value))} className="w-full accent-info" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>0</span><span>3</span></div>
        </div>
        <div className="bg-card rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-card-foreground">Reserva Emergência</label>
            <span className="text-lg font-bold text-info">{formatBRL(reservaEmergencia)}</span>
          </div>
          <input type="range" min={0} max={100000} step={5000} value={reservaEmergencia} onChange={(e) => setReservaEmergencia(Number(e.target.value))} className="w-full accent-info" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>R$ 0</span><span>R$ 100k</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-info">
          <p className="text-xs text-muted-foreground">Operacional ({meses}m) <InfoTooltip text="Custos fixos mensais multiplicados pelo período de reserva. Cobre folha, aluguel, marketing e demais despesas fixas." /></p>
          <p className="text-xl font-bold text-card-foreground">{formatBRL(operacional)}</p>
          <p className="text-xs text-muted-foreground">{formatBRL(totalCF)}/mês</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-cyan">
          <p className="text-xs text-muted-foreground">Containers ({numContainers}×) <InfoTooltip text="Custo médio por container (FOB + internação + tarifas + desembaraço) multiplicado pela quantidade simultânea." /></p>
          <p className="text-xl font-bold text-card-foreground">{formatBRL(containerCusto)}</p>
          <p className="text-xs text-muted-foreground">{formatBRL(custoMedioContainer)}/un</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-warning">
          <p className="text-xs text-muted-foreground">Reserva Emergência <InfoTooltip text="Colchão financeiro para imprevistos como atrasos de container, devoluções ou inadimplência." /></p>
          <p className="text-xl font-bold text-card-foreground">{formatBRL(reservaEmergencia)}</p>
        </div>
        <div className="bg-card rounded-lg p-5 shadow-sm border-2 border-success">
          <p className="text-xs text-muted-foreground font-semibold">TOTAL NECESSÁRIO <InfoTooltip text="Soma do caixa operacional + containers + reserva de emergência. Valor mínimo recomendado em caixa." /></p>
          <p className="text-2xl font-bold text-success">{formatBRL(total)}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-4">📊 Composição do Caixa Necessário</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={waterfall}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatBRL(v)} />
            <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
              {waterfall.map((w, i) => (
                <Cell key={i} fill={getBarColor(w.tipo)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--info))" }} />
            <span className="text-xs text-muted-foreground">Operacional</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--cyan))" }} />
            <span className="text-xs text-muted-foreground">Containers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--warning))" }} />
            <span className="text-xs text-muted-foreground">Emergência</span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-3">🎯 Cenários de Caixa</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cenarios.map((c) => {
            const cTotal = (totalCF * c.meses) + (custoMedioContainer * c.cont) + c.emergencia;
            const isAtual = c.meses === meses && c.cont === numContainers;
            return (
              <button key={c.label}
                onClick={() => { setMeses(c.meses); setNumContainers(c.cont); setReservaEmergencia(c.emergencia); }}
                className={`rounded-lg p-4 text-center transition-all cursor-pointer ${
                  isAtual ? "bg-info/15 ring-2 ring-info" : "bg-secondary hover:bg-secondary/80"
                }`}>
                <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                <p className="text-lg font-bold text-card-foreground">{formatBRL(cTotal)}</p>
                <p className="text-xs text-muted-foreground">{c.meses}m · {c.cont} cont</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-warning/10 rounded-lg p-4 border border-warning/30">
        <p className="text-sm text-foreground">
          💡 Ciclo de importação = 90-120 dias. DRE positiva com caixa temporariamente negativo é normal para importadores. Mantenha reserva para pelo menos 1 ciclo completo.
        </p>
      </div>
    </div>
  );
}
