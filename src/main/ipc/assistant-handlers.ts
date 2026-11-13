import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { dismissAssistantActivity, getAssistantActivities, getAssistantStatus, markAssistantActivityRead, setAssistantMonitoring } from '../core/assistant-engine';
import * as chat from '../core/assistant-conversation-service';

function trusted(event: IpcMainInvokeEvent): void {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || event.senderFrame !== event.sender.mainFrame) throw new Error('Untrusted IPC request.');
}

function recordId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error('Invalid assistant activity ID.');
  return value;
}

export function registerAssistantIpcHandlers(): void {
  const channels = ['assistant:status','assistant:activities','assistant:monitoring:set','assistant:activity:read','assistant:activity:dismiss','assistant:conversations','assistant:conversation:get','assistant:conversation:new','assistant:conversation:delete','assistant:chat:send','assistant:preferences','assistant:preferences:set','assistant:model:check','assistant:memories','assistant:memory:save','assistant:memory:delete'];
  for (const channel of channels) ipcMain.removeHandler(channel);
  ipcMain.handle('assistant:status', event => { trusted(event); return getAssistantStatus(); });
  ipcMain.handle('assistant:activities', (event, limit, includeDismissed) => {
    trusted(event);
    if (limit !== undefined && (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 100)) throw new Error('Activity limit must be from 1 to 100.');
    if (includeDismissed !== undefined && typeof includeDismissed !== 'boolean') throw new Error('Invalid dismissed activity filter.');
    return getAssistantActivities(limit, includeDismissed);
  });
  ipcMain.handle('assistant:monitoring:set', (event, enabled) => {
    trusted(event);
    if (typeof enabled !== 'boolean') throw new Error('Monitoring state must be enabled or disabled.');
    return setAssistantMonitoring(enabled);
  });
  ipcMain.handle('assistant:activity:read', async (event, id) => { trusted(event); await markAssistantActivityRead(recordId(id)); });
  ipcMain.handle('assistant:activity:dismiss', async (event, id) => { trusted(event); await dismissAssistantActivity(recordId(id)); });
  ipcMain.handle('assistant:conversations', event => { trusted(event); return chat.getAssistantConversations(); });
  ipcMain.handle('assistant:conversation:get', (event,id) => { trusted(event); return chat.getAssistantConversation(recordId(id)); });
  ipcMain.handle('assistant:conversation:new', event => { trusted(event); return chat.newAssistantConversation(); });
  ipcMain.handle('assistant:conversation:delete', (event,id) => { trusted(event); return chat.removeAssistantConversation(recordId(id)); });
  ipcMain.handle('assistant:chat:send', (event,id,message) => { trusted(event); if (id !== null && typeof id !== 'string') throw new Error('Invalid conversation ID.'); if (typeof message !== 'string') throw new Error('Message must be text.'); return chat.sendAssistantMessage(id,message); });
  ipcMain.handle('assistant:preferences', event => { trusted(event); return chat.getAssistantPreferences(); });
  ipcMain.handle('assistant:preferences:set', (event,input) => { trusted(event); if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid assistant preferences.'); return chat.updateAssistantPreferences(input); });
  ipcMain.handle('assistant:model:check', event => { trusted(event); return chat.checkLocalModel(); });
  ipcMain.handle('assistant:memories', event => { trusted(event); return chat.getAssistantMemories(); });
  ipcMain.handle('assistant:memory:save', (event,input) => { trusted(event); if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid memory data.'); return chat.saveAssistantMemory(input); });
  ipcMain.handle('assistant:memory:delete', (event,id) => { trusted(event); return chat.removeAssistantMemory(recordId(id)); });
}
