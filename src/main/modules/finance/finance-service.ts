import * as repo from '../../repositories/finance-repository';
import { showWellnessNotification } from '../../services/notification-service';
import { getSettings as getWellnessSettings } from '../wellness/wellness-service';
import { wakeScheduler } from '../../core/scheduler';
import type { FinanceBill, FinanceBillInput, FinanceBudgetInput, FinanceCategoryType, FinanceGoalInput, FinanceTransactionInput } from './finance-types';

const money = (n: number) => { if (!Number.isSafeInteger(n) || n <= 0 || n > 9_000_000_000_000) throw new Error('Amount must be a positive whole number of minor currency units.'); };
const text = (s: string, label: string, max=180) => { if (typeof s !== 'string' || !s.trim() || s.trim().length > max) throw new Error(`${label} is required (up to ${max} characters).`); return s.trim(); };
const date = (s: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('Enter a valid date.'); const [y,m,d]=s.split('-').map(Number);const parsed=new Date(y,m-1,d);if(parsed.getFullYear()!==y||parsed.getMonth()!==m-1||parsed.getDate()!==d)throw new Error('Enter a valid date.');return s; };
const localDate = () => { const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const id = (s: string) => { if (!/^\d{1,20}$/.test(s)) throw new Error('Invalid record ID.'); return s; };
const currency = async () => (await repo.financeSettings()).currencyCode;

export const getSettings = () => repo.financeSettings();
export async function setCurrency(code: string) { if (!['KES','USD','EUR','GBP'].includes(code)) throw new Error('Choose KES, USD, EUR or GBP.'); await repo.saveCurrency(code); return repo.financeSettings(); }
export const getCategories = () => repo.categories();
export async function createCategory(name: string, type: FinanceCategoryType) { text(name,'Category name',80); if(type!=='income'&&type!=='expense')throw new Error('Invalid category type.'); return repo.addCategory(name.trim(),type); }
export async function deactivateCategory(categoryId: string) { if(!await repo.setCategoryActive(id(categoryId),false))throw new Error('Default categories cannot be deactivated.'); }
export async function renameCategory(categoryId:string,name:string){id(categoryId);text(name,'Category name',80);if(!await repo.updateCategory(categoryId,name.trim()))throw new Error('Only active custom categories can be renamed.');}
export async function getTransactions(from: string, to: string) { const start=date(from),end=date(to);if(start>end)throw new Error('The start date must be on or before the end date.');return repo.listTransactions(start,end); }
export async function createTransaction(input: FinanceTransactionInput) {
  if (!['income','expense','transfer'].includes(input.transactionType)) throw new Error('Invalid transaction type.'); money(input.amountMinor); text(input.description,'Description');
  const tx={...input,description:input.description.trim(),transactionDate:input.transactionDate?date(input.transactionDate):undefined};
  if(tx.transactionType!=='transfer'&&!tx.categoryId) throw new Error('Choose a category.');
  if(tx.transactionType!=='transfer'){id(tx.categoryId!);const category=await repo.getActiveCategory(tx.categoryId!);if(!category||category.categoryType!==tx.transactionType)throw new Error('Choose an active category matching this transaction type.');}
  return repo.insertTransaction(tx,await currency());
}
export async function editTransaction(transactionId: string,input: FinanceTransactionInput) { id(transactionId); money(input.amountMinor); text(input.description,'Description'); if(!['income','expense','transfer'].includes(input.transactionType))throw new Error('Invalid transaction type.');if(input.transactionType!=='transfer'){if(!input.categoryId)throw new Error('Choose a category.');id(input.categoryId);const c=await repo.getActiveCategory(input.categoryId);if(!c||c.categoryType!==input.transactionType)throw new Error('Choose an active category matching this transaction type.');}if(!await repo.updateTransaction(transactionId,{...input,description:input.description.trim()}))throw new Error('Transaction was not found or is a protected bill payment.'); }
export async function removeTransaction(transactionId:string) { return repo.deleteTransaction(id(transactionId)); }
export async function getBudgets(year:number,month:number){if(!Number.isInteger(year)||year<2000||year>2200||!Number.isInteger(month)||month<1||month>12)throw new Error('Invalid budget month.');return repo.listBudgets(year,month);}
export async function createBudget(input:FinanceBudgetInput){text(input.name,'Budget name',100);money(input.amountMinor);if(input.categoryId){id(input.categoryId);const c=await repo.getActiveCategory(input.categoryId);if(!c||c.categoryType!=='expense')throw new Error('Choose an active expense category.');}if(!Number.isInteger(input.periodYear)||input.periodYear<2000||input.periodYear>2200||!Number.isInteger(input.periodMonth)||input.periodMonth<1||input.periodMonth>12)throw new Error('Invalid budget month.');await repo.insertBudget(input,await currency());}
export async function editBudget(budgetId:string,input:FinanceBudgetInput){id(budgetId);text(input.name,'Budget name',100);money(input.amountMinor);if(input.categoryId){const c=await repo.getActiveCategory(id(input.categoryId));if(!c||c.categoryType!=='expense')throw new Error('Choose an active expense category.');}if(!Number.isInteger(input.periodYear)||input.periodYear<2000||input.periodYear>2200||!Number.isInteger(input.periodMonth)||input.periodMonth<1||input.periodMonth>12)throw new Error('Invalid budget month.');if(!await repo.updateBudget(budgetId,input))throw new Error('Budget was not found.');}
export async function removeBudget(value:string){await repo.deleteBudget(id(value));}
export const getBills=()=>repo.listBills();
export async function createBill(input:FinanceBillInput){text(input.name,'Bill name',120);money(input.amountMinor);id(input.categoryId);const c=await repo.getActiveCategory(input.categoryId);if(!c||c.categoryType!=='expense')throw new Error('Choose an active expense category.');date(input.nextDueDate);if(input.startDate)date(input.startDate);if(input.endDate)date(input.endDate);if(input.startDate&&input.nextDueDate<input.startDate)throw new Error('Next due date must be on or after the start date.');if(input.endDate&&input.endDate<input.nextDueDate)throw new Error('End date must be on or after the next due date.');if(!['weekly','monthly','bimonthly','quarterly','annually','custom'].includes(input.frequency))throw new Error('Invalid billing frequency.');if(input.frequency==='custom'&&(!Number.isInteger(input.intervalDays)||!input.intervalDays||input.intervalDays<1||input.intervalDays>3650))throw new Error('Custom bill intervals must be between 1 and 3,650 days.');if(!Number.isInteger(input.reminderDaysBefore)||input.reminderDaysBefore<0||input.reminderDaysBefore>30)throw new Error('Reminder lead time must be 0 to 30 days.');const result=await repo.insertBill(input,await currency());wakeScheduler();return result;}
export async function updateBillStatus(billId:string,status:FinanceBill['status']){id(billId);if(!['active','paused','archived'].includes(status))throw new Error('Invalid bill status.');await repo.setBillStatus(billId,status);wakeScheduler();}
export async function recordBillPayment(billId:string,amountMinor?:number,paymentDate?:string,notes?:string){id(billId);const bills=await repo.listBills();const bill=bills.find(b=>b.id===billId);if(!bill)throw new Error('Bill was not found.');if(bill.status!=='active')throw new Error('Only active bills can be paid.');const amount=amountMinor??bill.amountMinor;money(amount);if(notes)text(notes,'Payment note',500);await repo.payBill(bill,paymentDate?date(paymentDate):localDate(),amount,notes?.trim()??null);wakeScheduler();}
export async function getBillPayments(billId:string){return repo.listBillPayments(id(billId));}
export const getGoals=()=>repo.listGoals();
export async function createGoal(input:FinanceGoalInput){text(input.name,'Goal name',120);if(input.description)text(input.description,'Goal description',500);money(input.targetMinor);if(input.targetDate)date(input.targetDate);await repo.insertGoal(input,await currency());}
export async function editGoal(goalId:string,input:FinanceGoalInput){id(goalId);text(input.name,'Goal name',120);if(input.description)text(input.description,'Goal description',500);money(input.targetMinor);if(input.targetDate)date(input.targetDate);if(!await repo.updateGoal(goalId,input))throw new Error('Savings goal was not found.');}
export async function addContribution(goalId:string,amount:number,contributionDate?:string,description?:string){id(goalId);money(amount);if(description)text(description,'Description');await repo.contribute(goalId,amount,contributionDate?date(contributionDate):localDate(),description?.trim()??null);}
export async function getContributions(goalId:string){return repo.listContributions(id(goalId));}
export async function correctContribution(contributionId:string,amount:number,contributionDate:string,description?:string){id(contributionId);money(amount);date(contributionDate);if(description)text(description,'Description');if(!await repo.updateContribution(contributionId,amount,contributionDate,description?.trim()??null))throw new Error('Contribution was not found.');}
export async function removeContribution(contributionId:string){return repo.deleteContribution(id(contributionId));}
export async function setGoalStatus(goalId:string,status:'active'|'paused'|'completed'|'archived'){id(goalId);if(!['active','paused','completed','archived'].includes(status))throw new Error('Invalid goal status.');await repo.setGoalStatus(goalId,status);}
export async function getFinanceSummary(year?:number,month?:number){const n=new Date();const y=year??n.getFullYear(),m=month??n.getMonth()+1;if(!Number.isInteger(y)||y<2000||y>2200||!Number.isInteger(m)||m<1||m>12)throw new Error('Invalid summary month.');return repo.getSummary(y,m);}

export async function runFinanceReminderCycle():Promise<void>{
  const preferences=await getWellnessSettings();
  if(!preferences.general.remindersEnabled)return;
  if(preferences.general.quietHoursEnabled){const now=new Date();const minutes=now.getHours()*60+now.getMinutes();const [sh,sm]=preferences.general.quietStart.split(':').map(Number);const [eh,em]=preferences.general.quietEnd.split(':').map(Number);const start=sh*60+sm;const end=eh*60+em;const quiet=start<end?minutes>=start&&minutes<end:minutes>=start||minutes<end;if(quiet)return;}
  const bills=(await repo.listBills()).filter(b=>b.status==='active');
  for(const bill of bills){
    const notifyAt=new Date(`${bill.nextDueDate}T09:00:00`);notifyAt.setDate(notifyAt.getDate()-bill.reminderDaysBefore);
    if(notifyAt.getTime()>Date.now())continue;
    const created=await repo.createBillReminder(bill,notifyAt);
    if(created&&showWellnessNotification({id:`finance-${bill.id}`,category:'finance_bill',title:'Upcoming bill',description:`${bill.name} is due ${bill.nextDueDate}.`,priority:'normal',scheduledAt:notifyAt,status:'scheduled',snoozedUntil:null,completedAt:null,dismissedAt:null})) await repo.markBillReminderNotified(bill.id);
  }
}

export async function snoozeBillReminder(billId:string){const settings=await getWellnessSettings();await repo.snoozeBillReminder(id(billId),settings.general.snoozeMinutes);wakeScheduler();}
export async function dismissBillReminder(billId:string){await repo.dismissBillReminder(id(billId));wakeScheduler();}
