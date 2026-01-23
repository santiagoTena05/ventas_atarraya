"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface VentaRegistrada {
  id: string;
  plan_id: string;
  version_id: string;
  cosecha_asignada_id: string;
  fecha_semana: string;
  talla_comercial: string;
  cantidad_kg: number;
  cliente_id?: number;
  cliente_nombre?: string;
  version_nombre?: string;
  source_block_id?: string;
  registration_type: 'individual' | 'version_bulk';
  registered_at: string;
  registered_by?: string;
  confirmado: boolean;
  fecha_confirmacion?: string;
  confirmado_por?: string;
  original_cosecha_data?: any;
}

export function useConfirmacionVentas() {
  const [ventasRegistradas, setVentasRegistradas] = useState<VentaRegistrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar ventas registradas con información adicional
  const loadVentasRegistradas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Primero obtener las ventas registradas
      const { data: ventasData, error: ventasError } = await supabase
        .from('registered_sales_inventory')
        .select('*')
        .order('registered_at', { ascending: false });

      if (ventasError) {
        throw new Error('Error cargando ventas registradas: ' + ventasError.message);
      }

      // Obtener información adicional de clientes y versiones
      const clienteIds = [...new Set(ventasData?.map(v => v.cliente_id).filter(Boolean))];
      const versionIds = [...new Set(ventasData?.map(v => v.version_id).filter(Boolean))];

      const [clientesData, versionesData] = await Promise.all([
        clienteIds.length > 0
          ? supabase.from('clientes').select('id, nombre').in('id', clienteIds)
          : { data: [], error: null },
        versionIds.length > 0
          ? supabase.from('estrategia_comercial_versions').select('id, nombre').in('id', versionIds)
          : { data: [], error: null }
      ]);

      // Crear mapas para búsqueda rápida
      const clientesMap = new Map((clientesData.data || []).map(c => [c.id, c.nombre]));
      const versionesMap = new Map((versionesData.data || []).map(v => [v.id, v.nombre]));

      // Transformar los datos para incluir nombres
      const ventasTransformadas: VentaRegistrada[] = (ventasData || []).map(venta => ({
        ...venta,
        cliente_nombre: venta.cliente_id ? clientesMap.get(venta.cliente_id) : undefined,
        version_nombre: venta.version_id ? versionesMap.get(venta.version_id) : undefined,
        confirmado: venta.confirmado || false
      }));

      setVentasRegistradas(ventasTransformadas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error cargando ventas registradas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Confirmar una venta
  const confirmarVenta = useCallback(async (ventaId: string) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('registered_sales_inventory')
        .update({
          confirmado: true,
          fecha_confirmacion: new Date().toISOString(),
          // confirmado_por: user?.id // TODO: Add user context when available
        })
        .eq('id', ventaId);

      if (error) {
        throw new Error('Error confirmando venta: ' + error.message);
      }

      // Actualizar el estado local
      setVentasRegistradas(prev =>
        prev.map(venta =>
          venta.id === ventaId
            ? {
                ...venta,
                confirmado: true,
                fecha_confirmacion: new Date().toISOString()
              }
            : venta
        )
      );

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error confirmando venta');
      console.error('Error confirmando venta:', err);
      return false;
    }
  }, []);

  // Cancelar confirmación de una venta
  const cancelarVenta = useCallback(async (ventaId: string) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('registered_sales_inventory')
        .update({
          confirmado: false,
          fecha_confirmacion: null,
          confirmado_por: null
        })
        .eq('id', ventaId);

      if (error) {
        throw new Error('Error cancelando confirmación: ' + error.message);
      }

      // Actualizar el estado local
      setVentasRegistradas(prev =>
        prev.map(venta =>
          venta.id === ventaId
            ? {
                ...venta,
                confirmado: false,
                fecha_confirmacion: undefined,
                confirmado_por: undefined
              }
            : venta
        )
      );

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cancelando confirmación');
      console.error('Error cancelando confirmación:', err);
      return false;
    }
  }, []);

  // Confirmar múltiples ventas
  const confirmarVentasMultiples = useCallback(async (ventaIds: string[]) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('registered_sales_inventory')
        .update({
          confirmado: true,
          fecha_confirmacion: new Date().toISOString()
        })
        .in('id', ventaIds);

      if (error) {
        throw new Error('Error confirmando ventas múltiples: ' + error.message);
      }

      // Actualizar el estado local
      setVentasRegistradas(prev =>
        prev.map(venta =>
          ventaIds.includes(venta.id)
            ? {
                ...venta,
                confirmado: true,
                fecha_confirmacion: new Date().toISOString()
              }
            : venta
        )
      );

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error confirmando ventas múltiples');
      console.error('Error confirmando ventas múltiples:', err);
      return false;
    }
  }, []);

  // Refrescar datos
  const refreshData = useCallback(() => {
    loadVentasRegistradas();
  }, [loadVentasRegistradas]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    loadVentasRegistradas();
  }, [loadVentasRegistradas]);

  return {
    ventasRegistradas,
    loading,
    error,
    confirmarVenta,
    cancelarVenta,
    confirmarVentasMultiples,
    refreshData
  };
}