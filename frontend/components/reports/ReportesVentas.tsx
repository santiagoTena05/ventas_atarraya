"use client";

import React, { useState, useMemo } from "react";
import { useSales } from "@/lib/hooks/useSales";
import { DateRangeSelector } from "@/components/ui/date-range-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { EvolucionVentas } from "./EvolucionVentas";
import { MediosPago } from "./MediosPago";
import { TiposCliente } from "./TiposCliente";

interface ReportesVentasProps {
  salesHook: ReturnType<typeof useSales>;
}

// Tipos para los datos agregados
interface VentasPorProducto {
  producto: string;
  monto: number;
  color: string;
}

interface VentasPorOficina {
  oficina: string;
  entero: number;
  pad: number;
  larvas: number;
  total: number;
}

interface VentasPorTalla {
  talla: string;
  entero: number;
  pad: number;
  precioPromedio: number;
  ventasCount: number;
}

interface VentasPorUbicacion {
  ubicacion: string;
  oficina: string;
  entero: number;
  pad: number;
  total: number;
}

export function ReportesVentas({ salesHook }: ReportesVentasProps) {
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

  // Ventas por producto (para gráfico de pastel)
  const ventasPorProducto = useMemo(() => {
    const agrupados: Record<string, number> = {};

    ventasFiltradas.forEach(venta => {
      const producto = venta.tipoProducto || 'Sin tipo';
      // Normalizar nombres de productos
      const productoNormalizado = producto === 'Sin tipo' ? 'Entero' : producto;
      agrupados[productoNormalizado] = (agrupados[productoNormalizado] || 0) + venta.totalOrden;
    });

    const colores = ['#1f9a93', '#17a2b8', '#6f42c1'];
    return Object.entries(agrupados).map(([producto, monto], index) => ({
      producto,
      monto,
      color: colores[index % colores.length]
    }));
  }, [ventasFiltradas]);

  // Ventas por oficina
  const ventasPorOficina = useMemo(() => {
    const agrupados: Record<string, VentasPorOficina> = {};

    ventasFiltradas.forEach(venta => {
      const oficina = venta.oficina;
      if (!agrupados[oficina]) {
        agrupados[oficina] = {
          oficina,
          entero: 0,
          pad: 0,
          larvas: 0,
          total: 0
        };
      }

      const tipoProducto = venta.tipoProducto || 'Sin tipo';
      const productoNormalizado = tipoProducto === 'Sin tipo' ? 'Entero' : tipoProducto;

      if (productoNormalizado === "Entero") {
        agrupados[oficina].entero += venta.totalOrden;
      } else if (productoNormalizado === "PAD") {
        agrupados[oficina].pad += venta.totalOrden;
      } else if (productoNormalizado === "Larvas") {
        agrupados[oficina].larvas += venta.totalOrden;
      }

      agrupados[oficina].total += venta.totalOrden;
    });

    return Object.values(agrupados).sort((a, b) => b.total - a.total);
  }, [ventasFiltradas]);

  // Ventas por talla de camarón
  const ventasPorTalla = useMemo(() => {
    const agrupados: Record<string, VentasPorTalla> = {};

    ventasFiltradas.forEach(venta => {
      const talla = venta.tallaCamaron || "Sin Talla";
      if (!agrupados[talla]) {
        agrupados[talla] = {
          talla,
          entero: 0,
          pad: 0,
          precioPromedio: 0,
          ventasCount: 0
        };
      }

      const tipoProducto = venta.tipoProducto || 'Sin tipo';
      const productoNormalizado = tipoProducto === 'Sin tipo' ? 'Entero' : tipoProducto;

      if (productoNormalizado === "Entero") {
        agrupados[talla].entero += venta.totalOrden;
      } else if (productoNormalizado === "PAD") {
        agrupados[talla].pad += venta.totalOrden;
      }

      agrupados[talla].precioPromedio += venta.precioVenta;
      agrupados[talla].ventasCount += 1;
    });

    // Calcular precio promedio
    Object.values(agrupados).forEach(item => {
      if (item.ventasCount > 0) {
        item.precioPromedio = item.precioPromedio / item.ventasCount;
      }
    });

    return Object.values(agrupados).sort((a, b) => a.talla.localeCompare(b.talla));
  }, [ventasFiltradas]);

  // Ventas por región/mercado (usando regionMercado)
  const ventasPorRegion = useMemo(() => {
    const agrupados: Record<string, VentasPorUbicacion> = {};

    ventasFiltradas.forEach(venta => {
      const region = venta.regionMercado;
      const key = `${region}-${venta.oficina}`;

      if (!agrupados[key]) {
        agrupados[key] = {
          ubicacion: region,
          oficina: venta.oficina,
          entero: 0,
          pad: 0,
          total: 0
        };
      }

      const tipoProducto = venta.tipoProducto || 'Sin tipo';
      const productoNormalizado = tipoProducto === 'Sin tipo' ? 'Entero' : tipoProducto;

      if (productoNormalizado === "Entero") {
        agrupados[key].entero += venta.totalOrden;
      } else if (productoNormalizado === "PAD") {
        agrupados[key].pad += venta.totalOrden;
      }

      agrupados[key].total += venta.totalOrden;
    });

    return Object.values(agrupados).sort((a, b) => b.total - a.total);
  }, [ventasFiltradas]);

  // Datos para gráfico de barras de oficinas
  const datosGraficoOficinas = useMemo(() => {
    return ventasPorOficina.map(item => ({
      name: item.oficina,
      entero: item.entero,
      pad: item.pad,
      larvas: item.larvas,
      total: item.total
    }));
  }, [ventasPorOficina]);

  // Datos para gráfico de barras de tallas
  const datosGraficoTallas = useMemo(() => {
    return ventasPorTalla.map(item => ({
      name: item.talla,
      entero: item.entero,
      pad: item.pad,
      precio: item.precioPromedio
    }));
  }, [ventasPorTalla]);

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (num: number, decimals: number = 1) => {
    return num.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };


  const coloresGraficos = ['#1f9a93', '#17a2b8', '#6f42c1', '#e83e8c', '#fd7e14'];

  return (
    <div className="space-y-6 p-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes de Ventas</h1>
        <p className="text-sm text-gray-600">Análisis completo de ventas por productos, oficinas y mercados</p>
      </div>

      {/* Selector de Rango de Fechas */}
      <DateRangeSelector onDateRangeChange={handleDateRangeChange} />

      {/* Resumen estadístico */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-teal-50">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">
                {ventasFiltradas.length}
              </div>
              <div className="text-sm text-teal-800">Total Ventas</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(ventasFiltradas.reduce((sum, venta) => sum + venta.totalOrden, 0))}
              </div>
              <div className="text-sm text-blue-800">Monto Total</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(ventasFiltradas.reduce((sum, venta) => sum + venta.enteroKgs, 0))} kg
              </div>
              <div className="text-sm text-green-800">Total Kilos</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(ventasFiltradas.length > 0 ? ventasFiltradas.reduce((sum, venta) => sum + venta.totalOrden, 0) / ventasFiltradas.length : 0)}
              </div>
              <div className="text-sm text-orange-800">Precio Promedio</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolución de Ventas */}
      <EvolucionVentas salesHook={salesHook} dateRange={dateRange} />

      {/* Gráficos lado a lado - Medios de Pago y Tipos de Cliente */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MediosPago salesHook={salesHook} dateRange={dateRange} />
        <TiposCliente salesHook={salesHook} dateRange={dateRange} />
      </div>

      {/* Grid principal - Fila superior */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Ventas Totales por Producto - Tabla */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas Totales por Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ventasPorProducto.map((item) => (
                <div key={item.producto} className="flex justify-between items-center p-2 rounded"
                     style={{backgroundColor: `${item.color}15`}}>
                  <span className="font-medium" style={{color: item.color}}>{item.producto}</span>
                  <span className="font-semibold">{formatCurrency(item.monto)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between items-center font-bold">
                <span>Total general</span>
                <span>{formatCurrency(ventasPorProducto.reduce((sum, item) => sum + item.monto, 0))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ventas Totales por Producto - Gráfico Pastel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas Totales por Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ventasPorProducto}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="monto"
                    label={({producto, percent}) => `${producto} ${(percent * 100).toFixed(0)}%`}
                  >
                    {ventasPorProducto.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Monto']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Ventas Totales por Oficina - Gráfico de Barras */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas Totales por Oficina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGraficoOficinas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    labelFormatter={(label) => `Oficina: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="entero" name="Entero" fill="#1f9a93" />
                  <Bar dataKey="pad" name="PAD" fill="#17a2b8" />
                  <Bar dataKey="larvas" name="Larvas" fill="#6f42c1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fila intermedia */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Ventas por Oficina - Tabla detallada */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas Totales por Oficina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-600 text-white">
                    <th className="text-left p-2">Oficina</th>
                    <th className="text-right p-2">Entero</th>
                    <th className="text-right p-2">PAD</th>
                    <th className="text-right p-2">Larvas</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasPorOficina.map((item, index) => (
                    <tr key={item.oficina} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="p-2 font-medium">{item.oficina}</td>
                      <td className="p-2 text-right">{formatCurrency(item.entero)}</td>
                      <td className="p-2 text-right">{formatCurrency(item.pad)}</td>
                      <td className="p-2 text-right">{formatCurrency(item.larvas)}</td>
                      <td className="p-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-teal-600 text-white font-bold">
                    <td className="p-2">Total general</td>
                    <td className="p-2 text-right">{formatCurrency(ventasPorOficina.reduce((sum, item) => sum + item.entero, 0))}</td>
                    <td className="p-2 text-right">{formatCurrency(ventasPorOficina.reduce((sum, item) => sum + item.pad, 0))}</td>
                    <td className="p-2 text-right">{formatCurrency(ventasPorOficina.reduce((sum, item) => sum + item.larvas, 0))}</td>
                    <td className="p-2 text-right">{formatCurrency(ventasPorOficina.reduce((sum, item) => sum + item.total, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Ventas por Región/Mercado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas por Región de Mercado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-600 text-white">
                    <th className="text-left p-2">Ubicación</th>
                    <th className="text-left p-2">Oficina</th>
                    <th className="text-right p-2">Entero</th>
                    <th className="text-right p-2">PAD</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasPorRegion.slice(0, 8).map((item, index) => (
                    <tr key={`${item.ubicacion}-${item.oficina}`} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="p-2 font-medium">{item.ubicacion}</td>
                      <td className="p-2">{item.oficina}</td>
                      <td className="p-2 text-right">{formatCurrency(item.entero)}</td>
                      <td className="p-2 text-right">{formatCurrency(item.pad)}</td>
                      <td className="p-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fila inferior */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Precio Venta por Talla - Tabla */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Precio Venta por Talla & Presentación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-600 text-white">
                    <th className="text-left p-2">Talla</th>
                    <th className="text-right p-2">Entero</th>
                    <th className="text-right p-2">PAD</th>
                    <th className="text-right p-2">Precio Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasPorTalla.map((item, index) => (
                    <tr key={item.talla} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="p-2 font-medium">{item.talla}</td>
                      <td className="p-2 text-right">{formatCurrency(item.entero)}</td>
                      <td className="p-2 text-right">{formatCurrency(item.pad)}</td>
                      <td className="p-2 text-right font-semibold">{formatCurrency(item.precioPromedio)}</td>
                    </tr>
                  ))}
                  <tr className="bg-teal-600 text-white font-bold">
                    <td className="p-2">Total</td>
                    <td className="p-2 text-right">{formatCurrency(ventasPorTalla.reduce((sum, item) => sum + item.entero, 0))}</td>
                    <td className="p-2 text-right">{formatCurrency(ventasPorTalla.reduce((sum, item) => sum + item.pad, 0))}</td>
                    <td className="p-2 text-right">{formatCurrency(ventasPorTalla.reduce((sum, item) => sum + item.precioPromedio, 0) / ventasPorTalla.length)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Precio Venta por Talla - Gráfico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Precio Venta por Talla & Presentación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosGraficoTallas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'precio' ? formatCurrency(value) : formatCurrency(value),
                      name === 'precio' ? 'Precio Promedio' : name
                    ]}
                  />
                  <Bar dataKey="entero" name="Entero" fill="#1f9a93" />
                  <Bar dataKey="pad" name="PAD" fill="#17a2b8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}