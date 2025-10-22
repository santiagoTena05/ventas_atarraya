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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Users,
  Plus,
  Phone,
  Mail,
  MapPin
} from "lucide-react";

interface Cliente {
  id: number;
  nombre: string;
  tipo_cliente_id?: number;
  tipo_cliente_nombre?: string;
  oficina?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
  rfc?: string;
  razon_social?: string;
  activo?: boolean;
  notas?: string;
  created_at: string;
  updated_at?: string;
}

interface TipoCliente {
  id: number;
  nombre: string;
}

interface ClienteForm {
  nombre: string;
  tipo_cliente_id: number | null;
  oficina: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
  rfc: string;
  razon_social: string;
  notas: string;
  activo: boolean;
}

export function AdminClientesView() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tiposCliente, setTiposCliente] = useState<TipoCliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ClienteForm | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'save' | 'toggle', data?: any } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newClienteForm, setNewClienteForm] = useState<ClienteForm>({
    nombre: '',
    tipo_cliente_id: null,
    oficina: 'MV',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    estado: '',
    codigo_postal: '',
    rfc: '',
    razon_social: '',
    notas: '',
    activo: true
  });

  // Cargar tipos de cliente
  const loadTiposCliente = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_cliente')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setTiposCliente(data || []);
    } catch (error) {
      console.error('❌ Error cargando tipos de cliente:', error);
    }
  };

  // Cargar clientes
  const loadClientes = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Cargando clientes...');

      const { data, error } = await supabase
        .from('clientes')
        .select(`
          *,
          tipos_cliente(nombre)
        `)
        .order('nombre');

      if (error) {
        console.error('❌ Error cargando clientes:', error);
        return;
      }

      const clientesTransformados = data?.map(cliente => ({
        ...cliente,
        tipo_cliente_nombre: cliente.tipos_cliente?.nombre || 'Sin asignar'
      })) || [];

      setClientes(clientesTransformados);
      console.log(`✅ Cargados ${clientesTransformados.length} clientes`);
    } catch (error) {
      console.error('❌ Error cargando clientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Crear nuevo cliente
  const createCliente = async (formData: ClienteForm): Promise<boolean> => {
    try {
      setIsUpdating(true);
      console.log('👤 Creando nuevo cliente:', formData);

      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nombre: formData.nombre,
          tipo_cliente_id: formData.tipo_cliente_id,
          oficina: formData.oficina || 'MV',
          telefono: formData.telefono || null,
          email: formData.email || null,
          direccion: formData.direccion || null,
          ciudad: formData.ciudad || null,
          estado: formData.estado || null,
          codigo_postal: formData.codigo_postal || null,
          rfc: formData.rfc || null,
          razon_social: formData.razon_social || null,
          notas: formData.notas || null,
          activo: formData.activo,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('❌ Error creando cliente:', error);
        return false;
      }

      console.log('✅ Cliente creado exitosamente:', data);
      await loadClientes();
      return true;
    } catch (error) {
      console.error('❌ Error creando cliente:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Actualizar cliente
  const updateCliente = async (id: number, formData: ClienteForm): Promise<boolean> => {
    try {
      setIsUpdating(true);
      console.log(`👤 Actualizando cliente ID ${id}:`, formData);

      const { data, error } = await supabase
        .from('clientes')
        .update({
          nombre: formData.nombre,
          tipo_cliente_id: formData.tipo_cliente_id,
          oficina: formData.oficina || 'MV',
          telefono: formData.telefono || null,
          email: formData.email || null,
          direccion: formData.direccion || null,
          ciudad: formData.ciudad || null,
          estado: formData.estado || null,
          codigo_postal: formData.codigo_postal || null,
          rfc: formData.rfc || null,
          razon_social: formData.razon_social || null,
          notas: formData.notas || null,
          activo: formData.activo,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('❌ Error actualizando cliente:', error);
        return false;
      }

      console.log('✅ Cliente actualizado exitosamente:', data);
      await loadClientes();
      return true;
    } catch (error) {
      console.error('❌ Error actualizando cliente:', error);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Alternar estado activo
  const toggleActivo = async (id: number): Promise<boolean> => {
    try {
      const cliente = clientes.find(c => c.id === id);
      if (!cliente) return false;

      return await updateCliente(id, {
        nombre: cliente.nombre,
        tipo_cliente_id: cliente.tipo_cliente_id || null,
        oficina: cliente.oficina || 'MV',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        direccion: cliente.direccion || '',
        ciudad: cliente.ciudad || '',
        estado: cliente.estado || '',
        codigo_postal: cliente.codigo_postal || '',
        rfc: cliente.rfc || '',
        razon_social: cliente.razon_social || '',
        notas: cliente.notas || '',
        activo: !cliente.activo
      });
    } catch (error) {
      console.error('❌ Error toggleando estado:', error);
      return false;
    }
  };

  // Manejar inicio de edición
  const handleEdit = (cliente: Cliente) => {
    setEditingId(cliente.id);
    setEditForm({
      nombre: cliente.nombre,
      tipo_cliente_id: cliente.tipo_cliente_id || null,
      oficina: cliente.oficina || 'MV',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      ciudad: cliente.ciudad || '',
      estado: cliente.estado || '',
      codigo_postal: cliente.codigo_postal || '',
      rfc: cliente.rfc || '',
      razon_social: cliente.razon_social || '',
      notas: cliente.notas || '',
      activo: cliente.activo ?? true
    });
  };

  // Filtrar clientes por búsqueda
  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefono?.includes(searchTerm) ||
    cliente.rfc?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Resto de handlers (handleCancel, handleSave, etc.) - similares a los otros componentes
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
    if (!newClienteForm.nombre.trim()) return;
    setConfirmAction({ type: 'save', data: { form: newClienteForm } });
    setShowConfirmDialog(true);
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;

    let success = false;

    if (confirmAction.type === 'save') {
      const { id, form } = confirmAction.data;
      if (id) {
        success = await updateCliente(id, form);
        if (success) {
          setEditingId(null);
          setEditForm(null);
        }
      } else {
        success = await createCliente(form);
        if (success) {
          setNewClienteForm({
            nombre: '', tipo_cliente_id: null, oficina: 'MV', telefono: '', email: '',
            direccion: '', ciudad: '', estado: '', codigo_postal: '', rfc: '',
            razon_social: '', notas: '', activo: true
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
    loadTiposCliente();
    loadClientes();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold text-blue-600">{clientes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {clientes.filter(c => c.activo !== false).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Mayoristas</p>
                <p className="text-2xl font-bold text-purple-600">
                  {clientes.filter(c => c.tipo_cliente_nombre === 'Mayorista').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Restaurantes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {clientes.filter(c => c.tipo_cliente_nombre === 'Restaurante').length}
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
              <CardTitle>Clientes</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Gestión de clientes y tipos de cliente
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-teal-600 hover:bg-teal-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nuevo Cliente
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredClientes.map((cliente) => (
              <Card key={cliente.id} className={`${cliente.activo === false ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  {editingId === cliente.id && editForm ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Nombre *</Label>
                          <Input
                            value={editForm.nombre}
                            onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                            placeholder="Nombre del cliente"
                          />
                        </div>
                        <div>
                          <Label>Tipo de Cliente</Label>
                          <Select
                            value={editForm.tipo_cliente_id?.toString() || ''}
                            onValueChange={(value) => setEditForm({...editForm, tipo_cliente_id: parseInt(value) || null})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {tiposCliente.map((tipo) => (
                                <SelectItem key={tipo.id} value={tipo.id.toString()}>
                                  {tipo.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Teléfono</Label>
                          <Input
                            value={editForm.telefono}
                            onChange={(e) => setEditForm({...editForm, telefono: e.target.value})}
                            placeholder="Teléfono"
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            value={editForm.email}
                            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                            placeholder="Email"
                            type="email"
                          />
                        </div>
                        <div>
                          <Label>RFC</Label>
                          <Input
                            value={editForm.rfc}
                            onChange={(e) => setEditForm({...editForm, rfc: e.target.value})}
                            placeholder="RFC"
                          />
                        </div>
                        <div>
                          <Label>Oficina</Label>
                          <Select
                            value={editForm.oficina}
                            onValueChange={(value) => setEditForm({...editForm, oficina: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MV">MV</SelectItem>
                              <SelectItem value="ALV">ALV</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Dirección</Label>
                        <Input
                          value={editForm.direccion}
                          onChange={(e) => setEditForm({...editForm, direccion: e.target.value})}
                          placeholder="Dirección completa"
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
                          <h3 className="font-medium text-gray-900">{cliente.nombre}</h3>
                          <Badge variant="outline" className="text-xs">
                            {cliente.tipo_cliente_nombre}
                          </Badge>
                          <Badge
                            variant={cliente.activo !== false ? "default" : "secondary"}
                            className={`cursor-pointer ${cliente.activo !== false ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 hover:bg-gray-500'}`}
                            onClick={() => handleToggleActivo(cliente.id)}
                          >
                            {cliente.activo !== false ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
                          {cliente.telefono && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {cliente.telefono}
                            </div>
                          )}
                          {cliente.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {cliente.email}
                            </div>
                          )}
                          {cliente.direccion && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {cliente.ciudad || cliente.direccion}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {cliente.id} • Oficina: {cliente.oficina} • RFC: {cliente.rfc || 'N/A'}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(cliente)}
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

          {filteredClientes.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No se encontraron clientes con ese criterio' : 'No hay clientes registrados'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="mt-4 bg-teal-600 hover:bg-teal-700"
                >
                  Agregar Primer Cliente
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para agregar nuevo cliente */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Complete la información del nuevo cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={newClienteForm.nombre}
                  onChange={(e) => setNewClienteForm({...newClienteForm, nombre: e.target.value})}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <Label>Tipo de Cliente</Label>
                <Select
                  value={newClienteForm.tipo_cliente_id?.toString() || ''}
                  onValueChange={(value) => setNewClienteForm({...newClienteForm, tipo_cliente_id: parseInt(value) || null})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposCliente.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id.toString()}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={newClienteForm.telefono}
                  onChange={(e) => setNewClienteForm({...newClienteForm, telefono: e.target.value})}
                  placeholder="Número de teléfono"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={newClienteForm.email}
                  onChange={(e) => setNewClienteForm({...newClienteForm, email: e.target.value})}
                  placeholder="Correo electrónico"
                  type="email"
                />
              </div>
            </div>
            <div>
              <Label>Dirección</Label>
              <Input
                value={newClienteForm.direccion}
                onChange={(e) => setNewClienteForm({...newClienteForm, direccion: e.target.value})}
                placeholder="Dirección completa"
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
              disabled={isUpdating || !newClienteForm.nombre.trim()}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isUpdating ? 'Guardando...' : 'Agregar Cliente'}
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
                  ? '¿Estás seguro de que quieres guardar los cambios en este cliente?'
                  : '¿Estás seguro de que quieres agregar este nuevo cliente?'
                : '¿Estás seguro de que quieres cambiar el estado de este cliente?'
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