"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Target, TrendingUp } from 'lucide-react';

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

interface AnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
  location: LocationData;
  locationKey: string;
}

// Datos mock para análisis
const mockAnalytics = {
  tankUtilization: {
    ready: 8,
    nursery: 2,
    growout: 2,
    maintenance: 0,
    outOfOrder: 0
  },
  weeklyCapacity: {
    totalArea: 350.5,
    utilizationRate: 65,
    availableArea: 122.5
  },
  seedingPlan: {
    larvaeCapacity: 150000,
    expectedSurvival: 120000,
    harvestWeight: 2400,
    cycleLength: 12
  }
};

export function Analytics({ isOpen, onClose, location, locationKey }: AnalyticsProps) {
  const [selectedTab, setSelectedTab] = useState('utilization');
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [seedingParams, setSeedingParams] = useState({
    numberOfNurseries: 2,
    nurseryDensity: 1500,
    growoutDensity: 350,
    mortalityPercentage: 20,
    nurseryDuration: 3,
    growoutDuration: 8,
    generation: '1',
    genetics: 'Red'
  });

  const [calculatedResults, setCalculatedResults] = useState<any>(null);

  // Calcular número de semanas
  const getNumWeeks = () => {
    const diffTime = Math.abs(location.endDate.getTime() - location.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  };

  // Generar opciones de semanas
  const generateWeekOptions = () => {
    const numWeeks = getNumWeeks();
    const options = [];
    const startDate = new Date(location.startDate);

    for (let i = 0; i < numWeeks; i++) {
      const weekDate = new Date(startDate);
      weekDate.setDate(startDate.getDate() + (i * 7));

      options.push({
        value: i,
        label: `Semana ${i + 1}`,
        date: weekDate.toLocaleDateString('es-ES', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit'
        })
      });
    }

    return options;
  };

  const weekOptions = generateWeekOptions();

  // Calcular plan de siembra
  const calculateSeedingPlan = () => {
    const { numberOfNurseries, nurseryDensity, growoutDensity, mortalityPercentage } = seedingParams;

    // Obtener tanques disponibles (simulado)
    const availableTanks = Object.keys(location.tankSizes).slice(0, numberOfNurseries);

    let totalLarvae = 0;
    let totalArea = 0;

    availableTanks.forEach(tankId => {
      const size = location.tankSizes[parseInt(tankId)] || 23.5;
      totalLarvae += size * nurseryDensity;
      totalArea += size;
    });

    const survivalRate = (100 - mortalityPercentage) / 100;
    const expectedSurvival = totalLarvae * survivalRate;
    const requiredGrowoutArea = expectedSurvival / growoutDensity;
    const harvestWeight = expectedSurvival * 0.02; // 20g promedio

    setCalculatedResults({
      totalLarvae: Math.floor(totalLarvae),
      totalArea,
      expectedSurvival: Math.floor(expectedSurvival),
      requiredGrowoutArea: requiredGrowoutArea.toFixed(1),
      harvestWeight: harvestWeight.toFixed(1),
      survivalRate: (survivalRate * 100).toFixed(1),
      nurseryTanks: availableTanks.length,
      requiredGrowoutTanks: Math.ceil(requiredGrowoutArea / 45) // Asumiendo tanques de 45m²
    });
  };

  // Analizar utilización de tanques por semana
  const getTankUtilizationForWeek = (week: number) => {
    // Simulación de datos - en la implementación real vendría de location.data
    const utilization = {
      ready: Math.floor(Math.random() * 5) + 3,
      nursery: Math.floor(Math.random() * 3) + 1,
      growout: Math.floor(Math.random() * 4) + 1,
      maintenance: Math.floor(Math.random() * 2),
      reservoir: Math.floor(Math.random() * 2),
      outOfOrder: Math.floor(Math.random() * 1)
    };

    return utilization;
  };

  const currentWeekUtilization = getTankUtilizationForWeek(selectedWeek);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[90vw] !w-[90vw] max-h-[90vh] overflow-y-auto" style={{ width: '90vw', maxWidth: '90vw' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics y Planificación - {location.name}
          </DialogTitle>
        </DialogHeader>

        <div className="w-full">
          {/* Tabs Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setSelectedTab('utilization')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'utilization'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Utilización de Tanques
            </button>
            <button
              onClick={() => setSelectedTab('seeding')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'seeding'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Planificación de Siembra
            </button>
            <button
              onClick={() => setSelectedTab('capacity')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                selectedTab === 'capacity'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Análisis de Capacidad
            </button>
          </div>

          {/* Análisis de Utilización */}
          {selectedTab === 'utilization' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Utilización por Semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Seleccionar Semana:</label>
                    <Select value={selectedWeek.toString()} onValueChange={(value) => setSelectedWeek(parseInt(value))}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weekOptions.map((week) => (
                          <SelectItem key={week.value} value={week.value.toString()}>
                            {week.label} ({week.date})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-green-600 mb-1">{currentWeekUtilization.ready}</div>
                        <div className="text-sm text-gray-600">Listos</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-yellow-600 mb-1">{currentWeekUtilization.nursery}</div>
                        <div className="text-sm text-gray-600">Nursery</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">{currentWeekUtilization.growout}</div>
                        <div className="text-sm text-gray-600">Engorde</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-1">{currentWeekUtilization.reservoir}</div>
                        <div className="text-sm text-gray-600">Reservorio</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-orange-600 mb-1">{currentWeekUtilization.maintenance}</div>
                        <div className="text-sm text-gray-600">Mantenimiento</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-red-600 mb-1">{currentWeekUtilization.outOfOrder}</div>
                        <div className="text-sm text-gray-600">Fuera de servicio</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-sm text-gray-600 mb-2">Tasa de Utilización</div>
                        <div className="text-2xl font-semibold text-blue-600">
                          {((location.numTanks - currentWeekUtilization.ready) / location.numTanks * 100).toFixed(1)}%
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-sm text-gray-600 mb-2">Tanques Productivos</div>
                        <div className="text-2xl font-semibold text-green-600">
                          {currentWeekUtilization.nursery + currentWeekUtilization.growout}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-sm text-gray-600 mb-2">Área Total Activa</div>
                        <div className="text-2xl font-semibold text-purple-600">
                          {((currentWeekUtilization.nursery + currentWeekUtilization.growout) * 35).toFixed(1)} m²
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Planificación de Siembra */}
          {selectedTab === 'seeding' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Parámetros de Siembra */}
              <Card>
                <CardHeader>
                  <CardTitle>Parámetros de Siembra</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Generación</label>
                      <Input
                        value={seedingParams.generation}
                        onChange={(e) => setSeedingParams({...seedingParams, generation: e.target.value})}
                        placeholder="Ej: 1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Genética</label>
                      <Select value={seedingParams.genetics} onValueChange={(value) => setSeedingParams({...seedingParams, genetics: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Red">Red</SelectItem>
                          <SelectItem value="Bolt">Bolt</SelectItem>
                          <SelectItem value="Dragon">Dragon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Tanques Nursery</label>
                      <Input
                        type="number"
                        value={seedingParams.numberOfNurseries}
                        onChange={(e) => setSeedingParams({...seedingParams, numberOfNurseries: parseInt(e.target.value) || 1})}
                        min="1"
                        max={location.numTanks}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Densidad Nursery</label>
                      <Input
                        type="number"
                        value={seedingParams.nurseryDensity}
                        onChange={(e) => setSeedingParams({...seedingParams, nurseryDensity: parseInt(e.target.value) || 1500})}
                        placeholder="larvae/m²"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Densidad Engorde</label>
                      <Input
                        type="number"
                        value={seedingParams.growoutDensity}
                        onChange={(e) => setSeedingParams({...seedingParams, growoutDensity: parseInt(e.target.value) || 350})}
                        placeholder="juveniles/m²"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Mortalidad (%)</label>
                      <Input
                        type="number"
                        value={seedingParams.mortalityPercentage}
                        onChange={(e) => setSeedingParams({...seedingParams, mortalityPercentage: parseInt(e.target.value) || 20})}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Duración Nursery</label>
                      <Input
                        type="number"
                        value={seedingParams.nurseryDuration}
                        onChange={(e) => setSeedingParams({...seedingParams, nurseryDuration: parseInt(e.target.value) || 3})}
                        placeholder="semanas"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Duración Engorde</label>
                      <Input
                        type="number"
                        value={seedingParams.growoutDuration}
                        onChange={(e) => setSeedingParams({...seedingParams, growoutDuration: parseInt(e.target.value) || 8})}
                        placeholder="semanas"
                      />
                    </div>
                  </div>

                  <Button onClick={calculateSeedingPlan} className="w-full">
                    Calcular Plan de Siembra
                  </Button>
                </CardContent>
              </Card>

              {/* Resultados del Cálculo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Resultados del Plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {calculatedResults ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-sm text-blue-600 mb-1">Total de Larvas</div>
                          <div className="text-xl font-bold text-blue-800">
                            {calculatedResults.totalLarvae.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="text-sm text-green-600 mb-1">Supervivencia Esperada</div>
                          <div className="text-xl font-bold text-green-800">
                            {calculatedResults.expectedSurvival.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-yellow-50 rounded-lg">
                          <div className="text-sm text-yellow-600 mb-1">Área Nursery</div>
                          <div className="text-xl font-bold text-yellow-800">
                            {calculatedResults.totalArea.toFixed(1)} m²
                          </div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <div className="text-sm text-purple-600 mb-1">Área Engorde Req.</div>
                          <div className="text-xl font-bold text-purple-800">
                            {calculatedResults.requiredGrowoutArea} m²
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-orange-50 rounded-lg">
                          <div className="text-sm text-orange-600 mb-1">Peso de Cosecha</div>
                          <div className="text-xl font-bold text-orange-800">
                            {calculatedResults.harvestWeight} kg
                          </div>
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-lg">
                          <div className="text-sm text-indigo-600 mb-1">Tanques Engorde</div>
                          <div className="text-xl font-bold text-indigo-800">
                            {calculatedResults.requiredGrowoutTanks}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Tasa de Supervivencia:</span>
                          <Badge variant="outline">{calculatedResults.survivalRate}%</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-2">
                          <span className="text-gray-600">Duración Total del Ciclo:</span>
                          <Badge variant="outline">{seedingParams.nurseryDuration + seedingParams.growoutDuration} semanas</Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      Configure los parámetros y haga clic en "Calcular Plan de Siembra" para ver los resultados
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          )}

          {/* Análisis de Capacidad */}
          {selectedTab === 'capacity' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Capacidad de la Granja</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Capacidad Física</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total de Tanques:</span>
                        <span className="font-medium">{location.numTanks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Área Total:</span>
                        <span className="font-medium">
                          {Object.values(location.tankSizes).reduce((sum, size) => sum + size, 0).toFixed(1)} m²
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Capacidad Larvaria:</span>
                        <span className="font-medium">
                          {(Object.values(location.tankSizes).reduce((sum, size) => sum + size, 0) * 1500).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Capacidad Juveniles:</span>
                        <span className="font-medium">
                          {(Object.values(location.tankSizes).reduce((sum, size) => sum + size, 0) * 350).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Distribución por Tipo</h3>
                    <div className="space-y-3">
                      {Object.values(location.tankTypes).reduce((acc: any, type: string) => {
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                      }, {}) && Object.entries(Object.values(location.tankTypes).reduce((acc: any, type: string) => {
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                      }, {})).map(([type, count]) => (
                        <div key={type} className="flex justify-between">
                          <span className="text-gray-600">{type}:</span>
                          <span className="font-medium">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Recomendaciones</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="p-3 bg-blue-50 rounded">
                        <strong className="text-blue-800">Optimización:</strong> Considere mantener un 10% de tanques en reserva para mantenimiento rotativo.
                      </div>
                      <div className="p-3 bg-green-50 rounded">
                        <strong className="text-green-800">Productividad:</strong> La configuración actual permite ciclos de {Math.floor(location.numTanks / 3)} generaciones simultáneas.
                      </div>
                      <div className="p-3 bg-yellow-50 rounded">
                        <strong className="text-yellow-800">Planificación:</strong> Programe mantenimientos durante semanas de menor demanda.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}