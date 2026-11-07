
import { contextBridge } from 'electron';

const sidekickAPI = {
  platform: process.platform,

  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
};

contextBridge.exposeInMainWorld('sidekick', sidekickAPI);

