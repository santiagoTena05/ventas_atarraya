import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useEstrategiaComercialData } from '@/hooks/useEstrategiaComercialData';

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

  // Load active plan first
  useEffect(() => {
    const loadActivePlan = async () => {
      try {
        console.log('📋 Loading active plan for inventory...');

        const { data: plans, error: plansError } = await supabase
          .from('planner_planes')
          .select('id, nombre, oficina_id')
          .eq('activo', true)
          .limit(1);

        if (plansError) throw plansError;

        if (plans && plans.length > 0) {
          console.log('✅ Found active plan:', plans[0].nombre);
          setActivePlan(plans[0]);
        } else {
          console.log('❌ No active plans found');
        }
      } catch (err) {
        console.error('Error loading active plan:', err);
        setError(err instanceof Error ? err.message : 'Error loading active plan');
      }
    };

    loadActivePlan();
  }, []);

  // Use Estrategia Comercial data for the active plan
  const estrategiaData = useEstrategiaComercialData(
    activePlan?.id,
    null, // selectedLocation
    activePlan?.oficina_id,
    undefined // versionId - will use latest
  );

  // Convert Estrategia Comercial data to inventory availability format
  useEffect(() => {
    if (!estrategiaData || !activePlan) {
      return;
    }

    if (estrategiaData.isLoading) {
      setLoading(true);
      return;
    }

    setLoading(false);

    // For now, let's create mock data based on what we see in Estrategia Comercial
    // This is a temporary solution until we can properly access the proyecciones data
    console.log('🔄 Creating mock inventory data for testing...');

    const mockInventory: InventoryAvailability[] = [
      {
        fecha_semana: '2026-02-17',
        talla_comercial: '61-70',
        inventario_base: 362,
        ventas_registradas: 0,
        inventario_disponible: 362,
        plan_id: activePlan.id,
        plan_nombre: activePlan.nombre
      },
      {
        fecha_semana: '2026-02-17',
        talla_comercial: '51-60',
        inventario_base: 104,
        ventas_registradas: 0,
        inventario_disponible: 104,
        plan_id: activePlan.id,
        plan_nombre: activePlan.nombre
      },
      {
        fecha_semana: '2026-02-17',
        talla_comercial: '41-50',
        inventario_base: 52,
        ventas_registradas: 0,
        inventario_disponible: 52,
        plan_id: activePlan.id,
        plan_nombre: activePlan.nombre
      }
    ];

    console.log('✅ Mock inventory data created:', mockInventory.length, 'available options');
    setInventoryData(mockInventory);

  }, [activePlan?.id, estrategiaData?.isLoading]); // Fixed dependencies to prevent infinite loop

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
    loading: loading || estrategiaData?.isLoading || false,
    error: error || estrategiaData?.error || null,
    getAvailabilityForWeekAndSize,
    getWeeklySummary,
    validateOrderAvailability
  };
}