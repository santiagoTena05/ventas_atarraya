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
  Minus
} from "lucide-react";

// Función para formatear números con comas
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', { maximumFractionDigits: 3 });
};

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

// Función para generar datos mock por estanque
const generarDatosPorEstanque = (estanques: any[], generacionSeleccionada: string): EstanqueData[] => {
  const datos: EstanqueData[] = [];

  estanques.slice(0, 8).forEach((estanque, estIdx) => {
    // Generar 9 lances (muestreos) por estanque
    const baseLance = 100 + (estIdx * 20);
    const lances = Array.from({ length: 9 }, (_, i) =>
      baseLance + Math.floor(Math.random() * 50) + (i * 5)
    );

    const mediana = [...lances].sort((a, b) => a - b)[4]; // Mediana real
    const area = estanque.area || 540;
    const estimacionActual = (mediana / 1000) * area;
    const estimacionAnterior = Math.random() > 0.5 ? estimacionActual - (Math.random() * 20 + 5) : undefined;
    const ganancia = estimacionAnterior ? estimacionActual - estimacionAnterior : undefined;

    datos.push({
      estanqueId: estanque.id,
      estanque: estanque.codigo || `EST-${estanque.id.toString().padStart(2, '0')}`,
      lances,
      mediana,
      estimacionActual,
      estimacionAnterior,
      ganancia,
      cosechaSemanal: Math.random() > 0.7 ? Math.random() * 15 : 0
    });
  });

  return datos;
};

export function InventarioGeneracionesView() {
  const { estanques: estanquesSupabase, isLoading: loadingEstanques, error } = useEstanques();
  const { sesiones, loading: loadingMuestreos, calcularDatosGeneraciones, obtenerGeneraciones } = useMuestreos();
  const [datos, setDatos] = useState<EstanqueData[]>([]);
  const [generacionSeleccionada, setGeneracionSeleccionada] = useState<string>("G-60");
  const [editandoCelda, setEditandoCelda] = useState<{estanque: string, lance: number} | null>(null);

  // Generar datos cuando se cargan los estanques y muestreos
  React.useEffect(() => {
    if (estanquesSupabase.length > 0) {
      if (sesiones.length > 0 && generacionSeleccionada !== "todos") {
        // Usar datos reales de muestreos para la generación seleccionada
        const datosReales: EstanqueData[] = [];

        estanquesSupabase.forEach((estanque) => {
          const sesionesEstanque = sesiones.filter(s =>
            s.generacion === generacionSeleccionada &&
            s.muestreos[estanque.id.toString()]
          );

          if (sesionesEstanque.length > 0) {
            const sesionReciente = sesionesEstanque[sesionesEstanque.length - 1];
            const muestreo = sesionReciente.muestreos[estanque.id.toString()];

            datosReales.push({
              estanqueId: estanque.id,
              estanque: estanque.codigo || `EST-${estanque.id.toString().padStart(2, '0')}`,
              lances: muestreo.muestreos,
              mediana: muestreo.promedio,
              estimacionActual: muestreo.biomasa,
              estimacionAnterior: undefined, // TODO: calcular basado en muestreos anteriores
              ganancia: undefined, // TODO: calcular basado en estimaciones
              cosechaSemanal: 0 // TODO: integrar con datos de cosecha
            });
          }
        });

        setDatos(datosReales);
      } else {
        // Usar datos mock si no hay muestreos registrados o no hay generación seleccionada
        const datosMock = generarDatosPorEstanque(estanquesSupabase, generacionSeleccionada || 'G-60');
        setDatos(datosMock);
      }
    }
  }, [estanquesSupabase, sesiones, generacionSeleccionada]);

  const generacionesDisponibles = useMemo(() => {
    if (sesiones.length > 0) {
      return obtenerGeneraciones();
    }
    return ['G-60', 'G-61', 'G-62', 'G-63', 'G-64', 'G-65', 'G-66', 'G-67', 'G-68', 'G-69'];
  }, [sesiones, obtenerGeneraciones]);

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
              📋 Mostrando datos de ejemplo - Registra muestreos para ver datos reales
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
      {generacionSeleccionada !== "todos" && datosFiltrados.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-green-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Resumen - {generacionSeleccionada}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(calcularTotales().estimacionTotal)} kg
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
                  {datosFiltrados.length > 0 ? formatNumber(calcularTotales().estimacionTotal / datosFiltrados.length) : '0'} kg
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
          <CardTitle className="text-lg">
            Tabla de Muestreos por Estanque
            {generacionSeleccionada !== "todos" && (
              <span className="text-sm font-normal text-gray-600 ml-2">
                - Generación: {generacionSeleccionada}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {generacionSeleccionada === "todos" ? (
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
                    {datosFiltrados.map((estanqueData) => (
                      <TableHead key={estanqueData.estanqueId} className="text-center min-w-[120px]">
                        <div className="font-semibold">{estanqueData.estanque}</div>
                        <div className="text-xs text-gray-500">
                          Área: {formatNumber(estanquesSupabase.find(e => e.id === estanqueData.estanqueId)?.area || 540)}m²
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Filas de lances (1-9) */}
                  {Array.from({ length: 9 }, (_, lanceIdx) => (
                    <TableRow key={lanceIdx + 1}>
                      <TableCell className="font-medium bg-gray-50">
                        {lanceIdx + 1}
                      </TableCell>
                      {datosFiltrados.map((estanqueData) => (
                        <TableCell key={estanqueData.estanqueId} className="text-center">
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
                    {datosFiltrados.map((estanqueData) => (
                      <TableCell key={estanqueData.estanqueId} className="text-center">
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
                    {datosFiltrados.map((estanqueData) => (
                      <TableCell key={estanqueData.estanqueId} className="text-center">
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
                    {datosFiltrados.map((estanqueData) => (
                      <TableCell key={estanqueData.estanqueId} className="text-center">
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
                    {datosFiltrados.map((estanqueData) => (
                      <TableCell key={estanqueData.estanqueId} className="text-center">
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
                    {datosFiltrados.map((estanqueData) => (
                      <TableCell key={estanqueData.estanqueId} className="text-center">
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
                    <p className="text-lg font-medium">No hay datos</p>
                    <p className="text-sm">No se encontraron registros para la generación seleccionada</p>
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