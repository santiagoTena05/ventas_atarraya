"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
  Building2,
  Plus
} from "lucide-react";

interface Oficina {
  id: number;
  nombre: string;
  codigo?: string;
  direccion?: string;
  telefono?: string;
  responsable_principal_id?: number;
  activa?: boolean;
  created_at: string;
}

interface OficinaForm {
  nombre: string;
  codigo: string;
  direccion: string;
  telefono: string;
  responsable_principal_id: number | null;
  activa: boolean;
}

export function AdminOficinasView() {
  const [oficinas, setOficinas] = useState<Oficina[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<OficinaForm | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'save' | 'toggle', data?: any } | null>(null);
  const [newOficinaForm, setNewOficinaForm] = useState<OficinaForm>({
    nombre: '',
    codigo: '',
    direccion: '',
    telefono: '',
    responsable_principal_id: null,
    activa: true
  });

  // Cargar oficinas
  const loadOficinas = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Cargando oficinas...');

      const { data, error } = await supabase
        .from('oficinas')
        .select('*')
        .order('nombre');

      if (error) {
        console.error('❌ Error cargando oficinas:', error);
        return;
      }

      setOficinas(data || []);
      console.log(`✅ Cargadas ${data?.length || 0} oficinas`);
    } catch (error) {
      console.error('❌ Error cargando oficinas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Crear nueva oficina
  const createOficina = async (formData: OficinaForm): Promise<boolean> => {
    try {
      setIsUpdating(true);
      console.log('🏢 Creando nueva oficina:', formData);

      const { data, error } = await supabase
        .from('oficinas')
        .insert({
          nombre: formData.nombre,
          codigo: formData.codigo || null,
          direccion: formData.direccion || null,
          telefono: formData.telefono || null,
          responsable_principal_id: formData.responsable_principal_id,
          activa: formData.activa
        })
        .select();

      if (error) {
        console.error('❌ Error creando oficina:', error);
        return false;
      }

      console.log('✅ Oficina creada exitosamente:', data);
      await loadOficinas();
      return true;
    } catch (error) {
      console.error('❌ Error creando oficina:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Actualizar oficina
  const updateOficina = async (id: number, formData: OficinaForm): Promise<boolean> => {
    try {
      setIsUpdating(true);
      console.log(`🏢 Actualizando oficina ID ${id}:`, formData);

      const { data, error } = await supabase
        .from('oficinas')
        .update({
          nombre: formData.nombre,
          codigo: formData.codigo || null,
          direccion: formData.direccion || null,
          telefono: formData.telefono || null,
          responsable_principal_id: formData.responsable_principal_id,
          activa: formData.activa
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Error actualizando oficina:', error);
        return false;
      }

      console.log('✅ Oficina actualizada exitosamente:', data);
      await loadOficinas();
      return true;
    } catch (error) {
      console.error('❌ Error actualizando oficina:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Alternar estado activo
  const toggleActiva = async (id: number): Promise<boolean> => {
    try {
      const oficina = oficinas.find(o => o.id === id);
      if (!oficina) return false;

      return await updateOficina(id, {
        nombre: oficina.nombre,
        codigo: oficina.codigo || '',
        direccion: oficina.direccion || '',
        telefono: oficina.telefono || '',
        responsable_principal_id: oficina.responsable_principal_id || null,
        activa: !oficina.activa
      });
    } catch (error) {
      console.error('❌ Error toggleando estado:', error);
      return false;
    }
  };

  // Manejar inicio de edición
  const handleEdit = (oficina: Oficina) => {
    setEditingId(oficina.id);
    setEditForm({
      nombre: oficina.nombre,
      codigo: oficina.codigo || '',
      direccion: oficina.direccion || '',
      telefono: oficina.telefono || '',
      responsable_principal_id: oficina.responsable_principal_id || null,
      activa: oficina.activa ?? true
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
  const handleToggleActiva = (id: number) => {
    setConfirmAction({ type: 'toggle', data: id });
    setShowConfirmDialog(true);
  };

  // Confirmar agregar nuevo
  const handleAddNew = () => {
    if (!newOficinaForm.nombre.trim()) return;
    setConfirmAction({ type: 'save', data: { form: newOficinaForm } });
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
        success = await updateOficina(id, form);
        if (success) {
          setEditingId(null);
          setEditForm(null);
        }
      } else {
        // Crear nuevo
        success = await createOficina(form);
        if (success) {
          setNewOficinaForm({ nombre: '', codigo: '', direccion: '', telefono: '', responsable_principal_id: null, activa: true });
          setShowAddDialog(false);
        }
      }
    } else if (confirmAction.type === 'toggle') {
      success = await toggleActiva(confirmAction.data);
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
    loadOficinas();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando oficinas...</p>
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
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Oficinas</p>
                <p className="text-2xl font-bold text-blue-600">{oficinas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Activas</p>
                <p className="text-2xl font-bold text-green-600">
                  {oficinas.filter(o => o.activa !== false).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Inactivas</p>
                <p className="text-2xl font-bold text-gray-600">
                  {oficinas.filter(o => o.activa === false).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de oficinas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Oficinas</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Gestión de oficinas y sucursales
              </p>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-teal-600 hover:bg-teal-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva Oficina
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-gray-900">Nombre</th>
                  <th className="text-left p-3 font-medium text-gray-900">Código</th>
                  <th className="text-left p-3 font-medium text-gray-900">Dirección</th>
                  <th className="text-left p-3 font-medium text-gray-900">Teléfono</th>
                  <th className="text-center p-3 font-medium text-gray-900">Estado</th>
                  <th className="text-center p-3 font-medium text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {oficinas.map((oficina) => (
                  <tr key={oficina.id} className={`border-b hover:bg-gray-50 ${oficina.activa === false ? 'opacity-60' : ''}`}>
                    {editingId === oficina.id && editForm ? (
                      <>
                        <td className="p-3">
                          <Input
                            value={editForm.nombre}
                            onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                            className="w-full"
                            placeholder="Nombre de la oficina"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={editForm.codigo}
                            onChange={(e) => setEditForm({...editForm, codigo: e.target.value})}
                            className="w-full"
                            placeholder="Código"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={editForm.direccion}
                            onChange={(e) => setEditForm({...editForm, direccion: e.target.value})}
                            className="w-full"
                            placeholder="Dirección"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={editForm.telefono}
                            onChange={(e) => setEditForm({...editForm, telefono: e.target.value})}
                            className="w-full"
                            placeholder="Teléfono"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{oficina.nombre}</div>
                          <div className="text-xs text-gray-500">ID: {oficina.id}</div>
                        </td>
                        <td className="p-3 text-sm text-gray-600 font-mono">
                          {oficina.codigo || '-'}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {oficina.direccion || '-'}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {oficina.telefono || '-'}
                        </td>
                      </>
                    )}

                    <td className="p-3 text-center">
                      <Badge
                        variant={oficina.activa !== false ? "default" : "secondary"}
                        className={`cursor-pointer ${oficina.activa !== false ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-500'}`}
                        onClick={() => editingId !== oficina.id && handleToggleActiva(oficina.id)}
                      >
                        {oficina.activa !== false ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>

                    <td className="p-3 text-center">
                      {editingId === oficina.id ? (
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
                          onClick={() => handleEdit(oficina)}
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

      {/* Dialog para agregar nueva oficina */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nueva Oficina</DialogTitle>
            <DialogDescription>
              Complete la información de la nueva oficina.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nueva-nombre">Nombre *</Label>
              <Input
                id="nueva-nombre"
                value={newOficinaForm.nombre}
                onChange={(e) => setNewOficinaForm({...newOficinaForm, nombre: e.target.value})}
                placeholder="Nombre de la oficina"
              />
            </div>
            <div>
              <Label htmlFor="nueva-codigo">Código</Label>
              <Input
                id="nueva-codigo"
                value={newOficinaForm.codigo}
                onChange={(e) => setNewOficinaForm({...newOficinaForm, codigo: e.target.value})}
                placeholder="Código de la oficina (ej: MV, ALV)"
              />
            </div>
            <div>
              <Label htmlFor="nueva-direccion">Dirección</Label>
              <Input
                id="nueva-direccion"
                value={newOficinaForm.direccion}
                onChange={(e) => setNewOficinaForm({...newOficinaForm, direccion: e.target.value})}
                placeholder="Dirección completa"
              />
            </div>
            <div>
              <Label htmlFor="nueva-telefono">Teléfono</Label>
              <Input
                id="nueva-telefono"
                value={newOficinaForm.telefono}
                onChange={(e) => setNewOficinaForm({...newOficinaForm, telefono: e.target.value})}
                placeholder="Número de teléfono"
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
              disabled={isUpdating || !newOficinaForm.nombre.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isUpdating ? 'Guardando...' : 'Agregar Oficina'}
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
                  ? '¿Estás seguro de que quieres guardar los cambios en esta oficina?'
                  : '¿Estás seguro de que quieres agregar esta nueva oficina?'
                : '¿Estás seguro de que quieres cambiar el estado de esta oficina?'
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