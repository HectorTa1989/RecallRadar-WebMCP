# RecallRadar

> Trace one failed component to every affected unit—and contain it before the next spreadsheet opens.

RecallRadar is a quality-lineage simulator built for the OpenAI WebMCP Challenge. A quality lead selects a failed supplier lot, watches an agent traverse explicit manufacturing relationships, compares containment scopes, and approves a reversible action set with full provenance. It runs deterministically with no external services and can optionally use Gemini for live model-selected WebMCP actions.

Built by [HectorTa1989](https://github.com/HectorTa1989).

## The impact case

The seeded hero event starts with failed capacitor lot `CAP-77B`. RecallRadar resolves exactly:

- 3 assembly batches and 312 affected finished units.
- 271 units still in two warehouses, eligible for staged holds.
- 41 shipped units across 18 synthetic orders, eligible only for notice review.
- 0 false positives in the recommended evidence-based scope.

A broad family stop would hold 88 unrelated units from lookalike lot `CAP-77D`. RecallRadar avoids that over-containment while preserving every affected `CAP-77B` path. One corrected assembly record is resolved to version 3, and a supplier note containing instruction-like text remains visibly labeled, inert, and untrusted.

## Why WebMCP beats table scraping here

Spreadsheet or DOM scraping sees rows and labels. RecallRadar exposes the active investigation state as a small set of typed, selection-scoped tools:

1. Selecting `CAP-77B` registers only lot-to-batch traversal.
2. Each successful expansion registers the next valid tool.
3. Scope comparison receives a graph version and can be cancelled.
4. Staging returns an inverse action without committing state.
5. Commit appears only after the human clicks **Approve 271 inventory holds**.
6. Undo appears only after a successful commit.

This gives the agent stable IDs, schemas, trust annotations, safe limits, idempotency keys, and an explicit approval boundary. The user sees each call materialize as a node, edge, evidence card, or action receipt; the developer drawer makes the changing tool lifecycle inspectable.

## Product flow

- Search any seeded lot, batch, unit, warehouse, shipment, or order ID.
- Expand the lineage manually or run the guided trace.
- Inspect inclusion provenance and corrected evidence versions.
- Compare broad, evidence-based, and ultra-narrow scopes.
- Preview the 18-order customer-notice list; notices can never be sent.
- Stage 271 warehouse holds and review the exact action set.
- Approve, commit, inspect the audit receipt, and undo all prior states.

The hero scenario is fully local and deterministic. It requires no live ERP, warehouse, or messaging system.

## Live Gemini agent and WebMCP execution

An OpenAI API key is not required. When `GEMINI_API_KEY` is configured, RecallRadar calls Gemini from a server-only route using Google's Interactions API and function calling. Gemini chooses one tool from the tools currently valid for the visible evidence state; the browser then executes the same callback registered through `document.modelContext`.

The model is the planner, not the authority:

- The server offers only the tools allowed by the current lifecycle step.
- RecallRadar binds tool arguments to visible stable IDs and the current graph version.
- Supplier notes and tool output are explicitly treated as untrusted inert data.
- Gemini pauses after staging so a human must click **Approve 271 inventory holds**.
- The commit tool is unavailable until that click creates a stage-bound approval token.
- Customer notices remain preview-only, and undo remains a separate explicit action.

Without a Gemini key, **Run guided trace** uses the deterministic fallback through the same store actions. This preserves the brief's no-live-services demo requirement and provides a reliable judging fallback.

To enable Gemini locally, copy `.env.example` to `.env.local`, add a key created in [Google AI Studio](https://aistudio.google.com/app/apikey), and restart the app. `GEMINI_MODEL` is configurable; the default is `gemini-3.7-flash`. Never expose the key through a `NEXT_PUBLIC_` variable or commit it to Git.

The Challenge rules permit authorized third-party SDKs and APIs. Gemini is therefore compatible with the submission, while the project's judged centerpiece remains the browser's dynamic WebMCP lifecycle and human-agent approval boundary.

## Polar paywall and admin access

Premium controls use Polar customer state as the entitlement source. A subscription or configured Polar feature-flag benefit unlocks the guided trace, scope simulation, and containment actions.

Admin access bypasses the paywall on the server. Configure the owner account with either `ADMIN_USER_IDS` or `ADMIN_EMAILS`; both accept comma-separated values. In local development, RecallRadar starts as the seeded `Hector Ta · Admin` account so the entire paid workflow is immediately demonstrable.

To connect Polar:

1. Create a recurring Polar product and a `recallradar_pro` feature-flag benefit.
2. Copy `.env.example` to `.env.local`.
3. Add the Polar organization token, product UUID, benefit UUID, and deployed app origin.
4. Put your ChatGPT account email or user ID in the admin allowlist.
5. Use `POLAR_SERVER=sandbox` while testing and `production` for live checkout.

Checkout sessions are created server-side with the signed-in ChatGPT user ID as Polar's external customer ID. Secrets and admin decisions never reach the client bundle.

## Quick start

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Verification commands:

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

## Project structure

```text
RecallRadar/
├── app/
│   ├── api/agent/turn/route.ts       # Server-only Gemini Interactions tool planner
│   ├── api/billing/checkout/route.ts  # Polar checkout session endpoint
│   ├── chatgpt-auth.ts                # Sites/ChatGPT identity helpers
│   ├── globals.css                    # Apple-style design system and responsive UI
│   ├── layout.tsx                     # Metadata and document shell
│   └── page.tsx                       # Server entitlement boundary
├── components/
│   ├── recall-radar-app.tsx           # Investigation UI and all human controls
│   └── ui/                            # shadcn interface primitives
├── evals/
│   └── intents.json                   # 14 acceptance/evaluation intents
├── hooks/
│   └── use-webmcp.ts                  # Evidence-scoped WebMCP registration lifecycle
├── lib/
│   ├── billing.ts                     # Polar customer-state and admin entitlements
│   ├── domain.ts                      # Seed data, lineage, scope, hold, audit, inverse logic
│   ├── store.ts                       # Investigation state machine and tool-call log
│   ├── tool-catalog.ts                # Shared WebMCP/Gemini contracts and safe input binding
│   └── utils.ts                       # Shared class helpers
├── tests/
│   ├── agent-tools.test.ts             # Agent argument and contract safety tests
│   ├── domain.test.ts                 # 14 deterministic unit/intent tests
│   └── e2e/hero.spec.ts               # Hero, correction, untrusted-note, and undo flows
├── types/webmcp.d.ts                  # Current WebMCP draft type declarations
├── .openai/hosting.json               # OpenAI Sites deployment configuration
├── .env.example                       # Polar and admin configuration template
├── playwright.config.ts
├── vitest.config.ts
└── prompt.md                          # Original product brief, preserved unchanged
```

## Domain invariants

- `CAP-77D` is never included in the failed-lot trace.
- Latest effective evidence wins; `ASM-1051` resolves to version 3.
- Raw arrays are capped at 500 IDs and IDs are schema-validated.
- Scope mutations reject stale graph versions.
- Holds require idempotency keys and cannot commit without visible approval.
- Notice generation is permanently preview-only.
- Every commit carries an inverse action; undo restores all 271 prior states.

## WebMCP lifecycle

The app uses the current imperative WebMCP draft API on `document.modelContext`. Registrations are rebuilt with `AbortSignal` cleanup whenever the evidence step changes. Browsers without native WebMCP retain the same deterministic UI and expose a preview registry for the developer drawer.

| Evidence state | Newly available tool |
| --- | --- |
| Lot selected | `expand_lot_to_batches` |
| Batches loaded | `expand_batch_to_units` |
| Units loaded | `locate_finished_units` |
| Locations resolved | `get_evidence_versions` |
| Evidence resolved | `compare_containment_scopes` |
| Scopes compared | `preview_containment_scope` |
| Scope previewed | `stage_inventory_holds`, `preview_customer_notices` |
| Stage approved | `commit_inventory_holds` |
| Commit complete | `undo_inventory_holds` |

## Security and privacy

- Supplier and customer-entered text is labeled untrusted and never interpreted as executable instructions.
- Only synthetic order IDs and region totals are used; no customer personal data exists in the seed.
- Polar tokens remain server-side.
- Admin bypass is enforced from authenticated request headers and environment allowlists.
- The simulator has no arbitrary graph query or executable filter surface.

## License

Hackathon prototype. Add the license appropriate for your final repository before public distribution.
