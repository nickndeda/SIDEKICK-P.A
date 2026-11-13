export interface TaskOutcomeRecord {
  id:string;priority:'low'|'normal'|'high'|'critical';status:string;createdAt:Date;dueAt:Date|null;completedAt:Date|null;
}

export interface TaskDelayModel {
  featureVersion:1;modelVersion:number;weights:number[];sampleCount:number;lateCount:number;onTimeCount:number;
  modelBrier:number;baselineBrier:number;calibrationError:number;trainedAt:Date;dataStart:Date;dataEnd:Date;
}

export type TaskDelayTrainingResult =
  | {status:'insufficient_data';reason:string;sampleCount:number;lateCount:number;onTimeCount:number}
  | {status:'not_better_than_baseline';reason:string;sampleCount:number;lateCount:number;onTimeCount:number;modelBrier:number;baselineBrier:number}
  | {status:'poor_calibration';reason:string;sampleCount:number;lateCount:number;onTimeCount:number;modelBrier:number;baselineBrier:number;calibrationError:number}
  | {status:'ready';model:TaskDelayModel;modelVersion:number};

const MIN_TOTAL=200,MIN_CLASS=40,MIN_HOLDOUT=40,MAX_SAMPLES=1200,FEATURES=10;
const PRIORITY:Record<TaskOutcomeRecord['priority'],number>={low:0,normal:1,high:2,critical:3};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

function validOutcome(record:TaskOutcomeRecord):boolean{
  return record.status==='completed'&&['low','normal','high','critical'].includes(record.priority)&&record.dueAt instanceof Date&&Number.isFinite(record.dueAt.getTime())&&record.completedAt instanceof Date&&Number.isFinite(record.completedAt.getTime())&&record.createdAt instanceof Date&&Number.isFinite(record.createdAt.getTime())&&record.dueAt.getTime()>=record.createdAt.getTime();
}

function features(record:TaskOutcomeRecord,prior:TaskOutcomeRecord[]):number[]{
  const day=record.createdAt.getDay(), dueDay=record.dueAt!.getDay();
  const leadDays=clamp((record.dueAt!.getTime()-record.createdAt.getTime())/86_400_000,0,30)/30;
  const history=prior.filter(item=>item.completedAt!.getTime()<record.createdAt.getTime());
  const late=history.filter(item=>item.completedAt!.getTime()>item.dueAt!.getTime()).length;
  const priorRate=(late+1)/(history.length+2);
  return [1,PRIORITY[record.priority]/3,leadDays,Math.sin(day*2*Math.PI/7),Math.cos(day*2*Math.PI/7),Math.sin(dueDay*2*Math.PI/7),Math.cos(dueDay*2*Math.PI/7),Math.sin(record.createdAt.getHours()*2*Math.PI/24),Math.cos(record.createdAt.getHours()*2*Math.PI/24),priorRate];
}

const sigmoid=(z:number)=>1/(1+Math.exp(-clamp(z,-30,30)));
const dot=(a:number[],b:number[])=>a.reduce((sum,value,index)=>sum+value*b[index],0);

function fit(rows:Array<{x:number[];y:number}>):number[]{
  const weights=Array<number>(FEATURES).fill(0);
  const rate=0.04,lambda=0.08,epochs=1600;
  for(let epoch=0;epoch<epochs;epoch++){
    const gradient=Array<number>(FEATURES).fill(0);
    for(const row of rows){const error=sigmoid(dot(weights,row.x))-row.y;for(let i=0;i<FEATURES;i++)gradient[i]+=error*row.x[i];}
    for(let i=0;i<FEATURES;i++)weights[i]-=rate*(gradient[i]/rows.length+(i===0?0:lambda*weights[i]));
  }
  return weights;
}

const brier=(rows:Array<{x:number[];y:number}>,weights:number[])=>rows.reduce((sum,row)=>sum+(sigmoid(dot(weights,row.x))-row.y)**2,0)/rows.length;
function calibrationError(rows:Array<{x:number[];y:number}>,weights:number[],binCount=5):number{
  let error=0;
  for(let bin=0;bin<binCount;bin++){
    const start=bin/binCount,end=(bin+1)/binCount;
    const selected=rows.filter(row=>{const p=sigmoid(dot(weights,row.x));return p>=start&&(bin===binCount-1?p<=end:p<end);});
    if(!selected.length)continue;
    const meanPrediction=selected.reduce((sum,row)=>sum+sigmoid(dot(weights,row.x)),0)/selected.length;
    const observed=selected.reduce((sum,row)=>sum+row.y,0)/selected.length;
    error+=(selected.length/rows.length)*Math.abs(meanPrediction-observed);
  }
  return error;
}

