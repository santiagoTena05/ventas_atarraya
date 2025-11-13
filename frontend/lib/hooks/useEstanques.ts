"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface Estanque {
  id: number;
  nombre: string;
  codigo?: string;
  capacidad_kg?: number;
  area?: number; // Nueva columna para área en m²
  ubicacion?: string;
  activo?: boolean;
  notas?: string;
  created_at: string;
  updated_at?: string;
}

export function useEstanques() {
  const [estanques, setEstanques] = useState<Estanque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar estanques desde Supabase
  const loadEstanques = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('estanques')
        .select('*')
        .eq('activo', true) // Solo estanques activos
        .order('id', { ascending: true }); // Ordenar por ID de menor a mayor

      if (error) {
        setError('Error cargando estanques');
        return;
      }

      if (data) {
        // Transformar datos para asegurar tipos correctos
        const estanquesTransformados: Estanque[] = data.map(estanque => ({
          id: estanque.id,
          nombre: estanque.nombre,
          codigo: estanque.codigo,
          capacidad_kg: estanque.capacidad_kg ? parseFloat(estanque.capacidad_kg) : undefined,
          area: estanque.area ? parseFloat(estanque.area) : 540, // Default 540 m² si no está definido
          ubicacion: estanque.ubicacion,
          activo: estanque.activo !== false, // Default true
          notas: estanque.notas,
          created_at: estanque.created_at,
          updated_at: estanque.updated_at,
        }));

        setEstanques(estanquesTransformados);
      }
    } catch (error) {
      setError('Error de conexión');
      setEstanques([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener estanques activos
  const getEstanquesActivos = () => {
    return estanques.filter(estanque => estanque.activo !== false);
  };

  // Obtener estanque por ID
  const getEstanqueById = (id: string | number) => {
    return estanques.find(estanque => estanque.id === Number(id));
  };

  // Obtener estanque por código
  const getEstanqueByCodigo = (codigo: string) => {
    return estanques.find(estanque =>
      estanque.codigo?.toLowerCase() === codigo.toLowerCase()
    );
  };

  // Calcular biomasa por área
  const calcularBiomasa = (promedioGramos: number, area: number = 540) => {
    // Convertir de gramos a kilogramos y multiplicar por área
    const biomasaCalculada = (promedioGramos / 1000) * area;
    // Redondear normalmente (0.5 hacia arriba)
    return Math.round(biomasaCalculada);
  };

  // Recargar datos
  const refresh = () => {
    loadEstanques();
  };

  // Inicializar carga de datos
  useEffect(() => {
    loadEstanques();
  }, []);

  return {
    estanques,
    estanquesActivos: getEstanquesActivos(),
    isLoading,
    error,
    loadEstanques,
    getEstanqueById,
    getEstanqueByCodigo,
    calcularBiomasa,
    refresh
  };
}