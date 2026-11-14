const test=require('node:test');
const assert=require('node:assert/strict');
const {rankRelevantMemories,selectRelevantContextSources}=require('../dist/main/core/assistant-context-policy.js');

const all={planner:true,productivity:true,wellness:true,finance:true,learning:true};

test('context selection includes only matching enabled domains for specific questions',()=>{
  assert.deepEqual(selectRelevantContextSources('Show my upcoming finance bills',all),{planner:true,productivity:false,wellness:false,finance:true,learning:false});
  assert.deepEqual(selectRelevantContextSources('How much focus time did I log?',{...all,productivity:false}),{planner:false,productivity:false,wellness:false,finance:false,learning:false});
});

test('vague daily-planning questions use the core sources and broad summaries use enabled sources',()=>{
  assert.deepEqual(selectRelevantContextSources('What should I do today?',all),{planner:true,productivity:true,wellness:false,finance:false,learning:true});
  assert.deepEqual(selectRelevantContextSources('What should I focus on today?',all),{planner:true,productivity:true,wellness:false,finance:false,learning:false});
  assert.deepEqual(selectRelevantContextSources('Give me an overall summary',{...all,finance:false}),{planner:true,productivity:true,wellness:true,finance:false,learning:true});
});

test('memory retrieval ranks query-relevant memories and limits the result set',()=>{
  const at=new Date('2026-11-14T10:00:00Z');
  const memories=[
    {id:'1',label:'Study style',content:'I prefer short biology revision sessions.',enabled:true,expiresAt:null,updatedAt:at},
    {id:'2',label:'Coffee',content:'I drink black coffee in the morning.',enabled:true,expiresAt:null,updatedAt:at},
    {id:'3',label:'Biology exam',content:'Biology exam is on Friday.',enabled:true,expiresAt:null,updatedAt:at},
    {id:'4',label:'Older biology',content:'Biology notes are in the blue folder.',enabled:true,expiresAt:null,updatedAt:new Date(at.getTime()-1000)}
  ];
  assert.deepEqual(rankRelevantMemories(memories,'Help me plan biology revision',2).map(item=>item.id),['1','3']);
  assert.deepEqual(rankRelevantMemories(memories,'Hello there',3),[]);
});
