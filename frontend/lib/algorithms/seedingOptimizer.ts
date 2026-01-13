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
  targetWeight?: number; // Peso objetivo en gramos para ajustar duración automáticamente
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
  availableAlternatives: {
    nurseryTanks: {
      tankId: number;
      name: string;
      area: number;
      availableFromWeek: number;
    }[];
    growoutTanks: {
      tankId: number;
      name: string;
      area: number;
      maxCapacity: number;
      availableFromWeek: number;
    }[];
  };
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

      // Una celda está ocupada si tiene cualquier estado que no sea null/undefined o 'Ready'
      if (cellState && cellState !== 'Ready' && cellState.trim() !== '') {
        console.log(`🚫 Tank ${tankId}, Week ${checkWeek}: Celda ocupada con estado "${cellState}"`);
        available = false;
        break;
      }
    }

    if (available) {
      console.log(`✅ Tank ${tankId}: Ventana disponible desde semana ${week} por ${weeksRequired} semanas`);
      return week;
    }
  }
  console.log(`❌ Tank ${tankId}: No hay ventana disponible desde semana ${startWeek}`);
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

    if (currentState && currentState !== 'Ready' && currentState.trim() !== '') {
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
  console.log(`🔍 Seleccionando tanques nursery: necesito ${numberOfNurseries}, disponibles: ${availableTanks.length}, semana deseada: ${startWeek}`);

  // Filtrar solo tanques tipo Nursery
  const nurseryTanks = availableTanks.filter(tank => tank.type === 'Nursery');

  if (nurseryTanks.length === 0) {
    console.log(`❌ No hay tanques tipo Nursery disponibles`);
    return [];
  }

  // PASO 1: Buscar tanques disponibles EXACTAMENTE en la semana deseada por el usuario
  const tanksAtUserWeek = nurseryTanks.filter(tank => {
    const availableWeek = findAvailabilityWindow(
      existingData,
      tank.id,
      startWeek,
      nurseryDuration,
      maxWeeks
    );

    if (availableWeek === startWeek) {
      console.log(`🎯 Tank ${tank.id} (${tank.name}): DISPONIBLE en semana deseada ${startWeek}`);
      return true;
    } else if (availableWeek === -1) {
      console.log(`❌ Tank ${tank.id} (${tank.name}): No disponible para nursery`);
    } else {
      console.log(`⏰ Tank ${tank.id} (${tank.name}): Disponible desde semana ${availableWeek} (no en la deseada ${startWeek})`);
    }
    return false;
  });

  // Si encontramos suficientes tanques en la semana deseada, usarlos
  if (tanksAtUserWeek.length >= numberOfNurseries) {
    const sortedTanks = tanksAtUserWeek.sort((a, b) => b.area - a.area);
    const selectedTanks = sortedTanks.slice(0, numberOfNurseries);
    console.log(`✅ Usando tanques en semana deseada ${startWeek}:`);
    selectedTanks.forEach(tank => console.log(`   - Tank ${tank.id} (${tank.name}): ${tank.area}m²`));
    return selectedTanks;
  }

  // PASO 2: Si no hay suficientes en la semana deseada, buscar en cualquier semana posterior
  console.log(`⚠️ Solo ${tanksAtUserWeek.length} tanques disponibles en semana ${startWeek}, buscando en fechas posteriores...`);

  const validTanks = nurseryTanks.filter(tank => {
    const availableWeek = findAvailabilityWindow(
      existingData,
      tank.id,
      startWeek,
      nurseryDuration,
      maxWeeks
    );

    if (availableWeek === -1) {
      console.log(`❌ Tank ${tank.id} (${tank.name}): No disponible para nursery`);
      return false;
    } else {
      console.log(`✅ Tank ${tank.id} (${tank.name}): Disponible desde semana ${availableWeek}`);
      return true;
    }
  });

  // Ordenar por proximidad a la semana deseada, luego por tamaño
  const sortedTanks = validTanks.sort((a, b) => {
    const availabilityA = findAvailabilityWindow(existingData, a.id, startWeek, nurseryDuration, maxWeeks);
    const availabilityB = findAvailabilityWindow(existingData, b.id, startWeek, nurseryDuration, maxWeeks);

    // Primero ordenar por proximidad a la fecha deseada
    if (availabilityA !== availabilityB) {
      return availabilityA - availabilityB;
    }
    // Si tienen la misma disponibilidad, ordenar por tamaño
    return b.area - a.area;
  });

  const selectedTanks = sortedTanks.slice(0, numberOfNurseries);
  console.log(`📋 Tanques nursery seleccionados: ${selectedTanks.length}/${numberOfNurseries}`);
  selectedTanks.forEach(tank => {
    const week = findAvailabilityWindow(existingData, tank.id, startWeek, nurseryDuration, maxWeeks);
    console.log(`   - Tank ${tank.id} (${tank.name}): ${tank.area}m² desde semana ${week}`);
  });

  return selectedTanks;
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
  // Filtrar solo tanques tipo Growout y disponibles
  const availableGrowoutTanks = availableTanks
    .filter(tank => tank.type === 'Growout') // Solo considerar tanques tipo Growout
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
 * Calcula la duración real necesaria basada en el peso objetivo y la curva de crecimiento
 */
export function calculateTargetDuration(
  targetWeight: number,
  geneticsId: number,
  getWeightByWeek: (geneticsId: number, week: number) => number
): number {
  if (!targetWeight || !getWeightByWeek) {
    return 8; // Duración por defecto
  }

  // Buscar en qué semana se alcanza el peso objetivo (desde semana 0)
  for (let week = 0; week <= 20; week++) {
    const weightAtWeek = getWeightByWeek(geneticsId, week);
    // Redondear a 1 decimal para evitar problemas de precisión
    const roundedWeight = Math.round(weightAtWeek * 10) / 10;
    if (roundedWeight >= targetWeight) {
      // Retornar semanas totales necesarias desde el inicio (incluyendo nursery + growout)
      // Si se alcanza en semana X, necesitamos X + 1 semanas totales
      const totalWeeksNeeded = week + 1;
      console.log(`🎯 Peso objetivo ${targetWeight}g alcanzado en semana total ${week} (peso proyectado: ${roundedWeight}g), total de semanas necesarias: ${totalWeeksNeeded}`);
      return totalWeeksNeeded;
    }
  }

  // Si no encuentra el peso objetivo en 20 semanas, usar 12 como máximo
  console.log(`⚠️ Peso objetivo ${targetWeight}g no alcanzado en 20 semanas, usando duración máxima de 12 semanas`);
  return 12;
}

/**
 * Genera plan optimizado de siembra
 */
export function generateOptimizedSeedingPlan(
  parameters: SeedingParameters,
  availableTanks: Tank[],
  existingData: Record<string, any>,
  maxWeeks: number,
  getWeightByWeek?: (geneticsId: number, week: number) => number,
  hasRealDataForTankGeneration?: (tankId: number, generationCode: string) => { hasData: boolean, latestWeight?: number, weekInPlan?: number }
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
      startWeek,
      targetWeight,
      geneticsId
    } = parameters;

    // 🆕 Calcular duración ajustada si se especifica peso objetivo
    let adjustedGrowoutDuration = growoutDuration;
    if (targetWeight && getWeightByWeek && geneticsId) {
      const totalWeeksNeeded = calculateTargetDuration(targetWeight, geneticsId, getWeightByWeek);
      // La duración de growout es las semanas totales menos las semanas de nursery
      adjustedGrowoutDuration = Math.max(1, totalWeeksNeeded - nurseryDuration);
      console.log(`📏 Duración ajustada basada en peso objetivo ${targetWeight}g: ${adjustedGrowoutDuration} semanas growout (total: ${totalWeeksNeeded}, nursery: ${nurseryDuration}, original growout: ${growoutDuration})`);
    }

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

      // Encontrar la semana real de disponibilidad para este tanque específico
      const realStartWeek = findAvailabilityWindow(
        existingData,
        tank.id,
        startWeek,
        nurseryDuration,
        maxWeeks
      );

      console.log(`📅 Tank ${tank.id} nursery: Semana real de inicio ${realStartWeek} (vs original ${startWeek})`);

      return {
        tankId: tank.id,
        name: tank.name,
        area: tank.area,
        larvaeCapacity,
        startWeek: realStartWeek !== -1 ? realStartWeek : startWeek,
        endWeek: (realStartWeek !== -1 ? realStartWeek : startWeek) + nurseryDuration - 1
      };
    });

    const survivalRate = (100 - mortalityPercentage) / 100;
    const expectedSurvivors = Math.floor(totalLarvae * survivalRate);
    const weeklyMortalityRate = (mortalityPercentage / 100) / (nurseryDuration + growoutDuration);

    // 3. Optimizar asignación de tanques growout
    // Calcular la semana de inicio de growout basada en la finalización real del nursery
    const nurseryEndWeek = Math.max(...nurseryPlan.map(n => n.endWeek));
    const growoutStartWeek = nurseryEndWeek + 1;

    console.log(`📅 Growout start: Semana ${growoutStartWeek} (después del nursery que termina en semana ${nurseryEndWeek})`);

    const growoutAssignments = optimizeGrowoutAssignment(
      availableTanks,
      existingData,
      expectedSurvivors,
      growoutDensity,
      growoutStartWeek,
      adjustedGrowoutDuration,
      maxWeeks
    );

    const assignedSurvivors = growoutAssignments.reduce((sum, assignment) => sum + assignment.assignment, 0);

    if (assignedSurvivors < expectedSurvivors) {
      return {
        success: false,
        error: `Capacidad insuficiente en growout. Se necesitan ${expectedSurvivors} pero solo se pueden asignar ${assignedSurvivors}`
      };
    }

    const growoutPlan = growoutAssignments.map(assignment => {
      let finalEndWeek = assignment.startWeek + adjustedGrowoutDuration - 1;

      // 🆕 Verificar si hay datos reales para este tanque específico
      if (hasRealDataForTankGeneration && targetWeight && getWeightByWeek && geneticsId) {
        const realDataCheck = hasRealDataForTankGeneration(assignment.tank.id, generation);
        if (realDataCheck.hasData) {
          console.log(`🔍 Analytics: Encontrados datos reales para tanque ${assignment.tank.id}: ${realDataCheck.latestWeight}g en semana ${realDataCheck.weekInPlan}`);

          // Aplicar la misma lógica que el ajuste automático
          // Encontrar en qué semana de la curva está el peso actual
          let weekInCurve = 0;
          for (let week = 0; week <= 20; week++) {
            const weightAtWeek = getWeightByWeek(geneticsId, week);
            if (weightAtWeek >= realDataCheck.latestWeight) {
              weekInCurve = week;
              break;
            }
          }

          // Encontrar en qué semana de la curva se alcanza el target
          let targetWeekInCurve = 0;
          for (let week = weekInCurve; week <= 20; week++) {
            const weightAtWeek = getWeightByWeek(geneticsId, week);
            if (weightAtWeek >= targetWeight) {
              targetWeekInCurve = week;
              break;
            }
          }

          // Calcular nueva fecha fin
          const weeksRemaining = targetWeekInCurve - weekInCurve;
          const newEndWeek = realDataCheck.weekInPlan + weeksRemaining + 1;

          console.log(`📊 Analytics: Tanque ${assignment.tank.id} - Peso actual ${realDataCheck.latestWeight}g (curva sem ${weekInCurve}), target ${targetWeight}g (curva sem ${targetWeekInCurve}), nueva fecha fin: semana ${newEndWeek}`);

          // 🔧 TEMPORAL: Evitar fechas fin negativas o muy tempranas
          if (newEndWeek < assignment.startWeek + 1) {
            console.log(`⚠️ Fecha fin calculada (${newEndWeek}) es muy temprana, usando fecha fin original (${assignment.startWeek + adjustedGrowoutDuration - 1})`);
            finalEndWeek = assignment.startWeek + adjustedGrowoutDuration - 1;
          } else {
            finalEndWeek = newEndWeek;
          }
        }
      }

      return {
        tankId: assignment.tank.id,
        name: assignment.tank.name,
        area: assignment.tank.area,
        assignedShrimp: assignment.assignment,
        startWeek: assignment.startWeek,
        endWeek: finalEndWeek,
        utilization: assignment.utilization
      };
    });

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
      const actualGrowoutDuration = growout.endWeek - growout.startWeek + 1;
      for (let week = growout.startWeek; week <= growout.endWeek; week++) {
        const cellKey = `tank-${growout.tankId}-week-${week}`;
        ganttData[cellKey] = 'Growout';
        ganttData[`${cellKey}-generation`] = generation;
        ganttData[`${cellKey}-genetics`] = parameters.geneticsId.toString();
        ganttData[`${cellKey}-duration`] = actualGrowoutDuration.toString();
      }
    });

    // 5. Calcular alternativas disponibles
    const nurseryTanks = availableTanks.filter(tank => tank.type === 'Nursery');
    const growoutTanks = availableTanks.filter(tank => tank.type === 'Growout');

    const availableNurseryAlternatives = nurseryTanks
      .filter(tank => !selectedNurseryTanks.some(selected => selected.id === tank.id))
      .map(tank => {
        const availableWeek = findAvailabilityWindow(
          existingData,
          tank.id,
          startWeek,
          nurseryDuration,
          maxWeeks
        );
        return {
          tankId: tank.id,
          name: tank.name,
          area: tank.area,
          availableFromWeek: availableWeek
        };
      })
      .filter(alt => alt.availableFromWeek !== -1);

    const selectedGrowoutIds = growoutAssignments.map(assignment => assignment.tank.id);
    const availableGrowoutAlternatives = growoutTanks
      .filter(tank => !selectedGrowoutIds.includes(tank.id))
      .map(tank => {
        const availableWeek = findAvailabilityWindow(
          existingData,
          tank.id,
          growoutStartWeek,
          adjustedGrowoutDuration,
          maxWeeks
        );
        return {
          tankId: tank.id,
          name: tank.name,
          area: tank.area,
          maxCapacity: tank.area * growoutDensity,
          availableFromWeek: availableWeek
        };
      })
      .filter(alt => alt.availableFromWeek !== -1);

    // 6. Crear resumen
    const requiredGrowoutArea = expectedSurvivors / growoutDensity;
    const assignedGrowoutArea = growoutPlan.reduce((sum, tank) => sum + tank.area, 0);

    const plan: SeedingPlan = {
      nurseryTanks: nurseryPlan,
      growoutTanks: growoutPlan,
      availableAlternatives: {
        nurseryTanks: availableNurseryAlternatives,
        growoutTanks: availableGrowoutAlternatives
      },
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
  minGapWeeks: number = 1,
  getWeightByWeek?: (geneticsId: number, week: number) => number
): number {
  // Calcular duración total considerando peso objetivo si está disponible
  let adjustedGrowoutDuration = parameters.growoutDuration;
  if (parameters.targetWeight && getWeightByWeek && parameters.geneticsId) {
    adjustedGrowoutDuration = calculateTargetDuration(parameters.targetWeight, parameters.geneticsId, getWeightByWeek);
  }

  const totalCycleDuration = parameters.nurseryDuration + adjustedGrowoutDuration;

  for (let week = parameters.startWeek; week <= maxWeeks - totalCycleDuration; week++) {
    const result = generateOptimizedSeedingPlan(
      { ...parameters, startWeek: week },
      availableTanks,
      existingData,
      maxWeeks,
      getWeightByWeek
    );

    if (result.success) {
      return week;
    }

    // Si hay conflictos, intentar la siguiente semana
  }

  return -1; // No hay ventana disponible
}