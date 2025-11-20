"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCosechas } from './useCosechas';

/**
 * Hook para conectar cosechas registradas con muestreos por semana
 */
export function useCosechasSemanal() {
  const { cosechas } = useCosechas();
  const [isCalculating, setIsCalculating] = useState(false);

  /**
   * Función para calcular si dos fechas están en la misma semana (miércoles a martes)
   * Los muestreos se hacen miércoles, entonces la semana va de miércoles a martes siguiente
   */
  const isSameWeek = (fecha1: string, fecha2: string): boolean => {
    const date1 = new Date(fecha1);
    const date2 = new Date(fecha2);

    // Obtener el miércoles de cada semana (semana de miércoles a martes)
    const getWednesday = (date: Date) => {
      const d = new Date(date);
      // getDay() devuelve: 0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado
      const day = d.getDay();
      let diff;

      if (day >= 3) { // Si es miércoles (3) o después, tomar el miércoles de esta semana
        diff = 3 - day; // Días para llegar al miércoles de esta semana
      } else { // Si es domingo (0), lunes (1) o martes (2), tomar el miércoles anterior
        diff = 3 - day - 7; // Retroceder al miércoles anterior
      }

      const wednesday = new Date(d);
      wednesday.setDate(d.getDate() + diff);
      wednesday.setHours(0, 0, 0, 0); // Normalizar a medianoche
      return wednesday;
    };

    const wednesday1 = getWednesday(date1);
    const wednesday2 = getWednesday(date2);

    console.log(`🗓️ Fecha1: ${fecha1} -> Miércoles de esa semana: ${wednesday1.toISOString().split('T')[0]}`);
    console.log(`🗓️ Fecha2: ${fecha2} -> Miércoles de esa semana: ${wednesday2.toISOString().split('T')[0]}`);
    console.log(`🗓️ ¿Mismo miércoles? ${wednesday1.getTime() === wednesday2.getTime()}`);

    return wednesday1.getTime() === wednesday2.getTime();
  };

  /**
   * Función para obtener cosechas de un estanque específico en una semana específica
   */
  const obtenerCosechasSemanalEstanque = (estanqueId: number, fechaMuestreo: string) => {
    // Solo mostrar logs para fechas después del 4 de noviembre
    const fechaLimiteLog = new Date('2025-11-05');
    const fechaMuestreoDate = new Date(fechaMuestreo);
    const mostrarLogs = fechaMuestreoDate >= fechaLimiteLog;

    if (mostrarLogs) {
      console.log(`🔍 Buscando cosechas para estanque ${estanqueId} en fecha ${fechaMuestreo}`);
    }

    // Filtrar solo cosechas posteriores al 4 de noviembre 2025
    const fechaLimiteCosechas = new Date('2025-11-05');

    const cosechasSemana = cosechas.filter(cosecha => {
      // Primero verificar si la cosecha es posterior al 4 de noviembre
      const fechaCosechaDate = new Date(cosecha.fechaCosecha);
      if (fechaCosechaDate < fechaLimiteCosechas) {
        return false; // Excluir cosechas anteriores al 5 de noviembre
      }

      const enMismaSemana = isSameWeek(cosecha.fechaCosecha, fechaMuestreo);
      if (mostrarLogs) {
        console.log(`📅 Comparando fechas: Cosecha ${cosecha.fechaCosecha} vs Muestreo ${fechaMuestreo} = ${enMismaSemana ? 'MISMA SEMANA' : 'DIFERENTE SEMANA'}`);
      }
      if (enMismaSemana && mostrarLogs) {
        console.log(`✅ Cosecha en misma semana: folio ${cosecha.folio}, fecha: ${cosecha.fechaCosecha}`);
      }
      return enMismaSemana;
    });

    if (mostrarLogs) {
      console.log(`📊 Encontradas ${cosechasSemana.length} cosechas en la semana`);
    }

    let pesoSemanal = 0;
    const cosechasDelEstanque: any[] = [];

    cosechasSemana.forEach(cosecha => {
      if (mostrarLogs) {
        console.log(`🏊 Revisando cosecha ${cosecha.folio}, estanques:`, cosecha.estanques);
      }

      cosecha.estanques.forEach(estanque => {
        if (mostrarLogs) {
          console.log(`🔗 Comparando estanque: ID=${estanque.id}, nombre="${estanque.nombre}" con estanqueId=${estanqueId}`);
        }

        // Buscar por nombre o ID del estanque (múltiples formatos posibles)
        const nombreLower = estanque.nombre.toLowerCase();
        const esElEstanque = (
          estanque.id === estanqueId ||
          // Formato EST-XX
          estanque.nombre.includes(`EST-${estanqueId.toString().padStart(2, '0')}`) ||
          // Formato "Estanque X"
          nombreLower.includes(`estanque ${estanqueId}`) ||
          // Formato "Estanque-X"
          nombreLower.includes(`estanque-${estanqueId}`) ||
          // Formato "EstX"
          nombreLower.includes(`est${estanqueId}`) ||
          // Formato "EST-X" (sin ceros)
          nombreLower.includes(`est-${estanqueId}`) ||
          // Solo el número al final
          nombreLower.endsWith(` ${estanqueId}`) ||
          nombreLower.endsWith(`-${estanqueId}`) ||
          // Para casos como "Estanque 5:" en la descripción
          nombreLower.includes(`estanque ${estanqueId}:`) ||
          // ID directo
          estanque.id.toString() === estanqueId.toString()
        );

        if (mostrarLogs) {
          console.log(`✅ ¿Es el estanque correcto? ${esElEstanque}`);
        }

        if (esElEstanque) {
          if (mostrarLogs) {
            console.log(`🎯 MATCH! Agregando ${estanque.pesoKg}kg del estanque ${estanque.nombre}`);
          }
          pesoSemanal += estanque.pesoKg;
          cosechasDelEstanque.push({
            cosecha,
            pesoEstanque: estanque.pesoKg
          });
        }
      });
    });

    if (mostrarLogs) {
      console.log(`📈 Total peso semanal para estanque ${estanqueId}: ${pesoSemanal}kg`);
    }

    return {
      pesoSemanal,
      cosechas: cosechasDelEstanque
    };
  };

  /**
   * Función para calcular automáticamente las cosechas semanales y totales
   */
  const actualizarCosechasEnMuestreos = async () => {
    if (cosechas.length === 0) {
      console.log('❌ No hay cosechas para procesar');
      return;
    }

    try {
      setIsCalculating(true);
      console.log('🔄 Iniciando actualización de cosechas en muestreos...');

      // Filtrar cosechas del 5 de noviembre en adelante para mostrar solo relevantes
      const fechaLimiteCosechas = new Date('2025-11-05');
      const cosechasRelevantes = cosechas.filter(c => new Date(c.fechaCosecha) >= fechaLimiteCosechas);

      console.log('📋 Cosechas disponibles (5 nov+):', cosechasRelevantes.map(c => ({
        folio: c.folio,
        fecha: c.fechaCosecha,
        estanques: c.estanques.map(e => `${e.id}:"${e.nombre}":${e.pesoKg}kg`)
      })));

      if (cosechasRelevantes.length === 0) {
        console.log('⚠️ No hay cosechas del 5 de noviembre en adelante para sincronizar');
        setIsCalculating(false);
        return;
      }

      // 1. Obtener todos los muestreos ordenados por fecha y estanque
      const { data: muestreos, error: errorMuestreos } = await supabase
        .from('muestreos_detalle')
        .select(`
          id,
          estanque_id,
          cosecha,
          cosecha_total,
          muestreos_sesiones!inner (
            id,
            fecha,
            generacion_id
          )
        `)
        .order('muestreos_sesiones(fecha)', { ascending: true });

      if (errorMuestreos) {
        console.error('❌ Error cargando muestreos:', errorMuestreos);
        return;
      }

      if (!muestreos || muestreos.length === 0) {
        console.log('ℹ️ No hay muestreos para procesar');
        return;
      }

      // 2. Agrupar muestreos por estanque para calcular acumulativos
      const muestreosPorEstanque = new Map<number, any[]>();
      muestreos.forEach(muestreo => {
        const estanqueId = muestreo.estanque_id;
        if (!muestreosPorEstanque.has(estanqueId)) {
          muestreosPorEstanque.set(estanqueId, []);
        }
        muestreosPorEstanque.get(estanqueId)!.push(muestreo);
      });

      const actualizaciones: Promise<any>[] = [];

      // 3. Para cada estanque, procesar muestreos en orden cronológico
      for (const [estanqueId, muestreosEstanque] of muestreosPorEstanque) {
        // Ordenar por fecha
        muestreosEstanque.sort((a, b) =>
          new Date((a as any).muestreos_sesiones.fecha).getTime() -
          new Date((b as any).muestreos_sesiones.fecha).getTime()
        );

        // BUSCAR EL ÚLTIMO VALOR MANUAL DE COSECHA_TOTAL ANTES DEL 5 DE NOVIEMBRE
        // para usarlo como base para los cálculos acumulativos
        let cosechaTotalBase = 0;
        const fechaLimite = new Date('2025-11-05T23:59:59'); // Final del 5 de noviembre

        // Buscar el último muestreo HASTA el 5 de noviembre inclusive que tenga cosecha_total
        const muestreosAnteriores = muestreosEstanque.filter(m => {
          const fechaMuestreo = new Date((m as any).muestreos_sesiones.fecha);
          return fechaMuestreo <= new Date('2025-11-05') && (m.cosecha_total && m.cosecha_total > 0);
        });

        if (muestreosAnteriores.length > 0) {
          // Tomar el último (más reciente) valor manual
          const ultimoMuestreoManual = muestreosAnteriores[muestreosAnteriores.length - 1];
          cosechaTotalBase = ultimoMuestreoManual.cosecha_total || 0;
          console.log(`📋 Estanque ${estanqueId}: Encontrado valor base manual de ${cosechaTotalBase}kg hasta ${(ultimoMuestreoManual as any).muestreos_sesiones.fecha}`);
        } else {
          console.log(`📋 Estanque ${estanqueId}: No hay valores manuales anteriores, empezando desde 0`);
        }

        let cosechaTotalAcumulada = cosechaTotalBase;

        for (const muestreo of muestreosEstanque) {
          const fechaMuestreo = (muestreo as any).muestreos_sesiones.fecha;
          const fechaMuestreoDate = new Date(fechaMuestreo);

          // Verificar si necesita actualización (MODO CONSERVADOR)
          const cosechaActual = muestreo.cosecha || 0;
          const cosechaTotalActual = muestreo.cosecha_total || 0;

          // FECHA LÍMITE: Solo actualizar DESPUÉS del 5 de noviembre 2025
          const esFechaPosteriorALimite = fechaMuestreoDate > fechaLimite;

          // Para fechas posteriores al límite, actualizar SIEMPRE para recalcular totales acumulativos
          // con la nueva base manual encontrada
          const esSeguroActualizar = esFechaPosteriorALimite;

          if (esSeguroActualizar) {
            // Calcular cosecha semanal de este estanque SOLO para fechas que vamos a actualizar
            const { pesoSemanal } = obtenerCosechasSemanalEstanque(estanqueId, fechaMuestreo);

            // Sumar a la cosecha total acumulada SOLO para fechas posteriores al límite
            cosechaTotalAcumulada += pesoSemanal;

            console.log(`📊 Actualizando muestreo ${muestreo.id}:`);
            console.log(`   Estanque: ${estanqueId}, Fecha: ${fechaMuestreo}`);
            console.log(`   Base manual anterior: ${cosechaTotalBase}kg`);
            console.log(`   Cosecha semanal: ${cosechaActual} -> ${pesoSemanal}`);
            console.log(`   Cosecha total: ${cosechaTotalActual} -> ${cosechaTotalAcumulada} (base: ${cosechaTotalBase} + nuevo: ${cosechaTotalAcumulada - cosechaTotalBase})`);

            const promesaActualizacion = supabase
              .from('muestreos_detalle')
              .update({
                cosecha: pesoSemanal,
                cosecha_total: cosechaTotalAcumulada
              })
              .eq('id', muestreo.id);

            actualizaciones.push(promesaActualizacion);
          } else {
            console.log(`📅 Muestreo ${fechaMuestreo}: ¿Posterior a límite? ${esFechaPosteriorALimite}, ¿Seguro actualizar? ${esSeguroActualizar} - SALTANDO`);
          }
        }
      }

      // 4. Ejecutar todas las actualizaciones
      if (actualizaciones.length > 0) {
        console.log(`🚀 Ejecutando ${actualizaciones.length} actualizaciones...`);
        const resultados = await Promise.allSettled(actualizaciones);

        const exitosas = resultados.filter(r => r.status === 'fulfilled').length;
        const fallidas = resultados.filter(r => r.status === 'rejected').length;

        console.log(`✅ Actualizaciones completadas: ${exitosas} exitosas, ${fallidas} fallidas`);

        if (fallidas > 0) {
          const errores = resultados
            .filter(r => r.status === 'rejected')
            .map(r => (r as PromiseRejectedResult).reason);
          console.error('❌ Errores en actualizaciones:', errores);
        }
      } else {
        console.log('ℹ️ No hay actualizaciones necesarias - todos los valores están sincronizados');
      }

    } catch (error) {
      console.error('❌ Error actualizando cosechas en muestreos:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  /**
   * Función para obtener el detalle de cosechas de un muestreo específico
   */
  const obtenerDetalleCosechasMuestreo = (estanqueId: number, fechaMuestreo: string) => {
    return obtenerCosechasSemanalEstanque(estanqueId, fechaMuestreo);
  };

  /**
   * Función para recalcular después de cambios en cosechas
   */
  const recalcularCosechas = async () => {
    await actualizarCosechasEnMuestreos();
  };

  // HABILITADO: Ejecutar actualización automática cuando cambian las cosechas
  useEffect(() => {
    console.log(`🔔 Hook useCosechasSemanal: cosechas.length = ${cosechas.length}`);

    if (cosechas.length > 0) {
      console.log(`🚀 Programando actualización automática de cosechas en 2 segundos...`);
      console.log('📋 Cosechas disponibles:', cosechas.map(c => ({ folio: c.folio, fecha: c.fechaCosecha, estanques: c.estanques.length })));

      // Pequeño delay para evitar llamadas excesivas
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Ejecutando actualización automática...`);
        actualizarCosechasEnMuestreos();
      }, 2000);

      return () => clearTimeout(timeoutId);
    } else {
      console.log(`ℹ️ No hay cosechas para procesar`);
    }
  }, [cosechas.length]); // Solo cuando cambia la cantidad de cosechas

  return {
    obtenerCosechasSemanalEstanque,
    obtenerDetalleCosechasMuestreo,
    actualizarCosechasEnMuestreos,
    recalcularCosechas,
    isCalculating
  };
}