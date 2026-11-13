import PlannerPage from './pages/PlannerPage';
import OverviewPage from './pages/OverviewPage';
import ProductivityPage from './pages/ProductivityPage';
import WellnessPage from './pages/WellnessPage';
import FinancePage from './pages/FinancePage';
import LearningPage from './pages/LearningPage';
import AssistantPage from './pages/AssistantPage';
import { useEffect, useState } from 'react';

import Sidebar from './layout/Sidebar';
import Topbar, { type ThemeMode } from './layout/Topbar';
import { navigationItems } from './layout/navigation';
import type { AssistantStatus } from '../../shared/types/assistant';

function App() {
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('system');

  const [assistantStatus, setAssistantStatus] = useState<AssistantStatus | null>(null);
  const notificationCount = assistantStatus?.unreadCount ?? 0;

  useEffect(() => {
    void window.sidekick.assistant.status().then(setAssistantStatus).catch(() => undefined);
    return window.sidekick.assistant.onUpdate(update => setAssistantStatus(update.status));
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
          ) : (
            <section className="section-placeholder">
              <div className="section-placeholder-content">
                <div className="section-placeholder-icon">
                  {activePage.label.charAt(0)}
                </div>

                <h2>{activePage.label}</h2>

                <p>{activePage.description}</p>

                <span>
                  This section is part of the application foundation.
                  Its functionality will be implemented in a later stage.
                </span>

                <button
                  type="button"
                  onClick={() => setActiveSection('overview')}
                >
                  Return to Overview
                </button>
              </div>
            </section>
          )}
        </div>

        <footer className="dashboard-footer">
          <span>Sidekick P.A. · Application foundation</span>
          <span>Local-first architecture</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
