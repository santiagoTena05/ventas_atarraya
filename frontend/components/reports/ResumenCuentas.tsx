"use client";

import React, { useState, useMemo } from "react";
import { useSales } from "@/lib/hooks/useSales";
import { type VentaRegistrada } from "@/lib/hooks/useSales";
import { DateRangeSelector } from "@/components/ui/date-range-selector";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

interface ResumenCuentasProps {
  salesHook: ReturnType<typeof useSales>;
}

interface ClienteIndividual {
  nombre: string;
  cortesia: number;
  pagado: number;
  pendiente: number;
  total: number;
}

interface ClienteData {
  tipo: string;
  clientes: Record<string, ClienteIndividual>;
  cortesia: number;
  pagado: number;
  pendiente: number;
  total: number;
}

interface ResponsableData {
  nombre: string;
  tipos: Record<string, ClienteData>;
  totales: {
    cortesia: number;
    pagado: number;
    pendiente: number;
    total: number;
  };
}

export function ResumenCuentas({ salesHook }: ResumenCuentasProps) {
  const { sales } = salesHook;
  const [expandedResponsables, setExpandedResponsables] = useState<Record<string, boolean>>({});
  const [expandedClientes, setExpandedClientes] = useState<Record<string, boolean>>({});
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

  // Agrupar datos por responsable, tipo de cliente y cliente individual
  const datosAgrupados = useMemo(() => {
    const responsables: Record<string, ResponsableData> = {};

    ventasFiltradas.forEach(venta => {
      const responsable = venta.responsable;
      const tipoCliente = venta.tipoCliente;
      const cliente = venta.cliente;

      if (!responsables[responsable]) {
        responsables[responsable] = {
          nombre: responsable,
          tipos: {},
          totales: { cortesia: 0, pagado: 0, pendiente: 0, total: 0 }
        };
      }

      if (!responsables[responsable].tipos[tipoCliente]) {
        responsables[responsable].tipos[tipoCliente] = {
          tipo: tipoCliente,
          clientes: {},
          cortesia: 0,
          pagado: 0,
          pendiente: 0,
          total: 0
        };
      }

      if (!responsables[responsable].tipos[tipoCliente].clientes[cliente]) {
        responsables[responsable].tipos[tipoCliente].clientes[cliente] = {
          nombre: cliente,
          cortesia: 0,
          pagado: 0,
          pendiente: 0,
          total: 0
        };
      }

      const monto = venta.totalOrden;

      // Clasificar según estatus de pago
      if (venta.estatusPagoCliente === "Cortesía") {
        responsables[responsable].tipos[tipoCliente].clientes[cliente].cortesia += monto;
        responsables[responsable].tipos[tipoCliente].cortesia += monto;
        responsables[responsable].totales.cortesia += monto;
      } else if (venta.estatusPagoCliente === "Pagado") {
        responsables[responsable].tipos[tipoCliente].clientes[cliente].pagado += monto;
        responsables[responsable].tipos[tipoCliente].pagado += monto;
        responsables[responsable].totales.pagado += monto;
      } else {
        responsables[responsable].tipos[tipoCliente].clientes[cliente].pendiente += monto;
        responsables[responsable].tipos[tipoCliente].pendiente += monto;
        responsables[responsable].totales.pendiente += monto;
      }

      responsables[responsable].tipos[tipoCliente].clientes[cliente].total += monto;
      responsables[responsable].tipos[tipoCliente].total += monto;
      responsables[responsable].totales.total += monto;
    });

    return Object.values(responsables).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [ventasFiltradas]);

  // Calcular gran total
  const granTotal = useMemo(() => {
    return datosAgrupados.reduce((acc, responsable) => ({
      cortesia: acc.cortesia + responsable.totales.cortesia,
      pagado: acc.pagado + responsable.totales.pagado,
      pendiente: acc.pendiente + responsable.totales.pendiente,
      total: acc.total + responsable.totales.total
    }), { cortesia: 0, pagado: 0, pendiente: 0, total: 0 });
  }, [datosAgrupados]);

  // Calcular insights de responsables
  const insights = useMemo(() => {
    if (datosAgrupados.length === 0) return null;

    // 🏆 Responsable con más ventas totales (por monto)
    const maxVentas = datosAgrupados.reduce((max, curr) =>
      curr.totales.total > max.totales.total ? curr : max
    );

    // 📈 Responsable con más órdenes (por cantidad)
    const ordenesPorResponsable = ventasFiltradas.reduce((acc, venta) => {
      acc[venta.responsable] = (acc[venta.responsable] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxOrdenes = Object.entries(ordenesPorResponsable).reduce(
      (max, [nombre, ordenes]) => ordenes > max.ordenes ? { nombre, ordenes } : max,
      { nombre: '', ordenes: 0 }
    );

    // 🎯 Responsable más eficiente (mayor % de pagados vs total)
    const masEficiente = datosAgrupados
      .filter(resp => resp.totales.total > 0)
      .reduce((max, curr) => {
        const eficienciaActual = (curr.totales.pagado / curr.totales.total) * 100;
        const eficienciaMax = (max.totales.pagado / max.totales.total) * 100;
        return eficienciaActual > eficienciaMax ? curr : max;
      });

    // ⚠️ Responsable con más pendientes de pago (monto)
    const maxPendientes = datosAgrupados.reduce((max, curr) =>
      curr.totales.pendiente > max.totales.pendiente ? curr : max
    );

    // 🔴 Responsable con mayor % de pendientes
    const mayorPorcentajePendientes = datosAgrupados
      .filter(resp => resp.totales.total > 0)
      .reduce((max, curr) => {
        const porcentajeActual = (curr.totales.pendiente / curr.totales.total) * 100;
        const porcentajeMax = (max.totales.pendiente / max.totales.total) * 100;
        return porcentajeActual > porcentajeMax ? curr : max;
      });

    return {
      maxVentas,
      maxOrdenes,
      masEficiente,
      maxPendientes,
      mayorPorcentajePendientes
    };
  }, [datosAgrupados, ventasFiltradas]);

  const toggleResponsable = (responsable: string) => {
    setExpandedResponsables(prev => ({
      ...prev,
      [responsable]: !prev[responsable]
    }));
  };

  const toggleCliente = (key: string) => {
    setExpandedClientes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };


  return (
    <div className="space-y-6 p-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resumen Cuentas I</h1>
        <p className="text-sm text-gray-600">por responsable</p>
      </div>

      {/* Filtros de Fecha */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Periodo de Análisis</h3>
        <DateRangeSelector onDateRangeChange={handleDateRangeChange} />
      </div>

      {/* Insights de Responsables */}
      {insights && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights por Responsable</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Responsable con más ventas totales */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <h4 className="text-sm font-medium text-yellow-800">Más Ventas</h4>
              </div>
              <p className="text-lg font-bold text-yellow-900">{insights.maxVentas.nombre}</p>
              <p className="text-sm text-yellow-700">{formatCurrency(insights.maxVentas.totales.total)}</p>
            </div>

            {/* Responsable con más órdenes */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <h4 className="text-sm font-medium text-blue-800">Más Órdenes</h4>
              </div>
              <p className="text-lg font-bold text-blue-900">{insights.maxOrdenes.nombre}</p>
              <p className="text-sm text-blue-700">{insights.maxOrdenes.ordenes} órdenes</p>
            </div>

            {/* Responsable más eficiente */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <h4 className="text-sm font-medium text-green-800">Más Eficiente</h4>
              </div>
              <p className="text-lg font-bold text-green-900">{insights.masEficiente.nombre}</p>
              <p className="text-sm text-green-700">
                {((insights.masEficiente.totales.pagado / insights.masEficiente.totales.total) * 100).toFixed(1)}% cobrado
              </p>
            </div>

            {/* Responsable con más pendientes de pago */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <h4 className="text-sm font-medium text-orange-800">Más Pendientes</h4>
              </div>
              <p className="text-lg font-bold text-orange-900">{insights.maxPendientes.nombre}</p>
              <p className="text-sm text-orange-700">{formatCurrency(insights.maxPendientes.totales.pendiente)}</p>
            </div>

            {/* Responsable con mayor % de pendientes */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <h4 className="text-sm font-medium text-red-800">Mayor % Pendiente</h4>
              </div>
              <p className="text-lg font-bold text-red-900">{insights.mayorPorcentajePendientes.nombre}</p>
              <p className="text-sm text-red-700">
                {((insights.mayorPorcentajePendientes.totales.pendiente / insights.mayorPorcentajePendientes.totales.total) * 100).toFixed(1)}% pendiente
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controles de Expansión */}
      <div className="flex gap-2">
        <div className="bg-teal-600 text-white px-3 py-1 rounded text-sm">
          Estatus Pago | Cliente ↓
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const allExpanded = Object.keys(expandedResponsables).length === datosAgrupados.length;
            const newState: Record<string, boolean> = {};
            if (!allExpanded) {
              datosAgrupados.forEach(resp => {
                newState[resp.nombre] = true;
              });
            }
            setExpandedResponsables(newState);
          }}
          className="text-xs"
        >
          Responsable Expandir ↓
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newState: Record<string, boolean> = {};
            datosAgrupados.forEach(resp => {
              Object.keys(resp.tipos).forEach(tipo => {
                const key = `${resp.nombre}-${tipo}`;
                newState[key] = true;
              });
            });
            setExpandedClientes(newState);
          }}
          className="text-xs"
        >
          Tipo Cliente Expandir ↓
        </Button>
      </div>

      {/* Tabla de Datos */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-teal-600 text-white">
                <th className="text-left p-3 font-medium">Responsable</th>
                <th className="text-left p-3 font-medium">Tipo de Cliente</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-right p-3 font-medium">Cortesía</th>
                <th className="text-right p-3 font-medium">Pagado</th>
                <th className="text-right p-3 font-medium">Pendiente</th>
                <th className="text-right p-3 font-medium">% Ventas</th>
                <th className="text-right p-3 font-medium">Grand Total</th>
              </tr>
            </thead>
            <tbody>
              {datosAgrupados.map((responsable) => (
                <React.Fragment key={responsable.nombre}>
                  {/* Fila del Responsable */}
                  <tr className="bg-teal-600 text-white cursor-pointer hover:bg-teal-700"
                      onClick={() => toggleResponsable(responsable.nombre)}>
                    <td className="p-3 font-medium flex items-center">
                      {expandedResponsables[responsable.nombre] ?
                        <ChevronDownIcon className="w-4 h-4 mr-2" /> :
                        <ChevronRightIcon className="w-4 h-4 mr-2" />
                      }
                      {responsable.nombre}
                    </td>
                    <td className="p-3"></td>
                    <td className="p-3"></td>
                    <td className="p-3 text-right font-medium">{formatCurrency(responsable.totales.cortesia)}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(responsable.totales.pagado)}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(responsable.totales.pendiente)}</td>
                    <td className="p-3 text-right font-medium">
                      {granTotal.total > 0 ? ((responsable.totales.total / granTotal.total) * 100).toFixed(1) : '0.0'}%
                    </td>
                    <td className="p-3 text-right font-medium">{formatCurrency(responsable.totales.total)}</td>
                  </tr>

                  {/* Filas de Tipos de Cliente (expandidas) */}
                  {expandedResponsables[responsable.nombre] && Object.values(responsable.tipos).map((tipoData) => (
                    <React.Fragment key={`${responsable.nombre}-${tipoData.tipo}`}>
                      {/* Fila del Tipo de Cliente */}
                      <tr
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleCliente(`${responsable.nombre}-${tipoData.tipo}`)}
                      >
                        <td className="p-3 pl-8"></td>
                        <td className="p-3 font-medium text-gray-700 flex items-center">
                          {expandedClientes[`${responsable.nombre}-${tipoData.tipo}`] ?
                            <ChevronDownIcon className="w-4 h-4 mr-2" /> :
                            <ChevronRightIcon className="w-4 h-4 mr-2" />
                          }
                          {tipoData.tipo}
                        </td>
                        <td className="p-3"></td>
                        <td className="p-3 text-right">{formatCurrency(tipoData.cortesia)}</td>
                        <td className="p-3 text-right">{formatCurrency(tipoData.pagado)}</td>
                        <td className="p-3 text-right">{formatCurrency(tipoData.pendiente)}</td>
                        <td className="p-3 text-right">
                          {responsable.totales.total > 0 ? ((tipoData.total / responsable.totales.total) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className="p-3 text-right font-medium">{formatCurrency(tipoData.total)}</td>
                      </tr>

                      {/* Filas de Clientes Individuales (expandidas) */}
                      {expandedClientes[`${responsable.nombre}-${tipoData.tipo}`] && Object.values(tipoData.clientes).map((cliente) => (
                        <tr key={`${responsable.nombre}-${tipoData.tipo}-${cliente.nombre}`} className="border-b hover:bg-gray-50">
                          <td className="p-3 pl-16"></td>
                          <td className="p-3 pl-8"></td>
                          <td className="p-3 text-gray-700">{cliente.nombre}</td>
                          <td className="p-3 text-right">{formatCurrency(cliente.cortesia)}</td>
                          <td className="p-3 text-right">{formatCurrency(cliente.pagado)}</td>
                          <td className="p-3 text-right">{formatCurrency(cliente.pendiente)}</td>
                          <td className="p-3 text-right text-gray-500">
                            {tipoData.total > 0 ? ((cliente.total / tipoData.total) * 100).toFixed(1) : '0.0'}%
                          </td>
                          <td className="p-3 text-right">{formatCurrency(cliente.total)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}

              {/* Grand Total */}
              <tr className="bg-teal-600 text-white font-bold">
                <td className="p-3">Grand Total</td>
                <td className="p-3"></td>
                <td className="p-3"></td>
                <td className="p-3 text-right">{formatCurrency(granTotal.cortesia)}</td>
                <td className="p-3 text-right">{formatCurrency(granTotal.pagado)}</td>
                <td className="p-3 text-right">{formatCurrency(granTotal.pendiente)}</td>
                <td className="p-3 text-right">100.0%</td>
                <td className="p-3 text-right">{formatCurrency(granTotal.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota */}
      <div className="text-sm text-blue-600">
        <span className="font-medium">Nota |</span>
        {` Total registros: ${ventasFiltradas.length} | Pendientes: ${ventasFiltradas.filter(v => v.estatusPagoCliente === "Pendiente").length}, Pagados: ${ventasFiltradas.filter(v => v.estatusPagoCliente === "Pagado").length}, Cortesía: ${ventasFiltradas.filter(v => v.estatusPagoCliente === "Cortesía").length}`}
      </div>
    </div>
  );
}