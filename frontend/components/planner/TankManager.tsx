"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

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

interface TankManagerProps {
  isOpen: boolean;
  onClose: () => void;
  location: LocationData;
  locationKey: string;
}

// Tipos de tanques disponibles
const tankTypes = [
  { value: 'Shrimpbox', label: 'Shrimpbox' },
  { value: 'Blue Whale', label: 'Blue Whale' },
  { value: 'Pool', label: 'Piscina' },
  { value: 'Biofloc', label: 'Biofloc' },
  { value: 'Nursery', label: 'Nursery' },
  { value: 'Raceway', label: 'Raceway' }
];

// Tamaños predefinidos
const predefinedSizes = [
  { value: 15.0, label: '15 m² (Pequeño)' },
  { value: 23.5, label: '23.5 m² (Estándar)' },
  { value: 30.0, label: '30 m² (Mediano)' },
  { value: 45.0, label: '45 m² (Grande)' },
  { value: 60.0, label: '60 m² (Extra Grande)' }
];

export function TankManager({ isOpen, onClose, location, locationKey }: TankManagerProps) {
  const [tankData, setTankData] = useState({
    tankNames: { ...location.tankNames },
    tankTypes: { ...location.tankTypes },
    tankSizes: { ...location.tankSizes },
    numTanks: location.numTanks
  });

  const [isAddTankOpen, setIsAddTankOpen] = useState(false);
  const [newTankData, setNewTankData] = useState({
    name: '',
    type: '',
    size: ''
  });

  const [editingTank, setEditingTank] = useState<number | null>(null);

  // Resetear datos cuando cambie la ubicación
  useEffect(() => {
    if (isOpen) {
      setTankData({
        tankNames: { ...location.tankNames },
        tankTypes: { ...location.tankTypes },
        tankSizes: { ...location.tankSizes },
        numTanks: location.numTanks
      });
    }
  }, [isOpen, location]);

  // Agregar nuevo tanque
  const addNewTank = () => {
    if (!newTankData.name.trim() || !newTankData.type || !newTankData.size) {
      alert('Por favor complete todos los campos');
      return;
    }

    const newTankId = tankData.numTanks + 1;
    const newData = { ...tankData };

    newData.numTanks = newTankId;
    newData.tankNames[newTankId] = newTankData.name.trim();
    newData.tankTypes[newTankId] = newTankData.type;
    newData.tankSizes[newTankId] = parseFloat(newTankData.size);

    setTankData(newData);
    setNewTankData({ name: '', type: '', size: '' });
    setIsAddTankOpen(false);
  };

  // Eliminar tanque
  const deleteTank = (tankId: number) => {
    if (tankData.numTanks <= 1) {
      alert('No se puede eliminar el último tanque');
      return;
    }

    const tankName = tankData.tankNames[tankId] || `Tanque ${tankId}`;
    if (!confirm(`¿Está seguro de eliminar ${tankName}?`)) {
      return;
    }

    const newData = { ...tankData };
    const newTankNames: Record<number, string> = {};
    const newTankTypes: Record<number, string> = {};
    const newTankSizes: Record<number, number> = {};

    let newTankId = 1;
    for (let i = 1; i <= tankData.numTanks; i++) {
      if (i !== tankId) {
        if (newData.tankNames[i]) newTankNames[newTankId] = newData.tankNames[i];
        if (newData.tankTypes[i]) newTankTypes[newTankId] = newData.tankTypes[i];
        if (newData.tankSizes[i]) newTankSizes[newTankId] = newData.tankSizes[i];
        newTankId++;
      }
    }

    newData.numTanks--;
    newData.tankNames = newTankNames;
    newData.tankTypes = newTankTypes;
    newData.tankSizes = newTankSizes;

    setTankData(newData);
  };

  // Editar tanque
  const updateTank = (tankId: number, field: string, value: any) => {
    const newData = { ...tankData };
    if (field === 'name') {
      newData.tankNames[tankId] = value;
    } else if (field === 'type') {
      newData.tankTypes[tankId] = value;
    } else if (field === 'size') {
      newData.tankSizes[tankId] = parseFloat(value);
    }
    setTankData(newData);
  };

  const handleClose = () => {
    setEditingTank(null);
    setIsAddTankOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Gestión de Tanques - {location.name}</span>
              <Button
                onClick={() => setIsAddTankOpen(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Tanque
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Información general */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline">
                    {tankData.numTanks} tanques totales
                  </Badge>
                  <Badge variant="outline">
                    {Object.keys(tankData.tankTypes).length} configurados
                  </Badge>
                  <Badge variant="outline">
                    Área total: {Object.values(tankData.tankSizes).reduce((sum, size) => sum + size, 0).toFixed(1)} m²
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Lista de tanques */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuración de Tanques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: tankData.numTanks }, (_, i) => i + 1).map((tankId) => (
                    <div
                      key={tankId}
                      className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <span className="font-medium text-gray-700">Tanque {tankId}:</span>
                      </div>

                      {/* Nombre del tanque */}
                      <div>
                        {editingTank === tankId ? (
                          <Input
                            value={tankData.tankNames[tankId] || ''}
                            onChange={(e) => updateTank(tankId, 'name', e.target.value)}
                            placeholder="Nombre del tanque"
                            className="h-8 text-sm"
                          />
                        ) : (
                          <div
                            onClick={() => setEditingTank(tankId)}
                            className="cursor-pointer p-2 rounded border hover:bg-gray-100"
                          >
                            {tankData.tankNames[tankId] || `Tanque ${tankId}`}
                          </div>
                        )}
                      </div>

                      {/* Tipo de tanque */}
                      <div>
                        {editingTank === tankId ? (
                          <Select
                            value={tankData.tankTypes[tankId] || ''}
                            onValueChange={(value) => updateTank(tankId, 'type', value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {tankTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div
                            onClick={() => setEditingTank(tankId)}
                            className="cursor-pointer p-2 rounded border hover:bg-gray-100"
                          >
                            {tankData.tankTypes[tankId] || 'Sin tipo'}
                          </div>
                        )}
                      </div>

                      {/* Tamaño del tanque */}
                      <div>
                        {editingTank === tankId ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={tankData.tankSizes[tankId] || ''}
                            onChange={(e) => updateTank(tankId, 'size', e.target.value)}
                            placeholder="m²"
                            className="h-8 text-sm"
                          />
                        ) : (
                          <div
                            onClick={() => setEditingTank(tankId)}
                            className="cursor-pointer p-2 rounded border hover:bg-gray-100"
                          >
                            {tankData.tankSizes[tankId] ? `${tankData.tankSizes[tankId]} m²` : 'Sin tamaño'}
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2">
                        {editingTank === tankId ? (
                          <Button
                            size="sm"
                            onClick={() => setEditingTank(null)}
                          >
                            ✓
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingTank(tankId)}
                          >
                            Editar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteTank(tankId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={() => {
              // Aquí se guardarían los datos
              console.log('Datos de tanques actualizados:', tankData);
              handleClose();
            }}>
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para agregar tanque */}
      <Dialog open={isAddTankOpen} onOpenChange={setIsAddTankOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Tanque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Nombre</label>
              <Input
                value={newTankData.name}
                onChange={(e) => setNewTankData({...newTankData, name: e.target.value})}
                placeholder="Ej: Tanque Principal 01"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo</label>
              <Select value={newTankData.type} onValueChange={(value) => setNewTankData({...newTankData, type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tankTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tamaño</label>
              <Select value={newTankData.size} onValueChange={(value) => setNewTankData({...newTankData, size: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tamaño" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedSizes.map((size) => (
                    <SelectItem key={size.value} value={size.value.toString()}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={addNewTank} className="flex-1">
                Agregar
              </Button>
              <Button variant="outline" onClick={() => setIsAddTankOpen(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}