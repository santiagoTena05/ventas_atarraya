"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import type { Pedido } from "@/lib/hooks/usePedidos";

interface PedidoFormProps {
  onSubmit: (pedido: Omit<Pedido, "id" | "fecha_creacion" | "fecha_actualizacion">) => void;
  onCancel: () => void;
  initialData?: Pedido;
  isEditing?: boolean;
}

interface Cliente {
  nombre: string;
  tipo: string;
}

interface Responsable {
  nombre: string;
}

interface Talla {
  nombre: string;
}

interface TipoProducto {
  nombre: string;
}

export function PedidoForm({ onSubmit, onCancel, initialData, isEditing = false }: PedidoFormProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [tallas, setTallas] = useState<Talla[]>([]);
  const [tiposProducto, setTiposProducto] = useState<TipoProducto[]>([]);

  const [formData, setFormData] = useState({
    cliente: initialData?.cliente || "",
    tipo_cliente: initialData?.tipo_cliente || "",
    responsable: initialData?.responsable || "",
    producto: initialData?.producto || "",
    talla: initialData?.talla || "",
    cantidad_estimada: initialData?.cantidad_estimada || 0,
    fecha_estimada_entrega: initialData?.fecha_estimada_entrega || "",
    estatus: initialData?.estatus || "Pendiente" as const,
    notas: initialData?.notas || "",
  });

  // Cargar datos de referencia
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar clientes con sus tipos desde ventas (para tener la relación real)
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

        // Cargar responsables directamente de la tabla responsables
        const { data: responsablesData } = await supabase
          .from("responsables")
          .select("nombre");

        if (responsablesData) {
          setResponsables(responsablesData);
        }

        // Cargar tallas directamente de la tabla tallas_camaron
        const { data: tallasData } = await supabase
          .from("tallas_camaron")
          .select("nombre");

        if (tallasData) {
          setTallas(tallasData);
        }

        // Cargar tipos de producto directamente de la tabla tipos_producto
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
          {isEditing ? "Editar Pedido" : "Nuevo Pedido"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente */}
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

            {/* Tipo Cliente (auto-populate) */}
            <div>
              <Label htmlFor="tipo_cliente">Tipo de Cliente</Label>
              <Input
                id="tipo_cliente"
                value={formData.tipo_cliente}
                readOnly
                className="bg-gray-100"
              />
            </div>

            {/* Responsable */}
            <div>
              <Label htmlFor="responsable">Responsable</Label>
              <Select value={formData.responsable} onValueChange={(value) =>
                setFormData(prev => ({ ...prev, responsable: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar responsable" />
                </SelectTrigger>
                <SelectContent>
                  {responsables.map((resp) => (
                    <SelectItem key={resp.nombre} value={resp.nombre}>
                      {resp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Producto */}
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

            {/* Talla */}
            <div>
              <Label htmlFor="talla">Talla</Label>
              <Select value={formData.talla} onValueChange={(value) =>
                setFormData(prev => ({ ...prev, talla: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar talla" />
                </SelectTrigger>
                <SelectContent>
                  {tallas.map((talla) => (
                    <SelectItem key={talla.nombre} value={talla.nombre}>
                      {talla.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cantidad Estimada */}
            <div>
              <Label htmlFor="cantidad_estimada">Cantidad Estimada (kg)</Label>
              <Input
                id="cantidad_estimada"
                type="number"
                step="0.01"
                value={formData.cantidad_estimada}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  cantidad_estimada: parseFloat(e.target.value) || 0
                }))}
                required
              />
            </div>

            {/* Fecha Estimada Entrega */}
            <div>
              <Label htmlFor="fecha_estimada_entrega">Fecha Estimada de Entrega</Label>
              <Input
                id="fecha_estimada_entrega"
                type="date"
                value={formData.fecha_estimada_entrega}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  fecha_estimada_entrega: e.target.value
                }))}
                required
              />
            </div>

            {/* Estatus */}
            <div>
              <Label htmlFor="estatus">Estatus</Label>
              <Select value={formData.estatus} onValueChange={(value: any) =>
                setFormData(prev => ({ ...prev, estatus: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="En Proceso">En Proceso</SelectItem>
                  <SelectItem value="Lista para Entrega">Lista para Entrega</SelectItem>
                  <SelectItem value="Completado">Completado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notas">Notas / Observaciones</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              placeholder="Observaciones adicionales..."
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
              {isEditing ? "Actualizar" : "Crear"} Pedido
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}