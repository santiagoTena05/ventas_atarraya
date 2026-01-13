"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRegisteredSales } from '@/hooks/useRegisteredSales';
import { CosechaAsignada } from '@/hooks/useEstrategiaComercialData';

interface RegisterSaleButtonProps {
  cosecha: CosechaAsignada;
  versionId: string;
  onRegister: () => void;
  onUnregister: () => void;
  disabled?: boolean;
  className?: string;
}

export function RegisterSaleButton({
  cosecha,
  versionId,
  onRegister,
  onUnregister,
  disabled = false,
  className = ''
}: RegisterSaleButtonProps) {
  const {
    registerSale,
    unregisterSale,
    validateRegistration,
    loading
  } = useRegisteredSales(versionId);

  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Handle registration
  const handleRegister = async () => {
    if (!cosecha.id) return;

    setIsProcessing(true);
    setValidationError(null);

    try {
      // Validate first
      const validation = await validateRegistration(cosecha);
      if (!validation.isValid) {
        setValidationError(validation.error || 'Validation failed');
        return;
      }

      // Register the sale
      const success = await registerSale(cosecha.id);
      if (success) {
        onRegister();
      }
    } catch (error) {
      console.error('Error in handleRegister:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle unregistration
  const handleUnregister = async () => {
    if (!cosecha.id) return;

    if (!confirm('Are you sure you want to unregister this sale? This will free up the reserved inventory.')) {
      return;
    }

    setIsProcessing(true);
    try {
      const success = await unregisterSale(cosecha.id);
      if (success) {
        onUnregister();
      }
    } catch (error) {
      console.error('Error in handleUnregister:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine button state and appearance
  const getButtonState = () => {
    if (cosecha.is_registered) {
      return {
        variant: 'default' as const,
        icon: CheckCircle,
        text: 'Registered',
        color: 'text-green-600',
        action: handleUnregister,
        tooltip: `Registered on ${cosecha.registered_at ? new Date(cosecha.registered_at).toLocaleString() : 'unknown'}. Click to unregister.`
      };
    }

    if (validationError) {
      return {
        variant: 'outline' as const,
        icon: AlertTriangle,
        text: 'Cannot Register',
        color: 'text-red-600',
        action: () => {},
        tooltip: validationError
      };
    }

    return {
      variant: 'outline' as const,
      icon: Clock,
      text: 'Register',
      color: 'text-blue-600',
      action: handleRegister,
      tooltip: `Register this ${cosecha.cantidad_kg}kg sale to reserve inventory`
    };
  };

  const buttonState = getButtonState();
  const Icon = buttonState.icon;
  const isDisabledState = disabled || loading || (validationError !== null && !cosecha.is_registered);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={buttonState.variant}
              size="sm"
              onClick={buttonState.action}
              disabled={isDisabledState || isProcessing}
              className={`flex items-center space-x-1 ${buttonState.color}`}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="text-xs">{buttonState.text}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{buttonState.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {cosecha.is_registered && (
        <Badge variant="secondary" className="text-xs">
          Reserved
        </Badge>
      )}

      {validationError && !cosecha.is_registered && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="text-xs cursor-help">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Conflict
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{validationError}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}