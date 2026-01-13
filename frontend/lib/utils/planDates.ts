/**
 * Utilidad para calcular automáticamente las fechas del plan anual
 * Se actualiza automáticamente según la fecha actual
 */

export interface PlanDates {
  startDate: Date;
  endDate: Date;
  year: number;
  formattedStartDate: string;
  formattedEndDate: string;
}

/**
 * Calcula el año del plan basándose en la fecha actual
 * Si estamos en Q4 (octubre-diciembre), planifica para el siguiente año
 * Si estamos en Q1-Q3, planifica para el año actual
 */
export const getPlanYear = (): number => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-11

  // TEMPORAL: Forzar 2026 mientras estamos en desarrollo/transición
  // TODO: Reactivar lógica automática cuando el plan esté sincronizado
  if (currentYear === 2024) {
    return 2026; // Durante 2024, planificar para 2026
  }

  // Lógica normal: Si estamos en Q4 (oct-dic), planificar para el siguiente año
  return currentMonth >= 9 ? currentYear + 1 : currentYear;
};

/**
 * Obtiene las fechas de inicio y fin del plan para el año correspondiente
 * Siempre usa el primer y último lunes del año
 */
export const getPlanDates = (): PlanDates => {
  const planYear = getPlanYear();

  // Buscar el primer lunes del año
  const startOfYear = new Date(planYear, 0, 1); // 1 de enero
  const firstMonday = new Date(startOfYear);
  const dayOfWeek = startOfYear.getDay(); // 0=domingo, 1=lunes

  if (dayOfWeek !== 1) {
    // Si el 1 de enero no es lunes, buscar el siguiente lunes
    const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    firstMonday.setDate(startOfYear.getDate() + daysToAdd);
  }

  // Buscar el último lunes del año
  const endOfYear = new Date(planYear, 11, 31); // 31 de diciembre
  const lastMonday = new Date(endOfYear);
  const endDayOfWeek = endOfYear.getDay();

  if (endDayOfWeek !== 1) {
    // Si el 31 de diciembre no es lunes, buscar el lunes anterior
    const daysToSubtract = endDayOfWeek === 0 ? 6 : endDayOfWeek - 1;
    lastMonday.setDate(endOfYear.getDate() - daysToSubtract);
  }

  return {
    startDate: firstMonday,
    endDate: lastMonday,
    year: planYear,
    formattedStartDate: firstMonday.toISOString().split('T')[0],
    formattedEndDate: lastMonday.toISOString().split('T')[0]
  };
};

/**
 * Verifica si una fecha está dentro del plan actual
 */
export const isDateInCurrentPlan = (date: Date): boolean => {
  const planDates = getPlanDates();
  return date >= planDates.startDate && date <= planDates.endDate;
};

/**
 * Obtiene información legible del plan actual
 */
export const getCurrentPlanInfo = (): string => {
  const planDates = getPlanDates();
  return `Plan ${planDates.year} (${planDates.formattedStartDate} - ${planDates.formattedEndDate})`;
};