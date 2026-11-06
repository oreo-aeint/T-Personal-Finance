/**
 * Budget Service
 * Handles monthly category spending budgets, spending progress,
 * and copying prior month budgets.
 */
import { query, run, runTransaction } from '../database/db';
import type { Budget } from '../types';

/**
 * Fetch budgets for a given month with actual spending calculated
 */
export async function getBudgetsForMonth(month: string): Promise<Budget[]> {
  const sql = `
    SELECT
      b.id,
      b.category_id,
      b.month,
      b.limit_yen,
      c.name as category_name,
      COALESCE((
        SELECT SUM(t.amount_yen)
        FROM transactions t
        WHERE t.category_id = b.category_id
          AND t.type = 'expense'
          AND strftime('%Y-%m', t.transaction_date) = b.month
      ), 0) as spent_yen
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    WHERE b.month = ?
    ORDER BY c.name ASC
  `;
  return query<Budget>(sql, [month]);
}

/**
 * Set or update a budget limit for a category in a month
 */
export async function setCategoryBudget(categoryId: number, month: string, limitYen: number): Promise<void> {
  await run(
    `INSERT INTO budgets (category_id, month, limit_yen)
     VALUES (?, ?, ?)
     ON CONFLICT(category_id, month) DO UPDATE SET limit_yen = excluded.limit_yen`,
    [categoryId, month, Math.max(0, Math.round(limitYen))]
  );
}

/**
 * Delete a category budget
 */
export async function deleteBudget(id: number): Promise<void> {
  await run("DELETE FROM budgets WHERE id = ?", [id]);
}

/**
 * Copy all budgets from a previous month to a target month
 */
export async function copyBudgetFromPreviousMonth(fromMonth: string, toMonth: string): Promise<number> {
  const previousBudgets = await query<Budget>(
    "SELECT category_id, limit_yen FROM budgets WHERE month = ?",
    [fromMonth]
  );

  if (previousBudgets.length === 0) {
    return 0;
  }

  return await runTransaction(async (db) => {
    let count = 0;
    for (const b of previousBudgets) {
      db.run(
        `INSERT INTO budgets (category_id, month, limit_yen)
         VALUES (?, ?, ?)
         ON CONFLICT(category_id, month) DO UPDATE SET limit_yen = excluded.limit_yen`,
        [b.category_id, toMonth, b.limit_yen]
      );
      count++;
    }
    return count;
  });
}
