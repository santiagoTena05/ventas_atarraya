"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { type CosechaFormData, type CosechaRegistrada } from "@/lib/schemas-cosecha";

export function useCosechas() {
  const [cosechas, setCosechas] = useState<CosechaRegistrada[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar cosechas desde Supabase usando la vista de inventario
  useEffect(() => {
    const loadCosechas = async () => {
      try {
        const { data, error } = await supabase
          .from('cosechas_inventario_detallado')
          .select('*')
          .order('fecha_cosecha', { ascending: false });

        if (!error && data) {
          const transformedCosechas: CosechaRegistrada[] = data.map(cosecha => ({
            id: cosecha.id,
            folio: cosecha.folio,
            responsable: cosecha.responsable_nombre || 'Sin responsable',
            oficina: cosecha.oficina_nombre || 'Sin oficina',
            fechaCosecha: cosecha.fecha_cosecha,
            pesoTotalKg: cosecha.peso_total_kg,
            estado: cosecha.estado,
            notas: cosecha.notas || '',
            // Información de inventario
            pesoVendidoKg: cosecha.peso_vendido_kg || 0,
            pesoDisponibleKg: cosecha.peso_disponible_kg || cosecha.peso_total_kg,
            porcentajeVendido: cosecha.porcentaje_vendido || 0,
            estadoInventario: cosecha.estado_inventario || 'disponible',
            totalVentas: cosecha.total_ventas || 0,
            // Estanques y tallas procesados desde string
            estanques: cosecha.estanques_detalle
              ? cosecha.estanques_detalle.split(', ').map((item: string) => {
                  const [nombre, peso] = item.split(': ');

                  // Extraer el ID real del estanque desde el nombre
                  let estanqueId = 0;
                  const nombreLimpio = nombre || 'Sin nombre';

                  // Buscar patrones como "Estanque 5", "EST-05", etc.
                  const matchEstanque = nombreLimpio.match(/(?:estanque|est)[\s-]*(\d+)/i);
                  if (matchEstanque) {
                    estanqueId = parseInt(matchEstanque[1]);
                  }

                  console.log(`🏊 Procesando estanque: "${nombreLimpio}" -> ID extraído: ${estanqueId}`);

                  return {
                    id: estanqueId, // ID real extraído del nombre
                    nombre: nombreLimpio,
                    pesoKg: peso ? parseFloat(peso.replace('kg', '')) : 0,
                    porcentaje: 0, // Se calculará si es necesario
                  };
                })
              : [],
            tallas: cosecha.tallas_detalle
              ? cosecha.tallas_detalle.split(', ').map((item: string, index: number) => {
                  const [nombre, peso] = item.split(': ');
                  return {
                    id: index + 1, // ID temporal
                    nombre: nombre || 'Sin nombre',
                    pesoKg: peso ? parseFloat(peso.replace('kg', '')) : 0,
                    porcentaje: 0, // Se calculará si es necesario
                  };
                })
              : [],
            createdAt: cosecha.created_at,
          }));
          setCosechas(transformedCosechas);
          console.log(`Loaded ${transformedCosechas.length} cosechas from Supabase`);
        } else {
          setCosechas([]);
        }
      } catch (error) {
        console.error("Error loading cosechas from Supabase:", error);
        setCosechas([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCosechas();
  }, []);

  // Función para obtener el siguiente folio
  const getNextFolio = () => {
    if (cosechas.length === 0) return 1;
    const maxFolio = Math.max(...cosechas.map(cosecha => cosecha.folio));
    return maxFolio + 1;
  };

  // Función para agregar una nueva cosecha
  const addCosecha = async (formData: CosechaFormData): Promise<CosechaRegistrada | null> => {
    try {
      const nextFolio = getNextFolio();

      // 1. Buscar ID del responsable
      const { data: responsableData } = await supabase
        .from('responsables')
        .select('id')
        .eq('nombre', formData.responsable)
        .single();

      if (!responsableData) {
        throw new Error(`No se encontró el responsable: ${formData.responsable}`);
      }

      // 2. Crear la cosecha principal
      const { data: newCosecha, error: cosechaError } = await supabase
        .from('cosechas')
        .insert({
          folio: nextFolio,
          responsable_id: responsableData.id,
          oficina_id: 1, // Por ahora usar oficina fija
          fecha_cosecha: formData.fechaCosecha,
          peso_total_kg: formData.pesoTotalKg,
          estado: 'pendiente',
          notas: formData.notas || null,
        })
        .select()
        .single();

      if (cosechaError || !newCosecha) {
        throw new Error(`Error creando cosecha: ${cosechaError?.message}`);
      }

      // 3. Procesar entradas y crear relaciones
      // Agrupar por estanque y por talla desde las entradas
      const estanquesMap = new Map<number, number>();
      const tallasMap = new Map<number, number>();

      formData.entradas.forEach(entrada => {
        // Sumar peso por estanque
        const pesoEstanqueActual = estanquesMap.get(entrada.estanqueId) || 0;
        estanquesMap.set(entrada.estanqueId, pesoEstanqueActual + entrada.pesoKg);

        // Sumar peso por talla
        const pesoTallaActual = tallasMap.get(entrada.tallaId) || 0;
        tallasMap.set(entrada.tallaId, pesoTallaActual + entrada.pesoKg);
      });

      // 4. Insertar relaciones con estanques
      const estanquesData = Array.from(estanquesMap.entries()).map(([estanqueId, peso]) => {
        const porcentaje = formData.pesoTotalKg > 0 ? Math.min(99.99, (peso / formData.pesoTotalKg) * 100) : 0;
        return {
          cosecha_id: newCosecha.id,
          estanque_id: estanqueId,
          peso_estanque_kg: peso,
          porcentaje_contribucion: porcentaje,
        };
      });

      const { error: estanquesError } = await supabase
        .from('cosecha_estanques')
        .insert(estanquesData);

      if (estanquesError) {
        throw new Error(`Error insertando estanques: ${estanquesError.message}`);
      }

      // 5. Insertar relaciones con tallas
      const tallasData = Array.from(tallasMap.entries()).map(([tallaId, peso]) => {
        const porcentaje = formData.pesoTotalKg > 0 ? Math.min(99.99, (peso / formData.pesoTotalKg) * 100) : 0;
        return {
          cosecha_id: newCosecha.id,
          talla_camaron_id: tallaId,
          peso_talla_kg: peso,
          porcentaje_talla: porcentaje,
        };
      });

      const { error: tallasError } = await supabase
        .from('cosecha_tallas')
        .insert(tallasData);

      if (tallasError) {
        throw new Error(`Error insertando tallas: ${tallasError.message}`);
      }

      // 6. Refrescar la lista de cosechas
      await refreshCosechas();

      console.log("✅ Cosecha guardada exitosamente:", newCosecha);
      return cosechas.find(c => c.id === newCosecha.id) || null;

    } catch (error) {
      console.error("❌ Error al registrar cosecha:", error);
      throw error;
    }
  };

  // Función para refrescar cosechas
  const refreshCosechas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cosechas_inventario_detallado')
        .select('*')
        .order('fecha_cosecha', { ascending: false });

      if (!error && data) {
        const transformedCosechas: CosechaRegistrada[] = data.map(cosecha => ({
          id: cosecha.id,
          folio: cosecha.folio,
          responsable: cosecha.responsable_nombre || 'Sin responsable',
          oficina: cosecha.oficina_nombre || 'Sin oficina',
          fechaCosecha: cosecha.fecha_cosecha,
          pesoTotalKg: cosecha.peso_total_kg,
          estado: cosecha.estado,
          notas: cosecha.notas || '',
          // Información de inventario
          pesoVendidoKg: cosecha.peso_vendido_kg || 0,
          pesoDisponibleKg: cosecha.peso_disponible_kg || cosecha.peso_total_kg,
          porcentajeVendido: cosecha.porcentaje_vendido || 0,
          estadoInventario: cosecha.estado_inventario || 'disponible',
          totalVentas: cosecha.total_ventas || 0,
          // Estanques y tallas procesados desde string
          estanques: cosecha.estanques_detalle
            ? cosecha.estanques_detalle.split(', ').map((item: string) => {
                const [nombre, peso] = item.split(': ');

                // Extraer el ID real del estanque desde el nombre
                let estanqueId = 0;
                const nombreLimpio = nombre || 'Sin nombre';

                // Buscar patrones como "Estanque 5", "EST-05", etc.
                const matchEstanque = nombreLimpio.match(/(?:estanque|est)[\s-]*(\d+)/i);
                if (matchEstanque) {
                  estanqueId = parseInt(matchEstanque[1]);
                }

                return {
                  id: estanqueId, // ID real extraído del nombre
                  nombre: nombreLimpio,
                  pesoKg: peso ? parseFloat(peso.replace('kg', '')) : 0,
                  porcentaje: 0, // Se calculará si es necesario
                };
              })
            : [],
          tallas: cosecha.tallas_detalle
            ? cosecha.tallas_detalle.split(', ').map((item: string, index: number) => {
                const [nombre, peso] = item.split(': ');
                return {
                  id: index + 1, // ID temporal
                  nombre: nombre || 'Sin nombre',
                  pesoKg: peso ? parseFloat(peso.replace('kg', '')) : 0,
                  porcentaje: 0, // Se calculará si es necesario
                };
              })
            : [],
          createdAt: cosecha.created_at,
        }));
        setCosechas(transformedCosechas);
      }
    } catch (error) {
      console.error('Error refreshing cosechas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    cosechas,
    isLoading,
    addCosecha,
    getNextFolio,
    refreshCosechas,
  };
}