/** Trains only on completed, due-dated tasks and validates on a chronological holdout. */
export function trainTaskDelayModel(records:TaskOutcomeRecord[],trainedAt=new Date()):TaskDelayTrainingResult{
  const eligible=records.filter(validOutcome).sort((a,b)=>a.createdAt.getTime()-b.createdAt.getTime()).slice(-MAX_SAMPLES);
  const allLate=eligible.filter(row=>row.completedAt!.getTime()>row.dueAt!.getTime()).length;
  const allOnTime=eligible.length-allLate;
  if(eligible.length<MIN_TOTAL||allLate<MIN_CLASS||allOnTime<MIN_CLASS)return {status:'insufficient_data',reason:`Needs at least ${MIN_TOTAL} completed tasks with due dates, including ${MIN_CLASS} late and ${MIN_CLASS} on-time outcomes.`,sampleCount:eligible.length,lateCount:allLate,onTimeCount:allOnTime};
  const split=Math.floor(eligible.length*0.8),trainRecords=eligible.slice(0,split),testRecords=eligible.slice(split);
  if(testRecords.length<MIN_HOLDOUT)return {status:'insufficient_data',reason:`Needs at least ${MIN_HOLDOUT} tasks in the chronological evaluation window.`,sampleCount:eligible.length,lateCount:allLate,onTimeCount:allOnTime};
  const makeRows=(selection:TaskOutcomeRecord[])=>selection.map(record=>({x:features(record,eligible.filter(item=>item.id!==record.id&&item.createdAt.getTime()<record.createdAt.getTime())),y:Number(record.completedAt!.getTime()>record.dueAt!.getTime())}));
  const trainRows=makeRows(trainRecords),testRows=makeRows(testRecords);
  const trainLate=trainRows.filter(row=>row.y===1).length,trainOnTime=trainRows.length-trainLate;
  if(trainLate<MIN_CLASS||trainOnTime<MIN_CLASS)return {status:'insufficient_data',reason:'The earlier training window does not contain enough examples from both outcome classes.',sampleCount:eligible.length,lateCount:allLate,onTimeCount:allOnTime};
  if(testRows.filter(row=>row.y===1).length<10||testRows.filter(row=>row.y===0).length<10)return {status:'insufficient_data',reason:'The chronological evaluation window must contain at least 10 examples of each outcome.',sampleCount:eligible.length,lateCount:allLate,onTimeCount:allOnTime};
  const weights=fit(trainRows),modelBrier=brier(testRows,weights),baseRate=trainRows.reduce((sum,row)=>sum+row.y,0)/trainRows.length,baselineBrier=testRows.reduce((sum,row)=>sum+(baseRate-row.y)**2,0)/testRows.length;
  if(!Number.isFinite(modelBrier)||modelBrier>=baselineBrier*0.95)return {status:'not_better_than_baseline',reason:'Chronological holdout did not show at least a 5% Brier-score improvement over the training base rate.',sampleCount:eligible.length,lateCount:allLate,onTimeCount:allOnTime,modelBrier,baselineBrier};
  const ece=calibrationError(testRows,weights);
  if(!Number.isFinite(ece)||ece>0.15)return {status:'poor_calibration',reason:'Chronological holdout calibration error exceeded the 0.15 release limit.',sampleCount:eligible.length,lateCount:allLate,onTimeCount:allOnTime,modelBrier,baselineBrier,calibrationError:ece};
  return {status:'ready',model:{featureVersion:1,modelVersion:0,weights,sampleCount:eligible.length,lateCount:allLate,onTimeCount:allOnTime,modelBrier,baselineBrier,calibrationError:ece,trainedAt,dataStart:eligible[0].createdAt,dataEnd:eligible.at(-1)!.createdAt},modelVersion:0};
}

export function estimateTaskDelay(record:TaskOutcomeRecord,history:TaskOutcomeRecord[],model:TaskDelayModel|null):{probabilityLate:number|null;band:'low'|'elevated'|'high'|'unknown';method:'rules'|'logistic_regression';evidence:string[];sampleCount:number}{
  if(!record.dueAt||!Number.isFinite(record.dueAt.getTime()))return {probabilityLate:null,band:'unknown',method:'rules',evidence:['This task has no due date.'],sampleCount:0};
  const relevant=history.filter(item=>validOutcome(item)&&item.completedAt!.getTime()<record.createdAt.getTime());
  if(!model||model.featureVersion!==1||model.weights.length!==FEATURES)return {probabilityLate:null,band:'unknown',method:'rules',evidence:['Not enough evaluated history for a personalized probability.','The deadline and priority rules remain available.'],sampleCount:relevant.length};
  const probabilityLate=sigmoid(dot(model.weights,features(record,relevant)));
  return {probabilityLate,band:probabilityLate>=0.75?'high':probabilityLate>=0.5?'elevated':'low',method:'logistic_regression',evidence:[`Personal model v${model.modelVersion} used ${model.sampleCount} completed tasks; holdout Brier ${model.modelBrier.toFixed(3)} versus ${model.baselineBrier.toFixed(3)} baseline; calibration error ${model.calibrationError.toFixed(3)}.`],sampleCount:model.sampleCount};
}
