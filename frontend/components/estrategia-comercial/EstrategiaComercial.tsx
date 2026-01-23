"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Loader2 } from 'lucide-react';
import { EstrategiaComercialTable } from './EstrategiaComercialTable';
import { CosechaModal } from './CosechaModal';
import { VersionSelector } from './VersionSelector';
import { CreateVersionModal } from './CreateVersionModal';
import { RegisterVersionButton } from './RegisterVersionButton';
import { useEstrategiaComercialData, TALLAS_COMERCIALES, type CosechaAsignada } from '@/hooks/useEstrategiaComercialData';
import { usePlannerData } from '@/hooks/usePlannerData';
import { usePlannerCrud } from '@/hooks/usePlannerCrud';
import { EstrategiaVersion } from '@/hooks/useEstrategiaVersions';

interface EstrategiaComercialProps {}

export function EstrategiaComercial({}: EstrategiaComercialProps) {
  const { locationData, isLoading: plannerLoading } = usePlannerData();
  const { planes, currentPlan, setCurrentPlan, loading: plannerCrudLoading } = usePlannerCrud();
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();
  const [selectedVersion, setSelectedVersion] = useState<EstrategiaVersion | null>(null);
  const [autoSelectComplete, setAutoSelectComplete] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [createVersionModalOpen, setCreateVersionModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ fecha: string; talla: string } | null>(null);
  const [versionRefreshTrigger, setVersionRefreshTrigger] = useState(0);

  // Obtener location seleccionada
  const selectedLocationData = selectedLocation ? locationData[selectedLocation] : null;
  const selectedLocationId = selectedLocationData?.id;

  const {
    clientes,
    cosechasAsignadas,
    registeredSalesGlobal,
    proyeccionesInventario,
    isLoading,
    error,
    saveCosechaAsignada,
    updateCosechaAsignada,
    deleteCosechaAsignada,
    getCosechasForCell,
    getProyeccionForCell,
    getTotalVentasForCell,
    getGlobalRegisteredSalesForCell,
    getAvailableInventoryForCell,
    getCellColor,
    clearPlannerCache,
    refresh
  } = useEstrategiaComercialData(selectedPlanId, selectedLocationData, selectedLocationId, selectedVersion?.id);

  // Generar fechas de semanas siempre empezando en la semana actual
  const generateWeekDates = () => {
    const dates: string[] = [];

    // Siempre empezar en la semana actual (lunes)
    const today = new Date();
    today.setDate(today.getDate() - today.getDay() + 1); // Lunes de esta semana

    // Determinar cuántas semanas mostrar
    const semanasAMostrar = currentPlan ? Math.min(currentPlan.semanas_total, 16) : 16;

    for (let i = 0; i < semanasAMostrar; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + (i * 7));
      dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
  };

  const weekDates = generateWeekDates();

  // Manejar click en celda
  const handleCellClick = (fecha: string, talla: string) => {
    setSelectedCell({ fecha, talla });
    setModalOpen(true);
  };

  // Manejar guardado de cosecha
  const handleSaveCosecha = async (cosecha: Omit<CosechaAsignada, 'id'>) => {
    try {
      await saveCosechaAsignada(cosecha);
      setModalOpen(false);
      setSelectedCell(null);
    } catch (error) {
      console.error('Error guardando cosecha:', error);
    }
  };

  // Manejar actualización de cosecha
  const handleUpdateCosecha = async (cosechaId: string, cosecha: Omit<CosechaAsignada, 'id'>) => {
    try {
      await updateCosechaAsignada(cosechaId, cosecha);
    } catch (error) {
      console.error('Error actualizando cosecha:', error);
    }
  };

  // Manejar eliminación de cosecha
  const handleDeleteCosecha = async (cosechaId: string) => {
    try {
      await deleteCosechaAsignada(cosechaId);
    } catch (error) {
      console.error('Error eliminando cosecha:', error);
    }
  };

  // Manejar cambio de versión
  const handleVersionChange = (version: EstrategiaVersion | null) => {
    setSelectedVersion(version);
  };

  // Manejar creación de versión
  const handleVersionCreated = (version: EstrategiaVersion) => {
    setSelectedVersion(version);
    setCreateVersionModalOpen(false);
    // Trigger refresh of version selector
    setVersionRefreshTrigger(prev => prev + 1);
  };

  // Auto-select first location and plan when component loads
  useEffect(() => {
    if (!plannerLoading && !plannerCrudLoading && !autoSelectComplete) {
      // Auto-select first location
      const firstLocation = Object.keys(locationData)[0];
      if (firstLocation && !selectedLocation) {
        setSelectedLocation(firstLocation);

        // Auto-select first plan for that location
        const locationInfo = locationData[firstLocation];
        const availablePlans = planes.filter(plan => plan.oficina_id === locationInfo.id);
        if (availablePlans.length > 0 && !selectedPlanId) {
          const firstPlan = availablePlans[0];
          setSelectedPlanId(firstPlan.id);
          setCurrentPlan(firstPlan);
        }

        setAutoSelectComplete(true);
      }
    }
  }, [locationData, planes, plannerLoading, plannerCrudLoading, autoSelectComplete, selectedLocation, selectedPlanId, setCurrentPlan]);

  if (plannerLoading || plannerCrudLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-teal-600" />
          <p className="text-gray-600">Cargando datos de estrategia comercial...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Configuración de Estrategia Comercial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Ubicación:</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Seleccionar ubicación" />
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

            {selectedLocation && (
              <div className="flex items-center gap-2 border-l pl-4">
                <label className="text-sm font-medium text-gray-700">Plan:</label>
                <Select
                  value={selectedPlanId || ''}
                  onValueChange={(value) => {
                    setSelectedPlanId(value);
                    const plan = planes.find(p => p.id === value);
                    if (plan) setCurrentPlan(plan);
                    // Reset version when plan changes
                    setSelectedVersion(null);
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Seleccionar plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {planes.filter(plan => {
                      const locationInfo = locationData[selectedLocation];
                      return locationInfo && plan.oficina_id === locationInfo.id;
                    }).map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Version Selector */}
            {selectedPlanId && (
              <div className="border-l pl-4">
                <VersionSelector
                  planId={selectedPlanId}
                  onVersionChange={handleVersionChange}
                  onCreateVersion={() => setCreateVersionModalOpen(true)}
                  refreshTrigger={versionRefreshTrigger}
                />
              </div>
            )}

            {/* Leyenda de colores */}
            <div className="flex items-center gap-4 border-l pl-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Inventario suficiente</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>Cosecha técnica</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Ventas &gt; Inventario</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla del Playground */}
      {selectedPlanId && selectedVersion && (
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Estrategia Comercial - Simulación de Cosechas</CardTitle>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Version: <span className="font-medium">{selectedVersion.nombre}</span>
                </div>

                {/* Version-wide Registration Button */}
                {selectedPlanId && selectedVersion && (
                  <RegisterVersionButton
                    version={selectedVersion}
                    planId={selectedPlanId}
                    totalSales={cosechasAsignadas.length}
                    unregisteredSales={cosechasAsignadas.filter(c => !c.is_registered).length}
                    cosechasAsignadas={cosechasAsignadas}
                    onRegister={() => {
                      // Refresh data after registration
                      refresh();
                      // Trigger version refresh after a short delay to avoid conflicts
                      setTimeout(() => {
                        setVersionRefreshTrigger(prev => prev + 1);
                      }, 200);
                    }}
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="w-full p-0">
            <EstrategiaComercialTable
              tallas={TALLAS_COMERCIALES}
              weekDates={weekDates}
              getCellColor={getCellColor}
              getTotalVentasForCell={getTotalVentasForCell}
              getProyeccionForCell={getProyeccionForCell}
              getCosechasForCell={getCosechasForCell}
              getGlobalRegisteredSalesForCell={getGlobalRegisteredSalesForCell}
              getAvailableInventoryForCell={getAvailableInventoryForCell}
              onCellClick={handleCellClick}
            />
          </CardContent>
        </Card>
      )}


      {/* Modal de asignación de cosechas */}
      <CosechaModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedCell(null);
        }}
        fecha={selectedCell?.fecha || ''}
        talla={selectedCell?.talla || ''}
        clientes={clientes}
        cosechasExistentes={selectedCell ? getCosechasForCell(selectedCell.fecha, selectedCell.talla) : []}
        proyeccionInventario={selectedCell ? getProyeccionForCell(selectedCell.fecha, selectedCell.talla) : undefined}
        onSave={handleSaveCosecha}
        onUpdate={handleUpdateCosecha}
        onDelete={handleDeleteCosecha}
        versionId={selectedVersion?.id}
        onRefresh={() => {
          // Refresh data after registration/unregistration
          refresh();
          setVersionRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* Modal de creación de versión */}
      {selectedPlanId && (
        <CreateVersionModal
          isOpen={createVersionModalOpen}
          onClose={() => setCreateVersionModalOpen(false)}
          planId={selectedPlanId}
          onVersionCreated={handleVersionCreated}
        />
      )}
    </div>
  );
}