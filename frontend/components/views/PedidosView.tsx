"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon } from "lucide-react";
import { PedidoForm } from "@/components/forms/PedidoForm";
import { usePedidos, type Pedido } from "@/lib/hooks/usePedidos";

export function PedidosView() {
  const { pedidos, loading, addPedido, updatePedido, deletePedido } = usePedidos();
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

  const getEstatusColor = (estatus: string) => {
    switch (estatus) {
      case "Pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "En Proceso":
        return "bg-blue-100 text-blue-800";
      case "Lista para Entrega":
        return "bg-green-100 text-green-800";
      case "Completado":
        return "bg-gray-100 text-gray-800";
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-teal-600">
              {pedidos.filter(p => p.estatus === "Pendiente").length}
            </div>
            <div className="text-sm text-gray-600">Pendientes</div>
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
            <div className="text-2xl font-bold text-green-600">
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
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(pedido)}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(pedido.id)}
                          className="text-red-600 hover:text-red-700"
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
        <span className="font-medium">Nota:</span> Los pedidos son órdenes que aún no se han convertido en ventas.
        Úsalos para planificar cosechas y gestionar compromisos futuros con clientes.
      </div>
    </div>
  );
}