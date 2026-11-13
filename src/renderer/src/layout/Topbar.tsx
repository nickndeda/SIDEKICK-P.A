import {
  faBell,
  faBolt,
  faDesktop,
  faMoon,
  faSearch,
  faSun
} from '@fortawesome/free-solid-svg-icons';

import AppIcon from '../components/AppIcon';
import type { AssistantStateName } from '../../../shared/types/assistant';

export type ThemeMode = 'light' | 'dark' | 'system';

interface TopbarProps {
  title: string;
  subtitle: string;
  focusMode: boolean;
  notificationCount: number;
  theme: ThemeMode;
  onFocusToggle: () => void;
  onThemeChange: (theme: ThemeMode) => void;
  onNotificationsClick: () => void;
  assistantState: AssistantStateName;
  onAssistantClick: () => void;
}

function Topbar({
  title,
  subtitle,
  focusMode,
  notificationCount,
  theme,
  onFocusToggle,
  onThemeChange,
  onNotificationsClick,
  assistantState,
  onAssistantClick
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar__heading">
        <h1 className="topbar__title">{title}</h1>
        <p className="topbar__subtitle">{subtitle}</p>
      </div>

      <div className="topbar__actions">
        <button type="button" className={`topbar__assistant topbar__assistant--${assistantState}`} onClick={onAssistantClick} title="Open assistant activity">
          <span className="topbar__assistant-indicator" />
          <span>Sidekick {assistantState.replaceAll('_', ' ')}</span>
        </button>
        <label className="topbar__search">
          <AppIcon icon={faSearch} />
          <input
            type="search"
            placeholder="Search Sidekick..."
            aria-label="Search Sidekick"
          />
          <span className="topbar__shortcut">Ctrl K</span>
        </label>

        <button
          type="button"
          className={`topbar__focus ${focusMode ? 'topbar__focus--active' : ''}`}
          onClick={onFocusToggle}
          aria-pressed={focusMode}
        >
          <AppIcon icon={faBolt} />
          <span>{focusMode ? 'Focus on' : 'Focus'}</span>
        </button>

        <label className="topbar__theme">
          <span className="topbar__theme-icon">
            <AppIcon
              icon={
                theme === 'light'
                  ? faSun
                  : theme === 'dark'
                    ? faMoon
                    : faDesktop
              }
            />
          </span>

          <select
            value={theme}
            onChange={(event) =>
              onThemeChange(event.target.value as ThemeMode)
            }
            aria-label="Choose appearance"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">Follow Windows</option>
          </select>
        </label>

        <button
          type="button"
          className="topbar__notifications"
          onClick={onNotificationsClick}
          aria-label={`Notifications, ${notificationCount} unread`}
        >
          <AppIcon icon={faBell} />

          {notificationCount > 0 && (
            <span className="topbar__notification-count">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

export default Topbar;
