const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const db=require('../dist/main/database/connection.js');
const chat=require('../dist/main/core/assistant-conversation-service.js');
const tasks=require('../dist/main/repositories/task-repository.js');

test('opt-in background reasoning creates only evidence-linked activity and restores test data',async()=>{
  let capturedTaskRef=null;
  const server=http.createServer((request,response)=>{
    let body='';request.on('data',chunk=>body+=chunk);request.on('end',()=>{
      const parsed=JSON.parse(body);assert.ok(parsed.format);const source=JSON.parse(parsed.messages.at(-1).content);capturedTaskRef=source.tasks.find(item=>item.title==='Temporary background reasoning integration task')?.ref??null;
      response.writeHead(200,{'content-type':'application/json'});
      response.end(JSON.stringify({message:{content:JSON.stringify({title:'Make room for an upcoming task',description:'Set aside a short focus block for this upcoming deadline.',evidenceIds:capturedTaskRef?[capturedTaskRef]:[]})}}));
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const original=await chat.getAssistantPreferences();const pool=db.getDatabasePool();let taskId=null;let dedupeKey=null;
  const [priorAttempt]=await pool.query('SELECT last_ai_reasoning_attempt_at FROM assistant_preferences WHERE id=1');
  try{
    const address=server.address();
    await chat.updateAssistantPreferences({...original,localModelUrl:`http://127.0.0.1:${address.port}`,localModelName:'background-fake',backgroundReasoningEnabled:true});
    const dueAt=new Date(Date.now()+15*60_000);
    const task=await tasks.createTask({title:'Temporary background reasoning integration task',priority:'critical',dueAt});taskId=task.id;
    await chat.runAssistantBackgroundReasoning();
    assert.ok(capturedTaskRef, 'test task should appear in the due-task context');
    dedupeKey=`assistant.ai_reasoning:${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;
    const [rows]=await pool.execute('SELECT payload_json,description FROM assistant_activity WHERE dedupe_key=?',[dedupeKey]);
    assert.equal(rows.length,1,'one daily reasoning activity should be stored');
    assert.ok(String(rows[0].description).includes('Temporary background reasoning integration task'));
    const payload=typeof rows[0].payload_json==='string'?JSON.parse(rows[0].payload_json):rows[0].payload_json;
    assert.deepEqual(payload.evidenceIds,[capturedTaskRef]);
  }finally{
    await chat.updateAssistantPreferences(original).catch(()=>undefined);
    await pool.execute('UPDATE assistant_preferences SET last_ai_reasoning_attempt_at=? WHERE id=1',[priorAttempt[0]?.last_ai_reasoning_attempt_at??null]).catch(()=>{});
    if(dedupeKey)await pool.execute('DELETE FROM assistant_activity WHERE dedupe_key=?',[dedupeKey]).catch(()=>{});
    if(taskId)await pool.execute('DELETE FROM tasks WHERE id=?',[taskId]).catch(()=>{});
    await new Promise(resolve=>server.close(resolve));
    await db.closeDatabaseConnection();
  }
});
