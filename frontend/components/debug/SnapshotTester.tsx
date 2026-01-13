"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useSnapshotManager } from '@/hooks/useSnapshotManager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, RefreshCw, Database } from 'lucide-react';

export function SnapshotTester() {
  const [activePlan, setActivePlan] = useState<any>(null);
  const [plannerBlocks, setPlannerBlocks] = useState<number>(0);
  const [existingSnapshots, setExistingSnapshots] = useState<number>(0);

  const {
    state,
    generateSnapshots,
    validateSnapshots,
    cleanupOldSnapshots,
    isReady
  } = useSnapshotManager(activePlan?.id);

  // Load active plan and check data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get active plan
        const { data: plans, error: planError } = await supabase
          .from('planner_planes')
          .select('id, nombre, oficina_id')
          .eq('activo', true)
          .limit(1);

        if (planError) throw planError;

        if (plans && plans.length > 0) {
          setActivePlan(plans[0]);
          console.log('✅ Found active plan:', plans[0].nombre);

          // Count planner blocks
          const { count: blockCount } = await supabase
            .from('planner_bloques')
            .select('*', { count: 'exact', head: true })
            .eq('plan_id', plans[0].id);

          setPlannerBlocks(blockCount || 0);

          // Count existing snapshots
          const { count: snapshotCount } = await supabase
            .from('projected_inventory_snapshots')
            .select('*', { count: 'exact', head: true })
            .eq('plan_id', plans[0].id);

          setExistingSnapshots(snapshotCount || 0);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  const handleGenerateSnapshots = async () => {
    try {
      await generateSnapshots(true); // Force regenerate

      // Refresh snapshot count
      if (activePlan) {
        const { count: snapshotCount } = await supabase
          .from('projected_inventory_snapshots')
          .select('*', { count: 'exact', head: true })
          .eq('plan_id', activePlan.id);

        setExistingSnapshots(snapshotCount || 0);
      }
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  const handleValidateSnapshots = async () => {
    await validateSnapshots();
  };

  const handleCleanupSnapshots = async () => {
    const deleted = await cleanupOldSnapshots(30);
    console.log('Deleted snapshots:', deleted);

    // Refresh snapshot count
    if (activePlan) {
      const { count: snapshotCount } = await supabase
        .from('projected_inventory_snapshots')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', activePlan.id);

      setExistingSnapshots(snapshotCount || 0);
    }
  };

  if (!activePlan) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No active plan found. Please activate a plan in the Planner section.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Snapshot Generation Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900">Active Plan: {activePlan.nombre}</h3>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Planner Blocks:</span>
              <span className="font-mono ml-2">{plannerBlocks}</span>
            </div>
            <div>
              <span className="text-blue-700">Existing Snapshots:</span>
              <span className="font-mono ml-2">{existingSnapshots}</span>
            </div>
          </div>
        </div>

        {/* Generation Status */}
        {state.isGenerating && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Generating snapshots... This may take a few moments.
            </AlertDescription>
          </Alert>
        )}

        {state.error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Error: {state.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Metrics */}
        {state.metrics && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3">Last Generation Results</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-green-700">Generated:</span>
                <span className="font-mono ml-2">{state.metrics.snapshotsCreated} snapshots</span>
              </div>
              <div>
                <span className="text-green-700">Duration:</span>
                <span className="font-mono ml-2">{Math.round(state.metrics.generationTime)}ms</span>
              </div>
              <div>
                <span className="text-green-700">Source Records:</span>
                <span className="font-mono ml-2">{state.metrics.dataSourceRecords} blocks</span>
              </div>
              <div>
                <span className="text-green-700">Generated At:</span>
                <span className="font-mono ml-2">
                  {state.lastGenerated ? new Date(state.lastGenerated).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Validation */}
        {state.validation && (
          <div className={`p-4 rounded-lg border ${
            state.validation.isValid
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`font-semibold mb-3 ${
              state.validation.isValid ? 'text-green-900' : 'text-red-900'
            }`}>
              Validation Results
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {state.validation.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <span>Status: {state.validation.isValid ? 'Valid' : 'Invalid'}</span>
              </div>

              <div>Snapshot Count: {state.validation.snapshotCount}</div>

              {state.validation.lastGenerated && (
                <div>Last Generated: {new Date(state.validation.lastGenerated).toLocaleString()}</div>
              )}

              {state.validation.errors.length > 0 && (
                <div>
                  <strong className="text-red-700">Errors:</strong>
                  <ul className="list-disc list-inside ml-2">
                    {state.validation.errors.map((error, idx) => (
                      <li key={idx} className="text-red-600">{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {state.validation.warnings.length > 0 && (
                <div>
                  <strong className="text-yellow-700">Warnings:</strong>
                  <ul className="list-disc list-inside ml-2">
                    {state.validation.warnings.map((warning, idx) => (
                      <li key={idx} className="text-yellow-600">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleGenerateSnapshots}
            disabled={state.isGenerating || !isReady}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {state.isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Snapshots'
            )}
          </Button>

          <Button
            onClick={handleValidateSnapshots}
            variant="outline"
            disabled={state.isGenerating || !isReady}
          >
            Validate Snapshots
          </Button>

          <Button
            onClick={handleCleanupSnapshots}
            variant="outline"
            disabled={state.isGenerating || !isReady}
          >
            Cleanup Old Snapshots
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}