import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface EstrategiaVersion {
  id: string;
  plan_id: string;
  nombre: string;
  descripcion?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateVersionData {
  plan_id: string;
  nombre: string;
  descripcion?: string;
  created_by?: string;
}

export interface UpdateVersionData {
  nombre?: string;
  descripcion?: string;
  is_active?: boolean;
}

export function useEstrategiaVersions(planId: string) {
  const [versions, setVersions] = useState<EstrategiaVersion[]>([]);
  const [activeVersion, setActiveVersionState] = useState<EstrategiaVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load versions for the plan
  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('estrategia_comercial_versions')
        .select('*')
        .eq('plan_id', planId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVersions(data || []);

      // Set active version (first active one found, or first one if none active)
      const active = data?.find(v => v.is_active) || data?.[0] || null;
      setActiveVersionState(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading versions');
      console.error('Error loading versions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create new version
  const createVersion = async (data: CreateVersionData): Promise<EstrategiaVersion | null> => {
    try {
      setError(null);

      const { data: newVersion, error } = await supabase
        .from('estrategia_comercial_versions')
        .insert({
          plan_id: data.plan_id,
          nombre: data.nombre,
          descripcion: data.descripcion,
          created_by: data.created_by || 'user',
          is_active: true, // New version is active by default
        })
        .select()
        .single();

      if (error) throw error;

      // Deactivate other versions when creating a new active one
      if (newVersion.is_active) {
        await supabase
          .from('estrategia_comercial_versions')
          .update({ is_active: false })
          .eq('plan_id', planId)
          .neq('id', newVersion.id);
      }

      // Reload versions
      await loadVersions();

      return newVersion;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating version');
      console.error('Error creating version:', err);
      return null;
    }
  };

  // Update version
  const updateVersion = async (id: string, data: UpdateVersionData): Promise<boolean> => {
    try {
      setError(null);

      const { error } = await supabase
        .from('estrategia_comercial_versions')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // If setting this version as active, deactivate others
      if (data.is_active) {
        await supabase
          .from('estrategia_comercial_versions')
          .update({ is_active: false })
          .eq('plan_id', planId)
          .neq('id', id);
      }

      // Reload versions
      await loadVersions();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating version');
      console.error('Error updating version:', err);
      return false;
    }
  };

  // Delete version
  const deleteVersion = async (id: string): Promise<boolean> => {
    try {
      setError(null);

      // Check if this version has associated cosechas
      const { data: cosechas, error: cosechasError } = await supabase
        .from('estrategia_comercial_cosechas')
        .select('id')
        .eq('version_id', id)
        .limit(1);

      if (cosechasError) throw cosechasError;

      if (cosechas && cosechas.length > 0) {
        throw new Error('Cannot delete version with existing sales assignments');
      }

      const { error } = await supabase
        .from('estrategia_comercial_versions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Reload versions
      await loadVersions();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting version');
      console.error('Error deleting version:', err);
      return false;
    }
  };

  // Set active version
  const setActiveVersion = async (id: string): Promise<boolean> => {
    return await updateVersion(id, { is_active: true });
  };

  // Duplicate version (create copy with all cosechas)
  const duplicateVersion = async (sourceVersionId: string, newName: string): Promise<EstrategiaVersion | null> => {
    try {
      setError(null);

      // Create new version
      const newVersion = await createVersion({
        plan_id: planId,
        nombre: newName,
        descripcion: `Copy of ${versions.find(v => v.id === sourceVersionId)?.nombre || 'version'}`
      });

      if (!newVersion) throw new Error('Failed to create new version');

      // Copy all cosechas from source version
      const { data: sourceCosechas, error: cosechasError } = await supabase
        .from('estrategia_comercial_cosechas')
        .select('*')
        .eq('version_id', sourceVersionId);

      if (cosechasError) throw cosechasError;

      if (sourceCosechas && sourceCosechas.length > 0) {
        const cosechasCopy = sourceCosechas.map(cosecha => ({
          ...cosecha,
          id: undefined, // Let DB generate new ID
          version_id: newVersion.id,
          is_registered: false, // Reset registration status
          registered_at: null,
        }));

        const { error: insertError } = await supabase
          .from('estrategia_comercial_cosechas')
          .insert(cosechasCopy);

        if (insertError) throw insertError;
      }

      return newVersion;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error duplicating version');
      console.error('Error duplicating version:', err);
      return null;
    }
  };

  // Load versions on mount and plan change
  useEffect(() => {
    if (planId) {
      loadVersions();
    }
  }, [planId]);

  return {
    versions,
    activeVersion,
    loading,
    error,
    createVersion,
    updateVersion,
    deleteVersion,
    setActiveVersion,
    duplicateVersion,
    refreshVersions: loadVersions,
  };
}