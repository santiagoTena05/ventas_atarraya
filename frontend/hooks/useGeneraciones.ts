"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Generacion {
  id: string;
  codigo: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activa' | 'completada' | 'planificada';
  descripcion?: string;
  created_at: string;
}

export function useGeneraciones() {
  const [generaciones, setGeneraciones] = useState<Generacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGeneraciones = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Cargando generaciones...');

      const { data, error } = await supabase
        .from('generaciones')
        .select('*')
        .eq('estado', 'activa')
        .order('codigo');

      if (error) {
        console.error('❌ Error cargando generaciones:', error);
        setError('Error cargando generaciones');
        return;
      }

      setGeneraciones(data || []);
      console.log(`✅ Cargadas ${data?.length || 0} generaciones`);
    } catch (error) {
      console.error('❌ Error cargando generaciones:', error);
      setError('Error cargando generaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const createGeneracion = async (generacionData: Omit<Generacion, 'id' | 'created_at'>) => {
    try {
      console.log('🔄 Creando nueva generación:', generacionData);

      const { data, error } = await supabase
        .from('generaciones')
        .insert({
          codigo: generacionData.codigo,
          nombre: generacionData.nombre,
          fecha_inicio: generacionData.fecha_inicio,
          fecha_fin: generacionData.fecha_fin,
          estado: generacionData.estado,
          descripcion: generacionData.descripcion,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando generación:', error);
        throw error;
      }

      console.log('✅ Generación creada exitosamente:', data);
      await loadGeneraciones(); // Reload the list
      return data;
    } catch (error) {
      console.error('❌ Error creando generación:', error);
      throw error;
    }
  };

  const updateGeneracion = async (id: string, updates: Partial<Generacion>) => {
    try {
      console.log(`🔄 Actualizando generación ID ${id}:`, updates);

      const { data, error } = await supabase
        .from('generaciones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando generación:', error);
        throw error;
      }

      console.log('✅ Generación actualizada exitosamente:', data);
      await loadGeneraciones(); // Reload the list
      return data;
    } catch (error) {
      console.error('❌ Error actualizando generación:', error);
      throw error;
    }
  };

  // Get generation options for dropdowns
  const getGeneracionOptions = () => {
    return generaciones.map(gen => ({
      value: gen.codigo,
      label: gen.codigo,
      fullData: gen
    }));
  };

  // Get generation by codigo
  const getGeneracionByCodigo = (codigo: string) => {
    return generaciones.find(gen => gen.codigo === codigo);
  };

  useEffect(() => {
    loadGeneraciones();
  }, []);

  return {
    generaciones,
    isLoading,
    error,
    loadGeneraciones,
    createGeneracion,
    updateGeneracion,
    getGeneracionOptions,
    getGeneracionByCodigo
  };
}