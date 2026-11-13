import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import * as finance from '../modules/finance/finance-service';

function trusted(e:IpcMainInvokeEvent){const w=BrowserWindow.fromWebContents(e.sender);if(!w||e.senderFrame!==e.sender.mainFrame)throw new Error('Untrusted IPC request.');}
function record(v:unknown):Record<string,any>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Invalid Finance request.');return v as Record<string,any>;}
function str(v:unknown,label:string):string{if(typeof v!=='string')throw new Error(`Invalid ${label}.`);return v;}
export function registerFinanceIpcHandlers():void{
 const names=['finance:settings','finance:currency','finance:categories','finance:category:add','finance:category:update','finance:category:deactivate','finance:transactions','finance:transaction:add','finance:transaction:update','finance:transaction:delete','finance:budgets','finance:budget:add','finance:budget:update','finance:budget:delete','finance:bills','finance:bill:add','finance:bill:status','finance:bill:payments','finance:bill:pay','finance:bill:snooze','finance:bill:dismiss','finance:goals','finance:goal:add','finance:goal:update','finance:goal:contributions','finance:goal:contribution:update','finance:goal:contribution:delete','finance:goal:contribute','finance:goal:status','finance:summary'];
 names.forEach(n=>ipcMain.removeHandler(n));
 ipcMain.handle('finance:settings',e=>{trusted(e);return finance.getSettings();});
 ipcMain.handle('finance:currency',(e,v)=>{trusted(e);return finance.setCurrency(str(v,'currency'));});
 ipcMain.handle('finance:categories',e=>{trusted(e);return finance.getCategories();});
 ipcMain.handle('finance:category:add',(e,v)=>{trusted(e);const x=record(v);return finance.createCategory(str(x.name,'category name'),x.type);});
 ipcMain.handle('finance:category:update',(e,i,n)=>{trusted(e);return finance.renameCategory(str(i,'category ID'),str(n,'category name'));});
 ipcMain.handle('finance:category:deactivate',(e,v)=>{trusted(e);return finance.deactivateCategory(str(v,'category ID'));});
 ipcMain.handle('finance:transactions',(e,from,to)=>{trusted(e);return finance.getTransactions(str(from,'start date'),str(to,'end date'));});
 ipcMain.handle('finance:transaction:add',(e,v)=>{trusted(e);return finance.createTransaction(record(v) as any);});
 ipcMain.handle('finance:transaction:update',(e,i,v)=>{trusted(e);return finance.editTransaction(str(i,'transaction ID'),record(v) as any);});
 ipcMain.handle('finance:transaction:delete',(e,v)=>{trusted(e);return finance.removeTransaction(str(v,'transaction ID'));});
 ipcMain.handle('finance:budgets',(e,y,m)=>{trusted(e);return finance.getBudgets(Number(y),Number(m));});
 ipcMain.handle('finance:budget:add',(e,v)=>{trusted(e);return finance.createBudget(record(v) as any);});
 ipcMain.handle('finance:budget:update',(e,i,v)=>{trusted(e);return finance.editBudget(str(i,'budget ID'),record(v) as any);});
 ipcMain.handle('finance:budget:delete',(e,v)=>{trusted(e);return finance.removeBudget(str(v,'budget ID'));});
 ipcMain.handle('finance:bills',e=>{trusted(e);return finance.getBills();});
 ipcMain.handle('finance:bill:payments',(e,i)=>{trusted(e);return finance.getBillPayments(str(i,'bill ID'));});
 ipcMain.handle('finance:bill:add',(e,v)=>{trusted(e);return finance.createBill(record(v) as any);});
 ipcMain.handle('finance:bill:status',(e,i,s)=>{trusted(e);return finance.updateBillStatus(str(i,'bill ID'),s);});
 ipcMain.handle('finance:bill:pay',(e,i,a,d,n)=>{trusted(e);return finance.recordBillPayment(str(i,'bill ID'),a===undefined?undefined:Number(a),d===undefined?undefined:str(d,'payment date'),n===undefined?undefined:str(n,'payment note'));});
 ipcMain.handle('finance:bill:snooze',(e,i)=>{trusted(e);return finance.snoozeBillReminder(str(i,'bill ID'));});
 ipcMain.handle('finance:bill:dismiss',(e,i)=>{trusted(e);return finance.dismissBillReminder(str(i,'bill ID'));});
 ipcMain.handle('finance:goals',e=>{trusted(e);return finance.getGoals();});
 ipcMain.handle('finance:goal:add',(e,v)=>{trusted(e);return finance.createGoal(record(v) as any);});
 ipcMain.handle('finance:goal:update',(e,i,v)=>{trusted(e);return finance.editGoal(str(i,'goal ID'),record(v) as any);});
 ipcMain.handle('finance:goal:contribute',(e,i,a,d,n)=>{trusted(e);return finance.addContribution(str(i,'goal ID'),Number(a),d===undefined?undefined:str(d,'date'),n===undefined?undefined:str(n,'description'));});
 ipcMain.handle('finance:goal:contributions',(e,i)=>{trusted(e);return finance.getContributions(str(i,'goal ID'));});
 ipcMain.handle('finance:goal:contribution:update',(e,i,a,d,n)=>{trusted(e);return finance.correctContribution(str(i,'contribution ID'),Number(a),str(d,'date'),n===undefined?undefined:str(n,'description'));});
 ipcMain.handle('finance:goal:contribution:delete',(e,i)=>{trusted(e);return finance.removeContribution(str(i,'contribution ID'));});
 ipcMain.handle('finance:goal:status',(e,i,s)=>{trusted(e);return finance.setGoalStatus(str(i,'goal ID'),s);});
 ipcMain.handle('finance:summary',(e,y,m)=>{trusted(e);return finance.getFinanceSummary(y===undefined?undefined:Number(y),m===undefined?undefined:Number(m));});
}
