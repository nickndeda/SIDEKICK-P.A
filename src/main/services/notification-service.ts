import { BrowserWindow, Notification } from 'electron';

import type { WellnessReminder } from '../modules/wellness/wellness-types';
import type { AssistantActivity } from '../../shared/types/assistant';

function showNativeNotification(title: string, body: string): boolean {
  if (!Notification.isSupported()) return false;
  const notification = new Notification({ title, body, silent: false });
  notification.on('click', () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  });
  notification.show();
  return true;
}

export function showWellnessNotification(reminder: WellnessReminder): boolean {
  return showNativeNotification(reminder.title, reminder.description);
}

export function showAssistantNotification(activity: AssistantActivity): boolean {
  return showNativeNotification(activity.title, activity.description);
}
