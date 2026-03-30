import { useKalla } from "@/context/KallaContext";
import { formatBRL } from "@/data/kallaData";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import InfoTooltip from "@/components/InfoTooltip";

type CatKey = "pessoal" | "predial" | "marketing" | "comercial" | "admin" | "logistica";
const catLabels: Record<CatKey, { emoji: string; label: string }> = {
  pessoal: { emoji: "👥", label: "Pessoal" },
  predial: { emoji: "🏢", label: "Predial" },
  marketing: { emoji: "📢", label: "Marketing" },
  comercial: { emoji: "🚚", label: "Comercial" },
  admin: { emoji: "📋", label: "Administrativo" },
  logistica: { emoji: "🚢", label: "Logística" },
};

export default function Custos() {
  const { custos, atualizarCustos, totalCF, totalCFPorCategoria } = useKalla();
  const [open, setOpen] = useState<Record<string, boolean>>({ pessoal: true });

  const totalPessoal = totalCFPorCategoria.pessoal || 0;

  function updateItem(cat: CatKey, idx: number, valor: number) {
    const items = [...custos[cat]];
    items[idx] = { ...items[idx], valor };
    atualizarCustos({ ...custos, [cat]: items });
  }

  const pe = totalCF / 0.546;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-destructive">
          <p className="text-sm text-muted-foreground">Total Custos Fixos <InfoTooltip text="Soma de todos os 39 itens de custo fixo mensal (pessoal, predial, marketing, comercial, admin e logística). Clique nas categorias abaixo para editar." /></p>
          <p className="text-2xl font-bold text-card-foreground">{formatBRL(totalCF)}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm border-l-4 border-l-info">
          <p className="text-sm text-muted-foreground">Pessoal <InfoTooltip text="Maior categoria de custo fixo: salários, encargos, benefícios e comissões da equipe." /></p>
          <p className="text-2xl font-bold text-card-foreground">{formatBRL(totalPessoal)}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 shadow-sm border-l-4 border-l-warning">
          <p className="text-sm text-muted-foreground">Impacto no PE <InfoTooltip text="Relação direta: cada R$ 1.000 a menos nos custos fixos reduz o ponto de equilíbrio em R$ 1.832 (considerando MC de 54,6%)." /></p>
          <p className="text-lg font-bold text-card-foreground">Cada -R$1k no CF → PE cai R$ 1.832</p>
        </div>
      </div>

      {(Object.keys(custos) as CatKey[]).map((cat) => {
        const catData = custos[cat];
        const total = totalCFPorCategoria[cat] || 0;
        const isOpen = open[cat] ?? false;
        const { emoji, label } = catLabels[cat];
        return (
          <div key={cat} className="bg-card rounded-lg shadow-sm overflow-hidden">
            <button onClick={() => setOpen((p) => ({ ...p, [cat]: !isOpen }))}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
              <span className="font-semibold text-card-foreground">{emoji} {label}</span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-card-foreground">{formatBRL(total)}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-2">
                {catData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground flex-1">{item.nome}</span>
                    <input type="number" value={item.valor} onChange={(e) => updateItem(cat, idx, Number(e.target.value))}
                      className="w-28 px-3 py-1.5 rounded border border-border text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="bg-secondary rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">Ponto de Equilíbrio estimado (MC 54,6%)</p>
        <p className="text-2xl font-bold text-secondary-foreground">{formatBRL(pe)}</p>
      </div>
    </div>
  );
}
