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
  estatus: 'Pendiente' | 'En Proceso' | 'Lista para Entrega' | 'Completado';
  notas?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
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
      const { data, error } = await supabase
        .from("pedidos")
        .insert([pedido])
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
      const { data, error } = await supabase
        .from("pedidos")
        .update({ ...pedido, fecha_actualizacion: new Date().toISOString() })
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

  return {
    pedidos,
    loading,
    error,
    fetchPedidos,
    addPedido,
    updatePedido,
    deletePedido,
  };
}