"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface Pedido {
  id: number;
  cliente: string;
  tipo_cliente: string;
  responsable: string;
  producto: string;
  talla: string;
  cantidad_estimada: number;
  fecha_estimada_entrega: string;
  estatus: 'Pendiente' | 'Confirmado' | 'En Proceso' | 'Lista para Entrega' | 'Completado' | 'Cancelado';
  notas?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  // Campos nuevos para integración con inventario
  fecha_semana?: string;  // Semana específica de entrega
  talla_comercial?: string;  // Talla comercial específica
  plan_id?: string;  // Plan asociado
  registered_sale_id?: string;  // ID de la venta registrada si está confirmado
}

export function usePedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar pedidos
  const fetchPedidos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("fecha_creacion", { ascending: false });

      if (error) throw error;

      setPedidos(data || []);
      console.log("Loaded", data?.length || 0, "pedidos from Supabase");
    } catch (error) {
      console.error("Error loading pedidos:", error);
      setError(error instanceof Error ? error.message : "Error loading pedidos");
    } finally {
      setLoading(false);
    }
  };

  // Agregar pedido
  const addPedido = async (pedido: Omit<Pedido, "id" | "fecha_creacion" | "fecha_actualizacion">) => {
    try {
      // Get active plan if not provided
      let planId = pedido.plan_id;
      if (!planId) {
        const { data: activePlans } = await supabase
          .from('planner_planes')
          .select('id')
          .eq('activo', true)
          .limit(1);

        if (activePlans && activePlans.length > 0) {
          planId = activePlans[0].id;
        }
      }

      const pedidoData = {
        ...pedido,
        plan_id: planId,
        estatus: 'Pendiente' as const,  // Always start as pending
        responsable: 'Portal Terceros'  // Default responsable for external orders
      };

      const { data, error } = await supabase
        .from("pedidos")
        .insert([pedidoData])
        .select()
        .single();

      if (error) throw error;

      setPedidos(prev => [data, ...prev]);
      return { success: true, data };
    } catch (error) {
      console.error("Error adding pedido:", error);
      setError(error instanceof Error ? error.message : "Error adding pedido");
      return { success: false, error };
    }
  };

  // Actualizar pedido
  const updatePedido = async (id: number, pedido: Partial<Pedido>) => {
    try {
      // Get the current pedido to check status change
      const currentPedido = pedidos.find(p => p.id === id);
      const isConfirming = currentPedido?.estatus !== 'Confirmado' && pedido.estatus === 'Confirmado';
      const isCancelling = currentPedido?.estatus === 'Confirmado' && pedido.estatus === 'Cancelado';

      let registeredSaleId = currentPedido?.registered_sale_id;

      // If confirming, create registered sale
      if (isConfirming && currentPedido) {
        console.log('🔄 Confirmando pedido, creando venta registrada...');

        const registeredSale = {
          plan_id: currentPedido.plan_id,
          fecha_semana: currentPedido.fecha_semana,
          talla_comercial: currentPedido.talla_comercial || currentPedido.talla,
          cantidad_kg: currentPedido.cantidad_estimada,
          cliente_nombre: currentPedido.cliente,
          tipo_producto: currentPedido.producto,
          origen: 'pedido_tercero',
          pedido_id: id,
          fecha_registro: new Date().toISOString(),
          notas: `Pedido confirmado #${id} - ${currentPedido.cliente}`
        };

        const { data: saleData, error: saleError } = await supabase
          .from('registered_sales_inventory')
          .insert([registeredSale])
          .select()
          .single();

        if (saleError) {
          console.error('Error creating registered sale:', saleError);
          throw new Error('Error registrando venta en inventario');
        }

        registeredSaleId = saleData.id;
        console.log('✅ Venta registrada creada:', saleData.id);
      }

      // If cancelling a confirmed order, remove registered sale
      if (isCancelling && currentPedido?.registered_sale_id) {
        console.log('🗑️ Cancelando pedido, eliminando venta registrada...');

        const { error: deleteError } = await supabase
          .from('registered_sales_inventory')
          .delete()
          .eq('id', currentPedido.registered_sale_id);

        if (deleteError) {
          console.error('Error deleting registered sale:', deleteError);
          throw new Error('Error eliminando venta registrada');
        }

        registeredSaleId = null;
        console.log('✅ Venta registrada eliminada');
      }

      // Update the pedido
      const { data, error } = await supabase
        .from("pedidos")
        .update({
          ...pedido,
          registered_sale_id: registeredSaleId,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setPedidos(prev => prev.map(p => p.id === id ? data : p));
      return { success: true, data };
    } catch (error) {
      console.error("Error updating pedido:", error);
      setError(error instanceof Error ? error.message : "Error updating pedido");
      return { success: false, error };
    }
  };

  // Eliminar pedido
  const deletePedido = async (id: number) => {
    try {
      // Get the pedido to check if it has a registered sale
      const pedidoToDelete = pedidos.find(p => p.id === id);

      // If pedido is confirmed and has a registered sale, delete it first
      if (pedidoToDelete?.registered_sale_id) {
        console.log('🗑️ Eliminando venta registrada asociada...');

        const { error: saleDeleteError } = await supabase
          .from('registered_sales_inventory')
          .delete()
          .eq('id', pedidoToDelete.registered_sale_id);

        if (saleDeleteError) {
          console.error('Error deleting associated sale:', saleDeleteError);
          // Continue with pedido deletion anyway
        }
      }

      const { error } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setPedidos(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (error) {
      console.error("Error deleting pedido:", error);
      setError(error instanceof Error ? error.message : "Error deleting pedido");
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  // Helper function to confirm a pedido (creates registered sale)
  const confirmPedido = async (id: number) => {
    return updatePedido(id, { estatus: 'Confirmado' });
  };

  // Helper function to cancel a confirmed pedido (removes registered sale)
  const cancelPedido = async (id: number) => {
    return updatePedido(id, { estatus: 'Cancelado' });
  };

  return {
    pedidos,
    loading,
    error,
    fetchPedidos,
    addPedido,
    updatePedido,
    deletePedido,
    confirmPedido,
    cancelPedido
  };
}