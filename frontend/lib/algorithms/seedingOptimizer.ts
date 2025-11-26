// Algoritmo de optimización de siembras automáticas
// Implementa la lógica documentada para planificación óptima sin solapamientos

export interface Tank {
  id: number;
  name: string;
  type: string;
  area: number;
}

export interface SeedingParameters {
  numberOfNurseries: number;
  nurseryDensity: number; // larvas/m²
  growoutDensity: number; // juveniles/m²
  mortalityPercentage: number;
  nurseryDuration: number; // semanas
  growoutDuration: number; // semanas
  geneticsId: number;
  generation: string;
  startWeek: number;
}

export interface TankAvailability {
  tankId: number;
  availableWeeks: number[];
}

export interface SeedingPlan {
  nurseryTanks: {
    tankId: number;
    name: string;
    area: number;
    larvaeCapacity: number;
    startWeek: number;
    endWeek: number;
  }[];
  growoutTanks: {
    tankId: number;
    name: string;
    area: number;
    assignedShrimp: number;
    startWeek: number;
    endWeek: number;
    utilization: number;
  }[];
  summary: {
    totalLarvae: number;
    expectedSurvivors: number;
    nurseryAreaUsed: number;
    growoutAreaRequired: number;
    growoutAreaAssigned: number;
    survivalRate: number;
    weeklyMortalityRate: number;
  };
  ganttData: Record<string, any>;
}

export interface OptimizedSeedingResult {
  success: boolean;
  plan?: SeedingPlan;
  error?: string;
  conflicts?: Array<{
    tankId: number;
    week: number;
    existingState: string;
    conflictGeneration?: string;
  }>;
}

/**
 * Encuentra ventana de disponibilidad para un tanque
 */
export function findAvailabilityWindow(
  existingData: Record<string, any>,
  tankId: number,
  startWeek: number,
  weeksRequired: number,
  maxWeeks: number
): number {
  for (let week = startWeek; week <= maxWeeks - weeksRequired; week++) {
    let available = true;

    for (let offset = 0; offset < weeksRequired; offset++) {
      const checkWeek = week + offset;
      const cellKey = `tank-${tankId}-week-${checkWeek}`;
      const cellState = existingData[cellKey];

      if (cellState && cellState !== 'Ready') {
        available = false;
        break;
      }
    }

    if (available) {
      return week;
    }
  }
  return -1; // No disponible
}

/**
 * Detecta conflictos en la programación
 */
export function detectConflicts(
  existingData: Record<string, any>,
  tankId: number,
  startWeek: number,
  duration: number
): Array<{
  tankId: number;
  week: number;
  existingState: string;
  conflictGeneration?: string;
}> {
  const conflicts = [];

  for (let week = startWeek; week < startWeek + duration; week++) {
    const cellKey = `tank-${tankId}-week-${week}`;
    const currentState = existingData[cellKey];

    if (currentState && currentState !== 'Ready') {
      conflicts.push({
        tankId,
        week,
        existingState: currentState,
        conflictGeneration: existingData[`${cellKey}-generation`]
      });
    }
  }

  return conflicts;
}

/**
 * Selecciona tanques para nursery
 */
export function selectNurseryTanks(
  availableTanks: Tank[],
  existingData: Record<string, any>,
  numberOfNurseries: number,
  startWeek: number,
  nurseryDuration: number,
  maxWeeks: number
): Tank[] {
  // Filtrar tanques disponibles para el período nursery
  const validTanks = availableTanks.filter(tank => {
    const availableWeek = findAvailabilityWindow(
      existingData,
      tank.id,
      startWeek,
      nurseryDuration,
      maxWeeks
    );
    return availableWeek !== -1;
  });

  // Ordenar por tamaño (más grandes primero)
  const sortedTanks = validTanks.sort((a, b) => b.area - a.area);

  // Seleccionar los primeros N tanques
  return sortedTanks.slice(0, numberOfNurseries);
}

/**
 * Optimiza la asignación de tanques growout usando algoritmo bin packing
 */
export function optimizeGrowoutAssignment(
  availableTanks: Tank[],
  existingData: Record<string, any>,
  survivors: number,
  growoutDensity: number,
  growoutStartWeek: number,
  growoutDuration: number,
  maxWeeks: number
): Array<{
  tank: Tank;
  assignment: number;
  utilization: number;
  startWeek: number;
}> {
  // Filtrar y ordenar tanques disponibles
  const availableGrowoutTanks = availableTanks
    .map(tank => {
      const availableWeek = findAvailabilityWindow(
        existingData,
        tank.id,
        growoutStartWeek,
        growoutDuration,
        maxWeeks
      );
      return { tank, availableWeek };
    })
    .filter(({ availableWeek }) => availableWeek !== -1)
    .sort((a, b) => {
      // Ordenar por disponibilidad temprana, luego por tamaño
      if (a.availableWeek !== b.availableWeek) {
        return a.availableWeek - b.availableWeek;
      }
      return b.tank.area - a.tank.area; // Más grandes primero
    });

  const assignments = [];
  let remainingSurvivors = survivors;

  for (const { tank, availableWeek } of availableGrowoutTanks) {
    if (remainingSurvivors <= 0) break;

    const maxCapacity = tank.area * growoutDensity;
    const optimalAssignment = Math.min(remainingSurvivors, maxCapacity);

    if (optimalAssignment > 0) {
      assignments.push({
        tank,
        assignment: optimalAssignment,
        utilization: (optimalAssignment / maxCapacity) * 100,
        startWeek: availableWeek
      });

      remainingSurvivors -= optimalAssignment;
    }
  }

  return assignments;
}

