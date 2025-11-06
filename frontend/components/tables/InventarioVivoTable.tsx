"use client";

import React, { useState, useMemo } from "react";
import { useEstanques } from "@/lib/hooks/useEstanques";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Filter,
  Download,
  Eye
} from "lucide-react";
import { format, parseISO, isWithinInterval, subDays } from "date-fns";
import { es } from "date-fns/locale";

interface RegistroInventario {
  id: string;
  estanqueId: string;
  estanqueNombre: string;
  estanqueCodigo: string;
  fecha: string;
  semana: number;
  muestreos: number[];
  promedio: number;
  biomasa: number;
  cosecha: number;
  biomasaAnterior?: number;
  ganancia?: number;
  tendencia: 'subida' | 'bajada' | 'estable';
}

// Función para generar datos mock basados en estanques reales
const generarRegistrosMock = (estanques: any[]): RegistroInventario[] => {
  const registros: RegistroInventario[] = [];
  const fechas = ['2024-11-03', '2024-10-27', '2024-10-20'];
  const semanas = [44, 43, 42];

  estanques.slice(0, 6).forEach((estanque, idx) => {
    fechas.forEach((fecha, fechaIdx) => {
      const basePromedio = 120 + (idx * 15) + (fechaIdx * 10);
      const muestreos = Array.from({ length: 9 }, () =>
        basePromedio + Math.floor(Math.random() * 20) - 10
      );
      const promedio = muestreos.reduce((sum, val) => sum + val, 0) / 9;
      const area = estanque.area || 540;
      const biomasa = (promedio / 1000) * area;

      registros.push({
        id: `${estanque.id}-${fechaIdx}`,
        estanqueId: estanque.id.toString(),
        estanqueNombre: estanque.nombre,
        estanqueCodigo: estanque.codigo || `EST-${estanque.id.toString().padStart(2, '0')}`,
        fecha,
        semana: semanas[fechaIdx],
        muestreos,
        promedio,
        biomasa,
        cosecha: fechaIdx === 0 ? Math.random() * 20 : 0,
        biomasaAnterior: fechaIdx > 0 ? biomasa - (Math.random() * 10) : undefined,
        ganancia: fechaIdx > 0 ? Math.random() * 8 : undefined,
        tendencia: Math.random() > 0.2 ? 'subida' : 'bajada'
      });
    });
  });

  return registros;
};

type SortField = 'fecha' | 'estanque' | 'promedio' | 'biomasa' | 'ganancia';
type SortDirection = 'asc' | 'desc';

