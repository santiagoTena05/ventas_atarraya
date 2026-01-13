"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getPlanDates } from '@/lib/utils/planDates';

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
  target_weight?: number;
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

  // Actualizar fechas de un plan existente
  const actualizarFechasPlan = async (planId: string, fechaInicio: string, fechaFin: string) => {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('planner_planes')
        .update({
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin
        })
        .eq('id', planId)
        .select()
        .single();

      if (error) {
        setError('Error actualizando fechas del plan');
        return null;
      }

      await loadPlanes(); // Recargar la lista
      return data;
    } catch (err) {
      setError('Error de conexión');
      return null;
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
    target_weight?: number;
    observaciones?: string;
  }) => {
    try {
      setError(null);

      console.log('🎯 Creando bloque con target_weight:', bloqueData.target_weight);

      // Calcular fecha_fin basada en semana_inicio + duracion
      // Buscar fecha base del plan actual
      const planActual = planes.find(p => p.id === bloqueData.plan_id);
      if (!planActual) {
        throw new Error('Plan no encontrado');
      }

      console.log('📅 Plan actual fecha_inicio:', planActual.fecha_inicio);
      console.log('📅 Plan actual fecha_fin:', planActual.fecha_fin);

      // 🔧 Corregir fechas si no coinciden con el año del plan actual
      const planDates = getPlanDates();
      const expectedStart = planDates.formattedStartDate;
      const expectedEnd = planDates.formattedEndDate;

      if (planActual.fecha_inicio !== expectedStart || planActual.fecha_fin !== expectedEnd) {
        console.log(`⚠️ Detectado plan con fechas incorrectas (${planActual.fecha_inicio} - ${planActual.fecha_fin}), corrigiendo a ${expectedStart} - ${expectedEnd}...`);
        const fechasCorregidas = await actualizarFechasPlan(
          planActual.id,
          expectedStart,
          expectedEnd
        );
        if (fechasCorregidas) {
          console.log(`✅ Fechas del plan corregidas a ${planDates.year}`);
          planActual.fecha_inicio = expectedStart;
          planActual.fecha_fin = expectedEnd;
        }
      }

      const fechaInicio = new Date(planActual.fecha_inicio);
      // semana_inicio ya viene convertido de base-0 a base-1, asi que restar 1 para calcular fecha
      fechaInicio.setDate(fechaInicio.getDate() + ((bloqueData.semana_inicio - 1) * 7));

      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + (bloqueData.duracion * 7) - 1);

      const { data, error } = await supabase
        .from('planner_bloques')
        .insert([{
          plan_id: bloqueData.plan_id,
          estanque_id: bloqueData.estanque_id,
          semana_inicio: bloqueData.semana_inicio,
          semana_fin: bloqueData.semana_inicio + bloqueData.duracion - 1,
          fecha_inicio: fechaInicio.toISOString().split('T')[0],
          fecha_fin: fechaFin.toISOString().split('T')[0],
          estado: bloqueData.estado,
          generacion_id: bloqueData.generacion_id || null,
          genetica_id: bloqueData.genetica_id || null,
          poblacion_inicial: bloqueData.poblacion_inicial || null,
          densidad_inicial: bloqueData.densidad_inicial || null,
          target_weight: bloqueData.target_weight || null,
          observaciones: bloqueData.observaciones || null
        }])
        .select()
        .single();

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
      console.log('Error registrando log:', err);
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
    actualizarFechasPlan,
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