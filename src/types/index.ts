/**
 * Types for T-Personal Finance Tracking (NihonWallet)
 * Offline-first personal finance app for foreign students & workers in Japan.
 */

export type TransactionType = 'income' | 'expense';

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  icon?: string;
  is_default: number; // 0 or 1
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount_yen: number;
  category_id: number | null;
  category_name?: string;
  category_icon?: string;
  transaction_date: string; // YYYY-MM-DD
  note?: string | null;
  salary_record_id?: number | null;
  created_at: string;
}

export interface EmploymentSettings {
  id: number;
  hourly_wage_yen: number;
  weekly_hours: number;
  pay_frequency: string;
  pay_day: number | null;
  currency: string;
  updated_at: string;
}

export interface SalaryDeduction {
  id?: number;
  salary_record_id?: number;
  deduction_name: string;
  amount_yen: number;
}

export interface SalaryRecord {
  id: number;
  pay_period: string; // YYYY-MM
  paid_date: string; // YYYY-MM-DD
  gross_yen: number;
  net_yen: number;
  hours_worked: number | null;
  note?: string | null;
  created_at: string;
  deductions?: SalaryDeduction[];
}

export interface Budget {
  id: number;
  category_id: number;
  category_name?: string;
  month: string; // YYYY-MM
  limit_yen: number;
  spent_yen?: number;
}

export interface SavingsGoal {
  id: number;
  name: string;
  target_yen: number;
  target_date: string | null; // YYYY-MM-DD
  created_at: string;
  current_saved_yen?: number;
  contributions_count?: number;
}

export interface SavingsContribution {
  id: number;
  goal_id: number;
  amount_yen: number;
  contribution_date: string; // YYYY-MM-DD
  note?: string | null;
  goal_name?: string;
}

export interface RecurringExpense {
  id: number;
  name: string;
  amount_yen: number;
  category_id: number | null;
  category_name?: string;
  frequency: 'monthly' | 'weekly' | 'yearly';
  next_due_date: string; // YYYY-MM-DD
  is_active: number; // 1 or 0
  note?: string | null;
}

export interface MonthlyFinancialSummary {
  month: string; // YYYY-MM
  totalIncomeYen: number;
  totalExpenseYen: number;
  totalSavingsYen: number;
  availableSpendingYen: number;
  totalBudgetLimitYen: number;
  budgetUsagePercent: number;
}

export interface BackupData {
  version: number;
  timestamp: string;
  tables: {
    employment_settings: EmploymentSettings[];
    salary_records: SalaryRecord[];
    salary_deductions: SalaryDeduction[];
    categories: Category[];
    transactions: Transaction[];
    budgets: Budget[];
    savings_goals: SavingsGoal[];
    savings_contributions: SavingsContribution[];
    recurring_expenses: RecurringExpense[];
  };
}
