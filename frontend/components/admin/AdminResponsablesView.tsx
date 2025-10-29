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
  UserCheck,
  Plus,
  Trash2
} from "lucide-react";

interface Responsable {
  id: number;
  nombre: string;
  codigo?: string;
  oficina_id?: number;
  telefono?: string;
  email?: string;
  activo?: boolean;
  created_at: string;
  updated_at?: string;
}

interface ResponsableForm {
  nombre: string;
  codigo: string;
  oficina_id: number | null;
  telefono: string;
  email: string;
  activo: boolean;
}

export function AdminResponsablesView() {
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [oficinas, setOficinas] = useState<{ id: number; nombre: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ResponsableForm | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'save' | 'delete' | 'toggle', data?: any } | null>(null);
  const [newResponsableForm, setNewResponsableForm] = useState<ResponsableForm>({
    nombre: '',
    codigo: '',
    oficina_id: null,
    telefono: '',
    email: '',
    activo: true
  });

  // Cargar oficinas
  const loadOficinas = async () => {
    try {
      const { data, error } = await supabase
        .from('oficinas')
        .select('id, nombre')
        .eq('activa', true)
        .order('nombre');

      if (error) {
        console.error('❌ Error cargando oficinas:', error);
        return;
      }

      setOficinas(data || []);
    } catch (error) {
      console.error('❌ Error cargando oficinas:', error);
    }
  };

  // Cargar responsables
  const loadResponsables = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Cargando responsables...');

      const { data, error } = await supabase
        .from('responsables')
        .select('*')
        .order('nombre');

      if (error) {
        console.error('❌ Error cargando responsables:', error);
        return;
      }

      setResponsables(data || []);
      console.log(`✅ Cargados ${data?.length || 0} responsables`);
    } catch (error) {
      console.error('❌ Error cargando responsables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Crear nuevo responsable
  const createResponsable = async (formData: ResponsableForm): Promise<boolean> => {
    try {
      setIsUpdating(true);
      console.log('👤 Creando nuevo responsable:', formData);

      const { data, error } = await supabase
        .from('responsables')
        .insert({
          nombre: formData.nombre,
          codigo: formData.codigo || null,
          oficina_id: formData.oficina_id,
          telefono: formData.telefono || null,
          email: formData.email || null,
          activo: formData.activo
        })
        .select();

      if (error) {
        console.error('❌ Error creando responsable:', error);
        return false;
      }

      console.log('✅ Responsable creado exitosamente:', data);
      await loadResponsables();
      return true;
    } catch (error) {
      console.error('❌ Error creando responsable:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Actualizar responsable
  const updateResponsable = async (id: number, formData: ResponsableForm): Promise<boolean> => {
    try {
      setIsUpdating(true);
      console.log(`👤 Actualizando responsable ID ${id}:`, formData);

      const { data, error } = await supabase
        .from('responsables')
        .update({
          nombre: formData.nombre,
          codigo: formData.codigo || null,
          oficina_id: formData.oficina_id,
          telefono: formData.telefono || null,
          email: formData.email || null,
          activo: formData.activo
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Error actualizando responsable:', error);
        return false;
      }

      console.log('✅ Responsable actualizado exitosamente:', data);
      await loadResponsables();
      return true;
    } catch (error) {
      console.error('❌ Error actualizando responsable:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Alternar estado activo
  const toggleActivo = async (id: number): Promise<boolean> => {
    try {
      const responsable = responsables.find(r => r.id === id);
      if (!responsable) return false;

      return await updateResponsable(id, {
        nombre: responsable.nombre,
        codigo: responsable.codigo || '',
        oficina_id: responsable.oficina_id || null,
        telefono: responsable.telefono || '',
        email: responsable.email || '',
        activo: !responsable.activo
      });
    } catch (error) {
      console.error('❌ Error toggleando estado:', error);
      return false;
    }
  };

  // Manejar inicio de edición
  const handleEdit = (responsable: Responsable) => {
    setEditingId(responsable.id);
    setEditForm({
      nombre: responsable.nombre,
      codigo: responsable.codigo || '',
      oficina_id: responsable.oficina_id || null,
      telefono: responsable.telefono || '',
      email: responsable.email || '',
      activo: responsable.activo ?? true
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
    if (!newResponsableForm.nombre.trim()) return;
    setConfirmAction({ type: 'save', data: { form: newResponsableForm } });
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
        success = await updateResponsable(id, form);
        if (success) {
          setEditingId(null);
          setEditForm(null);
        }
      } else {
        // Crear nuevo
        success = await createResponsable(form);
        if (success) {
          setNewResponsableForm({ nombre: '', codigo: '', oficina_id: null, telefono: '', email: '', activo: true });
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
    loadOficinas();
    loadResponsables();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando responsables...</p>
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
              <UserCheck className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Responsables</p>
                <p className="text-2xl font-bold text-blue-600">{responsables.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {responsables.filter(r => r.activo !== false).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Inactivos</p>
                <p className="text-2xl font-bold text-gray-600">
                  {responsables.filter(r => r.activo === false).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de responsables */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Responsables</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Gestión de responsables de ventas y cosechas
              </p>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-teal-600 hover:bg-teal-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuevo Responsable
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
                  <th className="text-left p-3 font-medium text-gray-900">Oficina</th>
                  <th className="text-left p-3 font-medium text-gray-900">Teléfono</th>
                  <th className="text-left p-3 font-medium text-gray-900">Email</th>
                  <th className="text-center p-3 font-medium text-gray-900">Estado</th>
                  <th className="text-center p-3 font-medium text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {responsables.map((responsable) => (
                  <tr key={responsable.id} className={`border-b hover:bg-gray-50 ${responsable.activo === false ? 'opacity-60' : ''}`}>
                    {editingId === responsable.id && editForm ? (
                      <>
                        <td className="p-3">
                          <Input
                            value={editForm.nombre}
                            onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                            className="w-full"
                            placeholder="Nombre completo"
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
                          <select
                            value={editForm.oficina_id || ''}
                            onChange={(e) => setEditForm({...editForm, oficina_id: e.target.value ? Number(e.target.value) : null})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">Sin oficina</option>
                            {oficinas.map(oficina => (
                              <option key={oficina.id} value={oficina.id}>{oficina.nombre}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <Input
                            value={editForm.telefono}
                            onChange={(e) => setEditForm({...editForm, telefono: e.target.value})}
                            className="w-full"
                            placeholder="Teléfono"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={editForm.email}
                            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                            className="w-full"
                            placeholder="Email"
                            type="email"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{responsable.nombre}</div>
                          <div className="text-xs text-gray-500">ID: {responsable.id}</div>
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {responsable.codigo || '-'}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {oficinas.find(o => o.id === responsable.oficina_id)?.nombre || '-'}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {responsable.telefono || '-'}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {responsable.email || '-'}
                        </td>
                      </>
                    )}

                    <td className="p-3 text-center">
                      <Badge
                        variant={responsable.activo !== false ? "default" : "secondary"}
                        className={`cursor-pointer ${responsable.activo !== false ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-500'}`}
                        onClick={() => editingId !== responsable.id && handleToggleActivo(responsable.id)}
                      >
                        {responsable.activo !== false ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>

                    <td className="p-3 text-center">
                      {editingId === responsable.id ? (
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
                          onClick={() => handleEdit(responsable)}
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

      {/* Dialog para agregar nuevo responsable */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Responsable</DialogTitle>
            <DialogDescription>
              Complete la información del nuevo responsable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nuevo-nombre">Nombre completo *</Label>
              <Input
                id="nuevo-nombre"
                value={newResponsableForm.nombre}
                onChange={(e) => setNewResponsableForm({...newResponsableForm, nombre: e.target.value})}
                placeholder="Nombre completo del responsable"
              />
            </div>
            <div>
              <Label htmlFor="nuevo-codigo">Código</Label>
              <Input
                id="nuevo-codigo"
                value={newResponsableForm.codigo}
                onChange={(e) => setNewResponsableForm({...newResponsableForm, codigo: e.target.value})}
                placeholder="Código único del responsable"
              />
            </div>
            <div>
              <Label htmlFor="nuevo-oficina">Oficina</Label>
              <select
                id="nuevo-oficina"
                value={newResponsableForm.oficina_id || ''}
                onChange={(e) => setNewResponsableForm({...newResponsableForm, oficina_id: e.target.value ? Number(e.target.value) : null})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Seleccionar oficina (opcional)</option>
                {oficinas.map(oficina => (
                  <option key={oficina.id} value={oficina.id}>{oficina.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="nuevo-telefono">Teléfono</Label>
              <Input
                id="nuevo-telefono"
                value={newResponsableForm.telefono}
                onChange={(e) => setNewResponsableForm({...newResponsableForm, telefono: e.target.value})}
                placeholder="Número de teléfono"
              />
            </div>
            <div>
              <Label htmlFor="nuevo-email">Email</Label>
              <Input
                id="nuevo-email"
                type="email"
                value={newResponsableForm.email}
                onChange={(e) => setNewResponsableForm({...newResponsableForm, email: e.target.value})}
                placeholder="Correo electrónico"
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
              disabled={isUpdating || !newResponsableForm.nombre.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isUpdating ? 'Guardando...' : 'Agregar Responsable'}
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
                  ? '¿Estás seguro de que quieres guardar los cambios en este responsable?'
                  : '¿Estás seguro de que quieres agregar este nuevo responsable?'
                : '¿Estás seguro de que quieres cambiar el estado de este responsable?'
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