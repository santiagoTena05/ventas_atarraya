"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  MapPin,
  Plus
} from "lucide-react";

interface Region {
  id: number;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  created_at: string;
}

interface RegionForm {
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export function AdminRegionesView() {
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<RegionForm | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'save' | 'toggle', data?: any } | null>(null);
  const [newRegionForm, setNewRegionForm] = useState<RegionForm>({
    nombre: '',
    descripcion: '',
    activo: true
  });

  // Cargar regiones
  const loadRegiones = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Cargando regiones...');

      const { data, error } = await supabase
        .from('regiones_mercado')
        .select('*')
        .order('nombre');

      if (error) {
        console.error('❌ Error cargando regiones:', error);
        return;
      }

      setRegiones(data || []);
      console.log(`✅ Cargadas ${data?.length || 0} regiones`);
    } catch (error) {
      console.error('❌ Error cargando regiones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Crear nueva región
  const createRegion = async (formData: RegionForm): Promise<boolean> => {
    try {
      setIsUpdating(true);
      console.log('🗺️ Creando nueva región:', formData);

      const { data, error } = await supabase
        .from('regiones_mercado')
        .insert({
          nombre: formData.nombre,
          descripcion: formData.descripcion || null,
          activo: formData.activo,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('❌ Error creando región:', error);
        return false;
      }

      console.log('✅ Región creada exitosamente:', data);
      await loadRegiones();
      return true;
    } catch (error) {
      console.error('❌ Error creando región:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Actualizar región
  const updateRegion = async (id: number, formData: RegionForm): Promise<boolean> => {
    try {
      setIsUpdating(true);
      console.log(`🗺️ Actualizando región ID ${id}:`, formData);

      const { data, error } = await supabase
        .from('regiones_mercado')
        .update({
          nombre: formData.nombre,
          descripcion: formData.descripcion || null,
          activo: formData.activo
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Error actualizando región:', error);
        return false;
      }

      console.log('✅ Región actualizada exitosamente:', data);
      await loadRegiones();
      return true;
    } catch (error) {
      console.error('❌ Error actualizando región:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Alternar estado activo
  const toggleActivo = async (id: number): Promise<boolean> => {
    try {
      const region = regiones.find(r => r.id === id);
      if (!region) return false;

      return await updateRegion(id, {
        nombre: region.nombre,
        descripcion: region.descripcion || '',
        activo: !region.activo
      });
    } catch (error) {
      console.error('❌ Error toggleando estado:', error);
      return false;
    }
  };

  // Manejar inicio de edición
  const handleEdit = (region: Region) => {
    setEditingId(region.id);
    setEditForm({
      nombre: region.nombre,
      descripcion: region.descripcion || '',
      activo: region.activo ?? true
    });
  };

  // Cancelar edición
  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

  // Confirmar guardado
  const handleSave = () => {
    if (!editForm || !editingId) return;
    setConfirmAction({ type: 'save', data: { id: editingId, form: editForm } });
    setShowConfirmDialog(true);
  };

  // Confirmar toggle de estado
  const handleToggleActivo = (id: number) => {
    setConfirmAction({ type: 'toggle', data: id });
    setShowConfirmDialog(true);
  };

  // Confirmar agregar nuevo
  const handleAddNew = () => {
    if (!newRegionForm.nombre.trim()) return;
    setConfirmAction({ type: 'save', data: { form: newRegionForm } });
    setShowConfirmDialog(true);
  };

  // Ejecutar acción confirmada
  const executeConfirmedAction = async () => {
    if (!confirmAction) return;

    let success = false;

    if (confirmAction.type === 'save') {
      const { id, form } = confirmAction.data;
      if (id) {
        // Actualizar existente
        success = await updateRegion(id, form);
        if (success) {
          setEditingId(null);
          setEditForm(null);
        }
      } else {
        // Crear nuevo
        success = await createRegion(form);
        if (success) {
          setNewRegionForm({ nombre: '', descripcion: '', activo: true });
          setShowAddDialog(false);
        }
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

  useEffect(() => {
    loadRegiones();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando regiones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Regiones</p>
                <p className="text-2xl font-bold text-blue-600">{regiones.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Activas</p>
                <p className="text-2xl font-bold text-green-600">
                  {regiones.filter(r => r.activo !== false).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-8 w-8 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Inactivas</p>
                <p className="text-2xl font-bold text-gray-600">
                  {regiones.filter(r => r.activo === false).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de regiones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Regiones de Mercado</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Gestión de regiones y zonas de mercado
              </p>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-teal-600 hover:bg-teal-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva Región
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {regiones.map((region) => (
              <Card key={region.id} className={`${region.activo === false ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  {editingId === region.id && editForm ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`edit-nombre-${region.id}`}>Nombre</Label>
                        <Input
                          id={`edit-nombre-${region.id}`}
                          value={editForm.nombre}
                          onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                          placeholder="Nombre de la región"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-descripcion-${region.id}`}>Descripción</Label>
                        <Textarea
                          id={`edit-descripcion-${region.id}`}
                          value={editForm.descripcion}
                          onChange={(e) => setEditForm({...editForm, descripcion: e.target.value})}
                          placeholder="Descripción de la región"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={handleSave}
                          disabled={isUpdating}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancel}
                          disabled={isUpdating}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">{region.nombre}</h3>
                          <Badge
                            variant={region.activo !== false ? "default" : "secondary"}
                            className={`cursor-pointer ${region.activo !== false ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-500'}`}
                            onClick={() => handleToggleActivo(region.id)}
                          >
                            {region.activo !== false ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {region.descripcion || 'Sin descripción'}
                        </p>
                        <div className="text-xs text-gray-500">
                          ID: {region.id} • Creada: {new Date(region.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(region)}
                        disabled={isUpdating}
                        className="hover:bg-blue-50 hover:border-blue-300"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {regiones.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay regiones configuradas</p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="mt-4 bg-teal-600 hover:bg-teal-700"
              >
                Agregar Primera Región
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para agregar nueva región */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Nueva Región</DialogTitle>
            <DialogDescription>
              Complete la información de la nueva región de mercado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nueva-nombre">Nombre *</Label>
              <Input
                id="nueva-nombre"
                value={newRegionForm.nombre}
                onChange={(e) => setNewRegionForm({...newRegionForm, nombre: e.target.value})}
                placeholder="Nombre de la región"
              />
            </div>
            <div>
              <Label htmlFor="nueva-descripcion">Descripción</Label>
              <Textarea
                id="nueva-descripcion"
                value={newRegionForm.descripcion}
                onChange={(e) => setNewRegionForm({...newRegionForm, descripcion: e.target.value})}
                placeholder="Descripción de la región"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddNew}
              disabled={isUpdating || !newRegionForm.nombre.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isUpdating ? 'Guardando...' : 'Agregar Región'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Acción</DialogTitle>
            <DialogDescription>
              {confirmAction?.type === 'save'
                ? confirmAction.data?.id
                  ? '¿Estás seguro de que quieres guardar los cambios en esta región?'
                  : '¿Estás seguro de que quieres agregar esta nueva región?'
                : '¿Estás seguro de que quieres cambiar el estado de esta región?'
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