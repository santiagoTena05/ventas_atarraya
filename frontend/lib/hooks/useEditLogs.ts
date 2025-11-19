"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface EditLog {
  id: number;
  tabla_nombre: string;
  registro_id: string;
  campo_nombre: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  usuario_id: number | null;
  fecha_edicion: string;
  created_at: string;
}

export function useEditLogs(tablaNombre?: string, registroId?: string) {
  const [logs, setLogs] = useState<EditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!tablaNombre) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('logs_edicion')
        .select('*')
        .eq('tabla_nombre', tablaNombre)
        .order('fecha_edicion', { ascending: false });

      if (registroId) {
        query = query.eq('registro_id', registroId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error cargando logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error cargando logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tablaNombre, registroId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Función para obtener el último log de un campo específico
  const getFieldLastEdit = useCallback((registroId: string, campoNombre: string): EditLog | null => {
    return logs.find(log =>
      log.registro_id === registroId &&
      log.campo_nombre === campoNombre
    ) || null;
  }, [logs]);

  // Función para verificar si un campo fue editado
  const isFieldEdited = useCallback((registroId: string, campoNombre: string): boolean => {
    return getFieldLastEdit(registroId, campoNombre) !== null;
  }, [getFieldLastEdit]);

  // Función para obtener todos los logs de un registro
  const getRecordLogs = useCallback((registroId: string): EditLog[] => {
    return logs.filter(log => log.registro_id === registroId);
  }, [logs]);

  return {
    logs,
    isLoading,
    loadLogs,
    getFieldLastEdit,
    isFieldEdited,
    getRecordLogs
  };
}