"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useGeneraciones } from '@/hooks/useGeneraciones';
import { useGenetics } from '@/hooks/useGenetics';
import { usePlannerCrud } from '@/hooks/usePlannerCrud';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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


export function ContainerPlannerTable({ location, locationKey, externalPlanData, currentPlanId, weekFilter }: ContainerPlannerTableProps) {
  const { generaciones, getGeneracionOptions } = useGeneraciones();
  const { genetics, getWeightByWeek, calculateTotalBiomass, calculateWeeklyMortalityRate } = useGenetics();
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

  // Calcular número de semanas (total y filtradas)
  const getTotalWeeks = () => {
    const diffTime = Math.abs(location.endDate.getTime() - location.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  };

  const totalWeeks = getTotalWeeks();
  const startWeekIndex = weekFilter?.startWeek || 0;
  const weeksToShow = weekFilter?.weeksToShow || totalWeeks;
  const numWeeks = Math.min(weeksToShow, totalWeeks - startWeekIndex);

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
      const cellData = getCellData(tankId, week);
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
          startWeek: week,
          endWeek: week,
          duration: cellData.duration
        };
      } else {
        // Extender bloque actual
        currentBlock.endWeek = week;
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
    const zone = detectHoverZone(event, tankId, week);
    const blocks = getBlocksForTank(tankId);
    const currentBlock = blocks.find(b => week >= b.startWeek && week <= b.endWeek);

    setDragState({
      isDragging: false,
      dragType: zone === 'left' ? 'resize-left' : zone === 'right' ? 'resize-right' : 'none',
      startPos: { x: event.clientX, y: event.clientY },
      startCell: { tankId, week },
      currentBlock,
      dragStartTime: Date.now()
    });
  };

  // Manejar movimiento del mouse
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!dragState.startCell) return;

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
      setHoverState({ tankId, week, zone });
    }
  };

  // Calcular información de biomasa para una celda específica
  const getWeekCalculations = (tankId: number, week: number) => {
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

    // Determinar densidad según el estado
    const density = cellData.state === 'Nursery' ? 1500 : 350; // larvas/m² o juveniles/m²

    // Calcular población inicial del tanque
    const initialPopulation = tankArea * density;

    // Encontrar el inicio del bloque para calcular la semana real del ciclo
    const blocks = getBlocksForTank(tankId);
    const currentBlock = blocks.find(block =>
      week >= block.startWeek && week <= block.endWeek &&
      block.generation === cellData.generation &&
      block.genetics === cellData.genetics
    );

    // Calcular la semana real del ciclo basada en la posición dentro del bloque
    const cycleWeekZeroBased = currentBlock ? (week - currentBlock.startWeek) : week;
    const cycleWeek = cycleWeekZeroBased + 1; // Para mostrar (semana 1, 2, 3...)


    // Calcular peso individual según la curva de crecimiento (usa base 0)
    const individualWeight = getWeightByWeek(geneticsId, cycleWeekZeroBased);

    // Aplicar mortalidad (ejemplo: 20% en 11 semanas = ~1.82% semanal)
    const totalMortalityRate = 20; // 20%
    const cycleDuration = 11; // semanas (ejemplo)
    const weeklyMortalityRate = calculateWeeklyMortalityRate(totalMortalityRate, cycleDuration);

    // Población actual considerando mortalidad (usar base 0)
    const currentPopulation = initialPopulation * Math.pow(1 - weeklyMortalityRate, cycleWeekZeroBased);

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

    return {
      tankArea,
      density,
      initialPopulation: Math.floor(initialPopulation),
      currentPopulation: Math.floor(currentPopulation),
      cycleWeek: cycleWeek, // ya ajustado para mostrar semana correcta
      individualWeight: biomass.individualWeight.toFixed(2),
      biomassKg: biomass.biomassKg.toFixed(1),
      biomasaPorArea: biomasaPorArea,
      weeklyMortalityRate: (weeklyMortalityRate * 100).toFixed(2),
      survivalRate: ((currentPopulation / initialPopulation) * 100).toFixed(1),
      genetic: genetic.name,
      state: cellData.state === 'Nursery' ? 'Nursery' : 'Engorde',
      generation: cellData.generation,
      cycleDuration: parseInt(cellData.duration) || cycleDuration
    };
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
        console.error('❌ Error guardando bloque en Supabase');
      }
    } catch (error) {
      console.error('❌ Error guardando celda:', error);
    }

    // Cerrar modal
    setSelectedCell(null);
  };

  // Cargar datos del planner desde Supabase
  useEffect(() => {
    const loadPlannerDataFromSupabase = async () => {
      if (!currentPlanId) return;

      try {
        console.log('🔄 Cargando datos del planner desde Supabase...');

        const fechaInicio = location.startDate.toISOString().split('T')[0];
        const fechaFin = location.endDate.toISOString().split('T')[0];

        // Obtener IDs de estanques para esta ubicación
        const tankIds = Object.keys(location.tankNames).map(id => parseInt(id));

        const data = await loadPlannerDataByRange(currentPlanId, fechaInicio, fechaFin, tankIds);

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
                if (generacion) {
                  newTableData[`${cellKey}-generation`] = generacion.codigo;
                }
              }

              if (item.genetica_id) {
                // Buscar nombre de genética
                const genetica = genetics.find(g => g.id === item.genetica_id);
                if (genetica) {
                  newTableData[`${cellKey}-genetics`] = genetica.name;
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
                newTableData[`${cellKey}-genetics`] = genetica.name;
              }
            }
          }
        });

        setTableData(newTableData);
        console.log('✅ Datos del planner cargados desde Supabase');

      } catch (error) {
        console.error('❌ Error cargando datos del planner:', error);
      }
    };

    // Solo cargar una vez al inicio cuando hay currentPlanId
    if (currentPlanId && !plannerLoading) {
      loadPlannerDataFromSupabase();
    }
  }, [currentPlanId]); // Solo depende del currentPlanId

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
                                    ${getCellStyle(cellData.state)}
                                    ${hoverState?.tankId === tankId && hoverState?.week === weekIndex ?
                                      hoverState.zone === 'left' ? 'cursor-w-resize' :
                                      hoverState.zone === 'right' ? 'cursor-e-resize' :
                                      'cursor-move' : ''
                                    }
                                    ${dragState.isDragging && dragState.startCell?.tankId === tankId &&
                                      dragState.startCell?.week === weekIndex ? 'opacity-50 scale-105' : ''}
                                  `}
                                  style={{
                                    backgroundColor: generationColor || undefined,
                                    border: '1px solid #d1d5db',
                                    borderTopLeftRadius: block && weekIndex === block.startWeek ? '6px' : '0px',
                                    borderBottomLeftRadius: block && weekIndex === block.startWeek ? '6px' : '0px',
                                    borderTopRightRadius: block && weekIndex === block.endWeek ? '6px' : '0px',
                                    borderBottomRightRadius: block && weekIndex === block.endWeek ? '6px' : '0px',
                                    position: 'relative',
                                    left: block && weekIndex > block.startWeek && weekIndex <= block.endWeek ? '-4px' : '0px',
                                    right: block && weekIndex >= block.startWeek && weekIndex < block.endWeek ? '-4px' : '0px',
                                    width: block && weekIndex > block.startWeek && weekIndex < block.endWeek ? 'calc(100% + 8px)' :
                                           block && weekIndex === block.startWeek && weekIndex < block.endWeek ? 'calc(100% + 4px)' :
                                           block && weekIndex === block.endWeek && weekIndex > block.startWeek ? 'calc(100% + 4px)' : '100%',
                                    zIndex: 5
                                  }}
                                >
                                  <div className="flex flex-col items-center justify-center h-full relative">
                                    {cellData.state !== 'Ready' && (
                                      <>
                                        <span className="text-xs leading-none">
                                          {cellData.state === 'Nursery' ? 'N' :
                                           cellData.state === 'Growout' ? 'G' :
                                           cellData.state === 'Reservoir' ? 'R' :
                                           cellData.state === 'Maintenance' ? 'M' : 'X'}
                                        </span>
                                        {cellData.generation && (
                                          <span className="text-xs leading-none font-bold">
                                            {cellData.generation}
                                          </span>
                                        )}
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
                                      <div className="font-medium text-sm">
                                        {weekCalc.state} - Gen {weekCalc.generation} - Semana {weekCalc.cycleWeek}
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>🧬 <strong>Genética:</strong> {weekCalc.genetic}</div>
                                        <div>📏 <strong>Área:</strong> {weekCalc.tankArea}m²</div>
                                        <div>🐤 <strong>Densidad:</strong> {parseInt(weekCalc.density).toLocaleString()}/m²</div>
                                        <div>🔢 <strong>Pob. inicial:</strong> {weekCalc.initialPopulation.toLocaleString()}</div>
                                        <div>📈 <strong>Pob. actual:</strong> {weekCalc.currentPopulation.toLocaleString()}</div>
                                        <div>⚖️ <strong>Peso ind.:</strong> {weekCalc.individualWeight}g</div>
                                        <div>🎣 <strong>Biomasa total:</strong> {weekCalc.biomassKg}kg</div>
                                        <div>📊 <strong>Biomasa/área:</strong> {weekCalc.biomasaPorArea}kg</div>
                                        <div>💀 <strong>Mort. semanal:</strong> {weekCalc.weeklyMortalityRate}%</div>
                                        <div>✅ <strong>Supervivencia:</strong> {weekCalc.survivalRate}%</div>
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
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700">Leyenda:</span>
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
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg">
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-gray-800">
                          {weekCalc.state} - Generación {weekCalc.generation}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Semana {weekCalc.cycleWeek} de {weekCalc.cycleDuration} • Genética: {weekCalc.genetic}
                        </p>
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
                        <div className="text-xs text-purple-600">Peso Individual</div>
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
                          <span className="text-gray-600">📊 Biomasa por área:</span>
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
                    {tankStates.map((state) => (
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
    </div>
  );
}