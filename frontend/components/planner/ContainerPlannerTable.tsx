"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

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
}

// Estados posibles de los tanques
const tankStates = [
  { value: 'Ready', label: 'Listo', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'Nursery', label: 'Nursery', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'Growout', label: 'Engorde', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'Reservoir', label: 'Reservorio', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'Maintenance', label: 'Mantenimiento', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'Out of order', label: 'Fuera de servicio', color: 'bg-red-100 text-red-800 border-red-200' },
];

// Genéticas disponibles
const genetics = ['Red', 'Bolt', 'Dragon'];

export function ContainerPlannerTable({ location, locationKey }: ContainerPlannerTableProps) {
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

  // Calcular número de semanas
  const getNumWeeks = () => {
    const diffTime = Math.abs(location.endDate.getTime() - location.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  };

  const numWeeks = getNumWeeks();

  // Generar encabezados de semanas
  const getWeekHeaders = () => {
    const weeks = [];
    const startDate = new Date(location.startDate);

    for (let i = 0; i < numWeeks; i++) {
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

  // Abrir editor de celda
  const openCellEditor = (tankId: number, week: number) => {
    const cellData = getCellData(tankId, week);
    setSelectedCell({ tankId, week });
    setEditData({
      state: cellData.state,
      generation: cellData.generation,
      genetics: cellData.genetics,
      duration: cellData.duration
    });
  };

  // Guardar cambios de celda
  const saveCellData = () => {
    if (!selectedCell) return;

    const { tankId, week } = selectedCell;
    const cellKey = `tank-${tankId}-week-${week}`;

    const newTableData = { ...tableData };

    // Guardar estado principal
    newTableData[cellKey] = editData.state;

    // Guardar metadatos si existen
    if (editData.generation) {
      newTableData[`${cellKey}-generation`] = editData.generation;
    } else {
      delete newTableData[`${cellKey}-generation`];
    }

    if (editData.genetics && editData.genetics !== 'none') {
      newTableData[`${cellKey}-genetics`] = editData.genetics;
    } else {
      delete newTableData[`${cellKey}-genetics`];
    }

    if (editData.duration) {
      newTableData[`${cellKey}-duration`] = editData.duration;
    } else {
      delete newTableData[`${cellKey}-duration`];
    }

    setTableData(newTableData);
    setSelectedCell(null);
  };

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
            {Array.from({ length: location.numTanks }, (_, i) => i + 1).map((tankId) => {
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
                  {weekHeaders.map((week) => {
                    const cellData = getCellData(tankId, week.index);
                    const generationColor = getGenerationColor(cellData.generation);

                    return (
                      <td
                        key={week.index}
                        className="px-1 py-1"
                      >
                        <button
                          onClick={() => openCellEditor(tankId, week.index)}
                          className={`w-full h-12 text-xs font-medium rounded border cursor-pointer hover:opacity-80 transition-opacity ${getCellStyle(cellData.state)}`}
                          style={{
                            backgroundColor: generationColor || undefined
                          }}
                          title={`${cellData.state}${cellData.generation ? ` - Gen ${cellData.generation}` : ''}${cellData.genetics ? ` (${cellData.genetics})` : ''}`}
                        >
                          <div className="flex flex-col items-center justify-center h-full">
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
                          </div>
                        </button>
                      </td>
                    );
                  })}
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

      {/* Editor de celda */}
      <Dialog open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Editar {selectedCell ? location.tankNames[selectedCell.tankId] || `Tanque ${selectedCell.tankId}` : ''} -
              Semana {selectedCell ? selectedCell.week + 1 : ''}
            </DialogTitle>
            <DialogDescription>
              Configure el estado, generación, genética y duración para este tanque en la semana seleccionada.
            </DialogDescription>
          </DialogHeader>
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
              <Input
                value={editData.generation}
                onChange={(e) => setEditData({...editData, generation: e.target.value})}
                placeholder="Ej: 1, 2A, P1"
              />
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
                    <SelectItem key={genetic} value={genetic}>
                      {genetic}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}