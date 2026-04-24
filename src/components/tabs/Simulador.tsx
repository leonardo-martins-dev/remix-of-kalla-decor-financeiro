import { useState } from "react";
import { useKalla } from "@/context/KallaContext";
import { avgCusto, formatBRL, formatBRL2 } from "@/data/kallaData";
import InfoTooltip from "@/components/InfoTooltip";

const safe = (v: number) => (Number.isFinite(v) ? v : 0);

const DESCONTO_ALERTA_POR_PRODUTO: Record<string, number> = {
  "Mármore Flexível": 15,
  "Deck WPC": 12,
  "Madeira Ecológica": 12,
  "Piso SPC Click": 10,
  "Pedra Leve": 10,
  "Rev. Texturizado": 8,
  "Ripado WPC": 8,
  "Cobogó/3D": 5,
};

function getBadge(mcPct: number) {
  if (mcPct > 25) return { label: "SAUDÁVEL", cls: "bg-green-100 text-success border-success/30" };
  if (mcPct > 15) return { label: "ATENÇÃO", cls: "bg-yellow-100 text-warning border-warning/30" };
  if (mcPct > 0) return { label: "CRÍTICO", cls: "bg-orange-100 text-orange-600 border-orange-300" };
  return { label: "PREJUÍZO", cls: "bg-red-100 text-destructive border-destructive/30" };
}

