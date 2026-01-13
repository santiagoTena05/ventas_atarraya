import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  InventorySnapshotGenerator,
  createSnapshotGenerator,
  SnapshotMetrics,
  ValidationResult
} from '@/lib/services/snapshotGenerator';

export interface SnapshotManagerState {
  isGenerating: boolean;
  lastGenerated?: string;
  metrics?: SnapshotMetrics;
  validation?: ValidationResult;
  error?: string;
}

export function useSnapshotManager(planId?: string) {
  const [state, setState] = useState<SnapshotManagerState>({
    isGenerating: false
  });

  const generator = planId ? createSnapshotGenerator(planId) : null;

  // Generate snapshots for the current plan
  const generateSnapshots = useCallback(async (forceRegenerate = false) => {
    if (!generator) {
      setState(prev => ({ ...prev, error: 'No active plan selected' }));
      return;
    }

    setState(prev => ({ ...prev, isGenerating: true, error: undefined }));

    try {
      console.log('🔄 Starting snapshot generation...');

      const metrics = await generator.generateSnapshots({
        planId: planId!,
        forceRegenerate
      });

      setState(prev => ({
        ...prev,
        isGenerating: false,
        metrics,
        lastGenerated: new Date().toISOString()
      }));

      console.log('✅ Snapshot generation completed:', metrics);
      return metrics;

    } catch (error) {
      console.error('❌ Snapshot generation failed:', error);
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Generation failed'
      }));
      throw error;
    }
  }, [generator, planId]);

  // Check if snapshots are stale and need regeneration
  const checkStaleSnapshots = useCallback(async () => {
    if (!generator) return [];

    try {
      const staleWeeks = await generator.getStaleSnapshots();
      console.log('📊 Stale snapshots check:', staleWeeks.length, 'weeks need regeneration');
      return staleWeeks;
    } catch (error) {
      console.error('Error checking stale snapshots:', error);
      return [];
    }
  }, [generator]);

  // Validate current snapshots
  const validateSnapshots = useCallback(async () => {
    if (!generator) return null;

    try {
      const validation = await generator.validateSnapshots();
      setState(prev => ({ ...prev, validation }));
      return validation;
    } catch (error) {
      console.error('Error validating snapshots:', error);
      return null;
    }
  }, [generator]);

  // Clean up old snapshots
  const cleanupOldSnapshots = useCallback(async (keepDays = 30) => {
    if (!generator) return 0;

    try {
      const deletedCount = await generator.cleanupOldSnapshots(keepDays);
      console.log('🗑️ Cleaned up snapshots:', deletedCount);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up snapshots:', error);
      return 0;
    }
  }, [generator]);

  // Auto-generate snapshots when plan changes or on mount (DISABLED for testing)
  useEffect(() => {
    if (!planId || !generator || state.isGenerating) return;

    // Temporarily disabled auto-generation to prevent loops during development
    console.log('📋 Snapshot manager ready for plan:', planId);

    // TODO: Re-enable auto-generation once testing is complete
    // const autoGenerate = async () => {
    //   try {
    //     const validation = await validateSnapshots();
    //     if (!validation || validation.snapshotCount === 0) {
    //       console.log('🔄 Auto-generating snapshots for plan:', planId);
    //       await generateSnapshots(false);
    //     }
    //   } catch (error) {
    //     console.error('Error in auto-generation:', error);
    //   }
    // };
    // autoGenerate();
  }, [planId]); // Only depend on planId changes

  return {
    state,
    generateSnapshots,
    checkStaleSnapshots,
    validateSnapshots,
    cleanupOldSnapshots,
    isReady: !!generator
  };
}