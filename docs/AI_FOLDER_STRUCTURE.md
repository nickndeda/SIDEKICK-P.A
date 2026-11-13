# AI Folder Structure

This is a proposed incremental structure that extends the current repository without replacing its feature modules or database patterns. Add directories only as milestones need them.

```text
src/main/
  core/
    assistant-engine.ts                 # lifecycle and current orchestration entry
    assistant/
      orchestrator.ts                   # bounded stage coordination
      contracts.ts                      # validated internal contracts
      context-engine.ts                 # domain context composition
      decision-engine.ts                # relevance/confidence/suppression
      recommendation-engine.ts          # recommendation shaping
      feedback-service.ts               # explicit feedback only
      permission-policy.ts               # risk classes and authorization
      action-registry.ts                 # typed allowlisted services
      model-manager.ts                   # configured/available model health
      providers/ollama-provider.ts       # loopback-only local inference adapter
      tools/read-tools.ts                # allowlisted read-only feature tools
      tools/planner-actions.ts           # reversible, approved actions
      memory/memory-service.ts           # explicit memory lifecycle/retrieval
      learning/feature-extractors.ts     # versioned feature schemas
      learning/training-coordinator.ts   # eligibility/evaluation/promotion gates
      learning/inference-service.ts      # model invocation and provenance
  repositories/
    assistant-repository.ts             # activity and preferences
    assistant-conversation-repository.ts # existing chat/memory persistence
    assistant-intelligence-repository.ts # proposals, feedback, model metadata
  database/migrations/                  # sequential migrations, target DB adapter
  ipc/assistant-handlers.ts              # trusted sender and schema validation
src/preload/index.ts                     # narrow typed API surface
src/shared/types/assistant.ts            # renderer-safe contracts only
src/renderer/src/pages/AssistantPage.tsx # chat, activity, proposal/feedback UI
ai/
  README.md                              # Python setup, offline install and limits
  requirements-ml.txt                   # added only after dependency approval
  sidekick_ml/
    data/                                # generated local snapshots; never commit
    features/                            # versioned transformations
    train/                               # reproducible training commands
    evaluate/                            # chronological metrics and reports
    inference/                           # short-lived JSON request/response worker
  tests/                                 # Python unit/evaluation tests
docs/
  AI_SYSTEM_ARCHITECTURE.md
  AI_MODEL_SPECIFICATIONS.md
  AI_DATA_ARCHITECTURE.md
  AI_LEARNING_STRATEGY.md
  AI_SECURITY_AND_PRIVACY.md
  AI_IMPLEMENTATION_ROADMAP.md
  AI_FOLDER_STRUCTURE.md
tests/
  main/assistant/                        # unit and integration tests
  renderer/assistant/                    # UI behavior tests
```

## Placement decisions

- Keep feature data access inside existing feature repositories/services; the intelligence layer must not issue cross-module SQL directly.
- Keep shared contracts independent of main-process repositories so renderer declarations never import implementation files.
- Reuse the existing scheduler and event bus. Do not create a separate daemon for the Python component.
- Treat `ai/sidekick_ml/data/` and model artifacts as runtime user data, not repository content. A development artifact directory must be ignored by Git.
- Use `assistant-intelligence-repository.ts` only when proposal/feedback/model tables are implemented; do not add empty framework code ahead of its milestone.
- The current repository has no `ai/`, test runner, or Python dependency configured. Those folders and dependencies are future work, not current capabilities.
