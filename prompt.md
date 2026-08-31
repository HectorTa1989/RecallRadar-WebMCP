# Build Prompt: RecallRadar

> Working name: **RecallRadar**  
> Tagline: **Trace one failed component to every affected unit—and contain it before the next spreadsheet opens.**

## Your role

Act as a senior product engineer, traceability-domain designer, WebMCP specialist, and hackathon demo director. Build a polished, deployable application named RecallRadar.

## Product thesis

When a component batch fails a quality test, operations teams must trace where it went, decide which units are affected, place the correct holds, and document every decision. The data is often split across supplier lots, assembly batches, warehouses, shipments, and customer orders. Manual spreadsheet joins waste time and make over-broad containment likely.

RecallRadar is a visual product-lineage map where a human and an agent perform one contained, auditable quality response together.

This is not an inventory or recall-management clone. The unique loop is selection-aware graph investigation followed by a staged, reversible containment plan whose available tools change with the evidence state.

## Why WebMCP is indispensable

- Selecting a failed supplier lot exposes tools scoped to that lot and its graph neighborhood.
- The agent traverses explicit lineage relationships instead of scraping tables.
- Each investigation result expands the visible graph and registers the next valid tools.
- The agent can simulate narrow versus broad containment without mutating state.
- Hold and notice actions are staged and previewed.
- Commit tools appear only after visible approval.
- Supplier notes and customer-entered text are labeled untrusted.
- The user sees every tool call materialize as nodes, edges, filters, or action cards.

## Primary user and pain

Primary user: a quality operations lead at a small electronics manufacturer.

Pain points:

- Traceability records use multiple IDs and levels.
- Teams either miss affected units or stop too much inventory.
- Evidence, decisions, and actions are recorded in separate places.
- It is hard to explain why a particular unit was included.
- Rollback is unclear if later evidence narrows the scope.

## Hero scenario

Use deterministic seed data:

- Supplier lot `CAP-77B` fails a quality test.
- It was split across three assembly batches.
- 312 finished units contain the component.
- 271 are still in two warehouses.
- 41 were shipped across 18 orders.
- A similar-looking lot `CAP-77D` is not affected.
- One assembly record was corrected later and must use the latest version.
- A supplier note contains suspicious instruction-like text and must remain inert data.

Hero prompt:

> Trace CAP-77B to every affected finished unit. Find the narrowest defensible containment scope, show why each group is included, and stage the holds and customer-notice list for review.

Expected visible flow:

1. The selected supplier lot pulses at the left of the lineage graph.
2. Agent calls expand batches, units, warehouses, and orders step by step.
3. Affected paths turn amber; unaffected lookalikes fade.
4. Scope cards compare broad, evidence-based, and ultra-narrow options.
5. The agent selects the evidence-based scope: 271 warehouse holds and 41 shipped units for notice review.
6. The UI shows inclusion reasons and source records.
7. The user approves the exact hold set; commit tools appear.
8. Nodes receive hold badges and an action receipt is generated.
9. The user can undo the seeded demo action.

## Scope

Build a deterministic simulator with one product family and three seeded quality events.

Required:

- Interactive multi-stage lineage graph.
- Search for lot, assembly batch, finished unit, shipment, and order IDs.
- Incremental graph expansion.
- Evidence/version handling.
- Scope comparison and impact counts.
- Staged warehouse holds.
- Customer-notice preview only; do not send messages.
- Approval, commit, undo, and audit.
- Manual UI controls for every important action.

Do not build:

- Real ERP, warehouse, messaging, or customer systems.
- Automated customer communication.
- A generic graph database explorer.
- A freeform chatbot.
- More than one polished hero case.

## Suggested stack

- TypeScript, React, Vite
- React Flow, Cytoscape.js, or Sigma.js
- Zustand or XState
- Zod and JSON Schema
- IndexedDB or localStorage
- Vitest and Playwright

## Domain model

Define:

- `SupplierLot`
- `AssemblyBatch`
- `FinishedUnit`
- `WarehouseStock`
- `Shipment`
- `CustomerOrder`
- `LineageEdge`
- `EvidenceRecord`
- `RecordVersion`
- `ContainmentScope`
- `InclusionReason`
- `StagedHold`
- `NoticePreview`
- `AuditEvent`
- `InverseAction`

Every evidence record includes source, effective timestamp, record version, and trust classification.

## WebMCP tool strategy

