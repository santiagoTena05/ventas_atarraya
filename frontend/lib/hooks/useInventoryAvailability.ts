import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEstrategiaComercialData } from '@/hooks/useEstrategiaComercialData';
import { usePlannerData } from '@/hooks/usePlannerData';
import { usePlannerCrud } from '@/hooks/usePlannerCrud';
import { useEstrategiaVersions } from '@/hooks/useEstrategiaVersions';

export interface InventoryAvailability {
  fecha_semana: string;
  talla_comercial: string;
  inventario_base: number;
  ventas_registradas: number;
  inventario_disponible: number;
  plan_id: string;
  plan_nombre: string;
}

export interface WeeklyInventorySummary {
  fecha_semana: string;
  inventory_by_size: {
    [talla: string]: {
      inventario_base: number;
      ventas_registradas: number;
      inventario_disponible: number;
    };
  };
  total_disponible: number;
}

export function useInventoryAvailability() {
  const [inventoryData, setInventoryData] = useState<InventoryAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [activeLocation, setActiveLocation] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<any>(null);

  // Load planner data
  const { locationData, isLoading: plannerLoading } = usePlannerData();
  const { planes, currentPlan, setCurrentPlan, loading: plannerCrudLoading } = usePlannerCrud();

  // Auto-select first location and plan
  useEffect(() => {
    if (!plannerLoading && !plannerCrudLoading && !activePlan) {
      // Auto-select first location
      const firstLocation = Object.keys(locationData)[0];
      if (firstLocation) {
        setActiveLocation(firstLocation);

        // Auto-select first plan for that location
        const locationInfo = locationData[firstLocation];
        const availablePlans = planes.filter(plan => plan.oficina_id === locationInfo.id);
        if (availablePlans.length > 0) {
          const firstPlan = availablePlans[0];
          setActivePlan(firstPlan);
          setCurrentPlan(firstPlan);
        }
      }
    }
  }, [locationData, planes, plannerLoading, plannerCrudLoading, activePlan, setCurrentPlan]);

  // Get latest version for the active plan
  const { versions, loading: versionsLoading } = useEstrategiaVersions(activePlan?.id);

  // Auto-select latest version
  useEffect(() => {
    if (versions && versions.length > 0 && !selectedVersion) {
      // Get the latest version by creation date
      const latestVersion = versions.sort((a, b) =>
        new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
      )[0];
      setSelectedVersion(latestVersion);
    }
  }, [versions, selectedVersion]);

  // Get location data for the active plan
  const selectedLocationData = activeLocation ? locationData[activeLocation] : null;
  const selectedLocationId = selectedLocationData?.id;

  // Use estrategia comercial data directly
  const estrategiaData = useEstrategiaComercialData(
    activePlan?.id,
    selectedLocationData,
    selectedLocationId,
    selectedVersion?.id
  );

  // Convert estrategia comercial data to inventory availability format
  useEffect(() => {
    if (estrategiaData.proyeccionesInventario.length > 0 && !estrategiaData.isLoading) {
      setLoading(true);

      try {
        console.log('📊 Converting estrategia comercial data to inventory format...');

        const inventory: InventoryAvailability[] = estrategiaData.proyeccionesInventario.map(proyeccion => {
          // Get global registered sales for this week/talla
          const { totalKg: globalSales } = estrategiaData.getGlobalRegisteredSalesForCell(
            proyeccion.semana,
            proyeccion.talla
          );

          // Get current version sales for this week/talla
          const currentVersionSales = estrategiaData.getTotalVentasForCell(
            proyeccion.semana,
            proyeccion.talla
          );

          return {
            fecha_semana: proyeccion.semana,
            talla_comercial: proyeccion.talla,
            inventario_base: proyeccion.inventario_neto,
            ventas_registradas: globalSales + currentVersionSales,
            inventario_disponible: Math.max(0, proyeccion.inventario_neto - globalSales - currentVersionSales),
            plan_id: activePlan?.id || '',
            plan_nombre: activePlan?.nombre || ''
          };
        });

        console.log('✅ Converted inventory data:', inventory.length, 'entries');
        setInventoryData(inventory);
        setError(null);

      } catch (err) {
        console.error('Error processing estrategia comercial data:', err);
        setError(err instanceof Error ? err.message : 'Error processing inventory');
        setInventoryData([]);
      } finally {
        setLoading(false);
      }
    } else if (estrategiaData.error) {
      setError(estrategiaData.error);
      setInventoryData([]);
      setLoading(false);
    } else {
      setLoading(estrategiaData.isLoading || plannerLoading || plannerCrudLoading || versionsLoading);
    }
  }, [
    estrategiaData.proyeccionesInventario,
    estrategiaData.isLoading,
    estrategiaData.error,
    estrategiaData.getGlobalRegisteredSalesForCell,
    estrategiaData.getTotalVentasForCell,
    activePlan?.id,
    activePlan?.nombre,
    plannerLoading,
    plannerCrudLoading,
    versionsLoading
  ]);


  // Get availability for specific size and week
  const getAvailabilityForWeekAndSize = useCallback((fecha_semana: string, talla: string): number => {
    const totalAvailable = inventoryData
      .filter(item => item.fecha_semana === fecha_semana && item.talla_comercial === talla)
      .reduce((sum, item) => sum + item.inventario_disponible, 0);

    return totalAvailable;
  }, [inventoryData]);

  // Get weekly summary of all sizes
  const getWeeklySummary = useCallback((): WeeklyInventorySummary[] => {
    const weeklyData: { [week: string]: WeeklyInventorySummary } = {};

    inventoryData.forEach(item => {
      if (!weeklyData[item.fecha_semana]) {
        weeklyData[item.fecha_semana] = {
          fecha_semana: item.fecha_semana,
          inventory_by_size: {},
          total_disponible: 0
        };
      }

      if (!weeklyData[item.fecha_semana].inventory_by_size[item.talla_comercial]) {
        weeklyData[item.fecha_semana].inventory_by_size[item.talla_comercial] = {
          inventario_base: 0,
          ventas_registradas: 0,
          inventario_disponible: 0
        };
      }

      const sizeData = weeklyData[item.fecha_semana].inventory_by_size[item.talla_comercial];
      sizeData.inventario_base += item.inventario_base;
      sizeData.ventas_registradas += item.ventas_registradas;
      sizeData.inventario_disponible += item.inventario_disponible;
    });

    // Calculate totals
    Object.values(weeklyData).forEach(week => {
      week.total_disponible = Object.values(week.inventory_by_size)
        .reduce((sum, size) => sum + size.inventario_disponible, 0);
    });

    return Object.values(weeklyData).sort((a, b) => a.fecha_semana.localeCompare(b.fecha_semana));
  }, [inventoryData]);

  // Validate if an order quantity is available
  const validateOrderAvailability = useCallback((
    fecha_entrega: string,
    talla: string,
    cantidad: number
  ): { isValid: boolean; available: number; message?: string } => {
    const available = getAvailabilityForWeekAndSize(fecha_entrega, talla);

    if (cantidad <= available) {
      return {
        isValid: true,
        available,
        message: `✅ ${cantidad}kg disponible (${Math.round(available - cantidad)}kg restante)`
      };
    } else {
      return {
        isValid: false,
        available,
        message: `❌ Insuficiente inventario. Disponible: ${Math.round(available)}kg, Solicitado: ${cantidad}kg`
      };
    }
  }, [getAvailabilityForWeekAndSize]);

  return {
    inventoryData,
    loading,
    error,
    getAvailabilityForWeekAndSize,
    getWeeklySummary,
    validateOrderAvailability,
    // Expose plan and version info for debugging
    activePlan,
    selectedVersion,
    estrategiaData // Expose estrategia data for advanced usage
  };
}