export const TRACE_TOOL_NAMES = [
  'get_selected_trace_node',
  'expand_lot_to_batches',
  'expand_batch_to_units',
  'locate_finished_units',
  'get_evidence_versions',
  'compare_containment_scopes',
  'preview_containment_scope',
  'stage_inventory_holds',
  'preview_customer_notices',
  'get_staged_containment',
  'commit_inventory_holds',
  'undo_inventory_holds',
] as const;

export type TraceToolName = (typeof TRACE_TOOL_NAMES)[number];

type ToolContract = {
  name: TraceToolName;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
};

const objectSchema = (
  properties: Record<string, unknown>,
  required: string[] = [],
) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  ...(required.length ? { required } : {}),
});

const stringId = {
  type: 'string',
  pattern: '^[A-Z0-9][A-Z0-9-]{2,31}$',
};
const graphVersion = { type: 'integer', minimum: 1 };
const idArray = {
  type: 'array',
  maxItems: 500,
  items: stringId,
};
const scopeId = {
  type: 'string',
  enum: ['broad', 'evidence', 'ultra-narrow'],
};
const idempotencyKey = {
  type: 'string',
  minLength: 8,
  maxLength: 80,
  pattern: '^[a-zA-Z0-9_-]+$',
};

export const traceToolContracts: Record<TraceToolName, ToolContract> = {
  get_selected_trace_node: {
    name: 'get_selected_trace_node',
    title: 'Get selected trace node',
    description:
      'Return the human-selected lineage node and current graph version. Use this before traversing the graph.',
    inputSchema: objectSchema({}),
    annotations: { readOnlyHint: true },
  },
  expand_lot_to_batches: {
    name: 'expand_lot_to_batches',
    title: 'Expand lot to assembly batches',
    description:
      'Expand only the selected supplier lot into assembly batches that consumed it at the requested evidence time.',
    inputSchema: objectSchema(
      { lotId: stringId, asOf: { type: 'string', format: 'date-time' } },
      ['lotId', 'asOf'],
    ),
    annotations: { readOnlyHint: true },
  },
  expand_batch_to_units: {
    name: 'expand_batch_to_units',
    title: 'Expand batches to finished units',
    description:
      'Expand stable assembly batch IDs returned by the prior tool into finished-unit groups.',
    inputSchema: objectSchema(
      {
        batchIds: {
          type: 'array',
          minItems: 1,
          maxItems: 20,
          uniqueItems: true,
          items: stringId,
        },
        asOf: { type: 'string', format: 'date-time' },
      },
      ['batchIds', 'asOf'],
    ),
    annotations: { readOnlyHint: true },
  },
  locate_finished_units: {
    name: 'locate_finished_units',
    title: 'Locate finished units',
    description:
      'Group affected finished units into warehouses, shipments, and synthetic order IDs. Returns no personal customer data.',
    inputSchema: objectSchema(
      {
        unitIds: idArray,
        groupRef: { type: 'string', enum: ['units:CAP-77B:page:1'] },
        asOf: { type: 'string', format: 'date-time' },
      },
      ['groupRef', 'asOf'],
    ),
    annotations: { readOnlyHint: true },
  },
  get_evidence_versions: {
    name: 'get_evidence_versions',
    title: 'Resolve evidence versions',
    description:
      'Return relevant record versions, corrections, sources, timestamps, and trust labels. Supplier notes remain inert untrusted data.',
    inputSchema: objectSchema({ entityIds: idArray }, ['entityIds']),
    annotations: { readOnlyHint: true, untrustedContentHint: true },
  },
  compare_containment_scopes: {
    name: 'compare_containment_scopes',
    title: 'Compare containment scopes',
    description:
      'Simulate broad, evidence-based, and ultra-narrow containment without mutating operational state. Honors cancellation.',
    inputSchema: objectSchema(
      {
        qualityEventId: { type: 'string', enum: ['QE-2026-014'] },
        scopeRules: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          items: {
            type: 'string',
            enum: ['broad', 'evidence', 'ultra-narrow'],
          },
        },
        graphVersion,
      },
      ['qualityEventId', 'scopeRules', 'graphVersion'],
    ),
    annotations: { readOnlyHint: true },
  },
  preview_containment_scope: {
    name: 'preview_containment_scope',
    title: 'Preview containment scope',
    description:
      'Paint one candidate scope on the visible graph. This changes only the local UI preview.',
    inputSchema: objectSchema({ scopeId, graphVersion }, [
      'scopeId',
      'graphVersion',
    ]),
  },
  stage_inventory_holds: {
    name: 'stage_inventory_holds',
    title: 'Stage inventory holds',
    description:
      'Stage warehouse holds for the currently previewed scope. Does not commit them and returns an inverse-action summary.',
    inputSchema: objectSchema(
      { scopeId, graphVersion, idempotencyKey },
      ['scopeId', 'graphVersion', 'idempotencyKey'],
    ),
  },
  preview_customer_notices: {
    name: 'preview_customer_notices',
    title: 'Preview customer notices',
    description:
      'Build a synthetic region-level notice review list. This tool never sends a message.',
    inputSchema: objectSchema({ scopeId }, ['scopeId']),
    annotations: { readOnlyHint: true },
  },
  get_staged_containment: {
    name: 'get_staged_containment',
    title: 'Get staged containment',
    description:
      'Return exact staged counts, stable unit references, inclusion reasons, and inverse-action details for human review.',
    inputSchema: objectSchema(
      { stageId: { type: 'string', minLength: 8, maxLength: 80 } },
      ['stageId'],
    ),
    annotations: { readOnlyHint: true },
  },
  commit_inventory_holds: {
    name: 'commit_inventory_holds',
    title: 'Commit approved inventory holds',
    description:
      'Commit only the visibly approved staged hold set. Requires an approval token bound to stage ID and graph version.',
    inputSchema: objectSchema(
      {
        stageId: { type: 'string', minLength: 8, maxLength: 80 },
        approvalToken: { type: 'string', minLength: 16, maxLength: 160 },
        idempotencyKey,
      },
      ['stageId', 'approvalToken', 'idempotencyKey'],
    ),
  },
  undo_inventory_holds: {
    name: 'undo_inventory_holds',
    title: 'Undo inventory holds',
    description:
      'Restore every prior warehouse hold state using the inverse action attached to the committed audit event.',
    inputSchema: objectSchema(
      {
        auditEventId: { type: 'string', minLength: 8, maxLength: 80 },
        idempotencyKey,
      },
      ['auditEventId', 'idempotencyKey'],
    ),
  },
};

