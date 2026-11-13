export type AssistantStateName =
  | 'initializing' | 'idle' | 'monitoring' | 'thinking' | 'planning'
  | 'working' | 'waiting_for_approval' | 'speaking' | 'attention'
  | 'paused' | 'offline' | 'error';

export interface AssistantStatus {
  state: AssistantStateName;
  monitoringEnabled: boolean;
  databaseAvailable: boolean;
  lastCheckedAt: Date | null;
  unreadCount: number;
  degradedModules: string[];
  lastError: string | null;
}

export interface AssistantActivity {
  id: string;
  dedupeKey: string;
  eventType: string;
  severity: 'info' | 'normal' | 'high' | 'critical';
  title: string;
  description: string;
  payload: Record<string, unknown> | null;
  status: 'unread' | 'read' | 'dismissed';
  notificationSentAt: Date | null;
  createdAt: Date;
  readAt: Date | null;
  dismissedAt: Date | null;
}

export interface AssistantUpdate {
  status: AssistantStatus;
  latestActivity: AssistantActivity | null;
}

export interface AssistantChatMessage { id: string; conversationId: string; role: 'user'|'assistant'; content: string; provider: string|null; createdAt: Date; }
export interface AssistantConversation { id: string; title: string; updatedAt: Date; messages: AssistantChatMessage[]; }
export interface AssistantPreferences { localModelUrl: string; localModelName: string; memoryEnabled: boolean; }
export interface AssistantMemory { id:string;label:string;content:string;enabled:boolean;updatedAt:Date; }
export interface LocalModelStatus { available:boolean;models:string[];message:string; }

export interface AssistantApi {
  status(): Promise<AssistantStatus>;
  activities(limit?: number, includeDismissed?: boolean): Promise<AssistantActivity[]>;
  setMonitoringEnabled(enabled: boolean): Promise<AssistantStatus>;
  markRead(id: string): Promise<void>;
  dismiss(id: string): Promise<void>;
  onUpdate(listener: (update: AssistantUpdate) => void): () => void;
  conversations(): Promise<AssistantConversation[]>;
  conversation(id:string): Promise<AssistantConversation|null>;
  newConversation(): Promise<AssistantConversation>;
  deleteConversation(id:string): Promise<boolean>;
  sendMessage(conversationId:string|null,message:string): Promise<AssistantConversation>;
  preferences(): Promise<AssistantPreferences>;
  setPreferences(input:AssistantPreferences): Promise<AssistantPreferences>;
  checkModel(): Promise<LocalModelStatus>;
  memories(): Promise<AssistantMemory[]>;
  saveMemory(input:{id:string|null;label:string;content:string;enabled:boolean}): Promise<void>;
  deleteMemory(id:string): Promise<boolean>;
}
