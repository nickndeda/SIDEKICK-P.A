import PlannerPage from './pages/PlannerPage';
import OverviewPage from './pages/OverviewPage';
import ProductivityPage from './pages/ProductivityPage';
import WellnessPage from './pages/WellnessPage';
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
          {activeSection === 'productivity' ? (
            <ProductivityPage />
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
