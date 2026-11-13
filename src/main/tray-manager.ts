import { app, Menu, nativeImage, Tray, type BrowserWindow } from 'electron';

let tray: Tray | null = null;

function trayIcon() {
  const pixelIcon = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAjElEQVR4nO3Vuw2AMAwE0MxCyxxMxyDsSAOiheBfzkYWPslldE9RPq1VKoJs635Y5pNSCAZdrkakAMzT8hgIwFKsgZgBb2VXNJCcAGq7KUAPkQ/AHTgOcEcUwAXQSxhA+zCpAaMI92sYArAiQp5iOIBCSCHmn1ACoCDcGijAMmKAB0JVjsIMlVbaX3ICQ+hZaat4Hn4AAAAASUVORK5CYII=';
  return nativeImage.createFromDataURL(`data:image/png;base64,${pixelIcon}`);
}

export function createTray(window: BrowserWindow): void {
  if (tray) return;
  tray = new Tray(trayIcon());
  tray.setToolTip('Sidekick P.A.');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Sidekick', click: () => { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } },
    { type: 'separator' },
    { label: 'Quit Sidekick', click: () => app.quit() }
  ]));
  tray.on('click', () => {
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  });
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
