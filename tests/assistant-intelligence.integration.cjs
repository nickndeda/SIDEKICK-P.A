const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const db=require('../dist/main/database/connection.js');
const chat=require('../dist/main/core/assistant-conversation-service.js');
const conversations=require('../dist/main/repositories/assistant-conversation-repository.js');
const intelligence=require('../dist/main/repositories/assistant-intelligence-repository.js');

test('local structured response becomes a user-approved Planner task only after explicit intent',async()=>{
  const receivedBodies=[];
  const server=http.createServer((request,response)=>{
    if(request.url==='/api/tags'){
      response.writeHead(200,{'content-type':'application/json'});
      response.end(JSON.stringify({models:[{name:'integration-fake'}]}));
      return;
    }
    let body='';request.on('data',chunk=>body+=chunk);request.on('end',()=>{
      const parsed=JSON.parse(body);receivedBodies.push(parsed);assert.ok(parsed.format);assert.equal(parsed.stream,false);
      response.writeHead(200,{'content-type':'application/json'});
      response.end(JSON.stringify({message:{content:JSON.stringify({kind:'task_proposal',answer:'I drafted the task for your review.',task:{title:'Integration task',description:'Temporary smoke test',priority:'normal',dueAt:'2026-11-30T12:00:00.000Z'}})}}));
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const original=await chat.getAssistantPreferences();const pool=db.getDatabasePool();const proposalIds=[];const conversationIds=[];let memoryId=null;
  try{
    const address=server.address();
    await chat.updateAssistantPreferences({...original,localModelUrl:`http://127.0.0.1:${address.port}`,localModelName:'integration-fake',backgroundReasoningEnabled:false});
    assert.equal((await chat.checkLocalModel()).available,true,'health check should confirm the configured model is installed');
    await chat.updateAssistantPreferences({...original,localModelUrl:`http://127.0.0.1:${address.port}`,localModelName:'missing-fake',backgroundReasoningEnabled:false});
    assert.equal((await chat.checkLocalModel()).available,false,'health check must fail when the configured model is missing');
    await chat.updateAssistantPreferences({...original,localModelUrl:`http://127.0.0.1:${address.port}`,localModelName:'integration-fake',backgroundReasoningEnabled:false});
    await chat.updateAssistantPreferences({...original,localModelUrl:`http://127.0.0.1:${address.port}`,localModelName:'integration-fake',backgroundReasoningEnabled:false,contextSources:{...original.contextSources,finance:false}});
    const privateContextChat=await chat.sendAssistantMessage(null,'What bills are coming up?');conversationIds.push(privateContextChat.id);
    const privateContextBody=receivedBodies.find(body=>body.messages.at(-1)?.content==='What bills are coming up?');
    assert.ok(privateContextBody?.messages[0]?.content.includes('"finance":null'),'disabled finance context must not reach the local model');
    assert.ok(privateContextBody?.messages[0]?.content.includes('"omittedModules":["planner","productivity","wellness","finance","learning"]'),'source omissions should be explicit to the model');
    await chat.updateAssistantPreferences({...original,localModelUrl:`http://127.0.0.1:${address.port}`,localModelName:'integration-fake',backgroundReasoningEnabled:false});
    const taskChat=await chat.sendAssistantMessage(null,'Please create a task to review my term notes.');conversationIds.push(taskChat.id);
    let proposals=await intelligence.listTaskProposals(taskChat.id);
    assert.equal(proposals.length,1);proposalIds.push(proposals[0].id);
    assert.equal(proposals[0].task.dueAt,null,'the model must not invent a deadline that the user did not request');
    const [before]=await pool.execute('SELECT COUNT(*) AS count FROM tasks WHERE assistant_proposal_id=?',[proposals[0].id]);
    assert.equal(Number(before[0].count),0,'model output must not create a task before approval');
    const result=await chat.decideAssistantProposal(proposals[0].id,'approve');
    assert.equal(result.status,'executed');assert.ok(result.resultEntityId);
    const [after]=await pool.execute('SELECT COUNT(*) AS count FROM tasks WHERE assistant_proposal_id=?',[proposals[0].id]);
    assert.equal(Number(after[0].count),1);
    await assert.rejects(()=>chat.decideAssistantProposal(proposals[0].id,'approve'));

    const infoChat=await chat.sendAssistantMessage(null,'What is on my schedule?');conversationIds.push(infoChat.id);
    assert.equal((await intelligence.listTaskProposals(infoChat.id)).length,0,'model action output is ignored without explicit user intent');
    assert.equal(infoChat.messages.length,2);
    const refusedChat=await chat.sendAssistantMessage(null,"Please don't create a task; just explain what I should focus on.");conversationIds.push(refusedChat.id);
    assert.equal((await intelligence.listTaskProposals(refusedChat.id)).length,0,'a negated task request must never become an action proposal');
    const continuityChat=await chat.sendAssistantMessage(null,'For this conversation, remember my study subject is biology.');conversationIds.push(continuityChat.id);
    const followupChat=await chat.sendAssistantMessage(continuityChat.id,'Which subject did I mention?');
    const followupBody=receivedBodies.find(body=>body.messages.at(-1)?.content==='Which subject did I mention?');
    assert.ok(followupBody?.messages.some(item=>item.role==='user'&&item.content.includes('my study subject is biology')),'the local provider must receive the prior user turn for continuity');
    assert.equal(followupChat.messages.filter(item=>item.role==='user').length,2,'the stored conversation must retain both turns');
    const noDeadlineChat=await chat.sendAssistantMessage(null,'Create a task titled Temporary no-deadline check. Do not add a due date.');conversationIds.push(noDeadlineChat.id);
    const noDeadlineProposal=await intelligence.listTaskProposals(noDeadlineChat.id);
    assert.equal(noDeadlineProposal.length,1);
    assert.equal(noDeadlineProposal[0].task.dueAt,null,'explicitly declined due dates must not be added from model output');
    await chat.saveAssistantMemory({id:null,label:'Integration expiry memory',content:'Temporary preference',enabled:true,expiresAt:new Date(Date.now()+60_000)});
    const storedMemory=(await chat.getAssistantMemories()).find(item=>item.label==='Integration expiry memory');
    assert.ok(storedMemory?.expiresAt,'memory expiry must persist');memoryId=storedMemory.id;
    const exported=await chat.exportAssistantUserData();
    assert.equal(exported.schemaVersion,1);
    assert.ok(exported.conversations.some(item=>conversationIds.includes(item.id)),'export should include persistent conversation history');
    assert.ok(exported.memories.some(item=>item.id===memoryId),'export should include user-managed memories');
  }finally{
    await chat.updateAssistantPreferences(original).catch(()=>undefined);
    if(memoryId)await chat.removeAssistantMemory(memoryId).catch(()=>{});
    for(const id of proposalIds)await pool.execute('DELETE FROM tasks WHERE assistant_proposal_id=?',[id]).catch(()=>{});
    for(const id of conversationIds)await conversations.deleteConversation(id).catch(()=>{});
    await new Promise(resolve=>server.close(resolve));
    await db.closeDatabaseConnection();
  }
});
