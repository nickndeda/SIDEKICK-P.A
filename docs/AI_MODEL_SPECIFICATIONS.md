# AI Model Specifications

This document describes candidates, not trained or deployed models. The repository currently has no Python environment, ML dependency, model artifact, training command, or ML evaluation suite. Do not report any model as trained until its artifact, data window, evaluation report, and version are present.

## Concrete Sidekick model: Personal Task Delay Risk

Rather than train one vague “assistant model” across unrelated data, the first personalized model should answer one useful, measurable question: **when a task is created, how likely is it to be completed after its due date?** The model can help Sidekick prioritize a daily plan, while the existing rule engine remains the source of deterministic deadline alerts. This is the recommended first model for this project.

### Fit to the actual schema

Verified fields come from `001_create_tasks.ts`: `created_at`, `due_at`, `completed_at`, `priority`, and `status`. Task titles and descriptions are present, but the first model deliberately excludes their text. Migration `004_link_productivity_sessions_to_tasks.ts` adds `productivity_sessions.task_id`; those sessions contain `session_type`, `status`, `target_minutes`, `started_at`, `ended_at`, and `elapsed_seconds`. Learning revisions and quiz attempts have explicit due/review dates, grades, and scores, but they should remain separate signals for the first task model rather than be mixed into its label.

The project exposes schema and service code, not the user's actual history values. Therefore actual sample counts, personal completion patterns, class balance, and achieved accuracy are unknown. The system must inspect those locally before deciding whether a trained personalized model is possible.

### Contract

Input is an as-of-creation snapshot for one task. Output is:

```ts
interface TaskDelayEstimate {
  taskId: string;
  probabilityLate: number | null;
  band: 'low' | 'elevated' | 'high' | 'unknown';
  evidence: string[];
  sampleCount: number;
  modelVersion: string | null;
  method: 'rules' | 'personal_baseline' | 'logistic_regression';
  generatedAt: Date;
}
```

`probabilityLate` is absent (`null`) when evidence is insufficient. This is a planning estimate, not a fact about the user or a judgment about effort. The output is an input to recommendation ranking, not permission to change the task or send an unbounded notification.

### Features and label

| Feature | Derived from | Safeguard |
|---|---|---|
| Priority | `tasks.priority` | Treat as an ordinal/category, not proof of effort. |
| Lead time | `created_at` and `due_at` | Compute non-negative hours/days at the snapshot; no future dates beyond the task's due date are features. |
| Due weekday and local-time bucket | `due_at` | Use local calendar/timezone consistently; do not retain precise time where a coarse bucket suffices. |
| Creation weekday and time bucket | `created_at` | Derive in user's local timezone. |
| Prior personal late-completion rate | Earlier tasks only, using `completed_at > due_at` | Compute as-of task creation; include numerator and denominator; smooth and suppress when sparse. |
| Prior completed task count | Earlier `completed_at` values | Strictly exclude the target task and all records completed after prediction time. |
| Prior focus consistency | Productivity sessions linked by `task_id`, ending before task creation | Optional only if enough records exist; do not treat focus duration as proof of productivity. |

**Label:** for tasks with a due date and a known terminal completion timestamp, `late = completed_at > due_at`; on-time is `completed_at <= due_at`. Exclude cancelled tasks, tasks without due dates, and tasks that are still open from supervised training. Do not label an overdue open task as a completed outcome. This avoids treating censored/incomplete records as known positives. The current task table stores only the latest values, so historical priority/due-date edits cannot be reconstructed; the initial model must not claim to learn from edit history.

Do not use task title/description, post-completion fields, future focus sessions, quiz answers, financial records, or health/wellness records as features. Keep model features local and short-lived. Feature extraction must record the prediction timestamp and source window.

### Algorithm progression

1. **Cold start (always available):** rules rank explicit urgency from priority and time-to-deadline. Call the result a rule-based urgency score, not a learned probability.
2. **Sparse history:** a Beta-Binomial personal late-rate baseline with a broad prior can describe the user's overall past rate only when there are enough completed, due-dated tasks. It must show the denominator and a wide uncertainty interval. Do not make task-specific claims from this baseline.
3. **Personalized model:** after a minimum of 200 eligible closed tasks, at least 40 late and 40 on-time examples, and a chronological holdout of at least 40 tasks, evaluate an L2-regularized logistic regression with the limited features above. If there is no sufficient class balance or chronological test set, remain in the prior stage. No cross-user pooling is planned; it would conflict with local-only user data unless separately consented and designed.

These are conservative initial gates for a small personal dataset, to be revisited only from observed evaluation results. A typical individual may never meet the supervised gate; rules and transparent aggregates remain useful in that case.

### Training, evaluation and deployment

- Create examples only from the user's real local task history; no synthetic training rows.
- Split chronologically and calculate historical aggregate features using only records completed before each example's creation time. Ensure a task cannot contribute to its own feature values.
- Compare against a base-rate predictor and the existing rule score. Evaluate Brier score, five-bin expected calibration error (ECE), precision/recall at the chosen alert threshold, and false high-risk alerts per week.
- Require at least a 5% Brier improvement over baseline and ECE ≤ 0.15 on the chronological holdout before displaying probability bands. If either gate fails, publish `unknown` and keep rules.
- Record sample count, source window, feature schema version, training timestamp, algorithm/library version, artifact checksum, metrics, and approval state. Keep the previous good version for rollback.
- Use a small CPU logistic model. Inference should be an in-process calculation or short-lived Python worker only if implementation requires it; no permanent Python daemon.
- Train no more than monthly or after a substantial new-data threshold, only when learning is enabled. Never train after every task event.

