/** Mapeamento SKU Maiô → Kalla */
export interface SkuMapping {
  codigoMaio: string;
  skuKalla: string;
  produto: string;
  custoPosto: number;
  linha: string; // nome da linha de produto
}

export const SKU_MAP: SkuMapping[] = [
  // Mármore Flexível
  { codigoMaio: "KL8230", skuKalla: "KLUV01", produto: "Mármore Flex. Toque de Cinza", custoPosto: 79.49, linha: "Mármore Flexível" },
  { codigoMaio: "KL8212", skuKalla: "KLUV02", produto: "Mármore Flex. Pedra de Sal", custoPosto: 79.49, linha: "Mármore Flexível" },
  { codigoMaio: "S1670-1", skuKalla: "KLUV03", produto: "Mármore Flex. Calacatta Gold", custoPosto: 92.82, linha: "Mármore Flexível" },
  { codigoMaio: "S1646", skuKalla: "KLUV04", produto: "Mármore Flex. Folha de Ouro", custoPosto: 92.82, linha: "Mármore Flexível" },
  { codigoMaio: "S1615", skuKalla: "KLUV05", produto: "Mármore Flex. Crema Imperial", custoPosto: 79.49, linha: "Mármore Flexível" },
  { codigoMaio: "KL8226-2", skuKalla: "KLUV06", produto: "Mármore Flex. Cinza Verona", custoPosto: 79.49, linha: "Mármore Flexível" },
  // Madeira Ecológica
  { codigoMaio: "BR-M-009", skuKalla: "KLPM01", produto: "Madeira Ecológica Avelã", custoPosto: 77.50, linha: "Madeira Ecológica" },
  { codigoMaio: "BR-M-006", skuKalla: "KLPM02", produto: "Madeira Ecológica Amêndoa", custoPosto: 77.50, linha: "Madeira Ecológica" },
  // Pedra Leve
  { codigoMaio: "SYS04", skuKalla: "KLPU01", produto: "Pedra Leve Taupe", custoPosto: 77.70, linha: "Pedra Leve" },
  { codigoMaio: "SYS03A", skuKalla: "KLPU02", produto: "Pedra Leve Cinza Terra", custoPosto: 77.70, linha: "Pedra Leve" },
  { codigoMaio: "SYS02", skuKalla: "KLPU03", produto: "Pedra Leve Geada", custoPosto: 77.70, linha: "Pedra Leve" },
  // Rev. Texturizado
  { codigoMaio: "LSS003", skuKalla: "KLTX01", produto: "Rev. Texturizado Cinza Areia", custoPosto: 59.10, linha: "Rev. Texturizado" },
  { codigoMaio: "SP003", skuKalla: "KLTX02", produto: "Rev. Texturizado Duna", custoPosto: 40.39, linha: "Rev. Texturizado" },
  { codigoMaio: "SP002", skuKalla: "KLTX03", produto: "Rev. Texturizado Polar", custoPosto: 40.39, linha: "Rev. Texturizado" },
  // Cobogó/3D
  { codigoMaio: "JLZ001", skuKalla: "KL3D01", produto: "Rev. 3D Lunar", custoPosto: 58.80, linha: "Cobogó/3D" },
  { codigoMaio: "JGG001", skuKalla: "KLCB01", produto: "Cobogó", custoPosto: 90.53, linha: "Cobogó/3D" },
  // Ripado WPC
  { codigoMaio: "sm-330", skuKalla: "KLRIP01", produto: "Ripado WPC Cumarú", custoPosto: 14.82, linha: "Ripado WPC" },
  { codigoMaio: "sm-340", skuKalla: "KLRIP02", produto: "Ripado WPC Cinza", custoPosto: 14.82, linha: "Ripado WPC" },
  { codigoMaio: "px005", skuKalla: "KLRIP03", produto: "Ripado WPC Ébano", custoPosto: 14.82, linha: "Ripado WPC" },
  { codigoMaio: "SM319", skuKalla: "KLRIP04", produto: "Ripado WPC Freijó", custoPosto: 14.82, linha: "Ripado WPC" },
  // Piso SPC Click
  { codigoMaio: "REP85004-7", skuKalla: "KLPV01", produto: "Piso SPC Click Aspen", custoPosto: 52.80, linha: "Piso SPC Click" },
  { codigoMaio: "REP85008-1", skuKalla: "KLPV02", produto: "Piso SPC Click Boreal", custoPosto: 52.80, linha: "Piso SPC Click" },
  { codigoMaio: "REP85004-2", skuKalla: "KLPV03", produto: "Piso SPC Click Toscana", custoPosto: 52.80, linha: "Piso SPC Click" },
  { codigoMaio: "REP85004-4", skuKalla: "KLPV04", produto: "Piso SPC Click Atacama", custoPosto: 52.80, linha: "Piso SPC Click" },
  // Deck WPC
  { codigoMaio: "BRN003", skuKalla: "KLDK01", produto: "Deck WPC Café Imperial", custoPosto: 111.97, linha: "Deck WPC" },
  { codigoMaio: "BRN004", skuKalla: "KLDK02", produto: "Deck WPC Castanheira", custoPosto: 136.71, linha: "Deck WPC" },
  // Acessórios
  { codigoMaio: "JGJ995", skuKalla: "KLCO1", produto: "Cola para Instalação", custoPosto: 0, linha: "Acessórios" },
  { codigoMaio: "PVCSK17", skuKalla: "KLCL01", produto: "Cantoneira Lateral WPC", custoPosto: 9.76, linha: "Acessórios" },
  { codigoMaio: "PVCYJ25", skuKalla: "KLCA01", produto: "Cantoneira Angulada WPC", custoPosto: 6.94, linha: "Acessórios" },
  { codigoMaio: "UV ZJ10", skuKalla: "KLAC90P", produto: "Acab. Márm. 90° Preto", custoPosto: 4.34, linha: "Acessórios" },
  { codigoMaio: "UV SB05", skuKalla: "KLACC-P", produto: "Acab. Márm. Canto Preto", custoPosto: 4.34, linha: "Acessórios" },
  { codigoMaio: "UV ZJ25", skuKalla: "KLACJ-P", produto: "Acab. Márm. Junção Preto", custoPosto: 4.77, linha: "Acessórios" },
  { codigoMaio: "TJX80", skuKalla: "KLRO01", produto: "Rodapé SPC", custoPosto: 20.71, linha: "Acessórios" },
  { codigoMaio: "WPC YJ40", skuKalla: "KLCD01", produto: "Acab. Deck", custoPosto: 27.97, linha: "Acessórios" },
  { codigoMaio: "WPC LG01", skuKalla: "KLB01", produto: "Barrote Deck", custoPosto: 16.59, linha: "Acessórios" },
  { codigoMaio: "WPC KK02", skuKalla: "KLCL01PC", produto: "Clip Deck Inox (pct 100)", custoPosto: 65.00, linha: "Acessórios" },
  { codigoMaio: "WPC LS03", skuKalla: "KLPR01", produto: "Parafuso Deck", custoPosto: 0.22, linha: "Acessórios" },
];

/** Busca SKU case-insensitive */
export function findSku(codigoMaio: string): SkuMapping | undefined {
  const code = codigoMaio.trim().toLowerCase();
  return SKU_MAP.find((s) => s.codigoMaio.toLowerCase() === code);
}

/** Formata mês/ano a partir de date string ou Date */
export function formatMesAno(dateVal: string | number | Date): string {
  let d: Date;
  if (typeof dateVal === "number") {
    // Excel serial date
    d = new Date((dateVal - 25569) * 86400000);
  } else if (typeof dateVal === "string") {
    d = new Date(dateVal);
  } else {
    d = dateVal;
  }
  if (isNaN(d.getTime())) return "??";
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const yy = String(d.getFullYear()).slice(2);
  return `${meses[d.getMonth()]}/${yy}`;
}
