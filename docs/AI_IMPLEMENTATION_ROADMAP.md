# AI Implementation Roadmap

This roadmap is the proposed implementation sequence for the intelligence section. It is not a claim that later milestones are complete. Existing code is preserved unless a milestone identifies a necessary migration.

## Phase 0 — Architecture (current deliverable)

**Deliverables:** seven AI architecture documents, current-state assessment, decisions and risks.

**Acceptance:** docs match source; distinguish verified facts from proposed work; no unreviewed implementation changes.

## Phase 1 — Contracts and observability

Define shared observation, prediction, recommendation, feedback, action proposal, and model status types. Add correlation IDs, source evidence, confidence semantics, expiry, and deduplication. Update README status. Add deterministic unit tests for orchestrator boundaries and degraded context.

**Acceptance:** each output is labeled; missing context is not zero; event bursts coalesce; no new behavior requires a model.

## Phase 2 — Read-only retrieval and conversational context

Build allowlisted read tools around feature services; provide domain source toggles; add context budget/redaction; add conversation retention/export/delete; add local model health/status, cancellation, size limits, and tests. Do not allow mutating tools yet.

**Acceptance:** read tools cannot mutate state; sources and timestamps are shown; unavailable Ollama degrades safely; prompt injection cannot create an action.

## Phase 3 — Proposals, approval and feedback

Implement typed pending action proposal storage, risk classification, approval hash/expiry, audit records, UI approval cards, and feedback capture. Start with reversible task creation and study-session/revision scheduling through existing services. Keep deletion/finance/external action out of scope.

**Acceptance:** no side effect occurs before approval; changed/expired proposals are rejected; duplicate approvals are idempotent; successful execution is reported with source record ID; rejection is not treated as failure feedback unless the user says why.

## Phase 4 — Proactive reasoning

Add an opt-in, bounded background local-model pass, triggered by meaningful events and a low-frequency shared-scheduler cadence. Require relevant context, quiet-hour/notification policy, confidence/relevance thresholds, rate limits, and dedupe. Rules continue independently. Provide “why this” evidence in activity center.

**Acceptance:** model outages never break reminders; no duplicate/burst notices; only allowlisted action types can be proposed; context sources and degraded modules are surfaced.

## Phase 5 — Data and platform readiness

Resolve MySQL-to-SQLite migration strategy, repository abstraction, backup/export, retention, permissions, and migration tests before claiming SQLite production support. Add a local AI data pipeline and version metadata only for approved candidates.

**Acceptance:** clean install, upgrade, rollback, export/reset, offline startup, and database failure recovery are demonstrated on Windows.

## Phase 6 — First statistical model

Choose exactly one candidate (recommended: task-delay risk only after sufficient task history). Implement data eligibility report, chronological evaluation, baseline comparison, artifact versioning, rollback, and an optional short-lived Python worker only if TS implementation is not adequate.

**Acceptance:** no fabricated examples; insufficient-data state; model passes predeclared calibration/false-alert targets; rules-only fallback; user can disable and delete artifact.

## Phase 7 — Measured expansion

Evaluate notification timing, revision recommendations, and habit patterns one at a time against real user value and hardware targets. Add voice/connectors only after separate privacy and consent design. Orb is a UI shell and must not be marketed as autonomy by itself.

## Validation gates

- TypeScript main and renderer checks plus production build.
- Unit tests for schemas, confidence policies, temporal boundaries, event dedupe, approval and failure handling.
- Repository integration tests using isolated temporary database state.
- Model evaluation report and baseline comparison for every trained model.
- Manual Windows tests for offline mode, tray/background work, notifications, model unavailable, and high-load behavior.
- Measure background CPU/memory and inference latency on target class hardware before enabling always-on behavior.

## Current implementation status — 2026-11-13

- **Architecture documents:** completed in Phase 0.
- **Existing foundation:** deterministic cross-module monitor, activity history, tray/background runtime, local notification policy, conversation and explicit memory persistence.
- **Structured conversation actions:** implemented for explicit Planner task creation only. Output is schema-validated, stored as a 15-minute proposal, and executed with the proposal transition in one transaction after approval. Integration tests cover explicit intent, rejection, approval, and repeat-approval protection.
- **Feedback:** helpful/not-helpful feedback is stored for assistant messages.
- **Proactive reasoning:** opt-in, local-only, at most one attempt each hour and one finding each local day. It cites allowlisted Planner/Learning evidence and can only create an assistant activity. Requires a configured model server.
- **Personal model:** task-delay logistic regression with minimum-data, chronological-holdout, and baseline-improvement gates; versioned artifact and user opt-in/delete controls. Unit fixtures validate training logic, but no real personal model is trained unless the user has sufficient completed tasks and enables training.
- **Integration verification:** MySQL migrations 013–019 applied; migration 019 adds SHA-256 integrity metadata for stored model artifacts. Database-backed proposal/feedback/background-reasoning smoke tests and model unit tests pass. `npm test`, `npm run test:integration`, and `git diff --check` pass.
- **Not complete:** no Ollama runtime is installed, so real inference/quality/background notification behavior is not verified. SQLite production storage, source-level model consent controls, full data export/retention, wider action catalog, Python training tooling, voice/connectors/orb, Windows installer, and actual target-hardware performance testing remain future work. Do not call this autonomous AI yet.
