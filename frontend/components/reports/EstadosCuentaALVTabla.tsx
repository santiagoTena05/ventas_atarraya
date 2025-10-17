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
import { CalendarIcon, UserIcon, FileTextIcon } from "lucide-react";

interface EstadosCuentaALVTablaProps {
  salesHook: ReturnType<typeof useSales>;
}

// Clientes ALV
const clientesALV = ["Jorge Gamboa", "Lamarca"].sort();

export function EstadosCuentaALVTabla({ salesHook }: EstadosCuentaALVTablaProps) {
  const { sales } = salesHook;
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");

  // Filtrar ventas del cliente seleccionado
  const ventasCliente = useMemo(() => {
    if (!clienteSeleccionado) return [];

    return sales
      .filter(venta => venta.cliente === clienteSeleccionado)
      .sort((a, b) => new Date(b.fechaEntrega).getTime() - new Date(a.fechaEntrega).getTime());
  }, [sales, clienteSeleccionado]);

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
      case 'enviado': return 'bg-green-100 text-green-800';
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

  // Simulación de tipo de cambio (en producción vendría de la base de datos)
  const tipoCambio = 18.50;

  return (
    <div className="space-y-6 p-6">
      {/* Encabezado */}
      <div className="text-center border-b border-blue-300 pb-4">
        <h1 className="text-2xl font-bold text-blue-600">Estados de Cuenta | clientes ALV</h1>
        <div className="flex justify-end">
          <span className="text-sm font-medium text-blue-600">📄 INDICE</span>
        </div>
      </div>

      {/* Selector de cliente */}
      <Card>
        <CardContent className="p-4">
          <div className="max-w-md">
            <Label htmlFor="cliente" className="text-sm font-medium text-gray-700">
              Seleccionar Cliente ALV
            </Label>
            <Select value={clienteSeleccionado} onValueChange={setClienteSeleccionado}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente..." />
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
          {/* Header del cliente */}
          <div className="bg-white border-b border-gray-200 pb-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-blue-600">Agua Blanca Seafoods</h2>
                <h3 className="text-lg font-semibold text-gray-900">Estado de Cuenta</h3>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  <div>Fecha Inicial: {periodo.inicio}</div>
                  <div>Fecha Final: {periodo.fin}</div>
                </div>
                <div className="mt-2">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">AGUA<br/>BLANCA</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-600 text-white">
              <h4 className="font-bold text-lg">{clienteSeleccionado}</h4>
            </div>
          </div>

          {/* Tabla estilo Excel ALV - Formato Amplio */}
          <div className="bg-white rounded-lg border overflow-hidden">
            {ventasCliente.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No se encontraron transacciones para este cliente
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: '2000px' }}>
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="border border-white text-left p-1 font-bold min-w-[60px]">Folio</th>
                      <th className="border border-white text-left p-1 font-bold min-w-[90px]">Fecha Entrega</th>
                      <th className="border border-white text-left p-1 font-bold min-w-[80px]">Producto</th>
                      <th className="border border-white text-right p-1 font-bold min-w-[100px]">Cantidad Entregada</th>
                      <th className="border border-white text-right p-1 font-bold min-w-[90px]">Tipo de Cambio</th>
                      <th className="border border-white text-right p-1 font-bold min-w-[90px]">Precio PL | usd</th>
                      <th className="border border-white text-right p-1 font-bold min-w-[90px]">Precio PL | mxn</th>
                      <th className="border border-white text-right p-1 font-bold min-w-[110px]">Precio Final PL | usd</th>
                      <th className="border border-white text-right p-1 font-bold min-w-[110px]">Precio Final PL | mxn</th>
                      <th className="border border-white text-right p-1 font-bold min-w-[120px]">Costo Servicio | mxn</th>
                      <th className="border border-white text-right p-1 font-bold min-w-[130px]">Costo Transporte | mxn</th>
                      <th className="border border-white text-right p-1 font-bold min-w-[120px]">Costo Adicional | mxn</th>
                      <th className="border border-white text-right p-1 font-bold min-w-[100px]">Total Orden | usd</th>
                      <th className="border border-white text-right p-1 font-bold min-w-[100px]">Total Orden | mxn</th>
                      <th className="border border-white text-left p-1 font-bold min-w-[110px]">Método de Pago</th>
                      <th className="border border-white text-left p-1 font-bold min-w-[100px]">Forma de Pago</th>
                      <th className="border border-white text-left p-1 font-bold min-w-[120px]">Estatus 1er. Pago</th>
                      <th className="border border-white text-left p-1 font-bold min-w-[100px]">Fecha 1er. Pago</th>
                      <th className="border border-white text-right p-1 font-bold min-w-[100px]">Monto 1er. Pago</th>
                      <th className="border border-white text-left p-1 font-bold min-w-[130px]">Folio 1era. Transferencia</th>
                      <th className="border border-white text-left p-1 font-bold min-w-[110px]">Estatus 2o. Pago</th>
                      <th className="border border-white text-left p-1 font-bold min-w-[100px]">Fecha 2o. Pago</th>
                      <th className="border border-white text-right p-1 font-bold min-w-[100px]">Monto 2o. Pago</th>
                      <th className="border border-white text-left p-1 font-bold min-w-[130px]">Folio 2a. Transferencia</th>
                      <th className="border border-white text-left p-1 font-bold min-w-[100px]">Tipo de Factura</th>
                      <th className="border border-white text-right p-1 font-bold min-w-[110px]">Monto a Facturar</th>
                      <th className="border border-white text-left p-1 font-bold min-w-[100px]">Estatus Factura</th>
                      <th className="border border-white text-left p-1 font-bold min-w-[100px]">No. Factura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasCliente.map((venta, index) => {
                      const precioUSD = venta.precioVenta / tipoCambio;
                      const costoServicio = venta.totalOrden * 0.05; // 5% simulado
                      const costoTransporte = venta.totalOrden * 0.03; // 3% simulado
                      const costoAdicional = 0; // Simulado
                      const totalUSD = venta.totalOrden / tipoCambio;

                      return (
                        <tr key={venta.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <td className="border border-gray-300 p-1 font-semibold">
                            {venta.folio}
                          </td>
                          <td className="border border-gray-300 p-1">
                            {formatDate(venta.fechaEntrega)}
                          </td>
                          <td className="border border-gray-300 p-1">
                            {venta.tipoProducto}
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            {venta.enteroKgs.toFixed(2)}
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            {tipoCambio.toFixed(2)}
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            ${precioUSD.toFixed(2)}
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            {formatCurrency(venta.precioVenta)}
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            ${precioUSD.toFixed(2)}
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            {formatCurrency(venta.precioVenta)}
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            {formatCurrency(costoServicio)}
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            {formatCurrency(costoTransporte)}
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            {formatCurrency(costoAdicional)}
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            ${totalUSD.toFixed(2)}
                          </td>
                          <td className="border border-gray-300 p-1 text-right font-semibold">
                            {formatCurrency(venta.totalOrden)}
                          </td>
                          <td className="border border-gray-300 p-1">
                            {venta.metodoPago}
                          </td>
                          <td className="border border-gray-300 p-1">
                            {venta.formaPago}
                          </td>
                          <td className="border border-gray-300 p-1">
                            <span className={`px-1 py-0.5 rounded text-xs ${getStatusColor(venta.estatusPagoCliente)}`}>
                              {venta.estatusPagoCliente}
                            </span>
                          </td>
                          <td className="border border-gray-300 p-1">
                            {formatDate(venta.fechaEntrega)}
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            {formatCurrency(venta.totalOrden * 0.5)} {/* 50% primer pago simulado */}
                          </td>
                          <td className="border border-gray-300 p-1">
                            {venta.folioTransferencia || "-"}
                          </td>
                          <td className="border border-gray-300 p-1">
                            <span className={`px-1 py-0.5 rounded text-xs ${getStatusColor('Pendiente')}`}>
                              Pendiente
                            </span>
                          </td>
                          <td className="border border-gray-300 p-1">
                            -
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            {formatCurrency(venta.totalOrden * 0.5)} {/* 50% segundo pago simulado */}
                          </td>
                          <td className="border border-gray-300 p-1">
                            -
                          </td>
                          <td className="border border-gray-300 p-1">
                            {venta.tipoFactura || "SI"}
                          </td>
                          <td className="border border-gray-300 p-1 text-right">
                            {formatCurrency(venta.totalOrden)}
                          </td>
                          <td className="border border-gray-300 p-1">
                            <span className={`px-1 py-0.5 rounded text-xs ${getStatusColor(venta.estatusFactura || 'Pendiente')}`}>
                              {venta.estatusFactura || 'Pendiente'}
                            </span>
                          </td>
                          <td className="border border-gray-300 p-1">
                            {venta.folioTransferencia || "-"}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Fila de totales */}
                    <tr className="bg-blue-600 text-white font-bold text-xs">
                      <td colSpan={12} className="border border-white p-1 text-right font-bold">
                        TOTAL:
                      </td>
                      <td className="border border-white p-1 text-right">
                        ${(ventasCliente.reduce((sum, v) => sum + v.totalOrden, 0) / tipoCambio).toFixed(2)}
                      </td>
                      <td className="border border-white p-1 text-right">
                        {formatCurrency(ventasCliente.reduce((sum, v) => sum + v.totalOrden, 0))}
                      </td>
                      <td colSpan={14} className="border border-white p-1"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}