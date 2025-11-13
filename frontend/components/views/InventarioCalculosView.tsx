"use client";

import React, { useState, useMemo } from "react";
import { useEstanques } from "@/lib/hooks/useEstanques";
import { useMuestreos } from "@/lib/hooks/useMuestreos";
import { usePoblacionesIniciales } from "@/lib/hooks/usePoblacionesIniciales";
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
  fecha: string;
  semana: number;
  generacion: string;
}


type SortField = 'ciclo' | 'tank' | 'averageSize' | 'biomass' | 'population' | 'productivity';
type SortDirection = 'asc' | 'desc';

export function InventarioCalculosView() {
  const { estanques: estanquesSupabase, isLoading: loadingEstanques, error } = useEstanques();
  const { sesiones, loading: loadingMuestreos, obtenerGeneraciones } = useMuestreos();
  const { obtenerPoblacionInicial, loading: loadingPoblaciones } = usePoblacionesIniciales();
  const [calculos, setCalculos] = useState<CalculoCompleto[]>([]);
  const [filtroCiclo, setFiltroCiclo] = useState<string>("todos");
  const [sortField, setSortField] = useState<SortField>('ciclo');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Generar datos cuando se cargan los estanques, muestreos y poblaciones iniciales
  React.useEffect(() => {
    if (estanquesSupabase.length > 0 && sesiones.length > 0 && !loadingPoblaciones) {
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

          // Crear cálculos para cada sesión de este estanque en esta generación
          sesionesEstanque.forEach((sesion, indiceSesion) => {
            const muestreo = sesion.muestreos[estanque.id.toString()];
            if (!muestreo) return;

            // Extraer número de generación para calcular ciclo
            const numeroGeneracion = parseInt(generacion.replace('G-', ''));
            const ciclo = numeroGeneracion;

            // Calcular métricas basadas en datos reales
            // Usar averageSize calculado con camarones si está disponible, sino usar promedio/mediana
            const averageSize = muestreo.averageSize || muestreo.promedio || 0;
            const biomass = muestreo.biomasa || 0;

            // Calcular total de biomasa cosechada hasta esta sesión (acumulativa)
            const biomasaCosechadaTotal = sesionesEstanque.slice(0, indiceSesion + 1).reduce((suma, sesionAnterior) => {
              const muestreoSesion = sesionAnterior.muestreos[estanque.id.toString()];
              return suma + (muestreoSesion?.cosecha || 0);
            }, 0);

            const area = estanque.area || 540;
            const productivity = (biomass + biomasaCosechadaTotal) / area;

            // Calcular biomass increase basado en sesión anterior
            let biomassIncrease = 0;
            if (indiceSesion > 0) {
              const sesionAnterior = sesionesEstanque[indiceSesion - 1];
              const muestreoAnterior = sesionAnterior.muestreos[estanque.id.toString()];
              if (muestreoAnterior) {
                biomassIncrease = biomass - (muestreoAnterior.biomasa || 0);
              }
            }

            // Calcular growth basado en diferencia de average size
            let growth = 0;
            if (indiceSesion > 0) {
              const sesionAnterior = sesionesEstanque[indiceSesion - 1];
              const muestreoAnterior = sesionAnterior.muestreos[estanque.id.toString()];
              if (muestreoAnterior) {
                const averageSizeAnterior = muestreoAnterior.averageSize || muestreoAnterior.promedio || 0;
                growth = averageSize - averageSizeAnterior;
              }
            }

            // Estimaciones adicionales
            const population = averageSize > 0 ? Math.round((biomass * 1000) / averageSize) : 0;

            // Calcular Survival Rate: (Población Actual + Población Cosechada) / Población Inicial * 100
            let survivalRate = 0;

            // Calcular poblaciones cosechadas hasta esta sesión (acumulativa)
            const poblacionesTotalesCosechadas = sesionesEstanque.slice(0, indiceSesion + 1).reduce((suma, sesionAnterior) => {
              const muestreoSesion = sesionAnterior.muestreos[estanque.id.toString()];
              if (muestreoSesion && (muestreoSesion.cosecha || 0) > 0) {
                const cosechaKg = muestreoSesion.cosecha || 0;
                const averageSizeGramos = muestreoSesion.averageSize || muestreoSesion.promedio || 0;
                if (averageSizeGramos > 0) {
                  // Convertir kg a gramos, luego dividir por peso promedio por camarón
                  const poblacionCosechada = Math.round((cosechaKg * 1000) / averageSizeGramos);
                  return suma + poblacionCosechada;
                }
              }
              return suma;
            }, 0);

            // Obtener población inicial desde la tabla poblaciones_iniciales
            const generacionId = sesion.generacionId;
            const poblacionInicial = obtenerPoblacionInicial(estanque.id, generacionId) || 0;

            if (poblacionInicial > 0) {
              survivalRate = ((population + poblacionesTotalesCosechadas) / poblacionInicial) * 100;
            }

            // Usar semana de cultivo desde la base de datos
            const cultureWeeks = muestreo.semanaCultivo || 1;

            // Integrar datos de cosecha reales
            const weeklyHarvest = muestreo.cosecha || 0; // Cosecha de la semana actual
            const totalHarvested = 0; // TODO: Cuando se implemente, calcular total acumulado de la generación

            // Intercambiar: harvested = cosecha semanal, hWeek = total acumulado
            const harvested = weeklyHarvest;
            const hWeek = totalHarvested;

            // Estado removido de la tabla
            const estado = 'activo'; // No se usa más pero mantenemos para compatibilidad

            calculosReales.push({
              id: `${ciclo}-${estanque.id}-${sesion.fecha}`,
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
              estado,
              fecha: sesion.fecha,
              semana: sesion.semana || 0,
              generacion: generacion
            });
          });
        });
      });

      setCalculos(calculosReales.sort((a, b) => a.ciclo - b.ciclo || a.tank.localeCompare(b.tank)));
    } else {
      // Mostrar array vacío si no hay datos
      setCalculos([]);
    }
  }, [estanquesSupabase, sesiones, loadingPoblaciones]);

  const ciclosUnicos = useMemo(() => {
    const ciclos = Array.from(new Set(calculos.map(c => c.ciclo)));
    return ciclos.sort((a, b) => b - a);
  }, [calculos]);

  const calculosFiltrados = useMemo(() => {
    let filtered = calculos;

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
  }, [calculos, filtroCiclo, sortField, sortDirection]);

  // Agrupar cálculos por fecha
  const calculosAgrupados = useMemo(() => {
    const grupos: { [fecha: string]: CalculoCompleto[] } = {};

    calculosFiltrados.forEach(calculo => {
      if (!grupos[calculo.fecha]) {
        grupos[calculo.fecha] = [];
      }
      grupos[calculo.fecha].push(calculo);
    });

    // Ordenar fechas de más reciente a más antigua
    const fechasOrdenadas = Object.keys(grupos).sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    );

    return fechasOrdenadas.map(fecha => {
      let calculosGrupo = [...grupos[fecha]];

      // Aplicar ordenamiento
      calculosGrupo.sort((a, b) => {
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
            aValue = a.tank;
            bValue = b.tank;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortDirection === 'asc' ? comparison : -comparison;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });

      // Calcular métricas del grupo
      const biomasaTotal = calculosGrupo.reduce((sum, c) => sum + c.biomass, 0);
      const poblacionTotal = calculosGrupo.reduce((sum, c) => sum + c.population, 0);
      const cosechaSemanal = calculosGrupo.reduce((sum, c) => sum + c.harvested, 0);
      const productividadPromedio = calculosGrupo.length > 0
        ? calculosGrupo.reduce((sum, c) => sum + c.productivity, 0) / calculosGrupo.length
        : 0;

      return {
        fecha,
        calculos: calculosGrupo,
        metrics: {
          biomasaTotal,
          poblacionTotal,
          cosechaSemanal,
          productividadPromedio
        }
      };
    });
  }, [calculosFiltrados, sortField, sortDirection]);

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
                  {calculosFiltrados.length > 0 ? (totales.productividad / calculosFiltrados.length).toFixed(5) : '0.00000'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      {/* Tablas agrupadas por fecha */}
      {calculosAgrupados.map(({ fecha, calculos, metrics }) => (
        <Card key={fecha} className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              Cálculos Detallados - {new Date(fecha).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })} ({calculos.length} estanques)
            </CardTitle>

            {/* Métricas del grupo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-semibold text-green-700">
                  {formatWeight(metrics.biomasaTotal)}
                </div>
                <div className="text-xs text-green-600">Biomasa Total</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-semibold text-blue-700">
                  {formatNumber(metrics.poblacionTotal)}
                </div>
                <div className="text-xs text-blue-600">Población Total</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-sm font-semibold text-orange-700">
                  {formatWeight(metrics.cosechaSemanal)}
                </div>
                <div className="text-xs text-orange-600">Cosecha Semanal</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-sm font-semibold text-purple-700">
                  {metrics.productividadPromedio.toFixed(3)}
                </div>
                <div className="text-xs text-purple-600">Productividad Prom.</div>
              </div>
            </div>
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
                  <TableHead className="text-right">Weekly Harvest</TableHead>
                  <TableHead className="text-center">Total Harvest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculos.map((calculo) => (
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
                      {formatNumber(calculo.survivalRates)}%
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {calculo.productivity.toFixed(5)}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      ))}

      {/* Mostrar mensaje cuando no hay datos */}
      {calculosAgrupados.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}