| Tool | Purpose | Key input | Annotation and lifecycle |
| --- | --- | --- | --- |
| `get_selected_trace_node` | Return selected node and graph version | none | Read-only; selection-scoped |
| `expand_lot_to_batches` | Return assembly batches consuming a lot | `lotId`, `asOf` | Read-only |
| `expand_batch_to_units` | Return finished units from selected batches | `batchIds`, `asOf` | Read-only |
| `locate_finished_units` | Group units by warehouse, shipment, and order | `unitIds`, `asOf` | Read-only |
| `get_evidence_versions` | Return relevant record versions and corrections | `entityIds` | Read-only; external notes untrusted |
| `compare_containment_scopes` | Compute counts and false-positive risk for candidate rules | `qualityEventId`, `scopeRules`, `graphVersion` | Read-only, cancellable |
| `preview_containment_scope` | Render one candidate on the graph | `scopeId`, `graphVersion` | UI state mutation only |
| `stage_inventory_holds` | Stage holds for in-stock affected units | `scopeId`, `graphVersion`, `idempotencyKey` | Write; after preview |
| `preview_customer_notices` | Build structured notice recipients and reasons | `scopeId` | Read-only; never sends |
| `get_staged_containment` | Return exact unit IDs, counts, reasons, and inverse action | `stageId` | Read-only |
| `commit_inventory_holds` | Commit the approved staged hold set | `stageId`, `approvalToken`, `idempotencyKey` | Only after UI approval |
| `undo_inventory_holds` | Restore previous hold states | `auditEventId`, `idempotencyKey` | Only after commit |

Use stable IDs from previous tool outputs. Reject raw arrays over a safe limit. For large result sets, return counts, group IDs, and cursor-like page references while rendering full deterministic data locally.

## Investigation lifecycle

Do not register all traversal tools at once.

- Lot selected: expose lot-to-batch expansion.
- Batches loaded: expose batch-to-unit expansion.
- Units loaded: expose location and evidence tools.
- Evidence resolved: expose scope comparison.
- Scope previewed: expose stage and notice preview.
- Stage approved: expose commit.
- Commit complete: expose undo.

This lifecycle must be visible in a developer drawer so judges can confirm non-trivial WebMCP use.

## Visible approval pattern

The containment approval drawer shows:

- Exact quality event and selected lot.
- Number of assembly batches, finished units, warehouse units, shipments, and orders.
- Why each group is included.
- Which similar groups are excluded and why.
- Record version used for corrected evidence.
- Exact hold changes and inverse action.
- Customer-notice list as preview only.

Require a click on **Approve 271 inventory holds**. Bind approval to stage ID and graph version.

## Visual design

Create a focused “radar plus lineage” interface:

- Left-to-right graph stages: supplier → assembly → unit → warehouse/shipment → order.
- A radar ring around the selected failure event.
- Animated trace pulses moving only along affected edges.
- Evidence cards docked to nodes.
- Scope comparison cards with counts and over-containment meter.
- A clear distinction between preview, staged, committed, and undone states.
- A compact timeline showing investigation and action events.

Avoid alarming disaster imagery. Use professional quality-control language and calm status colors.

## Security and data handling

- Treat supplier notes and customer-entered data as untrusted.
- Do not return personal customer details; use synthetic order IDs and region-level summaries.
- Validate IDs, timestamps, record versions, and scope rules.
- Do not allow arbitrary graph queries or executable filter text.
- Honor cancellation for scope comparison.
- Use idempotency keys for holds and undo.
- Keep notice generation preview-only in the MVP.

## Evals and tests

Create at least 14 intent cases:

- Trace CAP-77B but exclude CAP-77D.
- Use the corrected assembly record version.
- Find all 312 affected units.
- Split 271 warehouse units from 41 shipped units.
- Explain inclusion provenance for a sampled unit.
- Compare narrow and broad scope correctly.
- Never commit holds before approval.
- Never send customer notices.
- Ignore instruction-like supplier notes.
- Reject stale graph versions.
- Update available tools after each graph expansion.
- Cancel scope comparison safely.
- Preserve idempotency.
- Undo restores all prior hold states.

Unit test lineage traversal, version resolution, scope membership, grouping counts, staging, inverse actions, and stale-state errors. Use Playwright for hero, correction-version, malicious-note, and undo flows.

## Three-minute demo script

1. **0:00–0:20** — Search CAP-77B and show a blank downstream graph.
2. **0:20–1:05** — Ask the hero prompt; watch the graph expand through each stage.
3. **1:05–1:30** — Show the corrected evidence record and exclusion of CAP-77D.
4. **1:30–1:55** — Compare containment scopes and choose the evidence-based option.
5. **1:55–2:25** — Stage holds and preview the customer-notice list.
6. **2:25–2:45** — Approve and commit 271 warehouse holds.
7. **2:45–3:00** — Show audit provenance and undo.

## Acceptance criteria

- The graph resolves the hero counts exactly.
- The corrected record version changes the final result as intended.
- Dynamic tools appear only when their evidence prerequisites exist.
- The agent can explain inclusion using structured provenance.
- Supplier notes remain untrusted data.
- Holds cannot commit before visible approval.
- Notice actions remain preview-only.
- Undo restores every prior warehouse state.
- The demo is deterministic and requires no live services.
- The README makes a specific impact case and explains why WebMCP beats table scraping.

## Build order

1. Implement seed lineage data, version rules, traversal, and tests.
2. Build human-first search and graph expansion.
3. Add scope comparison and preview styling.
4. Add dynamic WebMCP traversal and simulation tools.
5. Add stage, visible approval, commit, undo, and audit.
6. Add untrusted-content handling, cancellation, and fallback.
7. Add evals, browser tests, deployment, and demo polish.

## Final instruction

The prize-worthy moment is watching one selected lot expand into an exact, defensible action set while every tool remains scoped to the current evidence. Keep the graph comprehensible and the containment decision reversible.

