"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Target, TrendingUp } from 'lucide-react';
import { useGeneraciones } from '@/hooks/useGeneraciones';
import { useGenetics } from '@/hooks/useGenetics';
import { useMuestreos } from '@/lib/hooks/useMuestreos';
import { GenerationAutocomplete } from '@/components/ui/generation-autocomplete';
import {
  generateOptimizedSeedingPlan,
  SeedingParameters,
  Tank
} from '@/lib/algorithms/seedingOptimizer';
import { usePlannerCrud } from '@/hooks/usePlannerCrud';
import { getPlanDates } from '@/lib/utils/planDates';

interface LocationData {
  id: number;
  name: string;
  numTanks: number;
  startDate: Date;
  endDate: Date;
  data: Record<string, any>;
  tankNames: Record<number, string>;
  tankTypes: Record<number, string>;
  tankSizes: Record<number, number>;
}

interface AnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
  location: LocationData | null;
  locationKey: string;
  currentPlanId?: string;
  onApplyPlanToGantt?: (planData: any) => void;
}

// Datos mock para análisis
const mockAnalytics = {
  tankUtilization: {
    ready: 8,
    nursery: 2,
    growout: 2,
    maintenance: 0,
    outOfOrder: 0
  },
  weeklyCapacity: {
    totalArea: 350.5,
    utilizationRate: 65,
    availableArea: 122.5
  },
  seedingPlan: {
    larvaeCapacity: 150000,
    expectedSurvival: 120000,
    harvestWeight: 2400,
    cycleLength: 12
  }
};

