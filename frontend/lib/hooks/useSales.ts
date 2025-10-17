"use client";

import { useState, useEffect } from "react";
// Removed dummy sales import - using real data from Supabase only

export interface VentaRegistrada {
  id: number;
  folio: number;
  oficina: string;
  responsable: string;
  regionMercado: string;
  notaSalidaGranja?: string;
  fechaCosecha: string;
  fechaEntrega: string;
  cliente: string;
  tipoCliente: string;
  noOrdenAtarraya?: string;
  tipoProducto: string;
  tallaCamaron?: string;
  enteroKgs: number;
  precioVenta: number;
  montoVenta: number;
  descuentoPorcentaje: number;
  descuentoMxn: number;
  totalOrden: number;
  metodoPago: string;
  formaPago: string;
  estatusPagoCliente: string;
  estatusDeposito?: string;
  folioTransferencia?: string;
  tipoFactura?: string;
  usoCfdi?: string;
  estatusFactura?: string;
  createdAt: string;
}
import { type VentaFormData } from "@/lib/schemas";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "agua_blanca_sales";

export function useSales() {
  const [sales, setSales] = useState<VentaRegistrada[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos al inicializar (Supabase + fallback a localStorage/dummy)
  useEffect(() => {
    const loadSales = async () => {
      try {
        // Intentar cargar desde Supabase primero
        const { data, error } = await supabase
          .from('ventas')
          .select(`
            *,
            clientes(nombre),
            oficinas(nombre),
            responsables(nombre),
            regiones_mercado(nombre),
            tipos_cliente(nombre),
            tipos_producto(nombre),
            tallas_camaron(nombre),
            metodos_pago(nombre),
            formas_pago(nombre),
            estatus_pago!ventas_estatus_pago_cliente_id_fkey(nombre),
            tipos_factura(nombre),
            estatus_factura(nombre)
          `)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          // Transformar datos de Supabase al formato esperado
          const transformedSales: VentaRegistrada[] = data.map(venta => ({
            id: venta.id,
            folio: venta.folio,
            oficina: venta.oficinas?.nombre || 'Sin oficina',
            responsable: venta.responsables?.nombre || 'Sin responsable',
            regionMercado: venta.regiones_mercado?.nombre || 'Sin región',
            notaSalidaGranja: venta.nota_salida_granja || '',
            fechaCosecha: venta.fecha_cosecha,
            fechaEntrega: venta.fecha_entrega,
            cliente: venta.clientes?.nombre || 'Sin cliente',
            tipoCliente: venta.tipos_cliente?.nombre || 'Sin tipo',
            noOrdenAtarraya: venta.no_orden_atarraya || '',
            tipoProducto: venta.tipos_producto?.nombre || 'Entero',
            tallaCamaron: venta.tallas_camaron?.nombre || '',
            enteroKgs: venta.entero_kgs,
            precioVenta: venta.precio_venta,
            montoVenta: venta.monto_venta,
            descuentoPorcentaje: venta.descuento_porcentaje || 0,
            descuentoMxn: venta.descuento_mxn || 0,
            totalOrden: venta.total_orden,
            metodoPago: venta.metodos_pago?.nombre || 'Sin método',
            formaPago: venta.formas_pago?.nombre || 'Sin forma',
            estatusPagoCliente: venta.estatus_pago?.nombre || 'Sin estatus',
            estatusDeposito: 'Sin estatus',
            folioTransferencia: venta.folio_transferencia || '',
            tipoFactura: venta.tipos_factura?.nombre || 'Sin tipo',
            usoCfdi: venta.uso_cfdi || '',
            estatusFactura: venta.estatus_factura?.nombre || 'Sin estatus',
            createdAt: venta.created_at,
          }));
          setSales(transformedSales);
          console.log(`Loaded ${transformedSales.length} sales from Supabase`);
        } else {
          // Fallback a localStorage si no hay datos en Supabase
          console.log('No data in Supabase, trying localStorage...');
          const savedSales = localStorage.getItem(STORAGE_KEY);
          if (savedSales) {
            const parsedSales = JSON.parse(savedSales);
            setSales(parsedSales);
            console.log(`Loaded ${parsedSales.length} sales from localStorage`);
          } else {
            // Sin datos disponibles - lista vacía
            setSales([]);
            console.log('No sales data available - showing empty list');
          }
        }
      } catch (error) {
        console.error("Error loading sales from Supabase:", error);
        // Fallback a localStorage en caso de error
        try {
          const savedSales = localStorage.getItem(STORAGE_KEY);
          if (savedSales) {
            const parsedSales = JSON.parse(savedSales);
            setSales(parsedSales);
          } else {
            setSales([]);
          }
        } catch (localError) {
          console.error("Error loading sales from localStorage:", localError);
          setSales([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadSales();
  }, []);

  // Función para agregar una nueva venta
  const addSale = (formData: VentaFormData, folio: number) => {
    const newSale: VentaRegistrada = {
      id: Date.now(), // Simple ID basado en timestamp
      folio,
      oficina: formData.oficina,
      responsable: formData.responsable,
      regionMercado: formData.regionMercado,
      notaSalidaGranja: formData.notaSalidaGranja,
      fechaCosecha: formData.fechaCosecha,
      fechaEntrega: formData.fechaEntrega,
      cliente: formData.cliente,
      tipoCliente: formData.tipoCliente,
      noOrdenAtarraya: formData.noOrdenAtarraya,
      tipoProducto: formData.tipoProducto,
      tallaCamaron: formData.tallaCamaron,
      enteroKgs: formData.enteroKgs,
      precioVenta: formData.precioVenta,
      montoVenta: formData.enteroKgs * formData.precioVenta,
      descuentoPorcentaje: formData.descuentoPorcentaje || 0,
      descuentoMxn: formData.descuentoMxn || 0,
      totalOrden:
        formData.enteroKgs * formData.precioVenta -
        ((formData.enteroKgs * formData.precioVenta * (formData.descuentoPorcentaje || 0)) / 100) -
        (formData.descuentoMxn || 0),
      metodoPago: formData.metodoPago,
      formaPago: formData.formaPago,
      estatusPagoCliente: formData.estatusPagoCliente,
      estatusDeposito: formData.estatusDeposito,
      folioTransferencia: formData.folioTransferencia,
      tipoFactura: formData.tipoFactura,
      usoCfdi: formData.usoCfdi,
      estatusFactura: formData.estatusFactura,
      createdAt: new Date().toISOString(),
    };

    const updatedSales = [newSale, ...sales]; // Agregar al inicio
    setSales(updatedSales);

    // Guardar en localStorage como backup
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSales));
    } catch (error) {
      console.error("Error saving sales to localStorage:", error);
    }

    return newSale;
  };

  // Función para obtener el siguiente folio
  const getNextFolio = () => {
    // Obtener desde Supabase si hay ventas, sino usar datos locales
    if (sales.length === 0) return 1;
    const maxFolio = Math.max(...sales.map(sale => sale.folio));
    return maxFolio + 1;
  };

  // Función para actualizar una venta existente
  const updateSale = (saleId: number, formData: VentaFormData) => {
    const updatedSales = sales.map(sale => {
      if (sale.id === saleId) {
        const updatedSale: VentaRegistrada = {
          ...sale,
          oficina: formData.oficina,
          responsable: formData.responsable,
          regionMercado: formData.regionMercado,
          notaSalidaGranja: formData.notaSalidaGranja,
          fechaCosecha: formData.fechaCosecha,
          fechaEntrega: formData.fechaEntrega,
          cliente: formData.cliente,
          tipoCliente: formData.tipoCliente,
          noOrdenAtarraya: formData.noOrdenAtarraya,
          tipoProducto: formData.tipoProducto,
          tallaCamaron: formData.tallaCamaron,
          enteroKgs: formData.enteroKgs,
          precioVenta: formData.precioVenta,
          montoVenta: formData.enteroKgs * formData.precioVenta,
          descuentoPorcentaje: formData.descuentoPorcentaje || 0,
          descuentoMxn: formData.descuentoMxn || 0,
          totalOrden:
            formData.enteroKgs * formData.precioVenta -
            ((formData.enteroKgs * formData.precioVenta * (formData.descuentoPorcentaje || 0)) / 100) -
            (formData.descuentoMxn || 0),
          metodoPago: formData.metodoPago,
          formaPago: formData.formaPago,
          estatusPagoCliente: formData.estatusPagoCliente,
          estatusDeposito: formData.estatusDeposito,
          folioTransferencia: formData.folioTransferencia,
          tipoFactura: formData.tipoFactura,
          usoCfdi: formData.usoCfdi,
          estatusFactura: formData.estatusFactura,
        };
        return updatedSale;
      }
      return sale;
    });

    setSales(updatedSales);

    // Guardar en localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSales));
    } catch (error) {
      console.error("Error saving updated sales to localStorage:", error);
    }

    return updatedSales.find(sale => sale.id === saleId);
  };

  // Función para obtener una venta por ID
  const getSaleById = (saleId: number) => {
    return sales.find(sale => sale.id === saleId);
  };

  // Función para limpiar todas las ventas (reset a lista vacía)
  const resetSales = () => {
    setSales([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Función para refrescar datos desde Supabase
  const refreshSales = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          *,
          clientes(nombre),
          oficinas(nombre),
          responsables(nombre),
          regiones_mercado(nombre),
          tipos_cliente(nombre),
          tipos_producto(nombre),
          tallas_camaron(nombre),
          metodos_pago(nombre),
          formas_pago(nombre),
          estatus_pago!ventas_estatus_pago_cliente_id_fkey(nombre),
          tipos_factura(nombre),
          estatus_factura(nombre)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const transformedSales: VentaRegistrada[] = data.map(venta => ({
          id: venta.id,
          folio: venta.folio,
          oficina: venta.oficinas?.nombre || 'Sin oficina',
          responsable: venta.responsables?.nombre || 'Sin responsable',
          regionMercado: venta.regiones_mercado?.nombre || 'Sin región',
          notaSalidaGranja: venta.nota_salida_granja || '',
          fechaCosecha: venta.fecha_cosecha,
          fechaEntrega: venta.fecha_entrega,
          cliente: venta.clientes?.nombre || 'Sin cliente',
          tipoCliente: venta.tipos_cliente?.nombre || 'Sin tipo',
          noOrdenAtarraya: venta.no_orden_atarraya || '',
          tipoProducto: venta.tipos_producto?.nombre || 'Entero',
          tallaCamaron: venta.tallas_camaron?.nombre || '',
          enteroKgs: venta.entero_kgs,
          precioVenta: venta.precio_venta,
          montoVenta: venta.monto_venta,
          descuentoPorcentaje: venta.descuento_porcentaje || 0,
          descuentoMxn: venta.descuento_mxn || 0,
          totalOrden: venta.total_orden,
          metodoPago: venta.metodos_pago?.nombre || 'Sin método',
          formaPago: venta.formas_pago?.nombre || 'Sin forma',
          estatusPagoCliente: venta.estatus_pago?.nombre || 'Sin estatus',
          estatusDeposito: 'Sin estatus',
          folioTransferencia: venta.folio_transferencia || '',
          tipoFactura: venta.tipos_factura?.nombre || 'Sin tipo',
          usoCfdi: venta.uso_cfdi || '',
          estatusFactura: venta.estatus_factura?.nombre || 'Sin estatus',
          createdAt: venta.created_at,
        }));
        setSales(transformedSales);
        console.log(`Refreshed ${transformedSales.length} sales from Supabase`);
      }
    } catch (error) {
      console.error('Error refreshing sales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sales,
    isLoading,
    addSale,
    updateSale,
    getSaleById,
    getNextFolio,
    resetSales,
    refreshSales,
  };
}