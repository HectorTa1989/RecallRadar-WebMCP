import { describe, expect, it } from 'vitest';
import {
  assertGraphVersion,
  buildInclusionReason,
  commitInventoryHolds,
  compareContainmentScopes,
  compareContainmentScopesCancellable,
  evidenceRecords,
  locateFinishedUnits,
  previewCustomerNotices,
  resolveLatestVersion,
  stageInventoryHolds,
  traceLot,
  undoInventoryHolds,
} from '@/lib/domain';
import { getAvailableTools } from '@/lib/store';

describe('RecallRadar deterministic lineage', () => {
  it('traces CAP-77B and never includes the lookalike CAP-77D batch', () => {
    const trace = traceLot('CAP-77B');
    expect(trace.batches.map((batch) => batch.id)).toEqual(['ASM-1042', 'ASM-1047', 'ASM-1051']);
    expect(trace.batches.some((batch) => batch.id === 'ASM-1053')).toBe(false);
  });

  it('uses corrected assembly record version 3', () => {
    const record = evidenceRecords.find((item) => item.id === 'EV-ASM-1051')!;
    expect(resolveLatestVersion(record).version).toBe(3);
    expect(resolveLatestVersion(record).payload.units).toBe(111);
  });

  it('finds all 312 affected finished units', () => {
    expect(traceLot('CAP-77B').units).toHaveLength(312);
  });

  it('splits 271 warehouse units from 41 shipped units and 18 orders', () => {
    const location = locateFinishedUnits(traceLot('CAP-77B').units.map((unit) => unit.id));
    expect(location.warehouse).toHaveLength(271);
    expect(location.shipped).toHaveLength(41);
    expect(location.orders).toHaveLength(18);
  });

  it('explains sampled unit inclusion with structured provenance', () => {
    const reason = buildInclusionReason('RR-0312');
    expect(reason.path[0]).toBe('CAP-77B');
    expect(reason.path).toContain('RR-0312');
    expect(reason.sourceRecordIds.length).toBeGreaterThan(0);
  });

  it('compares broad, evidence-based, and ultra-narrow counts correctly', () => {
    const scopes = compareContainmentScopes(7);
    expect(scopes.map((scope) => scope.id)).toEqual(['broad', 'evidence', 'ultra-narrow']);
    expect(scopes.find((scope) => scope.id === 'evidence')).toMatchObject({ warehouseUnitCount: 271, shippedUnitCount: 41, falsePositiveCount: 0 });
    expect(scopes.find((scope) => scope.id === 'broad')?.falsePositiveCount).toBe(88);
  });

  it('never commits holds before visible approval', () => {
    const scope = compareContainmentScopes(7)[1];
    const stage = stageInventoryHolds(scope, 7, 7, 'stage-key-001');
    expect(() => commitInventoryHolds(stage, 'missing', 'commit-key-001')).toThrow('APPROVAL_REQUIRED');
  });

  it('keeps customer notices preview-only', () => {
    const preview = previewCustomerNotices(compareContainmentScopes(7)[1]);
    expect(preview.sent).toBe(false);
    expect(preview.orderIds).toHaveLength(18);
  });

  it('labels suspicious supplier instructions as inert untrusted data', () => {
    const supplierNote = evidenceRecords.find((record) => record.id === 'EV-SUP-NOTE')!;
    expect(supplierNote.trust).toBe('untrusted-external');
    expect(resolveLatestVersion(supplierNote).payload.executable).toBe(false);
    expect(supplierNote.note).toContain('IGNORE PRIOR RULES');
  });

  it('rejects stale graph versions', () => {
    expect(() => assertGraphVersion(6, 7)).toThrow('STALE_GRAPH_VERSION');
  });

  it('updates available WebMCP tools at each evidence stage', () => {
    expect(getAvailableTools(0)).toContain('expand_lot_to_batches');
    expect(getAvailableTools(0)).not.toContain('commit_inventory_holds');
    expect(getAvailableTools(8)).toContain('commit_inventory_holds');
    expect(getAvailableTools(9)).toEqual(['get_selected_trace_node', 'undo_inventory_holds']);
  });

  it('cancels scope comparison safely', async () => {
    const controller = new AbortController();
    const comparison = compareContainmentScopesCancellable(7, controller.signal);
    controller.abort();
    await expect(comparison).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('preserves idempotent stage and commit receipts', () => {
    const scope = compareContainmentScopes(7)[1];
    const first = stageInventoryHolds(scope, 7, 7, 'stage-key-001');
    const second = stageInventoryHolds(scope, 7, 7, 'stage-key-001');
    expect(first.id).toBe(second.id);
    const approval = `${first.id}:approved:visible-click`;
    expect(commitInventoryHolds(first, approval, 'commit-key-001').auditEvent.id).toBe(commitInventoryHolds(first, approval, 'commit-key-001').auditEvent.id);
  });

  it('undo restores every prior warehouse state', () => {
    const scope = compareContainmentScopes(7)[1];
    const stage = stageInventoryHolds(scope, 7, 7, 'stage-key-001');
    const committed = commitInventoryHolds(stage, `${stage.id}:approved:visible-click`, 'commit-key-001');
    const undone = undoInventoryHolds(committed.inverseAction, 'undo-key-001');
    expect(undone.restoredUnitIds).toHaveLength(271);
    expect(Object.values(committed.inverseAction.previousStates).every((state) => state === 'clear')).toBe(true);
  });
});
