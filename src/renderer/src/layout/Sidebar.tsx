import AppIcon from '../components/AppIcon';
import { navigationItems } from './navigation';

import {
  faBolt,
  faChevronLeft,
  faChevronRight,
  faCircle
} from '@fortawesome/free-solid-svg-icons';

interface SidebarProps {
  activeSection: string;
  collapsed: boolean;
  onNavigate: (section: string) => void;
  onToggle: () => void;
  notificationCount: number;
}

function Sidebar({
  activeSection,
  collapsed,
  onNavigate,
  onToggle,
  notificationCount
}: SidebarProps) {
  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
    >
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <AppIcon icon={faBolt} />
        </div>

        {!collapsed && (
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">Sidekick</span>
            <span className="sidebar__brand-caption">PERSONAL ASSISTANT</span>
          </div>
        )}
      </div>

      <div className="sidebar__section-label">
        {!collapsed && 'WORKSPACE'}
      </div>

      <nav className="sidebar__navigation" aria-label="Main navigation">
        {navigationItems.map((item) => {
          const active = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar__nav-item ${active ? 'sidebar__nav-item--active' : ''}`}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
            >
              <AppIcon
                icon={item.icon}
                fixedWidth
                size="lg"
              />

              {!collapsed && (
                <span className="sidebar__nav-label">
                  {item.label}
                </span>
              )}

              {item.id === 'notifications' && !collapsed && notificationCount > 0 && (
                <span className="sidebar__notification-dot" aria-label={`${notificationCount} unread assistant findings`} />
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar__bottom">
        <div className="sidebar__offline">
          <AppIcon
            icon={faCircle}
            size="xs"
            className="sidebar__status-icon"
          />

          {!collapsed && (
            <span>Working offline</span>
          )}
        </div>

        <button
          type="button"
          className="sidebar__collapse"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <AppIcon
            icon={collapsed ? faChevronRight : faChevronLeft}
          />

          {!collapsed && <span>Collapse sidebar</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
