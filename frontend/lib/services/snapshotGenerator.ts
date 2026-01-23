import { supabase } from '@/lib/supabase';
import { calcularBiomasaPorTalla } from '@/lib/utils/sizingConversions';

export interface SnapshotGenerationOptions {
  planId: string;
  dateRange?: { start: string; end: string };
  forceRegenerate?: boolean;
  versionId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  snapshotCount: number;
  lastGenerated?: string;
}

export interface SnapshotMetrics {
  generationTime: number;
  snapshotsCreated: number;
  snapshotsUpdated: number;
  snapshotsDeleted: number;
  dataSourceRecords: number;
}

// Definir las tallas comerciales (same as in Estrategia Comercial)
export const TALLAS_COMERCIALES = [
  '61-70',
  '51-60',
  '41-50',
  '31-40',
  '31-35',
  '26-30',
  '21-25',
  '16-20'
];

export class InventorySnapshotGenerator {
  private planId: string;

  constructor(planId: string) {
    this.planId = planId;
  }

  /**
   * Generate inventory snapshots from planner data
   */
  async generateSnapshots(options: SnapshotGenerationOptions): Promise<SnapshotMetrics> {
    const startTime = Date.now();
    console.log('🔄 Starting snapshot generation for plan:', this.planId);

    try {
      // Validate plan exists and is active
      const { data: plan, error: planError } = await supabase
        .from('planner_planes')
        .select('id, nombre, activo, oficina_id')
        .eq('id', this.planId)
        .single();

      if (planError || !plan) {
        throw new Error(`Plan not found: ${this.planId}`);
      }

      if (!plan.activo) {
        throw new Error(`Plan is not active: ${plan.nombre}`);
      }

      console.log('✅ Plan validated:', plan.nombre);

      // Get date range for snapshot generation
      const dateRange = options.dateRange || await this.getDefaultDateRange();
      console.log('📅 Date range:', dateRange);

      // Clear existing snapshots if force regenerate
      if (options.forceRegenerate) {
        await this.clearExistingSnapshots(dateRange);
      }

      // Get planner blocks data
      const plannerData = await this.getPlannerData(dateRange, options.versionId);
      console.log('📊 Found planner blocks:', plannerData.length);

      // Process planner data into inventory snapshots
      const snapshotData = await this.processPlannerData(plannerData);
      console.log('🔍 Generated snapshot records:', snapshotData.length);

      // Insert snapshots in batches
      const insertMetrics = await this.insertSnapshots(snapshotData);

      const endTime = Date.now();
      const metrics: SnapshotMetrics = {
        generationTime: endTime - startTime,
        snapshotsCreated: insertMetrics.created,
        snapshotsUpdated: insertMetrics.updated,
        snapshotsDeleted: insertMetrics.deleted,
        dataSourceRecords: plannerData.length
      };

      console.log('✅ Snapshot generation completed:', metrics);
      return metrics;

    } catch (error) {
      console.error('❌ Snapshot generation failed:', error);
      throw error;
    }
  }

