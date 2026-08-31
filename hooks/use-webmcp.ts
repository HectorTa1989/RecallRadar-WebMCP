'use client';

import { useEffect } from 'react';
import { finishedUnits } from '@/lib/domain';
import { getAvailableTools, type TraceStep, useTraceStore } from '@/lib/store';
import {
  traceToolContracts,
  type TraceToolName,
} from '@/lib/tool-catalog';

function result(value: unknown) {
  return JSON.stringify(value);
}

export function getWebMCPDefinitions(step: TraceStep): ModelContextToolDefinition[] {
  const store = () => useTraceStore.getState();
  const execute: Record<TraceToolName, ModelContextToolDefinition['execute']> = {
    get_selected_trace_node: () => result({ nodeId: store().selectedNodeId, nodeType: store().selectedNodeId.startsWith('CAP-') ? 'supplier-lot' : 'trace-node', graphVersion: store().graphVersion }),
    expand_lot_to_batches: (input) => result(store().expandLotToBatches(String(input.lotId))),
    expand_batch_to_units: (input) => result(store().expandBatchesToUnits(input.batchIds as string[])),
    locate_finished_units: (input) => result(store().locateUnits(Array.isArray(input.unitIds) ? input.unitIds as string[] : finishedUnits.map((unit) => unit.id))),
    get_evidence_versions: (input) => result(store().resolveEvidence(input.entityIds as string[])),
    compare_containment_scopes: async (input, options) => result(await store().compareScopes(Number(input.graphVersion), options?.signal)),
    preview_containment_scope: (input) => result(store().previewScope(input.scopeId as 'broad' | 'evidence' | 'ultra-narrow', Number(input.graphVersion))),
    stage_inventory_holds: (input) => result(store().stageHolds(input.scopeId as 'broad' | 'evidence' | 'ultra-narrow', Number(input.graphVersion), String(input.idempotencyKey))),
    preview_customer_notices: (input) => result(store().previewNotices(input.scopeId as 'broad' | 'evidence' | 'ultra-narrow')),
    get_staged_containment: (input) => {
      const stage = store().stagedHold;
      if (!stage || stage.id !== input.stageId) throw new Error('UNKNOWN_STAGE');
      return result({ stageId: stage.id, graphVersion: stage.graphVersion, unitCount: stage.unitIds.length, unitPageRef: `${stage.id}:units:page:1`, inverseAction: { action: 'restore-hold-states', unitCount: stage.unitIds.length } });
    },
    commit_inventory_holds: (input) => result(store().commitHolds(String(input.stageId), String(input.approvalToken), String(input.idempotencyKey))),
    undo_inventory_holds: (input) => result(store().undoHolds(String(input.auditEventId), String(input.idempotencyKey))),
  };
  return getAvailableTools(step).map((name) => {
    const toolName = name as TraceToolName;
    return { ...traceToolContracts[toolName], execute: execute[toolName] };
  });
}

export function useWebMCP(step: TraceStep) {
  useEffect(() => {
    const controller = new AbortController();
    const definitions = getWebMCPDefinitions(step);
    window.__RECALL_RADAR_TOOLS__ = definitions;
    if (document.modelContext) {
      Promise.all(definitions.map((definition) => document.modelContext!.registerTool(definition, { signal: controller.signal }))).catch(() => undefined);
    }
    return () => controller.abort();
  }, [step]);
}
