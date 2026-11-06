/**
 * Salary Service
 * Manages employment settings, estimated gross/net calculations,
 * actual salary payments, deductions, and atomic synchronization with linked income transactions.
 */
import { query, queryOne, run, runTransaction } from '../database/db';
import type { EmploymentSettings, SalaryDeduction, SalaryRecord } from '../types';

/**
 * Calculate Estimated Monthly Gross Salary:
 * Formula: Hourly Wage × Weekly Working Hours × 52 ÷ 12
 */
export function calculateEstimatedGross(hourlyWage: number, weeklyHours: number): number {
  if (hourlyWage <= 0 || weeklyHours <= 0) return 0;
  return Math.round((hourlyWage * weeklyHours * 52) / 12);
}

/**
 * Fetch employment settings (singleton id=1)
 */
export async function getEmploymentSettings(): Promise<EmploymentSettings> {
  let settings = await queryOne<EmploymentSettings>(
    "SELECT * FROM employment_settings WHERE id = 1"
  );
  if (!settings) {
    await run(
      `INSERT INTO employment_settings (id, hourly_wage_yen, weekly_hours, pay_frequency, pay_day, currency)
       VALUES (1, 1200, 8, 'monthly', 25, 'JPY')`
    );
    settings = (await queryOne<EmploymentSettings>("SELECT * FROM employment_settings WHERE id = 1"))!;
  }
  return settings;
}

/**
 * Update employment settings
 */
