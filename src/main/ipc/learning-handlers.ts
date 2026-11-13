import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import * as learning from '../modules/learning/learning-service';
import type { LearningAnalyticsFilter, LearningGoalInput, LearningNoteInput, LearningQuestionInput, LearningQuizInput, LearningResourceInput, LearningRevisionGrade, LearningSessionInput, LearningSubjectInput, LearningTopicInput } from '../modules/learning/learning-types';
import { publishAssistantEvent } from '../core/assistant-monitor';

function trusted(e:IpcMainInvokeEvent){const w=BrowserWindow.fromWebContents(e.sender);if(!w||e.senderFrame!==e.sender.mainFrame)throw new Error('Untrusted IPC request.');}
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Invalid Learning request.');return v as Record<string,unknown>;}
function string(v:unknown,label='value'):string{if(typeof v!=='string')throw new Error(`Invalid ${label}.`);return v;}
function optionalString(v:unknown,label='value'):string|undefined{if(v===undefined||v===null)return undefined;return string(v,label);}
function number(v:unknown,label='value'):number{if(typeof v!=='number'||!Number.isFinite(v))throw new Error(`Invalid ${label}.`);return v;}
const channels=['learning:subjects:list','learning:subjects:get','learning:subjects:create','learning:subjects:update','learning:subjects:archive','learning:subjects:restore','learning:subjects:complete','learning:subjects:delete','learning:topics:list','learning:topics:get','learning:topics:create','learning:topics:update','learning:topics:progress','learning:topics:delete','learning:sessions:list','learning:sessions:current','learning:sessions:start','learning:sessions:pause','learning:sessions:resume','learning:sessions:finish','learning:sessions:cancel','learning:sessions:today','learning:sessions:week','learning:notes:list','learning:notes:create','learning:notes:update','learning:notes:delete','learning:resources:list','learning:resources:create','learning:resources:update','learning:resources:delete','learning:resources:open','learning:quizzes:list','learning:quizzes:get','learning:quizzes:create','learning:quizzes:update','learning:quizzes:delete','learning:questions:create','learning:questions:update','learning:questions:delete','learning:attempts:start','learning:attempts:submit','learning:attempts:list','learning:attempts:resume','learning:attempts:abandon','learning:revisions:list','learning:revisions:today','learning:revisions:overdue','learning:revisions:upcoming','learning:revisions:create','learning:revisions:complete','learning:revisions:reschedule','learning:revisions:dismiss','learning:goals:list','learning:goals:create','learning:goals:update','learning:goals:complete','learning:goals:archive','learning:analytics:overview','learning:analytics:study-time','learning:analytics:performance','learning:analytics:weak-topics'];
export function registerLearningIpcHandlers():void{
 channels.forEach(c=>ipcMain.removeHandler(c));
 ipcMain.handle('learning:subjects:list',(e,archived)=>{trusted(e);if(archived!==undefined&&typeof archived!=='boolean')throw new Error('Invalid archived filter.');return learning.listSubjects(archived);});
 ipcMain.handle('learning:subjects:get',(e,id)=>{trusted(e);return learning.getSubject(string(id,'subject ID'));});
 ipcMain.handle('learning:subjects:create',(e,x)=>{trusted(e);return learning.createSubject(object(x) as unknown as LearningSubjectInput);});
 ipcMain.handle('learning:subjects:update',(e,id,x)=>{trusted(e);return learning.updateSubject(string(id,'subject ID'),object(x) as unknown as LearningSubjectInput);});
 ipcMain.handle('learning:subjects:archive',(e,id)=>{trusted(e);return learning.archiveSubject(string(id,'subject ID'));});
 ipcMain.handle('learning:subjects:restore',(e,id)=>{trusted(e);return learning.restoreSubject(string(id,'subject ID'));});
 ipcMain.handle('learning:subjects:complete',(e,id)=>{trusted(e);return learning.completeSubject(string(id,'subject ID'));});
 ipcMain.handle('learning:subjects:delete',(e,id)=>{trusted(e);return learning.deleteSubject(string(id,'subject ID'));});
 ipcMain.handle('learning:topics:list',(e,f)=>{trusted(e);const x=f===undefined?{}:object(f);return learning.listTopics({subjectId:optionalString(x.subjectId,'subject ID'),status:optionalString(x.status,'topic status') as LearningTopicInput['status'],difficulty:optionalString(x.difficulty,'difficulty') as LearningTopicInput['difficulty'],search:optionalString(x.search,'search'),includeArchived:x.includeArchived===true});});
 ipcMain.handle('learning:topics:get',(e,id)=>{trusted(e);return learning.getTopic(string(id,'topic ID'));});
 ipcMain.handle('learning:topics:create',(e,x)=>{trusted(e);return learning.createTopic(object(x) as unknown as LearningTopicInput);});
 ipcMain.handle('learning:topics:update',(e,id,x)=>{trusted(e);return learning.updateTopic(string(id,'topic ID'),object(x) as unknown as LearningTopicInput);});
 ipcMain.handle('learning:topics:progress',(e,id,p,s)=>{trusted(e);return learning.updateTopicProgress(string(id,'topic ID'),number(p,'progress'),optionalString(s,'status') as LearningTopicInput['status']);});
 ipcMain.handle('learning:topics:delete',(e,id)=>{trusted(e);return learning.deleteTopic(string(id,'topic ID'));});
 ipcMain.handle('learning:sessions:list',(e,limit,subject)=>{trusted(e);return learning.listSessions(limit===undefined?50:number(limit,'limit'),optionalString(subject,'subject ID'));});
 ipcMain.handle('learning:sessions:current',e=>{trusted(e);return learning.currentSession();});
 ipcMain.handle('learning:sessions:start',(e,x)=>{trusted(e);return learning.startSession(object(x) as unknown as LearningSessionInput);});
 ipcMain.handle('learning:sessions:pause',(e,id)=>{trusted(e);return learning.pauseSession(string(id,'session ID'));});
 ipcMain.handle('learning:sessions:resume',(e,id)=>{trusted(e);return learning.resumeSession(string(id,'session ID'));});
 ipcMain.handle('learning:sessions:finish',(e,id,n)=>{trusted(e);return learning.finishSession(string(id,'session ID'),optionalString(n,'notes'));});
 ipcMain.handle('learning:sessions:cancel',(e,id)=>{trusted(e);return learning.cancelSession(string(id,'session ID'));});
 ipcMain.handle('learning:sessions:today',e=>{trusted(e);return learning.todayStudySeconds();});
 ipcMain.handle('learning:sessions:week',e=>{trusted(e);return learning.weeklyStudySeconds();});
 ipcMain.handle('learning:notes:list',(e,s,t)=>{trusted(e);return learning.listNotes(optionalString(s,'subject ID'),optionalString(t,'topic ID'));});
 ipcMain.handle('learning:notes:create',(e,x)=>{trusted(e);return learning.createNote(object(x) as unknown as LearningNoteInput);});
 ipcMain.handle('learning:notes:update',(e,id,x)=>{trusted(e);return learning.updateNote(string(id,'note ID'),object(x) as unknown as LearningNoteInput);});
 ipcMain.handle('learning:notes:delete',(e,id)=>{trusted(e);return learning.deleteNote(string(id,'note ID'));});
 ipcMain.handle('learning:resources:list',(e,s,t)=>{trusted(e);return learning.listResources(optionalString(s,'subject ID'),optionalString(t,'topic ID'));});
 ipcMain.handle('learning:resources:create',(e,x)=>{trusted(e);return learning.createResource(object(x) as unknown as LearningResourceInput);});
 ipcMain.handle('learning:resources:update',(e,id,x)=>{trusted(e);return learning.updateResource(string(id,'resource ID'),object(x) as unknown as LearningResourceInput);});
 ipcMain.handle('learning:resources:delete',(e,id)=>{trusted(e);return learning.deleteResource(string(id,'resource ID'));});
 ipcMain.handle('learning:resources:open',(e,id)=>{trusted(e);return learning.openResource(string(id,'resource ID'));});
 ipcMain.handle('learning:quizzes:list',(e,s)=>{trusted(e);return learning.listQuizzes(optionalString(s,'subject ID'));});
 ipcMain.handle('learning:quizzes:get',(e,id)=>{trusted(e);return learning.getQuiz(string(id,'quiz ID'));});
 ipcMain.handle('learning:quizzes:create',(e,x)=>{trusted(e);return learning.createQuiz(object(x) as unknown as LearningQuizInput);});
 ipcMain.handle('learning:quizzes:update',(e,id,x)=>{trusted(e);return learning.updateQuiz(string(id,'quiz ID'),object(x) as unknown as LearningQuizInput);});
 ipcMain.handle('learning:quizzes:delete',(e,id)=>{trusted(e);return learning.deleteQuiz(string(id,'quiz ID'));});
 ipcMain.handle('learning:questions:create',(e,x)=>{trusted(e);return learning.addQuestion(object(x) as unknown as LearningQuestionInput);});
 ipcMain.handle('learning:questions:update',(e,id,x)=>{trusted(e);return learning.editQuestion(string(id,'question ID'),object(x) as unknown as LearningQuestionInput);});
 ipcMain.handle('learning:questions:delete',(e,id)=>{trusted(e);return learning.deleteQuestion(string(id,'question ID'));});
 ipcMain.handle('learning:attempts:start',(e,id)=>{trusted(e);return learning.startQuizAttempt(string(id,'quiz ID'));});
 ipcMain.handle('learning:attempts:submit',(e,id,a)=>{trusted(e);if(!Array.isArray(a))throw new Error('Invalid answer list.');return learning.submitQuizAttempt(string(id,'attempt ID'),a.map(value=>{const x=object(value);return{questionId:string(x.questionId,'question ID'),answerText:string(x.answerText,'answer')};}));});
 ipcMain.handle('learning:attempts:list',(e,id)=>{trusted(e);return learning.listAttempts(optionalString(id,'quiz ID'));});
 ipcMain.handle('learning:attempts:resume',(e,id)=>{trusted(e);return learning.resumeQuizAttempt(string(id,'attempt ID'));});
 ipcMain.handle('learning:attempts:abandon',(e,id)=>{trusted(e);return learning.abandonQuizAttempt(string(id,'attempt ID'));});
 ipcMain.handle('learning:revisions:list',(e,status,subject)=>{trusted(e);return learning.listRevisions(optionalString(status,'revision status') as 'scheduled'|'completed'|'dismissed'|undefined,optionalString(subject,'subject ID'));});
 ipcMain.handle('learning:revisions:today',e=>{trusted(e);return learning.dueToday();});
 ipcMain.handle('learning:revisions:overdue',e=>{trusted(e);return learning.overdueRevisions();});
 ipcMain.handle('learning:revisions:upcoming',e=>{trusted(e);return learning.upcomingRevisions();});
 ipcMain.handle('learning:revisions:create',async(e,id,d)=>{trusted(e);const revision=await learning.createRevision(string(id,'topic ID'),d instanceof Date?d:new Date(string(d,'date')));publishAssistantEvent('learning.revision.scheduled',{revisionId:revision.id,topicTitle:revision.topicTitle});return revision;});
 ipcMain.handle('learning:revisions:complete',async(e,id,g)=>{trusted(e);const result=await learning.completeRevision(string(id,'revision ID'),string(g,'revision grade') as LearningRevisionGrade);publishAssistantEvent('learning.revision.completed',{revisionId:result.completed.id,topicTitle:result.completed.topicTitle});return result;});
 ipcMain.handle('learning:revisions:reschedule',(e,id,d)=>{trusted(e);return learning.rescheduleRevision(string(id,'revision ID'),d instanceof Date?d:new Date(string(d,'date')));});
 ipcMain.handle('learning:revisions:dismiss',(e,id)=>{trusted(e);return learning.dismissRevision(string(id,'revision ID'));});
 ipcMain.handle('learning:goals:list',(e,s)=>{trusted(e);return learning.listGoals(optionalString(s,'goal status') as 'active'|'completed'|'archived'|undefined);});
 ipcMain.handle('learning:goals:create',(e,x)=>{trusted(e);return learning.createGoal(object(x) as unknown as LearningGoalInput);});
 ipcMain.handle('learning:goals:update',(e,id,x)=>{trusted(e);return learning.updateGoal(string(id,'goal ID'),object(x) as unknown as LearningGoalInput);});
 ipcMain.handle('learning:goals:complete',(e,id)=>{trusted(e);return learning.completeGoal(string(id,'goal ID'));});
 ipcMain.handle('learning:goals:archive',(e,id)=>{trusted(e);return learning.archiveGoal(string(id,'goal ID'));});
 ipcMain.handle('learning:analytics:overview',e=>{trusted(e);return learning.getOverview();});
 ipcMain.handle('learning:analytics:study-time',(e,f)=>{trusted(e);return learning.getStudyTime(f===undefined?{}:object(f) as LearningAnalyticsFilter);});
 ipcMain.handle('learning:analytics:performance',(e,f)=>{trusted(e);return learning.getPerformance(f===undefined?{}:object(f) as LearningAnalyticsFilter);});
 ipcMain.handle('learning:analytics:weak-topics',e=>{trusted(e);return learning.getWeakTopics();});
}
