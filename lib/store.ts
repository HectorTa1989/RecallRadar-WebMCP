'use client';

import { create } from 'zustand';
import {
  type AuditEvent,
  type ContainmentScope,
  type InverseAction,
  type NoticePreview,
  type StagedHold,
  assertGraphVersion,
  assemblyBatches,
  commitInventoryHolds,
  compareContainmentScopesCancellable,
  evidenceRecords,
  finishedUnits,
  previewCustomerNotices,
  stageInventoryHolds,
  traceLot,
  undoInventoryHolds,
} from './domain';

export type TraceStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface ToolLogEntry {
  id: string;
  name: string;
  at: string;
  status: 'success' | 'rejected';
  detail: string;
}

export interface TraceState {
  selectedLotId: string;
  selectedNodeId: string;
  step: TraceStep;
  graphVersion: number;
  scopes: ContainmentScope[];
  selectedScopeId: ContainmentScope['id'] | null;
  stagedHold: StagedHold | null;
  noticePreview: NoticePreview | null;
  approvalToken: string | null;
  inverseAction: InverseAction | null;
  heldUnitIds: string[];
  toolLog: ToolLogEntry[];
  auditEvents: AuditEvent[];
  developerDrawerOpen: boolean;
  approvalDrawerOpen: boolean;
  noticeDrawerOpen: boolean;
  paywallOpen: boolean;
  premiumIntent: string | null;
  selectNode: (id: string) => void;
  resetInvestigation: () => void;
  expandLotToBatches: (lotId: string) => unknown;
  expandBatchesToUnits: (batchIds: string[]) => unknown;
  locateUnits: (unitIds: string[]) => unknown;
  resolveEvidence: (entityIds: string[]) => unknown;
  compareScopes: (graphVersion: number, signal?: AbortSignal) => Promise<unknown>;
  previewScope: (scopeId: ContainmentScope['id'], graphVersion: number) => unknown;
  stageHolds: (scopeId: ContainmentScope['id'], graphVersion: number, idempotencyKey: string) => unknown;
  previewNotices: (scopeId: ContainmentScope['id']) => unknown;
  approveStage: () => void;
  commitHolds: (stageId: string, approvalToken: string, idempotencyKey: string) => unknown;
  undoHolds: (auditEventId: string, idempotencyKey: string) => unknown;
  setDeveloperDrawerOpen: (open: boolean) => void;
  setApprovalDrawerOpen: (open: boolean) => void;
  setNoticeDrawerOpen: (open: boolean) => void;
  requestPremium: (intent: string) => void;
  setPaywallOpen: (open: boolean) => void;
}

const initialAudit: AuditEvent[] = [
  { id: 'AUDIT-OPEN', at: '2026-07-18T08:22:00Z', actor: 'Quality lab', action: 'Quality event opened', detail: 'CAP-77B failed capacitance drift test at +18.4%.', reversible: false },
  { id: 'AUDIT-SELECT', at: '2026-07-18T12:02:00Z', actor: 'Hector Ta · Admin', action: 'Supplier lot selected', detail: 'CAP-77B selected as the trace root.', reversible: false },
];

function timestamp(index: number) {
  return `12:${String(3 + index).padStart(2, '0')}:00`;
}

