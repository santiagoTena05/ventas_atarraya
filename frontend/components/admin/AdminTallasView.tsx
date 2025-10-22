"use client";

import React, { useState, useEffect } from "react";
import { useAdminPrecios, type PrecioCompleto } from "@/lib/hooks/useAdminPrecios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pencil,
  Save,
  X,
  TrendingUp,
  Package,
  DollarSign,
  Ruler,
  Plus
} from "lucide-react";

interface EditFormData {
  id: number;
  talla_nombre: string;
  peso_min_gramos: number;
  peso_max_gramos: number;
  conteo_min_kilo: number;
  conteo_max_kilo: number;
  precio_mayorista: number;
  precio_restaurante: number;
  precio_menudeo: number;
  cantidad_min_mayorista: number;
  activo: boolean;
}

export function AdminTallasView() {
  const { precios, isLoading, isUpdating, updatePrecios, toggleActivo } = useAdminPrecios();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'save' | 'toggle', data?: any } | null>(null);

  // Manejar inicio de edición
  const handleEdit = (precio: PrecioCompleto) => {
    setEditingId(precio.id);
    setEditForm({
      id: precio.id,
      talla_nombre: precio.talla_nombre,
      peso_min_gramos: precio.peso_min_gramos,
      peso_max_gramos: precio.peso_max_gramos,
      conteo_min_kilo: precio.conteo_min_kilo,
      conteo_max_kilo: precio.conteo_max_kilo,
      precio_mayorista: precio.precio_mayorista,
      precio_restaurante: precio.precio_restaurante,
      precio_menudeo: precio.precio_menudeo,
      cantidad_min_mayorista: precio.cantidad_min_mayorista,
      activo: precio.activo
    });
  };

  // Cancelar edición
  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

  // Confirmar guardado
  const handleSave = () => {
    if (!editForm) return;

    setConfirmAction({ type: 'save', data: editForm });
    setShowConfirmDialog(true);
  };

  // Confirmar toggle de estado
  const handleToggleActivo = (precioId: number) => {
    setConfirmAction({ type: 'toggle', data: precioId });
    setShowConfirmDialog(true);
  };

  // Ejecutar acción confirmada
  const executeConfirmedAction = async () => {
    if (!confirmAction) return;

    let success = false;

    if (confirmAction.type === 'save' && editForm) {
      const { id, talla_nombre, peso_min_gramos, peso_max_gramos, conteo_min_kilo, conteo_max_kilo, ...formData } = editForm;
      // Solo actualizamos los precios, no las características de la talla
      success = await updatePrecios(id, formData);
      if (success) {
        setEditingId(null);
        setEditForm(null);
      }
    } else if (confirmAction.type === 'toggle') {
      success = await toggleActivo(confirmAction.data);
    }

    setShowConfirmDialog(false);
    setConfirmAction(null);

    if (success) {
      console.log('✅ Acción ejecutada exitosamente');
    } else {
      console.error('❌ Error ejecutando acción');
    }
  };

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tallas y precios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Ruler className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Tallas Configuradas</p>
                <p className="text-2xl font-bold text-blue-600">{precios.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Tallas Activas</p>
                <p className="text-2xl font-bold text-green-600">
                  {precios.filter(p => p.activo).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Precio Promedio</p>
                <p className="text-2xl font-bold text-orange-600">
                  {precios.length > 0
                    ? formatCurrency(precios.reduce((sum, p) => sum + p.precio_restaurante, 0) / precios.length)
                    : '$0.00'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-teal-600" />
              <div>
                <p className="text-sm text-gray-600">Rango de Precios</p>
                <p className="text-lg font-bold text-teal-600">
                  {precios.length > 0
                    ? `${formatCurrency(Math.min(...precios.map(p => p.precio_menudeo)))} - ${formatCurrency(Math.max(...precios.map(p => p.precio_menudeo)))}`
                    : '$0.00'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla integrada de tallas y precios */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tallas y Precios de Camarón</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Gestión integrada de tallas comerciales y precios por tipo de cliente
              </p>
            </div>
            {/* Futuro botón para agregar nueva talla */}
            {/* <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nueva Talla
            </Button> */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-gray-900">Talla</th>
                  <th className="text-left p-3 font-medium text-gray-900">Peso (g)</th>
                  <th className="text-left p-3 font-medium text-gray-900">Conteo/Kilo</th>
                  <th className="text-right p-3 font-medium text-gray-900">Mayorista (≥150kg)</th>
                  <th className="text-right p-3 font-medium text-gray-900">Restaurante</th>
                  <th className="text-right p-3 font-medium text-gray-900">Menudeo</th>
                  <th className="text-center p-3 font-medium text-gray-900">Estado</th>
                  <th className="text-center p-3 font-medium text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {precios.map((precio) => (
                  <tr key={precio.id} className={`border-b hover:bg-gray-50 ${!precio.activo ? 'opacity-60' : ''}`}>
                    {/* Información de talla (solo lectura) */}
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{precio.talla_nombre}</div>
                      <div className="text-xs text-gray-500">ID: {precio.talla_camaron_id}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-gray-700 font-mono">
                        {precio.peso_min_gramos}g - {precio.peso_max_gramos}g
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-gray-700 font-mono">
                        {precio.conteo_min_kilo} - {precio.conteo_max_kilo}
                      </div>
                    </td>

                    {/* Precios editables */}
                    {editingId === precio.id && editForm ? (
                      <>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.precio_mayorista}
                            onChange={(e) => setEditForm({...editForm, precio_mayorista: parseFloat(e.target.value) || 0})}
                            className="w-24 text-right font-mono"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.precio_restaurante}
                            onChange={(e) => setEditForm({...editForm, precio_restaurante: parseFloat(e.target.value) || 0})}
                            className="w-24 text-right font-mono"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.precio_menudeo}
                            onChange={(e) => setEditForm({...editForm, precio_menudeo: parseFloat(e.target.value) || 0})}
                            className="w-24 text-right font-mono"
                            placeholder="0.00"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-right font-mono text-sm text-green-700 font-semibold">
                          {formatCurrency(precio.precio_mayorista)}
                        </td>
                        <td className="p-3 text-right font-mono text-sm text-blue-700 font-semibold">
                          {formatCurrency(precio.precio_restaurante)}
                        </td>
                        <td className="p-3 text-right font-mono text-sm text-purple-700 font-semibold">
                          {formatCurrency(precio.precio_menudeo)}
                        </td>
                      </>
                    )}

                    <td className="p-3 text-center">
                      <Badge
                        variant={precio.activo ? "default" : "secondary"}
                        className={`cursor-pointer ${precio.activo ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-500'}`}
                        onClick={() => editingId !== precio.id && handleToggleActivo(precio.id)}
                      >
                        {precio.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>

                    <td className="p-3 text-center">
                      {editingId === precio.id ? (
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={handleSave}
                            disabled={isUpdating}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isUpdating}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(precio)}
                          disabled={isUpdating}
                          className="hover:bg-blue-50 hover:border-blue-300"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Información sobre precios */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900">
              <h4 className="font-medium mb-1">Sistema de Precios por Tipo de Cliente</h4>
              <ul className="space-y-1 text-blue-800">
                <li><strong>Mayorista:</strong> Precio especial para órdenes ≥150kg</li>
                <li><strong>Restaurante:</strong> Precio estándar para establecimientos comerciales</li>
                <li><strong>Menudeo:</strong> Precio para venta al público general</li>
              </ul>
              <p className="mt-2 text-xs text-blue-700">
                Los precios se aplican automáticamente en el sistema de ventas según el tipo de cliente y cantidad de la orden.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmación */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Cambios</DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'save'
                ? '¿Estás seguro de que quieres guardar los cambios en los precios? Esto afectará inmediatamente el cálculo de nuevas ventas.'
                : '¿Estás seguro de que quieres cambiar el estado de esta talla? Esto puede afectar la disponibilidad en el sistema de ventas.'
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              onClick={executeConfirmedAction}
              disabled={isUpdating}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isUpdating ? 'Procesando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}