export default function Simulador() {
  const { produtos, premissas } = useKalla();
  const [lineIdx, setLineIdx] = useState(0);
  const [desconto, setDesconto] = useState(0);
  const [isB2B, setIsB2B] = useState(false);

  const line = produtos[lineIdx];
  const custoMedio = avgCusto(line.custos);
  const comissao = isB2B ? premissas.comissaoB2B : premissas.comissaoB2C;
  const pvBase = isB2B ? line.pvB2B : line.pv;
  const pvFinal = safe(pvBase * (1 - desconto / 100));

  const mc = safe(pvFinal - (pvFinal * premissas.das) - (pvFinal * premissas.taxaCartao) - (pvFinal * comissao) - custoMedio);
  const mcPct = safe(pvFinal > 0 ? (mc / pvFinal) * 100 : 0);
  const receitaLiquida = safe(pvFinal - (pvFinal * premissas.das) - (pvFinal * premissas.taxaCartao) - (pvFinal * comissao));
  const badge = getBadge(mcPct);
  const limiteAlertaDesconto = DESCONTO_ALERTA_POR_PRODUTO[line.name] ?? 40;
  const descontoHex = desconto <= 25 ? "#2563EB" : desconto <= 40 ? "#D97706" : desconto <= 55 ? "#F97316" : "#EF4444";
  const descontoColor = desconto <= 25 ? "text-blue-400" : desconto <= 40 ? "text-yellow-400" : desconto <= 55 ? "text-orange-400" : "text-red-400";

  const parseFaixa = (f: string) => {
    const nums = f.match(/[\d.]+/g);
    if (!nums || nums.length < 2) return { min: 0, max: 0 };
    return { min: parseFloat(nums[0]), max: parseFloat(nums[1]) };
  };

  const faixaB2C = parseFaixa(line.mercadoB2C);
  const faixaB2B = parseFaixa(line.mercadoB2B);
  const diffB2C = faixaB2C.max > 0 ? safe(((line.pv - (faixaB2C.min + faixaB2C.max) / 2) / ((faixaB2C.min + faixaB2C.max) / 2)) * 100) : 0;
  const diffB2B = faixaB2B.max > 0 ? safe(((line.pvB2B - (faixaB2B.min + faixaB2B.max) / 2) / ((faixaB2B.min + faixaB2B.max) / 2)) * 100) : 0;

  const handleLineChange = (idx: number) => { setLineIdx(idx); setDesconto(0); };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 rounded-xl overflow-hidden shadow-lg">
        <div className="lg:col-span-2 bg-navy p-6 space-y-5">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">Produto</label>
            <select value={lineIdx} onChange={(e) => handleLineChange(Number(e.target.value))}
              className="w-full mt-2 px-3 py-2.5 rounded-lg bg-white/10 text-primary-foreground border border-white/20 text-sm focus:outline-none focus:ring-2 focus:ring-cyan">
              {produtos.map((p, i) => <option key={i} value={i} className="text-navy">{p.name}</option>)}
            </select>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/30 text-purple-200">{line.material}</span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-gray-300">{line.posicao}</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">Canal</label>
            <div className="flex mt-2 rounded-lg overflow-hidden border border-white/20">
              <button onClick={() => setIsB2B(false)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${!isB2B ? "bg-cyan text-navy" : "bg-white/5 text-gray-400 hover:text-gray-200"}`}>
                🛒 B2C
              </button>
              <button onClick={() => setIsB2B(true)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${isB2B ? "bg-cyan text-navy" : "bg-white/5 text-gray-400 hover:text-gray-200"}`}>
                🏢 B2B
              </button>
            </div>
            {isB2B && <p className="text-xs text-gray-500 mt-1">Comissão reduzida para 1%</p>}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Desconto</label>
              <span className={`text-3xl font-bold ${descontoColor}`}>{desconto}%</span>
            </div>
            <input type="range" min={0} max={70} value={desconto} onChange={(e) => setDesconto(Number(e.target.value))}
              className="w-full mt-2" style={{ accentColor: descontoHex }} />
            <div className="flex justify-between text-xs text-gray-500 mt-1"><span>0%</span><span>35%</span><span>70%</span></div>
            {desconto > 55 && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium">
                🚨 Desconto acima de 55% — margem provavelmente negativa. Verificar viabilidade.
              </div>
            )}
            {desconto > limiteAlertaDesconto && desconto <= 55 && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium">
                ⚠️ Desconto acima de {limiteAlertaDesconto}% para {line.name} — requer aprovação da diretoria
              </div>
            )}
          </div>

          <div className="bg-white/5 rounded-lg p-4 text-center border border-white/10">
            <p className="text-xs text-gray-400">Preço Final</p>
            <p className="text-4xl font-bold text-primary-foreground mt-1">{formatBRL2(pvFinal)}</p>
            {desconto > 0 && <p className="text-sm text-gray-500 mt-1"><span className="line-through">{formatBRL(pvBase)}</span></p>}
          </div>
        </div>

        <div className="lg:col-span-3 bg-card p-6 space-y-5">
          <div className="text-center">
            <p className="text-5xl font-bold text-card-foreground">{formatBRL2(pvFinal)}</p>
            {desconto > 0 && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-lg text-muted-foreground line-through">{formatBRL(pvBase)}</span>
                <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-sm font-bold">-{desconto}%</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Receita Líquida <InfoTooltip text="Preço final menos DAS, taxa de cartão e comissão. É o valor que efetivamente fica antes de descontar o custo do produto." /></p>
              <p className="text-lg font-bold text-secondary-foreground">{formatBRL2(receitaLiquida)}</p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Custo Posto <InfoTooltip text="Custo médio do produto posto em estoque: FOB + internação + tarifas + desembaraço, dividido pela quantidade do container." /></p>
              <p className="text-lg font-bold text-secondary-foreground">{formatBRL2(custoMedio)}</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${mc >= 0 ? "bg-green-50" : "bg-red-50"}`}>
              <p className="text-xs text-muted-foreground">MC (R$) <InfoTooltip text="Margem de Contribuição em reais: Receita Líquida menos Custo Posto. Quanto sobra de cada venda para cobrir custos fixos." /></p>
              <p className={`text-lg font-bold ${mc >= 0 ? "text-success" : "text-destructive"}`}>{formatBRL2(mc)}</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${mc >= 0 ? "bg-green-50" : "bg-red-50"}`}>
              <p className="text-xs text-muted-foreground">MC (%) <InfoTooltip text="MC como percentual do preço final. Acima de 25% = saudável, 15-25% = atenção, abaixo de 15% = crítico." /></p>
              <p className={`text-lg font-bold ${mc >= 0 ? "text-success" : "text-destructive"}`}>{mcPct.toFixed(1)}%</p>
            </div>
          </div>

          <div className={`px-4 py-4 rounded-lg border text-center text-xl font-bold ${badge.cls}`}>
            {badge.label} — {mcPct.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-4">🌎 Visão de Mercado — {line.name}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground">Canal</th>
                <th className="text-right py-2 px-3 text-muted-foreground">Preço Kalla</th>
                <th className="text-right py-2 px-3 text-muted-foreground">Preço Mercado</th>
                <th className="text-right py-2 px-3 text-muted-foreground">Diferença</th>
                <th className="text-center py-2 px-3 text-muted-foreground">Posição</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 px-3 font-medium text-foreground">🛒 B2C</td>
                <td className="py-3 px-3 text-right font-bold text-info">{formatBRL(line.pv)}</td>
                <td className="py-3 px-3 text-right text-foreground">{line.mercadoB2C}</td>
                <td className={`py-3 px-3 text-right font-semibold ${diffB2C >= 0 ? "text-destructive" : "text-success"}`}>
                  {diffB2C >= 0 ? "+" : ""}{diffB2C.toFixed(1)}%
                </td>
                <td className="py-3 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${diffB2C > 10 ? "bg-red-100 text-destructive" : diffB2C > 0 ? "bg-yellow-100 text-warning" : "bg-green-100 text-success"}`}>
                    {diffB2C > 10 ? "Acima" : diffB2C > 0 ? "Na média" : "Competitivo"}
                  </span>
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-3 font-medium text-foreground">🏢 B2B</td>
                <td className="py-3 px-3 text-right font-bold text-info">{formatBRL(line.pvB2B)}</td>
                <td className="py-3 px-3 text-right text-foreground">{line.mercadoB2B}</td>
                <td className={`py-3 px-3 text-right font-semibold ${diffB2B >= 0 ? "text-destructive" : "text-success"}`}>
                  {diffB2B >= 0 ? "+" : ""}{diffB2B.toFixed(1)}%
                </td>
                <td className="py-3 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${diffB2B > 10 ? "bg-red-100 text-destructive" : diffB2B > 0 ? "bg-yellow-100 text-warning" : "bg-green-100 text-success"}`}>
                    {diffB2B > 10 ? "Acima" : diffB2B > 0 ? "Na média" : "Competitivo"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card rounded-lg p-5 shadow-sm">
        <h3 className="font-semibold text-card-foreground mb-4">🏷️ Concorrentes — {line.name}</h3>
        <div className="space-y-3">
          {line.concorrentes.map((c) => {
            const kallaPrice = isB2B ? line.pvB2B : line.pv;
            const diff = safe(((kallaPrice - c.preco) / c.preco) * 100);
            const maxPrice = Math.max(kallaPrice, ...line.concorrentes.map(cc => cc.preco)) * 1.1;
            return (
              <div key={c.nome} className="flex items-center gap-3">
                <span className="text-sm text-foreground w-28 shrink-0">{c.nome}</span>
                <div className="flex-1 relative h-8">
                  <div className="absolute top-0 h-4 rounded-full bg-secondary" style={{ width: `${(c.preco / maxPrice) * 100}%` }} />
                  <div className={`absolute top-4 h-4 rounded-full ${kallaPrice <= c.preco ? "bg-success/60" : "bg-destructive/60"}`}
                    style={{ width: `${(kallaPrice / maxPrice) * 100}%` }} />
                </div>
                <div className="text-right w-28 shrink-0">
                  <p className="text-sm font-medium text-foreground">{formatBRL(c.preco)}</p>
                  <p className={`text-xs font-semibold ${diff <= 0 ? "text-success" : "text-destructive"}`}>
                    {diff > 0 ? "+" : ""}{diff.toFixed(0)}%
                  </p>
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-secondary" /> Concorrente</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-success/60" /> Kalla (menor)</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-destructive/60" /> Kalla (maior)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
