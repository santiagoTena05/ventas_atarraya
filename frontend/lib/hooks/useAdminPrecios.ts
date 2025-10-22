"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface PrecioCompleto {
  id: number;
  talla_camaron_id: number;
  talla_nombre: string;
  peso_min_gramos: number;
  peso_max_gramos: number;
  conteo_min_kilo: number;
  conteo_max_kilo: number;
  precio_mayorista: number;
  precio_restaurante: number;
  precio_menudeo: number;
  cantidad_min_mayorista: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrecioFormData {
  precio_mayorista: number;
  precio_restaurante: number;
  precio_menudeo: number;
  cantidad_min_mayorista: number;
  activo: boolean;
}

export function useAdminPrecios() {
  const [precios, setPrecios] = useState<PrecioCompleto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Cargar precios con información de tallas
  const loadPrecios = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Cargando precios para administración...');

      const { data, error } = await supabase
        .from('precios_camaron')
        .select(`
          *,
          tallas_camaron!inner(
            id,
            nombre
          )
        `)
        .order('talla_camaron_id', { ascending: true });

      if (error) {
        console.error('❌ Error cargando precios:', error);
        setPrecios([]);
        return;
      }

      if (data) {
        const preciosTransformados: PrecioCompleto[] = data.map(precio => ({
          id: precio.id,
          talla_camaron_id: precio.talla_camaron_id,
          talla_nombre: precio.tallas_camaron?.nombre || 'Sin nombre',
          peso_min_gramos: parseFloat(precio.peso_min_gramos || '0'),
          peso_max_gramos: parseFloat(precio.peso_max_gramos || '0'),
          conteo_min_kilo: precio.conteo_min_kilo,
          conteo_max_kilo: precio.conteo_max_kilo,
          precio_mayorista: parseFloat(precio.precio_mayorista || '0'),
          precio_restaurante: parseFloat(precio.precio_restaurante || '0'),
          precio_menudeo: parseFloat(precio.precio_menudeo || '0'),
          cantidad_min_mayorista: parseFloat(precio.cantidad_min_mayorista || '150'),
          activo: precio.activo || true,
          created_at: precio.created_at,
          updated_at: precio.updated_at,
        }));

        setPrecios(preciosTransformados);
        console.log(`✅ Cargados ${preciosTransformados.length} precios para admin`);
      }
    } catch (error) {
      console.error('❌ Error cargando precios:', error);
      setPrecios([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Actualizar precios de una talla específica
  const updatePrecios = async (precioId: number, formData: PrecioFormData): Promise<boolean> => {
    try {
      setIsUpdating(true);
      console.log(`💰 Actualizando precios para ID ${precioId}:`, formData);

      const { data, error } = await supabase
        .from('precios_camaron')
        .update({
          precio_mayorista: formData.precio_mayorista,
          precio_restaurante: formData.precio_restaurante,
          precio_menudeo: formData.precio_menudeo,
          cantidad_min_mayorista: formData.cantidad_min_mayorista,
          activo: formData.activo,
          updated_at: new Date().toISOString(),
          updated_by: 'admin' // TODO: Usar usuario real cuando tengamos auth
        })
        .eq('id', precioId)
        .select();

      if (error) {
        console.error('❌ Error actualizando precios:', error);
        return false;
      }

      console.log('✅ Precios actualizados exitosamente:', data);

      // Recargar datos para reflejar cambios
      await loadPrecios();
      return true;
    } catch (error) {
      console.error('❌ Error actualizando precios:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Alternar estado activo/inactivo
  const toggleActivo = async (precioId: number): Promise<boolean> => {
    try {
      const precio = precios.find(p => p.id === precioId);
      if (!precio) return false;

      return await updatePrecios(precioId, {
        precio_mayorista: precio.precio_mayorista,
        precio_restaurante: precio.precio_restaurante,
        precio_menudeo: precio.precio_menudeo,
        cantidad_min_mayorista: precio.cantidad_min_mayorista,
        activo: !precio.activo
      });
    } catch (error) {
      console.error('❌ Error toggleando estado:', error);
      return false;
    }
  };

  // Validar si una talla puede ser desactivada (no tiene ventas recientes)
  const canDeactivate = async (tallaId: number): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select('id')
        .eq('talla_camaron_id', tallaId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 30 días
        .limit(1);

      if (error) {
        console.error('❌ Error verificando ventas:', error);
        return false;
      }

      return !data || data.length === 0;
    } catch (error) {
      console.error('❌ Error verificando si se puede desactivar:', error);
      return false;
    }
  };

  // Obtener estadísticas de uso por talla
  const getTallaStats = async (tallaId: number) => {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select('total_orden, created_at')
        .eq('talla_camaron_id', tallaId)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Últimos 90 días

      if (error || !data) return null;

      const totalVentas = data.length;
      const montoTotal = data.reduce((sum, venta) => sum + (venta.total_orden || 0), 0);
      const promedioVenta = totalVentas > 0 ? montoTotal / totalVentas : 0;

      return {
        totalVentas,
        montoTotal,
        promedioVenta
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return null;
    }
  };

  // Inicializar carga de datos
  useEffect(() => {
    loadPrecios();
  }, []);

  return {
    precios,
    isLoading,
    isUpdating,
    loadPrecios,
    updatePrecios,
    toggleActivo,
    canDeactivate,
    getTallaStats
  };
}