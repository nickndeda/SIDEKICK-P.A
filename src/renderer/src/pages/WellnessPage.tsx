import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  faBed,
  faCheck,
  faClock,
  faDroplet,
  faEye,
  faPersonWalking,
  faRotate,
  faSliders
} from '@fortawesome/free-solid-svg-icons';

import AppIcon from '../components/AppIcon';
import '../styles/wellness.css';

type WellnessSettings = Awaited<ReturnType<typeof window.sidekick.wellness.settings>>;
type WellnessSummary = Awaited<ReturnType<typeof window.sidekick.wellness.summary>>;
type HydrationEntry = Awaited<ReturnType<typeof window.sidekick.wellness.hydrationEntries>>[number];
type WellnessBreak = Awaited<ReturnType<typeof window.sidekick.wellness.breaks>>[number];
type SleepRecord = Awaited<ReturnType<typeof window.sidekick.wellness.sleepHistory>>[number];
type WellnessReminder = Awaited<ReturnType<typeof window.sidekick.wellness.reminders>>[number];

interface WellnessData {
  settings: WellnessSettings;
  summary: WellnessSummary;
  hydrationEntries: HydrationEntry[];
  breaks: WellnessBreak[];
  sleepHistory: SleepRecord[];
  reminders: WellnessReminder[];
}