### Boundaries and user experience

Sidekick may use a high-confidence estimate to suggest “start this today because similar tasks have often run past their due date,” while showing the evidence and sample count. It must not change priority/due date, mark work as procrastination, or notify repeatedly without the existing policy gate. User feedback is explicit and separate from whether a task was late. A late task is not necessarily a bad recommendation, and an ignored recommendation is not negative feedback.

The LLM has a different job: understand a question, retrieve relevant Sidekick records, explain the prediction, and create a typed proposal. It does not train this model, alter its label, or bypass action permission checks. Personalized ML and conversational reasoning remain independently optional.

## Candidate model register

| Candidate | Goal and output | Inputs | Candidate method | Minimum data gate | Evaluation |
|---|---|---|---|---|---|
| Task delay risk | Estimate probability a task will be completed after due time; output calibrated probability plus horizon. | User-entered task priority, lead time, task category if supplied, due weekday/time, prior explicit completion/delay history. Exclude descriptions and inferred sensitive content. | Start with regularized logistic regression; compare a shallow decision tree only if it improves calibration. | At least 200 completed tasks and at least 40 delayed and 40 on-time examples for the user; otherwise use rules and label unavailable. | Time-based holdout, Brier score, calibration curve, precision/recall at an actionable threshold, false-alert rate. Compare against base-rate baseline. |
| Revision recommendation | Rank topics for review; output topic IDs, expected benefit proxy, confidence, and evidence. | Quiz correctness/attempts, explicit revision dates, elapsed days, user-set difficulty, study time. | Initially a deterministic spaced-repetition schedule; later compare logistic regression for likelihood of recall if outcomes support it. | At least 50 scored attempts across 10 topics with repeat observations; otherwise use the existing revision scheduler. | Time-split recall prediction Brier score; top-k useful revision rate; user correction/skip rate. |
| Notification timing | Recommend a time window, not an unattended schedule change. | Explicit delivered/snoozed/dismissed/completed outcomes, local time/day, category, quiet hours. Do not treat no click as rejection. | Baseline by category and time bucket; logistic regression only after enough explicit outcomes. | At least 100 explicit outcomes per category across 14+ days; require sufficient observations in competing time buckets. | Acceptance/completion rate versus fixed-time baseline, calibration, notifications per day, and opt-out rate. |
| Habit pattern detector | Describe repeated user-recorded routines; output candidate pattern, frequency, evidence window, confidence. | Explicitly recorded focus sessions, revisions, task completion, routine logs; no keystrokes or covert activity. | Deterministic aggregation first; clustering is unnecessary until user-facing groups are demonstrably useful. | At least 4 weeks and 20+ relevant records per pattern family. | Pattern stability across rolling windows, user-confirmed accuracy, false discovery rate. |
| Productivity period predictor | Suggest a likely preferred focus window. | Start/end times and completion of explicitly started focus sessions, local day/time, user feedback. No application names unless separately opted into. | Per-user smoothed time-of-week histograms first; logistic regression only if useful. | At least 30 completed sessions across 3+ weeks, plus explicit feedback for recommendation quality. | Held-out next-session top-2 window accuracy, calibration, user acceptance; compare to frequency baseline. |
| Unusual expense detector | Flag an unusual manually entered expense for review, never label fraud or financial risk. | User-entered transaction amount/category/date and personal historical distribution. | Robust median/MAD or a simple per-category quantile baseline; do not begin with Isolation Forest. | At least 30 transactions in that category across 90 days; sufficient history and same-currency values. | Precision of user-confirmed unusual flags, false positive rate, and comparison to simple quantiles. No spend prediction claim. |

## Candidates not recommended for initial implementation

- **Random Forest:** too data-hungry and harder to explain for sparse per-user history; evaluate only if simpler baselines underperform.
- **Isolation Forest:** not justified for sparse, changing personal finance records; robust category baselines are more explainable.
- **Univariate time-series forecasting:** recurring bills are already explicitly scheduled; forecasting user-entered finance history is not useful until there is adequate, stable history and a user-approved use case.
- **Activity classifier:** no opt-in application usage labels or ground truth exist. Do not infer “productive” from an application name. This model is excluded until a transparent labeling/consent design exists.

## Training and deployment policy

1. Generate training examples from real local records only, with user consent and clear date boundaries.
2. Split chronologically, not randomly, to prevent future-data leakage. Keep the latest period as a holdout.
3. Record feature schema, source window, algorithm/library version, training timestamp, evaluation metrics, and artifact checksum.
4. Require a minimum-data gate and baseline comparison before training. Insufficient data returns a typed status rather than synthetic examples.
5. Load a candidate beside the current model, evaluate it on the holdout, and promote only if it meets predeclared quality and safety thresholds. Preserve the prior model for rollback.
6. Inference returns prediction, confidence/calibration metadata, model version, evidence window, and limitations. The UI calls it a prediction, never a fact.
7. Retrain on a monthly schedule or when enough new labeled observations arrive; never on every event. User can disable learning, delete training records, or reset learned preferences.

## Runtime fit

For the i5-6300U/8 GB target, prefer small scikit-learn CPU models and precomputed features. Training should be an explicit, short-lived worker process, not a permanently running Python service. Do not install pandas/scikit-learn until a candidate has a validated data gate and a reproducible offline evaluation script. Keep model artifacts local under the app's user-data directory with restrictive OS permissions.
