
import { contextBridge, ipcRenderer } from 'electron';

const sidekickAPI = {
  platform: process.platform,

  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  },

  tasks: {
    create: (input: {
      title: string;
      description?: string | null;
      priority?: 'low' | 'normal' | 'high' | 'critical';
      status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      dueAt?: Date | string | null;
    }) => ipcRenderer.invoke('tasks:create', input),

    list: (filters?: {
      status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      priority?: 'low' | 'normal' | 'high' | 'critical';
    }) => ipcRenderer.invoke('tasks:list', filters),

    get: (id: string) =>
      ipcRenderer.invoke('tasks:get', id),

    update: (
      id: string,
      input: {
        title?: string;
        description?: string | null;
        priority?: 'low' | 'normal' | 'high' | 'critical';
        status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
        dueAt?: Date | string | null;
      }
    ) => ipcRenderer.invoke('tasks:update', id, input),

    complete: (id: string) =>
      ipcRenderer.invoke('tasks:complete', id),

    delete: (id: string) =>
      ipcRenderer.invoke('tasks:delete', id)
  }
};

contextBridge.exposeInMainWorld('sidekick', sidekickAPI);
