"use client";

import { useState, useEffect } from "react";
import { dummySales, type VentaRegistrada } from "@/lib/dummy-sales";
import { type VentaFormData } from "@/lib/schemas";

const STORAGE_KEY = "agua_blanca_sales";

export function useSales() {
  const [sales, setSales] = useState<VentaRegistrada[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos al inicializar (localStorage + datos dummy)
  useEffect(() => {
    try {
      const savedSales = localStorage.getItem(STORAGE_KEY);
      if (savedSales) {
        const parsedSales = JSON.parse(savedSales);
        setSales(parsedSales);
      } else {
        // Si no hay datos guardados, usar los datos dummy
        setSales(dummySales);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dummySales));
      }
    } catch (error) {
      console.error("Error loading sales from localStorage:", error);
      setSales(dummySales);
    } finally {
      setIsLoading(false);
    }
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

    // Guardar en localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSales));
    } catch (error) {
      console.error("Error saving sales to localStorage:", error);
    }

    return newSale;
  };

  // Función para obtener el siguiente folio
  const getNextFolio = () => {
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

  // Función para limpiar todas las ventas (reset a datos dummy)
  const resetSales = () => {
    setSales(dummySales);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dummySales));
  };

  return {
    sales,
    isLoading,
    addSale,
    updateSale,
    getSaleById,
    getNextFolio,
    resetSales,
  };
}