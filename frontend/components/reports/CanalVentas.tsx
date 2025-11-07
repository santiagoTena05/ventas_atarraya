"use client";

import React, { useState, useMemo } from "react";
import { useSales } from "@/lib/hooks/useSales";
import { DateRangeSelector } from "@/components/ui/date-range-selector";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CanalVentasProps {
  salesHook: ReturnType<typeof useSales>;
}

// Tipos para los datos agregados
interface TipoProductoData {
  tipo: string;
  entero: number;
  pad: number;
  total: number;
  precioPromedio: number;
  cantidadKgs: number;
}

interface TallaCamaronData {
  talla: string;
  entero: number;
  pad: number;
  total: number;
  totalKgs: number;
  precioPromedio: number;
}

interface ClienteData {
  cliente: string;
  tipo: string;
  entero: number;
  pad: number;
  total: number;
}

interface FechaEntregaData {
  fecha: string;
  entero: number;
  pad: number;
  total: number;
}

export function CanalVentas({ salesHook }: CanalVentasProps) {
  const { sales } = salesHook;
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date } | null>(null);

  // Filtrar ventas por rango de fechas
  const ventasFiltradas = useMemo(() => {
    if (!dateRange) return sales;

    return sales.filter(venta => {
      const fechaEntrega = new Date(venta.fechaEntrega);
      return fechaEntrega >= dateRange.startDate && fechaEntrega <= dateRange.endDate;
    });
  }, [sales, dateRange]);

  // Callback para manejar cambios en el rango de fechas
  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setDateRange({ startDate, endDate });
  };

  // Canal de Ventas | tipo de producto & precio promedio
  const datosProducto = useMemo(() => {
    const agrupados: Record<string, TipoProductoData> = {};

    ventasFiltradas.forEach(venta => {
      const tipo = venta.tipoProducto;
      if (!agrupados[tipo]) {
        agrupados[tipo] = {
          tipo,
          entero: 0,
          pad: 0,
          total: 0,
          precioPromedio: 0,
          cantidadKgs: 0
        };
      }

      if (tipo === "Entero") {
        agrupados[tipo].entero += venta.totalOrden;
      } else if (tipo === "PAD") {
        agrupados[tipo].pad += venta.totalOrden;
      }

      agrupados[tipo].total += venta.totalOrden;
      agrupados[tipo].cantidadKgs += venta.enteroKgs;
    });

    // Calcular precio promedio
    Object.values(agrupados).forEach(item => {
      if (item.cantidadKgs > 0) {
        item.precioPromedio = item.total / item.cantidadKgs;
      }
    });

    return Object.values(agrupados);
  }, [ventasFiltradas]);

  // Canal de Ventas por Talla de Camarón
  const datosTalla = useMemo(() => {
    const agrupados: Record<string, TallaCamaronData> = {};

    ventasFiltradas.forEach(venta => {
      const talla = venta.tallaCamaron || "Sin Talla";
      if (!agrupados[talla]) {
        agrupados[talla] = {
          talla,
          entero: 0,
          pad: 0,
          total: 0,
          totalKgs: 0,
          precioPromedio: 0
        };
      }

      if (venta.tipoProducto === "Entero") {
        agrupados[talla].entero += venta.totalOrden;
      } else if (venta.tipoProducto === "PAD") {
        agrupados[talla].pad += venta.totalOrden;
      }

      agrupados[talla].total += venta.totalOrden;
      agrupados[talla].totalKgs += venta.enteroKgs;
    });

    // Calcular precio promedio
    Object.values(agrupados).forEach(item => {
      if (item.totalKgs > 0) {
        item.precioPromedio = item.total / item.totalKgs;
      }
    });

    return Object.values(agrupados).sort((a, b) => a.talla.localeCompare(b.talla));
  }, [ventasFiltradas]);

  // Datos para clientes
  const datosClientes = useMemo(() => {
    const agrupados: Record<string, ClienteData> = {};

    ventasFiltradas.forEach(venta => {
      const key = `${venta.cliente}-${venta.tipoCliente}`;
      if (!agrupados[key]) {
        agrupados[key] = {
          cliente: venta.cliente,
          tipo: venta.tipoCliente,
          entero: 0,
          pad: 0,
          total: 0
        };
      }

      if (venta.tipoProducto === "Entero") {
        agrupados[key].entero += venta.totalOrden;
      } else if (venta.tipoProducto === "PAD") {
        agrupados[key].pad += venta.totalOrden;
      }

      agrupados[key].total += venta.totalOrden;
    });

    return Object.values(agrupados).sort((a, b) => b.total - a.total);
  }, [ventasFiltradas]);

  // Datos para fechas de entrega
  const datosFechas = useMemo(() => {
    const agrupados: Record<string, FechaEntregaData> = {};

    ventasFiltradas.forEach(venta => {
      const fecha = new Date(venta.fechaEntrega).toLocaleDateString('es-MX');
      if (!agrupados[fecha]) {
        agrupados[fecha] = {
          fecha,
          entero: 0,
          pad: 0,
          total: 0
        };
      }

      if (venta.tipoProducto === "Entero") {
        agrupados[fecha].entero += venta.totalOrden;
      } else if (venta.tipoProducto === "PAD") {
        agrupados[fecha].pad += venta.totalOrden;
      }

      agrupados[fecha].total += venta.totalOrden;
    });

    return Object.values(agrupados).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [ventasFiltradas]);

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatKgs = (amount: number) => {
    return `${amount.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
  };


  // Colores para los gráficos
  const colors = ['#1f9a93', '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14', '#ffc107', '#28a745', '#dc3545'];

  return (
    <div className="space-y-6 p-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Canal de Ventas</h1>
        <p className="text-sm text-gray-600">tipo de producto & precio promedio</p>
      </div>

      {/* Filtros de Fecha */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Periodo de Análisis</h3>
        <DateRangeSelector onDateRangeChange={handleDateRangeChange} />
      </div>

      {/* Información adicional - Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-teal-50 rounded-lg p-4">
          <h4 className="font-semibold text-teal-800">Total Entero</h4>
          <p className="text-2xl font-bold text-teal-600">
            {formatCurrency(datosProducto.reduce((sum, item) => sum + item.entero, 0))}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800">Total PAD</h4>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(datosProducto.reduce((sum, item) => sum + item.pad, 0))}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800">Total General</h4>
          <p className="text-2xl font-bold text-gray-600">
            {formatCurrency(datosProducto.reduce((sum, item) => sum + item.total, 0))}
          </p>
        </div>
      </div>

      {/* Grid principal con 4 secciones */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* 1. Canal de Ventas | tipo de producto & precio promedio */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Canal de Ventas | tipo de producto & precio promedio</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="text-left p-2">Tipo de Cliente</th>
                  <th className="text-right p-2">Total Entero</th>
                  <th className="text-right p-2">Total PAD</th>
                  <th className="text-right p-2">Total general</th>
                </tr>
              </thead>
              <tbody>
                {datosProducto.map((item, index) => (
                  <tr key={item.tipo} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="p-2 font-medium">{item.tipo}</td>
                    <td className="p-2 text-right">{formatCurrency(item.entero)}</td>
                    <td className="p-2 text-right">{formatCurrency(item.pad)}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
                <tr className="bg-teal-600 text-white font-bold">
                  <td className="p-2">Total general</td>
                  <td className="p-2 text-right">{formatCurrency(datosProducto.reduce((sum, item) => sum + item.entero, 0))}</td>
                  <td className="p-2 text-right">{formatCurrency(datosProducto.reduce((sum, item) => sum + item.pad, 0))}</td>
                  <td className="p-2 text-right">{formatCurrency(datosProducto.reduce((sum, item) => sum + item.total, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Canal de Ventas por Talla de Camarón | total mxn */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Canal de Ventas por Talla de Camarón | total mxn</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="text-left p-2">Talla</th>
                  <th className="text-right p-2">Total Entero</th>
                  <th className="text-right p-2">Total PAD</th>
                  <th className="text-right p-2">Total general</th>
                </tr>
              </thead>
              <tbody>
                {datosTalla.map((item, index) => (
                  <tr key={item.talla} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="p-2 font-medium">{item.talla}</td>
                    <td className="p-2 text-right">{formatCurrency(item.entero)}</td>
                    <td className="p-2 text-right">{formatCurrency(item.pad)}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
                <tr className="bg-teal-600 text-white font-bold">
                  <td className="p-2">Total general</td>
                  <td className="p-2 text-right">{formatCurrency(datosTalla.reduce((sum, item) => sum + item.entero, 0))}</td>
                  <td className="p-2 text-right">{formatCurrency(datosTalla.reduce((sum, item) => sum + item.pad, 0))}</td>
                  <td className="p-2 text-right">{formatCurrency(datosTalla.reduce((sum, item) => sum + item.total, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Canal de Ventas por Talla de Camarón | total kgs */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Canal de Ventas por Talla de Camarón | total kgs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="text-left p-2">Talla</th>
                  <th className="text-right p-2">Total Entero</th>
                  <th className="text-right p-2">Total PAD</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {datosTalla.map((item, index) => (
                  <tr key={item.talla} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="p-2 font-medium">{item.talla}</td>
                    <td className="p-2 text-right">{formatKgs(item.totalKgs * (item.entero / item.total || 0))}</td>
                    <td className="p-2 text-right">{formatKgs(item.totalKgs * (item.pad / item.total || 0))}</td>
                    <td className="p-2 text-right font-medium">{formatKgs(item.totalKgs)}</td>
                  </tr>
                ))}
                <tr className="bg-teal-600 text-white font-bold">
                  <td className="p-2">Total general</td>
                  <td className="p-2 text-right">{formatKgs(datosTalla.reduce((sum, item) => sum + (item.totalKgs * (item.entero / item.total || 0)), 0))}</td>
                  <td className="p-2 text-right">{formatKgs(datosTalla.reduce((sum, item) => sum + (item.totalKgs * (item.pad / item.total || 0)), 0))}</td>
                  <td className="p-2 text-right">{formatKgs(datosTalla.reduce((sum, item) => sum + item.totalKgs, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Canal de Ventas por Talla de Camarón | precio promedio mxn */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Canal de Ventas por Talla de Camarón | precio promedio mxn</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="text-left p-2">Talla</th>
                  <th className="text-right p-2">Entero</th>
                  <th className="text-right p-2">PAD</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {datosTalla.map((item, index) => (
                  <tr key={item.talla} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="p-2 font-medium">{item.talla}</td>
                    <td className="p-2 text-right">{formatCurrency(item.precioPromedio)}</td>
                    <td className="p-2 text-right">{formatCurrency(item.precioPromedio)}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(item.precioPromedio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Gráficos y tablas adicionales */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Gráfico de barras para productos */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Venta Local</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosProducto}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tipo" />
                <YAxis />
                <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                <Bar dataKey="entero" name="Entero" fill="#1f9a93" />
                <Bar dataKey="pad" name="PAD" fill="#17a2b8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabla de clientes */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clientes</h3>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-teal-600 text-white">
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {datosClientes.slice(0, 10).map((item, index) => (
                  <tr key={`${item.cliente}-${item.tipo}`} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="p-2 font-medium">{item.cliente}</td>
                    <td className="p-2">{item.tipo}</td>
                    <td className="p-2 text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}