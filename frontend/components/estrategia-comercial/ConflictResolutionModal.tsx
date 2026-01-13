"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle2,
  Replace,
  X,
  Calendar,
  Package,
  User
} from 'lucide-react';

export interface ConflictingSale {
  id: string;
  fecha: string;
  talla: string;
  cantidad_kg: number;
  cliente_id?: number;
  cliente_nombre?: string;
  version_id: string;
  version_nombre?: string;
  conflictType: 'insufficient_inventory';
  availableInventory: number;
  requiredInventory: number;
  existingRegisteredSales: Array<{
    id: string;
    cantidad_kg: number;
    version_nombre?: string;
    cliente_nombre?: string;
  }>;
}

export type ConflictResolution = 'keep_both' | 'replace_existing' | 'cancel_new';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictingSale[];
  onResolveConflict: (conflictId: string, resolution: ConflictResolution) => void;
  onResolveAll: (resolutions: Array<{ conflictId: string; resolution: ConflictResolution }>) => void;
  isProcessing?: boolean;
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
  conflicts,
  onResolveConflict,
  onResolveAll,
  isProcessing = false
}: ConflictResolutionModalProps) {
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);

  // Reset state when modal opens
  const handleModalOpen = () => {
    setResolutions({});
    setCurrentConflictIndex(0);
  };

  const currentConflict = conflicts[currentConflictIndex];
  const hasMoreConflicts = currentConflictIndex < conflicts.length - 1;
  const allResolved = conflicts.every(c => resolutions[c.id]);

  const handleResolutionSelect = (resolution: ConflictResolution) => {
    setResolutions(prev => ({
      ...prev,
      [currentConflict.id]: resolution
    }));

    // Auto-advance to next conflict
    if (hasMoreConflicts) {
      setCurrentConflictIndex(prev => prev + 1);
    }
  };

  const handleApplyAll = () => {
    const resolutionArray = conflicts.map(conflict => ({
      conflictId: conflict.id,
      resolution: resolutions[conflict.id]
    }));
    onResolveAll(resolutionArray);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!currentConflict) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} onOpenAutoFocus={handleModalOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <DialogTitle>Inventory Conflict Detected</DialogTitle>
          </div>
          <DialogDescription>
            Conflict {currentConflictIndex + 1} of {conflicts.length} - This sale would exceed available inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Conflict Details */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 mb-3">Conflicting Sale</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>Week of {formatDate(currentConflict.fecha)}</span>
                </div>
                <Badge variant="outline">{currentConflict.talla}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span>Requested: {currentConflict.cantidad_kg}kg</span>
                </div>
                <div className="text-red-600 font-medium">
                  Available: {currentConflict.availableInventory}kg
                </div>
              </div>
              {currentConflict.cliente_nombre && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>Client: {currentConflict.cliente_nombre}</span>
                </div>
              )}
            </div>
          </div>

          {/* Existing Registered Sales */}
          {currentConflict.existingRegisteredSales.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-800 mb-3">
                Existing Registered Sales ({currentConflict.talla} - {formatDate(currentConflict.fecha)})
              </h4>
              <div className="space-y-2">
                {currentConflict.existingRegisteredSales.map((sale, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-purple-700">
                      {sale.cliente_nombre || 'Unknown Client'}
                      {sale.version_nombre && ` (${sale.version_nombre})`}
                    </span>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      {sale.cantidad_kg}kg
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolution Options */}
          <div className="space-y-3">
            <h4 className="font-medium">Choose Resolution:</h4>

            <div className="space-y-2">
              <Button
                variant={resolutions[currentConflict.id] === 'keep_both' ? 'default' : 'outline'}
                className="w-full justify-start h-auto p-4"
                onClick={() => handleResolutionSelect('keep_both')}
              >
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium">Keep Both (Overproduce)</div>
                    <div className="text-sm text-gray-600">
                      Register this sale anyway, understanding inventory will be negative
                    </div>
                  </div>
                </div>
              </Button>

              <Button
                variant={resolutions[currentConflict.id] === 'replace_existing' ? 'default' : 'outline'}
                className="w-full justify-start h-auto p-4"
                onClick={() => handleResolutionSelect('replace_existing')}
                disabled={currentConflict.existingRegisteredSales.length === 0}
              >
                <div className="flex items-start space-x-3">
                  <Replace className="h-5 w-5 mt-0.5 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">Replace Existing Sales</div>
                    <div className="text-sm text-gray-600">
                      Unregister existing sales and register this one instead
                    </div>
                  </div>
                </div>
              </Button>

              <Button
                variant={resolutions[currentConflict.id] === 'cancel_new' ? 'default' : 'outline'}
                className="w-full justify-start h-auto p-4"
                onClick={() => handleResolutionSelect('cancel_new')}
              >
                <div className="flex items-start space-x-3">
                  <X className="h-5 w-5 mt-0.5 text-red-600" />
                  <div className="text-left">
                    <div className="font-medium">Cancel This Sale</div>
                    <div className="text-sm text-gray-600">
                      Don't register this sale, keep existing inventory allocation
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {/* Progress Indicator */}
          {conflicts.length > 1 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span>Progress: {Object.keys(resolutions).length} of {conflicts.length} resolved</span>
                <div className="flex space-x-1">
                  {conflicts.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentConflictIndex
                          ? 'bg-blue-500'
                          : resolutions[conflicts[index]?.id]
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel Registration
          </Button>

          {hasMoreConflicts ? (
            <Button
              onClick={() => setCurrentConflictIndex(prev => prev + 1)}
              disabled={!resolutions[currentConflict.id] || isProcessing}
            >
              Next Conflict
            </Button>
          ) : (
            <Button
              onClick={handleApplyAll}
              disabled={!allResolved || isProcessing}
            >
              {isProcessing ? 'Applying...' : 'Apply All Resolutions'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}