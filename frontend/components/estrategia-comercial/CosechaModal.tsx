"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Edit } from 'lucide-react';
import { CATEGORIAS_PRODUCTOS, TALLAS_COMERCIALES, type Cliente, type CosechaAsignada, type ProyeccionInventario } from '@/hooks/useEstrategiaComercialData';
import { RegisterSaleButton } from './RegisterSaleButton';

interface CosechaModalProps {
  isOpen: boolean;
  onClose: () => void;
  fecha: string;
  talla: string;
  clientes: Cliente[];
  cosechasExistentes: CosechaAsignada[];
  proyeccionInventario?: ProyeccionInventario;
  onSave: (cosecha: Omit<CosechaAsignada, 'id'>) => Promise<void>;
  onUpdate: (cosechaId: string, cosecha: Omit<CosechaAsignada, 'id'>) => Promise<void>;
  onDelete: (cosechaId: string) => Promise<void>;
  versionId?: string; // Add version ID for registration
  onRefresh?: () => void; // Add refresh callback
  onEdit?: (cosecha: CosechaAsignada) => void; // Add edit callback
}

interface FormData {
  cliente_id: number | null;
  categoria: string;
  presentacion: string;
  cantidad_kg: number;
  recurrente: boolean;
}

interface EditingData {
  cosechaId: string;
  formData: FormData;
}

