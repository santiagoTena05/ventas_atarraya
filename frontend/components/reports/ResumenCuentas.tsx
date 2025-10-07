"use client";

import React, { useState, useMemo } from "react";
import { useSales } from "@/lib/hooks/useSales";
import { type VentaRegistrada } from "@/lib/dummy-sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [filtroAno, setFiltroAno] = useState<string>("todas");
  const [filtroMes, setFiltroMes] = useState<string>("todos");

  // Filtrar ventas por fecha
  const ventasFiltradas = useMemo(() => {
    return sales.filter(venta => {
      const fechaEntrega = new Date(venta.fechaEntrega);
      const ano = fechaEntrega.getFullYear().toString();
      const mes = (fechaEntrega.getMonth() + 1).toString();

      const cumpleAno = filtroAno === "todas" || ano === filtroAno;
      const cumpleMes = filtroMes === "todos" || mes === filtroMes;

      return cumpleAno && cumpleMes;
    });
  }, [sales, filtroAno, filtroMes]);

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

  const anos = [...new Set(sales.map(venta => new Date(venta.fechaEntrega).getFullYear().toString()))].sort();
  const meses = [
    { value: "1", label: "ENE" },
    { value: "2", label: "FEB" },
    { value: "3", label: "MAR" },
    { value: "4", label: "ABR" },
    { value: "5", label: "MAY" },
    { value: "6", label: "JUN" },
    { value: "7", label: "JUL" },
    { value: "8", label: "AGO" },
    { value: "9", label: "SEP" },
    { value: "10", label: "OCT" },
    { value: "11", label: "NOV" },
    { value: "12", label: "DIC" }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resumen Cuentas I</h1>
        <p className="text-sm text-gray-600">por responsable</p>
      </div>

      {/* Filtros de Fecha */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fecha Entrega</h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-2">
            <Label htmlFor="ano" className="text-sm font-medium text-gray-700">
              Año
            </Label>
            <Select value={filtroAno} onValueChange={setFiltroAno}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {anos.map(ano => (
                  <SelectItem key={ano} value={ano}>{ano}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-10 grid grid-cols-6 gap-1">
            {meses.map(mes => (
              <Button
                key={mes.value}
                variant={filtroMes === mes.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltroMes(filtroMes === mes.value ? "todos" : mes.value)}
                className={`text-xs ${
                  filtroMes === mes.value
                    ? "bg-teal-600 hover:bg-teal-700 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {mes.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

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