# AI Model Specifications

This document describes candidates, not trained or deployed models. The repository currently has no Python environment, ML dependency, model artifact, training command, or ML evaluation suite. Do not report any model as trained until its artifact, data window, evaluation report, and version are present.

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
