export type FinanceTransactionType = 'income' | 'expense' | 'transfer';
export type FinanceCategoryType = 'income' | 'expense';
export type FinanceBillFrequency = 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'annually' | 'custom';
export type FinanceBillStatus = 'active' | 'paused' | 'archived';
export type FinanceGoalStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface FinanceSettings { currencyCode: string }
export interface FinanceCategory { id: string; name: string; categoryType: FinanceCategoryType; isDefault: boolean; isActive: boolean }
export interface FinanceTransaction { id: string; transactionType: FinanceTransactionType; amountMinor: number; currencyCode: string; categoryId: string | null; categoryName: string | null; description: string; merchant: string | null; paymentMethod: string | null; transactionDate: string; createdAt: Date }
export interface FinanceBudget { id: string; name: string; amountMinor: number; spentMinor: number; currencyCode: string; categoryId: string | null; categoryName: string | null; periodYear: number; periodMonth: number }
export interface FinanceBill { id: string; name: string; amountMinor: number; currencyCode: string; categoryId: string; categoryName: string; frequency: FinanceBillFrequency; intervalDays: number | null; recurrenceDay:number; startDate: string | null; nextDueDate: string; endDate: string | null; reminderDaysBefore: number; status: FinanceBillStatus; notes: string | null }
export interface FinanceBillPayment { id: string; billId: string; transactionId: string; amountMinor: number; currencyCode: string; dueDate: string; paymentDate: string; notes: string | null }
export interface FinanceGoal { id: string; name: string; description: string | null; targetMinor: number; savedMinor: number; currencyCode: string; targetDate: string | null; status: FinanceGoalStatus }
export interface FinanceContribution { id: string; goalId: string; amountMinor: number; contributionDate: string; description: string | null }
export interface FinanceSummary { currencyCode: string; monthIncomeMinor: number; monthExpenseMinor: number; monthNetMinor: number; monthSavingsContributionsMinor: number; budgetedMinor: number; budgetSpentMinor: number; upcomingBills: FinanceBill[]; goals: FinanceGoal[] }
export interface FinanceTransactionInput { transactionType: FinanceTransactionType; amountMinor: number; categoryId?: string | null; description: string; transactionDate?: string; merchant?: string | null; paymentMethod?: string | null }
export interface FinanceBudgetInput { name: string; amountMinor: number; categoryId?: string | null; periodYear: number; periodMonth: number }
export interface FinanceBillInput { name: string; amountMinor: number; categoryId: string; frequency: FinanceBillFrequency; intervalDays?: number | null; startDate?: string | null; nextDueDate: string; endDate?: string | null; reminderDaysBefore: number; notes?: string | null }
export interface FinanceGoalInput { name: string; description?: string | null; targetMinor: number; targetDate?: string | null }
