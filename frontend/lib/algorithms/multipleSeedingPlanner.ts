// Algoritmo para planificación de múltiples siembras automáticas
// Optimiza la distribución temporal de siembras evitando conflictos y gaps

import {
  SeedingParameters,
  Tank,
  OptimizedSeedingResult,
  generateOptimizedSeedingPlan,
  findNextAvailableWindow
} from './seedingOptimizer';

export interface MultipleSeedingParameters extends Omit<SeedingParameters, 'startWeek'> {
  numberOfSiembras: number; // Número total de siembras a planificar
  preferredIntervalWeeks?: number; // Intervalo preferido entre siembras
  maxIntervalWeeks?: number; // Intervalo máximo aceptable
  minGapWeeks?: number; // Semanas mínimas de gap entre ciclos
  startFromWeek: number; // Semana desde la cual empezar a buscar
}

export interface MultipleSeedingPlan {
  siembras: Array<{
    id: string;
    startWeek: number;
    endWeek: number;
    parameters: SeedingParameters;
    plan: any; // SeedingPlan del optimizador individual
    intervalFromPrevious?: number;
  }>;
  summary: {
    totalSiembras: number;
    totalLarvae: number;
    totalExpectedSurvivors: number;
    averageInterval: number;
    utilizationEfficiency: number;
    weeksCovered: number;
  };
  ganttData: Record<string, any>;
  warnings: string[];
}

export interface MultipleSeedingResult {
  success: boolean;
  plan?: MultipleSeedingPlan;
  error?: string;
  partialResults?: {
    successfulSiembras: number;
    totalRequested: number;
    reason: string;
  };
}

/**
 * Calcula la eficiencia de utilización de tanques
 */
function calculateUtilizationEfficiency(
  siembras: any[],
  totalTanks: number,
  totalWeeks: number
): number {
  if (totalTanks === 0 || totalWeeks === 0) return 0;

  let totalTankWeeksUsed = 0;

  siembras.forEach(siembra => {
    const cycleDuration = siembra.parameters.nurseryDuration + siembra.parameters.growoutDuration;
    const tanksUsed = siembra.plan.nurseryTanks.length + siembra.plan.growoutTanks.length;
    totalTankWeeksUsed += tanksUsed * cycleDuration;
  });

  const totalCapacity = totalTanks * totalWeeks;
  return (totalTankWeeksUsed / totalCapacity) * 100;
}

/**
 * Optimiza el intervalo entre siembras basado en disponibilidad
 */
function optimizeInterval(
  currentWeek: number,
  parameters: MultipleSeedingParameters,
  existingData: Record<string, any>,
  availableTanks: Tank[],
  maxWeeks: number
): number {
  const { preferredIntervalWeeks = 2, maxIntervalWeeks = 6, minGapWeeks = 1 } = parameters;

  // Intentar intervalos desde el preferido hasta el máximo
  for (let interval = preferredIntervalWeeks; interval <= maxIntervalWeeks; interval++) {
    const testWeek = currentWeek + interval;

    if (testWeek >= maxWeeks) break;

    const testResult = generateOptimizedSeedingPlan(
      { ...parameters, startWeek: testWeek },
      availableTanks,
      existingData,
      maxWeeks
    );

    if (testResult.success) {
      return interval;
    }
  }

  return -1; // No se encontró intervalo viable
}

/**
 * Valida que las siembras no se solapen
 */
function validateNoOverlap(siembras: any[]): boolean {
  const occupiedCells = new Set<string>();

  for (const siembra of siembras) {
    const { ganttData } = siembra.plan;

    for (const cellKey of Object.keys(ganttData)) {
      if (cellKey.includes('-generation') || cellKey.includes('-genetics') || cellKey.includes('-duration')) {
        continue;
      }

      if (occupiedCells.has(cellKey)) {
        console.error(`Conflicto detectado en celda: ${cellKey}`);
        return false;
      }
      occupiedCells.add(cellKey);
    }
  }

  return true;
}

/**
 * Genera plan de múltiples siembras optimizado
 */
