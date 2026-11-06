/**
 * Recurring Expenses Service
 * Handles scheduled reminders (Rent, Phone, Subscriptions).
 * Requires explicit user confirmation to create paid transactions, advancing the due date.
 */
import { query, queryOne, run, runTransaction } from '../database/db';
import type { RecurringExpense } from '../types';

/**
 * Advance a date string (YYYY-MM-DD) based on frequency
 */
export function calculateNextDueDate(currentDateStr: string, frequency: 'monthly' | 'weekly' | 'yearly'): string {
  const parts = currentDateStr.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let day = parseInt(parts[2], 10);

  if (frequency === 'monthly') {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  } else if (frequency === 'weekly') {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } else if (frequency === 'yearly') {
    year += 1;
  }

  // Handle month end day clamping (e.g. Feb 30 -> Feb 28/29)
  const maxDays = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(day, maxDays);

  return `${year}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

/**
 * Fetch all recurring expenses
 */
export async function getRecurringExpenses(onlyActive: boolean = false): Promise<RecurringExpense[]> {
  let sql = `
    SELECT
      r.*,
      c.name as category_name
    FROM recurring_expenses r
    LEFT JOIN categories c ON r.category_id = c.id
  `;
  if (onlyActive) {
    sql += ` WHERE r.is_active = 1`;
  }
  sql += ` ORDER BY r.next_due_date ASC`;

  return query<RecurringExpense>(sql);
}

/**
 * Create a new recurring expense reminder
 */
export async function createRecurringExpense(params: {
  name: string;
  amount_yen: number;
  category_id: number | null;
  frequency: 'monthly' | 'weekly' | 'yearly';
  next_due_date: string;
  note?: string | null;
  is_active?: number;
}): Promise<number> {
  if (params.amount_yen <= 0) {
    throw new Error('Recurring amount must be greater than ¥0.');
  }
  const res = await run(
    `INSERT INTO recurring_expenses (name, amount_yen, category_id, frequency, next_due_date, is_active, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      params.name.trim(),
      Math.round(params.amount_yen),
      params.category_id,
      params.frequency,
      params.next_due_date,
      params.is_active ?? 1,
      params.note ?? null,
    ]
  );
  return res.lastInsertRowid;
}

/**
 * Update recurring expense
 */
export async function updateRecurringExpense(
  id: number,
  params: {
    name: string;
    amount_yen: number;
    category_id: number | null;
    frequency: 'monthly' | 'weekly' | 'yearly';
    next_due_date: string;
    note?: string | null;
    is_active?: number;
  }
): Promise<void> {
  if (params.amount_yen <= 0) {
    throw new Error('Recurring amount must be greater than ¥0.');
  }
  await run(
    `UPDATE recurring_expenses
     SET name = ?, amount_yen = ?, category_id = ?, frequency = ?, next_due_date = ?, is_active = ?, note = ?
     WHERE id = ?`,
    [
      params.name.trim(),
      Math.round(params.amount_yen),
      params.category_id,
      params.frequency,
      params.next_due_date,
      params.is_active ?? 1,
      params.note ?? null,
      id,
    ]
  );
}

/**
 * Delete a recurring expense
 */
export async function deleteRecurringExpense(id: number): Promise<void> {
  await run("DELETE FROM recurring_expenses WHERE id = ?", [id]);
}

/**
 * Confirm Payment of a Recurring Expense:
 * 1. Checks if already paid on this date to prevent duplicate transactions
 * 2. Creates an expense transaction
 * 3. Advances the next_due_date to the subsequent cycle
 */
export async function confirmRecurringPayment(
  recurringId: number,
  paymentDate: string
): Promise<number> {
  return await runTransaction(async (db) => {
    // 1. Get recurring details
    const recRes = db.exec(`SELECT * FROM recurring_expenses WHERE id = ${recurringId};`);
    if (recRes.length === 0 || recRes[0].values.length === 0) {
      throw new Error('Recurring expense not found.');
    }
    const cols = recRes[0].columns;
    const row = recRes[0].values[0];
    const recObj: any = {};
    cols.forEach((col, idx) => {
      recObj[col] = row[idx];
    });

    // 2. Prevent duplicate transaction on the same date with same name
    const notePattern = `Recurring: ${recObj.name}%`;
    const dupCheck = db.exec(
      `SELECT id FROM transactions
       WHERE type = 'expense'
         AND amount_yen = ${recObj.amount_yen}
         AND transaction_date = '${paymentDate}'
         AND note LIKE '${notePattern}' LIMIT 1;`
    );

    if (dupCheck.length > 0 && dupCheck[0].values.length > 0) {
      throw new Error(`This recurring payment was already recorded for ${paymentDate}.`);
    }

    // 3. Create expense transaction
    db.run(
      `INSERT INTO transactions (type, amount_yen, category_id, transaction_date, note)
       VALUES ('expense', ?, ?, ?, ?)`,
      [
        recObj.amount_yen,
        recObj.category_id,
        paymentDate,
        `Recurring: ${recObj.name}${recObj.note ? ` - ${recObj.note}` : ''}`,
      ]
    );

    // 4. Advance next due date
    const nextDate = calculateNextDueDate(recObj.next_due_date, recObj.frequency);
    db.run(
      `UPDATE recurring_expenses SET next_due_date = ? WHERE id = ?`,
      [nextDate, recurringId]
    );

    const txRes = db.exec("SELECT last_insert_rowid();");
    return txRes[0].values[0][0] as number;
  });
}
