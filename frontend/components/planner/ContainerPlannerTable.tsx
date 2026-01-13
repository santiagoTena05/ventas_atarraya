"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useGeneraciones } from '@/hooks/useGeneraciones';
import { useGenetics } from '@/hooks/useGenetics';
import { usePlannerCrud } from '@/hooks/usePlannerCrud';
import { useMuestreos } from '@/lib/hooks/useMuestreos';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { plannerEvents } from '@/lib/events/plannerEvents';
import { supabase } from '@/lib/supabase';
import { getPlanDates } from '@/lib/utils/planDates';

interface LocationData {
  id: number;
  name: string;
  numTanks: number;
  startDate: Date;
  endDate: Date;
  data: Record<string, any>;
  tankNames: Record<number, string>;
  tankTypes: Record<number, string>;
  tankSizes: Record<number, number>;
}

interface ContainerPlannerTableProps {
  location: LocationData;
  locationKey: string;
  externalPlanData?: any;
  currentPlanId?: string;
  weekFilter?: {
    startWeek: number;
    weeksToShow: number;
  };
  refreshTimestamp?: number;
}

// Estados posibles de los tanques
const tankStates = [
  { value: 'Ready', label: 'Listo', color: 'bg-white text-gray-800 border-white' },
  { value: 'Nursery', label: 'Nursery', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'Growout', label: 'Engorde', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'Reservoir', label: 'Reservorio', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'Maintenance', label: 'Mantenimiento', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'Out of order', label: 'Fuera de servicio', color: 'bg-red-100 text-red-800 border-red-200' },
];

// Función para validar si un estado es válido para un tipo de estanque
const isValidStateForTankType = (state: string, tankType: string): boolean => {
  // Estados que son válidos para todos los tipos de estanques
  if (['Ready', 'Reservoir', 'Maintenance', 'Out of order'].includes(state)) {
    return true;
  }

  // Estados específicos por tipo de estanque
  if (state === 'Nursery' && tankType === 'Nursery') {
    return true;
  }

  if (state === 'Growout' && tankType === 'Growout') {
    return true;
  }

  return false;
};