export function Analytics({ isOpen, onClose, location, locationKey, currentPlanId, onApplyPlanToGantt }: AnalyticsProps) {
  const { getGeneracionOptions, generaciones, loadGeneraciones } = useGeneraciones();
  const { genetics, getWeightByWeek, loading: geneticsLoading } = useGenetics();
  const { sesiones: muestreosSesiones } = useMuestreos();
  const { loadPlannerDataByRange } = usePlannerCrud();
  const [selectedTab, setSelectedTab] = useState('utilization');
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [planningMode, setPlanningMode] = useState<'weeks' | 'weight'>('weeks');
  const [muestreosDetalle, setMuestreosDetalle] = useState<any[]>([]);
  const [seedingParams, setSeedingParams] = useState({
    numberOfNurseries: 2,
    nurseryDensity: 1500,
    growoutDensity: 350,
    mortalityPercentage: 20,
    nurseryDuration: 3,
    growoutDuration: 8,
    targetWeight: 25 as number | string, // Nueva propiedad para talla deseada
    generation: '',
    geneticsId: 1,
    startWeek: 1 // Semana de inicio seleccionada del planner (base 1)
  });

  const [calculatedResults, setCalculatedResults] = useState<any>(null);
  const [customTankSelection, setCustomTankSelection] = useState<{
    nurseryTanks: number[];
    growoutTanks: number[];
  } | null>(null);

  // ⚠️ REMOVIDO: useEffect que causaba loops infinitos al refrescar generaciones

  // Cargar muestreos_detalle que contiene los datos reales (peso, estanque_id)
  useEffect(() => {
    const loadMuestreosDetalle = async () => {
      try {
        const { data, error } = await supabase
          .from('muestreos_detalle')
          .select(`
            *,
            muestreos_sesiones!inner (
              id,
              fecha,
              generacion_id,
              generaciones (
                codigo,
                nombre
              )
            )
          `);

        if (error) {
          console.log('Error cargando muestreos_detalle en Analytics:', error);
          return;
        }

        setMuestreosDetalle(data || []);
      } catch (error) {
        console.log('Error en Analytics:', error);
      }
    };

    loadMuestreosDetalle();
  }, []);

  // Calcular número de semanas
  const getNumWeeks = () => {
    if (!location?.endDate || !location?.startDate) return 52; // Default to 52 weeks
    const diffTime = Math.abs(location.endDate.getTime() - location.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  };

  // Generar opciones de semanas
  const generateWeekOptions = () => {
    const numWeeks = getNumWeeks();
    const options = [];
    const startDate = location?.startDate ? new Date(location.startDate) : new Date('2025-01-06');

    for (let i = 0; i < numWeeks; i++) {
      const weekDate = new Date(startDate);
      weekDate.setDate(startDate.getDate() + (i * 7));

      options.push({
        value: i,  // Regresar a base-0 porque el seeding optimizer espera base-0
        label: `Semana ${i + 1}`,
        date: weekDate.toLocaleDateString('es-ES', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit'
        })
      });
    }

    return options;
  };

  const weekOptions = generateWeekOptions();

  // Obtener fecha por número de semana
  const getDateByWeek = (weekNumber: number) => {
    const startDate = location?.startDate ? new Date(location.startDate) : new Date('2025-01-06');
    const weekDate = new Date(startDate);
    weekDate.setDate(startDate.getDate() + (weekNumber * 7));
    // Formato dd/mm/aa
    const day = weekDate.getDate().toString().padStart(2, '0');
    const month = (weekDate.getMonth() + 1).toString().padStart(2, '0');
    const year = weekDate.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  // Obtener rango de fechas para un rango de semanas
  const getDateRangeForWeeks = (startWeek: number, endWeek: number) => {
    const startDateStr = getDateByWeek(startWeek);
    const endDateStr = getDateByWeek(endWeek);
    return `${startDateStr} - ${endDateStr}`;
  };

  // Función para verificar si hay datos reales para un tanque/generación
  const hasRealDataForTankGeneration = (tankId: number, generationCode: string): { hasData: boolean, latestWeight?: number, weekInPlan?: number } => {
    if (!muestreosDetalle || muestreosDetalle.length === 0) {
      return { hasData: false };
    }

    // Buscar la generación por código para obtener su ID
    const generacionObj = generaciones.find(g => g.codigo === generationCode);
    if (!generacionObj) {
      return { hasData: false };
    }

    // Buscar datos que coincidan con estanque_id y generacion_id
    // Y que estén dentro del rango de fechas del plan actual
    const planDates = getPlanDates();
    const planStartDate = location?.startDate || planDates.startDate;
    const planEndDate = location?.endDate || planDates.endDate;

    const matchingData = muestreosDetalle.filter(detalle => {
      const muestreoDate = new Date(detalle.muestreos_sesiones.fecha);
      const dateInRange = muestreoDate >= planStartDate && muestreoDate <= planEndDate;

      return detalle.estanque_id === tankId &&
        detalle.muestreos_sesiones.generacion_id === generacionObj.id &&
        dateInRange;
    });

    if (matchingData.length === 0) {
      return { hasData: false };
    }

    // Encontrar el dato más reciente
    const latestData = matchingData.sort((a, b) =>
      new Date(b.muestreos_sesiones.fecha).getTime() - new Date(a.muestreos_sesiones.fecha).getTime()
    )[0];

    // Calcular en qué semana del plan está ese muestreo
    const muestreoDate = new Date(latestData.muestreos_sesiones.fecha);
    const weeksDiff = Math.floor((muestreoDate.getTime() - planStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

    return {
      hasData: true,
      latestWeight: latestData.average_size,
      weekInPlan: weeksDiff,
      fecha: latestData.muestreos_sesiones.fecha
    };
  };

  // Función para encontrar la semana necesaria para alcanzar una talla objetivo
  const findWeekForTargetWeight = (geneticsId: number, targetWeight: number): number => {
    // Buscar iterativamente desde semana 0 hasta que encuentre el peso objetivo
    for (let week = 0; week <= 52; week++) {
      const currentWeight = getWeightByWeek(geneticsId, week);

      if (currentWeight >= targetWeight) {
        return week;
      }
    }
    // Si no encuentra el peso en 52 semanas, devolver 52
    return 52;
  };

  // Función para calcular automáticamente la duración de growout basada en talla
  const calculateGrowoutDurationByWeight = () => {
    if (planningMode === 'weight' && typeof seedingParams.targetWeight === 'number' && seedingParams.targetWeight > 0) {
      const totalWeeksNeeded = findWeekForTargetWeight(seedingParams.geneticsId, seedingParams.targetWeight);
      const growoutDuration = Math.max(1, totalWeeksNeeded - seedingParams.nurseryDuration);
      return growoutDuration;
    }
    return seedingParams.growoutDuration;
  };

  // Calcular plan de siembra optimizado
  const calculateSeedingPlan = async () => {
    if (!location) return;

    try {
      // Simular tanques disponibles
      const availableTanks: Tank[] = Object.entries(location.tankSizes).map(([id, area]) => ({
        id: parseInt(id),
        name: location.tankNames[parseInt(id)] || `Tanque ${id}`,
        type: location.tankTypes[parseInt(id)] || 'General',
        area: area
      }));

      console.log('🏗️ Tanques disponibles:', availableTanks);
      const nurseryTanks = availableTanks.filter(t => t.type === 'Nursery');
      const growoutTanks = availableTanks.filter(t => t.type === 'Growout');
      console.log('🍼 Tanques Nursery encontrados:', nurseryTanks.length, nurseryTanks.map(t => `${t.id}(${t.name})`));
      console.log('🦐 Tanques Growout encontrados:', growoutTanks.length, growoutTanks.map(t => `${t.id}(${t.name})`));

      // Cargar datos existentes actuales desde Supabase
      let existingData: Record<string, any> = {};

      if (currentPlanId) {
        console.log('🔄 Cargando datos actuales desde Supabase para cálculo de siembra...');
        // Usar el rango de fechas del planner basado en la semana seleccionada
        const fechaInicio = location.startDate.toISOString().split('T')[0];
        const fechaFin = location.endDate.toISOString().split('T')[0];
        const tankIds = Object.keys(location.tankNames).map(id => parseInt(id));

        const data = await loadPlannerDataByRange(currentPlanId, fechaInicio, fechaFin, tankIds);

        // Convertir datos de Supabase a formato de tableData
        data.forEach(item => {
          if (item.tipo === 'bloque') {
            for (let semana = item.semana_inicio; semana <= item.semana_fin; semana++) {
              const cellKey = `tank-${item.estanque_id}-week-${semana}`;
              existingData[cellKey] = item.estado;

              if (item.generacion_id) {
                const generacion = generaciones.find(g => g.id === item.generacion_id);
                if (generacion) {
                  existingData[`${cellKey}-generation`] = generacion.codigo;
                }
              }

              if (item.genetica_id) {
                const genetica = genetics.find(g => g.id === item.genetica_id);
                if (genetica) {
                  existingData[`${cellKey}-genetics`] = genetica.id.toString();
                }
              }

              const duracion = item.semana_fin - item.semana_inicio + 1;
              existingData[`${cellKey}-duration`] = duracion.toString();
            }
          }
        });

        console.log('📊 Datos existentes cargados:', Object.keys(existingData).length, 'entradas');
        console.log('🔍 Muestra de datos existentes:', Object.fromEntries(
          Object.entries(existingData).slice(0, 10)
        ));
      } else {
        console.log('⚠️ No hay plan actual, usando datos de location...');
        existingData = { ...(location.data || {}) };
      }

      // Calcular duración de growout (automática si es por peso, manual si es por semanas)
      const actualGrowoutDuration = calculateGrowoutDurationByWeight();

      // Usar la semana seleccionada por el usuario exactamente
      console.log('📅 Semana inicio recibida desde seedingParams:', seedingParams.startWeek);
      console.log('📅 seedingParams completo:', seedingParams);
      const numWeeks = getNumWeeks();

      // Generar plan con la semana exacta seleccionada por el usuario
      const parameters: SeedingParameters = {
        ...seedingParams,
        growoutDuration: actualGrowoutDuration, // Usar duración calculada
        startWeek: seedingParams.startWeek
      };

      const result = generateOptimizedSeedingPlan(
        parameters,
        availableTanks,
        existingData,
        numWeeks,
        getWeightByWeek,
        hasRealDataForTankGeneration
      );

      if (result.success && result.plan) {
        const { plan } = result;

        // Usar la semana seleccionada por el usuario
        const realNurseryStartWeek = seedingParams.startWeek;

        const results = {
          totalLarvae: plan.summary.totalLarvae,
          totalArea: plan.summary.nurseryAreaUsed,
          expectedSurvival: plan.summary.expectedSurvivors,
          requiredGrowoutArea: plan.summary.growoutAreaRequired.toFixed(1),
          harvestWeight: (plan.summary.expectedSurvivors * 0.02).toFixed(1), // 20g promedio
          survivalRate: plan.summary.survivalRate.toFixed(1),
          nurseryTanks: plan.nurseryTanks.length,
          requiredGrowoutTanks: plan.growoutTanks.length,
          optimalStartWeek: realNurseryStartWeek, // Usar semana real del nursery
          actualGrowoutDuration, // Agregar duración calculada
          targetWeight: seedingParams.targetWeight, // Agregar talla objetivo
          planningMode, // Agregar modo de planificación
          optimizedPlan: plan
        };

        setCalculatedResults(results);
      } else {
        alert(`Error al generar plan: ${result.error}`);
        setCalculatedResults(null);
      }
    } catch (error) {
      console.log('Error calculating seeding plan:', error);
      alert('Error al calcular el plan de siembra');
      setCalculatedResults(null);
    }
  };

  // Manejar cambio de tanque por parte del usuario
  const handleTankChange = (type: 'nursery' | 'growout', index: number, newTankId: number) => {
    if (!calculatedResults?.optimizedPlan) return;

    console.log(`🔄 Usuario cambió ${type} ${index} a tanque ${newTankId}`);

    // Actualizar selección personalizada
    const currentSelection = customTankSelection || {
      nurseryTanks: calculatedResults.optimizedPlan.nurseryTanks.map(t => t.tankId),
      growoutTanks: calculatedResults.optimizedPlan.growoutTanks.map(t => t.tankId)
    };

    const newSelection = { ...currentSelection };

    if (type === 'nursery') {
      newSelection.nurseryTanks[index] = newTankId;
    } else {
      newSelection.growoutTanks[index] = newTankId;
    }

    setCustomTankSelection(newSelection);

    // Recalcular automáticamente con la nueva selección
    recalculateWithCustomTanks(newSelection);
  };

  // Recalcular plan con tanques personalizados
  const recalculateWithCustomTanks = async (tankSelection: { nurseryTanks: number[]; growoutTanks: number[] }) => {
    if (!location || !calculatedResults?.optimizedPlan) return;

    try {
      console.log('🔄 Recalculando plan con tanques personalizados...', tankSelection);

      // Simular tanques disponibles
      const availableTanks: Tank[] = Object.entries(location.tankSizes).map(([id, area]) => ({
        id: parseInt(id),
        name: location.tankNames[parseInt(id)] || `Tanque ${id}`,
        type: location.tankTypes[parseInt(id)] || 'General',
        area: area
      }));

      // Cargar datos existentes (igual que en calculateSeedingPlan)
      let existingData: Record<string, any> = {};

      if (currentPlanId) {
        // Usar el rango de fechas del planner
        const fechaInicio = location.startDate.toISOString().split('T')[0];
        const fechaFin = location.endDate.toISOString().split('T')[0];
        const tankIds = Object.keys(location.tankNames).map(id => parseInt(id));

        const data = await loadPlannerDataByRange(currentPlanId, fechaInicio, fechaFin, tankIds);

        data.forEach(item => {
          if (item.tipo === 'bloque') {
            for (let semana = item.semana_inicio; semana <= item.semana_fin; semana++) {
              const cellKey = `tank-${item.estanque_id}-week-${semana}`;
              existingData[cellKey] = item.estado;

              if (item.generacion_id) {
                const generacion = generaciones.find(g => g.id === item.generacion_id);
                if (generacion) {
                  existingData[`${cellKey}-generation`] = generacion.codigo;
                }
              }

              if (item.genetica_id) {
                const genetica = genetics.find(g => g.id === item.genetica_id);
                if (genetica) {
                  existingData[`${cellKey}-genetics`] = genetica.id.toString();
                }
              }

              const duracion = item.semana_fin - item.semana_inicio + 1;
              existingData[`${cellKey}-duration`] = duracion.toString();
            }
          }
        });
      } else {
        existingData = { ...(location.data || {}) };
      }

      // Crear plan personalizado usando los tanques seleccionados
      const originalPlan = calculatedResults.optimizedPlan;

      // TODO: Implementar lógica de recalculación con tanques específicos
      // Por ahora, actualizar los resultados con los nuevos tanques seleccionados

      const updatedPlan = { ...originalPlan };

      // Actualizar nursery tanks si cambiaron
      updatedPlan.nurseryTanks = tankSelection.nurseryTanks.map((tankId, index) => {
        const tank = availableTanks.find(t => t.id === tankId);
        const originalTank = originalPlan.nurseryTanks[index];

        return tank ? {
          tankId: tank.id,
          name: tank.name,
          area: tank.area,
          larvaeCapacity: tank.area * seedingParams.nurseryDensity,
          startWeek: originalTank.startWeek,
          endWeek: originalTank.endWeek
        } : originalTank;
      });

      // Actualizar growout tanks si cambiaron
      updatedPlan.growoutTanks = tankSelection.growoutTanks.map((tankId, index) => {
        const tank = availableTanks.find(t => t.id === tankId);
        const originalTank = originalPlan.growoutTanks[index];

        return tank ? {
          tankId: tank.id,
          name: tank.name,
          area: tank.area,
          assignedShrimp: originalTank.assignedShrimp,
          startWeek: originalTank.startWeek,
          endWeek: originalTank.endWeek,
          utilization: (originalTank.assignedShrimp / (tank.area * seedingParams.growoutDensity)) * 100
        } : originalTank;
      });

      // Regenerar ganttData
      const ganttData: Record<string, any> = {};

      // Configurar celdas nursery
      updatedPlan.nurseryTanks.forEach(nursery => {
        for (let week = nursery.startWeek; week <= nursery.endWeek; week++) {
          const cellKey = `tank-${nursery.tankId}-week-${week}`;
          ganttData[cellKey] = 'Nursery';
          ganttData[`${cellKey}-generation`] = seedingParams.generation;
          ganttData[`${cellKey}-genetics`] = seedingParams.geneticsId.toString();
          ganttData[`${cellKey}-duration`] = seedingParams.nurseryDuration.toString();
        }
      });

      // Configurar celdas growout
      updatedPlan.growoutTanks.forEach(growout => {
        for (let week = growout.startWeek; week <= growout.endWeek; week++) {
          const cellKey = `tank-${growout.tankId}-week-${week}`;
          ganttData[cellKey] = 'Growout';
          ganttData[`${cellKey}-generation`] = seedingParams.generation;
          ganttData[`${cellKey}-genetics`] = seedingParams.geneticsId.toString();
          ganttData[`${cellKey}-duration`] = calculateGrowoutDurationByWeight().toString();
        }
      });

      updatedPlan.ganttData = ganttData;

      // Actualizar resultados
      setCalculatedResults({
        ...calculatedResults,
        optimizedPlan: updatedPlan
      });

      console.log('✅ Plan recalculado con tanques personalizados');

    } catch (error) {
      console.log('Error al recalcular con tanques personalizados:', error);
      alert('Error al recalcular el plan con los nuevos tanques');
    }
  };

  // Aplicar plan de siembra optimizado al gantt
  const applyPlanToGantt = () => {
    if (!calculatedResults?.optimizedPlan || !onApplyPlanToGantt) return;

    const { optimizedPlan } = calculatedResults;

    // Llamar a la función para aplicar al gantt
    console.log('🎯 Aplicando plan con startWeek:', seedingParams.startWeek);
    onApplyPlanToGantt({
      ganttData: optimizedPlan.ganttData,
      planDetails: {
        generation: seedingParams.generation,
        genetics: genetics.find(g => g.id === seedingParams.geneticsId)?.name || 'Unknown',
        totalCycle: seedingParams.nurseryDuration + calculatedResults.actualGrowoutDuration,
        nurseryTanks: optimizedPlan.nurseryTanks.length,
        growoutTanks: optimizedPlan.growoutTanks.length,
        expectedHarvest: calculatedResults.harvestWeight,
        startWeek: seedingParams.startWeek,  // Usar la semana seleccionada por el usuario
        planningMode: calculatedResults.planningMode,
        targetWeight: calculatedResults.targetWeight
      }
    });

    // Cerrar el modal después de aplicar
    onClose();
  };

  // Analizar utilización de tanques por semana
  const getTankUtilizationForWeek = (week: number) => {
    // Simulación de datos - en la implementación real vendría de location.data
    const utilization = {
      ready: Math.floor(Math.random() * 5) + 3,
      nursery: Math.floor(Math.random() * 3) + 1,
      growout: Math.floor(Math.random() * 4) + 1,
      maintenance: Math.floor(Math.random() * 2),
      reservoir: Math.floor(Math.random() * 2),
      outOfOrder: Math.floor(Math.random() * 1)
    };

    return utilization;
  };

  const currentWeekUtilization = getTankUtilizationForWeek(selectedWeek);


  if (!isOpen) return null;

  // Show loading state when location is not available
  if (!location) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analytics y Planificación</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-gray-500">Selecciona una ubicación para ver las analíticas</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[90vw] !w-[90vw] max-h-[90vh] overflow-y-auto" style={{ width: '90vw', maxWidth: '90vw' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics y Planificación - {location.name}
          </DialogTitle>
        </DialogHeader>

        <div className="w-full">
          {/* Tabs Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setSelectedTab('utilization')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'utilization'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Utilización de Tanques
            </button>
            <button
              onClick={() => setSelectedTab('seeding')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'seeding'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Planificación de Siembra
            </button>
            <button
              onClick={() => setSelectedTab('capacity')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'capacity'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Análisis de Capacidad
            </button>
          </div>

          {/* Análisis de Utilización */}
          {selectedTab === 'utilization' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Utilización por Semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Seleccionar Semana:</label>
                    <Select value={selectedWeek.toString()} onValueChange={(value) => setSelectedWeek(parseInt(value))}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weekOptions.map((week) => (
                          <SelectItem key={week.value} value={week.value.toString()}>
                            {week.label} ({week.date})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-green-600 mb-1">{currentWeekUtilization.ready}</div>
                        <div className="text-sm text-gray-600">Listos</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-yellow-600 mb-1">{currentWeekUtilization.nursery}</div>
                        <div className="text-sm text-gray-600">Nursery</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">{currentWeekUtilization.growout}</div>
                        <div className="text-sm text-gray-600">Engorde</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-1">{currentWeekUtilization.reservoir}</div>
                        <div className="text-sm text-gray-600">Reservorio</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-orange-600 mb-1">{currentWeekUtilization.maintenance}</div>
                        <div className="text-sm text-gray-600">Mantenimiento</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-red-600 mb-1">{currentWeekUtilization.outOfOrder}</div>
                        <div className="text-sm text-gray-600">Fuera de servicio</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-sm text-gray-600 mb-2">Tasa de Utilización</div>
                        <div className="text-2xl font-semibold text-blue-600">
                          {location ? ((location.numTanks - currentWeekUtilization.ready) / location.numTanks * 100).toFixed(1) : 0}%
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-sm text-gray-600 mb-2">Tanques Productivos</div>
                        <div className="text-2xl font-semibold text-green-600">
                          {currentWeekUtilization.nursery + currentWeekUtilization.growout}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-sm text-gray-600 mb-2">Área Total Activa</div>
                        <div className="text-2xl font-semibold text-purple-600">
                          {((currentWeekUtilization.nursery + currentWeekUtilization.growout) * 35).toFixed(1)} m²
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Planificación de Siembra */}
          {selectedTab === 'seeding' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Parámetros de Siembra */}
              <Card>
                <CardHeader>
                  <CardTitle>Parámetros de Siembra</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Generación</label>
                      <GenerationAutocomplete
                        value={seedingParams.generation}
                        onChange={(value) => {
                          console.log('📝 Generación seleccionada/creada:', value);
                          setSeedingParams({...seedingParams, generation: value});
                        }}
                        placeholder="Buscar o crear generación..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Genética</label>
                      <Select
                        value={seedingParams.geneticsId.toString()}
                        onValueChange={(value) => setSeedingParams({...seedingParams, geneticsId: parseInt(value)})}
                        disabled={geneticsLoading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {genetics.map((genetic) => (
                            <SelectItem key={genetic.id} value={genetic.id.toString()}>
                              {genetic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Selector de Semana de Inicio */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Semana de Inicio de Siembra</label>
                    <Select
                      value={seedingParams.startWeek.toString()}
                      onValueChange={(value) => {
                        const newStartWeek = parseInt(value);
                        console.log(`🗓️ Cambiando startWeek: ${seedingParams.startWeek} → ${newStartWeek}`);
                        console.log(`🗓️ Dropdown value recibido: "${value}"`);
                        setSeedingParams({...seedingParams, startWeek: newStartWeek});
                        console.log(`🗓️ seedingParams después del cambio:`, {...seedingParams, startWeek: newStartWeek});
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weekOptions.map((week) => (
                          <SelectItem key={week.value} value={week.value.toString()}>
                            {week.label} - {week.date}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Selecciona la semana del planner donde iniciará la siembra
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Tanques Nursery</label>
                      <Input
                        type="number"
                        value={seedingParams.numberOfNurseries}
                        onChange={(e) => setSeedingParams({...seedingParams, numberOfNurseries: parseInt(e.target.value) || 1})}
                        min="1"
                        max={location?.numTanks || 15}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Densidad Nursery</label>
                      <Input
                        type="number"
                        value={seedingParams.nurseryDensity}
                        onChange={(e) => setSeedingParams({...seedingParams, nurseryDensity: parseInt(e.target.value) || 1500})}
                        placeholder="larvae/m²"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Densidad Engorde</label>
                      <Input
                        type="number"
                        value={seedingParams.growoutDensity}
                        onChange={(e) => setSeedingParams({...seedingParams, growoutDensity: parseInt(e.target.value) || 350})}
                        placeholder="juveniles/m²"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Mortalidad esperada del nursery (%)</label>
                      <Input
                        type="number"
                        value={seedingParams.mortalityPercentage}
                        onChange={(e) => setSeedingParams({...seedingParams, mortalityPercentage: parseInt(e.target.value) || 20})}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>

                  {/* Selector de modo de planificación */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Modo de Planificación</label>
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setPlanningMode('weeks')}
                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                          planningMode === 'weeks'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Por Semanas
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanningMode('weight')}
                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                          planningMode === 'weight'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Por Talla Objetivo
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Duración Nursery</label>
                      <Input
                        type="number"
                        value={seedingParams.nurseryDuration}
                        onChange={(e) => setSeedingParams({...seedingParams, nurseryDuration: parseInt(e.target.value) || 3})}
                        placeholder="semanas"
                      />
                    </div>
                    <div>
                      {planningMode === 'weeks' ? (
                        <>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">Duración Engorde</label>
                          <Input
                            type="number"
                            value={seedingParams.growoutDuration}
                            onChange={(e) => setSeedingParams({...seedingParams, growoutDuration: parseInt(e.target.value) || 8})}
                            placeholder="semanas"
                          />
                        </>
                      ) : (
                        <>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">Talla Objetivo</label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              value={seedingParams.targetWeight}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Permitir campo vacío o valores válidos
                                if (value === '' || value === '.') {
                                  setSeedingParams({...seedingParams, targetWeight: value});
                                } else {
                                  const numValue = parseFloat(value);
                                  if (!isNaN(numValue)) {
                                    setSeedingParams({...seedingParams, targetWeight: numValue});
                                  }
                                }
                              }}
                              placeholder="25.0"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">g</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Duración calculada: {calculateGrowoutDurationByWeight()} semanas
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <Button onClick={calculateSeedingPlan} className="w-full">
                    Calcular Plan de Siembra
                  </Button>
                </CardContent>
              </Card>

              {/* Resultados del Cálculo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Resultados del Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {calculatedResults ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-sm text-blue-600 mb-1">Total de Larvas</div>
                          <div className="text-xl font-bold text-blue-800">
                            {calculatedResults.totalLarvae.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="text-sm text-green-600 mb-1">Supervivencia Esperada</div>
                          <div className="text-xl font-bold text-green-800">
                            {calculatedResults.expectedSurvival.toLocaleString()}
                            <span className="text-xs font-normal ml-1">juveniles</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-yellow-50 rounded-lg">
                          <div className="text-sm text-yellow-600 mb-1">Área Nursery</div>
                          <div className="text-xl font-bold text-yellow-800">
                            {calculatedResults.totalArea.toFixed(1)} m²
                          </div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <div className="text-sm text-purple-600 mb-1">Área Engorde Req.</div>
                          <div className="text-xl font-bold text-purple-800">
                            {calculatedResults.requiredGrowoutArea} m²
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-orange-50 rounded-lg">
                          <div className="text-sm text-orange-600 mb-1">Peso de Cosecha</div>
                          <div className="text-xl font-bold text-orange-800">
                            {calculatedResults.harvestWeight} kg
                          </div>
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-lg">
                          <div className="text-sm text-indigo-600 mb-1">Tanques Engorde</div>
                          <div className="text-xl font-bold text-indigo-800">
                            {calculatedResults.requiredGrowoutTanks}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Semana Óptima de Inicio:</span>
                          <Badge className="bg-green-100 text-green-800">Semana {calculatedResults.optimalStartWeek + 1}</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-2">
                          <span className="text-gray-600">Tasa de Supervivencia del Nursery:</span>
                          <Badge variant="outline">{calculatedResults.survivalRate}%</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-2">
                          <span className="text-gray-600">Duración Total del Ciclo:</span>
                          <Badge variant="outline">{seedingParams.nurseryDuration + calculatedResults.actualGrowoutDuration} semanas</Badge>
                        </div>
                        {calculatedResults.planningMode === 'weight' && (
                          <div className="flex justify-between items-center text-sm mt-2">
                            <span className="text-gray-600">Talla Objetivo:</span>
                            <Badge variant="outline" className="bg-blue-50 text-blue-800">{calculatedResults.targetWeight}g</Badge>
                          </div>
                        )}
                      </div>

                      {/* Sección de Selección de Tanques */}
                      {calculatedResults.optimizedPlan?.availableAlternatives && (
                        <div className="mt-6 pt-6 border-t">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            🔄 Configuración de Tanques
                          </h3>

                          {/* Tanques Nursery */}
                          <div className="mb-6">
                            <h4 className="text-md font-medium text-gray-700 mb-3">Tanques Nursery</h4>
                            <div className="space-y-2">
                              {calculatedResults.optimizedPlan.nurseryTanks.map((tank, index) => (
                                <div key={tank.tankId} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-gray-700">Nursery {index + 1}:</span>
                                      <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-sm font-medium">
                                        {tank.name} ({tank.area}m²)
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        Semana {tank.startWeek + 1}-{tank.endWeek + 1} ({getDateRangeForWeeks(tank.startWeek, tank.endWeek)})
                                      </span>
                                    </div>
                                    {calculatedResults.optimizedPlan.availableAlternatives.nurseryTanks.length > 0 && (
                                      <Select value={tank.tankId.toString()} onValueChange={(value) => handleTankChange('nursery', index, parseInt(value))}>
                                        <SelectTrigger className="w-32">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {/* Tanque actual */}
                                          <SelectItem value={tank.tankId.toString()}>
                                            {tank.name}
                                          </SelectItem>
                                          {/* Alternativas */}
                                          {calculatedResults.optimizedPlan.availableAlternatives.nurseryTanks.map((alt) => (
                                            <SelectItem key={alt.tankId} value={alt.tankId.toString()}>
                                              {alt.name} ({alt.area}m²) - Desde semana {alt.availableFromWeek + 1} ({getDateByWeek(alt.availableFromWeek)})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Tanques Growout */}
                          <div className="mb-4">
                            <h4 className="text-md font-medium text-gray-700 mb-3">Tanques Growout</h4>
                            <div className="space-y-2">
                              {calculatedResults.optimizedPlan.growoutTanks.map((tank, index) => {
                                const isLowUtilization = tank.utilization < 90;
                                const containerClasses = isLowUtilization
                                  ? "p-3 bg-red-50 rounded-lg border border-red-200"
                                  : "p-3 bg-blue-50 rounded-lg border border-blue-200";
                                const tagClasses = isLowUtilization
                                  ? "px-2 py-1 bg-red-200 text-red-800 rounded text-sm font-medium"
                                  : "px-2 py-1 bg-blue-200 text-blue-800 rounded text-sm font-medium";

                                return (
                                  <div key={tank.tankId} className={containerClasses}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-gray-700">Growout {index + 1}:</span>
                                        <span className={tagClasses}>
                                          {tank.name} ({tank.area}m²)
                                          {isLowUtilization && (
                                            <span className="ml-1 text-xs">⚠️</span>
                                          )}
                                        </span>
                                        <div className="flex flex-col">
                                          <span className="text-xs text-gray-500">
                                            Semanas {tank.startWeek + 1}-{tank.endWeek + 1} ({getDateRangeForWeeks(tank.startWeek, tank.endWeek)})
                                          </span>
                                          <span className={`text-xs ${isLowUtilization ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                            {tank.assignedShrimp.toLocaleString()} camarones ({tank.utilization.toFixed(1)}%)
                                          </span>
                                        </div>
                                    </div>
                                    {calculatedResults.optimizedPlan.availableAlternatives.growoutTanks.length > 0 && (
                                      <Select value={tank.tankId.toString()} onValueChange={(value) => handleTankChange('growout', index, parseInt(value))}>
                                        <SelectTrigger className="w-32">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {/* Tanque actual */}
                                          <SelectItem value={tank.tankId.toString()}>
                                            {tank.name}
                                          </SelectItem>
                                          {/* Alternativas */}
                                          {calculatedResults.optimizedPlan.availableAlternatives.growoutTanks.map((alt) => (
                                            <SelectItem key={alt.tankId} value={alt.tankId.toString()}>
                                              {alt.name} ({alt.area}m²) - Desde semana {alt.availableFromWeek + 1} ({getDateByWeek(alt.availableFromWeek)})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Botón para aplicar al gantt */}
                      <div className="pt-4 border-t mt-4">
                        <Button
                          onClick={applyPlanToGantt}
                          className="w-full bg-teal-600 hover:bg-teal-700"
                          disabled={!onApplyPlanToGantt || !seedingParams.generation}
                        >
                          🗓️ Aplicar Plan al Gantt
                        </Button>
                        {!seedingParams.generation && (
                          <p className="text-xs text-orange-600 text-center mt-2">
                            Seleccione una generación para aplicar el plan
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      Configure los parámetros y haga clic en "Calcular Plan de Siembra" para ver los resultados
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          )}

          {/* Análisis de Capacidad */}
          {selectedTab === 'capacity' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Capacidad de la Granja</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Capacidad Física</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total de Tanques:</span>
                        <span className="font-medium">{location?.numTanks || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Área Total:</span>
                        <span className="font-medium">
                          {location ? Object.values(location.tankSizes).reduce((sum, size) => sum + size, 0).toFixed(1) : 0} m²
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Capacidad Larvaria:</span>
                        <span className="font-medium">
                          {location ? (Object.values(location.tankSizes).reduce((sum, size) => sum + size, 0) * 1500).toLocaleString() : 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Capacidad Juveniles:</span>
                        <span className="font-medium">
                          {location ? (Object.values(location.tankSizes).reduce((sum, size) => sum + size, 0) * 350).toLocaleString() : 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Distribución por Tipo</h3>
                    <div className="space-y-3">
                      {location && Object.values(location.tankTypes).reduce((acc: any, type: string) => {
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                      }, {}) && Object.entries(Object.values(location.tankTypes).reduce((acc: any, type: string) => {
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                      }, {})).map(([type, count]) => (
                        <div key={type} className="flex justify-between">
                          <span className="text-gray-600">{type}:</span>
                          <span className="font-medium">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Recomendaciones</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="p-3 bg-blue-50 rounded">
                        <strong className="text-blue-800">Optimización:</strong> Considere mantener un 10% de tanques en reserva para mantenimiento rotativo.
                      </div>
                      <div className="p-3 bg-green-50 rounded">
                        <strong className="text-green-800">Productividad:</strong> La configuración actual permite ciclos de {Math.floor((location?.numTanks || 0) / 3)} generaciones simultáneas.
                      </div>
                      <div className="p-3 bg-yellow-50 rounded">
                        <strong className="text-yellow-800">Planificación:</strong> Programe mantenimientos durante semanas de menor demanda.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          )}

        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}