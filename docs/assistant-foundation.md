# Assistant foundation

This implementation combines deterministic background monitoring with optional local-model chat, opt-in background reasoning, a narrowly allowlisted action proposal, and a gated task-risk predictor. It is still not the completed autonomous AI assistant.

## Runtime

- `assistant-engine.ts` runs in Electron's main process and remains active while the window is hidden in the tray.
- It uses the existing single background scheduler for periodic checks and a typed event bus for task, productivity, and learning changes.
- `context-manager.ts` gathers small summaries from Planner, Productivity, Wellness, Finance, and Learning independently. A failed source is reported as degraded without discarding other sources.
- `rule-engine.ts` contains explainable deadline and revision rules. It creates daily priority summaries and urgent findings; it does not use a language model.
- `assistant-repository.ts` stores monitoring preference and deduplicated activity locally. The unique event key prevents repeat findings across scheduler ticks and restarts.
- `assistant-conversation-service.ts` stores conversations and user-authored memories, gathers live module summaries for chat, and can call a configured Ollama-compatible `/api/chat` endpoint. Requests are limited to loopback hosts, redirects are rejected, and calls time out. A model outage is saved and shown as an unavailable response; it is not represented as successful AI output.
- Memory is opt-in globally and per entry. Conversations are persisted locally. Chat receives a bounded recent history and summaries from available Sidekick modules.
- Chat uses Ollama structured JSON responses. Model output is validated in the main process; only a clearly requested `task.create` proposal is eligible for approval. The task and proposal status are written in one database transaction. Repeated approval is rejected.
- `assistant-intelligence-repository.ts` stores explicit helpful/not-helpful feedback and action proposals. Task creation is the only LLM-originated mutation; there is no arbitrary command, file, payment, or external messaging action.
- Background local-model reasoning is opt-in, limited to one attempt per hour, uses only due Planner/Learning summaries, validates evidence IDs against the source snapshot, and creates at most one activity per local day. It is cancellable when disabled and cannot mutate a feature record.
- `task-delay-model.ts` trains a small regularized logistic model only from completed tasks with due dates. It requires 200 examples, 40 per class, a 40-item chronological holdout, and at least a 5% Brier improvement against the training base-rate baseline. Insufficient data leaves predictions unknown. Saved models are versioned and user-deletable.
- Notifications respect the existing Wellness global reminder switch and quiet hours. A single urgent notification is selected per cycle; other findings remain in the activity center.

## Deliberate limits

The local model runtime is optional and was not installed for development verification. Background reasoning and inference have not been live-tested with a real model. Chat task proposals require explicit user approval; there are no silently executed LLM actions. The saved personal model has not been trained on actual task history. Configurable automation, connectors, voice, and a floating orb remain later milestones. Do not describe this as autonomous AI until end-to-end behavior is verified with a real local model and the assistant can safely report outcomes while the user is away.

Migrations 011–018 add conversations, explicit memories with expiry, proposals/feedback, the task model registry, and low-frequency background reasoning settings.
