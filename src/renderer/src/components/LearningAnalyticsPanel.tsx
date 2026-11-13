import { useEffect, useState } from 'react';
import type { LearningSubject, LearningOverview, WeakTopic } from '../../../shared/types/learning';

type Series = Awaited<ReturnType<typeof window.sidekick.learning.analytics.studyTime>>;
type Results = Awaited<ReturnType<typeof window.sidekick.learning.analytics.performance>>;

export default function LearningAnalyticsPanel({ subjects, overview }: { subjects: LearningSubject[]; overview: LearningOverview }) {
  const iso = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 6 * 86400000)));
  const [to, setTo] = useState(() => iso(new Date()));
  const [subjectId, setSubjectId] = useState('');
  const [dateRange, setDateRange] = useState<'today'|'week'|'month'|'custom'>('week');
  const [study, setStudy] = useState<Series>([]);
  const [performance, setPerformance] = useState<Results>([]);
  const [assessments, setAssessments] = useState<WeakTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (from > to) { setError('Start date must be on or before the end date.'); setLoading(false); return; }
    setLoading(true); setError('');
    const filter = { from, to, subjectId: subjectId || undefined };
    void Promise.all([
      window.sidekick.learning.analytics.studyTime(filter),
      window.sidekick.learning.analytics.performance(filter),
      window.sidekick.learning.analytics.weakTopics()
    ]).then(([studyRows, performanceRows, topicRows]) => { setStudy(studyRows); setPerformance(performanceRows); setAssessments(topicRows); })
      .catch(cause => setError(cause instanceof Error ? cause.message : 'Analytics are unavailable.'))
      .finally(() => setLoading(false));
  }, [from, to, subjectId]);

  const minutes = (seconds: number) => `${Math.floor(seconds / 60)} min`;
  const chooseRange = (value: 'today'|'week'|'month'|'custom') => {
    setDateRange(value);
    if (value === 'custom') return;
    const end = new Date();
    const start = new Date(end);
    if (value === 'today') start.setHours(0, 0, 0, 0);
    if (value === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    if (value === 'month') start.setDate(1);
    setFrom(iso(start)); setTo(iso(end));
  };
  return <>
    <div className="learning-filter learning-analytics-filters">
      <label>Range<select value={dateRange} onChange={event => chooseRange(event.target.value as 'today'|'week'|'month'|'custom')}><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="custom">Custom</option></select></label>
      <label>From<input type="date" value={from} disabled={dateRange!=='custom'} onChange={event => {setDateRange('custom');setFrom(event.target.value);}} /></label>
      <label>To<input type="date" value={to} disabled={dateRange!=='custom'} onChange={event => {setDateRange('custom');setTo(event.target.value);}} /></label>
      <label>Subject<select value={subjectId} onChange={event => setSubjectId(event.target.value)}><option value="">All subjects</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
    </div>
    {error && <p role="alert" className="learning-error">{error}</p>}
    {loading ? <p className="learning-muted">Loading analytics…</p> : <div className="learning-grid">
      <section className="learning-card"><h2>Study time by day</h2>{study.map(row => <div className="learning-row" key={row.label}><span>{row.label}</span><strong>{minutes(row.seconds)}</strong></div>)}{!study.length && <p className="learning-muted">No completed study time in this date range.</p>}</section>
      <section className="learning-card"><h2>Quiz performance</h2>{performance.map(row => <div className="learning-row" key={row.date}><span>{row.date}</span><strong>{Math.round(row.percentage)}%</strong></div>)}{!performance.length && <p className="learning-muted">No submitted quiz attempts in this date range.</p>}</section>
      <section className="learning-card"><h2>Study summary</h2><p>Today: {minutes(overview.studyTodaySeconds)}</p><p>This week: {minutes(overview.studyWeekSeconds)}</p><p>This month: {minutes(overview.studyMonthSeconds)}</p><h3>By subject this week</h3>{overview.subjectStudy.map(row => <div className="learning-row" key={row.subjectId}><span>{row.subjectName}</span><strong>{minutes(row.studySeconds)}</strong></div>)}</section>
      <section className="learning-card"><h2>Topic performance</h2>{assessments.map(topic => <div className="learning-row" key={topic.topicId}><span><strong>{topic.topicTitle}</strong><small>{topic.subjectName} · {topic.level.replace('_',' ')} · {topic.reasons.join(' ')}</small></span><b>{Math.round(topic.averageQuizPercent)}%</b></div>)}{!assessments.length && <p className="learning-muted">No topics have enough submitted attempts to assess. Topics without quizzes stay marked “Not assessed.”</p>}</section>
    </div>}
  </>;
}