export function generateMultipleSeedingPlan(
  parameters: MultipleSeedingParameters,
  availableTanks: Tank[],
  existingData: Record<string, any>,
  maxWeeks: number
): MultipleSeedingResult {
  try {
    const {
      numberOfSiembras,
      startFromWeek,
      preferredIntervalWeeks = 2,
      minGapWeeks = 1
    } = parameters;

    const siembras = [];
    const warnings = [];
    let currentWeek = startFromWeek;
    let combinedGanttData = { ...existingData };

    // Generar cada siembra secuencialmente
    for (let i = 0; i < numberOfSiembras; i++) {
      // Buscar próxima ventana disponible
      const availableWeek = findNextAvailableWindow(
        combinedGanttData,
        { ...parameters, startWeek: currentWeek },
        availableTanks,
        maxWeeks,
        minGapWeeks
      );

      if (availableWeek === -1) {
        // No se puede planificar más siembras
        const partialResults = {
          successfulSiembras: i,
          totalRequested: numberOfSiembras,
          reason: `No hay capacidad disponible para más siembras después de la semana ${currentWeek}`
        };

        if (i === 0) {
          return {
            success: false,
            error: partialResults.reason
          };
        }

        warnings.push(`Solo se pudieron planificar ${i} de ${numberOfSiembras} siembras solicitadas`);
        break;
      }

      // Generar plan individual para esta siembra
      const seedingResult = generateOptimizedSeedingPlan(
        { ...parameters, startWeek: availableWeek },
        availableTanks,
        combinedGanttData,
        maxWeeks
      );

      if (!seedingResult.success) {
        const partialResults = {
          successfulSiembras: i,
          totalRequested: numberOfSiembras,
          reason: seedingResult.error || 'Error al generar plan individual'
        };

        if (i === 0) {
          return {
            success: false,
            error: partialResults.reason
          };
        }

        warnings.push(`No se pudo completar la siembra ${i + 1}: ${seedingResult.error}`);
        break;
      }

      // Calcular intervalo desde la siembra anterior
      const intervalFromPrevious = i > 0 ? availableWeek - siembras[i - 1].startWeek : undefined;

      // Si el intervalo es mayor al preferido, agregar warning
      if (intervalFromPrevious && intervalFromPrevious > (preferredIntervalWeeks * 2)) {
        warnings.push(`Intervalo largo entre siembra ${i} y ${i + 1}: ${intervalFromPrevious} semanas`);
      }

      const cycleDuration = parameters.nurseryDuration + parameters.growoutDuration;
      const siembra = {
        id: `siembra-${i + 1}`,
        startWeek: availableWeek,
        endWeek: availableWeek + cycleDuration - 1,
        parameters: { ...parameters, startWeek: availableWeek },
        plan: seedingResult.plan!,
        intervalFromPrevious
      };

      siembras.push(siembra);

      // Actualizar datos combinados con esta siembra
      Object.assign(combinedGanttData, seedingResult.plan!.ganttData);

      // Preparar para siguiente iteración
      currentWeek = availableWeek + minGapWeeks;
    }

    // Validar que no hay solapamientos
    if (!validateNoOverlap(siembras)) {
      return {
        success: false,
        error: 'Se detectaron solapamientos en la planificación. Contactar soporte técnico.'
      };
    }

    // Calcular métricas de resumen
    const totalLarvae = siembras.reduce((sum, s) => sum + s.plan.summary.totalLarvae, 0);
    const totalExpectedSurvivors = siembras.reduce((sum, s) => sum + s.plan.summary.expectedSurvivors, 0);

    const intervals = siembras
      .map(s => s.intervalFromPrevious)
      .filter(interval => interval !== undefined) as number[];

    const averageInterval = intervals.length > 0
      ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
      : 0;

    const weeksCovered = siembras.length > 0
      ? Math.max(...siembras.map(s => s.endWeek)) - Math.min(...siembras.map(s => s.startWeek)) + 1
      : 0;

    const utilizationEfficiency = calculateUtilizationEfficiency(
      siembras,
      availableTanks.length,
      weeksCovered
    );

    // Remover datos existentes del gantt final (solo incluir nuevas siembras)
    const finalGanttData: Record<string, any> = {};
    Object.keys(combinedGanttData).forEach(key => {
      if (!existingData[key]) {
        finalGanttData[key] = combinedGanttData[key];
      }
    });

    const plan: MultipleSeedingPlan = {
      siembras,
      summary: {
        totalSiembras: siembras.length,
        totalLarvae,
        totalExpectedSurvivors,
        averageInterval,
        utilizationEfficiency,
        weeksCovered
      },
      ganttData: finalGanttData,
      warnings
    };

    return {
      success: true,
      plan
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en planificación múltiple'
    };
  }
}

/**
 * Encuentra slots óptimos para distribución uniforme de siembras
 */
export function findOptimalDistribution(
  parameters: MultipleSeedingParameters,
  availableTanks: Tank[],
  existingData: Record<string, any>,
  maxWeeks: number
): number[] {
  const { numberOfSiembras, startFromWeek, preferredIntervalWeeks = 2 } = parameters;
  const cycleDuration = parameters.nurseryDuration + parameters.growoutDuration;
  const totalSpaceNeeded = cycleDuration * numberOfSiembras + (preferredIntervalWeeks * (numberOfSiembras - 1));

  if (startFromWeek + totalSpaceNeeded > maxWeeks) {
    // No cabe en el espacio disponible, buscar distribución compacta
    return findCompactDistribution(parameters, availableTanks, existingData, maxWeeks);
  }

  // Intentar distribución uniforme
  const slots = [];
  for (let i = 0; i < numberOfSiembras; i++) {
    const slot = startFromWeek + (i * (cycleDuration + preferredIntervalWeeks));
    slots.push(slot);
  }

  return slots;
}

/**
 * Encuentra distribución compacta cuando el espacio es limitado
 */
function findCompactDistribution(
  parameters: MultipleSeedingParameters,
  availableTanks: Tank[],
  existingData: Record<string, any>,
  maxWeeks: number
): number[] {
  const slots = [];
  let currentWeek = parameters.startFromWeek;
  const minGap = parameters.minGapWeeks || 1;

  for (let i = 0; i < parameters.numberOfSiembras; i++) {
    const available = findNextAvailableWindow(
      existingData,
      { ...parameters, startWeek: currentWeek },
      availableTanks,
      maxWeeks,
      minGap
    );

    if (available === -1) break;

    slots.push(available);
    currentWeek = available + minGap;
  }

  return slots;
}