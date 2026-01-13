import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CosechaAsignada } from './useEstrategiaComercialData';

export interface RegisteredSale {
  id: string;
  plan_id: string;
  version_id: string;
  cosecha_asignada_id: string;
  fecha_semana: string;
  talla_comercial: string;
  cantidad_kg: number;
  cliente_id?: number;
  source_block_id?: string;
  registration_type: 'individual' | 'version_bulk';
  registered_at: string;
  registered_by?: string;
  original_cosecha_data: any;
}

export interface AvailableInventory {
  fecha_semana: string;
  talla_comercial: string;
  inventario_base: number;
  ventas_registradas: number;
  inventario_disponible: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  availableInventory?: number;
  conflicts?: ConflictingSale[];
}

export interface ConflictingSale {
  id: string;
  fecha: string;
  talla: string;
  cantidad_kg: number;
  cliente_id?: number;
  cliente_nombre?: string;
  version_id: string;
  version_nombre?: string;
  conflictType: 'insufficient_inventory';
  availableInventory: number;
  requiredInventory: number;
  existingRegisteredSales: Array<{
    id: string;
    cantidad_kg: number;
    version_nombre?: string;
    cliente_nombre?: string;
  }>;
}

export type ConflictResolution = 'keep_both' | 'replace_existing' | 'cancel_new';

