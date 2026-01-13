"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlannerProjectionsCache } from './usePlannerProjectionsCache';
import { calcularBiomasaPorTalla } from '@/lib/utils/sizingConversions';

// Definir las tallas comerciales del playground
export const TALLAS_COMERCIALES = [
  '61-70',
  '51-60',
  '41-50',
  '31-40',
  '31-35',
  '26-30',
  '21-25',
  '16-20'
];

// Definir las categorías y presentaciones
export const CATEGORIAS_PRODUCTOS = {
  'Vivo': { presentaciones: ['Vivo'] },
  'Fresco': { presentaciones: ['HON', 'HOFF', 'P.D.'] },
  'Congelado': { presentaciones: ['HON', 'HOFF', 'P.D.'] }
};

export interface Cliente {
  id: number;
  nombre: string;
  tipo_cliente_id?: number;
  oficina?: string;
  telefono?: string;
  email?: string;
}

export interface CosechaAsignada {
  id?: string;
  fecha: string; // YYYY-MM-DD format (semana)
  talla: string;
  cliente_id: number;
  categoria: string;
  presentacion: string;
  cantidad_kg: number;
  recurrente: boolean;
  plan_id?: string;
  cliente?: Cliente;
}

export interface ProyeccionInventario {
  talla: string;
  semana: string;
  inventario_neto: number;
  ventas_proyectadas: number;
  cosechas_tecnicas_pendientes: boolean;
  inventario_neto_real?: number; // TEMPORARY: Real available inventory after week propagation
  cosecha_recomendada?: number; // TEMPORARY: Recommended harvest amount in kg
}

