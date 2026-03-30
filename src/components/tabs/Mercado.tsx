const benchmark = [
  { linha: "Piso SPC Click", b2c: "R$120-180", b2b: "R$85-130", kalla: "R$149", posicao: "Competitivo", badge: "bg-info/10 text-info" },
  { linha: "Deck WPC", b2c: "R$280-450", b2b: "R$200-320", kalla: "R$340", posicao: "Premium", badge: "bg-purple-100 text-purple-700" },
  { linha: "Ripado WPC", b2c: "R$54-250", b2b: "R$35-55", kalla: "R$54", posicao: "Muito competitivo", badge: "bg-green-100 text-success" },
  { linha: "Mármore Flexível", b2c: "R$350-600", b2b: "R$280-480", kalla: "R$497", posicao: "Premium", badge: "bg-purple-100 text-purple-700" },
  { linha: "Cobogó/3D", b2c: "R$130-220", b2b: "R$90-160", kalla: "R$169", posicao: "Preço médio", badge: "bg-info/10 text-info" },
  { linha: "Pedra Leve", b2c: "R$150-250", b2b: "R$110-180", kalla: "R$199", posicao: "Competitivo", badge: "bg-info/10 text-info" },
  { linha: "Rev. Texturizado", b2c: "R$100-180", b2b: "R$70-130", kalla: "R$139", posicao: "Competitivo", badge: "bg-info/10 text-info" },
  { linha: "Madeira Ecológica", b2c: "R$200-350", b2b: "R$150-260", kalla: "R$279", posicao: "Premium", badge: "bg-purple-100 text-purple-700" },
];

const tendencias = [
  { emoji: "🌱", text: "Green Building 2026: 30% low-VOC — WPC/PU atendem" },
  { emoji: "📐", text: "Acabamentos = 29% do custo da obra" },
  { emoji: "🏗️", text: "SPC substituindo porcelanato em reformas" },
  { emoji: "🚢", text: "Importação direta: margem 2-3× maior" },
  { emoji: "🏪", text: "B2B = 60-70% do volume em empresas maduras" },
];

export default function Mercado() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-navy to-slate-800 rounded-lg p-6 text-primary-foreground">
          <p className="text-sm opacity-80">Global SPC/WPC</p>
          <p className="text-2xl font-bold">US$ 8,1 bi</p>
          <p className="text-sm opacity-70 mt-1">CAGR 13,5% → US$ 28 bi (2034)</p>
        </div>
        <div className="bg-gradient-to-br from-navy to-slate-800 rounded-lg p-6 text-primary-foreground">
          <p className="text-sm opacity-80">Brasil Pisos/Revestimentos</p>
          <p className="text-2xl font-bold">R$ 68 bi</p>
          <p className="text-sm opacity-70 mt-1">+7,5%/ano | SPC +11,9%</p>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary">
              {["Linha", "B2C Mercado", "B2B Mercado", "Kalla", "Posição"].map((h) => (
                <th key={h} className="text-left py-3 px-4 text-muted-foreground font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {benchmark.map((r) => (
              <tr key={r.linha} className="border-b border-border/50">
                <td className="py-3 px-4 font-medium text-foreground">{r.linha}</td>
                <td className="py-3 px-4 text-foreground">{r.b2c}</td>
                <td className="py-3 px-4 text-foreground">{r.b2b}</td>
                <td className="py-3 px-4 font-semibold text-foreground">{r.kalla}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.badge}`}>{r.posicao}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tendencias.map((t, i) => (
          <div key={i} className="bg-card rounded-lg p-4 shadow-sm">
            <span className="text-2xl">{t.emoji}</span>
            <p className="text-sm text-card-foreground mt-2">{t.text}</p>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 rounded-lg p-4 border border-warning/30">
        <p className="text-sm text-foreground">
          💡 Se capturar 0,005% do mercado brasileiro = <strong>R$ 283k/mês</strong> = acima do PE
        </p>
      </div>
    </div>
  );
}