export function CosechaModal({
  isOpen,
  onClose,
  fecha,
  talla,
  clientes,
  cosechasExistentes,
  proyeccionInventario,
  onSave,
  onUpdate,
  onDelete,
  versionId,
  onRefresh,
  onEdit
}: CosechaModalProps) {
  const [formData, setFormData] = useState<FormData>({
    cliente_id: null,
    categoria: '',
    presentacion: '',
    cantidad_kg: 0,
    recurrente: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCosecha, setEditingCosecha] = useState<EditingData | null>(null);

  // Resetear form cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setFormData({
        cliente_id: null,
        categoria: '',
        presentacion: '',
        cantidad_kg: 0,
        recurrente: false
      });
      setEditingCosecha(null);
    }
  }, [isOpen]);

  // Handle edit cosecha
  const handleEditCosecha = (cosecha: CosechaAsignada) => {
    const editData: FormData = {
      cliente_id: cosecha.cliente_id,
      categoria: cosecha.categoria,
      presentacion: cosecha.presentacion,
      cantidad_kg: cosecha.cantidad_kg,
      recurrente: cosecha.recurrente
    };

    setFormData(editData);
    setEditingCosecha({
      cosechaId: cosecha.id!,
      formData: editData
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCosecha(null);
    setFormData({
      cliente_id: null,
      categoria: '',
      presentacion: '',
      cantidad_kg: 0,
      recurrente: false
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleCategoriaChange = (categoria: string) => {
    setFormData(prev => ({
      ...prev,
      categoria,
      presentacion: '' // Reset presentación cuando cambia categoría
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cliente_id || !formData.categoria || !formData.presentacion || formData.cantidad_kg <= 0) {
      alert('Todos los campos son obligatorios');
      return;
    }

    setIsSubmitting(true);
    try {
      const cosechaData = {
        fecha,
        talla,
        cliente_id: formData.cliente_id,
        categoria: formData.categoria,
        presentacion: formData.presentacion,
        cantidad_kg: formData.cantidad_kg,
        recurrente: formData.recurrente
      };

      if (editingCosecha) {
        // Update existing cosecha
        await onUpdate(editingCosecha.cosechaId, cosechaData);
        setEditingCosecha(null);
      } else {
        // Create new cosecha
        await onSave(cosechaData);
      }

      // Resetear form después de guardar exitosamente
      setFormData({
        cliente_id: null,
        categoria: '',
        presentacion: '',
        cantidad_kg: 0,
        recurrente: false
      });
    } catch (error) {
      console.error('Error guardando cosecha:', error);
      alert('Error guardando cosecha. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cosechaId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta cosecha?')) {
      try {
        await onDelete(cosechaId);
      } catch (error) {
        console.error('Error eliminando cosecha:', error);
        alert('Error eliminando cosecha. Intenta nuevamente.');
      }
    }
  };

  const presentacionesDisponibles = formData.categoria
    ? CATEGORIAS_PRODUCTOS[formData.categoria as keyof typeof CATEGORIAS_PRODUCTOS]?.presentaciones || []
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {formatDate(fecha)} / {talla}
          </DialogTitle>
          <DialogDescription>
            Asignar cosechas para la semana del {formatDate(fecha)} - Talla {talla}
          </DialogDescription>
          {proyeccionInventario && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    Inventario Total:
                  </span>
                  <span className="text-sm font-medium text-blue-900">
                    {proyeccionInventario.inventario_neto} kg
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    Ventas Proyectadas:
                  </span>
                  <span className="text-sm font-medium text-red-700">
                    -{proyeccionInventario.ventas_proyectadas} kg
                  </span>
                </div>
                <div className="border-t border-blue-300 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-800">
                      Inventario Disponible:
                    </span>
                    <span className="text-lg font-bold text-green-700">
                      {/* TEMPORARY: Use week propagation inventory */}
                      {proyeccionInventario.inventario_neto_real !== undefined
                        ? proyeccionInventario.inventario_neto_real
                        : proyeccionInventario.inventario_neto - proyeccionInventario.ventas_proyectadas} kg
                    </span>
                  </div>
                </div>
              </div>
              {(() => {
                const inventarioDisponible = proyeccionInventario.inventario_neto_real !== undefined
                  ? proyeccionInventario.inventario_neto_real
                  : proyeccionInventario.inventario_neto - proyeccionInventario.ventas_proyectadas;

                // TEMPORARY: Calculate harvest recommendation for this cell
                const HARVEST_THRESHOLD = 350;
                const cosechaRecomendada = inventarioDisponible > HARVEST_THRESHOLD
                  ? inventarioDisponible - HARVEST_THRESHOLD
                  : 0;

                return (
                  <>
                    {cosechaRecomendada > 0 && (
                      <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-yellow-800">
                            🚨 Cosecha Técnica Requerida:
                          </span>
                          <span className="text-lg font-bold text-yellow-900">
                            {cosechaRecomendada} kg
                          </span>
                        </div>
                        <div className="text-xs text-yellow-700 mt-1">
                          Cosechar {cosechaRecomendada}kg para reducir inventario a 350kg
                        </div>
                      </div>
                    )}
                    {inventarioDisponible < 10 && inventarioDisponible >= 0 && cosechaRecomendada === 0 && (
                      <div className="text-xs text-orange-600 mt-2">
                        ⚠️ Inventario disponible bajo - considerar cosecha técnica
                      </div>
                    )}
                    {inventarioDisponible < 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        ❌ Sin inventario suficiente - ventas exceden disponible
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogHeader>

        {/* Cosechas existentes */}
        {cosechasExistentes.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Cosechas asignadas:</h4>
            {cosechasExistentes.map((cosecha) => (
              <div
                key={cosecha.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {cosecha.cliente?.nombre || `Cliente ${cosecha.cliente_id}`}
                  </div>
                  <div className="text-xs text-gray-600">
                    {cosecha.categoria} - {cosecha.presentacion} - {cosecha.cantidad_kg} kg
                    {cosecha.recurrente && ' (Recurrente)'}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Registration Button */}
                  {versionId && (
                    <RegisterSaleButton
                      cosecha={cosecha}
                      versionId={versionId}
                      onRegister={() => onRefresh?.()}
                      onUnregister={() => onRefresh?.()}
                      className="mr-2"
                    />
                  )}

                  {/* Edit Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditCosecha(cosecha)}
                    className="text-blue-600 hover:text-blue-700"
                    disabled={cosecha.is_registered} // Prevent editing registered sales
                    title="Editar cosecha"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cosecha.id && handleDelete(cosecha.id)}
                    className="text-red-600 hover:text-red-700"
                    disabled={cosecha.is_registered} // Prevent deleting registered sales
                    title="Eliminar cosecha"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulario para nueva/editar cosecha */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700 border-t pt-4">
            {editingCosecha ? 'Editar cosecha:' : 'Agregar nueva cosecha:'}
          </h4>

          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Select
              value={formData.cliente_id?.toString() || ''}
              onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_id: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{cliente.nombre}</span>
                      {cliente.oficina && (
                        <span className="text-xs text-gray-500">{cliente.oficina}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría</Label>
            <Select
              value={formData.categoria}
              onValueChange={handleCategoriaChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CATEGORIAS_PRODUCTOS).map((categoria) => (
                  <SelectItem key={categoria} value={categoria}>
                    {categoria}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Presentación */}
          <div className="space-y-2">
            <Label htmlFor="presentacion">Presentación</Label>
            <Select
              value={formData.presentacion}
              onValueChange={(value) => setFormData(prev => ({ ...prev, presentacion: value }))}
              disabled={!formData.categoria}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar presentación" />
              </SelectTrigger>
              <SelectContent>
                {presentacionesDisponibles.map((presentacion) => (
                  <SelectItem key={presentacion} value={presentacion}>
                    {presentacion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tamaño Comercial (solo lectura) */}
          <div className="space-y-2">
            <Label htmlFor="talla">Tamaño Comercial</Label>
            <Input
              value={talla}
              disabled
              className="bg-gray-50"
            />
          </div>

          {/* Cantidad */}
          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad (kg)</Label>
            <Input
              type="number"
              min="1"
              value={formData.cantidad_kg || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                cantidad_kg: parseInt(e.target.value) || 0
              }))}
              placeholder="Cantidad en kilogramos"
            />
          </div>

          {/* Recurrente */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="recurrente"
              checked={formData.recurrente}
              onCheckedChange={(checked) =>
                setFormData(prev => ({ ...prev, recurrente: !!checked }))
              }
            />
            <Label htmlFor="recurrente" className="text-sm font-normal">
              Recurrente
            </Label>
          </div>

          {/* Botones */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cerrar
            </Button>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? 'Guardando...' : (editingCosecha ? 'Actualizar' : 'Guardar')}
              </Button>

              {editingCosecha ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                >
                  Cancelar edición
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Mantener el modal abierto para agregar otra cosecha
                    setFormData({
                      cliente_id: null,
                      categoria: '',
                      presentacion: '',
                      cantidad_kg: 0,
                      recurrente: false
                    });
                  }}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar nuevo
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}