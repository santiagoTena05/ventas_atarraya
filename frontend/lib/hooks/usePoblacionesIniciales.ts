"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface PoblacionInicial {
  id: string;
  estanque_id: number;
  generacion_id: string;
  poblacion_inicial: number;
  created_at: string;
  updated_at: string;
}

export function usePoblacionesIniciales() {
  const [poblaciones, setPoblaciones] = useState<PoblacionInicial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPoblaciones = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Cargando poblaciones iniciales...');

      const { data, error: loadError } = await supabase
        .from('poblaciones_iniciales')
        .select('*')
        .order('created_at', { ascending: false });

      if (loadError) {
        console.error('❌ Error cargando poblaciones iniciales:', loadError);
        setError('Error cargando poblaciones iniciales');
        return;
      }

      setPoblaciones(data || []);
      console.log(`✅ Cargadas ${data?.length || 0} poblaciones iniciales`);
    } catch (error) {
      console.error('❌ Error cargando poblaciones iniciales:', error);
      setError('Error de conexión');
      setPoblaciones([]);
    } finally {
      setLoading(false);
    }
  };

  // Obtener población inicial por estanque y generación
  const obtenerPoblacionInicial = useCallback((estanqueId: number, generacionId: string): number | null => {
    const poblacion = poblaciones.find(p =>
      p.estanque_id === estanqueId && p.generacion_id === generacionId
    );
    return poblacion ? poblacion.poblacion_inicial : null;
  }, [poblaciones]);

  // Recargar datos
  const refresh = () => {
    loadPoblaciones();
  };

  // Inicializar carga de datos
  useEffect(() => {
    loadPoblaciones();
  }, []);

  return {
    poblaciones,
    loading,
    error,
    obtenerPoblacionInicial,
    refresh
  };
}