export function InventarioVivoTable() {
  const { estanques: estanquesSupabase, isLoading: loadingEstanques, error } = useEstanques();
  const [registros, setRegistros] = useState<RegistroInventario[]>([]);
  const [filtroEstanque, setFiltroEstanque] = useState<string>("todos");
  const [filtroFecha, setFiltroFecha] = useState<string>("7dias");
  const [busqueda, setBusqueda] = useState("");
  const [sortField, setSortField] = useState<SortField>('fecha');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Generar registros mock cuando se cargan los estanques
  React.useEffect(() => {
    if (estanquesSupabase.length > 0) {
      const registrosMock = generarRegistrosMock(estanquesSupabase);
      setRegistros(registrosMock);
    }
  }, [estanquesSupabase]);

  const estanquesUnicos = useMemo(() => {
    const estanques = registros.reduce((acc, registro) => {
      if (!acc.some(e => e.id === registro.estanqueId)) {
        acc.push({
          id: registro.estanqueId,
          nombre: registro.estanqueNombre,
          codigo: registro.estanqueCodigo
        });
      }
      return acc;
    }, [] as Array<{id: string, nombre: string, codigo: string}>);

    return estanques.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [registros]);

  const registrosFiltrados = useMemo(() => {
    let filtered = registros;

    // Filtro por estanque
    if (filtroEstanque !== "todos") {
      filtered = filtered.filter(r => r.estanqueId === filtroEstanque);
    }

    // Filtro por fecha
    const ahora = new Date();
    let fechaInicio: Date;

    switch (filtroFecha) {
      case "7dias":
        fechaInicio = subDays(ahora, 7);
        break;
      case "30dias":
        fechaInicio = subDays(ahora, 30);
        break;
      case "90dias":
        fechaInicio = subDays(ahora, 90);
        break;
      default:
        fechaInicio = subDays(ahora, 365);
    }

    filtered = filtered.filter(r => {
      const fechaRegistro = parseISO(r.fecha);
      return isWithinInterval(fechaRegistro, { start: fechaInicio, end: ahora });
    });

    // Filtro por búsqueda
    if (busqueda) {
      filtered = filtered.filter(r =>
        r.estanqueNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.estanqueCodigo.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'fecha':
          aValue = new Date(a.fecha);
          bValue = new Date(b.fecha);
          break;
        case 'estanque':
          aValue = a.estanqueNombre;
          bValue = b.estanqueNombre;
          break;
        case 'promedio':
          aValue = a.promedio;
          bValue = b.promedio;
          break;
        case 'biomasa':
          aValue = a.biomasa;
          bValue = b.biomasa;
          break;
        case 'ganancia':
          aValue = a.ganancia || 0;
          bValue = b.ganancia || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [registros, filtroEstanque, filtroFecha, busqueda, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const calcularEstadisticas = () => {
    const total = registrosFiltrados.length;
    const promedioGeneral = registrosFiltrados.reduce((sum, r) => sum + r.promedio, 0) / total || 0;
    const biomasaTotal = registrosFiltrados.reduce((sum, r) => sum + r.biomasa, 0);
    const cosechaTotal = registrosFiltrados.reduce((sum, r) => sum + r.cosecha, 0);
    const gananciaPromedio = registrosFiltrados.reduce((sum, r) => sum + (r.ganancia || 0), 0) / total || 0;

    return {
      total,
      promedioGeneral,
      biomasaTotal,
      cosechaTotal,
      gananciaPromedio
    };
  };

  const stats = calcularEstadisticas();

  const formatearFecha = (fecha: string) => {
    return format(parseISO(fecha), "dd MMM yyyy", { locale: es });
  };

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'subida':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'bajada':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTendenciaColor = (tendencia: string) => {
    switch (tendencia) {
      case 'subida':
        return 'text-green-600 bg-green-50';
      case 'bajada':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Mostrar loading mientras cargan los estanques
  if (loadingEstanques) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos de estanques...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si hay problema cargando datos
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
            Historial de Inventario Vivo
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Registro histórico de muestreos y biomasa por estanque
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Registros</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Eye className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Promedio General</p>
                <p className="text-2xl font-bold text-gray-900">{stats.promedioGeneral.toFixed(1)}g</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Biomasa Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.biomasaTotal.toFixed(1)} kg</p>
              </div>
              <Droplets className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ganancia Promedio</p>
                <p className="text-2xl font-bold text-gray-900">+{stats.gananciaPromedio.toFixed(1)} kg</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-600" />
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <Input
                placeholder="Buscar estanque..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estanque
              </label>
              <Select value={filtroEstanque} onValueChange={setFiltroEstanque}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estanques</SelectItem>
                  {estanquesUnicos.map((estanque) => (
                    <SelectItem key={estanque.id} value={estanque.id}>
                      {estanque.nombre} ({estanque.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <Select value={filtroFecha} onValueChange={setFiltroFecha}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7dias">Últimos 7 días</SelectItem>
                  <SelectItem value="30dias">Últimos 30 días</SelectItem>
                  <SelectItem value="90dias">Últimos 90 días</SelectItem>
                  <SelectItem value="todos">Todos los registros</SelectItem>
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
                  setFiltroEstanque("todos");
                  setFiltroFecha("7dias");
                  setBusqueda("");
                }}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Registros de Inventario ({registrosFiltrados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('fecha')}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Fecha
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('estanque')}
                  >
                    <div className="flex items-center gap-2">
                      Estanque
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Semana</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('promedio')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Promedio
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('biomasa')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Biomasa
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 text-right"
                    onClick={() => handleSort('ganancia')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Ganancia
                      <ArrowUpDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Cosecha</TableHead>
                  <TableHead className="text-center">Tendencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosFiltrados.map((registro) => (
                  <TableRow key={registro.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{formatearFecha(registro.fecha)}</div>
                        <div className="text-sm text-gray-500">
                          {format(parseISO(registro.fecha), "EEEE", { locale: es })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{registro.estanqueNombre}</div>
                        <div className="text-sm text-gray-500">{registro.estanqueCodigo}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{registro.semana}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium">{registro.promedio.toFixed(1)}g</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium">{registro.biomasa.toFixed(1)} kg</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {registro.ganancia !== undefined ? (
                        <span className={`font-medium ${
                          registro.ganancia > 0 ? 'text-green-600' :
                          registro.ganancia < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {registro.ganancia > 0 ? '+' : ''}{registro.ganancia.toFixed(1)} kg
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {registro.cosecha > 0 ? (
                        <span className="font-medium text-blue-600">
                          {registro.cosecha.toFixed(1)} kg
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        getTendenciaColor(registro.tendencia)
                      }`}>
                        {getTendenciaIcon(registro.tendencia)}
                        {registro.tendencia === 'subida' ? 'Subida' :
                         registro.tendencia === 'bajada' ? 'Bajada' : 'Estable'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {registrosFiltrados.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  <Droplets className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No hay registros</p>
                  <p className="text-sm">No se encontraron registros con los filtros aplicados</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}