function formatDate(value: Date | string | null): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return new Intl.DateTimeFormat('en-KE', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'
  }).format(date);
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'Incomplete record';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} hr ${rest} min` : `${rest} min`;
}

function toLocalInput(value: Date | string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function categoryLabel(category: WellnessReminder['category']): string {
  if (category === 'eye_rest') return 'Eye rest';
  if (category === 'wake_up') return 'Wake-up';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function WellnessPage() {
  const [data, setData] = useState<WellnessData | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<WellnessSettings | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [settings, summary, hydrationEntries, breaks, sleepHistory, reminders] = await Promise.all([
        window.sidekick.wellness.settings(),
        window.sidekick.wellness.summary(),
        window.sidekick.wellness.hydrationEntries(),
        window.sidekick.wellness.breaks(),
        window.sidekick.wellness.sleepHistory(),
        window.sidekick.wellness.reminders()
      ]);
      setData({ settings, summary, hydrationEntries, breaks, sleepHistory, reminders });
      setSettingsDraft(settings);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Wellness data is unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function runAction(action: () => Promise<unknown>, message?: string) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await action();
      await refresh();
      if (message) setNotice(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The wellness action failed.');
    } finally {
      setSaving(false);
    }
  }

  function setCategorySetting<K extends keyof WellnessSettings>(
    category: K,
    key: keyof WellnessSettings[K],
    value: unknown
  ) {
    setSettingsDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        [category]: { ...current[category], [key]: value }
      };
    });
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settingsDraft) return;
    await runAction(
      () => window.sidekick.wellness.updateSettings(settingsDraft),
      'Wellness settings saved.'
    );
  }

  async function addWater(amountMl: number) {
    await runAction(() => window.sidekick.wellness.addWater({ amountMl }), `${amountMl} ml added to today's water log.`);
  }

  async function addCustomWater(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(customAmount);
    if (!Number.isInteger(amount) || amount < 1 || amount > 5000) {
      setError('Enter a water amount between 1 and 5,000 ml.');
      return;
    }
    await addWater(amount);
    setCustomAmount('');
  }

  async function editWater(entry: HydrationEntry) {
    const value = window.prompt('Correct amount in millilitres:', String(entry.amountMl));
    if (value === null) return;
    await runAction(
      () => window.sidekick.wellness.updateWater(entry.id, Number(value)),
      'Water entry updated.'
    );
  }

  async function deleteWater(entry: HydrationEntry) {
    if (!window.confirm(`Delete the ${entry.amountMl} ml water entry?`)) return;
    await runAction(() => window.sidekick.wellness.deleteWater(entry.id), 'Water entry deleted.');
  }

  async function completeReminder(reminder: WellnessReminder) {
    let amount: number | undefined;
    if (reminder.category === 'hydration') {
      const value = window.prompt('How many millilitres did you drink?', '250');
      if (value === null) return;
      amount = Number(value);
    }
    await runAction(
      () => window.sidekick.wellness.completeReminder(reminder.id, amount),
      `${categoryLabel(reminder.category)} reminder completed and recorded.`
    );
  }

  async function editSleep(record: SleepRecord) {
    const startText = record.sleepStartedAt
      ? window.prompt('Correct sleep start (date and time):', toLocalInput(record.sleepStartedAt))
      : null;
    if (startText === null && record.sleepStartedAt) return;
    const wakeText = record.wakeUpAt
      ? window.prompt('Correct wake-up time (date and time):', toLocalInput(record.wakeUpAt))
      : null;
    if (wakeText === null && record.wakeUpAt) return;
    const start = startText ? new Date(startText) : null;
    const wake = wakeText ? new Date(wakeText) : null;
    if (!start && !wake) {
      setError('At least one sleep or wake-up time is required.');
      return;
    }
    await runAction(
      () => window.sidekick.wellness.updateSleep(record.id, start, wake),
      'Sleep record updated.'
    );
  }

  const summary = data?.summary;
  const hydrationProgress = summary
    ? Math.min(100, Math.round((summary.waterConsumedMl / Math.max(1, summary.hydrationTargetMl)) * 100))
    : 0;
  const lastMovement = data?.breaks.find((item) => item.breakType === 'movement');
  const lastEyeRest = data?.breaks.find((item) => item.breakType === 'eye_rest');
  const openSleep = data?.sleepHistory.find((record) => record.sleepStartedAt && !record.wakeUpAt);

  return (
    <section className="wellness-page">
      <header className="wellness-header">
        <div>
          <span className="wellness-eyebrow">DAILY WELLNESS</span>
          <h2>Wellness</h2>
          <p>Build healthier daily habits and maintain a better balance.</p>
        </div>
        <div className="wellness-header-actions">
          <span>{new Intl.DateTimeFormat('en-KE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span>
          <button type="button" className="wellness-icon-button" onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen}>
            <AppIcon icon={faSliders} /> {settingsOpen ? 'Close settings' : 'Settings'}
          </button>
          <button type="button" className="wellness-icon-button" onClick={() => void refresh()} disabled={loading} aria-label="Refresh wellness data">
            <AppIcon icon={faRotate} /> Refresh
          </button>
        </div>
      </header>

      <p className="wellness-general-note">These are configurable general wellness reminders and habit records, not medical advice or health assessments.</p>
      {error && <div className="wellness-message wellness-message-error" role="alert">{error}</div>}
      {notice && <div className="wellness-message wellness-message-success" role="status">{notice}</div>}

      <div className="wellness-section-heading"><div><h3>Today at a glance</h3><p>Progress comes from your recorded activity.</p></div></div>
      <div className="wellness-overview-grid">
        <article className="wellness-overview-card">
          <span className="wellness-card-icon"><AppIcon icon={faDroplet} /></span>
          <span className="wellness-card-label">Hydration</span>
          <strong>{loading || !summary ? '—' : `${summary.waterConsumedMl} / ${summary.hydrationTargetMl} ml`}</strong>
          <div className="wellness-progress-track" role="progressbar" aria-label="Hydration progress" aria-valuenow={summary ? hydrationProgress : 0} aria-valuemin={0} aria-valuemax={100}>
            <div className="wellness-progress-value" style={{ width: `${summary ? hydrationProgress : 0}%` }} />
          </div>
          <small>{summary ? `${hydrationProgress}% of configured target` : 'Hydration data unavailable'}</small>
        </article>
        <article className="wellness-overview-card">
          <span className="wellness-card-icon"><AppIcon icon={faPersonWalking} /></span>
          <span className="wellness-card-label">Movement breaks</span>
          <strong>{loading || !summary ? '—' : summary.movementBreaks}</strong>
          <small>{lastMovement ? `Last: ${formatDate(lastMovement.completedAt)}` : data ? 'No break recorded today' : 'Movement history unavailable'}</small>
        </article>
        <article className="wellness-overview-card">
          <span className="wellness-card-icon"><AppIcon icon={faEye} /></span>
          <span className="wellness-card-label">Eye-rest breaks</span>
          <strong>{loading || !summary ? '—' : summary.eyeRestBreaks}</strong>
          <small>{lastEyeRest ? `Last: ${formatDate(lastEyeRest.completedAt)}` : data ? 'No break recorded today' : 'Eye-rest history unavailable'}</small>
        </article>
        <article className="wellness-overview-card">
          <span className="wellness-card-icon"><AppIcon icon={faBed} /></span>
          <span className="wellness-card-label">Sleep routine</span>
          <strong>{loading || !summary ? '—' : summary.bedtimeRecorded ? 'Bedtime recorded' : 'Not recorded'}</strong>
          <small>{summary ? (summary.wakeUpRecorded ? 'Wake-up recorded today' : 'No wake-up record today') : 'Sleep data unavailable'}</small>
        </article>
      </div>

      {settingsOpen && settingsDraft && (
        <form className="wellness-panel wellness-settings" onSubmit={(event) => void saveSettings(event)}>
          <div className="wellness-panel-heading"><div><h3>Wellness settings</h3><p>Reminder timing and habit targets are stored on this device.</p></div><button className="wellness-button wellness-button-secondary" type="button" disabled={saving} onClick={() => void runAction(() => window.sidekick.wellness.resetSettings(), 'Default settings restored.')}>Reset defaults</button></div>
          <label className="wellness-setting-toggle"><input type="checkbox" checked={settingsDraft.general.remindersEnabled} onChange={(event) => setCategorySetting('general', 'remindersEnabled', event.target.checked)} /> Enable all wellness reminders</label>
          <div className="wellness-settings-grid">
            <div className="wellness-settings-group">
              <h4>Hydration</h4>
              <label><input type="checkbox" checked={settingsDraft.hydration.enabled} onChange={(event) => setCategorySetting('hydration', 'enabled', event.target.checked)} /> Reminders enabled</label>
              <label>Daily target (ml)<input type="number" min="250" max="10000" step="50" value={settingsDraft.hydration.dailyTargetMl} onChange={(event) => setCategorySetting('hydration', 'dailyTargetMl', Number(event.target.value))} /></label>
              <label>Reminder interval (minutes)<input type="number" min="5" max="720" value={settingsDraft.hydration.intervalMinutes} onChange={(event) => setCategorySetting('hydration', 'intervalMinutes', Number(event.target.value))} /></label>
              <div className="wellness-time-pair"><label>Active from<input type="time" value={settingsDraft.hydration.activeStart} onChange={(event) => setCategorySetting('hydration', 'activeStart', event.target.value)} /></label><label>Active until<input type="time" value={settingsDraft.hydration.activeEnd} onChange={(event) => setCategorySetting('hydration', 'activeEnd', event.target.value)} /></label></div>
            </div>
            <div className="wellness-settings-group">
              <h4>Movement</h4>
              <label><input type="checkbox" checked={settingsDraft.movement.enabled} onChange={(event) => setCategorySetting('movement', 'enabled', event.target.checked)} /> Reminders enabled</label>
              <label>Reminder interval (minutes)<input type="number" min="5" max="720" value={settingsDraft.movement.intervalMinutes} onChange={(event) => setCategorySetting('movement', 'intervalMinutes', Number(event.target.value))} /></label>
              <div className="wellness-time-pair"><label>Active from<input type="time" value={settingsDraft.movement.activeStart} onChange={(event) => setCategorySetting('movement', 'activeStart', event.target.value)} /></label><label>Active until<input type="time" value={settingsDraft.movement.activeEnd} onChange={(event) => setCategorySetting('movement', 'activeEnd', event.target.value)} /></label></div>
            </div>
            <div className="wellness-settings-group">
              <h4>Eye rest</h4>
              <label><input type="checkbox" checked={settingsDraft.eyeRest.enabled} onChange={(event) => setCategorySetting('eyeRest', 'enabled', event.target.checked)} /> Reminders enabled</label>
              <label>Reminder interval (minutes)<input type="number" min="5" max="720" value={settingsDraft.eyeRest.intervalMinutes} onChange={(event) => setCategorySetting('eyeRest', 'intervalMinutes', Number(event.target.value))} /></label>
              <div className="wellness-time-pair"><label>Active from<input type="time" value={settingsDraft.eyeRest.activeStart} onChange={(event) => setCategorySetting('eyeRest', 'activeStart', event.target.value)} /></label><label>Active until<input type="time" value={settingsDraft.eyeRest.activeEnd} onChange={(event) => setCategorySetting('eyeRest', 'activeEnd', event.target.value)} /></label></div>
            </div>
            <div className="wellness-settings-group">
              <h4>Sleep routine</h4>
              <label><input type="checkbox" checked={settingsDraft.sleep.bedtimeRemindersEnabled} onChange={(event) => setCategorySetting('sleep', 'bedtimeRemindersEnabled', event.target.checked)} /> Bedtime reminder</label>
              <label><input type="checkbox" checked={settingsDraft.sleep.wakeUpRemindersEnabled} onChange={(event) => setCategorySetting('sleep', 'wakeUpRemindersEnabled', event.target.checked)} /> Wake-up reminder</label>
              <div className="wellness-time-pair"><label>Bedtime<input type="time" value={settingsDraft.sleep.bedtime} onChange={(event) => setCategorySetting('sleep', 'bedtime', event.target.value)} /></label><label>Wake-up<input type="time" value={settingsDraft.sleep.wakeUpTime} onChange={(event) => setCategorySetting('sleep', 'wakeUpTime', event.target.value)} /></label></div>
              <label>Bedtime reminder lead (minutes)<input type="number" min="0" max="180" value={settingsDraft.sleep.bedtimeLeadMinutes} onChange={(event) => setCategorySetting('sleep', 'bedtimeLeadMinutes', Number(event.target.value))} /></label>
            </div>
            <div className="wellness-settings-group">
              <h4>Quiet hours</h4>
              <label><input type="checkbox" checked={settingsDraft.general.quietHoursEnabled} onChange={(event) => setCategorySetting('general', 'quietHoursEnabled', event.target.checked)} /> Quiet hours enabled</label>
              <div className="wellness-time-pair"><label>Quiet from<input type="time" value={settingsDraft.general.quietStart} onChange={(event) => setCategorySetting('general', 'quietStart', event.target.value)} /></label><label>Quiet until<input type="time" value={settingsDraft.general.quietEnd} onChange={(event) => setCategorySetting('general', 'quietEnd', event.target.value)} /></label></div>
              <label>Snooze duration (minutes)<input type="number" min="1" max="180" value={settingsDraft.general.snoozeMinutes} onChange={(event) => setCategorySetting('general', 'snoozeMinutes', Number(event.target.value))} /></label>
            </div>
          </div>
          <p className="wellness-setting-footnote">The 2,000 ml default is a configurable general-purpose starting value, not a medical recommendation.</p>
          <button className="wellness-button wellness-button-primary" type="submit" disabled={saving}>Save wellness settings</button>
        </form>
      )}

      <div className="wellness-feature-grid">
        <article className="wellness-panel">
          <div className="wellness-panel-heading">
            <div className="wellness-panel-title"><span className="wellness-panel-icon"><AppIcon icon={faDroplet} /></span><div><h3>Hydration</h3><p>Daily water tracking</p></div></div>
            <span className="wellness-target-badge">{data ? `${data.settings.hydration.dailyTargetMl} ml target` : 'Unavailable'}</span>
          </div>
          <div className="wellness-hydration-total"><strong>{summary?.waterConsumedMl ?? '—'}</strong><span>ml consumed</span><small>{summary ? `${Math.max(0, summary.hydrationTargetMl - summary.waterConsumedMl)} ml remaining · ${summary.hydrationEntries} entries` : 'Hydration data unavailable'}</small></div>
          <div className="wellness-progress-track wellness-progress-large" role="progressbar" aria-label="Daily hydration progress" aria-valuenow={summary ? hydrationProgress : 0} aria-valuemin={0} aria-valuemax={100}><div className="wellness-progress-value" style={{ width: `${summary ? hydrationProgress : 0}%` }} /></div>
          <div className="wellness-quick-add">{[150, 250, 350, 500].map((ml) => <button type="button" key={ml} disabled={saving} onClick={() => void addWater(ml)}>+{ml} ml</button>)}</div>
          <form className="wellness-custom-water" onSubmit={(event) => void addCustomWater(event)}><label htmlFor="wellness-custom-amount">Custom amount (ml)</label><input id="wellness-custom-amount" type="number" min="1" max="5000" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} placeholder="Enter amount" /><button type="submit" className="wellness-button wellness-button-secondary" disabled={saving}>Add water</button></form>
          <div className="wellness-subheading"><h4>Today’s entries</h4><span>{data?.hydrationEntries.length ?? '—'}</span></div>
          {loading || !data ? <p className="wellness-empty-state">Hydration history unavailable.</p> : data.hydrationEntries.length ? <ul className="wellness-entry-list">{data.hydrationEntries.map((entry) => <li key={entry.id}><span><strong>{entry.amountMl} ml</strong><small>{formatDate(entry.recordedAt)}</small></span><span className="wellness-row-actions"><button type="button" onClick={() => void editWater(entry)}>Edit</button><button type="button" onClick={() => void deleteWater(entry)}>Delete</button></span></li>)}</ul> : <p className="wellness-empty-state">No water entries recorded today.</p>}
        </article>

        <article className="wellness-panel">
          <div className="wellness-panel-heading"><div className="wellness-panel-title"><span className="wellness-panel-icon"><AppIcon icon={faPersonWalking} /></span><div><h3>Movement</h3><p>{data?.settings.movement.enabled ? `Reminder every ${data.settings.movement.intervalMinutes} minutes` : 'Reminders are off'}</p></div></div><span className="wellness-count-badge">{summary?.movementBreaks ?? '—'} today</span></div>
          <p className="wellness-last-record">Last break: {lastMovement ? formatDate(lastMovement.completedAt) : 'Not recorded today'}</p>
          <button type="button" className="wellness-button wellness-button-primary wellness-wide-button" disabled={saving} onClick={() => void runAction(() => window.sidekick.wellness.recordBreak({ breakType: 'movement' }), 'Movement break recorded.')}>Record movement break</button>
          <div className="wellness-suggestions"><h4>Some simple ways to move</h4><ul><li>Stand up and stretch.</li><li>Take a short walk.</li><li>Stretch your shoulders and back.</li><li>Step away from your desk briefly.</li></ul></div>
        </article>

        <article className="wellness-panel">
          <div className="wellness-panel-heading"><div className="wellness-panel-title"><span className="wellness-panel-icon"><AppIcon icon={faEye} /></span><div><h3>Eye rest</h3><p>{data?.settings.eyeRest.enabled ? `Reminder every ${data.settings.eyeRest.intervalMinutes} minutes` : 'Reminders are off'}</p></div></div><span className="wellness-count-badge">{summary?.eyeRestBreaks ?? '—'} today</span></div>
          <div className="wellness-rule-note"><strong>Optional 20-20-20 reminder pattern</strong><span>Every 20 minutes, look at something about 20 feet away for 20 seconds. This is a general reminder, not medical treatment.</span></div>
          <p className="wellness-last-record">Last eye rest: {lastEyeRest ? formatDate(lastEyeRest.completedAt) : 'Not recorded today'}</p>
          <button type="button" className="wellness-button wellness-button-primary wellness-wide-button" disabled={saving} onClick={() => void runAction(() => window.sidekick.wellness.recordBreak({ breakType: 'eye_rest', durationSeconds: 20 }), 'Eye-rest break recorded.')}>Record eye-rest break</button>
        </article>

        <article className="wellness-panel">
          <div className="wellness-panel-heading"><div className="wellness-panel-title"><span className="wellness-panel-icon"><AppIcon icon={faBed} /></span><div><h3>Sleep routine</h3><p>Manual records you control</p></div></div><span className="wellness-count-badge">{openSleep ? 'Sleep open' : 'Ready'}</span></div>
          <div className="wellness-sleep-times"><span>Preferred bedtime<strong>{data?.settings.sleep.bedtime ?? '—'}</strong></span><span>Preferred wake-up<strong>{data?.settings.sleep.wakeUpTime ?? '—'}</strong></span></div>
          <div className="wellness-sleep-actions"><button type="button" className="wellness-button wellness-button-primary" disabled={saving || !!openSleep} onClick={() => void runAction(() => window.sidekick.wellness.recordSleep(), 'Sleep time recorded.')}>Record sleep</button><button type="button" className="wellness-button wellness-button-secondary" disabled={saving} onClick={() => void runAction(() => window.sidekick.wellness.recordWake(), 'Wake-up time recorded.')}>Record wake-up</button></div>
          {openSleep && <p className="wellness-open-sleep">Sleep started {formatDate(openSleep.sleepStartedAt)}. Record waking to complete this entry.</p>}
          <div className="wellness-subheading"><h4>Recent sleep records</h4><span>{data?.sleepHistory.length ?? '—'}</span></div>
          {loading || !data ? <p className="wellness-empty-state">Sleep history unavailable.</p> : data.sleepHistory.length ? <ul className="wellness-entry-list">{data.sleepHistory.slice(0, 7).map((record) => <li key={record.id}><span><strong>{formatDuration(record.durationMinutes)}</strong><small>{record.sleepStartedAt ? formatDate(record.sleepStartedAt) : 'Wake-up only'}{record.wakeUpAt ? ` · woke ${formatDate(record.wakeUpAt)}` : ''}</small></span><span className="wellness-row-actions"><button type="button" onClick={() => void editSleep(record)}>Edit</button><button type="button" onClick={() => { if (window.confirm('Delete this sleep record?')) void runAction(() => window.sidekick.wellness.deleteSleep(record.id), 'Sleep record deleted.'); }}>Delete</button></span></li>)}</ul> : <p className="wellness-empty-state">No sleep records yet.</p>}
        </article>
      </div>

      <div className="wellness-bottom-grid">
        <article className="wellness-panel"><div className="wellness-panel-heading"><div><h3>Wellness reminders</h3><p>{summary ? `Reminders ${summary.remindersEnabled ? 'on' : 'off'} · quiet hours and active times are respected.` : 'Reminder status unavailable.'}</p></div></div>
          {loading || !data ? <p className="wellness-empty-state">Reminder status unavailable.</p> : data.reminders.length ? <ul className="wellness-reminder-list">{data.reminders.map((reminder) => <li key={reminder.id}><span className="wellness-reminder-content"><strong>{reminder.title}</strong><small>{reminder.description} · {formatDate(reminder.snoozedUntil ?? reminder.scheduledAt)} · {reminder.priority} priority</small><em>{reminder.status}</em></span><span className="wellness-row-actions"><button type="button" disabled={saving} onClick={() => void completeReminder(reminder)}>Complete</button><button type="button" disabled={saving} onClick={() => void runAction(() => window.sidekick.wellness.snoozeReminder(reminder.id), 'Reminder snoozed.')}>Snooze</button><button type="button" disabled={saving} onClick={() => void runAction(() => window.sidekick.wellness.dismissReminder(reminder.id), 'Reminder dismissed.')}>Dismiss</button></span></li>)}</ul> : <p className="wellness-empty-state">No pending reminders. Enable a reminder in settings to schedule one.</p>}
        </article>
        <article className="wellness-panel"><div className="wellness-panel-heading"><div><h3>Recent activity</h3><p>Entries recorded today.</p></div></div>
          {loading || !summary ? <p className="wellness-empty-state">Recent activity is unavailable.</p> : summary.recentActivity.length ? <ul className="wellness-activity-list">{summary.recentActivity.map((item) => <li key={`${item.category}-${item.id}`}><span className="wellness-activity-dot" /><span><strong>{item.label}</strong><small>{item.detail} · {formatDate(item.occurredAt)}</small></span></li>)}</ul> : <p className="wellness-empty-state">No wellness activity recorded today.</p>}
        </article>
      </div>
      <p className="wellness-default-note"><AppIcon icon={faClock} /> Default hydration target: 2,000 ml, a configurable general-purpose starting value rather than a medical recommendation.</p>
    </section>
  );
}

export default WellnessPage;
