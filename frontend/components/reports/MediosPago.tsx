"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSales } from "@/lib/hooks/useSales";

interface MediosPagoProps {
  salesHook: ReturnType<typeof useSales>;
  dateRange: { startDate: Date; endDate: Date } | null;
}

type PeriodOption = '7d' | '1m' | '3m' | '6m' | '1y';

interface MedioPagoData {
  metodoPago: string;
  monto: number;
  porcentaje: number;
  transacciones: number;
  color: string;
}

const PERIOD_OPTIONS = [
  { value: '7d' as PeriodOption, label: 'Últimos 7 días' },
  { value: '1m' as PeriodOption, label: 'Último mes' },
  { value: '3m' as PeriodOption, label: 'Últimos 3 meses' },
  { value: '6m' as PeriodOption, label: 'Últimos 6 meses' },
  { value: '1y' as PeriodOption, label: 'Último año' }
];

// Colores específicos para cada método de pago
const PAYMENT_COLORS: Record<string, string> = {
  'Efectivo': '#1f9a93',        // Teal principal
  'Tarjeta': '#17a2b8',         // Teal claro
  'Transferencia': '#6f42c1',   // Púrpura
  'Cheque': '#20c997',          // Verde agua
  'Cortesía': '#0d6efd',        // Azul
  'Sin método': '#6c757d'       // Gris
};

export function MediosPago({ salesHook, dateRange }: MediosPagoProps) {
  const { sales } = salesHook;

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

  // Procesar datos de medios de pago
  const datosMediosPago = useMemo(() => {
    if (!dateRange) return [];

    const { startDate, endDate } = dateRange;

    // Filtrar ventas por rango de fechas
    const ventasFiltradas = sales.filter(venta => {
      const fechaEntrega = new Date(venta.fechaEntrega);
      return fechaEntrega >= startDate && fechaEntrega <= endDate;
    });

    if (ventasFiltradas.length === 0) {
      return [];
    }

    // Agrupar por método de pago
    const agrupados: Record<string, { monto: number; transacciones: number }> = {};

    ventasFiltradas.forEach(venta => {
      const metodoPago = venta.metodoPago || 'Sin método';

      if (!agrupados[metodoPago]) {
        agrupados[metodoPago] = {
          monto: 0,
          transacciones: 0
        };
      }

      agrupados[metodoPago].monto += venta.totalOrden;
      agrupados[metodoPago].transacciones += 1;
    });

    // Calcular total para porcentajes
    const montoTotal = Object.values(agrupados).reduce((sum, item) => sum + item.monto, 0);

    // Convertir a array con porcentajes y colores
    const resultado: MedioPagoData[] = Object.entries(agrupados).map(([metodoPago, datos]) => ({
      metodoPago,
      monto: datos.monto,
      porcentaje: (datos.monto / montoTotal) * 100,
      transacciones: datos.transacciones,
      color: PAYMENT_COLORS[metodoPago] || '#757575'
    }));

    // Ordenar por monto descendente
    return resultado.sort((a, b) => b.monto - a.monto);
  }, [sales, dateRange]);

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  // Calcular el monto máximo para escalar las barras
  const montoMaximo = Math.max(...datosMediosPago.map(item => item.monto), 1);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-lg">Medios de pago</CardTitle>
          <p className="text-sm text-gray-600">
            {dateRange ?
              `${dateRange.startDate.toLocaleDateString('es-MX')} - ${dateRange.endDate.toLocaleDateString('es-MX')}` :
              'Sin período seleccionado'
            }
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {datosMediosPago.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-lg font-medium mb-2">No hay datos de medios de pago</h3>
              <p className="text-sm">
                No se encontraron ventas en el período seleccionado
              </p>
              <p className="text-xs mt-2 text-blue-600">
                💡 Selecciona un período de fechas en el filtro superior
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Gráfico de barras horizontales */}
            <div className="space-y-3">
              {datosMediosPago.map((item, index) => (
                <div key={item.metodoPago} className="space-y-1">
                  {/* Nombre del método */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700">{item.metodoPago}</span>
                    <span className="text-xs text-gray-500">
                      {item.transacciones} tx
                    </span>
                  </div>

                  {/* Barra horizontal */}
                  <div className="w-full bg-gray-100 rounded-lg h-12 relative overflow-hidden">
                    <div
                      className="h-full rounded-lg transition-all duration-500 ease-out"
                      style={{
                        backgroundColor: item.color,
                        width: `${(item.monto / montoMaximo) * 100}%`
                      }}
                    />
                    {/* Texto dentro de la barra */}
                    <div className="absolute inset-0 flex items-center justify-between px-4 text-sm font-medium">
                      <span className="text-white drop-shadow-sm">
                        {formatCurrency(item.monto)}
                      </span>
                      <span className="text-white drop-shadow-sm">
                        {formatPercentage(item.porcentaje)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Escala de referencia más compacta */}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                <span>$0</span>
                <span>{formatCurrency(montoMaximo)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}