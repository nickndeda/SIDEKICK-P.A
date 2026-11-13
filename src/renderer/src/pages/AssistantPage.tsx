import { useCallback, useEffect, useState } from 'react';
import { faBell, faCircleCheck, faPause, faPlay, faRotate, faPaperPlane, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import type { AssistantActivity, AssistantStatus, AssistantConversation, AssistantPreferences, AssistantMemory, LocalModelStatus, AssistantTaskProposal, AssistantTaskRiskSnapshot, AssistantTaskModelTraining } from '../../../shared/types/assistant';
import AppIcon from '../components/AppIcon';
import '../styles/assistant.css';

function toLocalDateTimeInput(value:Date):string{const local=new Date(value.getTime()-value.getTimezoneOffset()*60_000);return local.toISOString().slice(0,16);}

function AssistantPage() {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [activities, setActivities] = useState<AssistantActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice,setNotice]=useState('');
  const [conversations,setConversations]=useState<AssistantConversation[]>([]);
  const [conversationId,setConversationId]=useState<string|null>(null);
  const [messages,setMessages]=useState<AssistantConversation['messages']>([]);
  const [draft,setDraft]=useState('');
  const [chatBusy,setChatBusy]=useState(false);
  const [prefs,setPrefs]=useState<AssistantPreferences|null>(null);
  const [modelStatus,setModelStatus]=useState<LocalModelStatus|null>(null);
  const [memories,setMemories]=useState<AssistantMemory[]>([]);
  const [memoryLabel,setMemoryLabel]=useState('');
  const [memoryContent,setMemoryContent]=useState('');
  const [memoryExpiry,setMemoryExpiry]=useState('');
  const [editingMemoryId,setEditingMemoryId]=useState<string|null>(null);
  const [proposals,setProposals]=useState<AssistantTaskProposal[]>([]);
  const [riskSnapshot,setRiskSnapshot]=useState<AssistantTaskRiskSnapshot|null>(null);
  const [trainingResult,setTrainingResult]=useState<AssistantTaskModelTraining|null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [nextStatus, nextActivities] = await Promise.all([window.sidekick.assistant.status(), window.sidekick.assistant.activities(60)]);
      setStatus(nextStatus); setActivities(nextActivities);
      const [conversationList,settings,memoryList]=await Promise.all([window.sidekick.assistant.conversations(),window.sidekick.assistant.preferences(),window.sidekick.assistant.memories()]);
      setConversations(conversationList);setPrefs(settings);setMemories(memoryList);
      setRiskSnapshot(await window.sidekick.assistant.taskRisk());
      if(conversationId){const active=await window.sidekick.assistant.conversation(conversationId);setMessages(active?.messages??[]);setProposals(await window.sidekick.assistant.proposals(conversationId));}
      else if(conversationList[0]){setConversationId(conversationList[0].id);setMessages((await window.sidekick.assistant.conversation(conversationList[0].id))?.messages??[]);setProposals(await window.sidekick.assistant.proposals(conversationList[0].id));}
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Assistant activity is unavailable.'); }
    finally { setLoading(false); }
  }, [conversationId]);

  useEffect(() => {
    void refresh();
    return window.sidekick.assistant.onUpdate(update => {
      setStatus(update.status);
      if (update.latestActivity) setActivities(previous => [update.latestActivity!, ...previous.filter(item => item.id !== update.latestActivity!.id)].slice(0, 60));
      else void window.sidekick.assistant.activities(60).then(setActivities).catch(() => undefined);
    });
  }, [refresh]);

  const updateActivity = async (activity: AssistantActivity, action: 'read' | 'dismiss') => {
    setBusy(true); setError('');
    try {
      if (action === 'read') await window.sidekick.assistant.markRead(activity.id);
      else await window.sidekick.assistant.dismiss(activity.id);
      await refresh();
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update this activity.'); }
    finally { setBusy(false); }
  };

  const toggleMonitoring = async () => {
    if (!status) return;
    setBusy(true); setError('');
    try { setStatus(await window.sidekick.assistant.setMonitoringEnabled(!status.monitoringEnabled)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update monitoring.'); }
    finally { setBusy(false); }
  };

  const stateLabel = status?.state.replaceAll('_', ' ') ?? 'Loading';
  const send=async()=>{if(!draft.trim()||chatBusy)return;setChatBusy(true);setError('');try{const c=await window.sidekick.assistant.sendMessage(conversationId,draft);setConversationId(c.id);setMessages(c.messages);setProposals(await window.sidekick.assistant.proposals(c.id));setDraft('');setConversations(await window.sidekick.assistant.conversations());}catch(cause){setError(cause instanceof Error?cause.message:'Could not send message.');}finally{setChatBusy(false);}};
  const newChat=async()=>{try{const c=await window.sidekick.assistant.newConversation();setConversations(await window.sidekick.assistant.conversations());setConversationId(c.id);setMessages([]);setProposals([]);}catch(cause){setError(cause instanceof Error?cause.message:'Could not create conversation.');}};
  const decideProposal=async(proposal:AssistantTaskProposal,decision:'approve'|'reject')=>{setBusy(true);setError('');setNotice('');try{await window.sidekick.assistant.decideProposal(proposal.id,decision);setProposals(await window.sidekick.assistant.proposals(conversationId??undefined));setNotice(decision==='approve'?'Approved task was added to Planner.':'Task proposal rejected.');}catch(cause){setError(cause instanceof Error?cause.message:'Could not update the proposal.');}finally{setBusy(false);}};
  const savePrefs=async()=>{if(!prefs)return;setBusy(true);try{setPrefs(await window.sidekick.assistant.setPreferences(prefs));setModelStatus(await window.sidekick.assistant.checkModel());}catch(cause){setError(cause instanceof Error?cause.message:'Could not save assistant settings.');}finally{setBusy(false);}};
  const addMemory=async()=>{try{await window.sidekick.assistant.saveMemory({id:editingMemoryId,label:memoryLabel,content:memoryContent,enabled:true,expiresAt:memoryExpiry?new Date(memoryExpiry):null});setMemories(await window.sidekick.assistant.memories());setMemoryLabel('');setMemoryContent('');setMemoryExpiry('');setEditingMemoryId(null);}catch(cause){setError(cause instanceof Error?cause.message:'Could not save memory.');}};
  const editMemory=(memory:AssistantMemory)=>{setEditingMemoryId(memory.id);setMemoryLabel(memory.label);setMemoryContent(memory.content);setMemoryExpiry(memory.expiresAt?toLocalDateTimeInput(new Date(memory.expiresAt)):'');};
  const deleteCurrentConversation=async()=>{if(!conversationId||!window.confirm('Delete this conversation and its messages?'))return;try{await window.sidekick.assistant.deleteConversation(conversationId);setConversationId(null);setMessages([]);setProposals([]);setConversations(await window.sidekick.assistant.conversations());}catch(cause){setError(cause instanceof Error?cause.message:'Could not delete conversation.');}};
  const trainTaskModel=async()=>{setBusy(true);setError('');try{setTrainingResult(await window.sidekick.assistant.trainTaskModel());setRiskSnapshot(await window.sidekick.assistant.taskRisk());}catch(cause){setError(cause instanceof Error?cause.message:'Could not evaluate task history.');}finally{setBusy(false);}};
  const clearTaskModel=async()=>{if(!window.confirm('Delete Sidekick’s saved task prediction model? Your Planner tasks will remain unchanged.'))return;setBusy(true);try{await window.sidekick.assistant.clearTaskModel();setRiskSnapshot(await window.sidekick.assistant.taskRisk());setTrainingResult(null);setNotice('Saved task prediction model deleted.');}catch(cause){setError(cause instanceof Error?cause.message:'Could not delete the saved model.');}finally{setBusy(false);}};
  return <main className="assistant-page">
    <header className="assistant-header"><div><span className="assistant-eyebrow">SIDEKICK RUNTIME</span><h1>Assistant</h1><p>See what Sidekick has noticed and control background monitoring.</p></div><button type="button" onClick={() => void refresh()} disabled={loading}><AppIcon icon={faRotate}/> Refresh</button></header>
    {error && <p className="assistant-message assistant-error" role="alert">{error}</p>}
    {notice && <p className="assistant-message" role="status">{notice}</p>}
    <section className="assistant-status-card">
      <div><span className="assistant-eyebrow">CURRENT STATUS</span><h2>{stateLabel}</h2><p>{status?.lastCheckedAt ? `Last checked ${new Date(status.lastCheckedAt).toLocaleString()}` : 'Monitoring has not completed a check yet.'}</p>{status?.degradedModules.length ? <p className="assistant-degraded">Some context is unavailable: {status.degradedModules.join(', ')}.</p> : null}{status?.lastError && <p className="assistant-degraded">{status.lastError}</p>}</div>
      <button className={status?.monitoringEnabled ? 'assistant-toggle assistant-toggle-on' : 'assistant-toggle'} type="button" disabled={busy || !status?.databaseAvailable} onClick={() => void toggleMonitoring()}><AppIcon icon={status?.monitoringEnabled ? faPause : faPlay}/>{status?.monitoringEnabled ? 'Pause monitoring' : 'Resume monitoring'}</button>
    </section>
    <div className="assistant-facts"><article><span>Monitoring</span><strong>{status?.monitoringEnabled ? 'On' : status?.state === 'offline' ? 'Offline' : 'Paused'}</strong></article><article><span>Unread activity</span><strong>{status?.unreadCount ?? 'Unavailable'}</strong></article><article><span>Context sources with errors</span><strong>{status?.degradedModules.length ?? 'Unavailable'}</strong></article></div>
    <section className="assistant-activity-card assistant-chat"><div className="assistant-section-heading"><div><h2>Talk with Sidekick</h2><p>Context aware chat through an optional model running on this computer.</p></div><div className="assistant-heading-actions">{conversationId&&<button type="button" onClick={()=>void deleteCurrentConversation()}><AppIcon icon={faTrash}/> Delete chat</button>}<button type="button" onClick={()=>void newChat()}><AppIcon icon={faPlus}/> New chat</button></div></div>
      <div className="assistant-chat-layout"><aside className="assistant-conversation-list">{conversations.map(c=><button className={c.id===conversationId?'selected':''} key={c.id} onClick={()=>{setConversationId(c.id);void Promise.all([window.sidekick.assistant.conversation(c.id),window.sidekick.assistant.proposals(c.id)]).then(([value,items])=>{setMessages(value?.messages??[]);setProposals(items);});}}>{c.title||'New conversation'}</button>)}</aside>
      <div className="assistant-chat-main"><div className="assistant-messages">{messages.length?messages.map(m=><article className={`assistant-chat-message ${m.role}`} key={m.id}><small>{m.role==='user'?'You':'Sidekick'}{m.provider==='unavailable'?' · model unavailable':m.provider==='ollama'?' · local model':''}</small><p>{m.content}</p>{m.role==='assistant'&&m.provider==='ollama'&&<div className="assistant-feedback"><button title="Helpful" aria-label="Mark response helpful" onClick={()=>void window.sidekick.assistant.feedback(m.id,'helpful')}>Helpful</button><button title="Not helpful" aria-label="Mark response not helpful" onClick={()=>void window.sidekick.assistant.feedback(m.id,'not_helpful')}>Not helpful</button></div>}</article>):<p className="assistant-empty">Ask about your tasks, focus sessions, upcoming bills, learning, or wellness. Sidekick only uses available local summaries.</p>}</div>
        {proposals.filter(item=>item.status==='pending').map(proposal=><article className="assistant-proposal" key={proposal.id}><div><strong>Draft task proposal</strong><p>{proposal.task.title} · {proposal.task.priority} priority{proposal.task.dueAt?` · due ${new Date(proposal.task.dueAt).toLocaleString()}`:''}</p>{proposal.task.description&&<small>{proposal.task.description}</small>}<small>Expires {new Date(proposal.expiresAt).toLocaleTimeString()}</small></div><button disabled={busy} onClick={()=>void decideProposal(proposal,'approve')}>Approve and add</button><button disabled={busy} onClick={()=>void decideProposal(proposal,'reject')}>Reject</button></article>)}
        <div className="assistant-composer"><textarea value={draft} maxLength={4000} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void send();}}} placeholder="Message Sidekick…"/><button disabled={chatBusy||!draft.trim()} onClick={()=>void send()}><AppIcon icon={faPaperPlane}/> Send</button></div></div></div>
    </section>
    <section className="assistant-activity-card"><div className="assistant-section-heading"><div><h2>Local model and memory</h2><p>Model processing stays on this computer. Memory is opt in and only stores details you add here.</p></div></div>
      {prefs&&<div className="assistant-settings-form"><label>Local server URL<input value={prefs.localModelUrl} onChange={e=>setPrefs({...prefs,localModelUrl:e.target.value})}/></label><label>Model name<input value={prefs.localModelName} onChange={e=>setPrefs({...prefs,localModelName:e.target.value})}/></label><label className="assistant-memory-toggle"><input type="checkbox" checked={prefs.memoryEnabled} onChange={e=>setPrefs({...prefs,memoryEnabled:e.target.checked})}/> Allow Sidekick to use approved memories in chat</label><label className="assistant-memory-toggle"><input type="checkbox" checked={prefs.taskPredictionEnabled} onChange={e=>setPrefs({...prefs,taskPredictionEnabled:e.target.checked})}/> Allow personalized task-delay model to use completed tasks</label><label className="assistant-memory-toggle"><input type="checkbox" checked={prefs.backgroundReasoningEnabled} onChange={e=>setPrefs({...prefs,backgroundReasoningEnabled:e.target.checked})}/> Allow low-frequency background reasoning with the local model</label><div className="assistant-settings-actions"><button onClick={()=>void savePrefs()} disabled={busy}>Save settings</button><button onClick={()=>void window.sidekick.assistant.checkModel().then(setModelStatus)} disabled={busy}>Check model</button><span>{modelStatus?.message??'Model status not checked.'}{modelStatus?.models.length?` Available: ${modelStatus.models.join(', ')}`:''}</span></div></div>}
      <div className="assistant-risk-panel">
        <div><strong>Personal task-delay model</strong>
          <p>{!riskSnapshot?.enabled ? 'Disabled. Enable it above to evaluate completed task history locally.' : !riskSnapshot.modelAvailable ? 'No evaluated model is active. Predictions stay unavailable until real task history passes the data and evaluation checks.' : `Active model v${riskSnapshot.modelVersion} trained on ${riskSnapshot.sampleCount} completed tasks. Last trained ${new Date(riskSnapshot.trainedAt as Date).toLocaleString()}.`}</p>
          {trainingResult&&<small>{trainingResult.status==='ready'?`Model v${trainingResult.modelVersion} passed evaluation: Brier ${trainingResult.modelBrier.toFixed(3)} vs ${trainingResult.baselineBrier.toFixed(3)} baseline; calibration error ${trainingResult.calibrationError.toFixed(3)} (${trainingResult.sampleCount} tasks).`:trainingResult.reason}</small>}
        </div>
        <button disabled={busy||!riskSnapshot?.enabled} onClick={()=>void trainTaskModel()}>Evaluate and train</button>
        {riskSnapshot?.savedModelAvailable&&<button disabled={busy} onClick={()=>void clearTaskModel()}>Delete saved model</button>}
      </div>
      {riskSnapshot && riskSnapshot.tasks.length>0 && <div className="assistant-risk-list">{riskSnapshot.tasks.map(task=><article key={task.id}><strong>{task.title}</strong><span>Due {new Date(task.dueAt).toLocaleDateString()}</span><span>{task.probabilityLate===null?'No reliable personalized estimate':`${Math.round(task.probabilityLate*100)}% late estimate · ${task.band}`}</span></article>)}</div>}
      <div className="assistant-memory-form"><input aria-label="Memory label" placeholder="Label" value={memoryLabel} onChange={e=>setMemoryLabel(e.target.value)}/><input aria-label="Memory content" placeholder="A preference you want Sidekick to remember" value={memoryContent} onChange={e=>setMemoryContent(e.target.value)}/><label>Expires<input aria-label="Memory expiry" type="datetime-local" value={memoryExpiry} onChange={e=>setMemoryExpiry(e.target.value)}/></label><button disabled={!memoryLabel.trim()||!memoryContent.trim()} onClick={()=>void addMemory()}>{editingMemoryId?'Save memory':'Add memory'}</button>{editingMemoryId&&<button onClick={()=>{setEditingMemoryId(null);setMemoryLabel('');setMemoryContent('');setMemoryExpiry('');}}>Cancel</button>}</div>
      {memories.map(memory=><article className="assistant-memory-row" key={memory.id}><div><strong>{memory.label}</strong><p>{memory.content}</p><small>{memory.expiresAt?`Expires ${new Date(memory.expiresAt).toLocaleString()}`:'No expiry set'}</small></div><label><input type="checkbox" checked={memory.enabled} onChange={async e=>{await window.sidekick.assistant.saveMemory({...memory,enabled:e.target.checked});setMemories(await window.sidekick.assistant.memories());}}/> Use in chat</label><button aria-label="Edit memory" onClick={()=>editMemory(memory)}>Edit</button><button aria-label="Delete memory" onClick={async()=>{await window.sidekick.assistant.deleteMemory(memory.id);setMemories(await window.sidekick.assistant.memories());}}><AppIcon icon={faTrash}/></button></article>)}
    </section>
    <section className="assistant-activity-card"><div className="assistant-section-heading"><div><h2>Activity</h2><p>Persistent findings and briefings from the background monitor.</p></div><AppIcon icon={faBell}/></div>
      {loading && !activities.length ? <p className="assistant-empty">Loading assistant activity…</p> : activities.length ? activities.map(activity => <article className={`assistant-activity assistant-severity-${activity.severity}`} key={activity.id}><span className="assistant-activity-icon"><AppIcon icon={activity.status === 'read' ? faCircleCheck : faBell}/></span><div className="assistant-activity-body"><div className="assistant-activity-title"><strong>{activity.title}</strong><span>{activity.severity}</span></div><p>{activity.description}</p><small>{activity.eventType.replaceAll('.', ' · ')} · {new Date(activity.createdAt).toLocaleString()}{activity.notificationSentAt ? ' · notification sent' : ''}</small></div><div className="assistant-activity-actions">{activity.status==='unread'&&<button type="button" disabled={busy} onClick={()=>void updateActivity(activity,'read')}>Mark read</button>}<button type="button" disabled={busy} onClick={()=>void updateActivity(activity,'dismiss')}>Dismiss</button></div></article>) : <p className="assistant-empty">No assistant findings yet. Sidekick records context-based alerts here while monitoring is enabled.</p>}
    </section>
    <p className="assistant-footnote">Monitoring uses local Planner, Productivity, Wellness, Finance and Learning summaries. It may create activity and show notifications; it does not change your tasks or financial records.</p>
  </main>;
}

export default AssistantPage;
