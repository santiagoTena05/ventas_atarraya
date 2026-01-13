"use client";

import { useState, useEffect } from 'react';
import { ContainerPlannerTable } from '@/components/planner/ContainerPlannerTable';
import { Analytics } from '@/components/planner/Analytics';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Loader2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePlannerData } from '@/hooks/usePlannerData';
import { usePlannerCrud } from '@/hooks/usePlannerCrud';
import { useGeneraciones } from '@/hooks/useGeneraciones';
import { useGenetics } from '@/hooks/useGenetics';

export default function PlannerPage() {
  const { locationData, isLoading, error } = usePlannerData();
  const {
    planes,
    currentPlan,
    setCurrentPlan,
    crearPlan,
    crearBloque,
    eliminarBloque,
    loadPlannerDataByRange,
    loading: plannerLoading
  } = usePlannerCrud();
  const { generaciones } = useGeneraciones();
  const { genetics } = useGenetics();
  const [currentLocation, setCurrentLocation] = useState('');
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [plannerTableKey, setPlannerTableKey] = useState(0); // Para forzar re-render
  const [externalPlanData, setExternalPlanData] = useState<any>(null);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now()); // Para forzar recargas

  // Estados para filtro de fechas
  const [weeksToShow, setWeeksToShow] = useState(8); // Mostrar 8 semanas por defecto
  const [startWeek, setStartWeek] = useState(0); // Semana inicial para mostrar

  // Auto-select first location when data loads
  useEffect(() => {
    if (!isLoading && Object.keys(locationData).length > 0 && !currentLocation) {
      setCurrentLocation(Object.keys(locationData)[0]);
    }
  }, [isLoading, locationData, currentLocation]);

  // Crear plan por defecto cuando se carga la primera ubicación
  useEffect(() => {
    const crearPlanPorDefecto = async () => {
      if (currentLocation && !currentPlan && planes.length === 0 && !plannerLoading) {
        const locationInfo = locationData[currentLocation];
        if (!locationInfo) return;

        try {
          console.log('🎯 Creando plan por defecto para:', locationInfo.name);

          const nuevoPlan = await crearPlan({
            oficina_id: locationInfo.id,
            nombre: `Plan ${locationInfo.name} 2026`,
            descripcion: `Plan anual de siembra para ${locationInfo.name}`,
            fecha_inicio: locationInfo.startDate.toISOString().split('T')[0],
            fecha_fin: locationInfo.endDate.toISOString().split('T')[0],
            semanas_total: Math.ceil(
              (locationInfo.endDate.getTime() - locationInfo.startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
            ),
            activo: true
          });

          if (nuevoPlan) {
            setCurrentPlan(nuevoPlan);
            console.log('✅ Plan por defecto creado:', nuevoPlan.nombre);
          }
        } catch (error) {
          console.error('❌ Error creando plan por defecto:', error);
        }
      }
    };

    crearPlanPorDefecto();
  }, [currentLocation, locationData, currentPlan, planes, plannerLoading, crearPlan, setCurrentPlan]);

  // Seleccionar automáticamente el primer plan si no hay uno seleccionado
  useEffect(() => {
    if (!currentPlan && planes.length > 0) {
      setCurrentPlan(planes[0]);
    }
  }, [currentPlan, planes, setCurrentPlan]);

  const currentLocationData = locationData[currentLocation];
  const tankCount = currentLocationData?.numTanks || 0;

  // Función para aplicar plan de siembra al gantt
  const handleApplyPlanToGantt = async (planData: any) => {
    console.log('📋 Aplicando plan de siembra al gantt:', planData);

    try {
      // Convertir tableData a bloques en Supabase PRIMERO
      if (currentPlan?.id && planData.ganttData) {
        await saveGanttDataToSupabase(planData.ganttData, planData.planDetails?.targetWeight, planData.planDetails?.startWeek);

        // Limpiar datos externos y forzar recarga desde Supabase
        console.log('🧹 Limpiando datos externos y forzando recarga...');
        setExternalPlanData(null);

        // Forzar re-render del componente tabla para que recargue desde Supabase
        console.log('🔄 Incrementando plannerTableKey para forzar re-render...');
        setPlannerTableKey(prev => {
          const newKey = prev + 1;
          console.log(`📊 plannerTableKey: ${prev} → ${newKey}`);
          return newKey;
        });

        // También actualizar timestamp para forzar recarga de datos
        const newTimestamp = Date.now();
        console.log('⏰ Actualizando refreshTimestamp:', newTimestamp);
        setRefreshTimestamp(newTimestamp);

        // Mostrar confirmación al usuario solo si la operación fue exitosa
        alert(`Plan aplicado exitosamente!\n\nGeneración: ${planData.planDetails.generation}\nGenética: ${planData.planDetails.genetics}\nCiclo total: ${planData.planDetails.totalCycle} semanas\nCosecha esperada: ${planData.planDetails.expectedHarvest} kg`);
      }

    } catch (error) {
      console.error('❌ Error aplicando plan al gantt:', error);

      // No mostrar error si fue cancelado por el usuario (la función ya maneja ese caso)
      // Solo mostrar error si fue un error técnico real
      if (!(error instanceof Error && error.message === 'Usuario canceló la operación')) {
        alert('Error al aplicar el plan. Por favor, intenta nuevamente.');
      }
    }
  };

  // Función para convertir ganttData a bloques en Supabase
  const saveGanttDataToSupabase = async (ganttData: any, targetWeight?: number, startWeek?: number) => {
    if (!currentPlan?.id) return;

    try {
      console.log('💾 Guardando datos del gantt en Supabase...');
      console.log('🎯 Target weight recibido:', targetWeight);
      console.log('📅 Semana inicio recibida:', startWeek);

      // La semana de inicio ya se maneja en el seedingOptimizer y está en el ganttData
      // No necesitamos hacer nada especial con la semana aquí

      // Agrupar datos por tanque
      const tankBlocks: Record<string, any[]> = {};

      console.log('🔍 Datos del gantt recibidos:', Object.keys(ganttData));

      Object.entries(ganttData).forEach(([key, value]: [string, any]) => {
        if (key.includes('-generation') || key.includes('-genetics') || key.includes('-duration')) return;

        const match = key.match(/tank-(\d+)-week-(\d+)/);
        if (match) {
          const tankId = parseInt(match[1]);
          const week = parseInt(match[2]);

          if (!tankBlocks[tankId]) tankBlocks[tankId] = [];

          const generation = ganttData[`${key}-generation`];
          const genetics = ganttData[`${key}-genetics`];
          const duration = ganttData[`${key}-duration`];

          tankBlocks[tankId].push({
            week,
            state: value,
            generation,
            genetics,
            duration: parseInt(duration) || 1
          });
        }
      });

      console.log('📋 Bloques agrupados por tanque:', tankBlocks);

      // Obtener datos existentes del plan para verificar conflictos
      const planStartDate = new Date(currentPlan.fecha_inicio);
      const planEndDate = new Date(currentPlan.fecha_fin);

      const existingData = await loadPlannerDataByRange(
        currentPlan.id,
        currentPlan.fecha_inicio,
        currentPlan.fecha_fin,
        Object.keys(tankBlocks).map(id => parseInt(id))
      );

      console.log('📊 Verificando datos existentes...', {
        affectedTanks: Object.keys(tankBlocks),
        existingBlocks: existingData.length
      });

      // Detectar conflictos antes de crear nuevos bloques
      const conflicts: Array<{
        tankId: number;
        semanaInicio: number;
        semanaFin: number;
        estadoExistente: string;
        generacionExistente?: string;
      }> = [];

      for (const [tankId, weekData] of Object.entries(tankBlocks)) {
        const numTankId = parseInt(tankId);
        weekData.sort((a, b) => a.week - b.week);

        // Verificar cada semana del nuevo plan contra datos existentes
        for (const weekInfo of weekData) {
          const conflictingBlock = existingData.find(block =>
            block.estanque_id === numTankId &&
            weekInfo.week >= block.semana_inicio &&
            weekInfo.week <= block.semana_fin &&
            block.estado !== 'Ready' // Solo considerar conflicto si no está Ready
          );

          if (conflictingBlock && !conflicts.find(c =>
            c.tankId === numTankId &&
            c.semanaInicio === conflictingBlock.semana_inicio &&
            c.semanaFin === conflictingBlock.semana_fin
          )) {
            conflicts.push({
              tankId: numTankId,
              semanaInicio: conflictingBlock.semana_inicio,
              semanaFin: conflictingBlock.semana_fin,
              estadoExistente: conflictingBlock.estado,
              generacionExistente: conflictingBlock.generacion_id || undefined
            });
          }
        }
      }

      // Si hay conflictos, mostrar advertencia y pedir confirmación
      if (conflicts.length > 0) {
        const conflictDetails = conflicts.map(c =>
          `Tanque ${c.tankId}: Semanas ${c.semanaInicio}-${c.semanaFin} (${c.estadoExistente}${c.generacionExistente ? ` - Gen ${c.generacionExistente}` : ''})`
        ).join('\n');

        const userConfirmed = confirm(
          `⚠️ ADVERTENCIA: Se detectaron conflictos con datos existentes:\n\n${conflictDetails}\n\n` +
          `¿Desea continuar y sobrescribir estos datos existentes?\n\n` +
          `• SÍ: Eliminará los bloques existentes y creará los nuevos\n` +
          `• NO: Cancelará la operación y preservará los datos actuales`
        );

        if (!userConfirmed) {
          console.log('❌ Usuario canceló la operación para preservar datos existentes');
          alert('Operación cancelada. Los datos existentes se han preservado.');
          return;
        }

        // Usuario confirmó sobrescribir - eliminar bloques conflictivos
        console.log('🗑️ Eliminando bloques conflictivos...');
        for (const conflict of conflicts) {
          const blocksToDelete = existingData.filter(block =>
            block.estanque_id === conflict.tankId &&
            block.semana_inicio === conflict.semanaInicio &&
            block.semana_fin === conflict.semanaFin
          );

          for (const blockToDelete of blocksToDelete) {
            if (blockToDelete.tipo === 'bloque') {
              await eliminarBloque(blockToDelete.id);
              console.log(`🗑️ Eliminado bloque conflictivo: Tanque ${blockToDelete.estanque_id}, Semanas ${blockToDelete.semana_inicio}-${blockToDelete.semana_fin}`);
            }
          }
        }
      }

      // Refrescar generaciones para asegurar que las nuevas estén disponibles
      console.log('🔄 Refrescando generaciones antes de crear bloques...');
      // Recargar la lista de generaciones más reciente desde el hook
      // (esto es necesario para capturar generaciones recién creadas)

      // Crear nuevos bloques continuos por tanque
      for (const [tankId, weekData] of Object.entries(tankBlocks)) {
        weekData.sort((a, b) => a.week - b.week);

        let i = 0;
        while (i < weekData.length) {
          const startWeek = weekData[i];
          let endWeekIndex = i;

          // Encontrar el final del bloque continuo
          while (
            endWeekIndex + 1 < weekData.length &&
            weekData[endWeekIndex + 1].week === weekData[endWeekIndex].week + 1 &&
            weekData[endWeekIndex + 1].state === startWeek.state &&
            weekData[endWeekIndex + 1].generation === startWeek.generation
          ) {
            endWeekIndex++;
          }

          const duration = endWeekIndex - i + 1;

          // Buscar IDs de generación y genética
          console.log(`🔍 Buscando generación: "${startWeek.generation}" en lista de ${generaciones.length} generaciones`);
          const generacionSeleccionada = generaciones.find(g => g.codigo === startWeek.generation);
          console.log(`🎯 Generación encontrada:`, generacionSeleccionada);

          const geneticaSeleccionada = genetics.find(g => g.id === parseInt(startWeek.genetics));

          const targetWeightForBlock = startWeek.state === 'Growout' ? targetWeight : null;
          console.log(`🎯 Creando bloque ${startWeek.state}: target_weight = ${targetWeightForBlock}`);
          console.log(`📊 targetWeight original desde Analytics: ${targetWeight}`);
          console.log(`📊 targetWeightForBlock calculado: ${targetWeightForBlock}`);

          // Crear bloque en Supabase
          // ganttData ya viene en base-1, usar directamente
          const bloqueCreado = await crearBloque({
            plan_id: currentPlan.id,
            estanque_id: parseInt(tankId),
            semana_inicio: startWeek.week,
            duracion: duration,
            estado: startWeek.state,
            generacion_id: generacionSeleccionada?.id || null,
            genetica_id: geneticaSeleccionada?.id || null,
            target_weight: targetWeightForBlock, // Solo para bloques Growout
            observaciones: `Generado desde Analytics - ${startWeek.state}${targetWeight ? ` (objetivo: ${targetWeight}g)` : ''}`
          });

          console.log(`✅ Bloque creado en BD:`, bloqueCreado);

          console.log(`✅ Creado bloque: Tanque ${tankId}, Semanas ${startWeek.week}-${startWeek.week + duration - 1} (${startWeek.state})`);

          i = endWeekIndex + 1;
        }
      }

      console.log('✅ Datos del gantt guardados exitosamente en Supabase');
    } catch (error) {
      console.error('❌ Error guardando datos del gantt:', error);
      throw error; // Re-throw para que la función llamadora pueda manejar el error
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-teal-600" />
            <p className="text-gray-600">Cargando datos del planner...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <Button onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (Object.keys(locationData).length === 0) {
    return (
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-600 mb-4">No se encontraron oficinas o estanques activos</p>
            <p className="text-sm text-gray-500">Verifica que tengas oficinas y estanques configurados en el sistema</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Container Planner - Planificación de Estanques
        </h1>
        <p className="text-gray-600">
          Gestión y planificación semanal de tanques y estanques de acuicultura
        </p>
      </div>

      {/* Controls Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Controles de Planificación</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAnalyticsOpen(true)}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Nueva Siembra
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Location Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Ubicación:</label>
              <Select value={currentLocation} onValueChange={setCurrentLocation}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(locationData).map(([key, location]) => (
                    <SelectItem key={key} value={key}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2 border-l pl-4">
              <Calendar className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Vista:</label>
              <Select value={weeksToShow.toString()} onValueChange={(value) => setWeeksToShow(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 semanas</SelectItem>
                  <SelectItem value="8">8 semanas</SelectItem>
                  <SelectItem value="12">12 semanas</SelectItem>
                  <SelectItem value="16">16 semanas</SelectItem>
                  <SelectItem value="24">24 semanas</SelectItem>
                  <SelectItem value="52">Todo el año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStartWeek(Math.max(0, startWeek - weeksToShow))}
                disabled={startWeek === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-gray-600 px-2">
                Semanas {startWeek + 1} - {Math.min(startWeek + weeksToShow, 52)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStartWeek(Math.min(52 - weeksToShow, startWeek + weeksToShow))}
                disabled={startWeek + weeksToShow >= 52}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Location Info */}
            {currentLocationData && (
              <div className="flex items-center gap-4 text-sm text-gray-600 border-l pl-4">
                <span className="flex items-center gap-1">
                  <strong>{tankCount}</strong> tanques
                </span>
                <span>
                  {currentLocationData.startDate?.toLocaleDateString()} - {currentLocationData.endDate?.toLocaleDateString()}
                </span>
              </div>
            )}

          </div>
        </CardContent>
      </Card>

      {/* Planning Table */}
      {currentLocationData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Planificación Semanal - {currentLocationData.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ContainerPlannerTable
              key={plannerTableKey}
              location={currentLocationData}
              locationKey={currentLocation}
              externalPlanData={externalPlanData}
              currentPlanId={currentPlan?.id}
              weekFilter={{ startWeek, weeksToShow }}
              refreshTimestamp={refreshTimestamp}
            />
          </CardContent>
        </Card>
      )}

      {/* Analytics Modal */}
      <Analytics
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        location={currentLocationData || null}
        locationKey={currentLocation}
        currentPlanId={currentPlan?.id}
        onApplyPlanToGantt={handleApplyPlanToGantt}
      />
    </div>
  );
}