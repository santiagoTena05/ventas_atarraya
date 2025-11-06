"use client";

import { useState, useEffect } from 'react';

export interface MuestreoEstanque {
  estanqueId: number;
  muestreos: number[];
  promedio: number;
  biomasa: number;
}

export interface SesionRegistro {
  id: string;
  fecha: string;
  generacion: string;
  muestreos: { [estanqueId: string]: MuestreoEstanque };
  fechaRegistro: Date;
}

const STORAGE_KEY = 'muestreos_sessions';

export function useMuestreos() {
  const [sesiones, setSesiones] = useState<SesionRegistro[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar sesiones desde localStorage al inicializar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convertir fechaRegistro de string a Date
        const sesionesConFechas = parsed.map((sesion: any) => ({
          ...sesion,
          fechaRegistro: new Date(sesion.fechaRegistro)
        }));
        setSesiones(sesionesConFechas);
      }
    } catch (error) {
      console.error('Error cargando sesiones de muestreos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Guardar nueva sesión
  const guardarSesion = (sesion: Omit<SesionRegistro, 'id' | 'fechaRegistro'>) => {
    const nuevaSesion: SesionRegistro = {
      ...sesion,
      id: `sesion_${Date.now()}`,
      fechaRegistro: new Date()
    };

    const nuevasSesiones = [...sesiones, nuevaSesion];
    setSesiones(nuevasSesiones);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevasSesiones));
      return true;
    } catch (error) {
      console.error('Error guardando sesión:', error);
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
    const generaciones = Array.from(new Set(sesiones.map(s => s.generacion)));
    return generaciones.sort();
  };

  // Obtener todas las fechas únicas
  const obtenerFechas = () => {
    const fechas = Array.from(new Set(sesiones.map(s => s.fecha)));
    return fechas.sort();
  };

  // Calcular datos para vista de generaciones
  const calcularDatosGeneraciones = (estanqueIds: number[]) => {
    const datos: any[] = [];
    const generaciones = obtenerGeneraciones();

    estanqueIds.forEach(estanqueId => {
      generaciones.forEach(generacion => {
        const sesionesGen = obtenerPorGeneracion(generacion);
        const muestreosEstanque = sesionesGen
          .map(s => s.muestreos[estanqueId.toString()])
          .filter(Boolean);

        if (muestreosEstanque.length > 0) {
          // Usar el muestreo más reciente para este estanque y generación
          const muestreoReciente = muestreosEstanque[muestreosEstanque.length - 1];

          datos.push({
            generacion,
            estanqueId,
            lances: muestreoReciente.muestreos,
            mediana: calcularMediana(muestreoReciente.muestreos),
            estimacionActual: muestreoReciente.biomasa,
            estimacionAnterior: undefined, // TODO: calcular basado en muestreos anteriores
            ganancia: undefined, // TODO: calcular basado en estimaciones
            cosechaSemanal: 0 // TODO: integrar con datos de cosecha
          });
        }
      });
    });

    return datos;
  };

  // Función auxiliar para calcular mediana
  const calcularMediana = (valores: number[]) => {
    const sorted = [...valores].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  };

  return {
    sesiones,
    loading,
    guardarSesion,
    obtenerPorGeneracion,
    obtenerPorFecha,
    obtenerPorEstanque,
    obtenerGeneraciones,
    obtenerFechas,
    calcularDatosGeneraciones
  };
}