"use client";

import { useState, useMemo } from "react";
import { useCosechas } from "@/lib/hooks/useCosechas";
import { type CosechaRegistrada } from "@/lib/schemas-cosecha";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, Download, Eye, Fish } from "lucide-react";

interface CosechasTableProps {
  cosechasHook: ReturnType<typeof useCosechas>;
}

export function CosechasTable({ cosechasHook }: CosechasTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResponsable, setFilterResponsable] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { cosechas, isLoading } = cosechasHook;

  // Get unique values for filters
  const uniqueResponsables = Array.from(new Set(cosechas.map(cosecha => cosecha.responsable)));

  // Filter and search logic
  const filteredCosechas = useMemo(() => {
    return cosechas.filter((cosecha) => {
      const matchesSearch =
        cosecha.folio.toString().includes(searchTerm) ||
        cosecha.responsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cosecha.oficina.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cosecha.estanques.some(est => est.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
        cosecha.tallas.some(talla => talla.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesResponsable = !filterResponsable || filterResponsable === 'todos' || cosecha.responsable === filterResponsable;

      return matchesSearch && matchesResponsable;
    });
  }, [cosechas, searchTerm, filterResponsable]);

  // Pagination
  const totalPages = Math.ceil(filteredCosechas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCosechas = filteredCosechas.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatKg = (kg: number) => {
    return `${kg.toFixed(3)} kg`;
  };


  const resetFilters = () => {
    setSearchTerm("");
    setFilterResponsable("todos");
    setCurrentPage(1);
  };

  const handleViewDetails = (cosechaId: number) => {
    console.log("Ver detalles de cosecha:", cosechaId);
    // TODO: Implementar modal de detalles
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900 mb-2">Cargando cosechas...</div>
            <div className="text-sm text-gray-600">Un momento por favor</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="border-gray-200">
        <CardHeader className="bg-white border-b border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Fish className="h-6 w-6 text-teal-600" />
                Registro de Cosechas
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Total de cosechas: {filteredCosechas.length} registros
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 bg-white">
          {/* Filters */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Filter className="h-4 w-4" />
              Filtros y Búsqueda
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-xs font-medium text-gray-600">
                  Buscar
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Folio, responsable, estanque..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">
                  Responsable
                </Label>
                <Select value={filterResponsable} onValueChange={setFilterResponsable}>
                  <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {uniqueResponsables.map((responsable) => (
                      <SelectItem key={responsable} value={responsable}>
                        {responsable}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">
                  Acciones
                </Label>
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-900 text-xs">Folio</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs">Responsable</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs">Oficina</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs">Fecha Cosecha</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs text-right">Peso Total</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs">Estanques</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs">Tallas</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs">Pedido</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCosechas.map((cosecha) => (
                    <TableRow key={cosecha.id} className="hover:bg-gray-50 border-b border-gray-100">
                      <TableCell className="font-medium text-sm">
                        #{cosecha.folio.toString().padStart(4, '0')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {cosecha.responsable}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {cosecha.oficina}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {formatDate(cosecha.fechaCosecha)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-900 font-semibold text-right">
                        {formatKg(cosecha.pesoTotalKg)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        <div className="space-y-1">
                          {cosecha.estanques.slice(0, 2).map((estanque, idx) => (
                            <div key={idx} className="text-xs">
                              {estanque.nombre}: {formatKg(estanque.pesoKg)}
                            </div>
                          ))}
                          {cosecha.estanques.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{cosecha.estanques.length - 2} más...
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        <div className="space-y-1">
                          {cosecha.tallas.slice(0, 2).map((talla, idx) => (
                            <div key={idx} className="text-xs">
                              {talla.nombre}: {formatKg(talla.pesoKg)}
                            </div>
                          ))}
                          {cosecha.tallas.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{cosecha.tallas.length - 2} más...
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {cosecha.pedidoInfo ? (
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900">
                              #{cosecha.pedidoId} - {cosecha.pedidoInfo.cliente}
                            </div>
                            <div className="text-gray-600">
                              {cosecha.pedidoInfo.producto} {cosecha.pedidoInfo.talla}
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                cosecha.pedidoInfo.estatus === "Pendiente" ? "border-yellow-300 text-yellow-700" :
                                cosecha.pedidoInfo.estatus === "En Proceso" ? "border-blue-300 text-blue-700" :
                                cosecha.pedidoInfo.estatus === "Lista para Entrega" ? "border-green-300 text-green-700" :
                                "border-gray-300 text-gray-700"
                              }
                            >
                              {cosecha.pedidoInfo.estatus}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-100"
                          onClick={() => handleViewDetails(cosecha.id)}
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4 text-gray-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredCosechas.length)} de {filteredCosechas.length} resultados
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="border-gray-300"
                >
                  Anterior
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page =>
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-gray-400">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 p-0 ${
                            currentPage === page
                              ? "bg-gray-900 text-white"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </Button>
                      </div>
                    ))
                  }
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="border-gray-300"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xs font-medium text-gray-600 mb-1">Total Cosechas</div>
                <div className="text-lg font-bold text-gray-900">
                  {filteredCosechas.length}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xs font-medium text-gray-600 mb-1">Procesadas</div>
                <div className="text-lg font-bold text-green-700">
                  {filteredCosechas.filter(cosecha => cosecha.estado === 'procesada').length}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xs font-medium text-gray-600 mb-1">Pendientes</div>
                <div className="text-lg font-bold text-yellow-700">
                  {filteredCosechas.filter(cosecha => cosecha.estado === 'pendiente').length}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xs font-medium text-gray-600 mb-1">Peso Total</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatKg(filteredCosechas.reduce((sum, cosecha) => sum + cosecha.pesoTotalKg, 0))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}