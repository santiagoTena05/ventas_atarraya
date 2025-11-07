"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useGeneraciones } from '@/lib/hooks/useGeneraciones';

export interface MuestreoEstanque {
  estanqueId: number;
  muestreos: number[];
  promedio: number;
  biomasa: number;
  cosecha?: number;
}

export interface SesionRegistro {
  id: string;
  fecha: string;
  generacion: string;
  semana?: number;
  muestreos: { [estanqueId: string]: MuestreoEstanque };
  fechaRegistro: Date;
  estado?: 'en_progreso' | 'completado';
}

export interface MuestreosSesion {
  id: string;
  fecha: string;
  semana?: number;
  generacion_id: string;
  estado: 'en_progreso' | 'completado';
  observaciones?: string;
  created_at: string;
  updated_at: string;
  generaciones?: {
    codigo: string;
    nombre?: string;
  };
}

export interface MuestreosDetalle {
  id: string;
  sesion_id: string;
  estanque_id: number;
  muestreos: number[];
  promedio: number;
  biomasa: number;
  cosecha: number;
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

export function useMuestreos() {
  const [sesiones, setSesiones] = useState<SesionRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { generaciones, getGeneracionByCodigo, crearGeneracion } = useGeneraciones();

  // Cargar sesiones desde Supabase
  const loadSesiones = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Cargando sesiones de muestreos desde Supabase...');

      const { data: sesionesData, error: sesionesError } = await supabase
        .from('muestreos_sesiones')
        .select(`
          *,
          generaciones (
            codigo,
            nombre
          )
        `)
        .order('fecha', { ascending: false });

      if (sesionesError) {
        console.error('❌ Error cargando sesiones:', sesionesError);
        setError('Error cargando sesiones');
        return;
      }

      if (sesionesData && sesionesData.length > 0) {
        // Cargar detalles de muestreos para cada sesión
        const { data: detallesData, error: detallesError } = await supabase
          .from('muestreos_detalle')
          .select('*')
          .in('sesion_id', sesionesData.map(s => s.id));

        if (detallesError) {
          console.error('❌ Error cargando detalles:', detallesError);
          setError('Error cargando detalles de muestreos');
          return;
        }

        // Transformar datos al formato esperado por la interfaz
        const sesionesTransformadas: SesionRegistro[] = sesionesData.map(sesion => {
          const detallesSesion = detallesData?.filter(d => d.sesion_id === sesion.id) || [];

          const muestreos: { [estanqueId: string]: MuestreoEstanque } = {};
          detallesSesion.forEach(detalle => {
            muestreos[detalle.estanque_id.toString()] = {
              estanqueId: detalle.estanque_id,
              muestreos: detalle.muestreos || [],
              promedio: detalle.promedio || 0,
              biomasa: detalle.biomasa || 0,
              cosecha: detalle.cosecha || 0
            };
          });

          return {
            id: sesion.id,
            fecha: sesion.fecha,
            generacion: sesion.generaciones?.codigo || 'N/A',
            semana: sesion.semana,
            muestreos,
            fechaRegistro: new Date(sesion.created_at),
            estado: sesion.estado
          };
        });

        setSesiones(sesionesTransformadas);
        console.log(`✅ Cargadas ${sesionesTransformadas.length} sesiones de muestreos`);
      } else {
        setSesiones([]);
        console.log('📋 No hay sesiones de muestreos registradas');
      }
    } catch (error) {
      console.error('❌ Error cargando muestreos:', error);
      setError('Error de conexión');
      setSesiones([]);
    } finally {
      setLoading(false);
    }
  };

  // Guardar nueva sesión en Supabase
  const guardarSesion = async (sesion: Omit<SesionRegistro, 'id' | 'fechaRegistro'>) => {
    try {
      console.log('🔄 Guardando sesión de muestreos...');

      // Buscar o crear generación
      let generacion = getGeneracionByCodigo(sesion.generacion);
      if (!generacion) {
        console.log('🔄 Creando nueva generación:', sesion.generacion);
        generacion = await crearGeneracion({
          codigo: sesion.generacion,
          estado: 'activa'
        });
      }

      if (!generacion) {
        throw new Error('No se pudo crear o encontrar la generación');
      }

      // Crear sesión de muestreo
      const { data: sesionData, error: sesionError } = await supabase
        .from('muestreos_sesiones')
        .insert([{
          fecha: sesion.fecha,
          semana: sesion.semana,
          generacion_id: generacion.id,
          estado: sesion.estado || 'completado'
        }])
        .select()
        .single();

      if (sesionError) {
        console.error('❌ Error creando sesión:', sesionError);
        throw new Error('Error creando sesión');
      }

      // Crear detalles de muestreos
      const detalles = Object.entries(sesion.muestreos).map(([estanqueId, muestreo]) => ({
        sesion_id: sesionData.id,
        estanque_id: parseInt(estanqueId),
        muestreos: muestreo.muestreos,
        promedio: muestreo.promedio,
        biomasa: muestreo.biomasa,
        cosecha: muestreo.cosecha || 0
      }));

      const { error: detallesError } = await supabase
        .from('muestreos_detalle')
        .insert(detalles);

      if (detallesError) {
        console.error('❌ Error creando detalles:', detallesError);
        throw new Error('Error guardando detalles de muestreos');
      }

      console.log('✅ Sesión guardada exitosamente');

      // Recargar sesiones
      await loadSesiones();
      return true;
    } catch (error) {
      console.error('❌ Error guardando sesión:', error);
      setError('Error guardando sesión');
      return false;
    }
  };

  // Obtener sesiones por generación
  const obtenerPorGeneracion = (generacion: string) => {
    return sesiones.filter(s => s.generacion === generacion);
  };

  // Obtener sesiones por fecha
  const obtenerPorFecha = (fecha: string) => {
    return sesiones.filter(s => s.fecha === fecha);
  };

  // Obtener sesiones por estanque
  const obtenerPorEstanque = (estanqueId: number) => {
    return sesiones.filter(s => s.muestreos[estanqueId.toString()]);
  };

  // Obtener todas las generaciones únicas
  const obtenerGeneraciones = () => {
    const generacionesSet = new Set(sesiones.map(s => s.generacion));
    return Array.from(generacionesSet).sort();
  };

  // Obtener todas las fechas únicas
  const obtenerFechas = () => {
    const fechasSet = new Set(sesiones.map(s => s.fecha));
    return Array.from(fechasSet).sort();
  };

  // Calcular datos para vista de generaciones
  const calcularDatosGeneraciones = (estanqueIds: number[]) => {
    const datos: any[] = [];
    const generacionesUnicas = obtenerGeneraciones();

    estanqueIds.forEach(estanqueId => {
      generacionesUnicas.forEach(generacion => {
        const sesionesGeneracion = obtenerPorGeneracion(generacion);
        const muestreosEstanque = sesionesGeneracion
          .map(s => s.muestreos[estanqueId.toString()])
          .filter(m => m);

        if (muestreosEstanque.length > 0) {
          const ultimoMuestreo = muestreosEstanque[muestreosEstanque.length - 1];
          datos.push({
            generacion,
            estanqueId,
            muestreo: ultimoMuestreo
          });
        }
      });
    });

    return datos;
  };

  // Recargar datos
  const refresh = () => {
    loadSesiones();
  };

  // Inicializar carga de datos
  useEffect(() => {
    loadSesiones();
  }, []);

  return {
    sesiones,
    loading,
    error,
    guardarSesion,
    obtenerPorGeneracion,
    obtenerPorFecha,
    obtenerPorEstanque,
    obtenerGeneraciones,
    obtenerFechas,
    calcularDatosGeneraciones,
    refresh
  };
}