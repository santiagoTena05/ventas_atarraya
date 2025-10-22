"use client";

import React, { useState, useMemo } from "react";
import { useSales } from "@/lib/hooks/useSales";
import { DateRangeSelector } from "@/components/ui/date-range-selector";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

interface ResumenCuentas2Props {
  salesHook: ReturnType<typeof useSales>;
}

interface ResponsableData {
  nombre: string;
  cortesia: number;
  pagado: number;
  pendiente: number;
  total: number;
}

interface ClienteData {
  nombre: string;
  responsables: Record<string, ResponsableData>;
  cortesia: number;
  pagado: number;
  pendiente: number;
  total: number;
}

interface TipoClienteData {
  tipo: string;
  clientes: Record<string, ClienteData>;
  cortesia: number;
  pagado: number;
  pendiente: number;
  total: number;
}

export function ResumenCuentas2({ salesHook }: ResumenCuentas2Props) {
  const { sales } = salesHook;
  const [expandedTipos, setExpandedTipos] = useState<Record<string, boolean>>({});
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

  // Agrupar datos por tipo de cliente, cliente y responsable
  const datosAgrupados = useMemo(() => {
    const tipos: Record<string, TipoClienteData> = {};

    ventasFiltradas.forEach(venta => {
      const tipoCliente = venta.tipoCliente;
      const cliente = venta.cliente;
      const responsable = venta.responsable;

      if (!tipos[tipoCliente]) {
        tipos[tipoCliente] = {
          tipo: tipoCliente,
          clientes: {},
          cortesia: 0,
          pagado: 0,
          pendiente: 0,
          total: 0
        };
      }

      if (!tipos[tipoCliente].clientes[cliente]) {
        tipos[tipoCliente].clientes[cliente] = {
          nombre: cliente,
          responsables: {},
          cortesia: 0,
          pagado: 0,
          pendiente: 0,
          total: 0
        };
      }

      if (!tipos[tipoCliente].clientes[cliente].responsables[responsable]) {
        tipos[tipoCliente].clientes[cliente].responsables[responsable] = {
          nombre: responsable,
          cortesia: 0,
          pagado: 0,
          pendiente: 0,
          total: 0
        };
      }

      const monto = venta.totalOrden;

      // Clasificar según estatus de pago
      if (venta.estatusPagoCliente === "Cortesía") {
        tipos[tipoCliente].clientes[cliente].responsables[responsable].cortesia += monto;
        tipos[tipoCliente].clientes[cliente].cortesia += monto;
        tipos[tipoCliente].cortesia += monto;
      } else if (venta.estatusPagoCliente === "Pagado") {
        tipos[tipoCliente].clientes[cliente].responsables[responsable].pagado += monto;
        tipos[tipoCliente].clientes[cliente].pagado += monto;
        tipos[tipoCliente].pagado += monto;
      } else {
        tipos[tipoCliente].clientes[cliente].responsables[responsable].pendiente += monto;
        tipos[tipoCliente].clientes[cliente].pendiente += monto;
        tipos[tipoCliente].pendiente += monto;
      }

      tipos[tipoCliente].clientes[cliente].responsables[responsable].total += monto;
      tipos[tipoCliente].clientes[cliente].total += monto;
      tipos[tipoCliente].total += monto;
    });

    return Object.values(tipos).sort((a, b) => a.tipo.localeCompare(b.tipo));
  }, [ventasFiltradas]);

  // Calcular gran total
  const granTotal = useMemo(() => {
    return datosAgrupados.reduce((acc, tipo) => ({
      cortesia: acc.cortesia + tipo.cortesia,
      pagado: acc.pagado + tipo.pagado,
      pendiente: acc.pendiente + tipo.pendiente,
      total: acc.total + tipo.total
    }), { cortesia: 0, pagado: 0, pendiente: 0, total: 0 });
  }, [datosAgrupados]);

  // Calcular insights por tipo de cliente y clientes individuales
  const insights = useMemo(() => {
    if (datosAgrupados.length === 0) return null;

    // Cliente con más compras (monto total)
    let clienteMaxCompras = { nombre: '', total: 0, tipo: '' };
    datosAgrupados.forEach(tipo => {
      Object.values(tipo.clientes).forEach(cliente => {
        if (cliente.total > clienteMaxCompras.total) {
          clienteMaxCompras = { nombre: cliente.nombre, total: cliente.total, tipo: tipo.tipo };
        }
      });
    });

    // Cliente con más pendientes (monto pendiente)
    let clienteMaxPendientes = { nombre: '', pendiente: 0, tipo: '' };
    datosAgrupados.forEach(tipo => {
      Object.values(tipo.clientes).forEach(cliente => {
        if (cliente.pendiente > clienteMaxPendientes.pendiente) {
          clienteMaxPendientes = { nombre: cliente.nombre, pendiente: cliente.pendiente, tipo: tipo.tipo };
        }
      });
    });

    // Tipo de cliente con más ventas totales
    const tipoMaxVentas = datosAgrupados.reduce((max, curr) =>
      curr.total > max.total ? curr : max
    );

    // Tipo con más órdenes (cantidad de transacciones)
    const ordenesPorTipo = ventasFiltradas.reduce((acc, venta) => {
      acc[venta.tipoCliente] = (acc[venta.tipoCliente] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tipoMaxOrdenes = Object.entries(ordenesPorTipo).reduce(
      (max, [tipo, ordenes]) => ordenes > max.ordenes ? { tipo, ordenes } : max,
      { tipo: '', ordenes: 0 }
    );

    // Tipo más rentable (mayor % de pagados vs total)
    const tipoMasRentable = datosAgrupados
      .filter(tipo => tipo.total > 0)
      .reduce((max, curr) => {
        const rentabilidadActual = (curr.pagado / curr.total) * 100;
        const rentabilidadMax = (max.pagado / max.total) * 100;
        return rentabilidadActual > rentabilidadMax ? curr : max;
      });

    return {
      clienteMaxCompras,
      clienteMaxPendientes,
      tipoMaxVentas,
      tipoMaxOrdenes,
      tipoMasRentable
    };
  }, [datosAgrupados, ventasFiltradas]);

  const toggleTipo = (tipo: string) => {
    setExpandedTipos(prev => ({
      ...prev,
      [tipo]: !prev[tipo]
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
        <h1 className="text-2xl font-bold text-gray-900">Resumen Cuentas II</h1>
        <p className="text-sm text-gray-600">por tipo de cliente</p>
      </div>

      {/* Filtros de Fecha */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Periodo de Análisis</h3>
        <DateRangeSelector onDateRangeChange={handleDateRangeChange} />
      </div>

      {/* Insights por Tipo de Cliente */}
      {insights && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights por Tipo de Cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Cliente con más compras */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <h4 className="text-sm font-medium text-purple-800">Cliente Top</h4>
              </div>
              <p className="text-lg font-bold text-purple-900">{insights.clienteMaxCompras.nombre}</p>
              <p className="text-sm text-purple-700">{formatCurrency(insights.clienteMaxCompras.total)}</p>
              <p className="text-xs text-purple-600">{insights.clienteMaxCompras.tipo}</p>
            </div>

            {/* Cliente con más pendientes */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <h4 className="text-sm font-medium text-red-800">Más Pendientes</h4>
              </div>
              <p className="text-lg font-bold text-red-900">{insights.clienteMaxPendientes.nombre}</p>
              <p className="text-sm text-red-700">{formatCurrency(insights.clienteMaxPendientes.pendiente)}</p>
              <p className="text-xs text-red-600">{insights.clienteMaxPendientes.tipo}</p>
            </div>

            {/* Tipo de cliente con más ventas totales */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <h4 className="text-sm font-medium text-yellow-800">Tipo Top Ventas</h4>
              </div>
              <p className="text-lg font-bold text-yellow-900">{insights.tipoMaxVentas.tipo}</p>
              <p className="text-sm text-yellow-700">{formatCurrency(insights.tipoMaxVentas.total)}</p>
            </div>

            {/* Tipo con más órdenes */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <h4 className="text-sm font-medium text-blue-800">Más Órdenes</h4>
              </div>
              <p className="text-lg font-bold text-blue-900">{insights.tipoMaxOrdenes.tipo}</p>
              <p className="text-sm text-blue-700">{insights.tipoMaxOrdenes.ordenes} órdenes</p>
            </div>

            {/* Tipo más rentable */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <h4 className="text-sm font-medium text-green-800">Más Rentable</h4>
              </div>
              <p className="text-lg font-bold text-green-900">{insights.tipoMasRentable.tipo}</p>
              <p className="text-sm text-green-700">
                {((insights.tipoMasRentable.pagado / insights.tipoMasRentable.total) * 100).toFixed(1)}% cobrado
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
            const allExpanded = Object.keys(expandedTipos).length === datosAgrupados.length;
            const newState: Record<string, boolean> = {};
            if (!allExpanded) {
              datosAgrupados.forEach(tipo => {
                newState[tipo.tipo] = true;
              });
            }
            setExpandedTipos(newState);
          }}
          className="text-xs"
        >
          Tipo Cliente Expandir ↓
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newState: Record<string, boolean> = {};
            datosAgrupados.forEach(tipo => {
              Object.keys(tipo.clientes).forEach(cliente => {
                const key = `${tipo.tipo}-${cliente}`;
                newState[key] = true;
              });
            });
            setExpandedClientes(newState);
          }}
          className="text-xs"
        >
          Cliente Expandir ↓
        </Button>
      </div>

      {/* Tabla de Datos */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-teal-600 text-white">
                <th className="text-left p-3 font-medium">Tipo de Cliente</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Responsable</th>
                <th className="text-right p-3 font-medium">Cortesía</th>
                <th className="text-right p-3 font-medium">Pagado</th>
                <th className="text-right p-3 font-medium">Pendiente</th>
                <th className="text-right p-3 font-medium">Total general</th>
              </tr>
            </thead>
            <tbody>
              {datosAgrupados.map((tipo) => (
                <React.Fragment key={tipo.tipo}>
                  {/* Fila del Tipo de Cliente */}
                  <tr className="bg-teal-600 text-white cursor-pointer hover:bg-teal-700"
                      onClick={() => toggleTipo(tipo.tipo)}>
                    <td className="p-3 font-medium flex items-center">
                      {expandedTipos[tipo.tipo] ?
                        <ChevronDownIcon className="w-4 h-4 mr-2" /> :
                        <ChevronRightIcon className="w-4 h-4 mr-2" />
                      }
                      {tipo.tipo}
                    </td>
                    <td className="p-3"></td>
                    <td className="p-3"></td>
                    <td className="p-3 text-right font-medium">{formatCurrency(tipo.cortesia)}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(tipo.pagado)}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(tipo.pendiente)}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(tipo.total)}</td>
                  </tr>

                  {/* Filas de Clientes (expandidas) */}
                  {expandedTipos[tipo.tipo] && Object.values(tipo.clientes).map((cliente) => (
                    <React.Fragment key={`${tipo.tipo}-${cliente.nombre}`}>
                      {/* Fila del Cliente */}
                      <tr
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleCliente(`${tipo.tipo}-${cliente.nombre}`)}
                      >
                        <td className="p-3 pl-8"></td>
                        <td className="p-3 font-medium text-gray-700 flex items-center">
                          {expandedClientes[`${tipo.tipo}-${cliente.nombre}`] ?
                            <ChevronDownIcon className="w-4 h-4 mr-2" /> :
                            <ChevronRightIcon className="w-4 h-4 mr-2" />
                          }
                          {cliente.nombre}
                        </td>
                        <td className="p-3"></td>
                        <td className="p-3 text-right">{formatCurrency(cliente.cortesia)}</td>
                        <td className="p-3 text-right">{formatCurrency(cliente.pagado)}</td>
                        <td className="p-3 text-right">{formatCurrency(cliente.pendiente)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(cliente.total)}</td>
                      </tr>

                      {/* Filas de Responsables (expandidas) */}
                      {expandedClientes[`${tipo.tipo}-${cliente.nombre}`] && Object.values(cliente.responsables).map((responsable) => (
                        <tr key={`${tipo.tipo}-${cliente.nombre}-${responsable.nombre}`} className="border-b hover:bg-gray-50">
                          <td className="p-3 pl-16"></td>
                          <td className="p-3 pl-8"></td>
                          <td className="p-3 text-gray-700">{responsable.nombre}</td>
                          <td className="p-3 text-right">{formatCurrency(responsable.cortesia)}</td>
                          <td className="p-3 text-right">{formatCurrency(responsable.pagado)}</td>
                          <td className="p-3 text-right">{formatCurrency(responsable.pendiente)}</td>
                          <td className="p-3 text-right">{formatCurrency(responsable.total)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}

              {/* Total general */}
              <tr className="bg-teal-600 text-white font-bold">
                <td className="p-3">Total general</td>
                <td className="p-3"></td>
                <td className="p-3"></td>
                <td className="p-3 text-right">{formatCurrency(granTotal.cortesia)}</td>
                <td className="p-3 text-right">{formatCurrency(granTotal.pagado)}</td>
                <td className="p-3 text-right">{formatCurrency(granTotal.pendiente)}</td>
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