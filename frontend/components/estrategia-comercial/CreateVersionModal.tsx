"use client";

import { useState } from 'react';
import { useEstrategiaVersions, CreateVersionData } from '@/hooks/useEstrategiaVersions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface CreateVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  onVersionCreated: (version: any) => void;
}

export function CreateVersionModal({
  isOpen,
  onClose,
  planId,
  onVersionCreated
}: CreateVersionModalProps) {
  const { createVersion } = useEstrategiaVersions(planId);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleClose = () => {
    if (!isCreating) {
      setFormData({ nombre: '', descripcion: '' });
      setErrors({});
      onClose();
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'Version name is required';
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = 'Version name must be at least 3 characters';
    } else if (formData.nombre.trim().length > 50) {
      newErrors.nombre = 'Version name must be less than 50 characters';
    }

    if (formData.descripcion && formData.descripcion.length > 200) {
      newErrors.descripcion = 'Description must be less than 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    try {
      const versionData: CreateVersionData = {
        plan_id: planId,
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || undefined,
        created_by: 'user' // You might want to get this from auth context
      };

      const newVersion = await createVersion(versionData);

      if (newVersion) {
        onVersionCreated(newVersion);
        handleClose();
      } else {
        setErrors({ submit: 'Failed to create version. Please try again.' });
      }
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Version</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Version Name *</Label>
            <Input
              id="nombre"
              type="text"
              value={formData.nombre}
              onChange={(e) => handleInputChange('nombre', e.target.value)}
              placeholder="e.g., Conservative Sales, Aggressive Growth"
              disabled={isCreating}
              className={errors.nombre ? 'border-red-500' : ''}
            />
            {errors.nombre && (
              <p className="text-sm text-red-600">{errors.nombre}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Description</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              placeholder="Optional description of this commercial strategy version"
              disabled={isCreating}
              rows={3}
              className={errors.descripcion ? 'border-red-500' : ''}
            />
            {errors.descripcion && (
              <p className="text-sm text-red-600">{errors.descripcion}</p>
            )}
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !formData.nombre.trim()}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreating ? 'Creating...' : 'Create Version'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}