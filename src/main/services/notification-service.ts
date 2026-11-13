import { BrowserWindow, Notification } from 'electron';

import type { WellnessReminder } from '../modules/wellness/wellness-types';

export function showWellnessNotification(reminder: WellnessReminder): boolean {
  if (!Notification.isSupported()) return false;

  const notification = new Notification({
    title: reminder.title,
    body: reminder.description,
    silent: false
  });

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
