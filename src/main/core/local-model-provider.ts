export interface LocalInferenceProvider {
  readonly id:string;
  listModels(baseUrl:string,timeoutMs?:number):Promise<string[]>;
  structuredChat(baseUrl:string,payload:Record<string,unknown>,timeoutMs?:number,callerSignal?:AbortSignal):Promise<string>;
}

/** Provider boundary keeps orchestration independent from the local inference server API. */
export const ollamaProvider:LocalInferenceProvider={
  id:'ollama',
  async listModels(baseUrl,timeoutMs=3000){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(`${baseUrl}/api/tags`,{signal:controller.signal,redirect:'error'});
      if(!response.ok)throw new Error(`Local model server returned ${response.status}.`);
      const data=await response.json() as {models?:Array<{name?:unknown}>};
      return Array.isArray(data.models)?data.models.flatMap(model=>typeof model.name==='string'?[model.name]:[]):[];
    }finally{clearTimeout(timeout);}
  },
  async structuredChat(baseUrl,payload,timeoutMs=45000,callerSignal){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),timeoutMs);
    const abortFromCaller=()=>controller.abort();
    callerSignal?.addEventListener('abort',abortFromCaller,{once:true});
    if(callerSignal?.aborted)controller.abort();
    try{
      const response=await fetch(`${baseUrl}/api/chat`,{method:'POST',headers:{'content-type':'application/json'},signal:controller.signal,redirect:'error',body:JSON.stringify(payload)});
      if(!response.ok)throw new Error(`Local model returned HTTP ${response.status}.`);
      const data=await response.json() as {message?:{content?:unknown}};
      if(typeof data.message?.content!=='string'||!data.message.content.trim())throw new Error('Local model returned an empty response.');
      return data.message.content;
    }finally{clearTimeout(timeout);callerSignal?.removeEventListener('abort',abortFromCaller);}
  }
};