export function useRegisteredSales(versionId?: string) {
  const [registeredSales, setRegisteredSales] = useState<RegisteredSale[]>([]);
  const [availableInventory, setAvailableInventory] = useState<AvailableInventory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load registered sales for version
  const loadRegisteredSales = useCallback(async () => {
    if (!versionId) {
      setRegisteredSales([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('registered_sales_inventory')
        .select('*')
        .eq('version_id', versionId)
        .order('fecha_semana');

      if (error) throw error;

      setRegisteredSales(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading registered sales');
      console.error('Error loading registered sales:', err);
    } finally {
      setLoading(false);
    }
  }, [versionId]);

  // Calculate available inventory after subtracting registered sales
  const calculateAvailableInventory = useCallback(async (planId: string): Promise<AvailableInventory[]> => {
    try {
      // Get projected inventory snapshots for the plan
      const { data: snapshots, error: snapshotsError } = await supabase
        .from('projected_inventory_snapshots')
        .select('*')
        .eq('plan_id', planId)
        .order('fecha_semana');

      if (snapshotsError) throw snapshotsError;

      // Get all registered sales for this plan (across all versions)
      const { data: allRegisteredSales, error: salesError } = await supabase
        .from('registered_sales_inventory')
        .select('*')
        .eq('plan_id', planId);

      if (salesError) throw salesError;

      // Group snapshots by week and size
      const inventoryByWeekSize: { [key: string]: number } = {};
      (snapshots || []).forEach(snapshot => {
        const key = `${snapshot.fecha_semana}_${snapshot.talla_comercial}`;
        inventoryByWeekSize[key] = (inventoryByWeekSize[key] || 0) + snapshot.inventario_total_kg;
      });

      // Group registered sales by week and size
      const salesByWeekSize: { [key: string]: number } = {};
      (allRegisteredSales || []).forEach(sale => {
        const key = `${sale.fecha_semana}_${sale.talla_comercial}`;
        salesByWeekSize[key] = (salesByWeekSize[key] || 0) + sale.cantidad_kg;
      });

      // Calculate available inventory with week propagation
      const availableInventory: AvailableInventory[] = [];
      const tallas = ['61-70', '51-60', '41-50', '31-40', '31-35', '26-30', '21-25', '16-20'];

      // Get unique weeks from snapshots
      const weeks = [...new Set((snapshots || []).map(s => s.fecha_semana))].sort();

      weeks.forEach(week => {
        tallas.forEach(talla => {
          const key = `${week}_${talla}`;
          const baseInventory = inventoryByWeekSize[key] || 0;

          // Calculate accumulated registered sales up to this week
          const accumulatedSales = weeks
            .filter(w => w <= week)
            .reduce((total, w) => {
              const salesKey = `${w}_${talla}`;
              return total + (salesByWeekSize[salesKey] || 0);
            }, 0);

          const available = Math.max(0, baseInventory - accumulatedSales);

          availableInventory.push({
            fecha_semana: week,
            talla_comercial: talla,
            inventario_base: baseInventory,
            ventas_registradas: accumulatedSales,
            inventario_disponible: available
          });
        });
      });

      setAvailableInventory(availableInventory);
      return availableInventory;
    } catch (err) {
      console.error('Error calculating available inventory:', err);
      return [];
    }
  }, []);

  // Validate if a sale can be registered
  const validateRegistration = useCallback(async (cosechaData: CosechaAsignada): Promise<ValidationResult> => {
    try {
      // Check if already registered
      if (cosechaData.is_registered) {
        return {
          isValid: false,
          error: 'This sale is already registered'
        };
      }

      // Find available inventory for this week/size
      const availableForCell = availableInventory.find(
        inv => inv.fecha_semana === cosechaData.fecha && inv.talla_comercial === cosechaData.talla
      );

      if (!availableForCell) {
        return {
          isValid: false,
          error: 'No inventory data available for this week and size'
        };
      }

      if (cosechaData.cantidad_kg > availableForCell.inventario_disponible) {
        return {
          isValid: false,
          error: `Insufficient inventory. Available: ${availableForCell.inventario_disponible}kg, Requested: ${cosechaData.cantidad_kg}kg`,
          availableInventory: availableForCell.inventario_disponible
        };
      }

      return { isValid: true, availableInventory: availableForCell.inventario_disponible };
    } catch (err) {
      return {
        isValid: false,
        error: 'Error validating registration'
      };
    }
  }, [availableInventory]);

  // Register individual sale
  const registerSale = useCallback(async (cosechaId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Get the cosecha data
      const { data: cosecha, error: cosechaError } = await supabase
        .from('estrategia_comercial_cosechas')
        .select('*')
        .eq('id', cosechaId)
        .single();

      if (cosechaError) throw cosechaError;

      // Validate registration
      const validation = await validateRegistration(cosecha);
      if (!validation.isValid) {
        setError(validation.error || 'Registration validation failed');
        return false;
      }

      // Register the sale
      const { error: registerError } = await supabase
        .from('registered_sales_inventory')
        .insert({
          plan_id: cosecha.plan_id,
          version_id: cosecha.version_id,
          cosecha_asignada_id: cosecha.id,
          fecha_semana: cosecha.fecha,
          talla_comercial: cosecha.talla,
          cantidad_kg: cosecha.cantidad_kg,
          cliente_id: cosecha.cliente_id,
          registration_type: 'individual',
          registered_by: 'user',
          original_cosecha_data: cosecha
        });

      if (registerError) throw registerError;

      // Mark cosecha as registered
      const { error: updateError } = await supabase
        .from('estrategia_comercial_cosechas')
        .update({
          is_registered: true,
          registered_at: new Date().toISOString()
        })
        .eq('id', cosechaId);

      if (updateError) throw updateError;

      // Reload data
      await loadRegisteredSales();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error registering sale');
      console.error('Error registering sale:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [validateRegistration, loadRegisteredSales]);

  // Validate entire version registration and detect conflicts
  const validateVersionRegistration = useCallback(async (): Promise<ValidationResult> => {
    if (!versionId) return { isValid: false, error: 'No version selected' };

    try {
      // Get all unregistered cosechas for this version
      const { data: cosechas, error: cosechasError } = await supabase
        .from('estrategia_comercial_cosechas')
        .select(`
          *,
          clientes:cliente_id (nombre),
          estrategia_comercial_versions!inner (nombre)
        `)
        .eq('version_id', versionId)
        .eq('is_registered', false);

      if (cosechasError) throw cosechasError;

      if (!cosechas || cosechas.length === 0) {
        return { isValid: false, error: 'No unregistered sales found in this version' };
      }

      const conflicts: ConflictingSale[] = [];

      // Check each sale for conflicts
      for (const cosecha of cosechas) {
        // Find available inventory for this week/size
        const availableForCell = availableInventory.find(
          inv => inv.fecha_semana === cosecha.fecha && inv.talla_comercial === cosecha.talla
        );

        if (!availableForCell) {
          conflicts.push({
            id: cosecha.id,
            fecha: cosecha.fecha,
            talla: cosecha.talla,
            cantidad_kg: cosecha.cantidad_kg,
            cliente_id: cosecha.cliente_id,
            cliente_nombre: cosecha.clientes?.nombre,
            version_id: cosecha.version_id,
            version_nombre: cosecha.estrategia_comercial_versions?.nombre,
            conflictType: 'insufficient_inventory',
            availableInventory: 0,
            requiredInventory: cosecha.cantidad_kg,
            existingRegisteredSales: []
          });
          continue;
        }

        // Check if this sale exceeds available inventory
        if (cosecha.cantidad_kg > availableForCell.inventario_disponible) {
          // Get existing registered sales for this cell
          const { data: existingSales, error: existingSalesError } = await supabase
            .from('registered_sales_inventory')
            .select(`
              *,
              clientes:cliente_id (nombre),
              estrategia_comercial_versions!inner (nombre)
            `)
            .eq('fecha_semana', cosecha.fecha)
            .eq('talla_comercial', cosecha.talla);

          if (existingSalesError) throw existingSalesError;

          conflicts.push({
            id: cosecha.id,
            fecha: cosecha.fecha,
            talla: cosecha.talla,
            cantidad_kg: cosecha.cantidad_kg,
            cliente_id: cosecha.cliente_id,
            cliente_nombre: cosecha.clientes?.nombre,
            version_id: cosecha.version_id,
            version_nombre: cosecha.estrategia_comercial_versions?.nombre,
            conflictType: 'insufficient_inventory',
            availableInventory: availableForCell.inventario_disponible,
            requiredInventory: cosecha.cantidad_kg,
            existingRegisteredSales: (existingSales || []).map(sale => ({
              id: sale.id,
              cantidad_kg: sale.cantidad_kg,
              version_nombre: sale.estrategia_comercial_versions?.nombre,
              cliente_nombre: sale.clientes?.nombre
            }))
          });
        }
      }

      return {
        isValid: conflicts.length === 0,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        error: conflicts.length > 0 ? `${conflicts.length} conflict(s) detected` : undefined
      };
    } catch (err) {
      return {
        isValid: false,
        error: err instanceof Error ? err.message : 'Error validating version registration'
      };
    }
  }, [versionId, availableInventory]);

  // Register entire version
  const registerVersion = useCallback(async (): Promise<boolean> => {
    if (!versionId) return false;

    try {
      setLoading(true);
      setError(null);

      // Get all unregistered cosechas for this version
      const { data: cosechas, error: cosechasError } = await supabase
        .from('estrategia_comercial_cosechas')
        .select('*')
        .eq('version_id', versionId)
        .eq('is_registered', false);

      if (cosechasError) throw cosechasError;

      if (!cosechas || cosechas.length === 0) {
        setError('No unregistered sales found in this version');
        return false;
      }

      // Register all sales (conflicts should be resolved by now)
      const registrationPromises = cosechas.map(cosecha =>
        supabase
          .from('registered_sales_inventory')
          .insert({
            plan_id: cosecha.plan_id,
            version_id: cosecha.version_id,
            cosecha_asignada_id: cosecha.id,
            fecha_semana: cosecha.fecha,
            talla_comercial: cosecha.talla,
            cantidad_kg: cosecha.cantidad_kg,
            cliente_id: cosecha.cliente_id,
            registration_type: 'version_bulk',
            registered_by: 'user',
            original_cosecha_data: cosecha
          })
      );

      await Promise.all(registrationPromises);

      // Mark all cosechas as registered
      const { error: updateError } = await supabase
        .from('estrategia_comercial_cosechas')
        .update({
          is_registered: true,
          registered_at: new Date().toISOString()
        })
        .eq('version_id', versionId)
        .eq('is_registered', false);

      if (updateError) throw updateError;

      // Reload data
      await loadRegisteredSales();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error registering version');
      console.error('Error registering version:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [versionId, loadRegisteredSales]);

  // Apply conflict resolutions and register version
  const resolveConflictsAndRegister = useCallback(async (
    resolutions: Array<{ conflictId: string; resolution: ConflictResolution }>
  ): Promise<boolean> => {
    if (!versionId) return false;

    try {
      setLoading(true);
      setError(null);

      // Process each resolution
      for (const { conflictId, resolution } of resolutions) {
        const { data: cosecha, error: cosechaError } = await supabase
          .from('estrategia_comercial_cosechas')
          .select('*')
          .eq('id', conflictId)
          .single();

        if (cosechaError || !cosecha) {
          console.error('Could not find conflicting sale:', conflictId);
          continue;
        }

        switch (resolution) {
          case 'cancel_new':
            // Delete the conflicting sale from cosechas
            await supabase
              .from('estrategia_comercial_cosechas')
              .delete()
              .eq('id', conflictId);
            break;

          case 'replace_existing':
            // Unregister existing sales for this week/size
            const { data: existingSales, error: existingSalesError } = await supabase
              .from('registered_sales_inventory')
              .select('*')
              .eq('fecha_semana', cosecha.fecha)
              .eq('talla_comercial', cosecha.talla);

            if (!existingSalesError && existingSales) {
              // Remove from registered sales
              await supabase
                .from('registered_sales_inventory')
                .delete()
                .eq('fecha_semana', cosecha.fecha)
                .eq('talla_comercial', cosecha.talla);

              // Mark original cosechas as unregistered
              const cosechaIds = existingSales.map(sale => sale.cosecha_asignada_id);
              await supabase
                .from('estrategia_comercial_cosechas')
                .update({
                  is_registered: false,
                  registered_at: null
                })
                .in('id', cosechaIds);
            }
            break;

          case 'keep_both':
            // No action needed - just proceed with registration
            break;
        }
      }

      // After resolving conflicts, register remaining unregistered sales
      const { data: remainingCosechas, error: remainingError } = await supabase
        .from('estrategia_comercial_cosechas')
        .select('*')
        .eq('version_id', versionId)
        .eq('is_registered', false);

      if (!remainingError && remainingCosechas && remainingCosechas.length > 0) {
        // Register remaining sales
        const registrationPromises = remainingCosechas.map(cosecha =>
          supabase
            .from('registered_sales_inventory')
            .insert({
              plan_id: cosecha.plan_id,
              version_id: cosecha.version_id,
              cosecha_asignada_id: cosecha.id,
              fecha_semana: cosecha.fecha,
              talla_comercial: cosecha.talla,
              cantidad_kg: cosecha.cantidad_kg,
              cliente_id: cosecha.cliente_id,
              registration_type: 'version_bulk',
              registered_by: 'user',
              original_cosecha_data: cosecha
            })
        );

        await Promise.all(registrationPromises);

        // Mark as registered
        await supabase
          .from('estrategia_comercial_cosechas')
          .update({
            is_registered: true,
            registered_at: new Date().toISOString()
          })
          .eq('version_id', versionId)
          .eq('is_registered', false);
      }

      // Reload data
      await loadRegisteredSales();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error resolving conflicts and registering');
      console.error('Error resolving conflicts:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [versionId, loadRegisteredSales]);

  // Unregister sale (rollback)
  const unregisterSale = useCallback(async (cosechaId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Remove from registered sales
      const { error: deleteError } = await supabase
        .from('registered_sales_inventory')
        .delete()
        .eq('cosecha_asignada_id', cosechaId);

      if (deleteError) throw deleteError;

      // Mark cosecha as unregistered
      const { error: updateError } = await supabase
        .from('estrategia_comercial_cosechas')
        .update({
          is_registered: false,
          registered_at: null
        })
        .eq('id', cosechaId);

      if (updateError) throw updateError;

      // Reload data
      await loadRegisteredSales();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error unregistering sale');
      console.error('Error unregistering sale:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadRegisteredSales]);

  // Load registered sales when version changes
  useEffect(() => {
    loadRegisteredSales();
  }, [loadRegisteredSales]);

  return {
    registeredSales,
    availableInventory,
    loading,
    error,
    registerSale,
    registerVersion,
    unregisterSale,
    validateRegistration,
    calculateAvailableInventory,
    validateVersionRegistration,
    resolveConflictsAndRegister,
    refreshRegisteredSales: loadRegisteredSales,
  };
}