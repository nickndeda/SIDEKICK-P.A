# AI Data Architecture

## Current storage findings

Verified: repositories use parameterized `mysql2` queries; `src/main/database/connection.ts` points to local MySQL/MariaDB; migrations cover Planner, Productivity, Wellness, Finance, Learning, assistant activity, conversations, and explicit memories. The README describes SQLite as the future primary store. The assistant context is assembled from feature-service summaries and reports degraded modules. No separate AI event ledger, feature store, model registry, training set, or feedback table exists yet.

Do not create a second database for intelligence. Reuse domain repositories and introduce a narrow intelligence repository. The target logical schema below is portable; physical migration to SQLite is a separate prerequisite and should follow a database adapter assessment.

## Data categories and provenance

| Category | Source | AI use | Retention rule |
|---|---|---|---|
| Domain facts | Existing task, session, revision, finance, and wellness records | Context retrieval and user-requested summaries | Follow feature module controls and existing deletion behavior. |
| Observations | Deterministic rule findings with evidence IDs and capture time | Explainable alert history | Deduplicate by source/event/window; configurable history retention. |
| Predictions | Model output with feature window and version | Optional recommendations | Expire after horizon; preserve provenance and corrections. |
| Recommendations | Decision-engine proposal, rationale, confidence, expiry | UI and notification | Keep outcome separate from user feedback. |
| Explicit feedback | Accept, reject, correct, snooze, rating, reason | Preference optimization and labels | User can view/export/delete; no inference from silence. |
| Long-term memory | User explicitly adds or confirms a memory | Selective conversation context | Disabled by default; editable, deletable, resettable; optional expiry. |
| Conversations | User and assistant messages | Short-term context | Retain only as long as user chooses; conversation deletion cascades. |
| Model metadata | Version, schema, metrics, artifact checksum | Reproducibility and rollback | Keep while model is deployed or retained for rollback. |

## Target logical tables

Names are proposed logical contracts, not an immediate migration. Preserve existing feature tables and their IDs.

- `assistant_event_log`: `id`, `event_type`, `occurred_at`, `source_module`, `entity_type`, `entity_id`, `payload_version`, small validated payload, `dedupe_key`. Index `(source_module, occurred_at)` and unique `dedupe_key`. Avoid copying full notes, descriptions, or financial details into this log.
- `assistant_observations`: `id`, `kind`, `severity`, `summary`, `evidence_refs_json`, `confidence`, `observed_at`, `expires_at`, `status`, unique dedupe key.
- `assistant_recommendations`: `id`, `category`, `summary`, `rationale`, `evidence_refs_json`, `confidence`, `urgency`, `relevance`, `created_at`, `expires_at`, `status`, optional `action_proposal_id`.
- `assistant_feedback`: `id`, `recommendation_id` nullable, `subject_kind`, `subject_id`, `feedback_kind` (`accepted`, `dismissed`, `corrected`, `snoozed`, `rating`), explicit reason/value, `created_at`, `source`. Unique idempotency key prevents duplicate submission.
- `assistant_preferences`: explicit assistant settings including model/provider, data permissions, learning enabled, retention, notification timing, and permission mode. Secrets are not stored here.
- `assistant_memories`: existing user-authored memories can evolve to include `kind`, `source`, optional `expires_at`, `enabled`, timestamps, and a normalized uniqueness key. Do not add auto-generated memories without confirmation.
- `assistant_models`: `model_id`, `kind`, `version`, `feature_schema_version`, `artifact_path`, `artifact_sha256`, `trained_at`, `data_window_start/end`, `sample_count`, `metrics_json`, `state`, and prior model reference.
- `assistant_training_runs`: run state, candidate model/version, dataset window, validation summary, start/end times, failure reason. Store no duplicated raw training data.
- `assistant_action_proposals`: `id`, `action_type`, validated payload JSON, risk class, rationale, evidence references, expiry, state (`pending`, `approved`, `rejected`, `expired`, `executed`, `failed`), proposal hash, and result reference.
- `assistant_action_audit`: append-only proposal/approval/execution transition log with timestamp, actor (`assistant`, `user`), action result code, and non-sensitive correlation ID.

Conversations and messages already exist in MySQL migrations 011–012, as do explicit memories. Their current retention is indefinite until deleted; adding configurable retention and export/reset UX is still required.

## Event and feature pipeline

```text
Domain service mutation
  -> validated typed event
  -> bounded event processing / deduplication
  -> data-quality and consent gate
  -> feature extraction from repositories
  -> deterministic rules always; model training only when eligible
  -> evaluation and version gate
  -> inference result with provenance
  -> decision/recommendation
  -> user feedback or approved action outcome
```

Events should describe successful domain changes, not mirror every database row. Feature extractors use stable, versioned feature names; keep labels and feature timestamps separate. Never include post-outcome fields in features for an earlier prediction. Missing values remain missing with an explicit reason. Use local timezone-aware business dates for user-facing schedules and UTC timestamps for event ordering; convert at repository boundaries consistently.

## Data quality, deduplication, and lifecycle

- Validate IDs, enums, dates, currency, and numeric ranges in service/repository boundaries.
- Carry event ID and occurred time; coalesce repeated updates for the same entity within a short window only when semantics allow it.
- Store references to source entities instead of copies. A deleted source must not leave a misleading “current fact.”
- Purge expired operational context and recommendations by retention policy; preserve explicit records until the user deletes them.
- Do not infer a missing event means failure or non-completion.
- User export/reset must cover conversations, memories, feedback, model artifacts, and derived features, not only feature tables.
- Any future model training snapshot must be generated locally, versioned, and deleted when its source consent is revoked.
