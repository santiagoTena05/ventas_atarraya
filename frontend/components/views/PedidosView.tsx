"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, Package, CheckCircle, XCircle } from "lucide-react";
import { PedidoForm } from "@/components/forms/PedidoForm";
import { usePedidos, type Pedido } from "@/lib/hooks/usePedidos";
import { useInventoryAvailability } from "@/lib/hooks/useInventoryAvailability";

export function PedidosView() {
  const { pedidos, loading, addPedido, updatePedido, deletePedido, confirmPedido, cancelPedido } = usePedidos();
  const { getWeeklySummary, loading: inventoryLoading } = useInventoryAvailability();
  const [showForm, setShowForm] = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar pedidos por término de búsqueda
  const filteredPedidos = pedidos.filter(pedido =>
    pedido.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.responsable.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.estatus.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (data: Omit<Pedido, "id" | "fecha_creacion" | "fecha_actualizacion">) => {
    if (editingPedido) {
      await updatePedido(editingPedido.id, data);
    } else {
      await addPedido(data);
    }
    setShowForm(false);
    setEditingPedido(null);
  };

  const handleEdit = (pedido: Pedido) => {
    setEditingPedido(pedido);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este pedido?")) {
      await deletePedido(id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPedido(null);
  };

  const handleConfirmPedido = async (id: number) => {
    if (confirm("¿Confirmar este pedido? Esto reducirá automáticamente el inventario disponible.")) {
      await confirmPedido(id);
    }
  };

  const handleCancelPedido = async (id: number) => {
    if (confirm("¿Cancelar este pedido confirmado? Esto restaurará el inventario.")) {
      await cancelPedido(id);
    }
  };

  const getEstatusColor = (estatus: string) => {
    switch (estatus) {
      case "Pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "Confirmado":
        return "bg-green-100 text-green-800";
      case "En Proceso":
        return "bg-blue-100 text-blue-800";
      case "Lista para Entrega":
        return "bg-purple-100 text-purple-800";
      case "Completado":
        return "bg-gray-100 text-gray-800";
      case "Cancelado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
  };

  if (showForm) {
    return (
      <div className="container mx-auto p-6">
        <PedidoForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          initialData={editingPedido || undefined}
          isEditing={!!editingPedido}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Pedidos</h1>
          <p className="text-sm text-gray-600">Registro y seguimiento de órdenes pendientes</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="bg-white rounded-lg border p-4">
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar pedidos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {pedidos.filter(p => p.estatus === "Pendiente").length}
            </div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {pedidos.filter(p => p.estatus === "Confirmado").length}
            </div>
            <div className="text-sm text-gray-600">Confirmados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {pedidos.filter(p => p.estatus === "En Proceso").length}
            </div>
            <div className="text-sm text-gray-600">En Proceso</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {pedidos.filter(p => p.estatus === "Lista para Entrega").length}
            </div>
            <div className="text-sm text-gray-600">Listos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">
              {pedidos.length}
            </div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de Inventario Disponible */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-900">Inventario Disponible para Pedidos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {inventoryLoading ? (
            <div className="text-gray-600">Cargando inventario disponible...</div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-blue-700 mb-3">
                📊 Inventario Neto: Base proyectado - Ventas registradas (Estrategia Comercial + Pedidos confirmados)
              </div>

              {getWeeklySummary().slice(0, 6).map((week) => (
                <div key={week.fecha_semana} className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      Semana del {new Date(week.fecha_semana).toLocaleDateString('es-MX')}
                    </span>
                    <Badge className="bg-blue-100 text-blue-800">
                      Total: {Math.round(week.total_disponible)}kg
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                    {Object.entries(week.inventory_by_size)
                      .filter(([_, data]) => data.inventario_disponible > 0)
                      .sort(([tallaA], [tallaB]) => {
                        // Sort by talla size descending (largest first)
                        const getMaxSize = (talla: string) => parseInt(talla.split('-')[1] || '0');
                        return getMaxSize(tallaB) - getMaxSize(tallaA);
                      })
                      .map(([talla, data]) => (
                      <div key={talla} className="text-center p-2 bg-gray-50 rounded hover:bg-blue-50 cursor-pointer transition-colors">
                        <div className="text-xs text-gray-600 font-medium">{talla}</div>
                        <div className="font-bold text-blue-900">{Math.round(data.inventario_disponible)}kg</div>
                        <div className="text-xs text-gray-500">Base: {Math.round(data.inventario_base)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {getWeeklySummary().length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No hay inventario disponible. Verificar Estrategia Comercial.
                </div>
              )}

              <div className="text-xs text-gray-600 mt-2 p-2 bg-blue-50 rounded">
                💡 <strong>Inventario Integrado:</strong> Los pedidos confirmados reducen automáticamente este inventario,
                manteniendo sincronización completa con la vista de Estrategia Comercial
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Pedidos */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando pedidos...</div>
        ) : filteredPedidos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? "No se encontraron pedidos que coincidan con la búsqueda" : "No hay pedidos registrados"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-900">Cliente</th>
                  <th className="text-left p-4 font-medium text-gray-900">Responsable</th>
                  <th className="text-left p-4 font-medium text-gray-900">Producto</th>
                  <th className="text-left p-4 font-medium text-gray-900">Talla</th>
                  <th className="text-right p-4 font-medium text-gray-900">Cantidad</th>
                  <th className="text-left p-4 font-medium text-gray-900">Fecha Entrega</th>
                  <th className="text-left p-4 font-medium text-gray-900">Estatus</th>
                  <th className="text-center p-4 font-medium text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPedidos.map((pedido) => (
                  <tr key={pedido.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-gray-900">{pedido.cliente}</div>
                        <div className="text-sm text-gray-500">{pedido.tipo_cliente}</div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-900">{pedido.responsable}</td>
                    <td className="p-4 text-gray-900">{pedido.producto}</td>
                    <td className="p-4 text-gray-900">{pedido.talla}</td>
                    <td className="p-4 text-right text-gray-900">{formatCurrency(pedido.cantidad_estimada)}</td>
                    <td className="p-4 text-gray-900">{formatDate(pedido.fecha_estimada_entrega)}</td>
                    <td className="p-4">
                      <Badge className={getEstatusColor(pedido.estatus)}>
                        {pedido.estatus}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-1">
                        {/* Actions based on status */}
                        {pedido.estatus === "Pendiente" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConfirmPedido(pedido.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Confirmar pedido"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}

                        {pedido.estatus === "Confirmado" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelPedido(pedido.id)}
                            className="text-orange-600 hover:text-orange-700"
                            title="Cancelar pedido confirmado"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(pedido)}
                          title="Editar pedido"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(pedido.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Eliminar pedido"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="text-sm text-blue-600 bg-blue-50 p-4 rounded-lg">
        <span className="font-medium">Sistema Integrado:</span>
        <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
          <li><strong>Pendientes:</strong> Pedidos creados pero no confirmados</li>
          <li><strong>Confirmados:</strong> Reducen automáticamente el inventario neto de Estrategia Comercial</li>
          <li><strong>Cancelar Confirmado:</strong> Restaura automáticamente el inventario disponible</li>
          <li><strong>Inventario:</strong> Sincronización completa con proyecciones de biomasa</li>
        </ul>
      </div>
    </div>
  );
}