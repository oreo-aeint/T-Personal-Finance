/**
 * Backup and Export Service
 * Provides atomic JSON backup/restore across all 9 tables, and CSV transaction export.
 */
import { query, runTransaction } from '../database/db';
import type { BackupData, Transaction } from '../types';

const BACKUP_FORMAT_VERSION = 1;

/**
 * Generate full versioned JSON backup of all 9 tables
 */
export async function createFullBackup(): Promise<BackupData> {
  const [
    employmentSettings,
    salaryRecords,
    salaryDeductions,
    categories,
    transactions,
    budgets,
    savingsGoals,
    savingsContributions,
    recurringExpenses,
  ] = await Promise.all([
    query("SELECT * FROM employment_settings"),
    query("SELECT * FROM salary_records"),
    query("SELECT * FROM salary_deductions"),
    query("SELECT * FROM categories"),
    query("SELECT * FROM transactions"),
    query("SELECT * FROM budgets"),
    query("SELECT * FROM savings_goals"),
    query("SELECT * FROM savings_contributions"),
    query("SELECT * FROM recurring_expenses"),
  ]);

  return {
    version: BACKUP_FORMAT_VERSION,
    timestamp: new Date().toISOString(),
    tables: {
      employment_settings: employmentSettings,
      salary_records: salaryRecords,
      salary_deductions: salaryDeductions,
      categories: categories,
      transactions: transactions,
      budgets: budgets,
      savings_goals: savingsGoals,
      savings_contributions: savingsContributions,
      recurring_expenses: recurringExpenses,
    },
  };
}

/**
 * Restore database from a validated JSON backup object atomically
 */
export async function restoreFromBackup(backup: any): Promise<void> {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Invalid backup file: Not a valid JSON object.');
  }

  if (!backup.version || !backup.tables) {
    throw new Error('Invalid backup format: Missing version or tables payload.');
  }

  const { tables } = backup;
  const requiredTables = [
    'employment_settings',
    'salary_records',
    'salary_deductions',
    'categories',
    'transactions',
    'budgets',
    'savings_goals',
    'savings_contributions',
    'recurring_expenses',
  ];

  for (const t of requiredTables) {
    if (!Array.isArray(tables[t])) {
      throw new Error(`Invalid backup content: Missing or invalid table "${t}".`);
    }
  }

  // Restore atomically inside a transaction
  await runTransaction(async (db) => {
    // 1. Clear existing tables in correct order (child tables first)
    db.run("DELETE FROM transactions;");
    db.run("DELETE FROM salary_deductions;");
    db.run("DELETE FROM salary_records;");
    db.run("DELETE FROM budgets;");
    db.run("DELETE FROM savings_contributions;");
    db.run("DELETE FROM savings_goals;");
    db.run("DELETE FROM recurring_expenses;");
    db.run("DELETE FROM categories;");
    db.run("DELETE FROM employment_settings;");

    // 2. Insert employment_settings
    for (const row of tables.employment_settings) {
      db.run(
        `INSERT INTO employment_settings (id, hourly_wage_yen, weekly_hours, pay_frequency, pay_day, currency, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.hourly_wage_yen, row.weekly_hours, row.pay_frequency, row.pay_day, row.currency, row.updated_at]
      );
    }

    // 3. Insert categories
    for (const row of tables.categories) {
      db.run(
        `INSERT INTO categories (id, name, type, icon, is_default)
         VALUES (?, ?, ?, ?, ?)`,
        [row.id, row.name, row.type, row.icon, row.is_default]
      );
    }

    // 4. Insert salary_records
    for (const row of tables.salary_records) {
      db.run(
        `INSERT INTO salary_records (id, pay_period, paid_date, gross_yen, net_yen, hours_worked, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.pay_period, row.paid_date, row.gross_yen, row.net_yen, row.hours_worked, row.note, row.created_at]
      );
    }

    // 5. Insert salary_deductions
    for (const row of tables.salary_deductions) {
      db.run(
        `INSERT INTO salary_deductions (id, salary_record_id, deduction_name, amount_yen)
         VALUES (?, ?, ?, ?)`,
        [row.id, row.salary_record_id, row.deduction_name, row.amount_yen]
      );
    }

    // 6. Insert transactions
    for (const row of tables.transactions) {
      db.run(
        `INSERT INTO transactions (id, type, amount_yen, category_id, transaction_date, note, salary_record_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.type, row.amount_yen, row.category_id, row.transaction_date, row.note, row.salary_record_id, row.created_at]
      );
    }

    // 7. Insert budgets
    for (const row of tables.budgets) {
      db.run(
        `INSERT INTO budgets (id, category_id, month, limit_yen)
         VALUES (?, ?, ?, ?)`,
        [row.id, row.category_id, row.month, row.limit_yen]
      );
    }

    // 8. Insert savings_goals
    for (const row of tables.savings_goals) {
      db.run(
        `INSERT INTO savings_goals (id, name, target_yen, target_date, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [row.id, row.name, row.target_yen, row.target_date, row.created_at]
      );
    }

    // 9. Insert savings_contributions
    for (const row of tables.savings_contributions) {
      db.run(
        `INSERT INTO savings_contributions (id, goal_id, amount_yen, contribution_date, note)
         VALUES (?, ?, ?, ?, ?)`,
        [row.id, row.goal_id, row.amount_yen, row.contribution_date, row.note]
      );
    }

    // 10. Insert recurring_expenses
    for (const row of tables.recurring_expenses) {
      db.run(
        `INSERT INTO recurring_expenses (id, name, amount_yen, category_id, frequency, next_due_date, is_active, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.name, row.amount_yen, row.category_id, row.frequency, row.next_due_date, row.is_active, row.note]
      );
    }
  });
}

/**
 * Generate CSV string from all transactions
 */
export async function exportTransactionsToCSV(): Promise<string> {
  const sql = `
    SELECT
      t.id,
      t.transaction_date,
      t.type,
      COALESCE(c.name, 'Uncategorized') as category,
      t.amount_yen,
      COALESCE(t.note, '') as note,
      CASE WHEN t.salary_record_id IS NOT NULL THEN 'YES' ELSE 'NO' END as is_salary_payment
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    ORDER BY t.transaction_date DESC, t.id DESC
  `;
  const rows = await query<any>(sql);

  const headers = ['ID', 'Date', 'Type', 'Category', 'Amount (JPY)', 'Note', 'Linked to Salary'];
  const lines = [headers.join(',')];

  for (const r of rows) {
    const escapedNote = `"${String(r.note).replace(/"/g, '""')}"`;
    const escapedCat = `"${String(r.category).replace(/"/g, '""')}"`;
    lines.push([
      r.id,
      r.transaction_date,
      r.type,
      escapedCat,
      r.amount_yen,
      escapedNote,
      r.is_salary_payment,
    ].join(','));
  }

  return lines.join('\n');
}

/**
 * Trigger browser file download for backup or CSV
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
