# Assistant foundation

This implementation is a local assistant foundation with deterministic background monitoring and optional local-model chat. It is not yet the completed autonomous AI assistant.

## Runtime

- `assistant-engine.ts` runs in Electron's main process and remains active while the window is hidden in the tray.
- It uses the existing single background scheduler for periodic checks and a typed event bus for task, productivity, and learning changes.
- `context-manager.ts` gathers small summaries from Planner, Productivity, Wellness, Finance, and Learning independently. A failed source is reported as degraded without discarding other sources.
- `rule-engine.ts` contains explainable deadline and revision rules. It creates daily priority summaries and urgent findings; it does not use a language model.
- `assistant-repository.ts` stores monitoring preference and deduplicated activity locally. The unique event key prevents repeat findings across scheduler ticks and restarts.
- `assistant-conversation-service.ts` stores conversations and user-authored memories, gathers live module summaries for chat, and can call a configured Ollama-compatible `/api/chat` endpoint. Requests are limited to loopback hosts, redirects are rejected, and calls time out. A model outage is saved and shown as an unavailable response; it is not represented as successful AI output.
- Memory is opt-in globally and per entry. Conversations are persisted locally. Chat receives a bounded recent history and summaries from available Sidekick modules.
- `action-registry.ts` permits only local activity recording and native notifications. It has no arbitrary command, file, payment, or external messaging action.
- Notifications respect the existing Wellness global reminder switch and quiet hours. A single urgent notification is selected per cycle; other findings remain in the activity center.

## Deliberate limits

Natural-language tool calling and permissioned task-changing actions are not implemented; chat is advice-only and does not claim to change records. The assistant does not autonomously invoke the model in the background: proactive notices still come from the deterministic rule engine. Configurable automation, approval workflows, connectors, voice, and a floating orb remain later milestones. The top-bar runtime indicator is a status surface, not an orb. Do not describe this as autonomous AI until the system can independently understand context, reason, take permitted actions, and report useful outcomes while the user is away.

Migration `011_assistant_conversations` adds model preferences, conversation/message storage, and user-managed memory. It is registered after migration 010.
