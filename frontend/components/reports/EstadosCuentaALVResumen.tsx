"use client";

import React, { useState, useMemo } from "react";
import { useSales } from "@/lib/hooks/useSales";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, UserIcon, FileTextIcon, DollarSign } from "lucide-react";

interface EstadosCuentaALVResumenProps {
  salesHook: ReturnType<typeof useSales>;
}

// Clientes ALV
const clientesALV = ["Jorge Gamboa", "Lamarca"].sort();

export function EstadosCuentaALVResumen({ salesHook }: EstadosCuentaALVResumenProps) {
  const { sales } = salesHook;
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");

  // Filtrar ventas del cliente seleccionado
  const ventasCliente = useMemo(() => {
    if (!clienteSeleccionado) return [];

    return sales
      .filter(venta => venta.cliente === clienteSeleccionado)
      .sort((a, b) => new Date(b.fechaEntrega).getTime() - new Date(a.fechaEntrega).getTime());
  }, [sales, clienteSeleccionado]);

  // Calcular totales con conversión USD
  const tipoCambio = 18.50;
  const totales = useMemo(() => {
    if (ventasCliente.length === 0) return {
      totalVentasMXN: 0,
      totalVentasUSD: 0,
      totalKgs: 0,
      promedioPrecioMXN: 0,
      promedioPrecioUSD: 0,
      costosTotales: 0
    };

    const totalVentasMXN = ventasCliente.reduce((sum, venta) => sum + venta.totalOrden, 0);
    const totalVentasUSD = totalVentasMXN / tipoCambio;
    const totalKgs = ventasCliente.reduce((sum, venta) => sum + venta.enteroKgs, 0);
    const promedioPrecioMXN = totalKgs > 0 ? totalVentasMXN / totalKgs : 0;
    const promedioPrecioUSD = promedioPrecioMXN / tipoCambio;
    const costosTotales = totalVentasMXN * 0.08; // 8% costos simulados

    return {
      totalVentasMXN,
      totalVentasUSD,
      totalKgs,
      promedioPrecioMXN,
      promedioPrecioUSD,
      costosTotales
    };
  }, [ventasCliente]);

  // Período de fechas
  const periodo = useMemo(() => {
    if (ventasCliente.length === 0) return { inicio: "", fin: "" };

    const fechas = ventasCliente.map(v => new Date(v.fechaEntrega));
    const fechaMin = new Date(Math.min(...fechas.map(f => f.getTime())));
    const fechaMax = new Date(Math.max(...fechas.map(f => f.getTime())));

    return {
      inicio: fechaMin.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }),
      fin: fechaMax.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })
    };
  }, [ventasCliente]);

  // Función para obtener color del status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pagado': return 'bg-green-100 text-green-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'cortesía': case 'cortesia': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatUSD = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Encabezado */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Agua Blanca Seafoods</h1>
        <h2 className="text-xl font-semibold text-blue-600 mt-2">Estado de Cuenta ALV</h2>
        <div className="w-24 h-1 bg-blue-600 mx-auto mt-4"></div>
      </div>

      {/* Selector de cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Selección de Cliente ALV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Label htmlFor="cliente" className="text-sm font-medium text-gray-700">
              Cliente
            </Label>
            <Select value={clienteSeleccionado} onValueChange={setClienteSeleccionado}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente ALV..." />
              </SelectTrigger>
              <SelectContent>
                {clientesALV.map((cliente) => (
                  <SelectItem key={cliente} value={cliente}>
                    {cliente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {clienteSeleccionado && (
        <>
          {/* Información del cliente */}
          <Card className="bg-blue-50">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-blue-800">{clienteSeleccionado}</h3>
                  <p className="text-sm text-blue-600 mt-1">Cliente ALV - Exportación</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-blue-600">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Fecha Inicial: {periodo.inicio}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Fecha Final: {periodo.fin}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">ALV</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de totales ALV */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-xl font-bold text-gray-900">
                    {formatCurrency(totales.totalVentasMXN)}
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatUSD(totales.totalVentasUSD)}
                  </div>
                  <div className="text-sm text-gray-600">Total Ventas</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {ventasCliente.length}
                  </div>
                  <div className="text-sm text-gray-600">Transacciones</div>
                  <div className="text-xs text-blue-600 mt-1">
                    TC: ${tipoCambio} MXN/USD
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {totales.totalKgs.toFixed(1)} kg
                  </div>
                  <div className="text-sm text-gray-600">Total Kilos</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(totales.promedioPrecioMXN)}
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    {formatUSD(totales.promedioPrecioUSD)}
                  </div>
                  <div className="text-sm text-gray-600">Precio Promedio/kg</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Análisis financiero ALV */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Análisis Financiero</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span className="font-medium">Ingresos Totales (MXN)</span>
                    <span className="font-bold text-green-600">{formatCurrency(totales.totalVentasMXN)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="font-medium">Ingresos Totales (USD)</span>
                    <span className="font-bold text-blue-600">{formatUSD(totales.totalVentasUSD)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                    <span className="font-medium">Costos Estimados</span>
                    <span className="font-bold text-red-600">{formatCurrency(totales.costosTotales)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-100 rounded font-bold">
                    <span>Margen Neto Estimado</span>
                    <span className="text-gray-800">{formatCurrency(totales.totalVentasMXN - totales.costosTotales)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribución por Estatus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    ventasCliente.reduce((acc, venta) => {
                      acc[venta.estatusPagoCliente] = (acc[venta.estatusPagoCliente] || 0) + venta.totalOrden;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([estatus, total]) => (
                    <div key={estatus} className="flex justify-between items-center p-3 rounded"
                         style={{backgroundColor: getStatusColor(estatus).includes('green') ? '#f0fdf4' :
                                                 getStatusColor(estatus).includes('yellow') ? '#fffbeb' : '#eff6ff'}}>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getStatusColor(estatus)}`}>
                          {estatus}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(total)}</div>
                        <div className="text-sm text-gray-600">{formatUSD(total / tipoCambio)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla compacta de transacciones recientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon className="h-5 w-5" />
                Transacciones Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ventasCliente.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron transacciones para este cliente
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="text-left p-3 font-medium">Folio</th>
                        <th className="text-left p-3 font-medium">Fecha</th>
                        <th className="text-left p-3 font-medium">Producto</th>
                        <th className="text-right p-3 font-medium">Cantidad</th>
                        <th className="text-right p-3 font-medium">Total MXN</th>
                        <th className="text-right p-3 font-medium">Total USD</th>
                        <th className="text-left p-3 font-medium">Estatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasCliente.slice(0, 10).map((venta, index) => (
                        <tr key={venta.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <td className="p-3 font-medium">#{venta.folio.toString().padStart(4, '0')}</td>
                          <td className="p-3">{formatDate(venta.fechaEntrega)}</td>
                          <td className="p-3">{venta.tipoProducto}</td>
                          <td className="p-3 text-right">{venta.enteroKgs.toFixed(1)} kg</td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(venta.totalOrden)}</td>
                          <td className="p-3 text-right font-semibold text-blue-600">{formatUSD(venta.totalOrden / tipoCambio)}</td>
                          <td className="p-3">
                            <Badge className={`text-xs ${getStatusColor(venta.estatusPagoCliente)}`}>
                              {venta.estatusPagoCliente}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}