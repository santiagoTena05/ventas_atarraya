"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  XCircle,
  Search,
  Clock,
  Package,
  User,
  Calendar,
  Hash,
  Loader2,
  Filter
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirmacionVentas } from "@/hooks/useConfirmacionVentas";

export function ConfirmacionVentasView() {
  const {
    ventasRegistradas,
    loading,
    error,
    confirmarVenta,
    cancelarVenta,
    refreshData
  } = useConfirmacionVentas();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [versionFilter, setVersionFilter] = useState<string>("all");
  const [fechaFilter, setFechaFilter] = useState<string>("all");

  // Filtrar ventas
  const filteredVentas = ventasRegistradas.filter(venta => {
    // Filtro de búsqueda
    const matchesSearch = searchTerm === "" ||
      venta.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venta.version_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venta.talla_comercial.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de estatus
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "confirmado" && venta.confirmado) ||
      (statusFilter === "pendiente" && !venta.confirmado);

    // Filtro de versión
    const matchesVersion = versionFilter === "all" || venta.version_nombre === versionFilter;

    // Filtro de fecha (semana)
    const matchesFecha = fechaFilter === "all" || venta.fecha_semana === fechaFilter;

    return matchesSearch && matchesStatus && matchesVersion && matchesFecha;
  });

  // Obtener listas únicas para los filtros
  const versiones = Array.from(new Set(ventasRegistradas.map(v => v.version_nombre).filter(Boolean)));
  const fechas = Array.from(new Set(ventasRegistradas.map(v => v.fecha_semana))).sort();

  // Estadísticas
  const stats = {
    total: ventasRegistradas.length,
    confirmado: ventasRegistradas.filter(v => v.confirmado).length,
    pendiente: ventasRegistradas.filter(v => !v.confirmado).length,
    totalKg: Math.round(ventasRegistradas.reduce((sum, v) => sum + v.cantidad_kg, 0))
  };

  const handleConfirmar = async (id: string) => {
    if (confirm("¿Confirmar esta venta? Esto la marcará como procesada.")) {
      await confirmarVenta(id);
    }
  };

  const handleCancelar = async (id: string) => {
    if (confirm("¿Cancelar la confirmación de esta venta? Esto la marcará como pendiente.")) {
      await cancelarVenta(id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
  };

  const getStatusBadge = (confirmado: boolean) => {
    if (confirmado) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Confirmado
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Pendiente
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-teal-600" />
          <p className="text-gray-600">Cargando ventas registradas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={refreshData}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Confirmación de Ventas</h1>
          <p className="text-sm text-gray-600">
            Ventas registradas desde Estrategia Comercial pendientes de confirmación
          </p>
        </div>
        <Button onClick={refreshData} variant="outline">
          <Package className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total de Ventas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pendiente}</div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.confirmado}</div>
            <div className="text-sm text-gray-600">Confirmados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalKg}</div>
            <div className="text-sm text-gray-600">Total kg</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar cliente, versión, talla..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro de Estatus */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estatus</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro de Versión */}
            <Select value={versionFilter} onValueChange={setVersionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Versión" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las versiones</SelectItem>
                {versiones.map((version) => (
                  <SelectItem key={version} value={version || ""}>
                    {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro de Fecha */}
            <Select value={fechaFilter} onValueChange={setFechaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Semana" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las semanas</SelectItem>
                {fechas.map((fecha) => (
                  <SelectItem key={fecha} value={fecha}>
                    {formatDate(fecha)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Limpiar filtros */}
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setVersionFilter("all");
                setFechaFilter("all");
              }}
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Ventas */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {filteredVentas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {ventasRegistradas.length === 0
              ? "No hay ventas registradas"
              : "No se encontraron ventas que coincidan con los filtros"
            }
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-900">Cliente</th>
                  <th className="text-left p-4 font-medium text-gray-900">Versión</th>
                  <th className="text-left p-4 font-medium text-gray-900">Semana</th>
                  <th className="text-left p-4 font-medium text-gray-900">Talla</th>
                  <th className="text-right p-4 font-medium text-gray-900">Cantidad</th>
                  <th className="text-center p-4 font-medium text-gray-900">Estatus</th>
                  <th className="text-center p-4 font-medium text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredVentas.map((venta) => (
                  <tr key={venta.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {venta.cliente_nombre || `Cliente ID: ${venta.cliente_id}`}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{venta.version_nombre}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{formatDate(venta.fecha_semana)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{venta.talla_comercial}</Badge>
                    </td>
                    <td className="p-4 text-right font-medium text-gray-900">
                      {formatCurrency(venta.cantidad_kg)}
                    </td>
                    <td className="p-4 text-center">
                      {getStatusBadge(venta.confirmado)}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-1">
                        {!venta.confirmado ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConfirmar(venta.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Confirmar venta"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelar(venta.id)}
                            className="text-orange-600 hover:text-orange-700"
                            title="Cancelar confirmación"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Información del sistema */}
      <div className="text-sm text-blue-600 bg-blue-50 p-4 rounded-lg">
        <span className="font-medium">Sistema de Confirmación de Ventas:</span>
        <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
          <li><strong>Ventas Registradas:</strong> Provienen de versiones registradas en Estrategia Comercial</li>
          <li><strong>Pendientes:</strong> Esperan confirmación para procesar</li>
          <li><strong>Confirmados:</strong> Ventas procesadas y validadas</li>
          <li><strong>Integración:</strong> Las ventas confirmadas afectan el inventario disponible</li>
        </ul>
      </div>
    </div>
  );
}