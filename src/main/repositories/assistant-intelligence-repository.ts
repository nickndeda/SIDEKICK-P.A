import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '../database/connection';
import { createTaskForAssistantProposal, getTaskById, type CreateTaskInput } from './task-repository';
import { publishAssistantEvent } from '../core/assistant-monitor';
import { insertActivity } from './assistant-repository';
import type { AssistantTaskProposal } from '../../shared/types/assistant';
import type { TaskDelayModel } from '../core/task-delay-model';

type Row = RowDataPacket & Record<string, unknown>;
type ProposalData = { title:string;description:string|null;priority:'low'|'normal'|'high'|'critical';dueAt:string|null };
const normalizeData = (raw:unknown):ProposalData => {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) as unknown : raw;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Stored assistant proposal is invalid.');
  const data = parsed as Record<string, unknown>;
  if (typeof data.title !== 'string' || typeof data.priority !== 'string' || !['low','normal','high','critical'].includes(data.priority) || (data.description !== null && typeof data.description !== 'string') || (data.dueAt !== null && typeof data.dueAt !== 'string')) throw new Error('Stored assistant proposal failed validation.');
  return {title:data.title,description:data.description as string|null,priority:data.priority as ProposalData['priority'],dueAt:data.dueAt as string|null};
};
const map = (row:Row):AssistantTaskProposal => ({id:String(row.id),conversationId:String(row.conversation_id),actionType:'task.create',task:normalizeData(row.proposal_json),status:row.status as AssistantTaskProposal['status'],createdAt:row.created_at as Date,expiresAt:row.expires_at as Date,resultEntityId:row.result_entity_id==null?null:String(row.result_entity_id)});
const hash = (json:string) => createHash('sha256').update(json).digest('hex');

export async function createTaskProposal(conversationId:string,data:ProposalData,pool:Pool=getDatabasePool()):Promise<AssistantTaskProposal>{
  const id=randomUUID(); const json=JSON.stringify(data); const expiresAt=new Date(Date.now()+15*60_000);
  await pool.execute(`INSERT INTO assistant_action_proposals(id,conversation_id,action_type,proposal_json,proposal_hash,expires_at) VALUES(?,?,'task.create',?,?,?)`,[id,conversationId,json,hash(json),expiresAt]);
  const [rows]=await pool.execute<Row[]>('SELECT * FROM assistant_action_proposals WHERE id=?',[id]);
  return map(rows[0]);
}

export async function listTaskProposals(conversationId?:string,pool:Pool=getDatabasePool()):Promise<AssistantTaskProposal[]>{
  await pool.execute(`UPDATE assistant_action_proposals SET status='expired',reviewed_at=NOW(3) WHERE status='pending' AND expires_at<=NOW(3)`);
  const [rows]=conversationId
    ? await pool.execute<Row[]>('SELECT * FROM assistant_action_proposals WHERE conversation_id=? ORDER BY created_at DESC LIMIT 50',[conversationId])
    : await pool.query<Row[]>("SELECT * FROM assistant_action_proposals WHERE status='pending' ORDER BY created_at DESC LIMIT 50");
  return rows.map(map);
}

export async function decideTaskProposal(id:string,decision:'approve'|'reject',pool:Pool=getDatabasePool()):Promise<AssistantTaskProposal>{
  const connection:PoolConnection=await pool.getConnection();
  let createdTaskId:string|null=null;
  try {
    await connection.beginTransaction();
    const [rows]=await connection.execute<Row[]>('SELECT * FROM assistant_action_proposals WHERE id=? FOR UPDATE',[id]);
    const row=rows[0]; if(!row) throw new Error('Action proposal was not found.');
    if(row.status!=='pending') throw new Error(`This proposal is already ${String(row.status)}.`);
    const data=normalizeData(row.proposal_json);
    const json=JSON.stringify(data);
    if(hash(json)!==String(row.proposal_hash)) throw new Error('Proposal integrity check failed.');
    const [expired]=await connection.execute<Row[]>('SELECT expires_at<=NOW(3) AS expired FROM assistant_action_proposals WHERE id=?',[id]);
    if(Boolean(expired[0]?.expired)) {
      await connection.execute(`UPDATE assistant_action_proposals SET status='expired',reviewed_at=NOW(3) WHERE id=?`,[id]);
      await connection.commit();
      throw new Error('This proposal expired. Ask Sidekick to prepare it again.');
    }
    if(decision==='reject') await connection.execute(`UPDATE assistant_action_proposals SET status='rejected',reviewed_at=NOW(3) WHERE id=?`,[id]);
    else {
      const input:CreateTaskInput={title:data.title,description:data.description,priority:data.priority,dueAt:data.dueAt?new Date(data.dueAt):null};
      createdTaskId=await createTaskForAssistantProposal(input,id,connection);
      await connection.execute(`UPDATE assistant_action_proposals SET status='executed',result_entity_id=?,reviewed_at=NOW(3) WHERE id=?`,[createdTaskId,id]);
    }
    const [updated]=await connection.execute<Row[]>('SELECT * FROM assistant_action_proposals WHERE id=?',[id]);
    await connection.commit();
    if(createdTaskId){const task=await getTaskById(createdTaskId);if(task)publishAssistantEvent('task.created',{taskId:task.id,title:task.title});}
    return map(updated[0]);
  } catch(error) { await connection.rollback().catch(()=>undefined);throw error; }
  finally { connection.release(); }
}

