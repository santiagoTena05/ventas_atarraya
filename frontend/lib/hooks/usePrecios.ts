"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface PrecioCamaron {
  id: number;
  talla_nombre: string;
  peso_min_gramos: number;
  peso_max_gramos: number;
  conteo_min_kilo: number;
  conteo_max_kilo: number;
  precio_mayorista: number;
  precio_restaurante: number;
  precio_menudeo: number;
  cantidad_min_mayorista: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalculoPrecio {
  precio_unitario: number;
  monto_bruto: number;
  monto_descuentos: number;
  monto_total: number;
  tipo_precio_aplicado: 'mayorista' | 'restaurante' | 'menudeo';
  talla_detectada: string;
}

export function usePrecios() {
  const [precios, setPrecios] = useState<PrecioCamaron[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar precios desde Supabase
  useEffect(() => {
    const loadPrecios = async () => {
      try {
        const { data, error } = await supabase
          .from('precios_camaron_detalle')
          .select('*')
          .order('peso_min_gramos');

        if (!error && data) {
          setPrecios(data);
          console.log(`✅ Precios cargados: ${data.length} registros`);
        } else {
          console.error('❌ Error cargando precios:', error);
          setPrecios([]);
        }
      } catch (error) {
        console.error('❌ Error cargando precios:', error);
        setPrecios([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPrecios();
  }, []);

  // Función para calcular precio automático
  const calcularPrecio = useCallback(async (
    cosechaId: number,
    tipoCliente: string,
    cantidadKg: number,
    descuentoPorcentaje: number = 0,
    descuentoMxn: number = 0
  ): Promise<CalculoPrecio | null> => {
    try {
      // 1. Obtener tallas de la cosecha
      const { data: cosechaData, error: cosechaError } = await supabase
        .from('cosechas_inventario_detallado')
        .select('tallas_detalle')
        .eq('id', cosechaId)
        .single();

      if (cosechaError || !cosechaData) {
        console.error('❌ Error obteniendo cosecha:', cosechaError);
        return null;
      }

      // 2. Procesar tallas de la cosecha (formato: "Talla1: peso1kg, Talla2: peso2kg")
      const tallasStr = cosechaData.tallas_detalle || '';

      // Extraer la primera talla como referencia
      let tallaPrincipal = '';
      if (tallasStr !== 'Sin tallas') {
        const primeraTalla = tallasStr.split(',')[0].trim();
        tallaPrincipal = primeraTalla.split(':')[0].trim();
      }

      if (!tallaPrincipal) {
        console.error('❌ No se pudo determinar la talla de la cosecha');
        return null;
      }

      // 3. Buscar precio correspondiente
      const precioCorrespondiente = precios.find(p =>
        p.talla_nombre.toLowerCase() === tallaPrincipal.toLowerCase()
      );

      if (!precioCorrespondiente) {
        console.error('❌ No se encontró precio para la talla:', tallaPrincipal);
        return null;
      }

      // 4. Determinar tipo de precio a aplicar
      let precioUnitario = 0;
      let tipoPrecio: 'mayorista' | 'restaurante' | 'menudeo' = 'menudeo';

      if (tipoCliente === 'Mayorista' && cantidadKg >= precioCorrespondiente.cantidad_min_mayorista) {
        precioUnitario = precioCorrespondiente.precio_mayorista;
        tipoPrecio = 'mayorista';
      } else if (tipoCliente === 'Restaurante') {
        precioUnitario = precioCorrespondiente.precio_restaurante;
        tipoPrecio = 'restaurante';
      } else {
        precioUnitario = precioCorrespondiente.precio_menudeo;
        tipoPrecio = 'menudeo';
      }

      // 5. Calcular montos
      const montoBruto = cantidadKg * precioUnitario;
      const descuentoPorPorcentaje = (montoBruto * descuentoPorcentaje) / 100;
      const montoDescuentos = descuentoPorPorcentaje + descuentoMxn;
      const montoTotal = montoBruto - montoDescuentos;

      console.log('💰 Cálculo de precio:', {
        talla: tallaPrincipal,
        tipoCliente,
        cantidadKg,
        precioUnitario,
        tipoPrecio,
        montoBruto,
        montoDescuentos,
        montoTotal
      });

      return {
        precio_unitario: precioUnitario,
        monto_bruto: montoBruto,
        monto_descuentos: montoDescuentos,
        monto_total: montoTotal,
        tipo_precio_aplicado: tipoPrecio,
        talla_detectada: tallaPrincipal
      };

    } catch (error) {
      console.error('❌ Error calculando precio:', error);
      return null;
    }
  }, [precios]);

  // Función para obtener precio unitario directo desde la base de datos
  const obtenerPrecioDirect = async (
    tallaId: number,
    tipoCliente: string,
    cantidadKg: number
  ): Promise<number> => {
    try {
      const { data, error } = await supabase
        .rpc('obtener_precio_camaron', {
          talla_id_param: tallaId,
          tipo_cliente_param: tipoCliente,
          cantidad_kg_param: cantidadKg
        });

      if (error) {
        console.error('❌ Error obteniendo precio directo:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('❌ Error obteniendo precio directo:', error);
      return 0;
    }
  };

  // Función para refrescar precios
  const refreshPrecios = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('precios_camaron_detalle')
        .select('*')
        .order('peso_min_gramos');

      if (!error && data) {
        setPrecios(data);
        console.log(`✅ Precios refrescados: ${data.length} registros`);
      }
    } catch (error) {
      console.error('❌ Error refrescando precios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    precios,
    isLoading,
    calcularPrecio,
    obtenerPrecioDirect,
    refreshPrecios,
  };
}