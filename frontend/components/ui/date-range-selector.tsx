"use client";

import React, { useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CalendarDays } from "lucide-react";

interface DateRangeSelectorProps {
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  className?: string;
}

export function DateRangeSelector({ onDateRangeChange, className }: DateRangeSelectorProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Calcular fechas basadas en el período seleccionado
  const calculateDateRange = (period: string) => {
    const today = new Date();
    const endDate = new Date(today);
    let startDate = new Date(today);

    switch (period) {
      case "7":
        startDate.setDate(today.getDate() - 7);
        break;
      case "30":
        startDate.setDate(today.getDate() - 30);
        break;
      case "90":
        startDate.setDate(today.getDate() - 90);
        break;
      case "180":
        startDate.setDate(today.getDate() - 180);
        break;
      case "365":
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      case "ytd": // Year to date
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      case "all":
        startDate = new Date(2020, 0, 1); // Fecha muy anterior
        break;
      default:
        break;
    }

    return { startDate, endDate };
  };

  // Manejar cambio de período predefinido
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);

    if (period !== "custom") {
      const { startDate, endDate } = calculateDateRange(period);
      onDateRangeChange(startDate, endDate);
    }
  };

  // Manejar rango personalizado
  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      onDateRangeChange(startDate, endDate);
    }
  };

  // Inicializar con últimos 30 días al montar
  React.useEffect(() => {
    const { startDate, endDate } = calculateDateRange("30");
    onDateRangeChange(startDate, endDate);
  }, []); // Solo ejecutar al montar, no incluir onDateRangeChange

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-4 w-4 text-gray-600" />
            <Label className="text-sm font-medium text-gray-700">
              Período de Análisis
            </Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Selector de período predefinido */}
            <div className="space-y-2">
              <Label htmlFor="period-selector" className="text-xs text-gray-600">
                Períodos Rápidos
              </Label>
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="90">Últimos 3 meses</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                  <SelectItem value="365">Último año</SelectItem>
                  <SelectItem value="ytd">Año en curso</SelectItem>
                  <SelectItem value="all">Todo el historial</SelectItem>
                  <SelectItem value="custom">Rango personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rango personalizado */}
            {selectedPeriod === "custom" && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Rango Personalizado</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCustomDateChange}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  disabled={!customStartDate || !customEndDate}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Aplicar Rango
                </Button>
              </div>
            )}
          </div>

          {/* Mostrar rango actual */}
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            {selectedPeriod === "custom" && customStartDate && customEndDate ? (
              <>Desde {new Date(customStartDate).toLocaleDateString('es-MX')} hasta {new Date(customEndDate).toLocaleDateString('es-MX')}</>
            ) : selectedPeriod !== "custom" ? (
              (() => {
                const { startDate, endDate } = calculateDateRange(selectedPeriod);
                return <>Desde {startDate.toLocaleDateString('es-MX')} hasta {endDate.toLocaleDateString('es-MX')}</>;
              })()
            ) : (
              "Selecciona un rango de fechas"
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}