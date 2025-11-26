"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Oficina {
  id: number;
  nombre: string;
  codigo?: string;
  direccion?: string;
  telefono?: string;
  responsable_principal_id?: number;
  activa: boolean;
  created_at: string;
}

interface Estanque {
  id: number;
  nombre: string;
  codigo?: string;
  area?: number;
  ubicacion?: number;
  activo?: boolean;
  notas?: string;
  created_at: string;
  updated_at?: string;
}

interface LocationData {
  id: number;
  name: string;
  numTanks: number;
  startDate: Date;
  endDate: Date;
  data: Record<string, any>;
  tankNames: Record<number, string>;
  tankTypes: Record<number, string>;
  tankSizes: Record<number, number>;
}

export function usePlannerData() {
  const [oficinas, setOficinas] = useState<Oficina[]>([]);
  const [estanques, setEstanques] = useState<Estanque[]>([]);
  const [locationData, setLocationData] = useState<Record<string, LocationData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOficinas = async () => {
    try {
      const { data, error } = await supabase
        .from('oficinas')
        .select('*')
        .eq('activa', true)
        .order('nombre');

      if (error) {
        console.error('❌ Error cargando oficinas:', error);
        setError('Error cargando oficinas');
        return;
      }

      setOficinas(data || []);
      console.log(`✅ Cargadas ${data?.length || 0} oficinas`);
    } catch (error) {
      console.error('❌ Error cargando oficinas:', error);
      setError('Error cargando oficinas');
    }
  };

  const loadEstanques = async () => {
    try {
      const { data, error } = await supabase
        .from('estanques')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) {
        console.error('❌ Error cargando estanques:', error);
        setError('Error cargando estanques');
        return;
      }

      setEstanques(data || []);
      console.log(`✅ Cargados ${data?.length || 0} estanques`);
    } catch (error) {
      console.error('❌ Error cargando estanques:', error);
      setError('Error cargando estanques');
    }
  };

  const processLocationData = () => {
    if (oficinas.length === 0 || estanques.length === 0) return;

    const locations: Record<string, LocationData> = {};

    oficinas.forEach((oficina) => {
      const oficinaEstanques = estanques.filter(
        estanque => estanque.ubicacion === oficina.id
      );

      if (oficinaEstanques.length === 0) return;

      const tankNames: Record<number, string> = {};
      const tankTypes: Record<number, string> = {};
      const tankSizes: Record<number, number> = {};

      oficinaEstanques.forEach((estanque) => {
        const tankId = estanque.id; // Usar el ID real del estanque
        tankNames[tankId] = estanque.nombre;

        // Inferir tipo basado en el nombre/código del estanque
        let tankType = 'Pool'; // Default
        if (estanque.nombre.toLowerCase().includes('tanque p') || estanque.codigo?.startsWith('T-')) {
          tankType = 'Shrimpbox';
        } else if (estanque.nombre.toLowerCase().includes('estanque e') || estanque.codigo?.startsWith('E-')) {
          tankType = 'Blue Whale';
        } else if (estanque.nombre.toLowerCase().includes('biofloc') || estanque.codigo?.startsWith('B-')) {
          tankType = 'Biofloc';
        } else if (estanque.nombre.toLowerCase().includes('nursery') || estanque.codigo?.startsWith('N-')) {
          tankType = 'Nursery';
        } else if (estanque.nombre.toLowerCase().includes('grow')) {
          tankType = 'Pool';
        }

        tankTypes[tankId] = tankType;
        tankSizes[tankId] = estanque.area || 540; // Default si no hay área definida
      });

      const locationKey = `oficina_${oficina.id}`;
      locations[locationKey] = {
        id: oficina.id,
        name: oficina.nombre,
        numTanks: oficinaEstanques.length,
        startDate: new Date('2025-01-06'), // Fecha de inicio del año
        endDate: new Date('2025-12-29'),   // Fecha de fin del año
        data: {},
        tankNames,
        tankTypes,
        tankSizes
      };
    });

    setLocationData(locations);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      await Promise.all([
        loadOficinas(),
        loadEstanques()
      ]);

      setIsLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    processLocationData();
  }, [oficinas, estanques]);

  return {
    oficinas,
    estanques,
    locationData,
    isLoading,
    error,
    refetch: () => {
      loadOficinas();
      loadEstanques();
    }
  };
}