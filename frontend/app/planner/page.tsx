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
    loading: plannerLoading
  } = usePlannerCrud();
  const { generaciones } = useGeneraciones();
  const { genetics } = useGenetics();
  const [currentLocation, setCurrentLocation] = useState('');
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [plannerTableKey, setPlannerTableKey] = useState(0); // Para forzar re-render
  const [externalPlanData, setExternalPlanData] = useState<any>(null);

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
            nombre: `Plan ${locationInfo.name} 2025`,
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

    // Actualizar el estado con los nuevos datos
    setExternalPlanData(planData);

    // Forzar re-render del componente tabla
    setPlannerTableKey(prev => prev + 1);

    // Convertir tableData a bloques en Supabase
    if (currentPlan?.id && planData.ganttData) {
      await saveGanttDataToSupabase(planData.ganttData);
    }

    // Mostrar confirmación al usuario
    alert(`Plan aplicado exitosamente!\n\nGeneración: ${planData.planDetails.generation}\nGenética: ${planData.planDetails.genetics}\nCiclo total: ${planData.planDetails.totalCycle} semanas\nCosecha esperada: ${planData.planDetails.expectedHarvest} kg`);
  };

  // Función para convertir ganttData a bloques en Supabase
  const saveGanttDataToSupabase = async (ganttData: any) => {
    if (!currentPlan?.id) return;

    try {
      console.log('💾 Guardando datos del gantt en Supabase...');

      // Agrupar datos por tanque
      const tankBlocks: Record<string, any[]> = {};

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

      // Crear bloques continuos por tanque
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
          const generacionSeleccionada = generaciones.find(g => g.codigo === startWeek.generation);
          const geneticaSeleccionada = genetics.find(g => g.id === parseInt(startWeek.genetics));

          // Crear bloque en Supabase
          await crearBloque({
            plan_id: currentPlan.id,
            estanque_id: parseInt(tankId),
            semana_inicio: startWeek.week,
            duracion: duration,
            estado: startWeek.state,
            generacion_id: generacionSeleccionada?.id || null,
            genetica_id: geneticaSeleccionada?.id || null,
            observaciones: `Generado desde Analytics - ${startWeek.state}`
          });

          i = endWeekIndex + 1;
        }
      }

      console.log('✅ Datos del gantt guardados exitosamente en Supabase');
    } catch (error) {
      console.error('❌ Error guardando datos del gantt:', error);
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
                Analytics
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
        onApplyPlanToGantt={handleApplyPlanToGantt}
      />
    </div>
  );
}