export const useTraceStore = create<TraceState>((set, get) => {
  const log = (name: string, detail: string, status: ToolLogEntry['status'] = 'success') => {
    const index = get().toolLog.length;
    set((state) => ({ toolLog: [...state.toolLog, { id: `CALL-${index + 1}`, name, at: timestamp(index), status, detail }] }));
  };

  const bump = (step: TraceStep) => set((state) => ({ step, graphVersion: state.graphVersion + 1 }));

  return {
    selectedLotId: 'CAP-77B',
    selectedNodeId: 'CAP-77B',
    step: 0,
    graphVersion: 1,
    scopes: [],
    selectedScopeId: null,
    stagedHold: null,
    noticePreview: null,
    approvalToken: null,
    inverseAction: null,
    heldUnitIds: [],
    toolLog: [],
    auditEvents: initialAudit,
    developerDrawerOpen: false,
    approvalDrawerOpen: false,
    noticeDrawerOpen: false,
    paywallOpen: false,
    premiumIntent: null,

    selectNode: (id) => set({ selectedNodeId: id }),
    resetInvestigation: () => set((state) => ({
      selectedNodeId: 'CAP-77B', step: 0, graphVersion: state.graphVersion + 1, scopes: [], selectedScopeId: null,
      stagedHold: null, noticePreview: null, approvalToken: null, inverseAction: null, heldUnitIds: [], toolLog: [], auditEvents: initialAudit,
      approvalDrawerOpen: false, noticeDrawerOpen: false,
    })),

    expandLotToBatches: (lotId) => {
      if (get().step !== 0) return { alreadyExpanded: true, graphVersion: get().graphVersion };
      const result = traceLot(lotId);
      bump(1);
      log('expand_lot_to_batches', `${result.batches.length} consuming batches materialized.`);
      return { lotId, batchIds: result.batches.map((batch) => batch.id), count: result.batches.length, graphVersion: get().graphVersion };
    },
    expandBatchesToUnits: (batchIds) => {
      if (get().step !== 1) throw new Error('PREREQUISITE_MISSING: batches must be the active frontier');
      const validIds = assemblyBatches.filter((batch) => batchIds.includes(batch.id) && batch.lotId === 'CAP-77B').map((batch) => batch.id);
      if (!validIds.length || validIds.length > 20) throw new Error('INVALID_BATCH_SET');
      const units = finishedUnits.filter((unit) => validIds.includes(unit.batchId));
      bump(2);
      log('expand_batch_to_units', `${units.length} finished units loaded from stable batch IDs.`);
      return { batchIds: validIds, unitCount: units.length, groupRef: 'units:CAP-77B:page:1', graphVersion: get().graphVersion };
    },
    locateUnits: (unitIds) => {
      if (get().step !== 2) throw new Error('PREREQUISITE_MISSING: units must be loaded first');
      if (unitIds.length > 500) throw new Error('SAFE_LIMIT_EXCEEDED');
      bump(3);
      log('locate_finished_units', '271 warehouse units and 41 shipped units grouped without exposing customer details.');
      return { warehouseUnits: 271, shippedUnits: 41, warehouses: ['WH-SEA', 'WH-CHI'], shipmentCount: 6, orderCount: 18, graphVersion: get().graphVersion };
    },
    resolveEvidence: (entityIds) => {
      if (get().step !== 3) throw new Error('PREREQUISITE_MISSING: unit locations must be resolved first');
      if (entityIds.length > 500) throw new Error('SAFE_LIMIT_EXCEEDED');
      bump(4);
      log('get_evidence_versions', 'Corrected assembly record v3 selected; supplier note labeled untrusted.');
      return {
        records: evidenceRecords.map((record) => ({ id: record.id, entityId: record.entityId, source: record.source, version: record.recordVersion, trust: record.trust })),
        correctionApplied: { recordId: 'EV-ASM-1051', version: 3, units: 111 }, untrustedContentRecordIds: ['EV-SUP-NOTE'], graphVersion: get().graphVersion,
      };
    },
    compareScopes: async (graphVersion, signal) => {
      if (get().step !== 4) throw new Error('PREREQUISITE_MISSING: evidence must be resolved first');
      assertGraphVersion(graphVersion, get().graphVersion);
      const scopes = await compareContainmentScopesCancellable(graphVersion, signal);
      set((state) => ({ scopes, step: 5, graphVersion: state.graphVersion + 1 }));
      log('compare_containment_scopes', 'Broad, evidence-based, and ultra-narrow scopes compared.');
      return { scopes: scopes.map(({ unitIds: _unitIds, ...scope }) => scope), recommendedScopeId: 'evidence', graphVersion: get().graphVersion };
    },
    previewScope: (scopeId, graphVersion) => {
      if (get().step !== 5) throw new Error('PREREQUISITE_MISSING: compare scopes first');
      assertGraphVersion(graphVersion, get().graphVersion);
      const scope = get().scopes.find((candidate) => candidate.id === scopeId);
      if (!scope) throw new Error('UNKNOWN_SCOPE');
      set((state) => ({ selectedScopeId: scopeId, step: 6, graphVersion: state.graphVersion + 1 }));
      log('preview_containment_scope', `${scope.label} painted on graph; no operational state changed.`);
      return { scopeId, warehouseUnitCount: scope.warehouseUnitCount, shippedUnitCount: scope.shippedUnitCount, graphVersion: get().graphVersion };
    },
    stageHolds: (scopeId, graphVersion, idempotencyKey) => {
      if (get().step !== 6) throw new Error('PREREQUISITE_MISSING: preview a scope first');
      const scope = get().scopes.find((candidate) => candidate.id === scopeId);
      if (!scope) throw new Error('UNKNOWN_SCOPE');
      const stagedHold = stageInventoryHolds(scope, graphVersion, get().graphVersion, idempotencyKey);
      set((state) => ({ stagedHold, step: 7, graphVersion: state.graphVersion + 1, approvalDrawerOpen: true }));
      log('stage_inventory_holds', `${stagedHold.unitIds.length} inventory holds staged; nothing committed.`);
      return { stageId: stagedHold.id, unitCount: stagedHold.unitIds.length, inverseAction: { action: 'restore-hold-states', unitCount: stagedHold.unitIds.length }, graphVersion: get().graphVersion };
    },
    previewNotices: (scopeId) => {
      const scope = get().scopes.find((candidate) => candidate.id === scopeId);
      if (!scope || get().step < 6) throw new Error('PREREQUISITE_MISSING: preview a scope first');
      const noticePreview = previewCustomerNotices(scope);
      set({ noticePreview, noticeDrawerOpen: true });
      log('preview_customer_notices', `${noticePreview.orderIds.length} order notices prepared as preview only.`);
      return noticePreview;
    },
    approveStage: () => {
      const stage = get().stagedHold;
      if (!stage || get().step !== 7) throw new Error('STAGE_REQUIRED');
      const approvalToken = `${stage.id}:approved:visible-click`;
      set({ approvalToken, step: 8, approvalDrawerOpen: false });
      log('visible_approval', `Human approved the exact ${stage.unitIds.length}-unit hold set.`);
    },
    commitHolds: (stageId, approvalToken, idempotencyKey) => {
      const stage = get().stagedHold;
      if (!stage || stage.id !== stageId || get().step !== 8) throw new Error('APPROVED_STAGE_REQUIRED');
      const committed = commitInventoryHolds(stage, approvalToken, idempotencyKey);
      set((state) => ({
        heldUnitIds: committed.heldUnitIds, inverseAction: committed.inverseAction, step: 9, graphVersion: state.graphVersion + 1,
        auditEvents: [...state.auditEvents, committed.auditEvent],
      }));
      log('commit_inventory_holds', `${committed.heldUnitIds.length} holds committed with idempotent receipt.`);
      return { auditEventId: committed.auditEvent.id, heldUnitCount: committed.heldUnitIds.length, undoAvailable: true, graphVersion: get().graphVersion };
    },
    undoHolds: (auditEventId, idempotencyKey) => {
      const inverse = get().inverseAction;
      if (!inverse || inverse.auditEventId !== auditEventId || get().step !== 9) throw new Error('UNDO_NOT_AVAILABLE');
      const undone = undoInventoryHolds(inverse, idempotencyKey);
      set((state) => ({ heldUnitIds: [], step: 10, graphVersion: state.graphVersion + 1, auditEvents: [...state.auditEvents, undone.auditEvent] }));
      log('undo_inventory_holds', `${undone.restoredUnitIds.length} prior hold states restored.`);
      return { restoredUnitCount: undone.restoredUnitIds.length, auditEventId: undone.auditEvent.id, graphVersion: get().graphVersion };
    },
    setDeveloperDrawerOpen: (developerDrawerOpen) => set({ developerDrawerOpen }),
    setApprovalDrawerOpen: (approvalDrawerOpen) => set({ approvalDrawerOpen }),
    setNoticeDrawerOpen: (noticeDrawerOpen) => set({ noticeDrawerOpen }),
    requestPremium: (premiumIntent) => set({ premiumIntent, paywallOpen: true }),
    setPaywallOpen: (paywallOpen) => set({ paywallOpen }),
  };
});

export function getAvailableTools(step: TraceStep) {
  const tools = ['get_selected_trace_node'];
  if (step === 0) tools.push('expand_lot_to_batches');
  if (step === 1) tools.push('expand_batch_to_units');
  if (step === 2) tools.push('locate_finished_units');
  if (step === 3) tools.push('get_evidence_versions');
  if (step === 4) tools.push('compare_containment_scopes');
  if (step === 5) tools.push('preview_containment_scope');
  if (step === 6) tools.push('stage_inventory_holds', 'preview_customer_notices');
  if (step === 7) tools.push('get_staged_containment');
  if (step === 8) tools.push('get_staged_containment', 'commit_inventory_holds');
  if (step === 9) tools.push('undo_inventory_holds');
  return tools;
}
