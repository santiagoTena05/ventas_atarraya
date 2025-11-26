"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Genetics {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GrowthCurvePoint {
  id: number;
  genetics_id: number;
  week: number;
  weight_grams: number;
  created_at: string;
  updated_at: string;
}

export function useGenetics() {
  const [genetics, setGenetics] = useState<Genetics[]>([]);
  const [growthCurves, setGrowthCurves] = useState<Record<number, GrowthCurvePoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenetics = async () => {
    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from('genetics')
        .select('*')
        .eq('active', true)
        .order('name');

      if (fetchError) throw fetchError;

      setGenetics(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar genéticas');
      console.error('Error fetching genetics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGrowthCurves = async (geneticsId?: number) => {
    try {
      let query = supabase
        .from('growth_curves')
        .select('*')
        .order('week');

      if (geneticsId) {
        query = query.eq('genetics_id', geneticsId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (data) {
        if (geneticsId) {
          setGrowthCurves(prev => ({
            ...prev,
            [geneticsId]: data
          }));
        } else {
          // Agrupar por genetics_id
          const grouped = data.reduce((acc, curve) => {
            if (!acc[curve.genetics_id]) {
              acc[curve.genetics_id] = [];
            }
            acc[curve.genetics_id].push(curve);
            return acc;
          }, {} as Record<number, GrowthCurvePoint[]>);

          setGrowthCurves(grouped);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar curvas de crecimiento');
      console.error('Error fetching growth curves:', err);
    }
  };

  useEffect(() => {
    fetchGenetics();
    fetchGrowthCurves(); // Cargar todas las curvas
  }, []);

  // Obtener peso por semana usando interpolación lineal
  const getWeightByWeek = (geneticsId: number, week: number): number => {
    const curves = growthCurves[geneticsId];
    if (!curves || curves.length === 0) return 1.0; // Valor por defecto

    // Casos extremos
    if (week < 0) return curves[0].weight_grams;
    if (week >= curves[curves.length - 1].week) return curves[curves.length - 1].weight_grams;

    // Buscar punto exacto
    const exactPoint = curves.find(point => point.week === week);
    if (exactPoint) return exactPoint.weight_grams;

    // Interpolación lineal
    const lowerWeek = Math.floor(week);
    const upperWeek = Math.ceil(week);

    const lowerPoint = curves.find(point => point.week === lowerWeek);
    const upperPoint = curves.find(point => point.week === upperWeek);

    if (!lowerPoint || !upperPoint) {
      // Buscar el punto más cercano
      const closest = curves.reduce((prev, curr) =>
        Math.abs(curr.week - week) < Math.abs(prev.week - week) ? curr : prev
      );
      return closest.weight_grams;
    }

    if (lowerWeek === upperWeek) return lowerPoint.weight_grams;

    const fraction = week - lowerWeek;
    return lowerPoint.weight_grams + (upperPoint.weight_grams - lowerPoint.weight_grams) * fraction;
  };

  // Calcular biomasa total para una población
  const calculateTotalBiomass = (population: number, week: number, geneticsId: number) => {
    const individualWeight = getWeightByWeek(geneticsId, week);
    const biomassGrams = population * individualWeight;
    const biomassKg = biomassGrams / 1000;

    return {
      individualWeight,
      biomassGrams,
      biomassKg
    };
  };

  // Calcular progresión de biomasa con mortalidad
  const calculateBiomassProgression = (
    initialPopulation: number,
    weeklyMortalityRate: number,
    startWeek: number,
    endWeek: number,
    geneticsId: number
  ) => {
    const progression = [];
    let currentPopulation = initialPopulation;

    for (let week = startWeek; week <= endWeek; week++) {
      const biomass = calculateTotalBiomass(currentPopulation, week, geneticsId);

      progression.push({
        week,
        population: Math.floor(currentPopulation),
        individualWeight: biomass.individualWeight,
        biomassKg: biomass.biomassKg
      });

      // Aplicar mortalidad para la siguiente semana
      if (week < endWeek && weeklyMortalityRate > 0) {
        currentPopulation = currentPopulation * (1 - weeklyMortalityRate);
      }
    }

    return progression;
  };

  // Calcular tasa de mortalidad semanal
  const calculateWeeklyMortalityRate = (totalMortalityPercentage: number, cycleDurationWeeks: number): number => {
    return (totalMortalityPercentage / 100) / cycleDurationWeeks;
  };

  return {
    genetics,
    growthCurves,
    loading,
    error,
    fetchGenetics,
    fetchGrowthCurves,
    getWeightByWeek,
    calculateTotalBiomass,
    calculateBiomassProgression,
    calculateWeeklyMortalityRate,
    refresh: () => {
      fetchGenetics();
      fetchGrowthCurves();
    }
  };
}