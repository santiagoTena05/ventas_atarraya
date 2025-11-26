"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface PlannerPlan {
  id: string;
  oficina_id: number;
  nombre: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  semanas_total: number;
  activo: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PlannerBloque {
  id: string;
  plan_id: string;
  estanque_id: number;
  semana_inicio: number;
  semana_fin: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'Ready' | 'Nursery' | 'Growout' | 'Reservoir' | 'Maintenance' | 'Out of order';
  generacion_id?: string;
  genetica_id?: number;
  poblacion_inicial?: number;
  densidad_inicial?: number;
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

export interface PlannerCelda {
  id: string;
  plan_id: string;
  estanque_id: number;
  semana: number;
  fecha_semana: string;
  estado: 'Ready' | 'Nursery' | 'Growout' | 'Reservoir' | 'Maintenance' | 'Out of order';
  generacion_id?: string;
  genetica_id?: number;
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

export interface PlannerDataItem {
  tipo: 'bloque' | 'celda';
  id: string;
  estanque_id: number;
  semana_inicio: number;
  semana_fin: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  generacion_id?: string;
  genetica_id?: number;
  observaciones?: string;
}

export function usePlannerCrud() {
  const [planes, setPlanes] = useState<PlannerPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<PlannerPlan | null>(null);
  const [plannerData, setPlannerData] = useState<PlannerDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar todos los planes
  const loadPlanes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('planner_planes')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (error) {
        setError('Error cargando planes');
        return;
      }

      setPlanes(data || []);
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Crear un nuevo plan
  const crearPlan = async (planData: Omit<PlannerPlan, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('planner_planes')
        .insert([planData])
        .select()
        .single();

      if (error) {
        setError('Error creando plan');
        return null;
      }

      await loadPlanes(); // Recargar la lista
      return data;
    } catch (err) {
      setError('Error de conexión');
      return null;
    }
  };

  // Cargar datos del planner por rango de fechas
  const loadPlannerDataByRange = async (
    planId: string,
    fechaInicio: string,
    fechaFin: string,
    estanques?: number[]
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_planner_data_by_range', {
        p_plan_id: planId,
        p_fecha_inicio: fechaInicio,
        p_fecha_fin: fechaFin,
        p_estanques: estanques || null
      });

      if (error) {
        setError('Error cargando datos del planner');
        return [];
      }

      const plannerData = data || [];
      setPlannerData(plannerData);
      return plannerData;
    } catch (err) {
      setError('Error de conexión');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Crear un bloque
  const crearBloque = async (bloqueData: {
    plan_id: string;
    estanque_id: number;
    semana_inicio: number;
    duracion: number;
    estado: string;
    generacion_id?: string;
    genetica_id?: number;
    poblacion_inicial?: number;
    densidad_inicial?: number;
    observaciones?: string;
  }) => {
    try {
      setError(null);

      const { data, error } = await supabase.rpc('crear_bloque_planner', {
        p_plan_id: bloqueData.plan_id,
        p_estanque_id: bloqueData.estanque_id,
        p_semana_inicio: bloqueData.semana_inicio,
        p_duracion: bloqueData.duracion,
        p_estado: bloqueData.estado,
        p_generacion_id: bloqueData.generacion_id || null,
        p_genetica_id: bloqueData.genetica_id || null,
        p_poblacion_inicial: bloqueData.poblacion_inicial || null,
        p_densidad_inicial: bloqueData.densidad_inicial || null,
        p_observaciones: bloqueData.observaciones || null
      });

      if (error) {
        setError('Error creando bloque');
        return null;
      }

      // Registrar log de edición
      await registrarLog({
        plan_id: bloqueData.plan_id,
        accion: 'crear_bloque',
        estanque_id: bloqueData.estanque_id,
        datos_nuevos: bloqueData
      });

      return data;
    } catch (err) {
      setError('Error de conexión');
      return null;
    }
  };

  // Actualizar un bloque
  const actualizarBloque = async (bloqueId: string, updates: Partial<PlannerBloque>) => {
    try {
      setError(null);

      // Obtener datos anteriores para el log
      const { data: bloqueAnterior } = await supabase
        .from('planner_bloques')
        .select('*')
        .eq('id', bloqueId)
        .single();

      const { data, error } = await supabase
        .from('planner_bloques')
        .update(updates)
        .eq('id', bloqueId)
        .select()
        .single();

      if (error) {
        setError('Error actualizando bloque');
        return null;
      }

      // Registrar log de edición
      if (bloqueAnterior) {
        await registrarLog({
          plan_id: bloqueAnterior.plan_id,
          accion: 'editar_bloque',
          estanque_id: bloqueAnterior.estanque_id,
          datos_anteriores: bloqueAnterior,
          datos_nuevos: { ...bloqueAnterior, ...updates }
        });
      }

      return data;
    } catch (err) {
      setError('Error de conexión');
      return null;
    }
  };

  // Eliminar un bloque
  const eliminarBloque = async (bloqueId: string) => {
    try {
      setError(null);

      // Obtener datos del bloque antes de eliminar para el log
      const { data: bloqueAEliminar } = await supabase
        .from('planner_bloques')
        .select('*')
        .eq('id', bloqueId)
        .single();

      const { error } = await supabase
        .from('planner_bloques')
        .delete()
        .eq('id', bloqueId);

      if (error) {
        setError('Error eliminando bloque');
        return false;
      }

      // Registrar log de edición
      if (bloqueAEliminar) {
        await registrarLog({
          plan_id: bloqueAEliminar.plan_id,
          accion: 'eliminar_bloque',
          estanque_id: bloqueAEliminar.estanque_id,
          datos_anteriores: bloqueAEliminar
        });
      }

      return true;
    } catch (err) {
      setError('Error de conexión');
      return false;
    }
  };

  // Crear una celda suelta
  const crearCelda = async (celdaData: Omit<PlannerCelda, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('planner_celdas_sueltas')
        .insert([celdaData])
        .select()
        .single();

      if (error) {
        setError('Error creando celda');
        return null;
      }

      // Registrar log de edición
      await registrarLog({
        plan_id: celdaData.plan_id,
        accion: 'editar_celda',
        estanque_id: celdaData.estanque_id,
        datos_nuevos: celdaData
      });

      return data;
    } catch (err) {
      setError('Error de conexión');
      return null;
    }
  };

  // Obtener datos de una celda específica
  const getCeldaData = async (planId: string, estanqueId: number, semana: number) => {
    try {
      const { data, error } = await supabase.rpc('get_celda_data', {
        p_plan_id: planId,
        p_estanque_id: estanqueId,
        p_semana: semana
      });

      if (error) {
        return null;
      }

      return data?.[0] || null;
    } catch (err) {
      return null;
    }
  };

  // Registrar log de edición
  const registrarLog = async (logData: {
    plan_id: string;
    accion: string;
    estanque_id: number;
    datos_anteriores?: any;
    datos_nuevos?: any;
    rango_afectado?: any;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      await supabase
        .from('planner_logs_edicion')
        .insert([{
          ...logData,
          usuario_id: userData.user?.id || null
        }]);
    } catch (err) {
      // Log de errores silencioso - no queremos que falle la operación principal
      console.error('Error registrando log:', err);
    }
  };

  // Cargar planes al montar el hook
  useEffect(() => {
    loadPlanes();
  }, []);

  return {
    // Estados
    planes,
    currentPlan,
    plannerData,
    loading,
    error,

    // Funciones de planes
    loadPlanes,
    crearPlan,
    setCurrentPlan,

    // Funciones de datos del planner
    loadPlannerDataByRange,
    getCeldaData,

    // Funciones de bloques
    crearBloque,
    actualizarBloque,
    eliminarBloque,

    // Funciones de celdas sueltas
    crearCelda,

    // Función de utilidad
    registrarLog
  };
}