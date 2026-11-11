
import { app, BrowserWindow } from 'electron';
import * as path from 'path';

import {
  testDatabaseConnection,
  closeDatabaseConnection
} from './database/connection';

import { runMigrations } from './database/migrate';
import { registerIpcHandlers } from './ipc/handlers';

let isQuitting = false;

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    show: false,

    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '../renderer/index.html')
    );
  }
}

app.whenReady().then(async () => {
  try {
    const databaseInfo = await testDatabaseConnection();

    console.log('Sidekick database connected successfully.');
    console.log(`Database: ${databaseInfo.databaseName}`);
    console.log(`MySQL version: ${databaseInfo.serverVersion}`);

    await runMigrations();

    console.log('Database migrations completed.');
  } catch (error) {
    console.error(
      'Database initialization unavailable:',
      error
    );

    console.log(
      'Sidekick will continue in offline mode.'
    );
  }

  registerIpcHandlers();

  console.log('Sidekick IPC handlers registered.');

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', (event) => {
  if (isQuitting) {
    return;
  }

  event.preventDefault();
  isQuitting = true;

  void closeDatabaseConnection()
    .catch((error) => {
      console.error(
        'Error closing database connections:',
        error
      );
    })
    .finally(() => {
      app.quit();
    });
});
