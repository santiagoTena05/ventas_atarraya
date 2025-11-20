"use client";

import { useState } from 'react';
import { ContainerPlannerTable } from '@/components/planner/ContainerPlannerTable';
import { Analytics } from '@/components/planner/Analytics';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Download, Upload } from 'lucide-react';

// Datos mock para las granjas/oficinas
const mockLocations = {
  oficina1: {
    id: 1,
    name: 'Oficina Principal',
    numTanks: 12,
    startDate: new Date('2025-01-06'),
    endDate: new Date('2025-12-29'),
    data: {},
    tankNames: {
      1: 'Tanque P-01',
      2: 'Tanque P-02',
      3: 'Tanque P-03',
      4: 'Estanque E-01',
      5: 'Estanque E-02',
      6: 'Estanque E-03',
      7: 'Biofloc B-01',
      8: 'Biofloc B-02',
      9: 'Nursery N-01',
      10: 'Nursery N-02',
      11: 'Grow-out G-01',
      12: 'Grow-out G-02'
    },
    tankTypes: {
      1: 'Shrimpbox',
      2: 'Shrimpbox',
      3: 'Shrimpbox',
      4: 'Blue Whale',
      5: 'Blue Whale',
      6: 'Blue Whale',
      7: 'Biofloc',
      8: 'Biofloc',
      9: 'Nursery',
      10: 'Nursery',
      11: 'Pool',
      12: 'Pool'
    },
    tankSizes: {
      1: 23.5,
      2: 23.5,
      3: 23.5,
      4: 45.0,
      5: 45.0,
      6: 45.0,
      7: 30.0,
      8: 30.0,
      9: 15.0,
      10: 15.0,
      11: 60.0,
      12: 60.0
    }
  },
  sucursal1: {
    id: 2,
    name: 'Sucursal Norte',
    numTanks: 8,
    startDate: new Date('2025-01-06'),
    endDate: new Date('2025-12-29'),
    data: {},
    tankNames: {
      1: 'Norte T-01',
      2: 'Norte T-02',
      3: 'Norte T-03',
      4: 'Norte T-04',
      5: 'Norte E-01',
      6: 'Norte E-02',
      7: 'Norte G-01',
      8: 'Norte G-02'
    },
    tankTypes: {
      1: 'Shrimpbox',
      2: 'Shrimpbox',
      3: 'Shrimpbox',
      4: 'Shrimpbox',
      5: 'Blue Whale',
      6: 'Blue Whale',
      7: 'Pool',
      8: 'Pool'
    },
    tankSizes: {
      1: 23.5,
      2: 23.5,
      3: 23.5,
      4: 23.5,
      5: 45.0,
      6: 45.0,
      7: 60.0,
      8: 60.0
    }
  }
};

export default function PlannerPage() {
  const [currentLocation, setCurrentLocation] = useState('oficina1');
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  const currentLocationData = mockLocations[currentLocation as keyof typeof mockLocations];
  const tankCount = currentLocationData?.numTanks || 0;

  return (
    <div className="container mx-auto px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Container Planner - Planificación de Estanques
        </h1>
        <p className="text-gray-600">
          Gestión y planificación semanal de tanques y estanques de acuicultura
        </p>
      </div>

      {/* Controls Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Controles de Planificación</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAnalyticsOpen(true)}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Location Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Ubicación:</label>
              <Select value={currentLocation} onValueChange={setCurrentLocation}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(mockLocations).map(([key, location]) => (
                    <SelectItem key={key} value={key}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Info */}
            {currentLocationData && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <strong>{tankCount}</strong> tanques
                </span>
                <span>
                  {currentLocationData.startDate?.toLocaleDateString()} - {currentLocationData.endDate?.toLocaleDateString()}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Importar
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planning Table */}
      {currentLocationData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Planificación Semanal - {currentLocationData.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ContainerPlannerTable
              location={currentLocationData}
              locationKey={currentLocation}
            />
          </CardContent>
        </Card>
      )}

      {/* Analytics Modal */}
      <Analytics
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        location={currentLocationData}
        locationKey={currentLocation}
      />
    </div>
  );
}