export function ContainerPlannerTable({ location, locationKey, externalPlanData, currentPlanId, weekFilter, refreshTimestamp }: ContainerPlannerTableProps) {
  const { generaciones, getGeneracionOptions } = useGeneraciones();
  const { genetics, getWeightByWeek, calculateTotalBiomass, calculateWeeklyMortalityRate, calculateNurseryWeeklyMortalityRate, getWeeklyMortalityRateByGenetics } = useGenetics();
  const { sesiones: muestreosSesiones } = useMuestreos();

  // Cargar muestreos_detalle que contiene los datos reales (peso, estanque_id)
  const [muestreosDetalle, setMuestreosDetalle] = useState<any[]>([]);

  useEffect(() => {
    const loadMuestreosDetalle = async () => {
      try {
        const { data, error } = await supabase
          .from('muestreos_detalle')
          .select(`
            *,
            muestreos_sesiones!inner (
              id,
              fecha,
              generacion_id,
              generaciones (
                codigo,
                nombre
              )
            )
          `);

        if (error) {
          console.log('Error cargando muestreos_detalle:', error);
          return;
        }

        setMuestreosDetalle(data || []);
      } catch (error) {
        console.log('Error:', error);
      }
    };

    loadMuestreosDetalle();
  }, []);

  // Estado para controlar truncados automáticos ya ejecutados (evitar duplicados)
  const [executedTruncations, setExecutedTruncations] = useState<Set<string>>(new Set());

  // Estado para trackear la última versión de muestreos y planner procesada
  const [lastProcessedMuestreos, setLastProcessedMuestreos] = useState<string>('');
  const [lastProcessedPlanner, setLastProcessedPlanner] = useState<string>('');
  const {
    crearBloque,
    actualizarBloque,
    eliminarBloque,
    crearCelda,
    getCeldaData,
    loadPlannerDataByRange,
    plannerData,
    loading: plannerLoading,
    error: plannerError
  } = usePlannerCrud();
  const [tableData, setTableData] = useState<Record<string, any>>({});
  const [selectedCell, setSelectedCell] = useState<{
    tankId: number;
    week: number;
  } | null>(null);
  const [editData, setEditData] = useState({
    state: '',
    generation: '',
    genetics: '',
    duration: ''
  });
  const [modalView, setModalView] = useState<'details' | 'edit'>('details');
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Ref para controlar múltiples cargas simultáneas
  const isLoadingRef = useRef(false);
  const lastRefreshTimestampRef = useRef<number>(0);

  // Estados para drag and drop
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragType: 'none' | 'move' | 'resize-left' | 'resize-right';
    startPos: { x: number; y: number };
    startCell: { tankId: number; week: number } | null;
    currentBlock: any | null;
    dragStartTime: number;
  }>({
    isDragging: false,
    dragType: 'none',
    startPos: { x: 0, y: 0 },
    startCell: null,
    currentBlock: null,
    dragStartTime: 0
  });

  const [hoverState, setHoverState] = useState<{
    tankId: number;
    week: number;
    zone: 'center' | 'left' | 'right';
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    tankId: number;
    startWeek: number;
    endWeek: number;
    state: string;
    generation: string;
    genetics: string;
  } | null>(null);

  // Calcular número de semanas (total y filtradas)
  const getTotalWeeks = () => {
    const diffTime = Math.abs(location.endDate.getTime() - location.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  };

  const totalWeeks = getTotalWeeks();
  const startWeekIndex = weekFilter?.startWeek || 0;
  const weeksToShow = weekFilter?.weeksToShow || totalWeeks;
  const numWeeks = Math.min(weeksToShow, totalWeeks - startWeekIndex);

  // Funciones para manejar drag operations
  const performResizeRightLocal = (deltaWeeks: number) => {
    if (!dragState.currentBlock || !dragState.startCell) return;

    const { tankId } = dragState.startCell;
    const originalStartWeek = dragState.currentBlock.startWeek;
    const originalEndWeek = dragState.currentBlock.endWeek;
    const newEndWeek = originalEndWeek + deltaWeeks;

    // Validaciones - permitir contraer y expandir
    if (newEndWeek <= originalStartWeek || newEndWeek < 0) return;
    // Solo validar límite superior cuando se expande
    if (deltaWeeks > 0 && newEndWeek >= totalWeeks) return;

    // console.log('📏 Resize derecho:', { originalEndWeek, newEndWeek, deltaWeeks, totalWeeks });

    // Actualizar las celdas afectadas
    setTableData(prev => {
      const newData = { ...prev };
      const { state, generation, genetics } = dragState.currentBlock;

      if (deltaWeeks > 0) {
        // Expandir: agregar celdas al final
        for (let week = originalEndWeek + 1; week <= newEndWeek; week++) {
          const cellKey = `tank-${tankId}-week-${week}`;
          newData[cellKey] = state;
          newData[`${cellKey}-generation`] = generation;
          newData[`${cellKey}-genetics`] = genetics;
          newData[`${cellKey}-duration`] = '';
        }
      } else {
        // Contraer: remover celdas del final
        // console.log('🔪 Contrayendo bloque:', { newEndWeek, originalEndWeek });
        for (let week = newEndWeek + 1; week <= originalEndWeek; week++) {
          const cellKey = `tank-${tankId}-week-${week}`;
          // console.log('🗑️ Eliminando celda:', cellKey);
          delete newData[cellKey];
          delete newData[`${cellKey}-generation`];
          delete newData[`${cellKey}-genetics`];
          delete newData[`${cellKey}-duration`];
        }
      }

      return newData;
    });

  };

  const performResizeLeftLocal = (deltaWeeks: number) => {
    if (!dragState.currentBlock || !dragState.startCell) return;

    const { tankId } = dragState.startCell;
    const originalStartWeek = dragState.currentBlock.startWeek;
    const originalEndWeek = dragState.currentBlock.endWeek;
    const newStartWeek = originalStartWeek + deltaWeeks;

    // Validaciones - permitir contraer y expandir desde la izquierda
    if (newStartWeek >= originalEndWeek) return;
    // Solo validar límite inferior cuando se expande hacia la izquierda
    if (deltaWeeks < 0 && newStartWeek < 0) return;

    // console.log('📏 Resize izquierdo:', { originalStartWeek, newStartWeek, deltaWeeks, totalWeeks });

    // Actualizar las celdas afectadas
    setTableData(prev => {
      const newData = { ...prev };
      const { state, generation, genetics } = dragState.currentBlock;

      if (deltaWeeks > 0) {
        // Contraer desde la izquierda: remover celdas del inicio
        for (let week = originalStartWeek; week < newStartWeek; week++) {
          const cellKey = `tank-${tankId}-week-${week}`;
          delete newData[cellKey];
          delete newData[`${cellKey}-generation`];
          delete newData[`${cellKey}-genetics`];
          delete newData[`${cellKey}-duration`];
        }
      } else {
        // Expandir hacia la izquierda: agregar celdas al inicio
        for (let week = newStartWeek; week < originalStartWeek; week++) {
          const cellKey = `tank-${tankId}-week-${week}`;
          newData[cellKey] = state;
          newData[`${cellKey}-generation`] = generation;
          newData[`${cellKey}-genetics`] = genetics;
          newData[`${cellKey}-duration`] = '';
        }
      }

      return newData;
    });

  };

  const performMoveLocal = (deltaWeeks: number, deltaTanks: number) => {
    if (!dragState.currentBlock || !dragState.startCell) return;

    const { tankId: originalTankId } = dragState.startCell;
    const newTankId = originalTankId + deltaTanks;
    const originalStartWeek = dragState.currentBlock.startWeek;
    const originalEndWeek = dragState.currentBlock.endWeek;
    const newStartWeek = originalStartWeek + deltaWeeks;
    const newEndWeek = originalEndWeek + deltaWeeks;

    // Validaciones
    if (newStartWeek < 0 || newEndWeek >= totalWeeks) return;
    if (!location.tankNames[newTankId]) return; // Verificar que el tanque exista

    console.log('🔄 Movimiento de bloque:', {
      originalTankId, newTankId,
      originalStartWeek, newStartWeek,
      originalEndWeek, newEndWeek
    });

    // Actualizar las celdas afectadas
    setTableData(prev => {
      const newData = { ...prev };
      const { state, generation, genetics } = dragState.currentBlock;

      // Limpiar posición original
      for (let week = originalStartWeek; week <= originalEndWeek; week++) {
        const cellKey = `tank-${originalTankId}-week-${week}`;
        delete newData[cellKey];
        delete newData[`${cellKey}-generation`];
        delete newData[`${cellKey}-genetics`];
        delete newData[`${cellKey}-duration`];
      }

      // Colocar en nueva posición
      for (let week = newStartWeek; week <= newEndWeek; week++) {
        const cellKey = `tank-${newTankId}-week-${week}`;
        newData[cellKey] = state;
        newData[`${cellKey}-generation`] = generation;
        newData[`${cellKey}-genetics`] = genetics;
        newData[`${cellKey}-duration`] = '';
      }

      return newData;
    });

  };

  // Función helper para guardar bloque en Supabase
  const saveBlockToSupabase = async (tankId: number, startWeek: number, duration: number, blockData: any) => {
    if (!currentPlanId) return;

    // Validar que el estado sea válido para el tipo de estanque
    const tankType = location.tankTypes[tankId];
    if (!isValidStateForTankType(blockData.state, tankType)) {
      console.log(`❌ Estado "${blockData.state}" no es válido para estanque tipo "${tankType}"`);
      alert(`Error: El estado "${blockData.state}" no es válido para este tipo de estanque (${tankType}).
      ${tankType === 'Nursery' ? 'Este estanque solo puede usarse para Nursery.' : 'Este estanque solo puede usarse para Growout.'}`);
      return;
    }

    try {
      console.log('🔍 Datos del bloque a guardar:', blockData);
      console.log('🔍 Generaciones disponibles:', generaciones.map(g => ({ id: g.id, codigo: g.codigo })));
      console.log('🔍 Genéticas disponibles:', genetics.map(g => ({ id: g.id, name: g.name })));

      // Buscar generación y genética IDs
      const generacionSeleccionada = generaciones.find(g => g.codigo === blockData.generation);
      const geneticaSeleccionada = genetics.find(g => g.id === parseInt(blockData.genetics));

      console.log('🎯 Generación encontrada:', generacionSeleccionada);
      console.log('🎯 Genética encontrada:', geneticaSeleccionada);

      // PRIMERO: Eliminar bloques existentes que se superponen con el mismo tanque, estado, generación y genética
      const fechaInicio = location.startDate.toISOString().split('T')[0];
      const fechaFin = location.endDate.toISOString().split('T')[0];

      console.log('🗑️ Eliminando bloques existentes que se superponen...');
      const existingData = await loadPlannerDataByRange(currentPlanId, fechaInicio, fechaFin, [tankId]);

      for (const item of existingData) {
        if (item.tipo === 'bloque' &&
            item.estanque_id === tankId &&
            item.estado === blockData.state &&
            item.generacion_id === generacionSeleccionada?.id &&
            item.genetica_id === geneticaSeleccionada?.id) {

          console.log('🗑️ Eliminando bloque existente:', item);
          await eliminarBloque(item.id);
        }
      }

      // SEGUNDO: Crear el nuevo bloque
      await crearBloque({
        plan_id: currentPlanId,
        estanque_id: tankId,
        semana_inicio: startWeek,
        duracion: duration,
        estado: blockData.state,
        generacion_id: generacionSeleccionada?.id || null,
        genetica_id: geneticaSeleccionada?.id || null,
        observaciones: `Modificado con drag & drop - ${blockData.state}`
      });

      console.log('✅ Bloque guardado en Supabase:', {
        tankId,
        startWeek,
        duration,
        estado: blockData.state,
        generacion_id: generacionSeleccionada?.id,
        genetica_id: geneticaSeleccionada?.id
      });
    } catch (error) {
      console.log('❌ Error guardando bloque en Supabase:', error);
    }
  };

  // Actualizar preview visual durante el drag
  const updateDragPreview = (deltaWeeks: number, deltaTanks: number) => {
    if (!dragState.currentBlock || !dragState.startCell) return;

    const { tankId: originalTankId } = dragState.startCell;
    const { state, generation, genetics } = dragState.currentBlock;
    const originalStartWeek = dragState.currentBlock.startWeek;
    const originalEndWeek = dragState.currentBlock.endWeek;

    let previewTankId = originalTankId;
    let previewStartWeek = originalStartWeek;
    let previewEndWeek = originalEndWeek;

    if (dragState.dragType === 'resize-right') {
      previewEndWeek = originalEndWeek + deltaWeeks;
    } else if (dragState.dragType === 'resize-left') {
      previewStartWeek = originalStartWeek + deltaWeeks;
    } else if (dragState.dragType === 'move') {
      previewTankId = originalTankId + deltaTanks;
      previewStartWeek = originalStartWeek + deltaWeeks;
      previewEndWeek = originalEndWeek + deltaWeeks;
    }

    // Validaciones para el preview
    if (previewStartWeek < 0 || previewEndWeek >= totalWeeks ||
        previewStartWeek >= previewEndWeek ||
        !location.tankNames[previewTankId]) {
      setDragPreview(null);
      return;
    }

    setDragPreview({
      tankId: previewTankId,
      startWeek: previewStartWeek,
      endWeek: previewEndWeek,
      state,
      generation,
      genetics
    });
  };

  // Recargar datos del planner desde Supabase
  const reloadPlannerData = async () => {
    if (!currentPlanId) return;

    // Verificar que tengamos los datos necesarios para el mapeo
    if (generaciones.length === 0 || genetics.length === 0) {
      console.log('⚠️ No se puede recargar datos del planner - faltan generaciones o genéticas');
      return;
    }

    // Evitar múltiples cargas simultáneas
    if (isLoadingRef.current) {
      console.log('🔒 Ya hay una carga en progreso, saltando...');
      return;
    }

    isLoadingRef.current = true;

    try {
      // console.log('🔄 Recargando datos del planner desde Supabase...');

      const fechaInicio = location.startDate.toISOString().split('T')[0];
      const fechaFin = location.endDate.toISOString().split('T')[0];

      // Obtener IDs de estanques para esta ubicación
      const tankIds = Object.keys(location.tankNames).map(id => parseInt(id));

      const data = await loadPlannerDataByRange(currentPlanId, fechaInicio, fechaFin, tankIds);

      // console.log('📊 Datos recibidos desde Supabase:', data);

      // Convertir datos de Supabase a formato de tableData
      const newTableData: Record<string, any> = {};

      data.forEach(item => {
        if (item.tipo === 'bloque') {
          // Aplicar datos del bloque a todas las semanas que abarca
          for (let semana = item.semana_inicio; semana <= item.semana_fin; semana++) {
            const cellKey = `tank-${item.estanque_id}-week-${semana}`;
            newTableData[cellKey] = item.estado;

            if (item.generacion_id) {
              // Buscar código de generación
              const generacion = generaciones.find(g => g.id === item.generacion_id);
              // console.log('🔢 Buscando generación:', { item_generacion_id: item.generacion_id, generacion_encontrada: generacion });
              if (generacion) {
                newTableData[`${cellKey}-generation`] = generacion.codigo;
              }
            }

            if (item.genetica_id) {
              // Buscar nombre de genética - Corregir inconsistencia aquí
              const genetica = genetics.find(g => g.id === item.genetica_id);
              // console.log('🧬 Buscando genética:', { item_genetica_id: item.genetica_id, genetica_encontrada: genetica });
              if (genetica) {
                newTableData[`${cellKey}-genetics`] = genetica.id.toString();
              }
            }

            // Calcular duración del bloque
            const duracion = item.semana_fin - item.semana_inicio + 1;
            newTableData[`${cellKey}-duration`] = duracion.toString();
          }
        } else if (item.tipo === 'celda') {
          // Celda suelta
          const cellKey = `tank-${item.estanque_id}-week-${item.semana_inicio}`;
          newTableData[cellKey] = item.estado;

          if (item.generacion_id) {
            const generacion = generaciones.find(g => g.id === item.generacion_id);
            if (generacion) {
              newTableData[`${cellKey}-generation`] = generacion.codigo;
            }
          }

          if (item.genetica_id) {
            const genetica = genetics.find(g => g.id === item.genetica_id);
            if (genetica) {
              newTableData[`${cellKey}-genetics`] = genetica.id.toString();
            }
          }
        }
      });

      setTableData(newTableData);
      // console.log('✅ Datos del planner recargados desde Supabase');

    } catch (error) {
      console.log('❌ Error recargando datos del planner:', error);
    } finally {
      isLoadingRef.current = false;
    }
  };

  // Guardar estado final del drag en Supabase
  const saveFinalDragToSupabase = async (finalDeltaWeeks: number, finalDeltaTanks: number) => {
    if (!dragState.currentBlock || !dragState.startCell || !currentPlanId) return;

    try {
      const { tankId: originalTankId } = dragState.startCell;
      const originalStartWeek = dragState.currentBlock.startWeek;
      const originalEndWeek = dragState.currentBlock.endWeek;

      let finalTankId = originalTankId;
      let finalStartWeek = originalStartWeek;
      let finalEndWeek = originalEndWeek;

      if (dragState.dragType === 'resize-right') {
        finalEndWeek = originalEndWeek + finalDeltaWeeks;
      } else if (dragState.dragType === 'resize-left') {
        finalStartWeek = originalStartWeek + finalDeltaWeeks;
      } else if (dragState.dragType === 'move') {
        finalTankId = originalTankId + finalDeltaTanks;
        finalStartWeek = originalStartWeek + finalDeltaWeeks;
        finalEndWeek = originalEndWeek + finalDeltaWeeks;
      }

      // Validaciones
      if (finalStartWeek < 0 || finalEndWeek >= totalWeeks || finalStartWeek >= finalEndWeek || !location.tankNames[finalTankId]) {
        console.log('❌ Drag inválido - no se guardará en Supabase');
        return;
      }

      // Guardar en Supabase
      await saveBlockToSupabase(finalTankId, finalStartWeek, finalEndWeek - finalStartWeek + 1, dragState.currentBlock);

      console.log('✅ Drag guardado exitosamente en Supabase');

      // Recargar datos del planner para reflejar los cambios guardados
      // Pequeño delay para asegurar que Supabase procesó los cambios
      setTimeout(async () => {
        await reloadPlannerData();
      }, 500);
    } catch (error) {
      console.log('❌ Error guardando drag final:', error);
    }
  };

  // Efecto para manejar eventos globales de drag
  useEffect(() => {
    if (!dragState.isDragging) return;

    console.log('📡 Registrando listeners globales para drag');

    const handleGlobalMouseMove = (e: MouseEvent) => {
      console.log('🏃 Global mouse move durante drag:', {
        isDragging: dragState.isDragging,
        dragType: dragState.dragType,
        mousePos: { x: e.clientX, y: e.clientY }
      });

      const timeDiff = Date.now() - dragState.dragStartTime;
      const distance = Math.sqrt(
        Math.pow(e.clientX - dragState.startPos.x, 2) +
        Math.pow(e.clientY - dragState.startPos.y, 2)
      );

      // Solo empezar drag después de un pequeño movimiento o tiempo
      if (timeDiff < 150 && distance < 8) return;

      console.log('🎯 Actualizando:', { dragType: dragState.dragType, distance });

      // Calcular movimiento en celdas basado en la diferencia de mouse
      const deltaX = e.clientX - dragState.startPos.x;
      const deltaY = e.clientY - dragState.startPos.y;
      const cellWidth = 48; // Aprox 48px por celda
      const cellHeight = 48; // Aprox 48px por celda
      const deltaWeeks = Math.round(deltaX / cellWidth);
      const deltaTanks = Math.round(deltaY / cellHeight);

      // Actualizar preview visual durante el drag
      updateDragPreview(deltaWeeks, deltaTanks);

      // Implementar la lógica de resize/move basada en el tipo de drag (solo estado local durante drag)
      if (dragState.dragType === 'resize-right') {
        performResizeRightLocal(deltaWeeks);
      } else if (dragState.dragType === 'resize-left') {
        performResizeLeftLocal(deltaWeeks);
      } else if (dragState.dragType === 'move') {
        performMoveLocal(deltaWeeks, deltaTanks);
      }
    };

    const handleGlobalMouseUp = async (e: MouseEvent) => {
      console.log('🏁 Drag terminado desde useEffect');

      // Verificar si fue un click simple o un drag real
      const finalDeltaX = e.clientX - dragState.startPos.x;
      const finalDeltaY = e.clientY - dragState.startPos.y;
      const distance = Math.sqrt(finalDeltaX * finalDeltaX + finalDeltaY * finalDeltaY);
      const timeDiff = Date.now() - dragState.dragStartTime;

      const wasSimpleClick = timeDiff < 200 && distance < 10;

      console.log('🔍 Análisis del mouse up:', { distance, timeDiff, wasSimpleClick });

      if (wasSimpleClick && dragState.startCell) {
        // Fue un click simple - abrir editor de celda
        console.log('📱 Click simple detectado - abriendo editor');
        openCellEditor(dragState.startCell.tankId, dragState.startCell.week);
      } else if (dragState.currentBlock && dragState.startCell && !wasSimpleClick) {
        // Fue un drag real - guardar cambios
        console.log('🔄 Drag real detectado - guardando cambios');
        const cellWidth = 48;
        const cellHeight = 48;
        const finalDeltaWeeks = Math.round(finalDeltaX / cellWidth);
        const finalDeltaTanks = Math.round(finalDeltaY / cellHeight);

        await saveFinalDragToSupabase(finalDeltaWeeks, finalDeltaTanks);
      }

      setDragState({
        isDragging: false,
        dragType: 'none',
        startPos: { x: 0, y: 0 },
        startCell: null,
        currentBlock: null,
        dragStartTime: 0
      });
      setDragPreview(null); // Limpiar preview al finalizar
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      console.log('🧹 Limpiando listeners globales');
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragState.isDragging, dragState.dragType, dragState.startPos, dragState.dragStartTime]);

  // Generar encabezados de semanas (solo las visibles)
  const getWeekHeaders = () => {
    const weeks = [];
    const startDate = new Date(location.startDate);

    for (let i = startWeekIndex; i < startWeekIndex + numWeeks; i++) {
      const weekDate = new Date(startDate);
      weekDate.setDate(startDate.getDate() + (i * 7));

      weeks.push({
        index: i,
        label: `S${i + 1}`,
        date: weekDate.toLocaleDateString('es-ES', {
          month: '2-digit',
          day: '2-digit'
        })
      });
    }

    return weeks;
  };

  const weekHeaders = getWeekHeaders();

  // Función para detectar bloques consecutivos de la misma generación
  const getBlocksForTank = (tankId: number) => {
    const blocks = [];
    let currentBlock = null;

    for (let week = 0; week < numWeeks; week++) {
      const weekIndex = startWeekIndex + week; // Usar índice absoluto
      const cellData = getCellData(tankId, weekIndex);
      const blockKey = `${cellData.state}-${cellData.generation}-${cellData.genetics}`;

      if (!currentBlock || currentBlock.key !== blockKey) {
        // Comenzar nuevo bloque
        if (currentBlock) {
          blocks.push(currentBlock);
        }

        currentBlock = {
          key: blockKey,
          state: cellData.state,
          generation: cellData.generation,
          genetics: cellData.genetics,
          startWeek: weekIndex, // Usar índice absoluto
          endWeek: weekIndex,   // Usar índice absoluto
          duration: cellData.duration
        };
      } else {
        // Extender bloque actual
        currentBlock.endWeek = weekIndex; // Usar índice absoluto
      }
    }

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  };

  // Obtener estado de una celda
  const getCellData = (tankId: number, week: number) => {
    const cellKey = `tank-${tankId}-week-${week}`;
    return {
      state: tableData[cellKey] || 'Ready',
      generation: tableData[`${cellKey}-generation`] || '',
      genetics: tableData[`${cellKey}-genetics`] || '',
      duration: tableData[`${cellKey}-duration`] || ''
    };
  };

  // Detectar en qué zona del bloque está el mouse (centro, borde izquierdo, borde derecho)
  const detectHoverZone = (event: React.MouseEvent, tankId: number, week: number): 'center' | 'left' | 'right' => {
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const cellWidth = rect.width;

    const blocks = getBlocksForTank(tankId);
    const block = blocks.find(b => week >= b.startWeek && week <= b.endWeek);

    if (!block || block.state === 'Ready') return 'center';

    // Solo mostrar handles de resize en los extremos del bloque
    if (week === block.startWeek && mouseX < 8) return 'left';
    if (week === block.endWeek && mouseX > cellWidth - 8) return 'right';

    return 'center';
  };

  // Manejar inicio de interacción (mousedown)
  const handleMouseDown = (event: React.MouseEvent, tankId: number, week: number) => {
    console.log('🖱️ MouseDown detectado:', { tankId, week });

    const zone = detectHoverZone(event, tankId, week);
    console.log('📍 Zona detectada:', zone);

    const blocks = getBlocksForTank(tankId);
    console.log('📊 Bloques del tanque:', blocks);

    const currentBlock = blocks.find(b => week >= b.startWeek && week <= b.endWeek);
    console.log('🎯 Bloque actual:', currentBlock);

    const dragType = zone === 'left' ? 'resize-left' : zone === 'right' ? 'resize-right' : 'move';

    setDragState({
      isDragging: true,
      dragType,
      startPos: { x: event.clientX, y: event.clientY },
      startCell: { tankId, week },
      currentBlock,
      dragStartTime: Date.now()
    });

    console.log('🚀 Drag iniciado:', { dragType, tankId, week });

    // Prevenir default behavior del mousedown
    event.preventDefault();
  };


  // Manejar movimiento del mouse (eventos locales - mantenido para compatibilidad)
  const handleMouseMove = (event: React.MouseEvent) => {
    // Esta función ya no es necesaria para drag, pero la mantemos
    return;

    const timeDiff = Date.now() - dragState.dragStartTime;
    const distance = Math.sqrt(
      Math.pow(event.clientX - dragState.startPos.x, 2) +
      Math.pow(event.clientY - dragState.startPos.y, 2)
    );

    // Iniciar drag si se mueve más de 5px o pasa más de 200ms
    if (!dragState.isDragging && (distance > 5 || timeDiff > 200)) {
      const dragType = dragState.dragType !== 'none' ? dragState.dragType : 'move';
      setDragState(prev => ({ ...prev, isDragging: true, dragType }));
    }
  };

  // Manejar fin de interacción (mouseup)
  const handleMouseUp = (event: React.MouseEvent, tankId?: number, week?: number) => {
    const timeDiff = Date.now() - dragState.dragStartTime;
    const distance = Math.sqrt(
      Math.pow(event.clientX - dragState.startPos.x, 2) +
      Math.pow(event.clientY - dragState.startPos.y, 2)
    );

    if (!dragState.isDragging && timeDiff < 200 && distance < 5) {
      // Click normal - abrir modal
      if (dragState.startCell) {
        openCellEditor(dragState.startCell.tankId, dragState.startCell.week);
      }
    } else if (dragState.isDragging) {
      // Completar operación de drag
      completeDragOperation(tankId, week);
    }

    // Reset drag state
    setDragState({
      isDragging: false,
      dragType: 'none',
      startPos: { x: 0, y: 0 },
      startCell: null,
      currentBlock: null,
      dragStartTime: 0
    });

    // Restaurar cursor
    document.body.style.cursor = '';
  };

  // Completar operación de drag
  const completeDragOperation = (dropTankId?: number, dropWeek?: number) => {
    if (!dragState.startCell || !dragState.currentBlock) return;

    const newTableData = { ...tableData };

    if (dragState.dragType === 'move' && dropTankId !== undefined && dropWeek !== undefined) {
      // Mover bloque completo
      const block = dragState.currentBlock;
      const blockDuration = block.endWeek - block.startWeek + 1;

      // Limpiar posición original
      for (let week = block.startWeek; week <= block.endWeek; week++) {
        const cellKey = `tank-${dragState.startCell.tankId}-week-${week}`;
        delete newTableData[cellKey];
        delete newTableData[`${cellKey}-generation`];
        delete newTableData[`${cellKey}-genetics`];
        delete newTableData[`${cellKey}-duration`];
      }

      // Aplicar en nueva posición
      const endWeek = Math.min(dropWeek + blockDuration - 1, numWeeks - 1);
      for (let week = dropWeek; week <= endWeek; week++) {
        const cellKey = `tank-${dropTankId}-week-${week}`;
        newTableData[cellKey] = block.state;
        if (block.generation) newTableData[`${cellKey}-generation`] = block.generation;
        if (block.genetics) newTableData[`${cellKey}-genetics`] = block.genetics;
        if (block.duration) newTableData[`${cellKey}-duration`] = block.duration;
      }

    } else if (dragState.dragType.startsWith('resize-')) {
      // Resize bloque
      handleBlockResize(dropTankId, dropWeek);
    }

    setTableData(newTableData);
  };

  // Manejar resize de bloque
  const handleBlockResize = (dropTankId?: number, dropWeek?: number) => {
    if (!dragState.currentBlock || !dragState.startCell || dropTankId === undefined || dropWeek === undefined) return;

    const block = dragState.currentBlock;
    const newTableData = { ...tableData };

    // Limpiar bloque original
    for (let week = block.startWeek; week <= block.endWeek; week++) {
      const cellKey = `tank-${dragState.startCell.tankId}-week-${week}`;
      delete newTableData[cellKey];
      delete newTableData[`${cellKey}-generation`];
      delete newTableData[`${cellKey}-genetics`];
      delete newTableData[`${cellKey}-duration`];
    }

    // Calcular nuevos límites
    let newStartWeek = block.startWeek;
    let newEndWeek = block.endWeek;

    if (dragState.dragType === 'resize-left') {
      newStartWeek = Math.max(0, Math.min(dropWeek, block.endWeek));
    } else if (dragState.dragType === 'resize-right') {
      newEndWeek = Math.max(block.startWeek, Math.min(dropWeek, numWeeks - 1));
    }

    const newDuration = newEndWeek - newStartWeek + 1;

    // Aplicar bloque redimensionado
    for (let week = newStartWeek; week <= newEndWeek; week++) {
      const cellKey = `tank-${dragState.startCell.tankId}-week-${week}`;
      newTableData[cellKey] = block.state;
      if (block.generation) newTableData[`${cellKey}-generation`] = block.generation;
      if (block.genetics) newTableData[`${cellKey}-genetics`] = block.genetics;
      newTableData[`${cellKey}-duration`] = newDuration.toString();
    }
  };

  // Manejar hover para mostrar zonas de interacción
  const handleCellHover = (event: React.MouseEvent, tankId: number, week: number) => {
    if (!dragState.isDragging) {
      const zone = detectHoverZone(event, tankId, week);
      // console.log('👆 Hover detectado:', { tankId, week, zone });
      setHoverState({ tankId, week, zone });
    }
  };

  // Función para encontrar el inicio del ciclo continuo (Nursery → Growout)
  const findCycleStart = (generation: string, genetics: string, currentWeek: number) => {
    // Buscar en todos los tanques un bloque Nursery de la misma generación/genética que termine antes o en la semana actual
    const allBlocks = [];

    // Recopilar todos los bloques de todos los tanques
    Object.keys(location.tankNames).forEach(tankIdStr => {
      const tankId = parseInt(tankIdStr);
      const tankBlocks = getBlocksForTank(tankId);
      tankBlocks.forEach(block => {
        allBlocks.push({ ...block, tankId });
      });
    });

    // Buscar bloque Nursery de la misma generación/genética
    const nurseryBlock = allBlocks.find(block =>
      block.state === 'Nursery' &&
      block.generation === generation &&
      block.genetics === genetics &&
      block.endWeek <= currentWeek
    );

    return nurseryBlock ? nurseryBlock.startWeek : null;
  };

  // Función para buscar datos reales de muestreos para una celda específica
  const findRealDataForCell = (tankId: number, week: number, generation: string, genetics: string) => {
    if (!muestreosSesiones || muestreosSesiones.length === 0) {
      return null;
    }

    // Buscar la generación correspondiente
    const targetGeneracion = generaciones.find(g => g.codigo === generation);
    if (!targetGeneracion) return null;

    // Buscar datos reales: coincidencia exacta de tanque, generación y SEMANA
    // Convertir semana absoluta del planner (base 0) a semana del muestreo (base 1)
    const targetWeek = week + 1;

    // 🔧 Filtrar por año del plan actual (igual que en Analytics.tsx)
    const planDates = getPlanDates();
    const planStartDate = planDates.startDate;
    const planEndDate = planDates.endDate;

    for (const sesion of muestreosSesiones) {
      // Verificar si coincide la generación
      if (sesion.generacionId !== targetGeneracion.id) continue;

      // Verificar si coincide la semana exacta
      if (sesion.semana !== targetWeek) continue;

      // 🔧 Filtrar por fecha del plan: solo considerar muestreos del año actual del plan
      const muestreoDate = new Date(sesion.fecha);
      const dateInRange = muestreoDate >= planStartDate && muestreoDate <= planEndDate;
      if (!dateInRange) {
        continue;
      }

      // Verificar si existe muestreo para este tanque
      const muestreo = sesion.muestreos[tankId.toString()];
      if (muestreo) {
        return {
          biomasa: muestreo.biomasa || 0,
          averageSize: muestreo.averageSize || muestreo.promedio || 0,
          cosecha: muestreo.cosecha || 0,
          cosechaTotal: muestreo.cosechaTotal || 0,
          poblacionCosechada: muestreo.poblacionCosechada || 0,
          semanaCultivo: muestreo.semanaCultivo || 1,
          fecha: sesion.fecha,
          semanaRegistrada: sesion.semana,
          isRealData: true
        };
      }
    }

    return null;
  };

  // Función para obtener el target_weight desde los datos originales de BD
  const getTargetWeightForBlock = (tankId: number, generation: string, genetics: string) => {
    // Buscar en los datos cargados desde Supabase
    if (!plannerData || plannerData.length === 0) return null;

    const matchingBlock = plannerData.find(item =>
      item.estanque_id === tankId &&
      item.generacion_id === generaciones.find(g => g.codigo === generation)?.id &&
      item.genetica_id === parseInt(genetics) &&
      item.estado === 'Growout'
    );

    return matchingBlock?.target_weight || null;
  };

  // Función para encontrar la última semana con datos reales para un tanque y generación
  const findLastRealDataWeek = (tankId: number, generation: string) => {
    if (!muestreosSesiones || muestreosSesiones.length === 0) {
      return null;
    }

    // Buscar la generación correspondiente
    const targetGeneracion = generaciones.find(g => g.codigo === generation);
    if (!targetGeneracion) return null;

    // 🔧 Filtrar por año del plan actual (igual que en Analytics.tsx)
    const planDates = getPlanDates();
    const planStartDate = planDates.startDate;
    const planEndDate = planDates.endDate;

    let lastWeekData = null;
    let maxWeek = -1;

    for (const sesion of muestreosSesiones) {
      // Verificar si coincide la generación
      if (sesion.generacionId !== targetGeneracion.id) continue;

      // 🔧 Filtrar por fecha del plan: solo considerar muestreos del año actual del plan
      const muestreoDate = new Date(sesion.fecha);
      const dateInRange = muestreoDate >= planStartDate && muestreoDate <= planEndDate;
      if (!dateInRange) continue;

      // Verificar si existe muestreo para este tanque
      const muestreo = sesion.muestreos[tankId.toString()];
      if (muestreo && sesion.semana && sesion.semana > maxWeek) {
        maxWeek = sesion.semana;
        lastWeekData = {
          week: sesion.semana - 1, // Convertir de base 1 a base 0 para el planner
          realWeek: sesion.semana,
          biomasa: muestreo.biomasa || 0,
          averageSize: muestreo.averageSize || muestreo.promedio || 0,
          semanaCultivo: muestreo.semanaCultivo || sesion.semana, // Usar semana si no hay semanaCultivo
          fecha: sesion.fecha,
          poblacion: muestreo.poblacion || 0
        };
      }
    }

    return lastWeekData;
  };

  // Función para calcular cuándo se alcanzará el peso objetivo desde datos reales
  const calculateWeeksToTargetWeight = (currentWeight: number, targetWeight: number, geneticsId: number, currentWeekInCycle: number) => {
    if (currentWeight >= targetWeight) {
      return 0; // Ya alcanzó el objetivo
    }

    // Usar la curva de crecimiento para proyectar semanas adicionales
    const maxWeeksToCheck = 20; // Límite de búsqueda

    for (let additionalWeeks = 1; additionalWeeks <= maxWeeksToCheck; additionalWeeks++) {
      const projectedWeek = currentWeekInCycle + additionalWeeks;
      const projectedWeight = getWeightByWeek(geneticsId, projectedWeek - 1); // getWeightByWeek usa base 0

      if (projectedWeight >= targetWeight) {
        console.log(`🎯 Peso objetivo ${targetWeight}g alcanzado en semana ${projectedWeek} (peso proyectado: ${projectedWeight.toFixed(2)}g)`);
        return additionalWeeks;
      }
    }

    return maxWeeksToCheck; // No encontró el objetivo en el rango
  };

  // Función para truncar automáticamente un bloque cuando se detectan datos reales
  const truncateGanttBlockAutomatically = async (tankId: number, block: any, newEndWeek: number) => {
    if (!currentPlanId) return;

    try {
      console.log(`✂️ Iniciando truncado automático del bloque:`, {
        blockId: block.id,
        tankId,
        endWeekOriginal: block.endWeek,
        endWeekNuevo: newEndWeek
      });

      const result = await actualizarBloque(block.id, {
        endWeek: newEndWeek
      });

      if (result && result.error) {
        console.log('❌ Error en truncado automático:', result.error);
      } else {
        console.log(`✅ Bloque truncado automáticamente: Tanque ${tankId} ahora termina en semana ${newEndWeek}`);

        // NO refrescar inmediatamente para evitar bucle infinito
        // Los datos se actualizarán en el próximo render natural
      }
    } catch (err) {
      console.log('❌ Error ejecutando truncado automático:', err);
    }
  };

  // ⚠️ REMOVIDO: useEffect automático que causaba loops infinitos
  // Ahora la sincronización solo ocurre cuando se llama explícitamente
  // desde el guardado de muestreos o modificaciones en las tablas

  // 🔄 Nueva función para actualizar planner cuando se modifiquen muestreos
  // Esta función DEBE ser llamada explícitamente desde el componente de muestreos
  // Ref para evitar loops infinitos
  const syncAttemptsRef = useRef(0);
  const maxSyncAttempts = 3;

  // 🆕 Nueva lógica simple y directa según tu razonamiento
  const ajustarPlannerConDatosReales = async (planId: string) => {
    console.log(`🚀 INICIANDO AJUSTE AUTOMÁTICO CON LÓGICA SIMPLE`);
    console.log(`📋 Plan ID: ${planId}`);

    try {
      // 1. Obtener bloques Growout del plan desde Supabase
      // Primero obtener TODOS los bloques Growout sin filtro
      const { data: todosGrowout, error: errorTodos } = await supabase
        .from('planner_bloques')
        .select('*')
        .eq('plan_id', planId)
        .eq('estado', 'Growout');

      console.log(`🔍 DEBUG - Todos los bloques Growout: ${todosGrowout?.length || 0}`);
      console.log('🔍 DEBUG - Detalle de todos los bloques:', todosGrowout?.map(b => ({
        id: b.id.substring(0, 8),
        tanque: b.estanque_id,
        target_weight: b.target_weight,
        tipo_target: typeof b.target_weight
      })));

      // Ahora filtrar manualmente los que tienen target_weight
      const bloques = todosGrowout?.filter(b => b.target_weight != null && b.target_weight !== '') || [];

      console.log(`📦 Bloques Growout con target_weight: ${bloques?.length || 0}`);

      if (!bloques || bloques.length === 0) {
        console.log('⚠️ No hay bloques Growout con target_weight');
        return;
      }

      // 2. Obtener últimos muestreos desde muestreos_detalle directamente
      const { data: muestreos, error: errorMuestreos } = await supabase
        .from('muestreos_detalle')
        .select(`
          *,
          muestreos_sesiones!inner(
            id, fecha, generacion_id,
            generaciones (codigo, nombre)
          )
        `)
        .order('muestreos_sesiones(fecha)', { ascending: false })
        .limit(50);

      if (errorMuestreos) {
        console.log('❌ Error en consulta muestreos:', errorMuestreos);
      }

      console.log(`📊 Muestreos encontrados: ${muestreos?.length || 0}`);

      // DEBUG: Mostrar estructura de muestreos
      if (muestreos && muestreos.length > 0) {
        console.log('🔍 DEBUG - Estructura del primer muestreo:');
        console.log('   Fecha:', muestreos[0].fecha);
        console.log('   Muestreos keys:', Object.keys(muestreos[0].muestreos || {}));
        console.log('   Muestreos completo:', JSON.stringify(muestreos[0].muestreos, null, 2));
      }

      if (!muestreos || muestreos.length === 0) {
        console.log('⚠️ No hay muestreos disponibles');
        return;
      }

      // 3. Procesar cada bloque
      for (const bloque of bloques) {
        console.log(`\n🎯 PROCESANDO BLOQUE:`);
        console.log(`   Tanque: ${bloque.estanque_id}`);
        console.log(`   Target Weight: ${bloque.target_weight}g`);
        console.log(`   Semana actual fin: ${bloque.semana_fin}`);
        console.log(`   Genética ID: ${bloque.genetica_id}`);

        // 4. Encontrar última talla real para este tanque
        let ultimaTallaReal = null;
        let ultimaSemana = null;

        console.log(`   🔍 Buscando datos para tanque: "${bloque.estanque_id}" y generación: "${bloque.generacion_id}"`);

        // NUEVA LÓGICA: Buscar directamente en muestreos_detalle con correlación correcta
        console.log(`   🎯 Buscando en muestreos_detalle donde estanque_id = ${bloque.estanque_id} AND generacion_id = ${bloque.generacion_id}`);

        for (const detalle of muestreos) {
          const fecha = detalle.muestreos_sesiones?.fecha;
          const generacionId = detalle.muestreos_sesiones?.generacion_id;
          console.log(`   📅 Revisando detalle:`);
          console.log(`      - Fecha: ${fecha}`);
          console.log(`      - Estanque: ${detalle.estanque_id}`);
          console.log(`      - Generación ID: ${generacionId}`);
          console.log(`      - Average Size: ${detalle.average_size}g`);
          console.log(`      - Biomasa: ${detalle.biomasa}g`);

          // Buscar el tanque específico Y la generación específica
          if (detalle.estanque_id === bloque.estanque_id && generacionId === bloque.generacion_id) {
            console.log(`   ✅ ENCONTRADO! Detalle del tanque ${bloque.estanque_id}`);

            // Usar average_size que es el campo correcto para talla/peso
            let tallaEncontrada = null;
            if (detalle.average_size && detalle.average_size > 0) {
              tallaEncontrada = detalle.average_size;
              console.log(`   📏 Usando average_size: ${tallaEncontrada}g`);
            } else {
              console.log(`   ❌ No se encontró average_size válido en este detalle`);
              console.log(`   🔍 Valores disponibles:`, {
                average_size: detalle.average_size,
                peso_promedio: detalle.peso_promedio,
                talla_promedio: detalle.talla_promedio,
                biomasa: detalle.biomasa
              });
            }

            if (tallaEncontrada && fecha) {
              ultimaTallaReal = tallaEncontrada;
              ultimaSemana = new Date(fecha);
              console.log(`   ✅ DATOS ENCONTRADOS:`);
              console.log(`      - Talla real: ${ultimaTallaReal}g`);
              console.log(`      - Fecha: ${fecha}`);
              console.log(`      - Tanque: ${detalle.estanque_id}`);
              console.log(`      - Cosecha: ${detalle.cosecha || 'N/A'}`);
              break;
            } else {
              console.log(`   ⚠️ Detalle encontrado pero sin datos válidos de talla/peso o fecha`);
            }
          } else {
            if (detalle.estanque_id !== bloque.estanque_id) {
              console.log(`   ➡️ No coincide estanque: ${detalle.estanque_id} ≠ ${bloque.estanque_id}`);
            } else if (generacionId !== bloque.generacion_id) {
              console.log(`   ➡️ No coincide generación: ${generacionId} ≠ ${bloque.generacion_id}`);
            }
          }
        }

        if (!ultimaTallaReal) {
          console.log(`   ⏭️ No hay datos reales para tanque ${bloque.estanque_id}`);
          continue;
        }

        // 5. Buscar en growth_curves dónde está esa talla actual
        const { data: growthCurves, error: errorCurves } = await supabase
          .from('growth_curves')
          .select('*')
          .eq('genetics_id', bloque.genetica_id)
          .order('week', { ascending: true });

        console.log(`   📈 Growth curves encontradas: ${growthCurves?.length || 0}`);

        if (!growthCurves || growthCurves.length === 0) {
          console.log(`   ❌ No hay curvas de crecimiento para genética ${bloque.genetica_id}`);
          continue;
        }

        // 6. Calcular semana actual relativa al ciclo completo (nursery + growout)
        // Primero, buscar si hay bloque de nursery asociado a la misma generación
        const { data: bloquesCompletos } = await supabase
          .from('planner_bloques')
          .select('*')
          .eq('plan_id', bloque.plan_id)
          .eq('generacion_id', bloque.generacion_id)
          .order('semana_inicio', { ascending: true });

        console.log(`   🔍 Buscando bloques completos para generación ${bloque.generacion_id}`);
        console.log(`   📦 Bloques encontrados: ${bloquesCompletos?.length || 0}`);

        let semanaInicioDelCiclo = bloque.semana_inicio; // Por defecto, usar inicio del growout

        if (bloquesCompletos && bloquesCompletos.length > 0) {
          // Encontrar el bloque más temprano (probablemente nursery)
          const primerBloque = bloquesCompletos[0];
          semanaInicioDelCiclo = primerBloque.semana_inicio;

          console.log(`   🏁 Semana inicio del ciclo completo: ${semanaInicioDelCiclo}`);
          console.log(`   📅 Primer bloque: ${primerBloque.estado} (semanas ${primerBloque.semana_inicio}-${primerBloque.semana_fin})`);
          console.log(`   📅 Bloque actual: ${bloque.estado} (semanas ${bloque.semana_inicio}-${bloque.semana_fin})`);
        }

        // Calcular semanas transcurridas desde el inicio del ciclo hasta la fecha del muestreo
        let semanasTranscurridas = 0;
        if (ultimaSemana) {
          // Obtener fecha de inicio del plan para calcular semanas correctamente
          const { data: planData } = await supabase
            .from('planner_planes')
            .select('fecha_inicio')
            .eq('id', bloque.plan_id)
            .single();

          if (planData && planData.fecha_inicio) {
            const fechaInicioPlan = new Date(planData.fecha_inicio);
            const fechaMuestreo = new Date(ultimaSemana);

            // Calcular semana del plan donde ocurrió el muestreo
            const diffTime = fechaMuestreo.getTime() - fechaInicioPlan.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const semanaPlanDelMuestreo = Math.ceil(diffDays / 7);

            // Calcular semanas desde inicio del ciclo
            semanasTranscurridas = semanaPlanDelMuestreo - semanaInicioDelCiclo;

            console.log(`   📅 Fecha inicio plan: ${planData.fecha_inicio}`);
            console.log(`   📅 Fecha muestreo: ${ultimaSemana.toISOString().split('T')[0]}`);
            console.log(`   📊 Semana del plan del muestreo: ${semanaPlanDelMuestreo}`);
            console.log(`   🔢 Semanas transcurridas desde inicio ciclo: ${semanasTranscurridas}`);
          }
        }

        // 7. Encontrar semana actual en la curva de crecimiento (con interpolación)
        let semanaActualEnCurva = 0;
        for (let i = 0; i < growthCurves.length; i++) {
          const punto = growthCurves[i];
          if (punto.weight_grams >= ultimaTallaReal) {
            if (i > 0 && punto.weight_grams > ultimaTallaReal) {
              // Interpolar entre el punto anterior y el actual
              const puntoAnterior = growthCurves[i - 1];
              const pesoAnterior = parseFloat(puntoAnterior.weight_grams);
              const pesoActual = parseFloat(punto.weight_grams);
              const proporcion = (ultimaTallaReal - pesoAnterior) / (pesoActual - pesoAnterior);
              semanaActualEnCurva = puntoAnterior.week + proporcion;
              console.log(`   📍 Interpolación: ${ultimaTallaReal}g está entre semana ${puntoAnterior.week} (${pesoAnterior}g) y ${punto.week} (${pesoActual}g)`);
              console.log(`   📍 Talla actual ${ultimaTallaReal}g corresponde a semana ${semanaActualEnCurva.toFixed(1)} de la curva`);
            } else {
              semanaActualEnCurva = punto.week;
              console.log(`   📍 Talla actual ${ultimaTallaReal}g corresponde exactamente a semana ${semanaActualEnCurva} de la curva`);
            }
            break;
          }
        }

        console.log(`   🧮 COMPARACIÓN DE SEMANAS:`);
        console.log(`      - Semanas transcurridas (real): ${semanasTranscurridas}`);
        console.log(`      - Semana en curva (por peso): ${semanaActualEnCurva}`);

        // Usar la semana real transcurrida para los cálculos
        const semanaBaseLine = Math.max(semanasTranscurridas, semanaActualEnCurva);
        console.log(`      - Semana base para cálculos: ${semanaBaseLine}`);

        // 8. Calcular semana objetivo (cuándo se supera target_weight)
        // Buscar el primer punto que supera el target y luego ir al siguiente para asegurar que se superó
        let semanaObjetivo = null;
        let targetAlcanzado = false;

        for (const punto of growthCurves) {
          if (targetAlcanzado) {
            // Ya alcanzamos el target, ahora usar el siguiente punto para asegurar que se superó
            semanaObjetivo = punto.week;
            console.log(`   🎯 Target weight ${bloque.target_weight}g se alcanza en semana anterior, terminando en semana ${semanaObjetivo} (${punto.weight_grams}g)`);
            break;
          }

          if (punto.weight_grams >= bloque.target_weight) {
            targetAlcanzado = true;
            // No hacer break aquí, continuar al siguiente punto
          }
        }

        // Si alcanzó el target en el último punto de la curva, usar ese punto
        if (targetAlcanzado && !semanaObjetivo) {
          const ultimoPunto = growthCurves[growthCurves.length - 1];
          semanaObjetivo = ultimoPunto.week;
          console.log(`   🎯 Target weight ${bloque.target_weight}g se alcanza en último punto disponible: semana ${semanaObjetivo}`);
        }

        if (!semanaObjetivo) {
          console.log(`   ⚠️ Target weight ${bloque.target_weight}g no se encuentra en la curva`);
          continue;
        }

        // 9. Calcular nueva semana_fin basada en la posición actual del plan
        // Calcular la semana actual del plan donde ocurrió el muestreo
        const semanaActualDelPlan = semanasTranscurridas + semanaInicioDelCiclo;

        // Calcular cuántas semanas faltan según la curva de crecimiento
        const semanasRestantes = semanaObjetivo - semanaActualEnCurva;

        // Calcular el ratio de avance: semanas de curva por semana real
        const ratioAvance = semanaActualEnCurva / semanasTranscurridas;
        console.log(`   📊 Ratio de avance: ${semanaActualEnCurva} semanas curva / ${semanasTranscurridas} semanas reales = ${ratioAvance.toFixed(2)}`);

        // Convertir semanas restantes de curva a semanas reales del plan
        const semanasRealesRestantes = semanasRestantes / ratioAvance;
        const nuevaSemanaFin = Math.round(semanaActualDelPlan + semanasRealesRestantes);

        console.log(`   🔄 Semanas de curva restantes: ${semanasRestantes}`);
        console.log(`   🔄 Semanas reales restantes: ${semanasRealesRestantes.toFixed(2)}`);
        console.log(`   🔄 Nueva semana_fin (redondeada): ${nuevaSemanaFin}`);

        console.log(`   🧮 CÁLCULO DE NUEVA SEMANA_FIN:`);
        console.log(`      - Semana inicio del ciclo completo: ${semanaInicioDelCiclo}`);
        console.log(`      - Semanas transcurridas desde inicio: ${semanasTranscurridas}`);
        console.log(`      - Semana actual del plan: ${semanaActualDelPlan}`);
        console.log(`      - Talla actual corresponde a semana ${semanaActualEnCurva} de curva`);
        console.log(`      - Target se alcanza en semana ${semanaObjetivo} de curva`);
        console.log(`      - Semanas faltantes (curva): ${semanaObjetivo} - ${semanaActualEnCurva} = ${semanasRestantes}`);
        console.log(`      - Ratio de avance: ${ratioAvance.toFixed(2)}`);
        console.log(`      - Semanas reales restantes: ${semanasRealesRestantes.toFixed(2)}`);
        console.log(`      - Nueva semana_fin: ${semanaActualDelPlan} + ${semanasRealesRestantes.toFixed(2)} = ${nuevaSemanaFin}`);

        console.log(`\n🧮 ========== RESUMEN DETALLADO DE CÁLCULOS ==========`);
        console.log(`\n📊 INFORMACIÓN DEL BLOQUE:`);
        console.log(`   🏷️  ID del bloque: ${bloque.id}`);
        console.log(`   🏊 Tanque (estanque_id): ${bloque.estanque_id}`);
        console.log(`   🎯 Target Weight: ${bloque.target_weight}g`);
        console.log(`   🧬 Genética ID: ${bloque.genetica_id}`);
        console.log(`   📅 Semana inicio: ${bloque.semana_inicio}`);
        console.log(`   📅 Semana fin ACTUAL: ${bloque.semana_fin}`);
        console.log(`   ⏱️  Duración ACTUAL: ${bloque.semana_fin - bloque.semana_inicio + 1} semanas`);

        console.log(`\n🔍 DATOS REALES ENCONTRADOS:`);
        console.log(`   📏 Última talla real: ${ultimaTallaReal}g`);
        console.log(`   📅 Fecha del muestreo: ${ultimaSemana ? ultimaSemana.toISOString().split('T')[0] : 'N/A'}`);
        console.log(`   📈 Semana en curva (por peso): ${semanaActualEnCurva}`);
        console.log(`   📊 Semanas transcurridas (reales): ${semanasTranscurridas}`);
        console.log(`   📍 Semana base para cálculos: ${semanaBaseLine}`);
        console.log(`   🎯 Semana objetivo en curva: ${semanaObjetivo}`);

        console.log(`\n🧮 CÁLCULOS PASO A PASO:`);
        console.log(`   1️⃣  Semana inicio del ciclo: ${semanaInicioDelCiclo}`);
        console.log(`   2️⃣  Semanas transcurridas: ${semanasTranscurridas}`);
        console.log(`   3️⃣  Semana actual del plan: ${semanaActualDelPlan}`);
        console.log(`   4️⃣  Semana en curva (por peso): ${semanaActualEnCurva}`);
        console.log(`   5️⃣  Semana objetivo en curva: ${semanaObjetivo}`);
        console.log(`   6️⃣  Semanas restantes: ${semanaObjetivo} - ${semanaActualEnCurva} = ${semanasRestantes}`);
        console.log(`   7️⃣  Nueva semana_fin: ${semanaActualDelPlan} + ${semanasRestantes} = ${nuevaSemanaFin}`);

        const diferenciaSemanas = nuevaSemanaFin - bloque.semana_fin;
        const diferenciaDias = diferenciaSemanas * 7;

        console.log(`\n📈 RESULTADO DEL ANÁLISIS:`);
        console.log(`   📊 Semana fin ACTUAL: ${bloque.semana_fin}`);
        console.log(`   📊 Semana fin CALCULADA: ${nuevaSemanaFin}`);
        console.log(`   📊 Diferencia: ${diferenciaSemanas} semanas (${diferenciaDias} días)`);

        if (diferenciaSemanas > 0) {
          console.log(`   ⏫ RESULTADO: NECESITA MÁS TIEMPO`);
          console.log(`   💡 El pez necesita ${diferenciaSemanas} semanas adicionales para alcanzar ${bloque.target_weight}g`);
          console.log(`   🕒 Duración total necesaria: ${nuevaSemanaFin - bloque.semana_inicio + 1} semanas (vs ${bloque.semana_fin - bloque.semana_inicio + 1} actuales)`);
        } else if (diferenciaSemanas < 0) {
          console.log(`   ⏬ RESULTADO: PUEDE TERMINAR ANTES`);
          console.log(`   💡 El pez alcanzará ${bloque.target_weight}g ${Math.abs(diferenciaSemanas)} semanas antes de lo planeado`);
          console.log(`   🕒 Duración suficiente: ${nuevaSemanaFin - bloque.semana_inicio + 1} semanas (vs ${bloque.semana_fin - bloque.semana_inicio + 1} planeadas)`);
        } else {
          console.log(`   ✅ RESULTADO: PLANIFICACIÓN PERFECTA`);
          console.log(`   💡 El tiempo actual es exactamente el correcto para alcanzar ${bloque.target_weight}g`);
        }

        console.log(`\n💾 ACCIÓN EN BASE DE DATOS:`);
        if (Math.abs(diferenciaSemanas) >= 0.1) {
          console.log(`   🔧 REQUIERE ACTUALIZACIÓN:`);
          console.log(`   📝 UPDATE planner_bloques`);
          console.log(`   📝 SET semana_fin = ${nuevaSemanaFin}`);
          console.log(`   📝 WHERE id = '${bloque.id}';`);
          console.log(`   📝 -- Cambio: ${bloque.semana_fin} → ${nuevaSemanaFin}`);

          // Calcular nueva fecha_fin basada en la nueva semana_fin (usar valor decimal)
          // Usar fecha base del planner: 5 de enero de 2025 (Semana 1)
          const fechaInicio = new Date('2025-01-05');
          fechaInicio.setDate(fechaInicio.getDate() + (nuevaSemanaFin * 7) - 1);
          const nuevaFechaFin = fechaInicio.toISOString().split('T')[0];

          console.log(`   📅 Calculando nueva fecha_fin:`);
          console.log(`   📅 Base: 2025-01-05 + (${nuevaSemanaFin} semanas * 7 días)`);
          console.log(`   📅 Nueva fecha_fin: ${nuevaFechaFin}`);

          const { error: errorUpdate } = await supabase
            .from('planner_bloques')
            .update({
              semana_fin: nuevaSemanaFin, // Usar valor decimal, no redondeado
              fecha_fin: nuevaFechaFin,
              updated_at: new Date().toISOString()
            })
            .eq('id', bloque.id);

          if (errorUpdate) {
            console.log(`   ❌ Error actualizando bloque:`, errorUpdate);
          } else {
            console.log(`   ✅ Bloque actualizado exitosamente`);
            console.log(`   📊 Nuevo semana_fin: ${nuevaSemanaFin}`);
            console.log(`   📅 Nueva fecha_fin: ${nuevaFechaFin}`);
          }
        } else {
          console.log(`   ⚪ SIN CAMBIOS NECESARIOS`);
          console.log(`   💡 La diferencia es menor a 0.1 semanas, no se requiere ajuste`);
        }

        console.log(`===================================================\n`);
      }

      console.log(`\n🎉 AJUSTE AUTOMÁTICO COMPLETADO`);

      // Los datos se actualizaron exitosamente en Supabase
      console.log(`✅ Proceso completado - Refrescando datos automáticamente...`);

      // Refrescar los datos automáticamente
      await reloadPlannerData();
      console.log(`🔄 Datos refrescados automáticamente`);

    } catch (error) {
      console.log('❌ Error en ajuste automático:', error);
    }
  };

  const syncPlannerWithMuestreos = useCallback(async () => {
    console.log('🔍 Verificando datos para sincronización...', {
      muestreosSesiones: !!muestreosSesiones,
      muestreosCount: muestreosSesiones?.length || 0,
      muestreosSesionesData: muestreosSesiones,
      currentPlanId: !!currentPlanId,
      currentPlanIdValue: currentPlanId,
      plannerData: !!plannerData,
      plannerDataCount: plannerData?.length || 0,
      attempts: syncAttemptsRef.current
    });

    if (!currentPlanId) {
      console.log('⚠️ currentPlanId prop es null, usando plan conocido...');
      const knownPlanId = '6bd19390-425e-4df2-8027-12208ceea57a';
      await ajustarPlannerConDatosReales(knownPlanId);
      return;
    }

    // Si no hay datos del planner y no hemos excedido el límite de intentos
    if (!plannerData || plannerData.length === 0) {
      if (syncAttemptsRef.current >= maxSyncAttempts) {
        console.log('❌ Se alcanzó el límite de intentos de recarga. Saltando sincronización por ahora.');
        syncAttemptsRef.current = 0; // Reset para futuras sincronizaciones
        return;
      }

      syncAttemptsRef.current++;
      console.log(`🔄 No hay datos del planner, recargando... (Intento ${syncAttemptsRef.current}/${maxSyncAttempts})`);

      if (loadPlannerDataByRange && location) {
        try {
          const loadedData = await loadPlannerDataByRange(
            currentPlanId,
            location.startDate.toISOString().split('T')[0],
            location.endDate.toISOString().split('T')[0]
          );

          console.log(`✅ Comando de recarga ejecutado. Datos devueltos: ${loadedData?.length || 0} items`);

          // Solo reintentar si efectivamente se cargaron datos
          if (loadedData && loadedData.length > 0) {
            syncAttemptsRef.current = 0; // Reset successful
            console.log('🔄 Datos cargados exitosamente, usando datos devueltos directamente...');

            // Usar los datos devueltos directamente y marcar que ya hicimos la sincronización
            console.log('🔄 Procesando sincronización con datos cargados directamente...');

            // Usar la nueva lógica simple y directa
            console.log('🎯 Usando nueva lógica de ajuste automático...');
            await ajustarPlannerConDatosReales(currentPlanId);
            return;
          } else {
            console.log('⚠️ No se cargaron datos del planner. Deteniendo intentos.');
            syncAttemptsRef.current = 0; // Reset para evitar loops infinitos
            return;
          }
        } catch (error) {
          console.log('❌ Error recargando datos del planner:', error);
          syncAttemptsRef.current = 0; // Reset on error
          return;
        }
      }
    }

    // Si tenemos plannerData disponible, usar la nueva lógica
    if (plannerData && plannerData.length > 0) {
      console.log('🎯 Datos del planner disponibles, ejecutando nueva lógica...');
      await ajustarPlannerConDatosReales(currentPlanId);
      return;
    }
  }, [muestreosSesiones, currentPlanId, plannerData, executedTruncations, generaciones, loadPlannerDataByRange]);


  // 📡 Sistema de eventos multi-método para máxima confiabilidad
  useEffect(() => {
    console.log('🔧 Configurando sistema de eventos multi-método...');
    console.log('📊 Datos del planner al cargar:', {
      plannerData: plannerData?.length || 0,
      currentPlanId,
      location: !!location
    });

    let isSubscribed = true;
    let lastTriggerProcessed = '';

    // Función que maneja el evento de forma robusta
    const handleSyncEvent = (source: string) => {
      console.log(`📡 Evento SYNC_WITH_MUESTREOS recibido en ContainerPlannerTable (${source})`);

      // Usar setTimeout para evitar ejecución durante render
      setTimeout(() => {
        if (isSubscribed) {
          syncPlannerWithMuestreos();
        }
      }, 100);
    };

    // Método 1: Event system tradicional
    const unsubscribeMuestreos = plannerEvents.on('SYNC_WITH_MUESTREOS', () => handleSyncEvent('events'));
    const unsubscribeCalculos = plannerEvents.on('SYNC_WITH_CALCULOS', () => handleSyncEvent('events'));

    // Método 2: Window events (más globales)
    const handleWindowEvent = (event: CustomEvent) => {
      if (event.detail?.type === 'muestreos') {
        handleSyncEvent('window');
      }
    };
    window.addEventListener('plannerSync', handleWindowEvent as EventListener);

    // Método específico: Ajuste automático directo después de guardar muestreos
    const handleAutomaticAdjustment = (event: CustomEvent) => {
      console.log(`🎯 Evento de ajuste automático recibido:`, event.detail);
      if (event.detail?.source === 'muestreo-guardado-completo') {
        console.log(`🚀 Ejecutando ajuste automático directo desde evento...`);
        const planId = event.detail.planId || currentPlanId;
        if (planId) {
          setTimeout(() => {
            ajustarPlannerConDatosReales(planId);
          }, 500); // Pequeño delay para asegurar que los datos están frescos
        } else {
          console.log(`⚠️ No hay planId disponible para ajuste automático`);
        }
      }
    };
    window.addEventListener('executePlannerAutoAdjustment', handleAutomaticAdjustment as EventListener);

    // Método 3: localStorage polling (más confiable)
    const checkLocalStorageTrigger = () => {
      if (!isSubscribed) return;

      const trigger = localStorage.getItem('planner_sync_trigger');
      if (trigger && trigger !== lastTriggerProcessed) {
        console.log(`🔍 LocalStorage trigger detectado: ${trigger}`);
        lastTriggerProcessed = trigger;

        if (trigger.includes('muestreos')) {
          handleSyncEvent('localStorage');
          localStorage.removeItem('planner_sync_trigger'); // Limpiar para evitar re-ejecuciones
        }
      }
    };

    const pollingInterval = setInterval(checkLocalStorageTrigger, 1000); // Check cada segundo

    // Cleanup
    return () => {
      console.log('🧹 Limpiando sistema de eventos multi-método...');
      isSubscribed = false;
      unsubscribeMuestreos();
      unsubscribeCalculos();
      window.removeEventListener('plannerSync', handleWindowEvent as EventListener);
      window.removeEventListener('executePlannerAutoAdjustment', handleAutomaticAdjustment as EventListener);
      clearInterval(pollingInterval);
    };
  }, []); // Sin dependencias para máxima estabilidad

  // Función pública para forzar recálculo manual
  const forceRecalculateGrowout = async () => {
    console.log('🔄 FORZANDO RECÁLCULO MANUAL DE GROWOUT...');
    console.log('📊 Estado actual:', {
      tienePlanId: !!currentPlanId,
      planId: currentPlanId,
      cantidadMuestreos: muestreosSesiones?.length || 0,
      cantidadPlannerData: plannerData?.length || 0
    });

    setIsRecalculating(true);

    try {
      // Limpiar truncaciones para permitir nuevo cálculo
      setExecutedTruncations(new Set());

      // Buscar todos los bloques Growout
      const growoutBlocks = plannerData.filter(item =>
        item.tipo === 'bloque' &&
        item.estado === 'Growout' &&
        item.genetica_id
      );

      console.log(`📦 Bloques Growout encontrados: ${growoutBlocks.length}`);
      console.log('📋 Detalle de bloques:', growoutBlocks.map(b => ({
        tanque: b.estanque_id,
        generacion: b.generacion_id,
        genetica: b.genetica_id,
        inicio: b.semana_inicio,
        fin: b.semana_fin,
        target_weight: b.target_weight
      })));

      for (const block of growoutBlocks) {
        const tankId = block.estanque_id;
        const generation = block.generacion_id;
        const geneticsId = block.genetica_id;

        console.log(`🎯 Procesando tanque ${tankId}, generación ${generation}, genética ${geneticsId}...`);

        // Verificar si hay muestreos para este tanque/generación
        const generacionObj = generaciones.find(g => g.codigo === generation);
        const muestreosRelevantes = muestreosSesiones.filter(s => {
          const coincide = s.generacionId === generacionObj?.id &&
                          s.muestreos &&
                          s.muestreos[tankId.toString()];
          return coincide;
        });

        console.log(`📊 Muestreos encontrados para tanque ${tankId}:`, muestreosRelevantes.length);
        if (muestreosRelevantes.length > 0) {
          console.log('🔍 Detalle muestreos:', muestreosRelevantes.map(m => ({
            semana: m.semana,
            promedio: m.muestreos[tankId.toString()]?.averageSize || m.muestreos[tankId.toString()]?.promedio
          })));
        }

        try {
          await adjustPlannerBasedOnRealDataInternal(tankId, generation, geneticsId);
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.log(`❌ Error procesando tanque ${tankId}:`, error);
        }
      }

      // Recargar datos después del ajuste
      if (currentPlanId && location) {
        await loadPlannerDataByRange(
          currentPlanId,
          location.startDate.toISOString().split('T')[0],
          location.endDate.toISOString().split('T')[0]
        );
      }

      console.log('✅ Recálculo manual completado');
      alert('Recálculo completado. Los bloques han sido ajustados según los datos reales.');

    } catch (error) {
      console.log('❌ Error en recálculo manual:', error);
      alert('Error al recalcular. Revisa la consola para más detalles.');
    } finally {
      setIsRecalculating(false);
    }
  };


  // 🆕 Función para ajustar automáticamente el planner basado en datos reales
  const adjustPlannerBasedOnRealDataInternal = async (tankId: number, generation: string, geneticsId: number) => {
    console.log(`⚡ Ajuste automático: ${tankId} gen ${generation}`);

    try {
      if (!currentPlanId || !muestreosSesiones) {
        return;
      }

      // Buscar la última semana con datos reales
      const lastRealWeek = findLastRealDataWeek(tankId, generation);
      if (!lastRealWeek) {
        return;
      }

      // Buscar el bloque de growout actual en los datos del planner
      const allGrowoutBlocks = plannerData.filter(item =>
        item.tipo === 'bloque' &&
        item.estanque_id === tankId &&
        item.estado === 'Growout' &&
        item.generacion_id === generation
      );

      let growoutBlock = allGrowoutBlocks[0]; // Usar el primero por defecto

      // Si hay múltiples bloques Growout para el mismo tanque/generación, usar el que contiene la semana actual
      if (allGrowoutBlocks.length > 1) {
        // Buscar el bloque que contiene la semana con datos reales
        const activeBlock = allGrowoutBlocks.find(block =>
          lastRealWeek.week >= block.semana_inicio &&
          lastRealWeek.week <= block.semana_fin
        );
        if (activeBlock) {
          growoutBlock = activeBlock;
        }
      }

      if (!growoutBlock) {
        return;
      }

      // Usar un peso objetivo por defecto si no está definido
      const targetWeight = growoutBlock.target_weight || 12; // 12g por defecto
      const currentWeight = lastRealWeek.averageSize;

      console.log(`📊 BLOQUE TARGET WEIGHT DEBUG:`, {
        bloqueId: growoutBlock.id,
        target_weight_en_BD: growoutBlock.target_weight,
        target_weight_usado: targetWeight,
        es_default: !growoutBlock.target_weight
      });

      console.log(`🔍 Evaluando ajuste automático:`, {
        tankId,
        generation,
        currentWeight,
        targetWeight,
        realWeek: lastRealWeek.realWeek,
        bloqueActual: `${growoutBlock.semana_inicio} - ${growoutBlock.semana_fin}`
      });

      // Caso 1: Ya alcanzó el peso objetivo - ACORTAR el ciclo
      if (currentWeight >= targetWeight) {
        console.log(`✅ Peso objetivo alcanzado: ${currentWeight}g >= ${targetWeight}g`);

        // Si se pasó significativamente del objetivo, terminar una semana antes
        let newEndWeek = lastRealWeek.week; // Esta es la semana donde se alcanzó el objetivo
        if (currentWeight > targetWeight * 1.05) { // Si se pasó más del 5% del objetivo
          newEndWeek = Math.max(growoutBlock.semana_inicio, lastRealWeek.week - 1);
          console.log(`⚠️ Se pasó del objetivo (${currentWeight}g > ${targetWeight}g), terminando una semana antes: ${newEndWeek}`);
        }

        // Solo ajustar si hay diferencia significativa
        if (newEndWeek < growoutBlock.semana_fin - 1) {
          console.log(`✂️ ACORTANDO ciclo: termina en semana ${newEndWeek} (vs original ${growoutBlock.semana_fin})`);

          await actualizarBloque(growoutBlock.id, {
            semana_fin: newEndWeek,
            fecha_fin: new Date(location.startDate.getTime() + (newEndWeek * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
          });

          // Limpiar celdas sobrantes del tableData
          setTableData(prev => {
            const newTableData = { ...prev };
            for (let week = newEndWeek + 1; week <= growoutBlock.semana_fin; week++) {
              const cellKey = `tank-${tankId}-week-${week}`;
              delete newTableData[cellKey];
              delete newTableData[`${cellKey}-generation`];
              delete newTableData[`${cellKey}-genetics`];
              delete newTableData[`${cellKey}-duration`];
            }
            return newTableData;
          });
        }
        return;
      }

      // Caso 2: Aún no alcanza el objetivo - CALCULAR cuándo lo alcanzará

      // CORRECCIÓN CRÍTICA: Determinar en qué semana de cultivo REAL estamos
      // growoutBlock.semana_inicio viene de la BD en base 1, lastRealWeek.week está en base 0
      const semanaRealEnPlanner = lastRealWeek.week; // Semana absoluta en el planner (base 0)
      const inicioBloqueGrowout = growoutBlock.semana_inicio - 1; // Convertir de base 1 a base 0

      // La semana de cultivo REAL es la diferencia entre la semana actual y el inicio del bloque
      // +1 porque las semanas de cultivo empiezan en 1, no en 0
      const semanaCultivoReal = (semanaRealEnPlanner - inicioBloqueGrowout) + 1;

      console.log(`📊 Análisis de semanas:`, {
        semanaAbsolutaPlanner: semanaRealEnPlanner,
        inicioBloqueGrowout,
        semanaCultivoCalculada: semanaCultivoReal,
        pesoActual: currentWeight
      });

      // Ahora buscar en qué punto de la curva de crecimiento corresponde el peso actual
      // Esto nos ayuda a validar si estamos en la semana correcta
      let semanaEnCurvaParaPesoActual = semanaCultivoReal;
      for (let week = 0; week <= 20; week++) {
        const pesoEnCurva = getWeightByWeek(geneticsId, week);
        if (pesoEnCurva >= currentWeight) {
          semanaEnCurvaParaPesoActual = week + 1; // +1 porque la curva usa base 0
          break;
        }
      }

      // Si hay discrepancia, usar el valor más conservador (el menor)
      const semanaBaseParaProyeccion = Math.min(semanaCultivoReal, semanaEnCurvaParaPesoActual);

      console.log(`🔍 Validación de semana base:`, {
        semanaCultivoReal,
        semanaEnCurvaParaPesoActual,
        semanaBaseUsada: semanaBaseParaProyeccion
      });

      // Buscar en la curva de crecimiento cuándo se alcanzará el peso objetivo
      let semanaObjetivo = semanaBaseParaProyeccion;
      for (let week = semanaBaseParaProyeccion - 1; week <= 20; week++) {
        const pesoProyectado = getWeightByWeek(geneticsId, week);
        if (pesoProyectado >= targetWeight) {
          semanaObjetivo = week + 1; // +1 porque getWeightByWeek usa base 0
          console.log(`🎯 Peso objetivo ${targetWeight}g se alcanza en semana de cultivo ${semanaObjetivo} (peso: ${pesoProyectado.toFixed(1)}g)`);
          break;
        }
      }

      // Las semanas adicionales necesarias desde AHORA
      const semanasAdicionales = Math.max(0, semanaObjetivo - semanaBaseParaProyeccion);

      // La nueva fecha de fin es la semana actual + las semanas adicionales
      let newEndWeek = semanaRealEnPlanner + semanasAdicionales;

      // VALIDACIÓN: Evitar extensiones excesivas
      // Si el cálculo resulta en más de 12 semanas totales de growout, limitarlo
      const duracionMaximaGrowout = 12;
      const duracionCalculada = newEndWeek - inicioBloqueGrowout + 1;

      if (duracionCalculada > duracionMaximaGrowout) {
        console.log(`⚠️ Duración calculada excesiva (${duracionCalculada} semanas). Limitando a ${duracionMaximaGrowout} semanas.`);
        newEndWeek = inicioBloqueGrowout + duracionMaximaGrowout - 1;
      }

      // IMPORTANTE: Convertir de vuelta a base 1 para la BD
      const newEndWeekBD = newEndWeek + 1;

      console.log(`📈 Cálculo final:`, {
        semanaActual: semanaRealEnPlanner,
        semanasAdicionales,
        nuevaFechaFin: newEndWeek,
        duracionTotal: newEndWeek - inicioBloqueGrowout + 1
      });

      console.log(`🎯 RESUMEN DE AJUSTE AUTOMÁTICO:`, {
        tanque: tankId,
        generacion: generation,
        pesoActual: `${currentWeight}g`,
        pesoObjetivo: `${targetWeight}g`,
        semanaConDatosReales: lastRealWeek.week,
        finOriginalBD: growoutBlock.semana_fin,
        finCalculadoBD: newEndWeekBD,
        cambio: newEndWeekBD > growoutBlock.semana_fin ? `+${newEndWeekBD - growoutBlock.semana_fin} semanas` : `${newEndWeekBD - growoutBlock.semana_fin} semanas`
      });

      // Verificar si necesita ajuste (diferencia de al menos 1 semana)
      const diferencia = newEndWeekBD - growoutBlock.semana_fin;

      if (Math.abs(diferencia) >= 1) {
        console.log(`🔧 EJECUTANDO ajuste: ${growoutBlock.semana_fin} → ${newEndWeekBD} (${diferencia > 0 ? 'extender' : 'acortar'} ${Math.abs(diferencia)} semanas)`);

        // Calcular la nueva fecha de fin (usando newEndWeek que está en base 0)
        const newEndDate = new Date(location.startDate.getTime() + (newEndWeek * 7 * 24 * 60 * 60 * 1000));

        const result = await actualizarBloque(growoutBlock.id, {
          semana_fin: newEndWeekBD, // Guardar en BD en base 1
          fecha_fin: newEndDate.toISOString().split('T')[0]
        });

        if (result) {
          console.log(`✅ Planner ajustado exitosamente para tanque ${tankId}: ${growoutBlock.semana_fin} → ${newEndWeekBD}`);

          // Actualizar tableData LOCAL (trabajamos en base 0 para tableData)
          setTableData(prev => {
            const newTableData = { ...prev };
            const oldEndWeek = growoutBlock.semana_fin - 1; // Convertir de BD (base 1) a tableData (base 0)

            if (diferencia < 0) {
              // ACORTAR: Eliminar celdas sobrantes
              for (let week = newEndWeek + 1; week <= oldEndWeek; week++) {
                const cellKey = `tank-${tankId}-week-${week}`;
                delete newTableData[cellKey];
                delete newTableData[`${cellKey}-generation`];
                delete newTableData[`${cellKey}-genetics`];
                delete newTableData[`${cellKey}-duration`];
              }
              console.log(`✂️ Eliminadas ${Math.abs(diferencia)} semanas del final`);

            } else if (diferencia > 0) {
              // EXTENDER: Agregar nuevas celdas
              for (let week = oldEndWeek + 1; week <= newEndWeek; week++) {
                const cellKey = `tank-${tankId}-week-${week}`;
                newTableData[cellKey] = 'Growout';
                newTableData[`${cellKey}-generation`] = generation;
                newTableData[`${cellKey}-genetics`] = geneticsId.toString();
                newTableData[`${cellKey}-duration`] = '';
              }
              console.log(`➕ Agregadas ${diferencia} semanas al final`);
            }

            return newTableData;
          });

          // Marcar como ejecutado para evitar re-ejecuciones
          setExecutedTruncations(prev => new Set([...prev, `${tankId}-${generation}`]));

          console.log(`📋 Ajuste completado`);
        }
      } else {
        console.log(`✅ No se requiere ajuste (diferencia menor a 1 semana)`);
      }
    } catch (error) {
      console.log('❌ Error en ajuste automático:', error);
    }
  };

  // Calcular información de biomasa para una celda específica (memoizado)
  const getWeekCalculations = useMemo(() => {
    // Cache para evitar recálculos innecesarios
    const cache = new Map<string, any>();

    return (tankId: number, week: number) => {
      const cacheKey = `${tankId}-${week}-${getCellData(tankId, week).state}-${getCellData(tankId, week).generation}-${getCellData(tankId, week).genetics}`;

      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }

      const result = calculateWeekData(tankId, week);
      cache.set(cacheKey, result);
      return result;
    };
  }, [plannerData, genetics, location, muestreosSesiones, generaciones]);

  const calculateWeekData = (tankId: number, week: number) => {
    const cellData = getCellData(tankId, week);

    if (cellData.state === 'Ready' || !cellData.genetics) {
      return null;
    }

    // Encontrar la genética por ID
    const geneticsId = parseInt(cellData.genetics);
    const genetic = genetics.find(g => g.id === geneticsId);

    if (!genetic) return null;

    // Datos base del tanque
    const tankArea = location.tankSizes[tankId] || 540; // m²

    // Encontrar el bloque actual PRIMERO
    const blocks = getBlocksForTank(tankId);
    const currentBlock = blocks.find(block =>
      week >= block.startWeek && week <= block.endWeek &&
      block.generation === cellData.generation &&
      block.genetics === cellData.genetics
    );

    // Determinar densidad y población inicial según el estado
    let density;
    let initialPopulation;

    // console.log(`🐤 ${tankId} S${week} ${cellData.state}: ${tankArea}m²`);

    if (cellData.state === 'Nursery') {
      density = 1500; // larvas/m²
      initialPopulation = tankArea * density;
    } else if (cellData.state === 'Growout') {
      density = 350; // juveniles/m²
      // Para Growout, verificar si hay continuidad desde Nursery
      const cycleStartWeek = findCycleStart(cellData.generation, cellData.genetics, week);
      if (cycleStartWeek !== null && currentBlock) {
        // Hay continuidad: usar supervivientes del Nursery
        // Buscar el área total de Nursery usada en este ciclo
        const nurseryBlocks = [];
        Object.keys(location.tankNames).forEach(tankIdStr => {
          const tId = parseInt(tankIdStr);
          const tankBlocks = getBlocksForTank(tId);
          const nurseryBlock = tankBlocks.find(block =>
            block.state === 'Nursery' &&
            block.generation === cellData.generation &&
            block.genetics === cellData.genetics &&
            block.startWeek === cycleStartWeek
          );
          if (nurseryBlock) {
            nurseryBlocks.push({
              area: location.tankSizes[tId] || 42,
              block: nurseryBlock
            });
          }
        });

        // Calcular población total de Nursery y supervivientes
        const totalNurseryArea = nurseryBlocks.reduce((sum, nb) => sum + nb.area, 0);
        const totalNurseryLarvae = totalNurseryArea * 1500; // densidad nursery

        // console.log(`🧮 Continuidad: ${totalNurseryArea}m² Nursery (${totalNurseryLarvae} larvas)`);

        // Aplicar mortalidad durante fase Nursery (3 semanas típicamente)
        const nurseryDuration = nurseryBlocks[0]?.block ?
          (nurseryBlocks[0].block.endWeek - nurseryBlocks[0].block.startWeek + 1) : 3;
        const totalMortalityRate = 20; // 20%
        // Para Nursery, usar raíz cúbica para calcular mortalidad semanal
        const nurseryWeeklyMortalityRate = calculateNurseryWeeklyMortalityRate(totalMortalityRate);
        const survivors = totalNurseryLarvae * Math.pow(1 - nurseryWeeklyMortalityRate, nurseryDuration);

        // console.log(`  → ${Math.floor(survivors)} supervivientes (${nurseryDuration}sem, ${(nurseryWeeklyMortalityRate * 100).toFixed(1)}%/sem)`);

        // La población inicial para este tanque Growout es el total de supervivientes
        // ya que estamos transfiriendo desde Nursery a este tanque específico
        // Asignar TODOS los supervivientes a este tanque Growout
        // (asumiendo que solo un tanque Growout comienza en esta semana)
        initialPopulation = survivors;
        // console.log(`  → Growout ${tankId}: ${Math.floor(initialPopulation)} juveniles`);
      } else {
        // Sin continuidad: usar densidad estándar
        initialPopulation = tankArea * density;
        // console.log(`❌ Sin continuidad: densidad estándar ${Math.floor(initialPopulation)}`);
      }
    } else {
      density = 350; // default
      initialPopulation = tankArea * density;
    }

    // Calcular la semana real del ciclo considerando continuidad Nursery → Growout
    let cycleWeekZeroBased;
    let cycleWeek;

    if (currentBlock) {
      if (currentBlock.state === 'Nursery') {
        // Para Nursery, usar posición dentro del bloque
        cycleWeekZeroBased = week - currentBlock.startWeek;
        cycleWeek = cycleWeekZeroBased + 1;
      } else if (currentBlock.state === 'Growout') {
        // Para Growout, siempre calcular solo desde el inicio del bloque Growout
        // Las supervivencias de Nursery y Growout están separadas
        cycleWeekZeroBased = week - currentBlock.startWeek;
        cycleWeek = cycleWeekZeroBased + 1;
      } else {
        // Otros estados
        cycleWeekZeroBased = week - currentBlock.startWeek;
        cycleWeek = cycleWeekZeroBased + 1;
      }
    } else {
      cycleWeekZeroBased = week;
      cycleWeek = week + 1;
    }


    // Calcular peso individual según la curva de crecimiento (usa base 0)
    const individualWeight = getWeightByWeek(geneticsId, cycleWeekZeroBased);

    // Aplicar mortalidad según el tipo de estado
    let weeklyMortalityRate;

    if (cellData.state === 'Nursery') {
      // Para Nursery: usar raíz cúbica con mortalidad fija del 20%
      const totalMortalityRate = 20; // 20% fijo para Nursery
      weeklyMortalityRate = calculateNurseryWeeklyMortalityRate(totalMortalityRate);
    } else {
      // Para Growout: usar mortalidad específica de la genética desde Supabase
      weeklyMortalityRate = getWeeklyMortalityRateByGenetics(geneticsId);
    }

    // Población actual considerando mortalidad (usar semanas completas, no base 0)
    // La primera semana (cycleWeekZeroBased = 0) debe mostrar la supervivencia después de aplicar mortalidad de esa semana
    const currentPopulation = initialPopulation * Math.pow(1 - weeklyMortalityRate, cycleWeek);

    // console.log(`📊 ${tankId} S${cycleWeek}: ${Math.floor(initialPopulation)}→${Math.floor(currentPopulation)} (${((currentPopulation / initialPopulation) * 100).toFixed(1)}%)`);

    // Calcular biomasa usando las funciones del sistema (usar base 0)
    const biomass = calculateTotalBiomass(Math.floor(currentPopulation), cycleWeekZeroBased, geneticsId);

    // Función de cálculo de biomasa por área (copiada de InventarioVivoView)
    const calcularBiomasaPorArea = (mediana: number, area: number) => {
      let biomasaCalculada = (mediana / 1000) * area;
      if (biomasaCalculada > 100) {
        biomasaCalculada += 50;
      }
      return Math.round(biomasaCalculada);
    };

    // Calcular biomasa por área usando peso individual
    const biomasaPorArea = calcularBiomasaPorArea(biomass.individualWeight, tankArea);

    // 🎯 NUEVA FUNCIONALIDAD: Buscar datos reales y sobreescribir cuando existan
    const realData = findRealDataForCell(tankId, week, cellData.generation, cellData.genetics);

    // 🔍 PROYECCIÓN DESDE DATOS REALES: Buscar la última semana con datos reales
    let shouldProjectFromRealData = false;
    let projectedWeight = biomass.individualWeight;
    let lastRealWeek = null;

    // Solo buscar datos reales si no tenemos datos reales para esta semana específica
    if (!realData && cellData.state === 'Growout') {
      lastRealWeek = findLastRealDataWeek(tankId, cellData.generation);

      // Si hay datos reales anteriores y estamos en una semana posterior
      if (lastRealWeek && week > lastRealWeek.week) {
        const realWeight = lastRealWeek.averageSize;

        // Encontrar en qué punto de la curva está el peso real y calcular el incremento semanal
        let weeklyIncrement = 1.0; // Incremento por defecto

        // Buscar iterativamente en la curva para encontrar el incremento correspondiente
        for (let curveWeek = 0; curveWeek < 20; curveWeek++) {
          const weightThisWeek = getWeightByWeek(geneticsId, curveWeek);
          const weightNextWeek = getWeightByWeek(geneticsId, curveWeek + 1);

          // Si el peso real está entre estos dos puntos de la curva
          if (realWeight >= weightThisWeek && realWeight < weightNextWeek) {
            weeklyIncrement = weightNextWeek - weightThisWeek;
            break;
          }
        }

        // Calcular cuántas semanas han pasado desde la última medición real
        const weeksFromLastReal = week - lastRealWeek.week;

        // Proyectar peso sumando incrementos al peso real (no usar valores absolutos de la curva)
        projectedWeight = realWeight + (weeklyIncrement * weeksFromLastReal);
        shouldProjectFromRealData = true;

        // Proyección desde datos reales - logging removed para evitar spam en render
      }
    }

    let finalData = {
      tankArea,
      density,
      initialPopulation: Math.floor(initialPopulation),
      currentPopulation: Math.floor(currentPopulation),
      cycleWeek: cycleWeek, // ya ajustado para mostrar semana correcta
      individualWeight: (shouldProjectFromRealData ? projectedWeight : biomass.individualWeight).toFixed(2),
      biomassKg: biomass.biomassKg.toFixed(1),
      biomasaPorArea: biomasaPorArea,
      weeklyMortalityRate: (weeklyMortalityRate * 100).toFixed(2),
      survivalRate: ((currentPopulation / initialPopulation) * 100).toFixed(1),
      genetic: genetic.name,
      state: cellData.state === 'Nursery' ? 'Nursery' : 'Engorde',
      generation: cellData.generation,
      cycleDuration: parseInt(cellData.duration) || cycleDuration,
      isRealData: false, // Indicador de que son datos calculados
      isProjectedFromRealData: false // Se asignará más adelante si hay proyección
    };

    // Recalcular biomasa si estamos proyectando desde datos reales
    if (shouldProjectFromRealData) {
      const projectedBiomass = calculateTotalBiomass(Math.floor(currentPopulation), cycleWeekZeroBased, geneticsId);
      const adjustedBiomassPorArea = calcularBiomasaPorArea(projectedWeight, tankArea);

      // Recalcular biomasa total usando peso proyectado
      const projectedBiomassKg = (Math.floor(currentPopulation) * projectedWeight) / 1000;

      finalData.biomassKg = projectedBiomassKg.toFixed(1);
      finalData.biomasaPorArea = adjustedBiomassPorArea;
    }

    // 🚫 ELIMINADO: Todo el bloque de truncado automático para evitar loops infinitos

    // Si encontramos datos reales, sobreescribir las métricas correspondientes
    if (realData) {
      // Sobreescribiendo datos planificados con datos reales - logging removed para evitar spam en render

      // Sobreescribir biomasa real
      if (realData.biomasa > 0) {
        finalData.biomassKg = realData.biomasa.toFixed(1);
        finalData.biomasaPorArea = Math.round(realData.biomasa);
      }

      // Sobreescribir talla real (peso individual)
      if (realData.averageSize > 0) {
        finalData.individualWeight = realData.averageSize.toFixed(2);
      }

      // Calcular población real si tenemos biomasa y talla reales
      if (realData.biomasa > 0 && realData.averageSize > 0) {
        const realPopulation = Math.round((realData.biomasa * 1000) / realData.averageSize);
        finalData.currentPopulation = realPopulation;

        // Recalcular supervivencia basada en población real
        if (finalData.initialPopulation > 0) {
          finalData.survivalRate = ((realPopulation / finalData.initialPopulation) * 100).toFixed(1);
        }
      }

      // Usar semana de cultivo real si está disponible
      if (realData.semanaCultivo > 0) {
        finalData.cycleWeek = realData.semanaCultivo;
      }

      // Marcar que contiene datos reales
      finalData.isRealData = true;

      // 🚫 ELIMINAR COMPLETAMENTE EL AJUSTE AUTOMÁTICO DESDE AQUÍ
      // Esto se ejecuta en cada render y causa loop infinito
      // El ajuste se hará desde useEffect cuando cambien los datos de muestreos
    }

    // Consolidar indicador de proyección: true si hay proyección de peso
    if (shouldProjectFromRealData) {
      finalData.isProjectedFromRealData = true;
    }

    // 🆕 Verificar si este bloque ha sido ajustado automáticamente
    let isAutoAdjusted = false;
    if (cellData.state === 'Growout' && lastRealWeek) {
      // Verificar si el bloque actual tiene una duración diferente a la original
      // Esto es un indicador de que pudo haber sido ajustado automáticamente
      const blocks = getBlocksForTank(tankId);
      const currentBlock = blocks.find(block =>
        week >= block.startWeek && week <= block.endWeek &&
        block.generation === cellData.generation &&
        block.genetics === cellData.genetics
      );

      if (currentBlock) {
        // Si la duración real es diferente a la duración planeada típica (8 semanas)
        // es probable que haya sido ajustada automáticamente
        const actualDuration = currentBlock.endWeek - currentBlock.startWeek + 1;
        const typicalGrowoutDuration = 8; // semanas típicas de growout

        // Si difiere en más de 1 semana de lo típico, probablemente fue ajustado
        if (Math.abs(actualDuration - typicalGrowoutDuration) >= 1) {
          isAutoAdjusted = true;
        }
      }
    }

    finalData.isAutoAdjusted = isAutoAdjusted;

    return finalData;
  };

  // Obtener estilo de celda según estado
  const getCellStyle = (state: string) => {
    const stateConfig = tankStates.find(s => s.value === state);
    return stateConfig?.color || 'bg-gray-100 text-gray-800';
  };

  // Obtener color de generación (simulado)
  const getGenerationColor = (generation: string) => {
    if (!generation) return '';
    const colors = ['#FFB6C1', '#98FB98', '#87CEEB', '#DDA0DD', '#F0E68C'];
    const colorIndex = parseInt(generation) % colors.length;
    return colors[colorIndex];
  };

  // Abrir modal de celda (primero en modo detalles)
  const openCellEditor = (tankId: number, week: number) => {
    const cellData = getCellData(tankId, week);
    setSelectedCell({ tankId, week });
    setEditData({
      state: cellData.state,
      generation: cellData.generation,
      genetics: cellData.genetics,
      duration: cellData.duration
    });
    setModalView('details');
  };

  // Guardar cambios de celda en Supabase
  const saveCellData = async () => {
    if (!selectedCell || !currentPlanId) return;

    const { tankId, week } = selectedCell;
    const duration = parseInt(editData.duration) || 1;

    // Validar que el estado sea válido para el tipo de estanque
    const tankType = location.tankTypes[tankId];
    if (!isValidStateForTankType(editData.state, tankType)) {
      alert(`Error: El estado "${editData.state}" no es válido para este tipo de estanque (${tankType}).
      ${tankType === 'Nursery' ? 'Este estanque solo puede usarse para Nursery.' : 'Este estanque solo puede usarse para Growout.'}`);
      return;
    }

    try {
      // Buscar generación ID por código
      const generacionSeleccionada = generaciones.find(g => g.codigo === editData.generation);
      const generacionId = generacionSeleccionada?.id || null;

      // Buscar genética ID por nombre
      const geneticaSeleccionada = genetics.find(g => g.name === editData.genetics);
      const geneticaId = geneticaSeleccionada?.id || null;

      // Crear bloque en Supabase
      const bloqueCreado = await crearBloque({
        plan_id: currentPlanId,
        estanque_id: tankId,
        semana_inicio: week,
        duracion: duration,
        estado: editData.state,
        generacion_id: generacionId,
        genetica_id: geneticaId,
        observaciones: `Creado desde planner - ${editData.state}`
      });

      if (bloqueCreado) {
        // Actualizar tableData local para reflejar el cambio inmediatamente
        const newTableData = { ...tableData };
        const endWeek = Math.min(week + duration - 1, numWeeks - 1);

        for (let currentWeek = week; currentWeek <= endWeek; currentWeek++) {
          const cellKey = `tank-${tankId}-week-${currentWeek}`;
          newTableData[cellKey] = editData.state;

          if (editData.generation) {
            newTableData[`${cellKey}-generation`] = editData.generation;
          }
          if (editData.genetics && editData.genetics !== 'none') {
            newTableData[`${cellKey}-genetics`] = editData.genetics;
          }
          if (editData.duration) {
            newTableData[`${cellKey}-duration`] = editData.duration;
          }
        }

        setTableData(newTableData);

        // Mostrar mensaje de éxito
        console.log('✅ Bloque guardado exitosamente en Supabase');
      } else {
        console.log('❌ Error guardando bloque en Supabase');
      }
    } catch (error) {
      console.log('❌ Error guardando celda:', error);
    }

    // Cerrar modal
    setSelectedCell(null);
  };

  // Cargar datos del planner desde Supabase
  useEffect(() => {
    const loadPlannerDataFromSupabase = async () => {
      if (!currentPlanId) return;

      // Evitar múltiples cargas simultáneas
      if (isLoadingRef.current) {
        return;
      }

      isLoadingRef.current = true;

      try {
        // console.log('🔄 Cargando datos del planner desde Supabase...');

        const fechaInicio = location.startDate.toISOString().split('T')[0];
        const fechaFin = location.endDate.toISOString().split('T')[0];

        // Obtener IDs de estanques para esta ubicación
        const tankIds = Object.keys(location.tankNames).map(id => parseInt(id));

        const data = await loadPlannerDataByRange(currentPlanId, fechaInicio, fechaFin, tankIds);

        // console.log('📊 Datos recibidos desde Supabase:', data);

        // Convertir datos de Supabase a formato de tableData
        const newTableData: Record<string, any> = {};

        data.forEach(item => {
          if (item.tipo === 'bloque') {
            // Aplicar datos del bloque a todas las semanas que abarca
            for (let semana = item.semana_inicio; semana <= item.semana_fin; semana++) {
              const cellKey = `tank-${item.estanque_id}-week-${semana}`;
              newTableData[cellKey] = item.estado;

              if (item.generacion_id) {
                // Buscar código de generación
                const generacion = generaciones.find(g => g.id === item.generacion_id);
                // console.log('🔍 Buscando generación:', { item_generacion_id: item.generacion_id, generacion_encontrada: generacion });
                if (generacion) {
                  newTableData[`${cellKey}-generation`] = generacion.codigo;
                }
              }

              if (item.genetica_id) {
                // Buscar genética por ID - usar ID como string para consistencia
                const genetica = genetics.find(g => g.id === item.genetica_id);
                // console.log('🧬 Buscando genética:', { item_genetica_id: item.genetica_id, genetica_encontrada: genetica });
                if (genetica) {
                  newTableData[`${cellKey}-genetics`] = genetica.id.toString();
                }
              }

              // Calcular duración del bloque
              const duracion = item.semana_fin - item.semana_inicio + 1;
              newTableData[`${cellKey}-duration`] = duracion.toString();
            }
          } else if (item.tipo === 'celda') {
            // Aplicar datos de celda suelta
            const cellKey = `tank-${item.estanque_id}-week-${item.semana_inicio}`;
            newTableData[cellKey] = item.estado;

            if (item.generacion_id) {
              const generacion = generaciones.find(g => g.id === item.generacion_id);
              if (generacion) {
                newTableData[`${cellKey}-generation`] = generacion.codigo;
              }
            }

            if (item.genetica_id) {
              const genetica = genetics.find(g => g.id === item.genetica_id);
              if (genetica) {
                newTableData[`${cellKey}-genetics`] = genetica.id.toString();
              }
            }
          }
        });

        setTableData(newTableData);
        // console.log('✅ Datos del planner cargados desde Supabase');

      } catch (error) {
        console.log('❌ Error cargando datos del planner:', error);
      } finally {
        isLoadingRef.current = false;
      }
    };

    // Solo cargar cuando hay currentPlanId Y los datos de generaciones y genéticas están listos
    // Y evitar recargas por el mismo refreshTimestamp
    if (currentPlanId && !plannerLoading && generaciones.length > 0 && genetics.length > 0) {
      // Si refreshTimestamp ha cambiado, o es la primera carga
      if (!refreshTimestamp || refreshTimestamp !== lastRefreshTimestampRef.current) {
        lastRefreshTimestampRef.current = refreshTimestamp || 0;
        loadPlannerDataFromSupabase();
      }
    }

    // Cleanup function para resetear loading flag cuando las dependencias cambien
    return () => {
      isLoadingRef.current = false;
    };
  }, [currentPlanId, generaciones.length, genetics.length, plannerLoading, refreshTimestamp]);


  // Aplicar datos externos cuando llegan (desde Analytics)
  useEffect(() => {
    if (externalPlanData && externalPlanData.ganttData) {
      console.log('📊 Aplicando datos externos al gantt:', externalPlanData);
      setTableData(prevData => ({
        ...prevData,
        ...externalPlanData.ganttData
      }));
    }
  }, [externalPlanData]);

  // Agregar listeners globales para drag and drop
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (dragState.isDragging) {
        // Completar operación de drag
        completeDragOperation();

        // Reset drag state
        setDragState({
          isDragging: false,
          dragType: 'none',
          startPos: { x: 0, y: 0 },
          startCell: null,
          currentBlock: null,
          dragStartTime: 0
        });

        // Restaurar cursor
        document.body.style.cursor = '';
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging) {
        // Actualizar cursor basado en el tipo de drag
        if (dragState.dragType === 'resize-left' || dragState.dragType === 'resize-right') {
          document.body.style.cursor = 'col-resize';
        } else if (dragState.dragType === 'move') {
          document.body.style.cursor = 'grabbing';
        }
      }
    };

    if (dragState.isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mousemove', handleGlobalMouseMove);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.body.style.cursor = '';
    };
  }, [dragState.isDragging, dragState.dragType]);

  return (
    <div className="space-y-4">
      {/* Tabla de planificación */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                Tanque
              </th>
              {weekHeaders.map((week) => (
                <th
                  key={week.index}
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]"
                >
                  <div>{week.label}</div>
                  <div className="text-gray-400">{week.date}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.keys(location.tankSizes)
              .map(id => parseInt(id))
              .sort((a, b) => a - b)
              .map((tankId) => {
              const tankName = location.tankNames[tankId] || `Tanque ${tankId}`;
              const tankType = location.tankTypes[tankId] || 'N/A';
              const tankSize = location.tankSizes[tankId] || 0;

              return (
                <tr key={tankId} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white px-4 py-3 whitespace-nowrap text-sm border-r">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{tankName}</span>
                      <span className="text-xs text-gray-500">{tankType} - {tankSize}m²</span>
                    </div>
                  </td>
                  {(() => {
                    const blocks = getBlocksForTank(tankId);
                    const cells = [];

                    for (let i = 0; i < numWeeks; i++) {
                      const weekIndex = startWeekIndex + i; // Índice absoluto de semana
                      const relativeIndex = i; // Índice relativo para renderizado
                      const block = blocks.find(b => weekIndex >= b.startWeek && weekIndex <= b.endWeek);

                      // Renderizar cada semana individualmente para tooltips correctos
                      const cellData = getCellData(tankId, weekIndex);
                      const generationColor = getGenerationColor(cellData.generation);
                      const isPartOfBlock = block !== null;

                      // Verificar si esta celda está en el preview del drag
                      const isInDragPreview = dragPreview &&
                        dragPreview.tankId === tankId &&
                        weekIndex >= dragPreview.startWeek &&
                        weekIndex <= dragPreview.endWeek;

                      // Usar datos del preview si está activo
                      const displayData = isInDragPreview ? {
                        state: dragPreview.state,
                        generation: dragPreview.generation,
                        genetics: dragPreview.genetics
                      } : cellData;

                      const displayGenerationColor = getGenerationColor(displayData.generation);


                      cells.push(
                        <td
                          key={relativeIndex}
                          className="py-1 px-1"
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onMouseDown={(e) => handleMouseDown(e, tankId, weekIndex)}
                                  onMouseMove={(e) => {
                                    handleCellHover(e, tankId, weekIndex);
                                    handleMouseMove(e);
                                  }}
                                  onMouseUp={(e) => handleMouseUp(e, tankId, weekIndex)}
                                  onMouseLeave={() => setHoverState(null)}
                                  className={`w-full h-12 text-xs font-medium border-0 transition-all relative
                                    ${dragState.isDragging ? 'pointer-events-none' : 'cursor-pointer hover:opacity-80'}
                                    ${getCellStyle(displayData.state)}
                                    ${isInDragPreview ? 'opacity-75 ring-2 ring-blue-400' : ''}
                                    ${hoverState?.tankId === tankId && hoverState?.week === weekIndex ?
                                      hoverState.zone === 'left' ? 'cursor-w-resize' :
                                      hoverState.zone === 'right' ? 'cursor-e-resize' :
                                      'cursor-move' : ''
                                    }
                                    ${dragState.isDragging && dragState.startCell?.tankId === tankId &&
                                      dragState.startCell?.week === weekIndex ? 'opacity-50 scale-105' : ''}
                                  `}
                                  style={{
                                    backgroundColor: displayGenerationColor || undefined,
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    position: 'relative'
                                  }}
                                >
                                  <div className="flex flex-col items-center justify-center h-full relative">
                                    {displayData.state !== 'Ready' && (
                                      <>
                                        <span className="text-xs leading-none">
                                          {displayData.state === 'Nursery' ? 'N' :
                                           displayData.state === 'Growout' ? 'G' :
                                           displayData.state === 'Reservoir' ? 'R' :
                                           displayData.state === 'Maintenance' ? 'M' : 'X'}
                                        </span>
                                        {displayData.generation && (
                                          <span className="text-xs leading-none font-bold">
                                            {displayData.generation}
                                          </span>
                                        )}
                                        {(() => {
                                          const weekCalc = getWeekCalculations(tankId, weekIndex);
                                          const indicators = [];

                                          // Indicador de datos reales
                                          if (weekCalc?.isRealData) {
                                            indicators.push(
                                              <div key="real" className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white" title="Datos reales disponibles"></div>
                                            );
                                          }

                                          // 🆕 Indicador de ajuste automático
                                          if (weekCalc?.isAutoAdjusted) {
                                            indicators.push(
                                              <div key="auto" className="absolute top-0 left-0 w-2 h-2 bg-orange-500 rounded-full border border-white" title="Fecha ajustada automáticamente"></div>
                                            );
                                          }

                                          // Indicador de proyección
                                          if (weekCalc?.isProjectedFromRealData && !weekCalc?.isRealData) {
                                            indicators.push(
                                              <div key="proj" className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 rounded-full border border-white" title="Proyección desde datos reales"></div>
                                            );
                                          }

                                          return indicators;
                                        })()}
                                      </>
                                    )}

                                    {/* Resize handles */}
                                    {(() => {
                                      const blocks = getBlocksForTank(tankId);
                                      const block = blocks.find(b => weekIndex >= b.startWeek && weekIndex <= b.endWeek);
                                      if (!block || block.state === 'Ready') return null;

                                      return (
                                        <>
                                          {/* Handle izquierdo */}
                                          {weekIndex === block.startWeek && (
                                            <div className={`absolute left-0 top-0 w-2 h-full bg-gray-400 opacity-0 hover:opacity-70 transition-opacity ${
                                              hoverState?.tankId === tankId && hoverState?.week === weekIndex && hoverState?.zone === 'left' ? 'opacity-70' : ''
                                            }`} />
                                          )}
                                          {/* Handle derecho */}
                                          {weekIndex === block.endWeek && (
                                            <div className={`absolute right-0 top-0 w-2 h-full bg-gray-400 opacity-0 hover:opacity-70 transition-opacity ${
                                              hoverState?.tankId === tankId && hoverState?.week === weekIndex && hoverState?.zone === 'right' ? 'opacity-70' : ''
                                            }`} />
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="w-72 p-3">
                                {(() => {
                                  const weekCalc = getWeekCalculations(tankId, weekIndex);
                                  if (!weekCalc) return <div>Sin datos de cálculo</div>;

                                  return (
                                    <div className="space-y-2">
                                      <div className="font-medium text-sm flex items-center justify-between">
                                        <span>{weekCalc.state} - Gen {weekCalc.generation} - Semana {weekCalc.cycleWeek}</span>
                                        <div className="flex gap-1">
                                          {weekCalc.isRealData && (
                                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">
                                              📊 REAL
                                            </span>
                                          )}
                                          {weekCalc.isProjectedFromRealData && (
                                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">
                                              🎯 PROJ
                                            </span>
                                          )}
                                          {weekCalc.isAutoAdjusted && (
                                            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-bold">
                                              🔧 AUTO
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>🧬 <strong>Genética:</strong> {weekCalc.genetic}</div>
                                        <div>🐤 <strong>Densidad:</strong> {parseInt(weekCalc.density).toLocaleString()}/m²</div>
                                        <div>📈 <strong>Pob. actual:</strong> {weekCalc.currentPopulation.toLocaleString()}</div>
                                        <div>⚖️ <strong>Talla:</strong> {weekCalc.individualWeight}g</div>
                                        <div>🎣 <strong>Biomasa total:</strong> {weekCalc.biomassKg}kg</div>
                                        <div>📊 <strong>Productividad:</strong> {weekCalc.biomasaPorArea}kg</div>
                                        <div>💀 <strong>Mort. semanal:</strong> {weekCalc.weeklyMortalityRate}%</div>
                                        <div>✅ <strong>Supervivencia:</strong> {weekCalc.survivalRate}%</div>
                                        {weekCalc.isAutoAdjusted && (
                                          <div className="col-span-2 mt-2 p-2 bg-orange-50 border-l-4 border-orange-400 rounded">
                                            <div className="text-orange-800 font-bold text-xs">🔧 Fechas Ajustadas Automáticamente</div>
                                            <div className="text-orange-700 text-xs mt-1">
                                              Las fechas de cosecha se ajustaron automáticamente basándose en los datos reales de crecimiento y las curvas de la genética.
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      );
                    }

                    return cells;
                  })()}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Leyenda de estados */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700">Estados:</span>
          {tankStates.map((state) => (
            <Badge
              key={state.value}
              variant="outline"
              className={`${state.color} text-xs`}
            >
              {state.label}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Indicadores:</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full border border-gray-300"></div>
            <span className="text-xs text-gray-600">Datos reales disponibles</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-bold">📊 REAL</span>
            <span className="text-xs text-gray-600">Datos reales de muestreos</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-bold">🎯 PROJ</span>
            <span className="text-xs text-gray-600">Proyección ajustada desde datos reales</span>
          </div>
        </div>
      </div>

      {/* Modal de celda - Detalles y Editor */}
      <Dialog open={!!selectedCell} onOpenChange={() => {
        setSelectedCell(null);
        setModalView('details');
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  {selectedCell ? location.tankNames[selectedCell.tankId] || `Tanque ${selectedCell.tankId}` : ''} -
                  Semana {selectedCell ? selectedCell.week + 1 : ''}
                </DialogTitle>
                <DialogDescription>
                  {modalView === 'details' ? 'Información detallada de cálculos de biomasa y población' : 'Configure el estado, generación, genética y duración para este tanque'}
                </DialogDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  variant={modalView === 'details' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setModalView('details')}
                >
                  Detalles
                </Button>
                <Button
                  variant={modalView === 'edit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setModalView('edit')}
                >
                  Editar
                </Button>
              </div>
            </div>
          </DialogHeader>

          {modalView === 'details' ? (
            // Vista de detalles
            <div className="space-y-4">
              {selectedCell && (() => {
                const weekCalc = getWeekCalculations(selectedCell.tankId, selectedCell.week);
                if (!weekCalc) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📊</div>
                      <p className="font-medium">Sin datos de cálculo</p>
                      <p className="text-sm">Esta celda no tiene genética asignada o está en estado Ready</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Header de información básica */}
                    <div className={`bg-gradient-to-r p-4 rounded-lg ${
                      weekCalc.isRealData
                        ? 'from-green-50 to-emerald-50 border-2 border-green-200'
                        : 'from-blue-50 to-green-50'
                    }`}>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">
                            {weekCalc.state} - Generación {weekCalc.generation}
                          </h3>
                          {weekCalc.isRealData && (
                            <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-bold border border-green-300">
                              📊 DATOS REALES
                            </span>
                          )}
                          {weekCalc.isProjectedFromRealData && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold border border-blue-300">
                              🎯 PROYECTADO
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Semana {weekCalc.cycleWeek} de {weekCalc.cycleDuration} • Genética: {weekCalc.genetic}
                        </p>
                        {weekCalc.isRealData && (
                          <p className="text-xs text-green-700 font-medium mt-1">
                            ✨ Información basada en muestreos registrados
                          </p>
                        )}
                        {weekCalc.isProjectedFromRealData && (
                          <p className="text-xs text-blue-700 font-medium mt-1">
                            🎯 Duración del ciclo ajustada basándose en crecimiento real (objetivo: 17g)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Métricas principales */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-700">{weekCalc.biomassKg}kg</div>
                        <div className="text-xs text-blue-600">Biomasa Total</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-700">{weekCalc.currentPopulation.toLocaleString()}</div>
                        <div className="text-xs text-green-600">Población Actual</div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-700">{weekCalc.individualWeight}g</div>
                        <div className="text-xs text-purple-600">Talla</div>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-orange-700">{weekCalc.survivalRate}%</div>
                        <div className="text-xs text-orange-600">Supervivencia</div>
                      </div>
                    </div>

                    {/* Detalles técnicos */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800 border-b pb-1">Detalles Técnicos</h4>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">🏊 Área del tanque:</span>
                          <span className="font-medium">{weekCalc.tankArea}m²</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">🐤 Densidad inicial:</span>
                          <span className="font-medium">{parseInt(weekCalc.density).toLocaleString()}/m²</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">🔢 Población inicial:</span>
                          <span className="font-medium">{weekCalc.initialPopulation.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">💀 Mortalidad semanal:</span>
                          <span className="font-medium">{weekCalc.weeklyMortalityRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">📊 Productividad:</span>
                          <span className="font-medium">{weekCalc.biomasaPorArea}kg</span>
                        </div>
                      </div>
                    </div>

                    {/* Progreso del ciclo */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-800 border-b pb-1">Progreso del Ciclo</h4>
                      <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (weekCalc.cycleWeek / weekCalc.cycleDuration) * 100)}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Semana {weekCalc.cycleWeek}</span>
                        <span>{((weekCalc.cycleWeek / weekCalc.cycleDuration) * 100).toFixed(1)}% completado</span>
                        <span>Total: {weekCalc.cycleDuration} semanas</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            // Vista de edición (formulario original)
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Estado</label>
                <Select value={editData.state} onValueChange={(value) => setEditData({...editData, state: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tankStates
                      .filter((state) => {
                        if (!selectedCell) return true;
                        const tankType = location.tankTypes[selectedCell.tankId];
                        return isValidStateForTankType(state.value, tankType);
                      })
                      .map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Generación</label>
                <Select value={editData.generation || 'none'} onValueChange={(value) => setEditData({...editData, generation: value === 'none' ? '' : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar generación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguna</SelectItem>
                    {getGeneracionOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Genética</label>
                <Select value={editData.genetics || undefined} onValueChange={(value) => setEditData({...editData, genetics: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar genética" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguna</SelectItem>
                    {genetics.map((genetic) => (
                      <SelectItem key={genetic.id} value={genetic.id.toString()}>
                        {genetic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Duración (semanas)</label>
                <Input
                  type="number"
                  value={editData.duration}
                  onChange={(e) => setEditData({...editData, duration: e.target.value})}
                  placeholder="Ej: 8, 12"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={saveCellData} className="flex-1">
                  Guardar
                </Button>
                <Button variant="outline" onClick={() => setSelectedCell(null)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Drag feedback overlay */}
      {dragState.isDragging && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm">
            {dragState.dragType === 'move' && '🚚 Moviendo bloque - Suelta en la nueva ubicación'}
            {dragState.dragType === 'resize-left' && '↔️ Redimensionando inicio del bloque'}
            {dragState.dragType === 'resize-right' && '↔️ Redimensionando fin del bloque'}
          </div>
        </div>
      )}

      {/* Botón flotante para forzar recálculo */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <Button
          onClick={() => {
            if (!currentPlanId) {
              console.log('⚠️ No hay plan seleccionado');
              return;
            }
            console.log('🔄 LLAMANDO A FUNCIÓN REAL DE BASE DE DATOS');
            ajustarPlannerConDatosReales(currentPlanId);
          }}
          disabled={!currentPlanId}
          variant="default"
          size="lg"
          className="shadow-lg"
        >
          {isRecalculating ? (
            <>🔄 Recalculando...</>
          ) : (
            <>📊 Ver Logs de Cálculo Semana_fin</>
          )}
        </Button>
      </div>
    </div>
  );
}