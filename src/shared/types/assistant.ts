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
export interface AssistantPreferences { localModelUrl: string; localModelName: string; memoryEnabled: boolean; taskPredictionEnabled:boolean; backgroundReasoningEnabled:boolean; }
export interface AssistantMemory { id:string;label:string;content:string;enabled:boolean;expiresAt:Date|null;updatedAt:Date; }
export interface LocalModelStatus { available:boolean;models:string[];message:string; }
export interface AssistantTaskProposal { id:string;conversationId:string;actionType:'task.create';task:{title:string;description:string|null;priority:'low'|'normal'|'high'|'critical';dueAt:string|null};status:'pending'|'executed'|'rejected'|'expired';createdAt:Date;expiresAt:Date;resultEntityId:string|null; }
export interface AssistantTaskRiskSnapshot {enabled:boolean;modelAvailable:boolean;savedModelAvailable:boolean;modelVersion:number|null;trainedAt:Date|null;sampleCount:number;modelBrier:number|null;baselineBrier:number|null;calibrationError:number|null;tasks:Array<{id:string;title:string;priority:string;dueAt:Date;probabilityLate:number|null;band:string;evidence:string[]}>;}
export type AssistantTaskModelTraining = {status:'ready';modelVersion:number;sampleCount:number;lateCount:number;onTimeCount:number;modelBrier:number;baselineBrier:number;calibrationError:number}|{status:'insufficient_data';reason:string;sampleCount:number;lateCount:number;onTimeCount:number}|{status:'not_better_than_baseline';reason:string;sampleCount:number;lateCount:number;onTimeCount:number;modelBrier:number;baselineBrier:number}|{status:'poor_calibration';reason:string;sampleCount:number;lateCount:number;onTimeCount:number;modelBrier:number;baselineBrier:number;calibrationError:number};

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
  saveMemory(input:{id:string|null;label:string;content:string;enabled:boolean;expiresAt?:Date|string|null}): Promise<void>;
  deleteMemory(id:string): Promise<boolean>;
  proposals(conversationId?:string): Promise<AssistantTaskProposal[]>;
  decideProposal(id:string,decision:'approve'|'reject'): Promise<AssistantTaskProposal>;
  feedback(messageId:string,feedback:'helpful'|'not_helpful'): Promise<void>;
  taskRisk():Promise<AssistantTaskRiskSnapshot>;
  trainTaskModel():Promise<AssistantTaskModelTraining>;
  clearTaskModel():Promise<void>;
}
