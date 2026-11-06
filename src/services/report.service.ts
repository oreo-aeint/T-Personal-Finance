/**
 * Report & Financial Summary Service
 * Centralizes monthly financial health calculations and visual breakdown data.
 *
 * Core rule:
 * Available Spending = Recorded Income - Recorded Expenses - Savings Contributions
 * Savings contributions are not counted as ordinary expenses.
 */
import { query, queryOne } from '../database/db';
import type { MonthlyFinancialSummary } from '../types';
import { getRelativeMonth } from '../utils/date';

export interface CategoryBreakdownItem {
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  amountYen: number;
  percentage: number;
}

export interface MonthlyTrendItem {
  month: string;
  incomeYen: number;
  expenseYen: number;
  savingsYen: number;
}

/**
 * Fetch overview summary for a specific month
 */
export async function getMonthlyFinancialSummary(month: string): Promise<MonthlyFinancialSummary> {
  // 1. Total Income for month
  const incomeRes = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount_yen), 0) as total
     FROM transactions
     WHERE type = 'income' AND strftime('%Y-%m', transaction_date) = ?`,
    [month]
  );
  const totalIncomeYen = incomeRes?.total ?? 0;

  // 2. Total Expense for month
  const expenseRes = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount_yen), 0) as total
     FROM transactions
     WHERE type = 'expense' AND strftime('%Y-%m', transaction_date) = ?`,
    [month]
  );
  const totalExpenseYen = expenseRes?.total ?? 0;

  // 3. Total Savings Contributions for month
  const savingsRes = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(amount_yen), 0) as total
     FROM savings_contributions
     WHERE strftime('%Y-%m', contribution_date) = ?`,
    [month]
  );
  const totalSavingsYen = savingsRes?.total ?? 0;

  // 4. Total Budget Limits for month
  const budgetRes = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(limit_yen), 0) as total
     FROM budgets
     WHERE month = ?`,
    [month]
  );
  const totalBudgetLimitYen = budgetRes?.total ?? 0;

  // Available Spending = Recorded Income - Recorded Expenses - Savings Contributions
  const availableSpendingYen = totalIncomeYen - totalExpenseYen - totalSavingsYen;

  // Budget usage percentage
  const budgetUsagePercent = totalBudgetLimitYen > 0
    ? Math.min(999, Math.round((totalExpenseYen / totalBudgetLimitYen) * 100))
    : 0;

  return {
    month,
    totalIncomeYen,
    totalExpenseYen,
    totalSavingsYen,
    availableSpendingYen,
    totalBudgetLimitYen,
    budgetUsagePercent,
  };
}

/**
 * Fetch expense breakdown by category for a specific month
 */
export async function getCategoryExpenseBreakdown(month: string): Promise<CategoryBreakdownItem[]> {
  const sql = `
    SELECT
      COALESCE(c.id, 0) as categoryId,
      COALESCE(c.name, 'Uncategorized') as categoryName,
      COALESCE(c.icon, 'Tag') as categoryIcon,
      SUM(t.amount_yen) as amountYen
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
    GROUP BY t.category_id
    ORDER BY amountYen DESC
  `;
  const items = await query<{ categoryId: number; categoryName: string; categoryIcon: string; amountYen: number }>(sql, [month]);

  const total = items.reduce((acc, curr) => acc + curr.amountYen, 0);

  return items.map((item) => ({
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    categoryIcon: item.categoryIcon,
    amountYen: item.amountYen,
    percentage: total > 0 ? Math.round((item.amountYen / total) * 100) : 0,
  }));
}

/**
 * Fetch 6-month historical trend for visual comparison charts
 */
export async function getHistoricalTrend(currentMonth: string, count: number = 6): Promise<MonthlyTrendItem[]> {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    months.push(getRelativeMonth(currentMonth, -i));
  }

  const results: MonthlyTrendItem[] = [];
  for (const m of months) {
    const summary = await getMonthlyFinancialSummary(m);
    results.push({
      month: m,
      incomeYen: summary.totalIncomeYen,
      expenseYen: summary.totalExpenseYen,
      savingsYen: summary.totalSavingsYen,
    });
  }

  return results;
}
