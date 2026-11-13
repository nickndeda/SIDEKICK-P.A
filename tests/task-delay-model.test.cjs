const test = require('node:test');
const assert = require('node:assert/strict');
const { trainTaskDelayModel, estimateTaskDelay } = require('../dist/main/core/task-delay-model.js');

function fixture(count=240) {
  const rows=[];
  const start=new Date('2024-01-01T08:00:00');
  for(let i=0;i<count;i++) {
    const createdAt=new Date(start.getTime()+i*86_400_000);
    const priority=i%2===0?'critical':'normal';
    const late=priority==='critical' ? i%10!==0 : i%10===1;
    const dueAt=new Date(createdAt.getTime()+(i%5+1)*86_400_000);
    const completedAt=new Date(dueAt.getTime()+(late?86_400_000:-3_600_000));
    rows.push({id:String(i),priority,status:'completed',createdAt,dueAt,completedAt});
  }
  return rows;
}

test('model declines to train on sparse personal history',()=>{
  const result=trainTaskDelayModel(fixture(30));
  assert.equal(result.status,'insufficient_data');
  assert.equal(result.sampleCount,30);
});

test('model trains only when chronological holdout beats base-rate baseline',()=>{
  const result=trainTaskDelayModel(fixture());
  assert.equal(result.status,'ready',result.reason);
  assert.equal(result.model.sampleCount,240);
  assert.ok(result.model.modelBrier<result.model.baselineBrier);
  const current={id:'new',priority:'critical',status:'pending',createdAt:new Date('2026-11-13T09:00:00'),dueAt:new Date('2026-11-15T09:00:00'),completedAt:null};
  const estimate=estimateTaskDelay(current,fixture(),result.model);
  assert.equal(estimate.method,'logistic_regression');
  assert.ok(estimate.probabilityLate>0.5);
});

test('model emits no personal probability when disabled or task lacks due date',()=>{
  const task={id:'1',priority:'normal',status:'pending',createdAt:new Date(),dueAt:null,completedAt:null};
  assert.equal(estimateTaskDelay(task,fixture(),null).probabilityLate,null);
  assert.equal(estimateTaskDelay(task,fixture(),null).band,'unknown');
});
