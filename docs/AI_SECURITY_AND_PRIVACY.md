# AI Security and Privacy

## Verified security baseline

`src/main/main.ts` uses Electron context isolation and disables renderer Node integration. Assistant IPC handlers verify the sender belongs to an application window and that requests came from the main frame. Preload exposes a typed `sidekick` API. Repositories use parameterized SQL. The optional local model service restricts URLs to loopback, rejects redirects, and applies request timeouts. The LLM has no tools today. This is a baseline, not a complete threat model.

## Trust boundaries

```text
Untrusted renderer input -> validated IPC -> main-process service
Local database -> bounded context serializer -> optional loopback model
Untrusted model output -> strict schema parser -> permission policy -> existing service
```

Treat user text, retrieved records, memories, and model output as untrusted. Prompt injection within a task description or memory must not expand tool permissions. Do not expose repositories or `ipcRenderer` directly. Use sender validation, allowlisted channel names, exact payload schemas, bounded payload sizes, and service-level validation even if the UI already validates.

## Action categories and authorization

| Class | Examples | Policy |
|---|---|---|
| Informational | Read a task list, summarize today, retrieve revision history | May run after a user request or under a documented background rule; minimize returned fields. |
| Reversible | Create a draft task, add a focus-session label, change a reminder time | Require a clear user-confirmed request or a pending proposal approval. Record before/after and provide undo when supported. |
| Sensitive | Delete records, alter financial entries, pay/transfer money, send external messages, access files or OS commands | Not available to the LLM in the initial release. Require explicit user initiation and confirmation in the owning feature; external actions require separate consent. |

Never expose shell, arbitrary SQL, filesystem traversal, browser automation, arbitrary URLs, or generic “call any IPC” tools. Each tool has one typed schema, bounded outputs, an owner service, risk class, and tests. Approval is tied to a proposal hash and expiry; stale or altered proposals must be rejected. Approval is not execution until the owning service succeeds; report actual results.

## Local model and sensitive data

Keep the LLM optional. The current adapter targets a local Ollama-compatible endpoint and does not intentionally contact a cloud API. Before sending a prompt, build a small purpose-specific context and redact identifiers or content not needed. Do not include account credentials, secrets, full transaction descriptions, or whole conversation history. Show which data categories are included and allow disabling Finance/Wellness/other sources independently. No model output should be treated as verified fact.

Loopback binding reduces network exposure but is not authentication. Validate model URL on every use; reject redirects; cap request/response sizes; use cancellation and timeouts; and avoid logging prompt contents. Do not auto-install or download model weights without explicit user choice. Model files and Python artifacts must live in the user-data directory and be deletable.

## Privacy controls and data rights

- Separate explicit memories from chat logs and automatic observations.
- Add per-category context consent, memory opt-in, retention duration, “delete conversation,” export, and “clear learned data” controls.
- Do not use keystroke logging, covert app surveillance, microphone capture, camera data, or inferred sleep/health state.
- Activity monitoring must be opt-in, narrowly scoped, visible, pausable, and documented before it is added.
- Do not send local records to remote services unless the user explicitly enables that provider and reviews the data categories.
- Audit approvals and outcomes without recording unnecessary sensitive content.
- Apply database least privilege, protect `.env`, avoid exposing secrets in logs, and do not store model-provider secrets in renderer state.

## Performance and abuse controls

Bound context tokens, history, tool outputs, model calls per interval, and pending proposals. Coalesce events, deduplicate notifications, honor quiet hours, and stop on user pause. A model timeout, malformed response, unavailable database, or policy exception falls back to deterministic behavior with a visible status. Prevent recursive tool requests and cap orchestration depth.
