import type { ThemeMode } from '../layout/Topbar';
import '../styles/settings.css';

interface SettingsPageProps {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onNavigate: (section: string) => void;
}

function SettingsPage({ theme, onThemeChange, onNavigate }: SettingsPageProps) {
  return (
    <section className="settings-page">
      <header className="settings-header">
        <span>PERSONALIZE SIDEKICK</span>
        <h1>Settings</h1>
        <p>Adjust the appearance and open settings for each part of your workspace.</p>
      </header>

      <article className="settings-card">
        <div>
          <h2>Appearance</h2>
          <p>Choose a theme or follow your Windows appearance.</p>
        </div>
        <label className="settings-theme-field">
          Theme
          <select value={theme} onChange={event => onThemeChange(event.target.value as ThemeMode)}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </article>

      <article className="settings-card settings-destinations">
        <div>
          <h2>Workspace settings</h2>
          <p>Settings for these areas are managed alongside their features.</p>
        </div>
        <div className="settings-links">
          <button type="button" onClick={() => onNavigate('assistant')}>Assistant and model</button>
          <button type="button" onClick={() => onNavigate('wellness')}>Wellness reminders</button>
          <button type="button" onClick={() => onNavigate('finance')}>Finance preferences</button>
        </div>
      </article>
    </section>
  );
}

export default SettingsPage;
