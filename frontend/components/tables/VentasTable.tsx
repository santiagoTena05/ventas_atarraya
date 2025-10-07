"use client";

import { useState, useMemo } from "react";
import { type VentaRegistrada } from "@/lib/dummy-sales";
import { useSales } from "@/lib/hooks/useSales";
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
import { Search, Filter, Download, Eye } from "lucide-react";
import { EditSaleDialog } from "@/components/forms/EditSaleDialog";

interface VentasTableProps {
  salesHook: ReturnType<typeof useSales>;
}

export function VentasTable({ salesHook }: VentasTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOficina, setFilterOficina] = useState("todas");
  const [filterResponsable, setFilterResponsable] = useState("todos");
  const [filterEstatus, setFilterEstatus] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const itemsPerPage = 10;

  const { sales, isLoading } = salesHook;

  // Get unique values for filters
  const uniqueOficinas = Array.from(new Set(sales.map(sale => sale.oficina)));
  const uniqueResponsables = Array.from(new Set(sales.map(sale => sale.responsable)));
  const uniqueEstatus = Array.from(new Set(sales.map(sale => sale.estatusPagoCliente)));

  // Filter and search logic
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchesSearch =
        sale.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.folio.toString().includes(searchTerm) ||
        sale.noOrdenAtarraya?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.tipoCliente.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesOficina = !filterOficina || filterOficina === 'todas' || sale.oficina === filterOficina;
      const matchesResponsable = !filterResponsable || filterResponsable === 'todos' || sale.responsable === filterResponsable;
      const matchesEstatus = !filterEstatus || filterEstatus === 'todos' || sale.estatusPagoCliente === filterEstatus;

      return matchesSearch && matchesOficina && matchesResponsable && matchesEstatus;
    });
  }, [sales, searchTerm, filterOficina, filterResponsable, filterEstatus]);

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const getEstatusColor = (estatus: string) => {
    switch (estatus.toLowerCase()) {
      case 'pagado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cortesía':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterOficina("todas");
    setFilterResponsable("todos");
    setFilterEstatus("todos");
    setCurrentPage(1);
  };

  const handleEditSale = (saleId: number) => {
    setEditingSaleId(saleId);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingSaleId(null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900 mb-2">Cargando ventas...</div>
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
              <CardTitle className="text-2xl font-bold text-gray-900">
                Concentrado de Ventas
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Total de ventas: {filteredSales.length} registros
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-xs font-medium text-gray-600">
                  Buscar
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Cliente, folio, orden..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">
                  Oficina
                </Label>
                <Select value={filterOficina} onValueChange={setFilterOficina}>
                  <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {uniqueOficinas.map((oficina) => (
                      <SelectItem key={oficina} value={oficina}>
                        {oficina}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  Estatus Pago
                </Label>
                <Select value={filterEstatus} onValueChange={setFilterEstatus}>
                  <SelectTrigger className="border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {uniqueEstatus.map((estatus) => (
                      <SelectItem key={estatus} value={estatus}>
                        {estatus}
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
                    <TableHead className="font-semibold text-gray-900 text-xs">Oficina</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs">Responsable</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs">Cliente</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs">Tipo Cliente</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs">Fecha Entrega</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs">Producto</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs">Talla</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs text-right">Kgs</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs text-right">Precio/Kg</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs text-right">Total Orden</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs text-center">Estatus Pago</TableHead>
                    <TableHead className="font-semibold text-gray-900 text-xs text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-gray-50 border-b border-gray-100">
                      <TableCell className="font-medium text-sm">
                        #{sale.folio.toString().padStart(4, '0')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {sale.oficina}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {sale.responsable}
                      </TableCell>
                      <TableCell className="text-sm text-gray-900 font-medium">
                        {sale.cliente}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {sale.tipoCliente}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {formatDate(sale.fechaEntrega)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {sale.tipoProducto}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {sale.tallaCamaron || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 text-right">
                        {sale.enteroKgs.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 text-right">
                        {formatCurrency(sale.precioVenta)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-900 font-semibold text-right">
                        {formatCurrency(sale.totalOrden)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getEstatusColor(sale.estatusPagoCliente)}`}
                        >
                          {sale.estatusPagoCliente}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-100"
                          onClick={() => handleEditSale(sale.id)}
                          title="Editar venta"
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
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredSales.length)} de {filteredSales.length} resultados
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
                <div className="text-xs font-medium text-gray-600 mb-1">Total Ventas</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(filteredSales.reduce((sum, sale) => sum + sale.totalOrden, 0))}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xs font-medium text-gray-600 mb-1">Pagadas</div>
                <div className="text-lg font-bold text-green-700">
                  {filteredSales.filter(sale => sale.estatusPagoCliente === 'Pagado').length}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xs font-medium text-gray-600 mb-1">Pendientes</div>
                <div className="text-lg font-bold text-yellow-700">
                  {filteredSales.filter(sale => sale.estatusPagoCliente === 'Pendiente').length}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xs font-medium text-gray-600 mb-1">Total Kgs</div>
                <div className="text-lg font-bold text-gray-900">
                  {filteredSales.reduce((sum, sale) => sum + sale.enteroKgs, 0).toFixed(3)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Sale Dialog */}
      <EditSaleDialog
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        saleId={editingSaleId}
        salesHook={salesHook}
      />
    </div>
  );
}