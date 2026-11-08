
import { useEffect, useState } from 'react';

import Sidebar from './layout/Sidebar';
import Topbar, { type ThemeMode } from './layout/Topbar';
import { navigationItems } from './layout/navigation';

function App() {
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('system');

  // Temporary prototype notification count.
  const notificationCount = 3;

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
          onNotificationsClick={() => setActiveSection('notifications')}
        />

        <div className="dashboard-content">
          {activeSection === 'overview' ? (
            <section className="overview-page">
              <div className="overview-welcome">
                <div>
                  <span className="overview-eyebrow">
                    YOUR PERSONAL WORKSPACE
                  </span>

                  <h2>
                    Good morning.
                  </h2>

                  <p>
                    Here's an overview of what's happening today.
                  </p>
                </div>

                <div className="overview-date">
                  {new Intl.DateTimeFormat('en-KE', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }).format(new Date())}
                </div>
              </div>

              {focusMode && (
                <div className="focus-banner">
                  Focus mode is active. Only critical alerts should interrupt you.
                </div>
              )}

              <div className="overview-section-heading">
                <div>
                  <h3>Your day at a glance</h3>
                  <p>Your personal activity summary.</p>
                </div>
              </div>

              <div className="overview-grid">
                <article className="overview-card">
                  <span className="overview-card-label">
                    Planned tasks
                  </span>
                  <strong>0</strong>
                  <span className="overview-card-note">
                    Tasks will appear here
                  </span>
                </article>

                <article className="overview-card">
                  <span className="overview-card-label">
                    Focus time
                  </span>
                  <strong>0 min</strong>
                  <span className="overview-card-note">
                    No sessions recorded yet
                  </span>
                </article>

                <article className="overview-card">
                  <span className="overview-card-label">
                    Learning progress
                  </span>
                  <strong>0 topics</strong>
                  <span className="overview-card-note">
                    Start tracking your learning
                  </span>
                </article>

                <article className="overview-card">
                  <span className="overview-card-label">
                    Notifications
                  </span>
                  <strong>{notificationCount}</strong>
                  <span className="overview-card-note">
                    Prototype notifications
                  </span>
                </article>
              </div>

              <div className="overview-section-heading">
                <div>
                  <h3>What's next?</h3>
                  <p>Your workspace is ready for your first activities.</p>
                </div>
              </div>

              <div className="overview-next-card">
                <div className="overview-next-indicator" />

                <div>
                  <h4>No upcoming tasks</h4>
                  <p>
                    Add a task in Planner and Sidekick will help you keep
                    track of it.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSection('planner')}
                >
                  Open Planner
                </button>
              </div>

              <div className="overview-bottom-grid">
                <article className="overview-info-card">
                  <h3>Learning</h3>
                  <p>
                    Track subjects, practise with quizzes and identify
                    topics that need more attention.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSection('learning')}
                  >
                    Open Learning
                  </button>
                </article>

                <article className="overview-info-card">
                  <h3>Personal finances</h3>
                  <p>
                    Manage subscriptions, expenses, bills and savings
                    using information you enter yourself.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSection('finance')}
                  >
                    Open Finance
                  </button>
                </article>
              </div>
            </section>
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
