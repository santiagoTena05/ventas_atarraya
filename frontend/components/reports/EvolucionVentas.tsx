"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useSales } from "@/lib/hooks/useSales";

interface EvolucionVentasProps {
  salesHook: ReturnType<typeof useSales>;
  dateRange: { startDate: Date; endDate: Date } | null;
}

type PeriodOption = '7d' | '1m' | '3m' | '6m' | '1y';

interface VentaEvolucionData {
  periodo: string;
  totalVentas: number;
  precioPromedio: number;
  fechaCompleta?: Date;
}

const PERIOD_OPTIONS = [
  { value: '7d' as PeriodOption, label: 'Últimos 7 días' },
  { value: '1m' as PeriodOption, label: 'Último mes' },
  { value: '3m' as PeriodOption, label: 'Últimos 3 meses' },
  { value: '6m' as PeriodOption, label: 'Últimos 6 meses' },
  { value: '1y' as PeriodOption, label: 'Último año' }
];

export function EvolucionVentas({ salesHook, dateRange }: EvolucionVentasProps) {
  const { sales } = salesHook;

  // Función para agrupar por semana
  const getWeekKey = (date: Date): string => {
    const year = date.getFullYear();
    const weekOfYear = Math.ceil(((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
    return `Sem ${weekOfYear}`;
  };

  // Función para agrupar por mes
  const getMonthKey = (date: Date): string => {
    return date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
  };

  // Función para obtener el rango de fechas según el período seleccionado
  const getDateRange = (period: PeriodOption): { startDate: Date; endDate: Date } => {
    const today = new Date();
    const endDate = new Date(today);
    let startDate = new Date(today);

    switch (period) {
      case '7d':
        startDate.setDate(today.getDate() - 7);
        break;
      case '1m':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(today.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  };

  // Filtrar y procesar datos según el dateRange global
  const datosEvolucion = useMemo(() => {
    if (!dateRange) return [];

    const { startDate, endDate } = dateRange;

    // Filtrar ventas por rango de fechas
    const ventasFiltradas = sales.filter(venta => {
      const fechaEntrega = new Date(venta.fechaEntrega);
      return fechaEntrega >= startDate && fechaEntrega <= endDate;
    });

    // Calcular la diferencia en días para decidir la agrupación
    const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    let selectedPeriod: PeriodOption;

    if (diffInDays <= 7) {
      selectedPeriod = '7d';
    } else if (diffInDays <= 31) {
      selectedPeriod = '1m';
    } else if (diffInDays <= 93) {
      selectedPeriod = '3m';
    } else if (diffInDays <= 186) {
      selectedPeriod = '6m';
    } else {
      selectedPeriod = '1y';
    }

    const agrupados: Record<string, {
      totalVentas: number;
      totalKgs: number;
      fechaCompleta?: Date;
      count: number;
    }> = {};

    ventasFiltradas.forEach(venta => {
      const fechaEntrega = new Date(venta.fechaEntrega);
      let key: string;
      let fechaCompleta: Date;

      // Determinar la clave de agrupación según el período
      switch (selectedPeriod) {
        case '7d':
        case '1m':
          // Agrupar por día
          key = fechaEntrega.toLocaleDateString('es-MX', {
            month: 'short',
            day: 'numeric'
          });
          fechaCompleta = new Date(fechaEntrega.getFullYear(), fechaEntrega.getMonth(), fechaEntrega.getDate());
          break;
        case '3m':
          // Agrupar por semana
          key = getWeekKey(fechaEntrega);
          fechaCompleta = fechaEntrega;
          break;
        case '6m':
        case '1y':
          // Agrupar por mes
          key = getMonthKey(fechaEntrega);
          fechaCompleta = new Date(fechaEntrega.getFullYear(), fechaEntrega.getMonth(), 1);
          break;
        default:
          key = fechaEntrega.toLocaleDateString('es-MX');
          fechaCompleta = fechaEntrega;
      }

      if (!agrupados[key]) {
        agrupados[key] = {
          totalVentas: 0,
          totalKgs: 0,
          fechaCompleta,
          count: 0
        };
      }

      agrupados[key].totalVentas += venta.totalOrden;
      agrupados[key].totalKgs += venta.enteroKgs;
      agrupados[key].count += 1;
    });

    // Convertir a array y calcular precio promedio
    const resultado: VentaEvolucionData[] = Object.entries(agrupados).map(([periodo, datos]) => ({
      periodo,
      totalVentas: datos.totalVentas,
      precioPromedio: datos.totalKgs > 0 ? datos.totalVentas / datos.totalKgs : 0,
      fechaCompleta: datos.fechaCompleta
    }));

    // Ordenar por fecha
    resultado.sort((a, b) => {
      if (a.fechaCompleta && b.fechaCompleta) {
        return a.fechaCompleta.getTime() - b.fechaCompleta.getTime();
      }
      return a.periodo.localeCompare(b.periodo);
    });

    return resultado;
  }, [sales, dateRange]);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${amount.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-semibold">{label}</p>
          <div className="space-y-1">
            <p className="text-blue-600">
              <span className="font-medium">Total Ventas:</span> {formatCurrency(payload[0]?.value || 0)}
            </p>
            <p className="text-orange-600">
              <span className="font-medium">Precio Promedio:</span> {formatPrice(payload[1]?.value || 0)}/kg
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Para mostrar información del período
  const periodoInfo = useMemo(() => {
    if (!dateRange) return null;
    const { startDate, endDate } = dateRange;
    const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays <= 7) return "Últimos 7 días";
    if (diffInDays <= 31) return "Último mes";
    if (diffInDays <= 93) return "Últimos 3 meses";
    if (diffInDays <= 186) return "Últimos 6 meses";
    return "Último año";
  }, [dateRange]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-lg">Evolución de Ventas</CardTitle>
          <p className="text-sm text-gray-600">
            {periodoInfo || "Sin período seleccionado"}
            {datosEvolucion.length > 0 && (
              <span className="ml-2 text-gray-500">
                ({datosEvolucion.length} registros)
              </span>
            )}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {datosEvolucion.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium mb-2">No hay ventas registradas</h3>
                <p className="text-sm">
                  No se encontraron ventas en el período seleccionado
                </p>
                <p className="text-xs mt-2">
                  {dateRange ? `(${dateRange.startDate.toLocaleDateString('es-MX')} - ${dateRange.endDate.toLocaleDateString('es-MX')})` : ''}
                </p>
                <p className="text-xs mt-2 text-blue-600">
                  💡 Selecciona un período de fechas en el filtro superior
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={datosEvolucion}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="periodo"
                  fontSize={12}
                  angle={datosEvolucion.length > 10 ? -45 : 0}
                  textAnchor={datosEvolucion.length > 10 ? 'end' : 'middle'}
                  height={datosEvolucion.length > 10 ? 60 : 40}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tickFormatter={formatCurrency}
                  fontSize={12}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={formatPrice}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />

                <Bar
                  yAxisId="left"
                  dataKey="totalVentas"
                  name="Total Ventas"
                  fill="url(#blueGradient)"
                  radius={[4, 4, 0, 0]}
                />

                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="precioPromedio"
                  name="Precio Promedio"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#f97316', strokeWidth: 2, fill: '#fff' }}
                />

                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#1e40af" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}