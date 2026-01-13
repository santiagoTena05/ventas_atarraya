"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TALLAS_COMERCIALES } from './useEstrategiaComercialData';

export interface ProyeccionInventarioPlanner {
  talla: string;
  semana: string;
  inventario_neto: number;
  ventas_proyectadas: number;
  cosechas_tecnicas_pendientes: boolean;
  biomasa_total: number;
  estanques_con_cosecha_tecnica: number[];
}

export function useEstrategiaComercialPlannerIntegration(planId?: string, oficinaId?: number) {
  const [proyeccionesReales, setProyeccionesReales] = useState<ProyeccionInventarioPlanner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcular proyecciones reales basadas en datos del planner
  const calculateRealProjections = useCallback(async () => {
    if (!planId || !oficinaId) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Obtener bloques del plan con sus generaciones y genéticas
      const { data: bloques, error: bloquesError } = await supabase
        .from('planner_bloques')
        .select(`
          *,
          generacion:generaciones(id, codigo, ciclo_total, peso_promedio_cosecha),
          genetica:geneticas(id, nombre, factor_crecimiento)
        `)
        .eq('plan_id', planId);

      if (bloquesError) throw bloquesError;

      // 2. Obtener estanques de la oficina
      const { data: estanques, error: estanquesError } = await supabase
        .from('estanques')
        .select('id, nombre, area, capacidad_kg')
        .eq('ubicacion', oficinaId)
        .eq('activo', true);

      if (estanquesError) throw estanquesError;

      // 3. Calcular proyecciones por semana y talla
      const proyecciones: ProyeccionInventarioPlanner[] = [];
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - fechaInicio.getDay() + 1); // Lunes de esta semana

      // Generar 16 semanas de proyecciones
      for (let semana = 0; semana < 16; semana++) {
        const fechaSemana = new Date(fechaInicio);
        fechaSemana.setDate(fechaSemana.getDate() + (semana * 7));
        const fechaStr = fechaSemana.toISOString().split('T')[0];

        TALLAS_COMERCIALES.forEach(talla => {
          let inventarioNeto = 0;
          let biomasaTotal = 0;
          let estanquesConCosechaTecnica: number[] = [];

          // Analizar cada estanque para esta semana
          estanques.forEach(estanque => {
            // Encontrar bloques activos en este estanque para esta semana
            const bloquesActivos = bloques?.filter(bloque => {
              const inicioBloque = bloque.semana_inicio;
              const finBloque = bloque.semana_inicio + bloque.duracion - 1;
              return bloque.estanque_id === estanque.id &&
                     semana >= inicioBloque &&
                     semana <= finBloque;
            }) || [];

            bloquesActivos.forEach(bloque => {
              if (bloque.estado === 'Growout' && bloque.generacion) {
                const semanasEnBloque = semana - bloque.semana_inicio + 1;
                const pesoPromedioEstimado = calculatePesoPromedio(
                  bloque.generacion.peso_promedio_cosecha || 50,
                  semanasEnBloque,
                  bloque.generacion.ciclo_total || 12
                );

                // Calcular biomasa para este bloque
                const areaEstanque = estanque.area || 540;
                const biomasaBloque = (pesoPromedioEstimado / 1000) * areaEstanque;
                biomasaTotal += biomasaBloque;

                // Determinar si el peso corresponde a esta talla
                const inventarioPorTalla = calculateInventarioPorTalla(biomasaBloque, talla, pesoPromedioEstimado);
                inventarioNeto += inventarioPorTalla;

                // Verificar si necesita cosecha técnica
                const necesitaCosechaTecnica = checkCosechaTecnica(
                  pesoPromedioEstimado,
                  semanasEnBloque,
                  bloque.generacion.ciclo_total || 12,
                  biomasaBloque,
                  estanque.capacidad_kg
                );

                if (necesitaCosechaTecnica && !estanquesConCosechaTecnica.includes(estanque.id)) {
                  estanquesConCosechaTecnica.push(estanque.id);
                }
              }
            });
          });

          // Obtener ventas proyectadas (por ahora simuladas, podrían venir de históricos)
          const ventasProyectadas = calculateVentasProyectadas(talla, semana);

          proyecciones.push({
            talla,
            semana: fechaStr,
            inventario_neto: Math.round(inventarioNeto),
            ventas_proyectadas: Math.round(ventasProyectadas),
            cosechas_tecnicas_pendientes: estanquesConCosechaTecnica.length > 0,
            biomasa_total: Math.round(biomasaTotal),
            estanques_con_cosecha_tecnica: estanquesConCosechaTecnica
          });
        });
      }

      setProyeccionesReales(proyecciones);
    } catch (error) {
      console.error('Error calculando proyecciones reales:', error);
      setError('Error calculando proyecciones del planner');
    } finally {
      setIsLoading(false);
    }
  }, [planId, oficinaId]);

  useEffect(() => {
    calculateRealProjections();
  }, [calculateRealProjections]);

  return {
    proyeccionesReales,
    isLoading,
    error,
    recalculate: calculateRealProjections
  };
}

