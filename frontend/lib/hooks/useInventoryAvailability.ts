import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSnapshotManager } from '@/hooks/useSnapshotManager';

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

  // Use snapshot manager for the active plan
  const snapshotManager = useSnapshotManager(activePlan?.id);

  // Load inventory data from snapshots
  useEffect(() => {
    if (!activePlan) {
      return;
    }

    const loadInventoryData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('📊 Loading inventory from snapshots for plan:', activePlan.nombre);

        // Get projected inventory snapshots
        const { data: snapshots, error: snapshotsError } = await supabase
          .from('projected_inventory_snapshots')
          .select('*')
          .eq('plan_id', activePlan.id)
          .gte('fecha_semana', new Date().toISOString().split('T')[0]) // Only future weeks
          .order('fecha_semana', { ascending: true });

        if (snapshotsError) throw snapshotsError;

        console.log('📈 Found snapshots:', snapshots?.length || 0);

        if (!snapshots || snapshots.length === 0) {
          console.log('⚠️ No snapshots found, triggering generation...');

          if (snapshotManager.isReady) {
            await snapshotManager.generateSnapshots(false);

            // Reload snapshots after generation
            const { data: newSnapshots, error: newSnapshotsError } = await supabase
              .from('projected_inventory_snapshots')
              .select('*')
              .eq('plan_id', activePlan.id)
              .gte('fecha_semana', new Date().toISOString().split('T')[0])
              .order('fecha_semana', { ascending: true });

            if (newSnapshotsError) throw newSnapshotsError;

            console.log('✅ Generated snapshots:', newSnapshots?.length || 0);
            processSnapshots(newSnapshots || []);
          } else {
            setInventoryData([]);
          }
        } else {
          processSnapshots(snapshots);
        }

      } catch (err) {
        console.error('Error loading inventory:', err);
        setError(err instanceof Error ? err.message : 'Error loading inventory');
        setInventoryData([]);
      } finally {
        setLoading(false);
      }
    };

    const processSnapshots = (snapshots: any[]) => {
      // Get current registered sales to calculate available inventory
      const loadSalesAndProcess = async () => {
        try {
          // Get registered orders/sales that reduce inventory
          const { data: orders } = await supabase
            .from('pedidos')
            .select('fecha_entrega, talla_comercial, cantidad, estado')
            .eq('plan_id', activePlan.id)
            .in('estado', ['confirmado', 'en_preparacion', 'enviado']);

          // Group sales by week and size
          const salesByWeekSize: { [key: string]: number } = {};
          orders?.forEach(order => {
            const key = `${order.fecha_entrega}_${order.talla_comercial}`;
            salesByWeekSize[key] = (salesByWeekSize[key] || 0) + order.cantidad;
          });

          // Convert snapshots to inventory availability format
          const inventory: InventoryAvailability[] = snapshots.map(snapshot => {
            const salesKey = `${snapshot.fecha_semana}_${snapshot.talla_comercial}`;
            const salesRegistered = salesByWeekSize[salesKey] || 0;

            return {
              fecha_semana: snapshot.fecha_semana,
              talla_comercial: snapshot.talla_comercial,
              inventario_base: snapshot.inventario_total_kg,
              ventas_registradas: salesRegistered,
              inventario_disponible: Math.max(0, snapshot.inventario_total_kg - salesRegistered),
              plan_id: activePlan.id,
              plan_nombre: activePlan.nombre
            };
          });

          console.log('✅ Processed inventory data:', inventory.length, 'entries');
          setInventoryData(inventory);

        } catch (err) {
          console.error('Error processing snapshots:', err);
          setError(err instanceof Error ? err.message : 'Error processing inventory');
        }
      };

      loadSalesAndProcess();
    };

    loadInventoryData();
  }, [activePlan?.id, snapshotManager.isReady]); // Depend on snapshot manager readiness

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
    loading: loading || snapshotManager.state.isGenerating || false,
    error: error || snapshotManager.state.error || null,
    getAvailabilityForWeekAndSize,
    getWeeklySummary,
    validateOrderAvailability,
    snapshotManager // Expose for debugging/admin purposes
  };
}