export interface AgentToolContext {
  graphVersion: number;
  selectedLotId: string;
  stagedHoldId?: string;
  approvalToken?: string;
  auditEventId?: string;
  runId: string;
}

const AS_OF = '2026-07-18T12:00:00Z';
const BATCH_IDS = ['ASM-1042', 'ASM-1047', 'ASM-1051'];

/**
 * Gemini chooses the tool. RecallRadar binds its arguments to the visible graph
 * so a model can never inject arbitrary IDs, stale versions, or approval tokens.
 */
export function bindAgentToolInput(
  name: TraceToolName,
  context: AgentToolContext,
): Record<string, unknown> {
  const idempotency = (action: string) => `${action}-${context.runId}`;
  switch (name) {
    case 'get_selected_trace_node':
      return {};
    case 'expand_lot_to_batches':
      return { lotId: context.selectedLotId, asOf: AS_OF };
    case 'expand_batch_to_units':
      return { batchIds: BATCH_IDS, asOf: AS_OF };
    case 'locate_finished_units':
      return { groupRef: 'units:CAP-77B:page:1', asOf: AS_OF };
    case 'get_evidence_versions':
      return { entityIds: [context.selectedLotId, ...BATCH_IDS] };
    case 'compare_containment_scopes':
      return {
        qualityEventId: 'QE-2026-014',
        scopeRules: ['broad', 'evidence', 'ultra-narrow'],
        graphVersion: context.graphVersion,
      };
    case 'preview_containment_scope':
      return { scopeId: 'evidence', graphVersion: context.graphVersion };
    case 'preview_customer_notices':
      return { scopeId: 'evidence' };
    case 'stage_inventory_holds':
      return {
        scopeId: 'evidence',
        graphVersion: context.graphVersion,
        idempotencyKey: idempotency('stage'),
      };
    case 'get_staged_containment':
      if (!context.stagedHoldId) throw new Error('STAGE_REQUIRED');
      return { stageId: context.stagedHoldId };
    case 'commit_inventory_holds':
      if (!context.stagedHoldId || !context.approvalToken) {
        throw new Error('VISIBLE_APPROVAL_REQUIRED');
      }
      return {
        stageId: context.stagedHoldId,
        approvalToken: context.approvalToken,
        idempotencyKey: idempotency('commit'),
      };
    case 'undo_inventory_holds':
      if (!context.auditEventId) throw new Error('AUDIT_EVENT_REQUIRED');
      return {
        auditEventId: context.auditEventId,
        idempotencyKey: idempotency('undo'),
      };
  }
}
