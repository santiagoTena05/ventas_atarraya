"use client";

import { useState, useCallback, useEffect } from 'react';
import { PlannerProjection, convertPlannerToPlayground } from '@/lib/utils/sizingConversions';

const CACHE_KEY = 'planner_projections_cache';
const CACHE_EXPIRY_HOURS = 1; // Expirar cache después de 1 hora

interface CachedProjections {
  planId: string;
  locationId: number;
  projections: PlannerProjection[];
  playgroundData: Record<string, Record<string, number>>;
  lastUpdated: number;
  expiresAt: number;
}

export function usePlannerProjectionsCache() {
  const [cachedData, setCachedData] = useState<CachedProjections | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar cache del localStorage al montar
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const data: CachedProjections = JSON.parse(cached);
        // Verificar si no ha expirado
        if (data.expiresAt > Date.now()) {
          setCachedData(data);
        } else {
          // Limpiar cache expirado
          localStorage.removeItem(CACHE_KEY);
        }
      } catch (error) {
        console.error('Error parsing cached projections:', error);
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }, []);

  // Extraer proyecciones del planner usando funciones existentes
  const extractPlannerProjections = useCallback((location: any, planId: string): PlannerProjection[] => {
    if (!location || !location.data) return [];

    const projections: PlannerProjection[] = [];
    const currentDate = new Date();

    // Iterar por todas las semanas desde la actual hacia adelante (siguientes 16 semanas)
    for (let week = 0; week < 16; week++) {
      const weekDate = new Date(currentDate);
      weekDate.setDate(currentDate.getDate() + (week * 7));
      weekDate.setDate(weekDate.getDate() - weekDate.getDay() + 1); // Lunes de esa semana

      const dateStr = weekDate.toISOString().split('T')[0];

      // Iterar por todos los tanques
      for (const tankId in location.tankNames) {
        const tankIdNum = parseInt(tankId);

        // Simular datos usando la misma lógica que el planner
        // Por ahora usar datos mock - después conectaremos con las funciones reales
        const cellKey = `tank-${tankId}-week-${week}`;
        const cellData = location.data[cellKey];

        if (cellData && cellData !== 'Ready') {
          // Simular crecimiento progresivo
          const baseWeight = week < 8 ? 5 + (week * 1.5) : 15 + ((week - 8) * 2);
          const population = 45000 - (week * 1500); // Mortalidad simulada
          const totalBiomass = (population * baseWeight) / 1000; // kg

          projections.push({
            tankId: tankIdNum,
            week,
            date: dateStr,
            averageWeight: baseWeight,
            totalBiomass,
            population,
            generation: 'GEN001',
            genetics: 'SyAqua',
            isRealData: false
          });
        }
      }
    }

    return projections;
  }, []);

  // Generar proyecciones y guardar en cache
  const generateProjections = useCallback(async (location: any, planId: string, locationId: number) => {
    if (!location || !planId) return null;

    setIsLoading(true);

    try {
      // Verificar si ya tenemos cache válido
      if (cachedData &&
          cachedData.planId === planId &&
          cachedData.locationId === locationId &&
          cachedData.expiresAt > Date.now()) {
        setIsLoading(false);
        return cachedData.playgroundData;
      }

      // Extraer proyecciones del planner
      const projections = extractPlannerProjections(location, planId);

      // Convertir a formato del playground
      const playgroundData = convertPlannerToPlayground(projections);

      // Crear cache entry
      const cacheData: CachedProjections = {
        planId,
        locationId,
        projections,
        playgroundData,
        lastUpdated: Date.now(),
        expiresAt: Date.now() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000)
      };

      // Guardar en localStorage
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setCachedData(cacheData);

      setIsLoading(false);
      return playgroundData;

    } catch (error) {
      console.error('Error generando proyecciones:', error);
      setIsLoading(false);
      return null;
    }
  }, [cachedData, extractPlannerProjections]);

  // Limpiar cache
  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setCachedData(null);
  }, []);

  // Verificar si tenemos datos en cache para un plan específico
  const hasCachedData = useCallback((planId: string, locationId: number): boolean => {
    return !!(cachedData &&
             cachedData.planId === planId &&
             cachedData.locationId === locationId &&
             cachedData.expiresAt > Date.now());
  }, [cachedData]);

  // Obtener datos del cache
  const getCachedProjections = useCallback((planId: string, locationId: number) => {
    if (hasCachedData(planId, locationId)) {
      return cachedData?.playgroundData || {};
    }
    return {};
  }, [cachedData, hasCachedData]);

  return {
    generateProjections,
    getCachedProjections,
    hasCachedData,
    clearCache,
    isLoading,
    cachedData: cachedData?.playgroundData || {},
    lastUpdated: cachedData?.lastUpdated || null
  };
}