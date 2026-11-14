import type { AssistantContextSources, AssistantMemory } from '../../shared/types/assistant';

const modulePatterns:Record<keyof AssistantContextSources,RegExp>={
  planner:/\b(task|tasks|planner|todo|to-do|deadline|deadlines|overdue|upcoming|schedule|scheduled|plan|planning|priority|focus on)\b/i,
  productivity:/\b(productivity|focus|focused|session|sessions|pomodoro|worked|work time)\b/i,
  wellness:/\b(wellness|water|hydration|movement|exercise|eyes?|screen break|sleep|bedtime|wake up)\b/i,
  finance:/\b(finance|bill|bills|payment|payments|expense|expenses|budget|money|spending)\b/i,
  learning:/\b(learning|learn|study|studying|revision|revisions|subject|subjects|topic|topics|quiz|exam|school)\b/i
};
const sources: (keyof AssistantContextSources)[]=['planner','productivity','wellness','finance','learning'];
const coreSources: (keyof AssistantContextSources)[]=['planner','productivity','learning'];

/** Selects only explicitly relevant enabled sources; vague daily-planning requests use the low-sensitivity core. */
export function selectRelevantContextSources(query:string,enabled:AssistantContextSources):AssistantContextSources{
  if(/\b(overall|everything|all areas|full summary|complete summary|how am i doing)\b/i.test(query))return {...enabled};
  const selected=sources.filter(source=>modulePatterns[source].test(query));
  const relevant=new Set(selected.length?selected:coreSources);
  return {planner:enabled.planner&&relevant.has('planner'),productivity:enabled.productivity&&relevant.has('productivity'),wellness:enabled.wellness&&relevant.has('wellness'),finance:enabled.finance&&relevant.has('finance'),learning:enabled.learning&&relevant.has('learning')};
}

function terms(value:string):Set<string>{return new Set((value.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu)??[]).filter(term=>!['the','and','for','with','from','that','this','what','when','where','how','can','could','would','should','please','sidekick'].includes(term)));}

/** Ranks opted-in memories by overlap with the current request and keeps only a small relevant set. */
export function rankRelevantMemories(memories:AssistantMemory[],query:string,limit=3):AssistantMemory[]{
  const queryTerms=terms(query);
  if(!queryTerms.size)return [];
  return memories.map(memory=>{
    const memoryTerms=terms(`${memory.label} ${memory.content}`);
    let score=0;
    for(const term of queryTerms)if(memoryTerms.has(term))score+=term.length>6?2:1;
    return {memory,score};
  }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||b.memory.updatedAt.getTime()-a.memory.updatedAt.getTime()).slice(0,limit).map(item=>item.memory);
}
