/** Retorna o último dia de um mês específico de um ano */
export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 
 * Define o intervalo de 1 mês baseado em um dia de corte.
 * Se o dia de corte for maior que o número de dias do mês, usamos o último dia.
 */
export function getCycleRange(year: number, month: number, cutoffDay: number) {
  // O ciclo começa no mês anterior ao pretendido para fechar o ciclo no mês atual?
  // Ex: Ciclo "Março (25)" = 25/Fev a 25/Mar.
  
  const startYear = month === 0 ? year - 1 : year;
  const startMonth = month === 0 ? 11 : month - 1;
  
  const maxDayStart = lastDayOfMonth(startYear, startMonth);
  const actualStartDay = Math.min(cutoffDay, maxDayStart);
  
  const maxDayEnd = lastDayOfMonth(year, month);
  const actualEndDay = Math.min(cutoffDay, maxDayEnd);
  
  const startDate = new Date(startYear, startMonth, actualStartDay, 0, 0, 0);
  const endDate = new Date(year, month, actualEndDay, 23, 59, 59);
  
  return { startDate, endDate };
}

/** 
 * Retorna uma lista de ciclos mensais disponíveis baseada em um conjunto de datas 
 */
export function getAvailableCycles(dates: Date[], cutoffDay: number) {
  if (dates.length === 0) return [];
  
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  
  const cycles: { label: string; year: number; month: number }[] = [];
  
  let currYear = minDate.getFullYear();
  let currMonth = minDate.getMonth();
  
  // Vamos gerar ciclos até passar a data máxima
  const stopTime = maxDate.getTime();
  
  // Se o cutoffDay é 25, o primeiro ciclo que pode conter a minDate pode ser o Março (Fev/25 a Mar/25)
  // Vamos garantir que retrocedemos o suficiente ou avançamos
  
  const checkDate = new Date(currYear, currMonth, cutoffDay);
  // Se a data de início é depois do cutoff do mês atual, o primeiro ciclo relevante é o próximo mês
  if (minDate > checkDate) {
    currMonth++;
    if (currMonth > 11) { currMonth = 0; currYear++; }
  }

  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  while (new Date(currYear, currMonth - 1, cutoffDay).getTime() <= stopTime) {
    const label = cutoffDay === 1 
      ? `${meses[currMonth]}/${String(currYear).slice(2)}`
      : `${meses[currMonth === 0 ? 11 : currMonth - 1]} → ${meses[currMonth]} (${cutoffDay})`;
    
    cycles.push({ label, year: currYear, month: currMonth });
    
    currMonth++;
    if (currMonth > 11) { currMonth = 0; currYear++; }
  }
  
  return cycles;
}
