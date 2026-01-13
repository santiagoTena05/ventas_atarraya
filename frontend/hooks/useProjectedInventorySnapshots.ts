import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ProjectedInventorySnapshot {
  id: string;
  plan_id: string;
  estanque_id: number;
  fecha_semana: string;
  talla_comercial: string;
  inventario_total_kg: number;
  source_block_id?: string;
  block_info?: any;
  snapshot_date: string;
  created_at: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface InventorySnapshotData {
  plan_id: string;
  estanque_id: number;
  fecha_semana: string;
  talla_comercial: string;
  inventario_total_kg: number;
  source_block_id?: string;
  block_info?: any;
}

export function useProjectedInventorySnapshots(planId: string) {
  const [snapshots, setSnapshots] = useState<ProjectedInventorySnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load snapshots for plan and date range
  const loadSnapshots = async (dateRange?: DateRange) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('projected_inventory_snapshots')
        .select('*')
        .eq('plan_id', planId)
        .order('fecha_semana', { ascending: true });

      if (dateRange) {
        query = query
          .gte('fecha_semana', dateRange.start)
          .lte('fecha_semana', dateRange.end);
      }

      const { data, error } = await query;

      if (error) throw error;

      setSnapshots(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading inventory snapshots');
      console.error('Error loading inventory snapshots:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate new inventory snapshot from planner data
  const generateSnapshot = async (dateRange: DateRange): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Get planner blocks for the date range
      const { data: plannerBlocks, error: plannerError } = await supabase
        .from('planner_bloques')
        .select(`
          *,
          planner_celdas_sueltas!inner(*)
        `)
        .eq('plan_id', planId)
        .gte('fecha_cosecha', dateRange.start)
        .lte('fecha_cosecha', dateRange.end);

      if (plannerError) throw plannerError;

      if (!plannerBlocks || plannerBlocks.length === 0) {
        throw new Error('No planner data found for the specified date range');
      }

      // Process planner blocks to calculate inventory snapshots
      const snapshotData: InventorySnapshotData[] = [];

      for (const block of plannerBlocks) {
        // Calculate inventory for each commercial size
        const comercialSizes = ['S', 'M', 'L', 'XL', 'XXL']; // Adjust based on your sizes

        for (const size of comercialSizes) {
          // Calculate kg for this size based on block data
          // This is a simplified calculation - adjust based on your business logic
          const sizePercentage = getSizePercentage(size, block);
          const totalKg = block.peso_total_kg || 0;
          const sizeKg = totalKg * sizePercentage;

          if (sizeKg > 0) {
            snapshotData.push({
              plan_id: planId,
              estanque_id: block.estanque_id,
              fecha_semana: block.fecha_cosecha,
              talla_comercial: size,
              inventario_total_kg: sizeKg,
              source_block_id: block.id,
              block_info: {
                poblacion: block.poblacion,
                peso_promedio: block.peso_promedio,
                densidad: block.densidad,
                fecha_siembra: block.fecha_siembra,
              }
            });
          }
        }
      }

      // Insert snapshot data
      if (snapshotData.length > 0) {
        const { error: insertError } = await supabase
          .from('projected_inventory_snapshots')
          .insert(snapshotData);

        if (insertError) throw insertError;
      }

      // Reload snapshots
      await loadSnapshots(dateRange);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating inventory snapshot');
      console.error('Error generating inventory snapshot:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get latest snapshot for a specific date
  const getLatestSnapshot = (date: string) => {
    return snapshots.filter(s => s.fecha_semana === date);
  };

  // Get snapshot history for a specific combination
  const getSnapshotHistory = (estanqueId: number, fechaSemana: string, tallaComercial: string) => {
    return snapshots
      .filter(s =>
        s.estanque_id === estanqueId &&
        s.fecha_semana === fechaSemana &&
        s.talla_comercial === tallaComercial
      )
      .sort((a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime());
  };

  // Delete old snapshots (keep only latest)
  const cleanupOldSnapshots = async (keepDays: number = 30): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const { error } = await supabase
        .from('projected_inventory_snapshots')
        .delete()
        .eq('plan_id', planId)
        .lt('snapshot_date', cutoffDate.toISOString());

      if (error) throw error;

      // Reload snapshots
      await loadSnapshots();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cleaning up snapshots');
      console.error('Error cleaning up snapshots:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Get inventory summary by week and size
  const getInventorySummary = () => {
    const summary: { [key: string]: { [size: string]: number } } = {};

    snapshots.forEach(snapshot => {
      if (!summary[snapshot.fecha_semana]) {
        summary[snapshot.fecha_semana] = {};
      }

      if (!summary[snapshot.fecha_semana][snapshot.talla_comercial]) {
        summary[snapshot.fecha_semana][snapshot.talla_comercial] = 0;
      }

      summary[snapshot.fecha_semana][snapshot.talla_comercial] += snapshot.inventario_total_kg;
    });

    return summary;
  };

  // Load snapshots on mount and plan change
  useEffect(() => {
    if (planId) {
      loadSnapshots();
    }
  }, [planId]);

  return {
    snapshots,
    loading,
    error,
    generateSnapshot,
    getLatestSnapshot,
    getSnapshotHistory,
    cleanupOldSnapshots,
    getInventorySummary,
    refreshSnapshots: loadSnapshots,
  };
}

// Helper function to calculate size percentage based on block data
// Adjust this based on your business logic for size distribution
function getSizePercentage(size: string, block: any): number {
  // This is a simplified example - you should implement your actual size calculation logic
  const sizeDistribution: { [key: string]: number } = {
    'S': 0.15,
    'M': 0.25,
    'L': 0.35,
    'XL': 0.20,
    'XXL': 0.05,
  };

  return sizeDistribution[size] || 0;
}