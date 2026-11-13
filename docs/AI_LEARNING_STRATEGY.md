# AI Learning Strategy

## Principles

Learning is controlled, explainable, and opt-in. Rules provide useful behavior without training data. Only explicit user feedback is a reliable label; a dismissed notification may mean bad timing, not dislike, and an ignored notification means nothing by itself. The system must not silently convert inferred behavior into a permanent personal memory.

## Learning stages

1. **Explicit preferences:** user-set quiet hours, preferred focus length, priorities, and directly authored memories. These are configuration, not model training.
2. **Transparent aggregates:** after sufficient real activity, show counts and recurring windows with their evidence period. Allow correction and reset.
3. **Narrow predictive models:** enable one candidate at a time only after its data gate in `AI_MODEL_SPECIFICATIONS.md` is met, evaluation beats a simple baseline, and the user opts in.
4. **Controlled updates:** schedule a monthly or threshold-triggered candidate run. Do not retrain per event.

## Feedback records

Capture explicit actions: accepted, dismissed with optional reason, corrected, snoozed, completed, or a 1–5 usefulness rating. Preserve the recommendation version, shown time, chosen action, and user-entered reason. Keep the signal distinct from passive telemetry. Provide “undo/correct” for mistaken feedback and a screen to inspect/reset learned preferences.

## Training and evaluation

- Use chronological train/validation/test splits; never randomly mix future records into the past.
- Evaluate against a simple rule or frequency baseline and store the sample count, source window, feature schema, metrics, and failure reason.
- Enforce per-model minimum sample count and class balance; refuse to train when the gate fails.
- Include calibration metrics for probabilities. A high accuracy score alone is insufficient for an imbalanced personal dataset.
- Run candidate and current model side by side on held-out data. Promote only when the candidate improves predefined metrics without exceeding a false-alert ceiling.
- Keep the last known good artifact and permit rollback. Track artifact hash and exact library version.
- Monitor drift using rolling calibration and explicit correction rates. Disable a model when quality degrades; fall back to rules.

## Continuous-learning boundaries

The first release should have **no automatic model retraining**. It may learn direct settings and memory because the user explicitly chooses them. Future scheduled training runs only when learning is enabled, the app is idle or on explicit request, the device is on an appropriate power state if available, and data thresholds are met. Training is cancellable and should not compete with focus sessions.

## User control

Provide per-feature learning switches, a data period explanation, last-trained model/version and evaluation summary, export, reset learned preferences, delete model artifacts, and revert to rules-only mode. Deleting or disabling training must not delete the underlying Planner/Finance/Learning records unless the user separately requests that feature deletion.
