"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Lock
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRegisteredSales, ConflictingSale, ConflictResolution } from '@/hooks/useRegisteredSales';
import { EstrategiaVersion } from '@/hooks/useEstrategiaVersions';
import { ConflictResolutionModal } from './ConflictResolutionModal';

interface RegisterVersionButtonProps {
  version: EstrategiaVersion;
  planId: string;
  totalSales: number;
  unregisteredSales: number;
  onRegister: () => void;
  disabled?: boolean;
  className?: string;
  cosechasAsignadas?: any[]; // Add actual sales data for validation
}

export function RegisterVersionButton({
  version,
  planId,
  totalSales,
  unregisteredSales,
  onRegister,
  disabled = false,
  className = '',
  cosechasAsignadas = []
}: RegisterVersionButtonProps) {
  const {
    registerVersion,
    validateVersionRegistration,
    resolveConflictsAndRegister,
    calculateAvailableInventory,
    loading,
    error
  } = useRegisteredSales(version.id);

  // Calculate available inventory when component mounts
  useEffect(() => {
    if (planId) {
      calculateAvailableInventory(planId);
    }
  }, [planId, calculateAvailableInventory]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationSummary, setValidationSummary] = useState<{
    totalSales: number;
    conflictingSales: number;
    availableInventory: number;
  } | null>(null);

  // Conflict resolution state
  const [conflicts, setConflicts] = useState<ConflictingSale[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [isResolvingConflicts, setIsResolvingConflicts] = useState(false);

  // Calculate if version is fully registered
  const isFullyRegistered = unregisteredSales === 0 && totalSales > 0;

  // Get button state
  const getButtonState = () => {
    if (isFullyRegistered) {
      return {
        variant: 'default' as const,
        icon: Lock,
        text: 'Fully Registered',
        color: 'text-green-600',
        disabled: true,
        tooltip: 'All sales in this version are already registered'
      };
    }

    if (unregisteredSales === 0) {
      return {
        variant: 'outline' as const,
        icon: Package,
        text: 'No Sales to Register',
        color: 'text-gray-600',
        disabled: true,
        tooltip: 'This version has no sales to register'
      };
    }

    return {
      variant: 'outline' as const,
      icon: Package,
      text: `Register Version (${unregisteredSales})`,
      color: 'text-blue-600',
      disabled: false,
      tooltip: `Register all ${unregisteredSales} unregistered sales in this version`
    };
  };

  // Validate version registration
  const validateVersionRegistrationInternal = async () => {
    try {
      setValidationErrors([]);
      setValidationSummary(null);
      setConflicts([]);

      // Use the comprehensive validation function
      const validationResult = await validateVersionRegistration();

      if (!validationResult.isValid && validationResult.conflicts) {
        // Conflicts detected
        setConflicts(validationResult.conflicts);
        setValidationSummary({
          totalSales: unregisteredSales,
          conflictingSales: validationResult.conflicts.length,
          availableInventory: 0 // Will be calculated per conflict
        });
        return false; // Conflicts need resolution
      }

      // No conflicts
      const totalKg = cosechasAsignadas
        .filter(c => !c.is_registered)
        .reduce((sum, c) => sum + (c.cantidad_kg || 0), 0);

      setValidationSummary({
        totalSales: unregisteredSales,
        conflictingSales: 0,
        availableInventory: totalKg
      });

      return true; // Safe to register
    } catch (err) {
      console.error('Error validating version registration:', err);
      setValidationErrors(['Error validating registration - please try again']);
      return false;
    }
  };

  // Handle register version click
  const handleRegisterClick = async () => {
    setIsModalOpen(true);
    await validateVersionRegistrationInternal();
  };

  // Handle confirm registration
  const handleConfirmRegister = async () => {
    // Check for conflicts first
    if (conflicts.length > 0) {
      // Show conflict resolution modal
      setIsModalOpen(false);
      setShowConflictModal(true);
      return;
    }

    // No conflicts, proceed with normal registration
    setIsProcessing(true);
    try {
      const success = await registerVersion();
      if (success) {
        onRegister();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error registering version:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle conflict resolution
  const handleResolveConflicts = async (
    resolutions: Array<{ conflictId: string; resolution: ConflictResolution }>
  ) => {
    setIsResolvingConflicts(true);
    try {
      const success = await resolveConflictsAndRegister(resolutions);
      if (success) {
        onRegister();
        setShowConflictModal(false);
        setConflicts([]);
      }
    } catch (error) {
      console.error('Error resolving conflicts:', error);
    } finally {
      setIsResolvingConflicts(false);
    }
  };

  const buttonState = getButtonState();
  const Icon = buttonState.icon;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={buttonState.variant}
              size="sm"
              onClick={handleRegisterClick}
              disabled={disabled || buttonState.disabled}
              className={`flex items-center space-x-2 ${buttonState.color} ${className}`}
            >
              <Icon className="h-4 w-4" />
              <span>{buttonState.text}</span>
              {unregisteredSales > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unregisteredSales}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{buttonState.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Registration Confirmation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Entire Version</DialogTitle>
            <DialogDescription>
              You are about to register all sales in "{version.nombre}". This will reserve inventory and cannot be easily undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            {validationSummary && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Registration Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sales to register:</span>
                    <span className="font-medium">{validationSummary.totalSales}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Potential conflicts:</span>
                    <span className={`font-medium ${validationSummary.conflictingSales > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {validationSummary.conflictingSales}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available inventory:</span>
                    <span className="font-medium">{Math.round(validationSummary.availableInventory)}kg</span>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-800">Validation Issues</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success State */}
            {validationErrors.length === 0 && validationSummary && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Ready to Register</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  All sales can be registered without conflicts.
                </p>
              </div>
            )}

            {/* Error from API */}
            {error && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRegister}
              disabled={isProcessing || validationErrors.length > 0}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isProcessing
                ? 'Registering...'
                : conflicts.length > 0
                  ? `Resolve ${conflicts.length} Conflict${conflicts.length > 1 ? 's' : ''}`
                  : 'Confirm Registration'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={showConflictModal}
        onClose={() => {
          setShowConflictModal(false);
          setConflicts([]);
        }}
        conflicts={conflicts}
        onResolveConflict={() => {}} // Not used in version-level resolution
        onResolveAll={handleResolveConflicts}
        isProcessing={isResolvingConflicts}
      />
    </>
  );
}