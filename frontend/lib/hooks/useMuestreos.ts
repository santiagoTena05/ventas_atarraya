"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useGeneraciones } from '@/lib/hooks/useGeneraciones';
import { plannerEvents } from '@/lib/events/plannerEvents';

export interface MuestreoEstanque {
  id?: string;
  estanqueId: number;
  muestreos: number[];
  promedio: number;
  biomasa: number;
  cosecha?: number;
  cosechaTotal?: number;
  averageSize?: number;
  muestreosSeleccionadosParaAverage?: number[];
  conteosCamarones?: {[key: number]: number};
  semanaCultivo?: number;
  poblacionCosechada?: number;
}

export interface SesionRegistro {
  id: string;
  fecha: string;
  generacion: string;
  generacionId: string;
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
  cosecha_total?: number;
  observaciones?: string;
  average_size?: number;
  muestreos_seleccionados_average?: number[];
  conteos_camarones?: {[key: number]: number};
  semana_cultivo?: number;
  poblacion_cosechada?: number;
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
          setError('Error cargando detalles de muestreos');
          return;
        }

        // Transformar datos al formato esperado por la interfaz
        const sesionesTransformadas: SesionRegistro[] = sesionesData.map(sesion => {
          const detallesSesion = detallesData?.filter(d => d.sesion_id === sesion.id) || [];

          const muestreos: { [estanqueId: string]: MuestreoEstanque } = {};
          detallesSesion.forEach(detalle => {
            muestreos[detalle.estanque_id.toString()] = {
              id: detalle.id,
              estanqueId: detalle.estanque_id,
              muestreos: detalle.muestreos || [],
              promedio: detalle.mediana || 0, // Ahora lee el campo 'mediana' de la BD
              biomasa: detalle.biomasa || 0,
              cosecha: detalle.cosecha || 0,
              cosechaTotal: detalle.cosecha_total || 0,
              averageSize: detalle.average_size || null,
              muestreosSeleccionadosParaAverage: detalle.muestreos_seleccionados_average || null,
              conteosCamarones: detalle.conteos_camarones || null,
              semanaCultivo: detalle.semana_cultivo || null,
              poblacionCosechada: detalle.poblacion_cosechada || null
            };
          });

          return {
            id: sesion.id,
            fecha: sesion.fecha,
            generacion: sesion.generaciones?.codigo || 'N/A',
            generacionId: sesion.generacion_id,
            semana: sesion.semana,
            muestreos,
            fechaRegistro: new Date(sesion.created_at),
            estado: sesion.estado
          };
        });

        setSesiones(sesionesTransformadas);
      } else {
        setSesiones([]);
      }
    } catch (error) {
      setError('Error de conexión');
      setSesiones([]);
    } finally {
      setLoading(false);
    }
  };

  // Guardar nueva sesión en Supabase
  const guardarSesion = async (sesion: Omit<SesionRegistro, 'id' | 'fechaRegistro'>) => {
    try {

      // Buscar o crear generación
      let generacion = getGeneracionByCodigo(sesion.generacion);
      if (!generacion) {
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
        throw new Error('Error creando sesión');
      }

      // Crear detalles de muestreos con cálculo de semana de cultivo
      const detalles = await Promise.all(
        Object.entries(sesion.muestreos).map(async ([estanqueId, muestreo]) => {
          // Calcular semana de cultivo basándose en muestreos anteriores del mismo estanque
          let semanaCultivo = 1; // Default para primer muestreo

          // Buscar el muestreo más reciente del mismo estanque y generación ANTES de la fecha actual
          const { data: muestreosAnteriores } = await supabase
            .from('muestreos_detalle')
            .select(`
              semana_cultivo,
              muestreos_sesiones!inner (
                generacion_id,
                fecha
              )
            `)
            .eq('estanque_id', parseInt(estanqueId))
            .eq('muestreos_sesiones.generacion_id', generacion.id)
            .lt('muestreos_sesiones.fecha', sesion.fecha) // SOLO muestreos ANTERIORES a la fecha actual
            .order('muestreos_sesiones(fecha)', { ascending: false }) // Ordenar por fecha real, no created_at
            .limit(1);

          if (muestreosAnteriores && muestreosAnteriores.length > 0) {
            const ultimoMuestreo = muestreosAnteriores[0];
            semanaCultivo = (ultimoMuestreo.semana_cultivo || 0) + 1;
          }

          // Calcular población cosechada SOLO si hay cosecha Y average size específico
          let poblacionCosechada = null;
          if ((muestreo.cosecha || 0) > 0 && muestreo.averageSize && muestreo.averageSize > 0) {
            poblacionCosechada = Math.round(((muestreo.cosecha || 0) * 1000) / muestreo.averageSize);
          }

          return {
            sesion_id: sesionData.id,
            estanque_id: parseInt(estanqueId),
            muestreos: muestreo.muestreos,
            mediana: muestreo.promedio, // Guardamos en el campo 'mediana' de la BD
            biomasa: muestreo.biomasa,
            cosecha: muestreo.cosecha || 0,
            average_size: muestreo.averageSize || null,
            muestreos_seleccionados_average: muestreo.muestreosSeleccionadosParaAverage || null,
            conteos_camarones: muestreo.conteosCamarones || null,
            semana_cultivo: semanaCultivo,
            poblacion_cosechada: poblacionCosechada
          };
        })
      );

      const { error: detallesError } = await supabase
        .from('muestreos_detalle')
        .insert(detalles);

      if (detallesError) {
        throw new Error('Error guardando detalles de muestreos');
      }


      // Recargar sesiones
      await loadSesiones();

      // 📢 Emitir evento + trigger para planner usando múltiples métodos
      console.log('✅ Muestreo guardado exitosamente, activando ajuste automático...');

      // Método 1: Event system (podría fallar por timing)
      plannerEvents.syncWithMuestreos();

      // Método 2: LocalStorage trigger (más confiable)
      localStorage.setItem('planner_sync_trigger', `${Date.now()}-muestreos`);

      // Método 3: Window event (global)
      window.dispatchEvent(new CustomEvent('plannerSync', { detail: { type: 'muestreos' } }));

      // Método 4: Ejecutar ajuste automático después de confirmar guardado completo
      setTimeout(() => {
        console.log('🎯 Emitiendo evento para ajuste automático del planner...');
        // Emitir evento específico para ejecutar ajuste automático
        window.dispatchEvent(new CustomEvent('executePlannerAutoAdjustment', {
          detail: {
            source: 'muestreo-guardado-completo',
            planId: '6bd19390-425e-4df2-8027-12208ceea57a',
            timestamp: Date.now()
          }
        }));
        console.log('✅ Evento de ajuste automático emitido desde muestreos');
      }, 2000); // Esperar 2 segundos para asegurar que los datos estén en BD

      return true;
    } catch (error) {
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

  // Función para recalcular semanas de cultivo de todos los muestreos existentes
  const recalcularSemanasDeChiltivo = async () => {
    try {
      console.log('🔄 Recalculando semanas de cultivo...');

      // Obtener todos los muestreos agrupados por generación y estanque
      const { data: todosLosMuestreos, error } = await supabase
        .from('muestreos_detalle')
        .select(`
          id,
          estanque_id,
          semana_cultivo,
          muestreos_sesiones!inner (
            fecha,
            generacion_id
          )
        `)
        .order('muestreos_sesiones(fecha)', { ascending: true }); // Ordenar por fecha

      if (error) {
        console.error('Error obteniendo muestreos:', error);
        return false;
      }

      // Agrupar por generación y estanque
      const muestreosPorEstanqueYGeneracion = new Map();

      todosLosMuestreos?.forEach(muestreo => {
        const key = `${(muestreo as any).muestreos_sesiones.generacion_id}-${muestreo.estanque_id}`;

        if (!muestreosPorEstanqueYGeneracion.has(key)) {
          muestreosPorEstanqueYGeneracion.set(key, []);
        }

        muestreosPorEstanqueYGeneracion.get(key).push(muestreo);
      });

      // Recalcular semanas para cada grupo
      const actualizaciones: Promise<any>[] = [];

      muestreosPorEstanqueYGeneracion.forEach((muestreosGrupo, key) => {
        // Ordenar por fecha dentro del grupo
        muestreosGrupo.sort((a: any, b: any) =>
          new Date(a.muestreos_sesiones.fecha).getTime() - new Date(b.muestreos_sesiones.fecha).getTime()
        );

        // Buscar el primer muestreo que YA tenga un valor establecido manualmente
        let baseSemanaCultivo = null;
        let baseFechaIndex = -1;

        // Buscar muestreos con valores ya establecidos manualmente
        // Consideramos como "establecido" cualquier valor que no sea null y que tenga sentido
        for (let i = 0; i < muestreosGrupo.length; i++) {
          const muestreo = muestreosGrupo[i];
          if (muestreo.semana_cultivo && muestreo.semana_cultivo > 0) {
            // Si encontramos el primer valor manual establecido, usarlo como base
            baseSemanaCultivo = muestreo.semana_cultivo;
            baseFechaIndex = i;
            console.log(`🎯 Encontrado punto base: fecha ${(muestreo as any).muestreos_sesiones.fecha}, semana ${baseSemanaCultivo} (índice ${i})`);
            break; // Usar el primer valor manual encontrado
          }
        }

        // Si no hay base establecida, usar secuencia normal (1, 2, 3...)
        if (baseSemanaCultivo === null) {
          console.log(`ℹ️ No hay valores base establecidos para ${key}, usando secuencia desde 1`);
          muestreosGrupo.forEach((muestreo: any, index: number) => {
            const semanaCultivoCorrecta = index + 1;

            if (muestreo.semana_cultivo !== semanaCultivoCorrecta) {
              console.log(`📊 Actualizando ${muestreo.id}: semana ${muestreo.semana_cultivo} -> ${semanaCultivoCorrecta}`);

              const actualizacion = supabase
                .from('muestreos_detalle')
                .update({ semana_cultivo: semanaCultivoCorrecta })
                .eq('id', muestreo.id);

              actualizaciones.push(actualizacion);
            }
          });
        } else {
          // Calcular desde el punto base establecido
          console.log(`📐 Calculando desde punto base: semana ${baseSemanaCultivo} en índice ${baseFechaIndex}`);

          muestreosGrupo.forEach((muestreo: any, index: number) => {
            // Calcular la semana correcta basándose en la distancia del punto base
            const diferencia = index - baseFechaIndex;
            const semanaCultivoCorrecta = baseSemanaCultivo + diferencia;

            // Solo actualizar si es diferente Y si no es el punto base (no sobrescribir valores manuales)
            if (muestreo.semana_cultivo !== semanaCultivoCorrecta && index !== baseFechaIndex) {
              console.log(`📊 Actualizando ${muestreo.id}: semana ${muestreo.semana_cultivo} -> ${semanaCultivoCorrecta} (base+${diferencia})`);

              const actualizacion = supabase
                .from('muestreos_detalle')
                .update({ semana_cultivo: semanaCultivoCorrecta })
                .eq('id', muestreo.id);

              actualizaciones.push(actualizacion);
            }
          });
        }
      });

      // Ejecutar todas las actualizaciones
      if (actualizaciones.length > 0) {
        console.log(`🚀 Ejecutando ${actualizaciones.length} actualizaciones...`);
        await Promise.all(actualizaciones);
        console.log('✅ Semanas de cultivo recalculadas exitosamente');

        // Recargar datos
        await loadSesiones();
        return true;
      } else {
        console.log('ℹ️ No se necesitan actualizaciones');
        return true;
      }

    } catch (error) {
      console.error('❌ Error recalculando semanas de cultivo:', error);
      return false;
    }
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
    refresh,
    recalcularSemanasDeChiltivo
  };
}