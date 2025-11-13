"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface Generacion {
  id: string;
  codigo: string;
  nombre?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado: 'activa' | 'finalizada' | 'planificada';
  descripcion?: string;
  created_at: string;
  updated_at: string;
}

export function useGeneraciones() {
  const [generaciones, setGeneraciones] = useState<Generacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar generaciones desde Supabase
  const loadGeneraciones = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('generaciones')
        .select('*')
        .order('codigo', { ascending: false }); // Mostrar las más recientes primero

      if (error) {
          setError('Error cargando generaciones');
        return;
      }

      if (data) {
        setGeneraciones(data);
      }
    } catch (error) {
      setError('Error de conexión');
      setGeneraciones([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Crear nueva generación
  const crearGeneracion = async (nuevaGeneracion: Omit<Generacion, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Primero verificar si ya existe
      const generacionExistente = getGeneracionByCodigo(nuevaGeneracion.codigo);
      if (generacionExistente) {
        return generacionExistente;
      }


      const { data, error } = await supabase
        .from('generaciones')
        .insert([nuevaGeneracion])
        .select()
        .single();

      if (error) {
        // Si el error es porque ya existe, intentar obtenerla
        if (error.code === '23505') { // unique_violation
          await loadGeneraciones(); // Recargar datos
          const generacionRecargada = getGeneracionByCodigo(nuevaGeneracion.codigo);
          if (generacionRecargada) {
            return generacionRecargada;
          }
        }
        throw new Error('Error creando generación');
      }

      if (data) {
        setGeneraciones(prev => [data, ...prev]);
        return data;
      }
    } catch (error) {
      console.error('❌ Error creando generación:', error);
      throw error;
    }
  };

  // Obtener generación por código
  const getGeneracionByCodigo = (codigo: string) => {
    return generaciones.find(gen =>
      gen.codigo.toLowerCase() === codigo.toLowerCase()
    );
  };

  // Obtener generaciones activas
  const getGeneracionesActivas = () => {
    return generaciones.filter(gen => gen.estado === 'activa');
  };

  // Obtener códigos de generaciones para dropdown
  const getCodigosGeneraciones = () => {
    return generaciones.map(gen => gen.codigo);
  };

  // Verificar si existe una generación
  const existeGeneracion = (codigo: string) => {
    return generaciones.some(gen =>
      gen.codigo.toLowerCase() === codigo.toLowerCase()
    );
  };

  // Recargar datos
  const refresh = () => {
    loadGeneraciones();
  };

  // Inicializar carga de datos
  useEffect(() => {
    loadGeneraciones();
  }, []);

  return {
    generaciones,
    generacionesActivas: getGeneracionesActivas(),
    codigosGeneraciones: getCodigosGeneraciones(),
    isLoading,
    error,
    loadGeneraciones,
    crearGeneracion,
    getGeneracionByCodigo,
    existeGeneracion,
    refresh
  };
}