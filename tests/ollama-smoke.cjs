const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const assistant = require('../dist/main/core/assistant-conversation-service.js');
const conversations = require('../dist/main/repositories/assistant-conversation-repository.js');
const tasks = require('../dist/main/repositories/task-repository.js');
const eventBus = require('../dist/main/core/event-bus.js').assistantEventBus;
const database = require('../dist/main/database/connection.js');

async function main() {
  const preferences = await assistant.getAssistantPreferences();
  assert.equal(preferences.localModelUrl, 'http://127.0.0.1:11434', 'configure the local Ollama URL first');
  assert.equal(preferences.localModelName, 'llama3.2:1b', 'configure llama3.2:1b first');

  const health = await assistant.checkLocalModel();
  assert.equal(health.available, true, health.message);
  assert.ok(health.models.includes(preferences.localModelName), 'Ollama must have the configured model installed');

  let chat = null;
  let actionChat = null;
  let createdTaskId = null;
  let backgroundTaskId = null;
  let backgroundActivityId = null;
  let backgroundDecisionId = null;
  let stopBackgroundTriggers = null;
  const timings={firstChatMs:0,followupMs:0,taskProposalMs:0};
  const pool = database.getDatabasePool();
  const localDay=new Date();
  const reasoningKey=`assistant.ai_reasoning:${localDay.getFullYear()}-${String(localDay.getMonth()+1).padStart(2,'0')}-${String(localDay.getDate()).padStart(2,'0')}`;
  const [priorAttempt]=await pool.query('SELECT last_ai_reasoning_attempt_at FROM assistant_preferences WHERE id=1');
  try {
    let started=performance.now();
    chat = await assistant.sendAssistantMessage(null, 'For this conversation, remember that my code word is cobalt. Reply briefly.');
    timings.firstChatMs=Math.round(performance.now()-started);
    assert.equal(chat.messages.at(-1)?.provider, 'ollama', 'Sidekick should return a real local-model response');
    started=performance.now();
    chat = await assistant.sendAssistantMessage(chat.id, 'What is my code word? Do not create or change any task.');
    timings.followupMs=Math.round(performance.now()-started);
    assert.equal(chat.messages.at(-1)?.provider, 'ollama', 'follow-up should reach the real local model');
    assert.match(chat.messages.at(-1)?.content ?? '', /cobalt/i, 'the local model should use the persisted conversation turn');
    assert.equal((await assistant.getAssistantProposals(chat.id)).length, 0, 'a general request must not create an action proposal');

    const suffix = randomUUID().slice(0, 8);
    started=performance.now();
    actionChat = await assistant.sendAssistantMessage(null, `Create a Planner task titled Sidekick Ollama smoke ${suffix}. Do not assign a due date.`);
    timings.taskProposalMs=Math.round(performance.now()-started);
    assert.equal(actionChat.messages.at(-1)?.provider, 'ollama', `task request should reach the real local model: ${actionChat.messages.at(-1)?.content ?? 'no response'}`);
    const proposals = await assistant.getAssistantProposals(actionChat.id);
    assert.equal(proposals.length, 1, 'explicit task request should produce one pending proposal');
    assert.equal(proposals[0].task.dueAt, null, 'Sidekick must not attach a due date when none was requested');

    const before = await pool.execute('SELECT COUNT(*) AS count FROM tasks WHERE assistant_proposal_id=?', [proposals[0].id]);
    assert.equal(Number(before[0][0].count), 0, 'model output must wait for user approval');
    const result = await assistant.decideAssistantProposal(proposals[0].id, 'approve');
    assert.equal(result.status, 'executed');
    createdTaskId = result.resultEntityId;
    assert.ok(createdTaskId, 'approval should return the created task ID');

    let backgroundReasoning='skipped_disabled';
    if(preferences.backgroundReasoningEnabled&&(preferences.contextSources.planner||preferences.contextSources.learning)){
      const [existingActivity]=await pool.execute('SELECT id FROM assistant_activity WHERE dedupe_key=?',[reasoningKey]);
      if(!existingActivity.length){
        stopBackgroundTriggers=assistant.startAssistantBackgroundReasoningTriggers();
        const task=await tasks.createTask({title:`Sidekick background smoke ${suffix}`,description:'Temporary urgent item for local reasoning verification.',priority:'critical',dueAt:new Date(Date.now()+5*60_000)});
        backgroundTaskId=task.id;
        await eventBus.emit('task.created',{taskId:task.id,title:task.title});
        const deadline=Date.now()+55_000;
        while(Date.now()<deadline){
          const [rows]=await pool.execute('SELECT id,payload_json FROM assistant_activity WHERE dedupe_key=?',[reasoningKey]);
          if(rows[0]){
            backgroundActivityId=rows[0].id;
            const payload=typeof rows[0].payload_json==='string'?JSON.parse(rows[0].payload_json):rows[0].payload_json;
            assert.ok(Array.isArray(payload.evidenceIds)&&payload.evidenceIds.length>0,'background recommendation must cite evidence');
            assert.ok(payload.evidenceIds.includes(`task:${task.id}`),'background recommendation should cite the urgent source task');
            const [decisions]=await pool.execute('SELECT id,outcome,evidence_ids_json FROM assistant_reasoning_decisions WHERE activity_id=?',[backgroundActivityId]);
            assert.equal(decisions[0]?.outcome,'recommendation','a recommendation must have an audit decision record');
            backgroundDecisionId=decisions[0]?.id??null;
            backgroundReasoning='passed';
            break;
          }
          await new Promise(resolve=>setTimeout(resolve,500));
        }
        assert.equal(backgroundReasoning,'passed','real event-triggered reasoning should create an evidence-backed recommendation');
      }else backgroundReasoning='skipped_existing_daily_recommendation';
    }
    let loadedModelBytes=null;
    try{const running=await fetch(`${preferences.localModelUrl}/api/ps`);const data=await running.json();loadedModelBytes=data.models?.find(model=>model.name===preferences.localModelName)?.size??null;}catch{}
    console.log(JSON.stringify({result:'passed',model:preferences.localModelName,firstChatMs:timings.firstChatMs,followupMs:timings.followupMs,taskProposalMs:timings.taskProposalMs,backgroundReasoning,loadedModelBytes,checks:['multi-turn chat','no-action guard','approval-gated task proposal','no invented deadline','event-triggered evidence-backed recommendation']}));
  } finally {
    stopBackgroundTriggers?.();
    assistant.stopAssistantBackgroundReasoning();
    if(backgroundDecisionId)await pool.execute('DELETE FROM assistant_reasoning_decisions WHERE id=?',[backgroundDecisionId]).catch(()=>undefined);
    if(backgroundActivityId)await pool.execute('DELETE FROM assistant_activity WHERE id=?',[backgroundActivityId]).catch(()=>undefined);
    if(backgroundTaskId)await pool.execute('DELETE FROM tasks WHERE id=?',[backgroundTaskId]).catch(()=>undefined);
    await pool.execute('UPDATE assistant_preferences SET last_ai_reasoning_attempt_at=? WHERE id=1',[priorAttempt[0]?.last_ai_reasoning_attempt_at??null]).catch(()=>undefined);
    if (createdTaskId) await pool.execute('DELETE FROM tasks WHERE id=?', [createdTaskId]).catch(() => undefined);
    if (actionChat) await conversations.deleteConversation(actionChat.id).catch(() => undefined);
    if (chat) await conversations.deleteConversation(chat.id).catch(() => undefined);
    await database.closeDatabaseConnection();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Ollama smoke test failed.');
  process.exitCode = 1;
});