export async function recordMessageFeedback(messageId:string,feedback:'helpful'|'not_helpful',pool:Pool=getDatabasePool()):Promise<void>{
  const [rows]=await pool.execute<Row[]>("SELECT id FROM assistant_messages WHERE id=? AND role='assistant'",[messageId]);
  if(!rows[0])throw new Error('Assistant response was not found.');
  await pool.execute(`INSERT INTO assistant_feedback(id,message_id,feedback) VALUES(?,?,?) ON DUPLICATE KEY UPDATE feedback=VALUES(feedback),created_at=NOW(3)`,[randomUUID(),messageId,feedback]);
}

export async function activeTaskDelayModel(pool:Pool=getDatabasePool()):Promise<TaskDelayModel|null>{
  const [rows]=await pool.query<Row[]>("SELECT model_version,feature_version,weights_json,artifact_sha256,sample_count,late_count,on_time_count,model_brier,baseline_brier,calibration_error,data_start,data_end,trained_at FROM assistant_task_delay_models WHERE state='active' LIMIT 1");
  const row=rows[0];if(!row)return null;
  if(Number(row.feature_version)!==1)return null;
  const raw=typeof row.weights_json==='string'?JSON.parse(row.weights_json) as unknown:row.weights_json;
  if(!Array.isArray(raw)||raw.some(value=>typeof value!=='number'||!Number.isFinite(value)))return null;
  if(typeof row.artifact_sha256!=='string'||hash(JSON.stringify(raw))!==row.artifact_sha256)return null;
  return {featureVersion:1,modelVersion:Number(row.model_version),weights:raw as number[],sampleCount:Number(row.sample_count),lateCount:Number(row.late_count),onTimeCount:Number(row.on_time_count),modelBrier:Number(row.model_brier),baselineBrier:Number(row.baseline_brier),calibrationError:Number(row.calibration_error),dataStart:row.data_start as Date,dataEnd:row.data_end as Date,trainedAt:row.trained_at as Date};
}

export async function saveTaskDelayModel(model:TaskDelayModel,pool:Pool=getDatabasePool()):Promise<TaskDelayModel>{
  const connection=await pool.getConnection();
  try{
    await connection.beginTransaction();
    const [versions]=await connection.query<Row[]>('SELECT COALESCE(MAX(model_version),0)+1 AS next_version FROM assistant_task_delay_models');
    const modelVersion=Number(versions[0]?.next_version??1);
    const weightsJson=JSON.stringify(model.weights);
    await connection.execute("UPDATE assistant_task_delay_models SET state='retired' WHERE state='active'");
    await connection.execute(`INSERT INTO assistant_task_delay_models(id,model_version,feature_version,weights_json,artifact_sha256,sample_count,late_count,on_time_count,model_brier,baseline_brier,calibration_error,data_start,data_end,trained_at,state) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active')`,[randomUUID(),modelVersion,model.featureVersion,weightsJson,hash(weightsJson),model.sampleCount,model.lateCount,model.onTimeCount,model.modelBrier,model.baselineBrier,model.calibrationError,model.dataStart,model.dataEnd,model.trainedAt]);
    await connection.commit();
    return {...model,modelVersion};
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}

export async function clearTaskDelayModels(pool:Pool=getDatabasePool()):Promise<void>{
  await pool.execute('DELETE FROM assistant_task_delay_models');
}

export async function claimBackgroundReasoningAttempt(pool:Pool=getDatabasePool()):Promise<boolean>{
  const [result]=await pool.execute(`UPDATE assistant_preferences SET last_ai_reasoning_attempt_at=NOW(3) WHERE id=1 AND background_reasoning_enabled=TRUE AND local_model_name<>'' AND (last_ai_reasoning_attempt_at IS NULL OR last_ai_reasoning_attempt_at<=DATE_SUB(NOW(3),INTERVAL 60 MINUTE))`);
  return Number((result as {affectedRows?:number}).affectedRows??0)>0;
}

export async function createReasoningActivity(input:{dedupeKey:string;title:string;description:string;payload:Record<string,unknown>}):Promise<void>{
  const saved=await insertActivity({dedupeKey:input.dedupeKey,eventType:'assistant.ai_reasoning',severity:'normal',title:input.title,description:input.description,payload:input.payload});
  if(saved.inserted)publishAssistantEvent('assistant.activity.created',{activityId:saved.activity.id,eventType:saved.activity.eventType});
}
