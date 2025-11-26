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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pencil,
  Save,
  X,
  Plus,
  MapPin,
  Package,
  Droplets
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Estanque {
  id: number;
  nombre: string;
  codigo?: string;
  area?: number;
  ubicacion?: number;
  activo?: boolean;
  notas?: string;
  created_at: string;
  updated_at?: string;
  oficinas?: {
    id: number;
    nombre: string;
  };
}

interface EstanqueForm {
  nombre: string;
  codigo: string;
  area: number | null;
  ubicacion: number | null;
  notas: string;
  activo: boolean;
}

export function AdminEstanquesView() {
  const [estanques, setEstanques] = useState<Estanque[]>([]);
  const [oficinas, setOficinas] = useState<{id: number, nombre: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EstanqueForm | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'save' | 'toggle', data?: any } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newEstanqueForm, setNewEstanqueForm] = useState<EstanqueForm>({
    nombre: '',
    codigo: '',
    area: null,
    ubicacion: null,
    notas: '',
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
      console.log(`✅ Cargadas ${data?.length || 0} oficinas`);
    } catch (error) {
      console.error('❌ Error cargando oficinas:', error);
    }
  };

  // Cargar estanques con JOIN a oficinas
  const loadEstanques = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Cargando estanques...');

      const { data, error } = await supabase
        .from('estanques')
        .select(`
          *,
          oficinas (
            id,
            nombre
          )
        `)
        .order('nombre');

      if (error) {
        console.error('❌ Error cargando estanques:', error);
        return;
      }

      setEstanques(data || []);
      console.log(`✅ Cargados ${data?.length || 0} estanques`);
    } catch (error) {
      console.error('❌ Error cargando estanques:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Crear nuevo estanque
  const createEstanque = async (formData: EstanqueForm): Promise<boolean> => {
    try {
      setIsUpdating(true);
      console.log('🏊 Creando nuevo estanque:', formData);

      const { data, error } = await supabase
        .from('estanques')
        .insert({
          nombre: formData.nombre,
          codigo: formData.codigo || null,
          area: formData.area,
          ubicacion: formData.ubicacion || null,
          notas: formData.notas || null,
          activo: formData.activo,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('❌ Error creando estanque:', error);
        return false;
      }

      console.log('✅ Estanque creado exitosamente:', data);
      await loadEstanques();
      return true;
    } catch (error) {
      console.error('❌ Error creando estanque:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Actualizar estanque
  const updateEstanque = async (id: number, formData: EstanqueForm): Promise<boolean> => {
    try {
      setIsUpdating(true);
      console.log(`🏊 Actualizando estanque ID ${id}:`, formData);

      const { data, error } = await supabase
        .from('estanques')
        .update({
          nombre: formData.nombre,
          codigo: formData.codigo || null,
          area: formData.area,
          ubicacion: formData.ubicacion || null,
          notas: formData.notas || null,
          activo: formData.activo,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Error actualizando estanque:', error);
        return false;
      }

      console.log('✅ Estanque actualizado exitosamente:', data);
      await loadEstanques();
      return true;
    } catch (error) {
      console.error('❌ Error actualizando estanque:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Alternar estado activo
  const toggleActivo = async (id: number): Promise<boolean> => {
    try {
      const estanque = estanques.find(e => e.id === id);
      if (!estanque) return false;

      return await updateEstanque(id, {
        nombre: estanque.nombre,
        codigo: estanque.codigo || '',
        area: estanque.area,
        ubicacion: estanque.ubicacion,
        notas: estanque.notas || '',
        activo: !estanque.activo
      });
    } catch (error) {
      console.error('❌ Error toggleando estado:', error);
      return false;
    }
  };

  // Manejar inicio de edición
  const handleEdit = (estanque: Estanque) => {
    setEditingId(estanque.id);
    setEditForm({
      nombre: estanque.nombre,
      codigo: estanque.codigo || '',
      area: estanque.area,
      ubicacion: estanque.ubicacion,
      notas: estanque.notas || '',
      activo: estanque.activo ?? true
    });
  };

  // Filtrar estanques por búsqueda
  const filteredEstanques = estanques.filter(estanque =>
    estanque.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estanque.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estanque.oficinas?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSave = () => {
    if (!editForm || !editingId) return;
    setConfirmAction({ type: 'save', data: { id: editingId, form: editForm } });
    setShowConfirmDialog(true);
  };

  const handleToggleActivo = (id: number) => {
    setConfirmAction({ type: 'toggle', data: id });
    setShowConfirmDialog(true);
  };

  const handleAddNew = () => {
    if (!newEstanqueForm.nombre.trim()) return;
    setConfirmAction({ type: 'save', data: { form: newEstanqueForm } });
    setShowConfirmDialog(true);
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;

    let success = false;

    if (confirmAction.type === 'save') {
      const { id, form } = confirmAction.data;
      if (id) {
        success = await updateEstanque(id, form);
        if (success) {
          setEditingId(null);
          setEditForm(null);
        }
      } else {
        success = await createEstanque(form);
        if (success) {
          setNewEstanqueForm({
            nombre: '', codigo: '', area: null, ubicacion: null, notas: '', activo: true
          });
          setShowAddDialog(false);
        }
      }
    } else if (confirmAction.type === 'toggle') {
      success = await toggleActivo(confirmAction.data);
    }

    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  useEffect(() => {
    loadOficinas();
    loadEstanques();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando estanques...</p>
        </div>
      </div>
    );
  }

  const totalArea = estanques.reduce((sum, est) => sum + (est.area || 0), 0);
  const estanquesActivos = estanques.filter(e => e.activo !== false);

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Droplets className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Estanques</p>
                <p className="text-2xl font-bold text-blue-600">{estanques.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Droplets className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">{estanquesActivos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Área Total</p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalArea.toLocaleString()}m²
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Área Promedio</p>
                <p className="text-2xl font-bold text-orange-600">
                  {estanques.length ? Math.round(totalArea / estanques.length).toLocaleString() : 0}m²
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de búsqueda y acciones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estanques</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Gestión de estanques de cultivo
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Buscar estanques..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-teal-600 hover:bg-teal-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nuevo Estanque
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEstanques.map((estanque) => (
              <Card key={estanque.id} className={`${estanque.activo === false ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  {editingId === estanque.id && editForm ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Nombre *</Label>
                          <Input
                            value={editForm.nombre}
                            onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                            placeholder="Nombre del estanque"
                          />
                        </div>
                        <div>
                          <Label>Código</Label>
                          <Input
                            value={editForm.codigo}
                            onChange={(e) => setEditForm({...editForm, codigo: e.target.value})}
                            placeholder="Código del estanque"
                          />
                        </div>
                        <div>
                          <Label>Área (m²)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={editForm.area || ''}
                            onChange={(e) => setEditForm({...editForm, area: parseFloat(e.target.value) || null})}
                            placeholder="Área en m²"
                          />
                        </div>
                        <div>
                          <Label>Ubicación</Label>
                          <Select
                            value={editForm.ubicacion?.toString() || ''}
                            onValueChange={(value) => setEditForm({...editForm, ubicacion: parseInt(value) || null})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar oficina" />
                            </SelectTrigger>
                            <SelectContent>
                              {oficinas.map((oficina) => (
                                <SelectItem key={oficina.id} value={oficina.id.toString()}>
                                  {oficina.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Notas</Label>
                          <Textarea
                            value={editForm.notas}
                            onChange={(e) => setEditForm({...editForm, notas: e.target.value})}
                            placeholder="Notas adicionales"
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label>Estado</Label>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-gray-600">
                              {editForm.activo ? 'Activo' : 'Inactivo'}
                            </span>
                            <Switch
                              checked={editForm.activo}
                              onCheckedChange={(checked) => setEditForm({...editForm, activo: checked})}
                            />
                          </div>
                        </div>
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
                          <h3 className="font-medium text-gray-900">{estanque.nombre}</h3>
                          {estanque.codigo && (
                            <Badge variant="outline" className="text-xs">
                              {estanque.codigo}
                            </Badge>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              {estanque.activo !== false ? 'Activo' : 'Inactivo'}
                            </span>
                            <Switch
                              checked={estanque.activo !== false}
                              onCheckedChange={() => handleToggleActivo(estanque.id)}
                              disabled={isUpdating}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
                          {estanque.area && (
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {estanque.area.toLocaleString()} m²
                            </div>
                          )}
                          {estanque.oficinas && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {estanque.oficinas.nombre}
                            </div>
                          )}
                          {estanque.notas && (
                            <div className="text-xs text-gray-500 truncate">
                              {estanque.notas}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {estanque.id} • Creado: {new Date(estanque.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(estanque)}
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

          {filteredEstanques.length === 0 && (
            <div className="text-center py-8">
              <Droplets className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No se encontraron estanques con ese criterio' : 'No hay estanques registrados'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="mt-4 bg-teal-600 hover:bg-teal-700"
                >
                  Agregar Primer Estanque
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para agregar nuevo estanque */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Estanque</DialogTitle>
            <DialogDescription>
              Complete la información del nuevo estanque.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={newEstanqueForm.nombre}
                  onChange={(e) => setNewEstanqueForm({...newEstanqueForm, nombre: e.target.value})}
                  placeholder="Nombre del estanque"
                />
              </div>
              <div>
                <Label>Código</Label>
                <Input
                  value={newEstanqueForm.codigo}
                  onChange={(e) => setNewEstanqueForm({...newEstanqueForm, codigo: e.target.value})}
                  placeholder="Código del estanque (ej: EST-01)"
                />
              </div>
              <div>
                <Label>Área (m²)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newEstanqueForm.area || ''}
                  onChange={(e) => setNewEstanqueForm({...newEstanqueForm, area: parseFloat(e.target.value) || null})}
                  placeholder="Área en m²"
                />
              </div>
              <div>
                <Label>Ubicación</Label>
                <Select
                  value={newEstanqueForm.ubicacion?.toString() || ''}
                  onValueChange={(value) => setNewEstanqueForm({...newEstanqueForm, ubicacion: parseInt(value) || null})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar oficina" />
                  </SelectTrigger>
                  <SelectContent>
                    {oficinas.map((oficina) => (
                      <SelectItem key={oficina.id} value={oficina.id.toString()}>
                        {oficina.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Notas</Label>
                <Textarea
                  value={newEstanqueForm.notas}
                  onChange={(e) => setNewEstanqueForm({...newEstanqueForm, notas: e.target.value})}
                  placeholder="Notas adicionales sobre el estanque"
                  rows={3}
                />
              </div>
              <div>
                <Label>Estado</Label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-600">
                    {newEstanqueForm.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <Switch
                    checked={newEstanqueForm.activo}
                    onCheckedChange={(checked) => setNewEstanqueForm({...newEstanqueForm, activo: checked})}
                  />
                </div>
              </div>
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
              disabled={isUpdating || !newEstanqueForm.nombre.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isUpdating ? 'Guardando...' : 'Agregar Estanque'}
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
                  ? '¿Estás seguro de que quieres guardar los cambios en este estanque?'
                  : '¿Estás seguro de que quieres agregar este nuevo estanque?'
                : '¿Estás seguro de que quieres cambiar el estado de este estanque?'
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