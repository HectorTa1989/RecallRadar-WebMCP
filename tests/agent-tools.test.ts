import { describe, expect, it } from 'vitest';
import { getAvailableTools } from '@/lib/store';
import {
  bindAgentToolInput,
  traceToolContracts,
  type TraceToolName,
} from '@/lib/tool-catalog';

describe('Gemini WebMCP bridge', () => {
  it('has one shared contract for every lifecycle tool', () => {
    for (let step = 0; step <= 10; step += 1) {
      for (const name of getAvailableTools(step as Parameters<typeof getAvailableTools>[0])) {
        expect(traceToolContracts[name as TraceToolName].name).toBe(name);
      }
    }
  });

  it('binds model-selected actions to the current graph version', () => {
    expect(bindAgentToolInput('compare_containment_scopes', {
      graphVersion: 7,
      selectedLotId: 'CAP-77B',
      runId: 'run-safe-001',
    })).toMatchObject({
      qualityEventId: 'QE-2026-014',
      graphVersion: 7,
    });
  });

  it('never accepts a model-supplied approval token', () => {
    const input = bindAgentToolInput('commit_inventory_holds', {
      graphVersion: 9,
      selectedLotId: 'CAP-77B',
      stagedHoldId: 'STAGE-271-SAFE',
      approvalToken: 'STAGE-271-SAFE:approved:visible-click',
      runId: 'run-safe-001',
    });
    expect(input.approvalToken).toBe('STAGE-271-SAFE:approved:visible-click');
    expect(input.idempotencyKey).toBe('commit-run-safe-001');
  });

  it('refuses commit binding before visible approval', () => {
    expect(() => bindAgentToolInput('commit_inventory_holds', {
      graphVersion: 9,
      selectedLotId: 'CAP-77B',
      stagedHoldId: 'STAGE-271-SAFE',
      runId: 'run-safe-001',
    })).toThrow('VISIBLE_APPROVAL_REQUIRED');
  });
});
