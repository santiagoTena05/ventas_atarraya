"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import type { CosechaAsignada, ProyeccionInventario } from '@/hooks/useEstrategiaComercialData';

interface EstrategiaComercialTableProps {
  tallas: string[];
  weekDates: string[];
  getCellColor: (fecha: string, talla: string) => 'blue' | 'yellow' | 'red';
  getTotalVentasForCell: (fecha: string, talla: string) => number;
  getProyeccionForCell: (fecha: string, talla: string) => ProyeccionInventario | undefined;
  getCosechasForCell: (fecha: string, talla: string) => CosechaAsignada[];
  getGlobalRegisteredSalesForCell?: (fecha: string, talla: string) => { totalKg: number; sales: any[] };
  getAvailableInventoryForCell?: (fecha: string, talla: string) => number;
  onCellClick: (fecha: string, talla: string) => void;
}

export function EstrategiaComercialTable({
  tallas,
  weekDates,
  getCellColor,
  getTotalVentasForCell,
  getProyeccionForCell,
  getCosechasForCell,
  getGlobalRegisteredSalesForCell,
  getAvailableInventoryForCell,
  onCellClick
}: EstrategiaComercialTableProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    }).replace(/ /g, '-'); // Convierte "09 Dec 25" a "09-Dec-25"
  };

  // Calcular ancho mínimo necesario
  const minTableWidth = Math.max(1200, (weekDates.length * 120) + 100); // 120px por columna + 100px para tallas
  const columnWidth = `${Math.max(120, (100 - 8) / weekDates.length)}px`; // Mínimo 120px por columna

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm" style={{minWidth: `${minTableWidth}px`}}>
        {/* Header */}
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 bg-gray-50 z-10 p-4 text-left border-r font-medium" style={{width: '100px'}}>
              Tallas
            </th>
            {weekDates.map((date, index) => (
              <th key={date} className="p-2 border-r text-center" style={{width: columnWidth}}>
                <div className="space-y-2">
                  <div className="font-medium text-sm whitespace-nowrap">{formatDate(date)}</div>
                  <div className="flex border-t pt-1">
                    <div className="flex-1 text-center text-xs text-gray-600 px-1 border-r border-gray-300">
                      <div className="leading-tight">Ventas<br/>Proyectadas</div>
                    </div>
                    <div className="flex-1 text-center text-xs text-gray-600 px-1">
                      <div className="leading-tight">Inventario<br/>Neto</div>
                    </div>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {tallas.map((talla) => (
            <tr key={talla} className="border-b hover:bg-gray-50/50">
              <td className="sticky left-0 bg-white z-10 p-4 border-r font-medium text-center">
                {talla}
              </td>
              {weekDates.map((date) => {
                const color = getCellColor(date, talla);
                const totalVentas = getTotalVentasForCell(date, talla);
                const proyeccion = getProyeccionForCell(date, talla);
                const cosechas = getCosechasForCell(date, talla);
                const globalRegisteredSales = getGlobalRegisteredSalesForCell?.(date, talla);

                const colorClasses = {
                  blue: 'bg-blue-100 hover:bg-blue-200 border-blue-200',
                  yellow: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-200',
                  red: 'bg-red-100 hover:bg-red-200 border-red-200'
                };

                return (
                  <td
                    key={`${talla}-${date}`}
                    className={cn(
                      'p-2 border-r cursor-pointer transition-colors',
                      colorClasses[color]
                    )}
                    onClick={() => onCellClick(date, talla)}
                  >
                    <div className="h-full min-h-[60px] flex">
                      {/* Ventas Proyectadas */}
                      <div className="flex-1 flex flex-col items-center justify-center border-r border-gray-300 space-y-1">
                        {/* Own planned sales */}
                        {totalVentas > 0 && (
                          <div className={cn(
                            "text-xs px-2 py-1 rounded text-white font-medium",
                            color === 'red' ? 'bg-red-600' : color === 'yellow' ? 'bg-orange-600' : 'bg-blue-600'
                          )}>
                            {totalVentas}
                          </div>
                        )}

                        {/* Global registered sales from other versions */}
                        {globalRegisteredSales && globalRegisteredSales.totalKg > 0 && (
                          <div
                            className="text-xs px-2 py-1 rounded bg-purple-600 text-white font-medium border-2 border-purple-800"
                            title={`Registered sales: ${globalRegisteredSales.sales.map(s => s.estrategia_comercial_versions?.nombre).join(', ')}`}
                          >
                            R{Math.round(globalRegisteredSales.totalKg)}
                          </div>
                        )}

                        {/* Show 0 only if no sales at all */}
                        {totalVentas === 0 && (!globalRegisteredSales || globalRegisteredSales.totalKg === 0) && (
                          <span className="text-gray-400">0</span>
                        )}
                      </div>

                      {/* Inventario Neto */}
                      <div className="flex-1 flex items-center justify-center">
                        {proyeccion && (
                          <div className={cn(
                            "text-xs px-2 py-1 rounded text-white font-medium",
                            color === 'red' ? 'bg-red-600' :
                            color === 'yellow' ? 'bg-yellow-600' : 'bg-green-600'
                          )}>
                            {/* Use available inventory that accounts for global registered sales */}
                            {getAvailableInventoryForCell ?
                              Math.round(getAvailableInventoryForCell(date, talla)) :
                              (proyeccion.inventario_neto_real !== undefined
                                ? proyeccion.inventario_neto_real
                                : proyeccion.inventario_neto - proyeccion.ventas_proyectadas)
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Fila de totales */}
          <tr className="bg-gray-100 border-t-2 font-medium">
            <td className="sticky left-0 bg-gray-100 z-10 p-4 border-r text-center">
              Total
            </td>
            {weekDates.map((date) => {
              const totalVentasSemana = tallas.reduce((sum, talla) =>
                sum + getTotalVentasForCell(date, talla), 0
              );
              const totalRegisteredSemana = getGlobalRegisteredSalesForCell ? tallas.reduce((sum, talla) => {
                const globalSales = getGlobalRegisteredSalesForCell(date, talla);
                return sum + (globalSales?.totalKg || 0);
              }, 0) : 0;
              const totalInventarioSemana = tallas.reduce((sum, talla) => {
                const inventarioDisponible = getAvailableInventoryForCell ?
                  getAvailableInventoryForCell(date, talla) :
                  (() => {
                    const proyeccion = getProyeccionForCell(date, talla);
                    return proyeccion
                      ? (proyeccion.inventario_neto_real !== undefined
                          ? proyeccion.inventario_neto_real
                          : proyeccion.inventario_neto - proyeccion.ventas_proyectadas)
                      : 0;
                  })();
                return sum + inventarioDisponible;
              }, 0);

              return (
                <td key={`total-${date}`} className="p-2 border-r">
                  <div className="flex h-full">
                    <div className="flex-1 flex flex-col items-center justify-center border-r border-gray-300 space-y-1">
                      {/* Own planned sales total */}
                      {totalVentasSemana > 0 && (
                        <div className="text-sm font-medium text-blue-800 bg-blue-100 rounded px-2 py-1">
                          {totalVentasSemana}
                        </div>
                      )}
                      {/* Global registered sales total */}
                      {totalRegisteredSemana > 0 && (
                        <div className="text-sm font-medium text-purple-800 bg-purple-100 rounded px-2 py-1">
                          R{Math.round(totalRegisteredSemana)}
                        </div>
                      )}
                      {/* Show 0 if no sales */}
                      {totalVentasSemana === 0 && totalRegisteredSemana === 0 && (
                        <div className="text-sm font-medium text-gray-600">0</div>
                      )}
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-sm font-medium text-green-800 bg-green-100 rounded px-2 py-1">
                        {totalInventarioSemana}
                      </div>
                    </div>
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}