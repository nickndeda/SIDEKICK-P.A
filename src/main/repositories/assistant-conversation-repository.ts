import { randomUUID } from 'node:crypto';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '../database/connection';

export type ChatMessage = { id: string; conversationId: string; role: 'user'|'assistant'; content: string; provider: string|null; createdAt: Date };
export type Conversation = { id: string; title: string; updatedAt: Date; messages: ChatMessage[] };
export type AssistantPreferences = { localModelUrl: string; localModelName: string; memoryEnabled: boolean; taskPredictionEnabled:boolean;backgroundReasoningEnabled:boolean };
type Row = RowDataPacket & Record<string, unknown>;
const mapMessage = (row: Row): ChatMessage => ({ id: String(row.id), conversationId: String(row.conversation_id), role: row.role as ChatMessage['role'], content: String(row.content), provider: row.provider == null ? null : String(row.provider), createdAt: row.created_at as Date });

export async function preferences(pool: Pool = getDatabasePool()): Promise<AssistantPreferences> {
  await pool.execute('INSERT IGNORE INTO assistant_preferences(id,monitoring_enabled) VALUES(1,TRUE)');
  const [rows] = await pool.query<Row[]>('SELECT local_model_url,local_model_name,memory_enabled,task_prediction_enabled,background_reasoning_enabled FROM assistant_preferences WHERE id=1');
  return { localModelUrl: String(rows[0]?.local_model_url ?? 'http://127.0.0.1:11434'), localModelName: String(rows[0]?.local_model_name ?? ''), memoryEnabled: Boolean(rows[0]?.memory_enabled),taskPredictionEnabled:Boolean(rows[0]?.task_prediction_enabled),backgroundReasoningEnabled:Boolean(rows[0]?.background_reasoning_enabled) };
}

export async function savePreferences(input: AssistantPreferences, pool: Pool = getDatabasePool()): Promise<AssistantPreferences> {
  await pool.execute('UPDATE assistant_preferences SET local_model_url=?,local_model_name=?,memory_enabled=?,task_prediction_enabled=?,background_reasoning_enabled=? WHERE id=1', [input.localModelUrl,input.localModelName,input.memoryEnabled,input.taskPredictionEnabled,input.backgroundReasoningEnabled]);
  return preferences(pool);
}

export async function listConversations(pool: Pool = getDatabasePool()): Promise<Conversation[]> {
  const [rows] = await pool.query<Row[]>('SELECT id,title,updated_at FROM assistant_conversations ORDER BY updated_at DESC LIMIT 50');
  return rows.map(row => ({ id:String(row.id),title:String(row.title),updatedAt:row.updated_at as Date,messages:[] }));
}

export async function getConversation(id: string, pool: Pool = getDatabasePool()): Promise<Conversation|null> {
  const [conversations] = await pool.execute<Row[]>('SELECT id,title,updated_at FROM assistant_conversations WHERE id=?',[id]);
  if (!conversations[0]) return null;
  const [messages] = await pool.execute<Row[]>('SELECT id,conversation_id,role,content,provider,created_at FROM assistant_messages WHERE conversation_id=? ORDER BY message_order',[id]);
  const c = conversations[0];
  return { id:String(c.id),title:String(c.title),updatedAt:c.updated_at as Date,messages:messages.map(mapMessage) };
}

export async function createConversation(pool: Pool = getDatabasePool()): Promise<string> {
  const id = randomUUID();
  await pool.execute('INSERT INTO assistant_conversations(id,title) VALUES(?,?)',[id,'New conversation']);
  return id;
}

export async function addMessage(conversationId: string, role: ChatMessage['role'], content: string, provider: string|null, pool: Pool = getDatabasePool()): Promise<ChatMessage> {
  const id = randomUUID();
  await pool.execute('INSERT INTO assistant_messages(id,conversation_id,role,content,provider) VALUES(?,?,?,?,?)',[id,conversationId,role,content,provider]);
  if (role === 'user') await pool.execute('UPDATE assistant_conversations SET title=IF(title=\'New conversation\',LEFT(?,180),title),updated_at=NOW(3) WHERE id=?',[content,conversationId]);
  else await pool.execute('UPDATE assistant_conversations SET updated_at=NOW(3) WHERE id=?',[conversationId]);
  return { id,conversationId,role,content,provider,createdAt:new Date() };
}

export async function deleteConversation(id: string, pool: Pool = getDatabasePool()): Promise<boolean> {
  const [result] = await pool.execute('DELETE FROM assistant_conversations WHERE id=?',[id]);
  return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
}

export async function listMemories(pool: Pool = getDatabasePool()): Promise<Array<{id:string;label:string;content:string;enabled:boolean;expiresAt:Date|null;updatedAt:Date}>> {
  const [rows] = await pool.query<Row[]>('SELECT id,label,content,enabled,expires_at,updated_at FROM assistant_memories ORDER BY updated_at DESC');
  return rows.map(row=>({id:String(row.id),label:String(row.label),content:String(row.content),enabled:Boolean(row.enabled),expiresAt:row.expires_at as Date|null,updatedAt:row.updated_at as Date}));
}

export async function saveMemory(id: string|null,label:string,content:string,enabled:boolean,expiresAt:Date|null,pool: Pool = getDatabasePool()): Promise<void> {
  if (id) await pool.execute('UPDATE assistant_memories SET label=?,content=?,enabled=?,expires_at=? WHERE id=?',[label,content,enabled,expiresAt,id]);
  else await pool.execute('INSERT INTO assistant_memories(id,label,content,enabled,expires_at) VALUES(?,?,?,?,?)',[randomUUID(),label,content,enabled,expiresAt]);
}

export async function deleteMemory(id:string,pool:Pool=getDatabasePool()):Promise<boolean>{
  const [result]=await pool.execute('DELETE FROM assistant_memories WHERE id=?',[id]);
  return Number((result as {affectedRows?:number}).affectedRows??0)>0;
}
