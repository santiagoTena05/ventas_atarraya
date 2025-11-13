"use client";

import React, { useState, useMemo } from "react";
import { useEstanques } from "@/lib/hooks/useEstanques";
import { useMuestreos } from "@/lib/hooks/useMuestreos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  Calendar,
  TrendingUp,
  Filter,
  Download,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { formatNumber, formatWeight } from "@/lib/utils/formatters";


interface EstanqueData {
  estanqueId: number;
  estanque: string;
  lances: number[];
  mediana: number;
  estimacionActual: number;
  estimacionAnterior?: number;
  ganancia?: number;
  cosechaSemanal: number;
}


export function InventarioGeneracionesView() {
  const { estanques: estanquesSupabase, isLoading: loadingEstanques, error } = useEstanques();
  const { sesiones, loading: loadingMuestreos, calcularDatosGeneraciones, obtenerGeneraciones } = useMuestreos();
  const [datos, setDatos] = useState<EstanqueData[]>([]);
  const [generacionSeleccionada, setGeneracionSeleccionada] = useState<string>("todos");
  const [editandoCelda, setEditandoCelda] = useState<{estanque: string, lance: number} | null>(null);
  const [muestreosExpandidos, setMuestreosExpandidos] = useState<boolean>(true);

  // Generar datos cuando se cargan los estanques y muestreos
  React.useEffect(() => {
    if (estanquesSupabase.length > 0) {
      if (sesiones.length > 0 && generacionSeleccionada) {
        // Usar datos reales de muestreos para la generación seleccionada
        const datosReales: EstanqueData[] = [];

        if (generacionSeleccionada === "todos") {
          // Cuando se selecciona "todos", agrupar por estanque y generación
          estanquesSupabase.forEach((estanque) => {
            // Obtener todas las generaciones que tienen datos para este estanque
            const generacionesConDatos = new Set(
              sesiones
                .filter(s => s.muestreos[estanque.id.toString()])
                .map(s => s.generacion)
            );

            generacionesConDatos.forEach((generacion) => {
              const sesionesEstanque = sesiones.filter(s => {
                return s.generacion === generacion && s.muestreos[estanque.id.toString()];
              }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

              if (sesionesEstanque.length > 0) {
                const sesionReciente = sesionesEstanque[sesionesEstanque.length - 1];
                const muestreo = sesionReciente.muestreos[estanque.id.toString()];

                // Calcular estimación anterior si hay más de una sesión
                let estimacionAnterior: number | undefined;
                let ganancia: number | undefined;

                if (sesionesEstanque.length > 1) {
                  const sesionAnterior = sesionesEstanque[sesionesEstanque.length - 2];
                  const muestreoAnterior = sesionAnterior.muestreos[estanque.id.toString()];
                  if (muestreoAnterior) {
                    estimacionAnterior = muestreoAnterior.biomasa;
                    ganancia = muestreo.biomasa - estimacionAnterior;
                  }
                }

                // Aplicar regla: si biomasa > 100kg, sumar 50kg adicionales
                const biomasaBase = muestreo.biomasa || 0;
                const estimacionFinal = biomasaBase > 100 ? biomasaBase + 50 : biomasaBase;

                datosReales.push({
                  estanqueId: estanque.id,
                  estanque: `${estanque.codigo || `EST-${estanque.id.toString().padStart(2, '0')}`} (Gen ${generacion})`,
                  lances: muestreo.muestreos || [],
                  mediana: muestreo.promedio || 0, // Campo 'promedio' contiene la mediana
                  estimacionActual: estimacionFinal,
                  estimacionAnterior,
                  ganancia,
                  cosechaSemanal: muestreo.cosecha || 0
                });
              }
            });
          });
        } else {
          // Para una generación específica
          estanquesSupabase.forEach((estanque) => {
            const sesionesEstanque = sesiones.filter(s => {
              return s.generacion === generacionSeleccionada && s.muestreos[estanque.id.toString()];
            }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

            if (sesionesEstanque.length > 0) {
              const sesionReciente = sesionesEstanque[sesionesEstanque.length - 1];
              const muestreo = sesionReciente.muestreos[estanque.id.toString()];

              // Calcular estimación anterior si hay más de una sesión
              let estimacionAnterior: number | undefined;
              let ganancia: number | undefined;

              if (sesionesEstanque.length > 1) {
                const sesionAnterior = sesionesEstanque[sesionesEstanque.length - 2];
                const muestreoAnterior = sesionAnterior.muestreos[estanque.id.toString()];
                if (muestreoAnterior) {
                  estimacionAnterior = muestreoAnterior.biomasa;
                  ganancia = muestreo.biomasa - estimacionAnterior;
                }
              }

              // Aplicar regla: si biomasa > 100kg, sumar 50kg adicionales
              const biomasaBase = muestreo.biomasa || 0;
              const estimacionFinal = biomasaBase > 100 ? biomasaBase + 50 : biomasaBase;

              datosReales.push({
                estanqueId: estanque.id,
                estanque: estanque.codigo || `EST-${estanque.id.toString().padStart(2, '0')}`,
                lances: muestreo.muestreos || [],
                mediana: muestreo.promedio || 0, // Campo 'promedio' contiene la mediana
                estimacionActual: estimacionFinal,
                estimacionAnterior,
                ganancia,
                cosechaSemanal: muestreo.cosecha || 0
              });
            }
          });
        }

        setDatos(datosReales);
      } else {
        // Mostrar mensaje si no hay datos
        setDatos([]);
      }
    }
  }, [estanquesSupabase, sesiones, generacionSeleccionada]);

  const generacionesDisponibles = useMemo(() => {
    return obtenerGeneraciones();
  }, [sesiones, obtenerGeneraciones]);

  // Auto-seleccionar primera generación disponible solo si no hay una seleccionada
  React.useEffect(() => {
    if (generacionesDisponibles.length > 0 && generacionSeleccionada === "") {
      setGeneracionSeleccionada("todos");
    }
  }, [generacionesDisponibles, generacionSeleccionada]);

  // Los datos ya están filtrados por generación
  const datosFiltrados = datos;

  const calcularTotales = () => {
    return {
      estimacionTotal: datosFiltrados.reduce((sum, d) => sum + d.estimacionActual, 0),
      gananciaTotal: datosFiltrados
        .filter(d => d.ganancia !== undefined)
        .reduce((sum, d) => sum + d.ganancia!, 0),
      cosechaTotal: datosFiltrados.reduce((sum, d) => sum + d.cosechaSemanal, 0)
    };
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Droplets className="h-6 w-6 text-blue-600" />
            Vista por Generaciones
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Registro de muestreos organizados por estanque
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

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generación
              </label>
              <Select value={generacionSeleccionada} onValueChange={setGeneracionSeleccionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una generación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las generaciones</SelectItem>
                  {generacionesDisponibles.map((generacion) => (
                    <SelectItem key={generacion} value={generacion}>
                      {generacion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                &nbsp;
              </label>
              <Button
                variant="outline"
                onClick={() => setGeneracionSeleccionada("todos")}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de totales */}
      {generacionSeleccionada && generacionSeleccionada !== "" && datosFiltrados.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-green-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Resumen - {generacionSeleccionada === "todos" ? "Todas las Generaciones" : generacionSeleccionada}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatWeight(calcularTotales().estimacionTotal)} kg
                </div>
                <div className="text-sm text-gray-600">Biomasa Total Estimada</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {datosFiltrados.length}
                </div>
                <div className="text-sm text-gray-600">Estanques con Datos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {datosFiltrados.length > 0 ? formatWeight(calcularTotales().estimacionTotal / datosFiltrados.length) : '0'} kg
                </div>
                <div className="text-sm text-gray-600">Promedio por Estanque</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Tabla de Muestreos por Estanque
              {generacionSeleccionada && generacionSeleccionada !== "" && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  - {generacionSeleccionada === "todos" ? "Todas las Generaciones" : `Generación: ${generacionSeleccionada}`}
                </span>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMuestreosExpandidos(!muestreosExpandidos)}
              className="flex items-center gap-1"
            >
              {muestreosExpandidos ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Ocultar Lances
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Mostrar Lances
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!generacionSeleccionada ? (
            <div className="text-center py-8">
              <div className="text-gray-500">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Selecciona una generación</p>
                <p className="text-sm">Elige una generación del filtro para ver los datos de muestreos</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Lances</TableHead>
                    {datosFiltrados.map((estanqueData, index) => (
                      <TableHead key={`${estanqueData.estanqueId}-${index}`} className="text-center min-w-[120px]">
                        <div className="font-semibold">{estanqueData.estanque}</div>
                        <div className="text-xs text-gray-500">
                          Área: {formatNumber(estanquesSupabase.find(e => e.id === estanqueData.estanqueId)?.area || 540)}m²
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Fila de generaciones (solo cuando se muestran todas las generaciones) */}
                  {generacionSeleccionada === "todos" && (
                    <TableRow className="bg-purple-50 border-b-2">
                      <TableCell className="font-bold text-purple-800">
                        Generación
                      </TableCell>
                      {datosFiltrados.map((estanqueData, index) => {
                        // Extraer la generación del nombre del estanque
                        const generacion = estanqueData.estanque.match(/\(Gen ([^)]+)\)/)?.[1] || 'N/A';
                        return (
                          <TableCell key={`gen-${estanqueData.estanqueId}-${index}`} className="text-center">
                            <span className="font-bold text-purple-800">
                              {generacion}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  )}

                  {/* Filas de lances (1-9) - Solo se muestran cuando están expandidos */}
                  {muestreosExpandidos && Array.from({ length: 9 }, (_, lanceIdx) => (
                    <TableRow key={lanceIdx + 1}>
                      <TableCell className="font-medium bg-gray-50">
                        {lanceIdx + 1}
                      </TableCell>
                      {datosFiltrados.map((estanqueData, index) => (
                        <TableCell key={`${estanqueData.estanqueId}-${index}`} className="text-center">
                          <span className="text-sm font-medium">
                            {estanqueData.lances[lanceIdx] ? formatNumber(estanqueData.lances[lanceIdx]) : '0'}
                          </span>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                  {/* Fila de mediana */}
                  <TableRow className="bg-yellow-50 border-t-2">
                    <TableCell className="font-bold text-yellow-800">
                      Mediana de los puntos
                    </TableCell>
                    {datosFiltrados.map((estanqueData, index) => (
                      <TableCell key={`${estanqueData.estanqueId}-${index}`} className="text-center">
                        <span className="font-bold text-yellow-800">
                          {formatNumber(estanqueData.mediana)}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Fila de estimación actual */}
                  <TableRow className="bg-green-50">
                    <TableCell className="font-bold text-green-800">
                      ESTIMACIÓN ACTUAL (KG)
                    </TableCell>
                    {datosFiltrados.map((estanqueData, index) => (
                      <TableCell key={`${estanqueData.estanqueId}-${index}`} className="text-center">
                        <span className="font-bold text-green-800">
                          {formatNumber(estanqueData.estimacionActual)}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Fila de estimación anterior */}
                  <TableRow className="bg-blue-50">
                    <TableCell className="font-bold text-blue-800">
                      ESTIMACIÓN ANTERIOR (KG)
                    </TableCell>
                    {datosFiltrados.map((estanqueData, index) => (
                      <TableCell key={`${estanqueData.estanqueId}-${index}`} className="text-center">
                        <span className="font-bold text-blue-800">
                          {estanqueData.estimacionAnterior ? formatNumber(estanqueData.estimacionAnterior) : '-'}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Fila de ganancia */}
                  <TableRow className="bg-yellow-50">
                    <TableCell className="font-bold text-yellow-800">
                      Ganancia
                    </TableCell>
                    {datosFiltrados.map((estanqueData, index) => (
                      <TableCell key={`${estanqueData.estanqueId}-${index}`} className="text-center">
                        <span className={`font-bold ${
                          estanqueData.ganancia && estanqueData.ganancia > 0 ? 'text-green-600' :
                          estanqueData.ganancia && estanqueData.ganancia < 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {estanqueData.ganancia !== undefined ?
                            (estanqueData.ganancia > 0 ? '+' : '') + formatNumber(estanqueData.ganancia) :
                            '-'
                          }
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* Fila de cosecha semanal */}
                  <TableRow>
                    <TableCell className="font-medium">
                      COSECHA SEMANAL
                    </TableCell>
                    {datosFiltrados.map((estanqueData, index) => (
                      <TableCell key={`${estanqueData.estanqueId}-${index}`} className="text-center">
                        <span className="font-medium">
                          {estanqueData.cosechaSemanal > 0 ? formatNumber(estanqueData.cosechaSemanal) : '0'}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>

                </TableBody>
              </Table>

              {datosFiltrados.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-500">
                    <Droplets className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No hay datos para esta generación</p>
                    <p className="text-sm">No se encontraron registros de muestreos para {generacionSeleccionada}</p>
                    <p className="text-xs text-blue-600 mt-2">Ve a Inventario Vivo para registrar muestreos</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}