export function useEstrategiaComercialData(planId?: string, selectedLocation?: any, locationId?: number, versionId?: string) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cosechasAsignadas, setCosechasAsignadas] = useState<CosechaAsignada[]>([]);
  const [registeredSalesGlobal, setRegisteredSalesGlobal] = useState<any[]>([]);
  const [proyeccionesInventario, setProyeccionesInventario] = useState<ProyeccionInventario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hook para cache de proyecciones del planner (temporalmente deshabilitado)
  // const {
  //   generateProjections,
  //   getCachedProjections,
  //   hasCachedData,
  //   clearCache,
  //   isLoading: cacheLoading
  // } = usePlannerProjectionsCache();

  // Cargar clientes
  const loadClientes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, tipo_cliente_id, oficina, telefono, email')
        .eq('activo', true)
        .order('nombre');

      if (error) {
        console.error('Error cargando clientes:', error);
        return;
      }

      setClientes(data || []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  }, []);

  // Cargar cosechas asignadas para estrategia comercial (solo la versión actual)
  const loadCosechasAsignadas = useCallback(async () => {
    if (!planId) return;

    try {
      let query = supabase
        .from('estrategia_comercial_cosechas')
        .select(`
          *,
          cliente:clientes(id, nombre, oficina, telefono, email)
        `)
        .eq('plan_id', planId);

      // Filter by version if specified
      if (versionId) {
        query = query.eq('version_id', versionId);
      }

      const { data, error } = await query.order('fecha');

      if (error) {
        console.error('Error cargando cosechas asignadas:', error);
        return;
      }

      setCosechasAsignadas(data || []);
      setCosechasLoaded(true);
    } catch (error) {
      console.error('Error cargando cosechas asignadas:', error);
      setCosechasLoaded(true); // Set loaded even on error to prevent infinite loading
    }
  }, [planId, versionId]);

  // Cargar ventas registradas globalmente (todas las versiones)
  const loadGlobalRegisteredSales = useCallback(async () => {
    if (!planId) return;

    try {
      const { data, error } = await supabase
        .from('registered_sales_inventory')
        .select(`
          *,
          estrategia_comercial_versions!inner(nombre)
        `)
        .eq('plan_id', planId)
        .order('fecha_semana');

      if (error) {
        console.error('Error cargando ventas registradas globales:', error);
        return;
      }

      setRegisteredSalesGlobal(data || []);
    } catch (error) {
      console.error('Error cargando ventas registradas globales:', error);
    }
  }, [planId]);

  // Conectar con proyecciones reales del planner (directo desde BD)
  const loadProyeccionesFromPlanner = useCallback(async () => {
    if (!planId || !selectedLocation || locationId === undefined) {
      setProyeccionesInventario([]);
      return;
    }

    try {
      // Calcular fechas de inicio y fin basadas en semana actual
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - fechaInicio.getDay() + 1); // Lunes de esta semana

      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + (16 * 7)); // 16 semanas después

      const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
      const fechaFinStr = fechaFin.toISOString().split('T')[0];


      // Obtener datos reales del planner para el rango de fechas
      const { data: plannerData, error } = await supabase.rpc('get_planner_data_by_range', {
        p_plan_id: planId,
        p_fecha_inicio: fechaInicioStr,
        p_fecha_fin: fechaFinStr,
        p_estanques: Object.keys(selectedLocation.tankNames).map(Number)
      });

      if (error) {
        console.error('❌ Error obteniendo datos del planner:', error);
        throw error;
      }



      // Convertir datos del planner a proyecciones de estrategia comercial
      const proyecciones: ProyeccionInventario[] = [];

      // Generar 16 semanas de proyecciones
      for (let semana = 0; semana < 16; semana++) {
        const fechaSemana = new Date(fechaInicio);
        fechaSemana.setDate(fechaSemana.getDate() + (semana * 7));
        const fechaStr = fechaSemana.toISOString().split('T')[0];

        TALLAS_COMERCIALES.forEach(talla => {
          // Calcular biomasa total para esta semana y talla desde los datos del planner
          let inventarioKg = 0;

          if (plannerData && plannerData.length > 0) {
            // Filtrar datos del planner para esta semana
            const datosSemanales = plannerData.filter((item: any) => {
              if (!item.fecha_inicio || !item.fecha_fin) return false;
              const itemInicio = new Date(item.fecha_inicio);
              const itemFin = new Date(item.fecha_fin);
              // Un bloque está activo si la semana está dentro del rango del bloque
              return fechaSemana >= itemInicio && fechaSemana <= itemFin;
            });


            // Convertir datos del planner a tallas comerciales
            for (const item of datosSemanales) {

              // Buscar campos de población y peso usando diferentes nombres posibles
              // Para bloques de Nursery: población menor, peso objetivo bajo
              // Para bloques de Growout: población mayor, peso objetivo alto
              const esNursery = item.estado === 'Nursery';
              const poblacion = item.poblacion_inicial || item.poblacion || item.population || item.initial_population || (esNursery ? 200000 : 45000);
              const targetWeight = item.target_weight || item.peso_objetivo || item.target || item.peso_final || (esNursery ? 3 : 25);

              if (poblacion && targetWeight) {
                // Calcular semanas transcurridas desde inicio del bloque
                const inicioBloque = new Date(item.fecha_inicio);
                const semanasTranscurridas = Math.max(0, Math.floor((fechaSemana.getTime() - inicioBloque.getTime()) / (7 * 24 * 60 * 60 * 1000)));

                // Calcular peso actual basado en crecimiento progresivo
                // Nursery: crecimiento rápido en pocas semanas
                // Growout: crecimiento más lento en más semanas
                const semanasTotal = esNursery ? 3 : 16;
                const pesoActual = Math.min(targetWeight, semanasTranscurridas * (targetWeight / semanasTotal));

                // Calcular población actual (con mortalidad gradual)
                // Nursery: mayor mortalidad inicial, Growout: mortalidad más baja
                const mortalidadSemanal = esNursery ? 0.05 : 0.02; // 5% nursery, 2% growout
                const supervivencia = Math.max(0.6, 1 - (semanasTranscurridas * mortalidadSemanal));
                const poblacionActual = Math.round(poblacion * supervivencia);

                // Calcular biomasa total en kg
                const biomasaTotal = (poblacionActual * pesoActual) / 1000;


                // Solo calcular tallas comerciales para bloques Growout con peso suficiente
                if (!esNursery && pesoActual > 5) {
                  // Usar utilidades de conversión para distribuir por tallas
                  const biomasaPorTalla = calcularBiomasaPorTalla(biomasaTotal, pesoActual, poblacionActual);

                  const biomasaTalla = Math.round(biomasaPorTalla[talla] || 0);
                  if (biomasaTalla > 0) {
                    inventarioKg += biomasaTalla;
                  }
                }
              }
            }
          }

          // Solo usar datos reales del planner, no simular nada
          // inventarioKg se queda en 0 si no hay datos reales

          proyecciones.push({
            talla,
            semana: fechaStr,
            inventario_neto: inventarioKg,
            ventas_proyectadas: 0, // Se calcula después
            cosechas_tecnicas_pendientes: inventarioKg > 350
          });
        });
      }

      setProyeccionesInventario(proyecciones);
    } catch (error) {
      console.error('Error cargando proyecciones del planner:', error);
      // Si hay error, mostrar tabla vacía
      setProyeccionesInventario([]);
    }
  }, [planId, selectedLocation, locationId]);


  // Crear/actualizar cosecha asignada
  const saveCosechaAsignada = useCallback(async (cosecha: Omit<CosechaAsignada, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('estrategia_comercial_cosechas')
        .insert([{
          ...cosecha,
          plan_id: planId,
          version_id: versionId,
          is_registered: false
        }])
        .select(`
          *,
          cliente:clientes(id, nombre, oficina, telefono, email)
        `)
        .single();

      if (error) {
        throw new Error('Error guardando cosecha');
      }

      setCosechasAsignadas(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error guardando cosecha:', error);
      throw error;
    }
  }, [planId, versionId]);

  // Eliminar cosecha asignada
  const deleteCosechaAsignada = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('estrategia_comercial_cosechas')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error('Error eliminando cosecha');
      }

      setCosechasAsignadas(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error eliminando cosecha:', error);
      throw error;
    }
  }, []);

  // Obtener cosechas para una celda específica
  const getCosechasForCell = useCallback((fecha: string, talla: string) => {
    return cosechasAsignadas.filter(c => c.fecha === fecha && c.talla === talla);
  }, [cosechasAsignadas]);

  // Obtener proyección para una celda específica
  const getProyeccionForCell = useCallback((fecha: string, talla: string) => {
    return proyeccionesInventario.find(p => p.semana === fecha && p.talla === talla);
  }, [proyeccionesInventario]);

  // Calcular totales de ventas para una celda (solo esta versión)
  const getTotalVentasForCell = useCallback((fecha: string, talla: string) => {
    const cosechas = getCosechasForCell(fecha, talla);
    return cosechas.reduce((total, cosecha) => total + cosecha.cantidad_kg, 0);
  }, [getCosechasForCell]);

  // Obtener ventas registradas globalmente para una celda (todas las versiones)
  const getGlobalRegisteredSalesForCell = useCallback((fecha: string, talla: string) => {
    const globalSales = registeredSalesGlobal.filter(
      sale => sale.fecha_semana === fecha && sale.talla_comercial === talla
    );
    const totalKg = globalSales.reduce((total, sale) => total + sale.cantidad_kg, 0);
    return { totalKg, sales: globalSales };
  }, [registeredSalesGlobal]);

  // Obtener inventario disponible real (descontando ventas registradas globalmente)
  const getAvailableInventoryForCell = useCallback((fecha: string, talla: string) => {
    const proyeccion = getProyeccionForCell(fecha, talla);
    if (!proyeccion) return 0;

    // Calculate accumulated global sales up to this week (propagation)
    const accumulatedGlobalSales = registeredSalesGlobal
      .filter(sale => sale.fecha_semana <= fecha && sale.talla_comercial === talla)
      .reduce((total, sale) => total + sale.cantidad_kg, 0);

    return Math.max(0, proyeccion.inventario_neto - accumulatedGlobalSales);
  }, [getProyeccionForCell, registeredSalesGlobal]);

  // Determinar color de celda según lógica de estrategia comercial
  const getCellColor = useCallback((fecha: string, talla: string): 'blue' | 'yellow' | 'red' => {
    const proyeccion = getProyeccionForCell(fecha, talla);
    if (!proyeccion) return 'blue';

    // TEMPORARY: Use the real available inventory for color calculation
    const inventarioDisponible = proyeccion.inventario_neto_real !== undefined
      ? proyeccion.inventario_neto_real
      : proyeccion.inventario_neto - proyeccion.ventas_proyectadas;

    const totalVentas = getTotalVentasForCell(fecha, talla);

    // Rojo: ventas superan inventario disponible
    if (totalVentas > inventarioDisponible) return 'red';

    // Amarillo: cosecha técnica pendiente (high inventory, no sales)
    if (proyeccion.cosechas_tecnicas_pendientes) return 'yellow';

    // Azul: inventario suficiente
    return 'blue';
  }, [getProyeccionForCell, getTotalVentasForCell]);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    // Reset loading flags when plan changes
    setProyeccionesLoaded(false);
    setCosechasLoaded(false);

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await Promise.all([
          loadClientes(),
          loadCosechasAsignadas(),
          loadGlobalRegisteredSales(),
        ]);
      } catch (error) {
        setError('Error cargando datos de estrategia comercial');
        console.error('Error en useEstrategiaComercialData:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [loadClientes, loadCosechasAsignadas]);

  // Efecto separado para cargar proyecciones del planner
  useEffect(() => {
    if (planId && selectedLocation && locationId !== undefined) {
      loadProyeccionesFromPlanner();
    }
  }, [planId, selectedLocation, locationId, loadProyeccionesFromPlanner]);

  // State to track if both data sets are loaded
  const [proyeccionesLoaded, setProyeccionesLoaded] = useState(false);
  const [cosechasLoaded, setCosechasLoaded] = useState(false);

  // Efecto para recalcular proyecciones cuando cambian las cosechas
  const recalculateProyecciones = useCallback(() => {
    setProyeccionesInventario(prev =>
      prev.map(proyeccion => {
        // TEMPORARY: Week propagation logic for presentation
        // TODO: Replace with proper projected inventory system from estrategia_comercial.md

        // Calculate sales for current week
        const ventasProyectadasSemanaActual = cosechasAsignadas
          .filter(cosecha => cosecha.fecha === proyeccion.semana && cosecha.talla === proyeccion.talla)
          .reduce((total, cosecha) => total + cosecha.cantidad_kg, 0);

        // Calculate accumulated sales from ALL previous weeks (including current)
        const ventasAcumuladasDeSemanasPrevias = cosechasAsignadas
          .filter(cosecha => cosecha.fecha <= proyeccion.semana && cosecha.talla === proyeccion.talla)
          .reduce((total, cosecha) => total + cosecha.cantidad_kg, 0);

        // Calculate net available inventory after subtracting all previous sales
        const inventarioNetoDisponible = Math.max(0, proyeccion.inventario_neto - ventasAcumuladasDeSemanasPrevias);

        // Calculate recommended harvest amount (TEMPORARY logic)
        const HARVEST_THRESHOLD = 350;
        const HARVEST_TARGET = 350; // Harvest down to this level
        const cosechaRecomendada = inventarioNetoDisponible > HARVEST_THRESHOLD
          ? inventarioNetoDisponible - HARVEST_TARGET
          : 0;


        return {
          ...proyeccion,
          ventas_proyectadas: ventasProyectadasSemanaActual,
          inventario_neto_real: inventarioNetoDisponible, // TEMPORARY: Real available inventory after week propagation
          cosechas_tecnicas_pendientes: inventarioNetoDisponible > HARVEST_THRESHOLD, // Yellow if inventory > threshold
          cosecha_recomendada: cosechaRecomendada // TEMPORARY: Recommended harvest amount
        };
      })
    );
  }, [cosechasAsignadas]);

  // Efecto para recalcular cuando cambian las cosechas
  useEffect(() => {
    if (proyeccionesLoaded && proyeccionesInventario.length > 0) {
      recalculateProyecciones();
    }
  }, [cosechasAsignadas, recalculateProyecciones, proyeccionesLoaded, proyeccionesInventario.length]);

  // Efecto para recalcular cuando se cargan las proyecciones por primera vez
  useEffect(() => {
    if (proyeccionesInventario.length > 0 && !proyeccionesLoaded) {
      setProyeccionesLoaded(true);
      if (cosechasLoaded) {
        // Si las cosechas ya se cargaron, recalcular inmediatamente
        recalculateProyecciones();
      }
    }
  }, [proyeccionesInventario.length, proyeccionesLoaded, cosechasLoaded, recalculateProyecciones]);

  return {
    clientes,
    cosechasAsignadas,
    registeredSalesGlobal,
    proyeccionesInventario,
    isLoading,
    error,
    saveCosechaAsignada,
    deleteCosechaAsignada,
    getCosechasForCell,
    getProyeccionForCell,
    getTotalVentasForCell,
    getGlobalRegisteredSalesForCell,
    getAvailableInventoryForCell,
    getCellColor,
    clearPlannerCache: () => {}, // Temporalmente deshabilitado
    refresh: () => {
      // Reset flags before refreshing
      setProyeccionesLoaded(false);
      setCosechasLoaded(false);

      loadClientes();
      loadCosechasAsignadas();
      loadGlobalRegisteredSales();
      loadProyeccionesFromPlanner();
    }
  };
}