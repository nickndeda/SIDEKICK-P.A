import PlannerPage from './pages/PlannerPage';
import OverviewPage from './pages/OverviewPage';
import ProductivityPage from './pages/ProductivityPage';
import WellnessPage from './pages/WellnessPage';
import FinancePage from './pages/FinancePage';
import LearningPage from './pages/LearningPage';
import AssistantPage from './pages/AssistantPage';
import SettingsPage from './pages/SettingsPage';
import { useEffect, useState } from 'react';

import Sidebar from './layout/Sidebar';
import Topbar, { type ThemeMode } from './layout/Topbar';
import { navigationItems } from './layout/navigation';
import type { AssistantStatus } from '../../shared/types/assistant';

function App() {
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('sidekick.sidebar.collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [focusMode, setFocusMode] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const savedTheme = window.localStorage.getItem('sidekick.theme');
      return savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system'
        ? savedTheme
        : 'system';
    } catch {
      return 'system';
    }
  });
  const [clock, setClock] = useState(() => new Date());

  const [assistantStatus, setAssistantStatus] = useState<AssistantStatus | null>(null);
  const notificationCount = assistantStatus?.unreadCount ?? 0;

  useEffect(() => {
    if (!window.sidekick?.assistant) return;
    void window.sidekick.assistant.status().then(setAssistantStatus).catch(() => undefined);
    return window.sidekick.assistant.onUpdate(update => setAssistantStatus(update.status));
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('sidekick.sidebar.collapsed', String(sidebarCollapsed));
    } catch {
      // Keep the in-memory preference when local storage is unavailable.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      window.localStorage.setItem('sidekick.theme', theme);
    } catch {
      // Keep the in-memory preference when local storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const activePage = navigationItems.find(
    (item) => item.id === activeSection
  ) ?? navigationItems[0];

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolvedTheme =
        theme === 'system'
          ? mediaQuery.matches ? 'dark' : 'light'
          : theme;

      document.documentElement.dataset.theme = resolvedTheme;
    };

    applyTheme();

    if (theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);

      return () => {
        mediaQuery.removeEventListener('change', applyTheme);
      };
    }
  }, [theme]);

  if (!window.sidekick?.assistant) {
    return (
      <main className="runtime-unavailable">
        <div>
          <h1>Sidekick needs its desktop runtime</h1>
          <p>This page is open without the Electron preload bridge. Start Sidekick with <code>npm run dev</code> and use the desktop window.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="dashboard-shell">
      <Sidebar
        activeSection={activeSection}
        collapsed={sidebarCollapsed}
        onNavigate={setActiveSection}
        onToggle={() => setSidebarCollapsed((previous) => !previous)}
        notificationCount={notificationCount}
      />

      <main className="dashboard-main">
        <Topbar
          title={activePage.label}
          subtitle={activePage.description}
          focusMode={focusMode}
          notificationCount={notificationCount}
          theme={theme}
          onFocusToggle={() => setFocusMode((previous) => !previous)}
          onThemeChange={setTheme}
          onNotificationsClick={() => setActiveSection('assistant')}
          assistantState={assistantStatus?.state ?? 'initializing'}
          onAssistantClick={() => setActiveSection('assistant')}
        />

        <div className="dashboard-content">
          {activeSection === 'productivity' ? (
            <ProductivityPage />
          ) : activeSection === 'assistant' ? (
            <AssistantPage />
          ) : activeSection === 'chat' ? (
            <AssistantPage chatOnly />
          ) : activeSection === 'notifications' ? (
            <AssistantPage />
          ) : activeSection === 'learning' ? (
            <LearningPage />
          ) : activeSection === 'finance' ? (
            <FinancePage />
          ) : activeSection === 'wellness' ? (
            <WellnessPage />
          ) : activeSection === 'overview' ? (
            <OverviewPage onNavigate={setActiveSection} />
          ) : activeSection === 'planner' ? (
            <PlannerPage />
          ) : activeSection === 'settings' ? (
            <SettingsPage theme={theme} onThemeChange={setTheme} onNavigate={setActiveSection} />
          ) : (
            <OverviewPage onNavigate={setActiveSection} />
          )}
        </div>

        <footer className="dashboard-footer">
          <span>Sidekick P.A. · Personal workspace</span>
          <span>Local-first by design</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
