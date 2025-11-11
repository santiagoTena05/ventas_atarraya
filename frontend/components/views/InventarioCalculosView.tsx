"use client";

import React, { useState, useMemo } from "react";
import { useEstanques } from "@/lib/hooks/useEstanques";
import { useMuestreos } from "@/lib/hooks/useMuestreos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Droplets,
  Calculator,
  TrendingUp,
  Filter,
  Download,
  ArrowUpDown
} from "lucide-react";
import { formatNumber, formatWeight, formatCurrency } from "@/lib/utils/formatters";


interface CalculoCompleto {
  id: string;
  ciclo: number;
  tank: string;
  averageSize: number;
  growth: number;
  biomass: number;
  biomassIncrease: number;
  population: number;
  survivalRates: number;
  productivity: number;
  cultureWeeks: number;
  harvested: number;
  hWeek: number;
  estado: 'activo' | 'cosecha' | 'preparacion';
}


type SortField = 'ciclo' | 'tank' | 'averageSize' | 'biomass' | 'population' | 'productivity';
type SortDirection = 'asc' | 'desc';

export function InventarioCalculosView() {
  const { estanques: estanquesSupabase, isLoading: loadingEstanques, error } = useEstanques();
  const { sesiones, loading: loadingMuestreos, obtenerGeneraciones } = useMuestreos();
  const [calculos, setCalculos] = useState<CalculoCompleto[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroCiclo, setFiltroCiclo] = useState<string>("todos");
  const [sortField, setSortField] = useState<SortField>('ciclo');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Generar datos cuando se cargan los estanques y muestreos
  React.useEffect(() => {
    if (estanquesSupabase.length > 0 && sesiones.length > 0) {
      // Usar datos reales de muestreos para generar cálculos
      const calculosReales: CalculoCompleto[] = [];
      const generacionesSet = new Set(sesiones.map(s => s.generacion));
      const generaciones = Array.from(generacionesSet).sort();

      estanquesSupabase.forEach((estanque) => {
        generaciones.forEach((generacion) => {
          const sesionesEstanque = sesiones
            .filter(s =>
              s.generacion === generacion &&
              s.muestreos[estanque.id.toString()]
            )
            .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

          if (sesionesEstanque.length > 0) {
            const sesionReciente = sesionesEstanque[sesionesEstanque.length - 1];
            const muestreo = sesionReciente.muestreos[estanque.id.toString()];

            // Extraer número de generación para calcular ciclo
            const numeroGeneracion = parseInt(generacion.replace('G-', ''));
            const ciclo = numeroGeneracion;

            // Calcular métricas basadas en datos reales
            const averageSize = muestreo.promedio || 0; // Campo 'promedio' contiene la mediana
            const biomass = muestreo.biomasa || 0;
            const area = estanque.area || 540;
            const productivity = biomass / area;

            // Calcular biomass increase basado en sesiones anteriores
            let biomassIncrease = 0;
            if (sesionesEstanque.length > 1) {
              const sesionAnterior = sesionesEstanque[sesionesEstanque.length - 2];
              const muestreoAnterior = sesionAnterior.muestreos[estanque.id.toString()];
              if (muestreoAnterior) {
                biomassIncrease = biomass - (muestreoAnterior.biomasa || 0);
              }
            }

            // Estimaciones adicionales
            const population = averageSize > 0 ? Math.round((biomass * 1000) / averageSize) : 0;
            const survivalRate = Math.min(0.9, Math.max(0.3, 0.3 + (productivity * 0.3)));
            const growth = averageSize > 0 ? Math.max(0.5, averageSize / 15) : 1.0;

            // Calcular semanas de cultivo basado en semana de la sesión
            const cultureWeeks = sesionReciente.semana || Math.floor(8 + (numeroGeneracion - 60) * 2);

            // Integrar datos de cosecha reales
            const harvested = muestreo.cosecha || 0;
            const hWeek = harvested > 0 ? cultureWeeks : 0;

            // Determinar estado basado en métricas reales
            let estado: 'activo' | 'cosecha' | 'preparacion' = 'activo';
            if (harvested > 0 || averageSize > 20) {
              estado = 'cosecha';
            } else if (averageSize < 8 || cultureWeeks < 4) {
              estado = 'preparacion';
            }

            calculosReales.push({
              id: `${ciclo}-${estanque.id}`,
              ciclo,
              tank: estanque.codigo || `EST-${estanque.id.toString().padStart(2, '0')}`,
              averageSize,
              growth,
              biomass,
              biomassIncrease,
              population,
              survivalRates: survivalRate,
              productivity,
              cultureWeeks,
              harvested,
              hWeek,
              estado
            });
          }
        });
      });

      setCalculos(calculosReales.sort((a, b) => a.ciclo - b.ciclo || a.tank.localeCompare(b.tank)));
    } else {
      // Mostrar array vacío si no hay datos
      setCalculos([]);
    }
  }, [estanquesSupabase, sesiones]);

  const ciclosUnicos = useMemo(() => {
    const ciclos = Array.from(new Set(calculos.map(c => c.ciclo)));
    return ciclos.sort((a, b) => b - a);
  }, [calculos]);

  const calculosFiltrados = useMemo(() => {
    let filtered = calculos;

    // Filtro por estado
    if (filtroEstado !== "todos") {
      filtered = filtered.filter(c => c.estado === filtroEstado);
    }

    // Filtro por ciclo
    if (filtroCiclo !== "todos") {
      filtered = filtered.filter(c => c.ciclo === parseInt(filtroCiclo));
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'ciclo':
          aValue = a.ciclo;
          bValue = b.ciclo;
          break;
        case 'tank':
          aValue = a.tank;
          bValue = b.tank;
          break;
        case 'averageSize':
          aValue = a.averageSize;
          bValue = b.averageSize;
          break;
        case 'biomass':
          aValue = a.biomass;
          bValue = b.biomass;
          break;
        case 'population':
          aValue = a.population;
          bValue = b.population;
          break;
        case 'productivity':
          aValue = a.productivity;
          bValue = b.productivity;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [calculos, filtroEstado, filtroCiclo, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo':
        return 'bg-green-100 text-green-800';
      case 'cosecha':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparacion':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'activo':
        return 'Activo';
      case 'cosecha':
        return 'En Cosecha';
      case 'preparacion':
        return 'Preparación';
      default:
        return 'Desconocido';
    }
  };

  // Estados de loading y error
  if (loadingEstanques || loadingMuestreos) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-600 mb-2">❌</div>
          <p className="text-gray-600">Error cargando estanques: {error}</p>
        </div>
      </div>
    );
  }

  const totales = calculosFiltrados.reduce(
    (acc, calc) => ({
      biomasa: acc.biomasa + calc.biomass,
      population: acc.population + calc.population,
      cosechado: acc.cosechado + calc.harvested,
      productividad: acc.productividad + calc.productivity
    }),
    { biomasa: 0, population: 0, cosechado: 0, productividad: 0 }
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="h-6 w-6 text-purple-600" />
            Vista de Cálculos Completos
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Análisis detallado de productividad y métricas por ciclo y estanque
          </p>
          {sesiones.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              📋 No hay muestreos registrados - Ve a Inventario Vivo para registrar datos
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estadísticas resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Biomasa Total</p>
                <p className="text-2xl font-bold text-green-600">{formatWeight(totales.biomasa)} kg</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Población Total</p>
                <p className="text-2xl font-bold text-blue-600">{formatNumber(totales.population)}</p>
              </div>
              <Droplets className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cosechado</p>
                <p className="text-2xl font-bold text-yellow-600">{formatWeight(totales.cosechado)} kg</p>
              </div>
              <Calculator className="h-6 w-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Productividad Prom.</p>
                <p className="text-2xl font-bold text-purple-600">
                  {calculosFiltrados.length > 0 ? formatNumber(totales.productividad / calculosFiltrados.length) : '0'}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="cosecha">En Cosecha</SelectItem>
                  <SelectItem value="preparacion">Preparación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciclo
              </label>
              <Select value={filtroCiclo} onValueChange={setFiltroCiclo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los ciclos</SelectItem>
                  {ciclosUnicos.map((ciclo) => (
                    <SelectItem key={ciclo} value={ciclo.toString()}>
                      Ciclo {ciclo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                &nbsp;
              </label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFiltroEstado("todos");
                  setFiltroCiclo("todos");
                }}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de cálculos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Cálculos Detallados ({calculosFiltrados.length} registros)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('ciclo')}
                  >
                    <div className="flex items-center gap-2">
                      Ciclo
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('tank')}
                  >
                    <div className="flex items-center gap-2">
                      Tank
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('averageSize')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Average Size
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Growth</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('biomass')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Biomass
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Biomass Increase</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('population')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Population
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Survival Rates</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('productivity')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Productivity
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Culture Weeks</TableHead>
                  <TableHead className="text-right">Harvested</TableHead>
                  <TableHead className="text-center">H. Week</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculosFiltrados.map((calculo) => (
                  <TableRow key={calculo.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <Badge variant="outline" className="bg-blue-50">
                        {calculo.ciclo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-blue-600">
                      {calculo.tank}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(calculo.averageSize)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(calculo.growth)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatWeight(calculo.biomass)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatWeight(calculo.biomassIncrease)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(calculo.population)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(calculo.survivalRates * 100)}%
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(calculo.productivity)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {calculo.cultureWeeks}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {calculo.harvested > 0 ? (
                        <span className="font-medium text-green-600">
                          {formatNumber(calculo.harvested)}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {calculo.hWeek > 0 ? (
                        <Badge variant="outline" className="bg-yellow-50">
                          {calculo.hWeek}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={getEstadoColor(calculo.estado)}>
                        {getEstadoTexto(calculo.estado)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {calculosFiltrados.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No hay datos para mostrar</p>
                  {sesiones.length === 0 ? (
                    <p className="text-sm">Registra muestreos en Inventario Vivo para ver cálculos detallados</p>
                  ) : (
                    <p className="text-sm">No se encontraron registros con los filtros aplicados</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}