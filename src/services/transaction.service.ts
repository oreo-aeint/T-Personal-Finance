/**
 * Transaction and Category Service
 * Handles CRUD operations, filtering, category associations, and spending calculations.
 */
import { query, queryOne, run } from '../database/db';
import type { Category, Transaction, TransactionType } from '../types';

/**
 * Fetch all categories or filter by type ('income' | 'expense')
 */
export async function getCategories(type?: TransactionType): Promise<Category[]> {
  if (type) {
    return query<Category>(
      "SELECT * FROM categories WHERE type = ? ORDER BY is_default DESC, name ASC",
      [type]
    );
  }
  return query<Category>(
    "SELECT * FROM categories ORDER BY type ASC, is_default DESC, name ASC"
  );
}

/**
 * Add a new category
 */
export async function addCategory(name: string, type: TransactionType, icon: string = 'Tag'): Promise<number> {
  const res = await run(
    "INSERT INTO categories (name, type, icon, is_default) VALUES (?, ?, ?, 0)",
    [name.trim(), type, icon]
  );
  return res.lastInsertRowid;
}

/**
 * Update a category
 */
export async function updateCategory(id: number, name: string, icon: string): Promise<void> {
  await run(
    "UPDATE categories SET name = ?, icon = ? WHERE id = ?",
    [name.trim(), icon, id]
  );
}

/**
 * Delete a custom category
 */
export async function deleteCategory(id: number): Promise<void> {
  // Disallow deleting default categories
  const cat = await queryOne<Category>("SELECT * FROM categories WHERE id = ?", [id]);
  if (!cat) return;
  if (cat.is_default === 1) {
    throw new Error('Default system categories cannot be deleted.');
  }
  await run("DELETE FROM categories WHERE id = ?", [id]);
}

/**
 * Fetch filtered transactions
 */
export async function getTransactions(options?: {
  month?: string; // YYYY-MM
  type?: TransactionType | 'all';
  categoryId?: number | 'all';
  searchQuery?: string;
  limit?: number;
}): Promise<Transaction[]> {
  let sql = `
    SELECT
      t.*,
      c.name as category_name,
      c.icon as category_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (options?.month) {
    sql += ` AND strftime('%Y-%m', t.transaction_date) = ?`;
    params.push(options.month);
  }

  if (options?.type && options.type !== 'all') {
    sql += ` AND t.type = ?`;
    params.push(options.type);
  }

  if (options?.categoryId && options.categoryId !== 'all') {
    sql += ` AND t.category_id = ?`;
    params.push(options.categoryId);
  }

  if (options?.searchQuery && options.searchQuery.trim().length > 0) {
    sql += ` AND (t.note LIKE ? OR c.name LIKE ?)`;
    const searchPattern = `%${options.searchQuery.trim()}%`;
    params.push(searchPattern, searchPattern);
  }

  sql += ` ORDER BY t.transaction_date DESC, t.id DESC`;

  if (options?.limit && options.limit > 0) {
    sql += ` LIMIT ${options.limit}`;
  }

  return query<Transaction>(sql, params);
}

/**
 * Add a transaction
 */
export async function addTransaction(params: {
  type: TransactionType;
  amount_yen: number;
  category_id: number | null;
  transaction_date: string;
  note?: string | null;
}): Promise<number> {
  if (params.amount_yen <= 0) {
    throw new Error('Transaction amount must be greater than ¥0.');
  }
  const res = await run(
    `INSERT INTO transactions (type, amount_yen, category_id, transaction_date, note)
     VALUES (?, ?, ?, ?, ?)`,
    [params.type, Math.round(params.amount_yen), params.category_id, params.transaction_date, params.note ?? null]
  );
  return res.lastInsertRowid;
}

/**
 * Update an existing transaction
 */
export async function updateTransaction(
  id: number,
  params: {
    type: TransactionType;
    amount_yen: number;
    category_id: number | null;
    transaction_date: string;
    note?: string | null;
  }
): Promise<void> {
  if (params.amount_yen <= 0) {
    throw new Error('Transaction amount must be greater than ¥0.');
  }
  await run(
    `UPDATE transactions
     SET type = ?, amount_yen = ?, category_id = ?, transaction_date = ?, note = ?
     WHERE id = ?`,
    [params.type, Math.round(params.amount_yen), params.category_id, params.transaction_date, params.note ?? null, id]
  );
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(id: number): Promise<void> {
  await run("DELETE FROM transactions WHERE id = ?", [id]);
}