// Funciones auxiliares para cálculos
function calculatePesoPromedio(pesoBase: number, semanasEnBloque: number, cicloTotal: number): number {
  // Curva de crecimiento simple - esto podría ser más sofisticado
  const progreso = Math.min(semanasEnBloque / cicloTotal, 1);
  return pesoBase * progreso;
}

function calculateInventarioPorTalla(biomasaTotal: number, talla: string, pesoPromedio: number): number {
  // Mapear rangos de peso a tallas
  const tallaRanges: Record<string, { min: number; max: number }> = {
    '61-70': { min: 61, max: 70 },
    '51-60': { min: 51, max: 60 },
    '41-50': { min: 41, max: 50 },
    '31-40': { min: 31, max: 40 },
    '31-35': { min: 31, max: 35 },
    '26-30': { min: 26, max: 30 },
    '21-25': { min: 21, max: 25 },
    '16-20': { min: 16, max: 20 }
  };

  const rango = tallaRanges[talla];
  if (!rango) return 0;

  // Verificar si el peso promedio está en este rango
  if (pesoPromedio >= rango.min && pesoPromedio <= rango.max) {
    // Simular distribución - en realidad esto requeriría un modelo más sofisticado
    return biomasaTotal * 0.7; // Asumir que 70% de la biomasa está en la talla objetivo
  } else if (pesoPromedio < rango.min) {
    // El camarón aún no ha alcanzado esta talla
    return 0;
  } else {
    // El camarón ya superó esta talla
    return biomasaTotal * 0.1; // Solo un 10% podría estar aún en esta talla
  }
}

function checkCosechaTecnica(
  pesoPromedio: number,
  semanasEnBloque: number,
  cicloTotal: number,
  biomasa: number,
  capacidadMaxima?: number
): boolean {
  // Criterios para cosecha técnica:
  // 1. Si está cerca del final del ciclo (80%+)
  const progresoDelCiclo = semanasEnBloque / cicloTotal;
  if (progresoDelCiclo >= 0.8) return true;

  // 2. Si la biomasa supera la capacidad del estanque
  if (capacidadMaxima && biomasa >= capacidadMaxima * 0.9) return true;

  // 3. Si el peso promedio supera cierto umbral
  if (pesoPromedio >= 60) return true;

  return false;
}

function calculateVentasProyectadas(talla: string, semana: number): number {
  // Simular ventas proyectadas basadas en patrones históricos
  // En una implementación real, esto vendría de análisis de ventas históricas

  const baseVentas: Record<string, number> = {
    '61-70': 800,
    '51-60': 1200,
    '41-50': 1500,
    '31-40': 1000,
    '31-35': 800,
    '26-30': 600,
    '21-25': 400,
    '16-20': 200
  };

  const base = baseVentas[talla] || 500;

  // Variación estacional (mayor demanda en ciertas semanas)
  const factorEstacional = 0.8 + (Math.sin(semana / 52 * 2 * Math.PI) * 0.4);

  // Variación aleatoria
  const variacion = 0.8 + (Math.random() * 0.4);

  return base * factorEstacional * variacion;
}