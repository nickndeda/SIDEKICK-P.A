const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const db=require('../dist/main/database/connection.js');
const chat=require('../dist/main/core/assistant-conversation-service.js');
const conversations=require('../dist/main/repositories/assistant-conversation-repository.js');
const intelligence=require('../dist/main/repositories/assistant-intelligence-repository.js');

test('local structured response becomes a user-approved Planner task only after explicit intent',async()=>{
  const server=http.createServer((request,response)=>{
    let body='';request.on('data',chunk=>body+=chunk);request.on('end',()=>{
      const parsed=JSON.parse(body);assert.ok(parsed.format);assert.equal(parsed.stream,false);
      response.writeHead(200,{'content-type':'application/json'});
      response.end(JSON.stringify({message:{content:JSON.stringify({kind:'task_proposal',answer:'I drafted the task for your review.',task:{title:'Integration task',description:'Temporary smoke test',priority:'normal',dueAt:null}})}}));
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const original=await chat.getAssistantPreferences();const pool=db.getDatabasePool();const proposalIds=[];const conversationIds=[];let memoryId=null;
  try{
    const address=server.address();
    await chat.updateAssistantPreferences({...original,localModelUrl:`http://127.0.0.1:${address.port}`,localModelName:'integration-fake',backgroundReasoningEnabled:false});
    const taskChat=await chat.sendAssistantMessage(null,'Please create a task to review my term notes.');conversationIds.push(taskChat.id);
    let proposals=await intelligence.listTaskProposals(taskChat.id);
    assert.equal(proposals.length,1);proposalIds.push(proposals[0].id);
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
    await chat.saveAssistantMemory({id:null,label:'Integration expiry memory',content:'Temporary preference',enabled:true,expiresAt:new Date(Date.now()+60_000)});
    const storedMemory=(await chat.getAssistantMemories()).find(item=>item.label==='Integration expiry memory');
    assert.ok(storedMemory?.expiresAt,'memory expiry must persist');memoryId=storedMemory.id;
  }finally{
    await chat.updateAssistantPreferences(original).catch(()=>undefined);
    if(memoryId)await chat.removeAssistantMemory(memoryId).catch(()=>{});
    for(const id of proposalIds)await pool.execute('DELETE FROM tasks WHERE assistant_proposal_id=?',[id]).catch(()=>{});
    for(const id of conversationIds)await conversations.deleteConversation(id).catch(()=>{});
    await new Promise(resolve=>server.close(resolve));
    await db.closeDatabaseConnection();
  }
});