/**
 * Genera plan optimizado de siembra
 */
export function generateOptimizedSeedingPlan(
  parameters: SeedingParameters,
  availableTanks: Tank[],
  existingData: Record<string, any>,
  maxWeeks: number
): OptimizedSeedingResult {
  try {
    const {
      numberOfNurseries,
      nurseryDensity,
      growoutDensity,
      mortalityPercentage,
      nurseryDuration,
      growoutDuration,
      generation,
      startWeek
    } = parameters;

    // 1. Seleccionar tanques nursery
    const selectedNurseryTanks = selectNurseryTanks(
      availableTanks,
      existingData,
      numberOfNurseries,
      startWeek,
      nurseryDuration,
      maxWeeks
    );

    if (selectedNurseryTanks.length < numberOfNurseries) {
      return {
        success: false,
        error: `Solo ${selectedNurseryTanks.length} tanques disponibles para nursery, pero se necesitan ${numberOfNurseries}`
      };
    }

    // 2. Calcular capacidades y supervivencia
    let totalLarvae = 0;
    let totalNurseryArea = 0;

    const nurseryPlan = selectedNurseryTanks.map(tank => {
      const larvaeCapacity = tank.area * nurseryDensity;
      totalLarvae += larvaeCapacity;
      totalNurseryArea += tank.area;

      return {
        tankId: tank.id,
        name: tank.name,
        area: tank.area,
        larvaeCapacity,
        startWeek,
        endWeek: startWeek + nurseryDuration - 1
      };
    });

    const survivalRate = (100 - mortalityPercentage) / 100;
    const expectedSurvivors = Math.floor(totalLarvae * survivalRate);
    const weeklyMortalityRate = (mortalityPercentage / 100) / (nurseryDuration + growoutDuration);

    // 3. Optimizar asignación de tanques growout
    const growoutStartWeek = startWeek + nurseryDuration;
    const growoutAssignments = optimizeGrowoutAssignment(
      availableTanks,
      existingData,
      expectedSurvivors,
      growoutDensity,
      growoutStartWeek,
      growoutDuration,
      maxWeeks
    );

    const assignedSurvivors = growoutAssignments.reduce((sum, assignment) => sum + assignment.assignment, 0);

    if (assignedSurvivors < expectedSurvivors) {
      return {
        success: false,
        error: `Capacidad insuficiente en growout. Se necesitan ${expectedSurvivors} pero solo se pueden asignar ${assignedSurvivors}`
      };
    }

    const growoutPlan = growoutAssignments.map(assignment => ({
      tankId: assignment.tank.id,
      name: assignment.tank.name,
      area: assignment.tank.area,
      assignedShrimp: assignment.assignment,
      startWeek: assignment.startWeek,
      endWeek: assignment.startWeek + growoutDuration - 1,
      utilization: assignment.utilization
    }));

    // 4. Generar datos para gantt
    const ganttData: Record<string, any> = {};

    // Configurar celdas nursery
    nurseryPlan.forEach(nursery => {
      for (let week = nursery.startWeek; week <= nursery.endWeek; week++) {
        const cellKey = `tank-${nursery.tankId}-week-${week}`;
        ganttData[cellKey] = 'Nursery';
        ganttData[`${cellKey}-generation`] = generation;
        ganttData[`${cellKey}-genetics`] = parameters.geneticsId.toString();
        ganttData[`${cellKey}-duration`] = nurseryDuration.toString();
      }
    });

    // Configurar celdas growout
    growoutPlan.forEach(growout => {
      for (let week = growout.startWeek; week <= growout.endWeek; week++) {
        const cellKey = `tank-${growout.tankId}-week-${week}`;
        ganttData[cellKey] = 'Growout';
        ganttData[`${cellKey}-generation`] = generation;
        ganttData[`${cellKey}-genetics`] = parameters.geneticsId.toString();
        ganttData[`${cellKey}-duration`] = growoutDuration.toString();
      }
    });

    // 5. Crear resumen
    const requiredGrowoutArea = expectedSurvivors / growoutDensity;
    const assignedGrowoutArea = growoutPlan.reduce((sum, tank) => sum + tank.area, 0);

    const plan: SeedingPlan = {
      nurseryTanks: nurseryPlan,
      growoutTanks: growoutPlan,
      summary: {
        totalLarvae,
        expectedSurvivors,
        nurseryAreaUsed: totalNurseryArea,
        growoutAreaRequired: requiredGrowoutArea,
        growoutAreaAssigned: assignedGrowoutArea,
        survivalRate: survivalRate * 100,
        weeklyMortalityRate
      },
      ganttData
    };

    return {
      success: true,
      plan
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al generar plan'
    };
  }
}

/**
 * Encuentra la próxima ventana disponible para planificar siembras múltiples
 */
export function findNextAvailableWindow(
  existingData: Record<string, any>,
  parameters: SeedingParameters,
  availableTanks: Tank[],
  maxWeeks: number,
  minGapWeeks: number = 1
): number {
  const totalCycleDuration = parameters.nurseryDuration + parameters.growoutDuration;

  for (let week = parameters.startWeek; week <= maxWeeks - totalCycleDuration; week++) {
    const result = generateOptimizedSeedingPlan(
      { ...parameters, startWeek: week },
      availableTanks,
      existingData,
      maxWeeks
    );

    if (result.success) {
      return week;
    }

    // Si hay conflictos, intentar la siguiente semana
  }

  return -1; // No hay ventana disponible
}