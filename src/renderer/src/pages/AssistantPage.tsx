import { useCallback, useEffect, useState } from 'react';
import { faBell, faCircleCheck, faPause, faPlay, faRotate, faPaperPlane, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import type { AssistantActivity, AssistantStatus, AssistantConversation, AssistantPreferences, AssistantMemory, LocalModelStatus } from '../../../shared/types/assistant';
import AppIcon from '../components/AppIcon';
import '../styles/assistant.css';

function AssistantPage() {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [activities, setActivities] = useState<AssistantActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [nextStatus, nextActivities] = await Promise.all([window.sidekick.assistant.status(), window.sidekick.assistant.activities(60)]);
      setStatus(nextStatus); setActivities(nextActivities);
      const [conversationList,settings,memoryList]=await Promise.all([window.sidekick.assistant.conversations(),window.sidekick.assistant.preferences(),window.sidekick.assistant.memories()]);
      setConversations(conversationList);setPrefs(settings);setMemories(memoryList);
      if(conversationId){const active=await window.sidekick.assistant.conversation(conversationId);setMessages(active?.messages??[]);}
      else if(conversationList[0]){setConversationId(conversationList[0].id);setMessages((await window.sidekick.assistant.conversation(conversationList[0].id))?.messages??[]);}
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
  const send=async()=>{if(!draft.trim()||chatBusy)return;setChatBusy(true);setError('');try{const c=await window.sidekick.assistant.sendMessage(conversationId,draft);setConversationId(c.id);setMessages(c.messages);setDraft('');setConversations(await window.sidekick.assistant.conversations());}catch(cause){setError(cause instanceof Error?cause.message:'Could not send message.');}finally{setChatBusy(false);}};
  const newChat=async()=>{try{const c=await window.sidekick.assistant.newConversation();setConversations(await window.sidekick.assistant.conversations());setConversationId(c.id);setMessages([]);}catch(cause){setError(cause instanceof Error?cause.message:'Could not create conversation.');}};
  const savePrefs=async()=>{if(!prefs)return;setBusy(true);try{setPrefs(await window.sidekick.assistant.setPreferences(prefs));setModelStatus(await window.sidekick.assistant.checkModel());}catch(cause){setError(cause instanceof Error?cause.message:'Could not save assistant settings.');}finally{setBusy(false);}};
  const addMemory=async()=>{try{await window.sidekick.assistant.saveMemory({id:null,label:memoryLabel,content:memoryContent,enabled:true});setMemories(await window.sidekick.assistant.memories());setMemoryLabel('');setMemoryContent('');}catch(cause){setError(cause instanceof Error?cause.message:'Could not save memory.');}};
  return <main className="assistant-page">
    <header className="assistant-header"><div><span className="assistant-eyebrow">SIDEKICK RUNTIME</span><h1>Assistant</h1><p>See what Sidekick has noticed and control background monitoring.</p></div><button type="button" onClick={() => void refresh()} disabled={loading}><AppIcon icon={faRotate}/> Refresh</button></header>
    {error && <p className="assistant-message assistant-error" role="alert">{error}</p>}
    <section className="assistant-status-card">
      <div><span className="assistant-eyebrow">CURRENT STATUS</span><h2>{stateLabel}</h2><p>{status?.lastCheckedAt ? `Last checked ${new Date(status.lastCheckedAt).toLocaleString()}` : 'Monitoring has not completed a check yet.'}</p>{status?.degradedModules.length ? <p className="assistant-degraded">Some context is unavailable: {status.degradedModules.join(', ')}.</p> : null}{status?.lastError && <p className="assistant-degraded">{status.lastError}</p>}</div>
      <button className={status?.monitoringEnabled ? 'assistant-toggle assistant-toggle-on' : 'assistant-toggle'} type="button" disabled={busy || !status?.databaseAvailable} onClick={() => void toggleMonitoring()}><AppIcon icon={status?.monitoringEnabled ? faPause : faPlay}/>{status?.monitoringEnabled ? 'Pause monitoring' : 'Resume monitoring'}</button>
    </section>
    <div className="assistant-facts"><article><span>Monitoring</span><strong>{status?.monitoringEnabled ? 'On' : status?.state === 'offline' ? 'Offline' : 'Paused'}</strong></article><article><span>Unread activity</span><strong>{status?.unreadCount ?? 'Unavailable'}</strong></article><article><span>Context sources with errors</span><strong>{status?.degradedModules.length ?? 'Unavailable'}</strong></article></div>
    <section className="assistant-activity-card assistant-chat"><div className="assistant-section-heading"><div><h2>Talk with Sidekick</h2><p>Context aware chat through an optional model running on this computer.</p></div><button type="button" onClick={()=>void newChat()}><AppIcon icon={faPlus}/> New chat</button></div>
      <div className="assistant-chat-layout"><aside className="assistant-conversation-list">{conversations.map(c=><button className={c.id===conversationId?'selected':''} key={c.id} onClick={()=>{setConversationId(c.id);void window.sidekick.assistant.conversation(c.id).then(value=>setMessages(value?.messages??[]));}}>{c.title||'New conversation'}</button>)}</aside>
      <div className="assistant-chat-main"><div className="assistant-messages">{messages.length?messages.map(m=><article className={`assistant-chat-message ${m.role}`} key={m.id}><small>{m.role==='user'?'You':'Sidekick'}{m.provider==='unavailable'?' · model unavailable':m.provider==='ollama'?' · local model':''}</small><p>{m.content}</p></article>):<p className="assistant-empty">Ask about your tasks, focus sessions, upcoming bills, learning, or wellness. Sidekick only uses available local summaries.</p>}</div><div className="assistant-composer"><textarea value={draft} maxLength={4000} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void send();}}} placeholder="Message Sidekick…"/><button disabled={chatBusy||!draft.trim()} onClick={()=>void send()}><AppIcon icon={faPaperPlane}/> Send</button></div></div></div>
    </section>
    <section className="assistant-activity-card"><div className="assistant-section-heading"><div><h2>Local model and memory</h2><p>Model processing stays on this computer. Memory is opt in and only stores details you add here.</p></div></div>
      {prefs&&<div className="assistant-settings-form"><label>Local server URL<input value={prefs.localModelUrl} onChange={e=>setPrefs({...prefs,localModelUrl:e.target.value})}/></label><label>Model name<input value={prefs.localModelName} onChange={e=>setPrefs({...prefs,localModelName:e.target.value})}/></label><label className="assistant-memory-toggle"><input type="checkbox" checked={prefs.memoryEnabled} onChange={e=>setPrefs({...prefs,memoryEnabled:e.target.checked})}/> Allow Sidekick to use approved memories in chat</label><div className="assistant-settings-actions"><button onClick={()=>void savePrefs()} disabled={busy}>Save settings</button><button onClick={()=>void window.sidekick.assistant.checkModel().then(setModelStatus)} disabled={busy}>Check model</button><span>{modelStatus?.message??'Model status not checked.'}{modelStatus?.models.length?` Available: ${modelStatus.models.join(', ')}`:''}</span></div></div>}
      <div className="assistant-memory-form"><input aria-label="Memory label" placeholder="Label" value={memoryLabel} onChange={e=>setMemoryLabel(e.target.value)}/><input aria-label="Memory content" placeholder="A preference you want Sidekick to remember" value={memoryContent} onChange={e=>setMemoryContent(e.target.value)}/><button disabled={!memoryLabel.trim()||!memoryContent.trim()} onClick={()=>void addMemory()}>Add memory</button></div>
      {memories.map(memory=><article className="assistant-memory-row" key={memory.id}><div><strong>{memory.label}</strong><p>{memory.content}</p></div><label><input type="checkbox" checked={memory.enabled} onChange={async e=>{await window.sidekick.assistant.saveMemory({...memory,enabled:e.target.checked});setMemories(await window.sidekick.assistant.memories());}}/> Use in chat</label><button aria-label="Delete memory" onClick={async()=>{await window.sidekick.assistant.deleteMemory(memory.id);setMemories(await window.sidekick.assistant.memories());}}><AppIcon icon={faTrash}/></button></article>)}
    </section>
    <section className="assistant-activity-card"><div className="assistant-section-heading"><div><h2>Activity</h2><p>Persistent findings and briefings from the background monitor.</p></div><AppIcon icon={faBell}/></div>
      {loading && !activities.length ? <p className="assistant-empty">Loading assistant activity…</p> : activities.length ? activities.map(activity => <article className={`assistant-activity assistant-severity-${activity.severity}`} key={activity.id}><span className="assistant-activity-icon"><AppIcon icon={activity.status === 'read' ? faCircleCheck : faBell}/></span><div className="assistant-activity-body"><div className="assistant-activity-title"><strong>{activity.title}</strong><span>{activity.severity}</span></div><p>{activity.description}</p><small>{activity.eventType.replaceAll('.', ' · ')} · {new Date(activity.createdAt).toLocaleString()}{activity.notificationSentAt ? ' · notification sent' : ''}</small></div><div className="assistant-activity-actions">{activity.status==='unread'&&<button type="button" disabled={busy} onClick={()=>void updateActivity(activity,'read')}>Mark read</button>}<button type="button" disabled={busy} onClick={()=>void updateActivity(activity,'dismiss')}>Dismiss</button></div></article>) : <p className="assistant-empty">No assistant findings yet. Sidekick records context-based alerts here while monitoring is enabled.</p>}
    </section>
    <p className="assistant-footnote">Monitoring uses local Planner, Productivity, Wellness, Finance and Learning summaries. It may create activity and show notifications; it does not change your tasks or financial records.</p>
  </main>;
}

export default AssistantPage;