export async function updateEmploymentSettings(
  hourlyWage: number,
  weeklyHours: number,
  payDay: number | null,
  payFrequency: string = 'monthly'
): Promise<void> {
  await run(
    `UPDATE employment_settings
     SET hourly_wage_yen = ?, weekly_hours = ?, pay_day = ?, pay_frequency = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [hourlyWage, weeklyHours, payDay, payFrequency]
  );
}

/**
 * Fetch all salary records with their deductions
 */
export async function getSalaryRecords(): Promise<SalaryRecord[]> {
  const records = await query<SalaryRecord>(
    "SELECT * FROM salary_records ORDER BY pay_period DESC"
  );

  for (const rec of records) {
    rec.deductions = await query<SalaryDeduction>(
      "SELECT * FROM salary_deductions WHERE salary_record_id = ?",
      [rec.id]
    );
  }

  return records;
}

/**
 * Fetch a salary record for a specific month/period
 */
export async function getSalaryRecordByPeriod(period: string): Promise<SalaryRecord | null> {
  const record = await queryOne<SalaryRecord>(
    "SELECT * FROM salary_records WHERE pay_period = ?",
    [period]
  );
  if (record) {
    record.deductions = await query<SalaryDeduction>(
      "SELECT * FROM salary_deductions WHERE salary_record_id = ?",
      [record.id]
    );
  }
  return record;
}

/**
 * Save an actual salary record atomically:
 * 1. Insert/Update salary_records
 * 2. Save deduction details
 * 3. Automatically create/update ONE linked income transaction for net salary
 */
export async function saveActualSalaryRecord(params: {
  id?: number;
  pay_period: string; // YYYY-MM
  paid_date: string; // YYYY-MM-DD
  gross_yen: number;
  net_yen: number;
  hours_worked: number | null;
  note?: string | null;
  deductions: { deduction_name: string; amount_yen: number }[];
}): Promise<number> {
  return await runTransaction(async (db) => {
    // Locate Part-time Salary category ID
    const catRes = db.exec("SELECT id FROM categories WHERE name = 'Part-time Salary' AND type = 'income' LIMIT 1;");
    let categoryId: number | null = null;
    if (catRes.length > 0 && catRes[0].values.length > 0) {
      categoryId = catRes[0].values[0][0] as number;
    } else {
      // Fallback to any income category
      const fallbackCat = db.exec("SELECT id FROM categories WHERE type = 'income' LIMIT 1;");
      if (fallbackCat.length > 0 && fallbackCat[0].values.length > 0) {
        categoryId = fallbackCat[0].values[0][0] as number;
      }
    }

    let recordId = params.id;

    // Check if a salary record for this pay_period already exists
    const stmt = db.prepare("SELECT id FROM salary_records WHERE pay_period = ? LIMIT 1;");
    let existingIdForPeriod: number | null = null;
    try {
      stmt.bind([params.pay_period]);
      if (stmt.step()) {
        const row = stmt.getAsObject() as { id: number };
        existingIdForPeriod = row.id;
      }
    } finally {
      stmt.free();
    }

    if (recordId) {
      // If editing an existing record and user changed the month to another month that already exists
      if (existingIdForPeriod !== null && existingIdForPeriod !== recordId) {
        throw new Error(`A salary record for period ${params.pay_period} already exists. Please choose a different month.`);
      }

      // Update existing record
      db.run(
        `UPDATE salary_records
         SET pay_period = ?, paid_date = ?, gross_yen = ?, net_yen = ?, hours_worked = ?, note = ?
         WHERE id = ?`,
        [params.pay_period, params.paid_date, params.gross_yen, params.net_yen, params.hours_worked, params.note ?? null, recordId]
      );

      // Replace deductions
      db.run("DELETE FROM salary_deductions WHERE salary_record_id = ?", [recordId]);
    } else if (existingIdForPeriod !== null) {
      // Record already exists for this pay period! Seamlessly update it instead of crashing with UNIQUE constraint
      recordId = existingIdForPeriod;
      db.run(
        `UPDATE salary_records
         SET pay_period = ?, paid_date = ?, gross_yen = ?, net_yen = ?, hours_worked = ?, note = ?
         WHERE id = ?`,
        [params.pay_period, params.paid_date, params.gross_yen, params.net_yen, params.hours_worked, params.note ?? null, recordId]
      );

      // Replace deductions
      db.run("DELETE FROM salary_deductions WHERE salary_record_id = ?", [recordId]);
    } else {
      // Insert new record
      db.run(
        `INSERT INTO salary_records (pay_period, paid_date, gross_yen, net_yen, hours_worked, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [params.pay_period, params.paid_date, params.gross_yen, params.net_yen, params.hours_worked, params.note ?? null]
      );
      const res = db.exec("SELECT last_insert_rowid();");
      recordId = res[0].values[0][0] as number;
    }

    // Insert deductions
    for (const d of params.deductions) {
      if (d.amount_yen > 0 && d.deduction_name.trim().length > 0) {
        db.run(
          "INSERT INTO salary_deductions (salary_record_id, deduction_name, amount_yen) VALUES (?, ?, ?)",
          [recordId, d.deduction_name.trim(), d.amount_yen]
        );
      }
    }

    // Ensure linked transaction exists and is synchronized
    const existingTx = db.exec(`SELECT id FROM transactions WHERE salary_record_id = ${recordId};`);
    const noteText = `Salary payout for ${params.pay_period}${params.hours_worked ? ` (${params.hours_worked} hrs)` : ''}`;

    if (existingTx.length > 0 && existingTx[0].values.length > 0) {
      const txId = existingTx[0].values[0][0] as number;
      db.run(
        `UPDATE transactions
         SET amount_yen = ?, transaction_date = ?, note = ?, category_id = ?
         WHERE id = ?`,
        [params.net_yen, params.paid_date, noteText, categoryId, txId]
      );
    } else {
      db.run(
        `INSERT INTO transactions (type, amount_yen, category_id, transaction_date, note, salary_record_id)
         VALUES ('income', ?, ?, ?, ?, ?)`,
        [params.net_yen, categoryId, params.paid_date, noteText, recordId]
      );
    }

    return recordId!;
  });
}

/**
 * Delete a salary record and automatically remove its linked transaction & deductions
 */
export async function deleteSalaryRecord(id: number): Promise<void> {
  await runTransaction(async (db) => {
    // Delete linked transaction first (foreign key will also set null, but prompt requires strict clean consistency)
    db.run("DELETE FROM transactions WHERE salary_record_id = ?", [id]);
    // Deductions deleted via ON DELETE CASCADE
    db.run("DELETE FROM salary_records WHERE id = ?", [id]);
  });
}
