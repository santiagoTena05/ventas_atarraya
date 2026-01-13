"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useInventoryAvailability } from "@/lib/hooks/useInventoryAvailability";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface PedidoFormProps {
  onSubmit: (orderData: any) => void;
  onCancel: () => void;
}

interface Cliente {
  nombre: string;
  tipo: string;
}

interface TipoProducto {
  nombre: string;
}

interface AvailableInventory {
  fecha_semana: string;
  talla_comercial: string;
  inventario_disponible: number;
  inventario_total: number;
  ventas_proyectadas: number;
}

export function PedidoForm({ onSubmit, onCancel }: PedidoFormProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tiposProducto, setTiposProducto] = useState<TipoProducto[]>([]);
  const [availableInventory, setAvailableInventory] = useState<AvailableInventory[]>([]);

  // Inventory availability hook
  const {
    inventoryData,
    loading: inventoryLoading,
    getWeeklySummary
  } = useInventoryAvailability();

  const [formData, setFormData] = useState({
    cliente: "",
    tipo_cliente: "",
    producto: "",
    selectedInventory: null as AvailableInventory | null,
    cantidad: 0,
    notas: "",
  });

  // Process available inventory when data loads
  useEffect(() => {
    console.log('🔍 Processing inventory data:', {
      inventoryData: inventoryData?.length,
      loading: inventoryLoading
    });

    if (inventoryData && inventoryData.length > 0) {
      const inventory: AvailableInventory[] = [];

      // Group by week and size to create available inventory options
      const weeklyData = getWeeklySummary();
      console.log('📊 Weekly data:', weeklyData);

      weeklyData.forEach(week => {
        Object.entries(week.inventory_by_size).forEach(([talla, data]) => {
          if (data.inventario_disponible > 0) {
            inventory.push({
              fecha_semana: week.fecha_semana,
              talla_comercial: talla,
              inventario_disponible: data.inventario_disponible,
              inventario_total: data.inventario_base,
              ventas_proyectadas: data.ventas_registradas
            });
          }
        });
      });

      console.log('✅ Available inventory processed:', inventory.length, 'options');
      setAvailableInventory(inventory);
    }
  }, [inventoryData, getWeeklySummary]);

  // Cargar datos de referencia
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar clientes con sus tipos desde ventas
        const { data: ventasConTipos } = await supabase
          .from("ventas")
          .select(`
            clientes!inner(nombre),
            tipos_cliente!inner(nombre)
          `);

        if (ventasConTipos) {
          const clientesUnicos = Array.from(
            new Map(
              ventasConTipos.map(v => [
                v.clientes.nombre,
                {
                  nombre: v.clientes.nombre,
                  tipo: v.tipos_cliente.nombre
                }
              ])
            ).values()
          );
          setClientes(clientesUnicos);
        }

        // Cargar tipos de producto
        const { data: tiposProductoData } = await supabase
          .from("tipos_producto")
          .select("nombre");

        if (tiposProductoData) {
          setTiposProducto(tiposProductoData);
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
      }
    };

    cargarDatos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.selectedInventory || formData.cantidad <= 0) {
      alert("Por favor selecciona una talla/fecha y cantidad válida");
      return;
    }

    if (formData.cantidad > formData.selectedInventory.inventario_disponible) {
      const confirmed = confirm(
        `⚠️ Cantidad solicitada (${formData.cantidad}kg) excede inventario disponible (${Math.round(formData.selectedInventory.inventario_disponible)}kg).\n\n¿Deseas continuar de todos modos?`
      );
      if (!confirmed) return;
    }

    // Submit the order data - this will register it like a harvest in Estrategia Comercial
    onSubmit({
      cliente: formData.cliente,
      tipo_cliente: formData.tipo_cliente,
      producto: formData.producto,
      fecha_semana: formData.selectedInventory.fecha_semana,
      talla_comercial: formData.selectedInventory.talla_comercial,
      cantidad: formData.cantidad,
      notas: formData.notas,
    });
  };

  const handleClienteChange = (clienteNombre: string) => {
    const cliente = clientes.find(c => c.nombre === clienteNombre);
    setFormData(prev => ({
      ...prev,
      cliente: clienteNombre,
      tipo_cliente: cliente?.tipo || ""
    }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Nuevo Pedido - Interfaz Terceros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente y Producto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cliente">Cliente</Label>
              <Select value={formData.cliente} onValueChange={handleClienteChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.nombre} value={cliente.nombre}>
                      {cliente.nombre} ({cliente.tipo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="producto">Producto</Label>
              <Select value={formData.producto} onValueChange={(value) =>
                setFormData(prev => ({ ...prev, producto: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {tiposProducto.map((tipo) => (
                    <SelectItem key={tipo.nombre} value={tipo.nombre}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Inventario Disponible */}
          <div>
            <Label htmlFor="inventory">Talla / Fecha Disponible</Label>
            <Select
              value={formData.selectedInventory ? `${formData.selectedInventory.fecha_semana}_${formData.selectedInventory.talla_comercial}` : ""}
              onValueChange={(value) => {
                const [fecha_semana, talla_comercial] = value.split('_');
                const selected = availableInventory.find(
                  inv => inv.fecha_semana === fecha_semana && inv.talla_comercial === talla_comercial
                );
                setFormData(prev => ({ ...prev, selectedInventory: selected || null }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar talla y fecha disponible" />
              </SelectTrigger>
              <SelectContent>
                {inventoryLoading ? (
                  <SelectItem value="loading" disabled>
                    Cargando inventario...
                  </SelectItem>
                ) : availableInventory.length === 0 ? (
                  <SelectItem value="no-inventory" disabled>
                    No hay inventario disponible
                  </SelectItem>
                ) : (
                  availableInventory.map((inv) => (
                    <SelectItem
                      key={`${inv.fecha_semana}_${inv.talla_comercial}`}
                      value={`${inv.fecha_semana}_${inv.talla_comercial}`}
                    >
                      {inv.talla_comercial} - Semana del {new Date(inv.fecha_semana).toLocaleDateString('es-MX')} ({Math.round(inv.inventario_disponible)}kg disponible)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Mostrar detalles del inventario seleccionado */}
          {formData.selectedInventory && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                {formData.selectedInventory.talla_comercial} - Semana del {new Date(formData.selectedInventory.fecha_semana).toLocaleDateString('es-MX')}
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded border">
                  <span className="font-medium text-blue-900">Inventario Total:</span>
                  <span className="font-bold text-blue-900 text-lg">{Math.round(formData.selectedInventory.inventario_total)} kg</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded border">
                  <span className="font-medium text-blue-900">Ventas Proyectadas:</span>
                  <span className="font-bold text-red-600 text-lg">-{Math.round(formData.selectedInventory.ventas_proyectadas)} kg</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                  <span className="font-medium text-green-900">Inventario Disponible:</span>
                  <span className="font-bold text-green-600 text-lg">{Math.round(formData.selectedInventory.inventario_disponible)} kg</span>
                </div>
              </div>
            </div>
          )}

          {/* Cantidad solicitada */}
          <div>
            <Label htmlFor="cantidad">Cantidad solicitada (kg)</Label>
            <Input
              id="cantidad"
              type="number"
              step="0.01"
              value={formData.cantidad}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                cantidad: parseFloat(e.target.value) || 0
              }))}
              placeholder="Cantidad en kilogramos"
              required
            />

            {formData.selectedInventory && formData.cantidad > 0 && (
              <div className="mt-2">
                <Alert className={formData.cantidad <= formData.selectedInventory.inventario_disponible ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  <div className="flex items-center space-x-2">
                    {formData.cantidad <= formData.selectedInventory.inventario_disponible ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className="text-sm">
                      {formData.cantidad <= formData.selectedInventory.inventario_disponible
                        ? `✅ Cantidad disponible (${Math.round(formData.selectedInventory.inventario_disponible - formData.cantidad)}kg restante)`
                        : `❌ Cantidad excede inventario. Disponible: ${Math.round(formData.selectedInventory.inventario_disponible)}kg`
                      }
                    </AlertDescription>
                  </div>
                </Alert>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notas">Notas / Observaciones</Label>
            <Input
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              placeholder="Observaciones adicionales..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cerrar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Guardar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}