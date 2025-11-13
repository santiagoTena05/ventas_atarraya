"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMuestreos } from '@/lib/hooks/useMuestreos';

interface BiomassHarvestedChartProps {
  dateRange?: { startDate: Date; endDate: Date } | null;
}

interface ChartDataPoint {
  week: number;
  biomass: number;
  harvested: number;
  biomassCumulative: number;
  harvestedCumulative: number;
}

// Helper function to get week number from date
const getWeekNumber = (date: Date): number => {
  const oneJan = new Date(date.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
};

export function BiomassHarvestedChart({ dateRange }: BiomassHarvestedChartProps) {
  const { sesiones: muestreosSesiones, loading: loadingMuestreos } = useMuestreos();

  const chartData = useMemo(() => {
    if (loadingMuestreos) return [];

    // Filter data by date range if provided
    const filteredMuestreos = dateRange
      ? muestreosSesiones.filter(sesion => {
          const sesionDate = new Date(sesion.fecha);
          return sesionDate >= dateRange.startDate && sesionDate <= dateRange.endDate;
        })
      : muestreosSesiones;

    // Group muestreos by week
    const biomassData = new Map<number, number>();
    filteredMuestreos.forEach(sesion => {
      if (sesion.semana) {
        const totalBiomass = Object.values(sesion.muestreos).reduce(
          (sum, muestreo) => sum + muestreo.biomasa,
          0
        );
        const existingBiomass = biomassData.get(sesion.semana) || 0;
        biomassData.set(sesion.semana, existingBiomass + totalBiomass);
      }
    });

    // Group harvests by week from muestreos data
    const harvestedData = new Map<number, number>();
    filteredMuestreos.forEach(sesion => {
      if (sesion.semana) {
        const totalHarvest = Object.values(sesion.muestreos).reduce(
          (sum, muestreo) => sum + (muestreo.cosecha || 0),
          0
        );
        if (totalHarvest > 0) {
          const existingHarvested = harvestedData.get(sesion.semana) || 0;
          harvestedData.set(sesion.semana, existingHarvested + totalHarvest);
        }
      }
    });

    // Get all weeks and sort them
    const allWeeks = new Set([...biomassData.keys(), ...harvestedData.keys()]);
    const sortedWeeks = Array.from(allWeeks).sort((a, b) => a - b);

    // Create chart data points
    let cumulativeBiomass = 0;
    let cumulativeHarvested = 0;

    const data: ChartDataPoint[] = sortedWeeks.map(week => {
      const biomass = biomassData.get(week) || 0;
      const harvested = harvestedData.get(week) || 0;

      cumulativeBiomass += biomass;
      cumulativeHarvested += harvested;

      return {
        week,
        biomass,
        harvested,
        biomassCumulative: cumulativeBiomass,
        harvestedCumulative: cumulativeHarvested,
      };
    });

    return data;
  }, [muestreosSesiones, dateRange, loadingMuestreos]);

  const formatNumber = (value: number) => {
    return value.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{`Semana ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.dataKey === 'biomass' && `Biomasa: ${formatNumber(entry.value)} kg`}
              {entry.dataKey === 'harvested' && `Cosechado: ${formatNumber(entry.value)} kg`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };


  if (loadingMuestreos) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Biomasa Estimada vs Cosechado por Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-gray-500">Cargando datos...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Biomasa Estimada vs Cosechado por Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-gray-500">No hay datos disponibles para el período seleccionado</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Biomasa Estimada vs Cosechado por Semana</CardTitle>
        <p className="text-sm text-gray-600">
          Comparación entre biomasa estimada del inventario vivo y kilos cosechados por semana
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 70, right: 30, left: 20, bottom: 60 }}>
              <defs>
                <linearGradient id="biomassGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1f9a93" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#1f9a93" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="harvestedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#20c997" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#20c997" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="week"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                label={{ value: 'Semana', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle', fontSize: '12px', fill: '#6B7280' } }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={formatNumber}
                label={{ value: 'Kilogramos', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '12px', fill: '#6B7280' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="biomass"
                stackId="1"
                stroke="#1f9a93"
                fill="url(#biomassGradient)"
                strokeWidth={2}
                name="Biomasa"
                dot={{ fill: '#1f9a93', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#1f9a93', strokeWidth: 2, fill: '#ffffff' }}
              />
              <Area
                type="monotone"
                dataKey="harvested"
                stackId="1"
                stroke="#20c997"
                fill="url(#harvestedGradient)"
                strokeWidth={2}
                name="Cosechado"
                dot={{ fill: '#20c997', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#20c997', strokeWidth: 2, fill: '#ffffff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Summary statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-teal-50 rounded-lg">
            <div className="text-lg font-semibold text-teal-700">
              {formatNumber(chartData.reduce((sum, point) => sum + point.biomass, 0))} kg
            </div>
            <div className="text-sm text-teal-600">Total Biomasa</div>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-lg font-semibold text-emerald-700">
              {formatNumber(chartData.reduce((sum, point) => sum + point.harvested, 0))} kg
            </div>
            <div className="text-sm text-emerald-600">Total Cosechado</div>
          </div>
          <div className="text-center p-3 bg-cyan-50 rounded-lg">
            <div className="text-lg font-semibold text-cyan-700">
              {chartData.length > 0 ? formatNumber(chartData[chartData.length - 1]?.biomassCumulative || 0) : 0} kg
            </div>
            <div className="text-sm text-cyan-600">Biomasa Acumulada</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold text-green-700">
              {chartData.length > 0 ? formatNumber(chartData[chartData.length - 1]?.harvestedCumulative || 0) : 0} kg
            </div>
            <div className="text-sm text-green-600">Cosecha Acumulada</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}