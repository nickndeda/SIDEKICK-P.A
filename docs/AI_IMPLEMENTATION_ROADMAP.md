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

## Current implementation status — 2026-11-14

- **Architecture documents:** completed in Phase 0.
- **M1 foundation:** provider calls are isolated behind `LocalInferenceProvider`; model health verifies the configured model; multi-turn continuity, exact task intent, validation failures, and deadlines have regression coverage. Across two smoke runs on the i5-6300U/7.9-GiB development PC, `llama3.2:1b` measured 24.2–34.0s cold, 7.2–8.2s warm follow-up, and 11.3–12.2s for a task proposal; Ollama reported 1.52GB loaded model size. Only this one installed model was compared.
- **M2 context and memory:** migration 020 stores per-domain source choices. Chat selects enabled relevant modules before retrieval; modules outside scope are not queried. Memories are relevance-ranked and user-managed. Conversations plus memories can be exported using a native save dialog and deleted from the UI.
- **Existing foundation:** deterministic cross-module monitor, activity history, tray/background runtime, local notification policy, conversation and explicit memory persistence.
- **Structured conversation actions:** implemented for explicit Planner task creation only. Output is schema-validated, stored as a 15-minute proposal, and executed with the proposal transition in one transaction after approval. Integration tests cover explicit intent, rejection, approval, and repeat-approval protection.
- **Feedback:** helpful/not-helpful feedback is stored for assistant messages.
- **Proactive reasoning:** opt-in, local-only, at most one attempt each hour and one finding each local day. It cites allowlisted Planner/Learning evidence and can only create an assistant activity. Requires a configured model server.
- **Live proactive check:** a real Planner event triggered `llama3.2:1b`, whose constrained response created an evidence-linked activity. Temporary task/activity and scheduler timestamp were cleaned up after verification. The native Electron notification presentation and hidden-window app lifecycle still need an end-to-end UI run.
- **Decision audit:** migration 021 records attempted reasoning outcomes (no evidence, no action, recommendation, deduped, stale, failed) with trigger, evidence count, activity linkage, and coarse error code. Recent outcomes appear on the Assistant page and are included in its export.
- **Real local inference:** Ollama `/api/tags` and both `/api/chat` and `/api/generate` structured-output endpoints responded successfully for `llama3.2:1b`. Sidekick's configured `/api/chat` path completed a real response; an explicit task request produced a pending proposal, and approval created the task. Temporary chat/task verification data was removed. The repeatable `npm run test:ollama` covers real chat, no-action behavior, approval, and no-invented-deadline handling. This does not measure response quality across varied prompts.
- **Personal model:** task-delay logistic regression with minimum-data, chronological-holdout, and baseline-improvement gates; versioned artifact and user opt-in/delete controls. Unit fixtures validate training logic, but no real personal model is trained unless the user has sufficient completed tasks and enables training.
- **Integration verification:** MySQL migrations 001–021 applied. `npm test`, `npm run test:integration`, `npm run test:ollama`, and `git diff --check` pass. Real chat, multi-turn context, explicit task approval, and a Planner-event recommendation with a persisted audit decision passed on the development PC.
- **Not complete:** packaged Electron notification/hidden-window acceptance, SQLite production storage, full module-wide export/retention/backups, wider permissioned action catalog, Python training tooling, voice/connectors/orb, Windows installer, and long-duration resource tests remain future work. No personal task-delay model has been trained from real history. Do not call this autonomous AI yet.
