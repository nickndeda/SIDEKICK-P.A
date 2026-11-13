
import { app, BrowserWindow } from 'electron';
import * as path from 'path';

import {
  testDatabaseConnection,
  closeDatabaseConnection
} from './database/connection';

import { runMigrations } from './database/migrate';
import { registerIpcHandlers } from './ipc/handlers';
import { registerProductivityIpcHandlers } from './ipc/productivity-handlers';
import { registerWellnessIpcHandlers } from './ipc/wellness-handlers';
import { registerFinanceIpcHandlers } from './ipc/finance-handlers';
import { registerLearningIpcHandlers } from './ipc/learning-handlers';
import { registerAssistantIpcHandlers } from './ipc/assistant-handlers';
import { startScheduler, stopScheduler } from './core/scheduler';
import { runWellnessReminderCycle } from './modules/wellness/wellness-service';
import { runFinanceReminderCycle } from './modules/finance/finance-service';
import { runLearningReminderCycle } from './modules/learning/learning-service';
import { runAssistantMonitorCycle, startAssistantEngine, stopAssistantEngine, subscribeAssistantUpdates } from './core/assistant-engine';
import { runAssistantBackgroundReasoning, stopAssistantBackgroundReasoning } from './core/assistant-conversation-service';
import { createTray, destroyTray } from './tray-manager';

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

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  createTray(mainWindow);

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
  let databaseReady = false;
  try {
    const databaseInfo = await testDatabaseConnection();

    console.log('Sidekick database connected successfully.');
    console.log(`Database: ${databaseInfo.databaseName}`);
    console.log(`MySQL version: ${databaseInfo.serverVersion}`);

    await runMigrations();
    databaseReady = true;

    console.log('Database migrations completed.');
  } catch (error) {
    console.error(
      'Database initialization unavailable:',
      error
    );

    console.log(
      'Database-backed features are unavailable while the local database is offline.'
    );
  }

  registerIpcHandlers();
  registerProductivityIpcHandlers();
  registerWellnessIpcHandlers();
  registerFinanceIpcHandlers();
  registerLearningIpcHandlers();
  registerAssistantIpcHandlers();

  console.log('Sidekick IPC handlers registered.');

  createWindow();

  subscribeAssistantUpdates(update => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send('assistant:update', update);
    }
  });

  await startAssistantEngine(databaseReady);

  if (databaseReady) startScheduler(async () => {
    try {
      await runFinanceReminderCycle();
    } catch (error) {
      console.error('Finance reminder cycle failed:', error);
    }
    try {
      await runLearningReminderCycle();
    } catch (error) {
      console.error('Learning reminder cycle failed:', error);
    }
    await runAssistantMonitorCycle();
    await runWellnessReminderCycle();
    void runAssistantBackgroundReasoning().catch(error => {
      console.error('Assistant background reasoning cycle failed:', error);
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // The window hides to the tray; scheduled wellness reminders keep running.
});

app.on('before-quit', (event) => {
  if (isQuitting) {
    return;
  }

  event.preventDefault();
  isQuitting = true;
  stopScheduler();
  stopAssistantBackgroundReasoning();
  void stopAssistantEngine();
  destroyTray();

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
