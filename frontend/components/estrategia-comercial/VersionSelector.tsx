"use client";

import { useState, useEffect } from 'react';
import { useEstrategiaVersions, EstrategiaVersion } from '@/hooks/useEstrategiaVersions';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Copy, Edit, Trash2, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface VersionSelectorProps {
  planId: string;
  onVersionChange: (version: EstrategiaVersion | null) => void;
  onCreateVersion: () => void;
  refreshTrigger?: number; // Add trigger to force refresh
}

export function VersionSelector({ planId, onVersionChange, onCreateVersion, refreshTrigger }: VersionSelectorProps) {
  const {
    versions,
    activeVersion,
    loading,
    error,
    setActiveVersion,
    deleteVersion,
    duplicateVersion,
    refreshVersions
  } = useEstrategiaVersions(planId);

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

  // Auto-select active version when versions load
  useEffect(() => {
    if (activeVersion && !loading) {
      onVersionChange(activeVersion);
    }
  }, [activeVersion, loading, onVersionChange]);

  // Refresh versions when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refreshVersions();
    }
  }, [refreshTrigger, refreshVersions]);

  const handleVersionSelect = async (versionId: string) => {
    const success = await setActiveVersion(versionId);
    if (success) {
      const selectedVersion = versions.find(v => v.id === versionId) || null;
      onVersionChange(selectedVersion);
    }
  };

  const handleDeleteVersion = async (version: EstrategiaVersion) => {
    if (versions.length <= 1) {
      alert('Cannot delete the last version');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${version.nombre}"?`)) {
      return;
    }

    setIsDeleting(version.id);
    try {
      const success = await deleteVersion(version.id);
      if (!success) {
        alert('Failed to delete version. It may have existing sales assignments.');
      }
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDuplicateVersion = async (version: EstrategiaVersion) => {
    const newName = prompt(`Enter name for the copy of "${version.nombre}":`, `${version.nombre} - Copy`);
    if (!newName) return;

    setIsDuplicating(version.id);
    try {
      const newVersion = await duplicateVersion(version.id, newName);
      if (newVersion) {
        onVersionChange(newVersion);
      }
    } finally {
      setIsDuplicating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        Error loading versions: {error}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium">Version:</label>
        <Select
          value={activeVersion?.id || ''}
          onValueChange={handleVersionSelect}
          disabled={versions.length === 0}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select version">
              {activeVersion ? (
                <div className="flex items-center space-x-2">
                  <span>{activeVersion.nombre}</span>
                  {activeVersion.is_active && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </div>
              ) : (
                'No version selected'
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {versions.map((version) => (
              <SelectItem key={version.id} value={version.id}>
                <div className="flex items-center space-x-2">
                  <span>{version.nombre}</span>
                  {version.is_active && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={onCreateVersion}
        size="sm"
        className="flex items-center space-x-1"
      >
        <Plus className="h-4 w-4" />
        <span>New Version</span>
      </Button>

      {activeVersion && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleDuplicateVersion(activeVersion)}
              disabled={isDuplicating === activeVersion.id}
            >
              <Copy className="h-4 w-4 mr-2" />
              {isDuplicating === activeVersion.id ? 'Duplicating...' : 'Duplicate Version'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDeleteVersion(activeVersion)}
              disabled={isDeleting === activeVersion.id || versions.length <= 1}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting === activeVersion.id ? 'Deleting...' : 'Delete Version'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {activeVersion && activeVersion.descripcion && (
        <div className="text-xs text-gray-500 max-w-xs truncate">
          {activeVersion.descripcion}
        </div>
      )}
    </div>
  );
}