  /**
   * Detect which snapshots are stale and need regeneration
   */
  async getStaleSnapshots(): Promise<string[]> {
    try {
      // Get the last update timestamp for planner data
      const { data: lastPlannerUpdate } = await supabase
        .from('planner_bloques')
        .select('updated_at')
        .eq('plan_id', this.planId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      // Get the last snapshot generation timestamp
      const { data: lastSnapshot } = await supabase
        .from('projected_inventory_snapshots')
        .select('snapshot_date, fecha_semana')
        .eq('plan_id', this.planId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      // If no snapshots exist, all weeks are stale
      if (!lastSnapshot) {
        const dateRange = await this.getDefaultDateRange();
        return this.getWeeksInRange(dateRange);
      }

      // If planner data is newer than snapshots, all weeks are stale
      if (lastPlannerUpdate &&
          new Date(lastPlannerUpdate.updated_at) > new Date(lastSnapshot.snapshot_date)) {
        const dateRange = await this.getDefaultDateRange();
        return this.getWeeksInRange(dateRange);
      }

      // Otherwise, no stale snapshots
      return [];

    } catch (error) {
      console.error('Error detecting stale snapshots:', error);
      return [];
    }
  }

  /**
   * Clean up old snapshots beyond retention period
   */
  async cleanupOldSnapshots(keepDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const { data, error } = await supabase
        .from('projected_inventory_snapshots')
        .delete()
        .eq('plan_id', this.planId)
        .lt('snapshot_date', cutoffDate.toISOString())
        .select('id');

      if (error) throw error;

      const deletedCount = data?.length || 0;
      console.log(`🗑️ Cleaned up ${deletedCount} old snapshots`);
      return deletedCount;

    } catch (error) {
      console.error('Error cleaning up snapshots:', error);
      throw error;
    }
  }

  /**
   * Validate snapshot data consistency
   */
  async validateSnapshots(): Promise<ValidationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Get snapshot count
      const { count: snapshotCount } = await supabase
        .from('projected_inventory_snapshots')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', this.planId);

      // Get latest snapshot date
      const { data: latestSnapshot } = await supabase
        .from('projected_inventory_snapshots')
        .select('snapshot_date')
        .eq('plan_id', this.planId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      // Validate snapshot coverage
      const dateRange = await this.getDefaultDateRange();
      const expectedWeeks = this.getWeeksInRange(dateRange);
      const expectedSnapshotCount = expectedWeeks.length * TALLAS_COMERCIALES.length;

      if (snapshotCount < expectedSnapshotCount * 0.8) {
        warnings.push(`Low snapshot coverage: ${snapshotCount}/${expectedSnapshotCount} expected`);
      }

      // Check if snapshots are recent
      if (latestSnapshot) {
        const daysSinceLastSnapshot = Math.floor(
          (Date.now() - new Date(latestSnapshot.snapshot_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastSnapshot > 7) {
          warnings.push(`Snapshots are ${daysSinceLastSnapshot} days old`);
        }
      } else {
        errors.push('No snapshots found');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        snapshotCount: snapshotCount || 0,
        lastGenerated: latestSnapshot?.snapshot_date
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: [],
        snapshotCount: 0
      };
    }
  }

  // Private helper methods

  private async getDefaultDateRange(): Promise<{ start: string; end: string }> {
    const start = new Date();
    start.setDate(start.getDate() - 7); // Start 1 week ago

    const end = new Date();
    end.setDate(end.getDate() + (16 * 7)); // End 16 weeks from now

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  private getWeeksInRange(dateRange: { start: string; end: string }): string[] {
    const weeks: string[] = [];
    const currentDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    // Align to Monday of the week
    const dayOfWeek = currentDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentDate.setDate(currentDate.getDate() + mondayOffset);

    while (currentDate <= endDate) {
      weeks.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return weeks;
  }

  private async clearExistingSnapshots(dateRange: { start: string; end: string }): Promise<void> {
    const { error } = await supabase
      .from('projected_inventory_snapshots')
      .delete()
      .eq('plan_id', this.planId)
      .gte('fecha_semana', dateRange.start)
      .lte('fecha_semana', dateRange.end);

    if (error) {
      throw new Error(`Failed to clear existing snapshots: ${error.message}`);
    }

    console.log('🗑️ Cleared existing snapshots for date range');
  }

  private async getPlannerData(dateRange: { start: string; end: string }, versionId?: string): Promise<any[]> {
    // Get planner blocks within date range
    let query = supabase
      .from('planner_bloques')
      .select(`
        *,
        generacion:generaciones(id, codigo, nombre)
      `)
      .eq('plan_id', this.planId);

    // Filter by version if specified
    if (versionId) {
      query = query.eq('version_id', versionId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch planner data: ${error.message}`);
    }

    return data || [];
  }

  private async processPlannerData(plannerBlocks: any[]): Promise<any[]> {
    const snapshots: any[] = [];

    // Filter blocks that are in growout state
    const growoutBlocks = plannerBlocks.filter(block =>
      block.estado === 'Growout' || block.estado === 'growout'
    );

    console.log(`📊 Found ${growoutBlocks.length} growout blocks`);

    for (const block of growoutBlocks) {
      console.log('🔍 Block data:', {
        id: block.id,
        estado: block.estado,
        poblacion: block.poblacion,
        peso_promedio: block.peso_promedio,
        densidad: block.densidad,
        estanque_id: block.estanque_id,
        generacion: block.generacion?.codigo
      });

      // Use the block's own data for calculations or provide defaults
      const poblacion = block.poblacion || 1000; // Default population
      const pesoPromedio = block.peso_promedio || 50; // Default 50g
      const densidad = block.densidad || 1; // Default density

      if (poblacion <= 0) {
        console.log('⚠️ Skipping block with zero population:', block.id);
        continue;
      }

      console.log('✅ Processing block with data:', {
        poblacion,
        pesoPromedio,
        densidad,
        generacion: block.generacion?.codigo
      });

      // Calculate biomass total for this block
      const biomasaTotal = (poblacion * pesoPromedio) / 1000; // Convert to kg

      // Calculate inventory for each commercial size using the existing utility
      const biomasaData = calcularBiomasaPorTalla(
        biomasaTotal,
        pesoPromedio,
        poblacion
      );

      console.log('✅ Biomasa calculation result:', biomasaData);

      // For each talla that has inventory
      for (const [talla, biomasaKg] of Object.entries(biomasaData)) {
        if (biomasaKg > 0) {
          // Calculate the harvest week for this block
          const fechaCosecha = this.calculateHarvestDate(block);

          snapshots.push({
            plan_id: this.planId,
            estanque_id: block.estanque_id,
            fecha_semana: this.alignToWeekStart(fechaCosecha),
            talla_comercial: talla,
            inventario_total_kg: biomasaKg,
            source_block_id: block.id,
            block_info: {
              estanque_id: block.estanque_id,
              poblacion: block.poblacion,
              peso_promedio: block.peso_promedio,
              densidad: block.densidad,
              generacion_codigo: block.generacion?.codigo,
              generacion_nombre: block.generacion?.nombre
            },
            snapshot_date: new Date().toISOString()
          });
        }
      }
    }

    console.log(`✅ Generated ${snapshots.length} snapshot records`);
    return snapshots;
  }

  private calculateHarvestDate(block: any): string {
    // If the block has a harvest date specified, use it
    if (block.fecha_cosecha) {
      return block.fecha_cosecha;
    }

    // Otherwise, calculate based on start week and duration
    const startDate = new Date();
    // Assuming week numbers are relative to current year
    const weekNumber = block.semana_inicio || 1;
    const duration = block.duracion || 12;

    // Calculate harvest date as start + duration weeks
    startDate.setDate(startDate.getDate() + (weekNumber + duration - 1) * 7);

    return startDate.toISOString().split('T')[0];
  }

  private calculatePesoPromedio(pesoFinal: number, semanasTranscurridas: number, cicloTotal: number): number {
    if (semanasTranscurridas >= cicloTotal) {
      return pesoFinal;
    }

    // Logistic growth curve - more realistic than linear
    const t = semanasTranscurridas / cicloTotal;
    const k = 0.5; // Growth rate constant
    const growth = 1 / (1 + Math.exp(-k * (t * 12 - 6))); // Sigmoid curve

    return Math.max(1, pesoFinal * growth);
  }

  private getWeekNumber(weekStart: string): number {
    const startOfYear = new Date(new Date(weekStart).getFullYear(), 0, 1);
    const weekDate = new Date(weekStart);
    return Math.floor((weekDate.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  }

  private calculateSizeInventory(block: any, talla: string): number {
    try {
      // Use the same calculation logic as Estrategia Comercial
      const biomasaData = calcularBiomasaPorTalla(
        block.poblacion || 0,
        block.peso_promedio || 0,
        block.densidad || 0
      );

      // Find the biomass for this specific talla
      const tallaData = biomasaData.find(item => item.talla === talla);
      return tallaData?.biomasa_kg || 0;

    } catch (error) {
      console.warn(`Failed to calculate inventory for talla ${talla}:`, error);
      return 0;
    }
  }

  private alignToWeekStart(dateString: string): string {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    date.setDate(date.getDate() + mondayOffset);
    return date.toISOString().split('T')[0];
  }

  private async insertSnapshots(snapshots: any[]): Promise<{ created: number; updated: number; deleted: number }> {
    if (snapshots.length === 0) {
      return { created: 0, updated: 0, deleted: 0 };
    }

    // Insert in batches to avoid hitting size limits
    const batchSize = 100;
    let totalCreated = 0;

    for (let i = 0; i < snapshots.length; i += batchSize) {
      const batch = snapshots.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from('projected_inventory_snapshots')
        .insert(batch)
        .select('id');

      if (error) {
        console.error('Batch insert error:', error);
        throw new Error(`Failed to insert snapshot batch: ${error.message}`);
      }

      totalCreated += data?.length || 0;
      console.log(`📝 Inserted batch ${Math.floor(i / batchSize) + 1}: ${data?.length} records`);
    }

    return {
      created: totalCreated,
      updated: 0,
      deleted: 0
    };
  }
}

// Factory function for creating snapshot generators
export function createSnapshotGenerator(planId: string): InventorySnapshotGenerator {
  return new InventorySnapshotGenerator(planId);
}