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
        <h1 className="text-2xl font-bold text-gray-900">Resumen Cuentas II</h1>
        <p className="text-sm text-gray-600">por tipo de cliente</p>
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