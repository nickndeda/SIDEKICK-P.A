import {
  faHouse,
  faChartLine,
  faGraduationCap,
  faWallet,
  faHeartPulse,
  faCalendarDays,
  faBell,
  faComments,
  faRobot,
  faGear
} from '@fortawesome/free-solid-svg-icons';

import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface NavigationItem {
  id: string;
  label: string;
  icon: IconDefinition;
  description: string;
}

export const navigationItems: NavigationItem[] = [
  {
    id: 'assistant',
    label: 'Assistant',
    icon: faRobot,
    description: 'Background monitoring and assistant activity'
  },
  {
    id: 'overview',
    label: 'Overview',
    icon: faHouse,
    description: 'Your personal activity and daily summary'
  },
  {
    id: 'productivity',
    label: 'Productivity',
    icon: faChartLine,
    description: 'Focus sessions, activity and breaks'
  },
  {
    id: 'learning',
    label: 'Learning',
    icon: faGraduationCap,
    description: 'Subjects, quizzes and learning progress'
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: faWallet,
    description: 'Expenses, subscriptions and savings'
  },
  {
    id: 'wellness',
    label: 'Wellness',
    icon: faHeartPulse,
    description: 'Personal routines and wellbeing'
  },
  {
    id: 'planner',
    label: 'Planner',
    icon: faCalendarDays,
    description: 'Tasks, deadlines and appointments'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: faBell,
    description: 'Alerts, reminders and notification history'
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: faComments,
    description: 'Conversations with Sidekick'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: faGear,
    description: 'Preferences, privacy and application settings'
  }
];
