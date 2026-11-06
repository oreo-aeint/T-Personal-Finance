/**
 * Developer Database Management Service
 * Provides inspection, realistic test seeding, granular purging, and factory reset.
 */
import { query, queryOne, runTransaction, exportDatabaseBinary } from '../database/db';
import { seedDatabase } from '../database/seed';
import { getCurrentMonthString, getTodayDateString } from '../utils/date';

export interface DatabaseStats {
  tableCounts: {
    employment_settings: number;
    salary_records: number;
    salary_deductions: number;
    categories: number;
    transactions: number;
    budgets: number;
    savings_goals: number;
    savings_contributions: number;
    recurring_expenses: number;
  };
  totalTransactions: number;
  databaseSizeBytes: number;
  isCleanProductionState: boolean;
}

/**
 * Inspect live database tables and return record counts and SQLite file size
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  const [
    emp,
    sal,
    ded,
    cat,
    tx,
    bud,
    goal,
    contrib,
    rec,
  ] = await Promise.all([
    queryOne<{ c: number }>("SELECT COUNT(*) as c FROM employment_settings"),
    queryOne<{ c: number }>("SELECT COUNT(*) as c FROM salary_records"),
    queryOne<{ c: number }>("SELECT COUNT(*) as c FROM salary_deductions"),
    queryOne<{ c: number }>("SELECT COUNT(*) as c FROM categories"),
    queryOne<{ c: number }>("SELECT COUNT(*) as c FROM transactions"),
    queryOne<{ c: number }>("SELECT COUNT(*) as c FROM budgets"),
    queryOne<{ c: number }>("SELECT COUNT(*) as c FROM savings_goals"),
    queryOne<{ c: number }>("SELECT COUNT(*) as c FROM savings_contributions"),
    queryOne<{ c: number }>("SELECT COUNT(*) as c FROM recurring_expenses"),
  ]);

  const binary = await exportDatabaseBinary();

  const counts = {
    employment_settings: emp?.c ?? 0,
    salary_records: sal?.c ?? 0,
    salary_deductions: ded?.c ?? 0,
    categories: cat?.c ?? 0,
    transactions: tx?.c ?? 0,
    budgets: bud?.c ?? 0,
    savings_goals: goal?.c ?? 0,
    savings_contributions: contrib?.c ?? 0,
    recurring_expenses: rec?.c ?? 0,
  };

  // A clean state has 0 user transactions, 0 salary records, and 0 contributions
  const isClean = counts.transactions === 0 && counts.salary_records === 0 && counts.savings_contributions === 0;

  return {
    tableCounts: counts,
    totalTransactions: counts.transactions,
    databaseSizeBytes: binary.byteLength,
    isCleanProductionState: isClean,
  };
}

/**
 * 1-Click Seed of realistic Japanese student testing data:
 * Simulates 1 month of living in Tokyo with salary, deductions, daily bento, rent, and savings
 */
export async function seedRealisticTestData(targetMonth: string = getCurrentMonthString()): Promise<void> {
  await runTransaction(async (db) => {
    // 1. Locate categories
    const getCatId = (name: string, type: 'income' | 'expense') => {
      const res = db.exec(`SELECT id FROM categories WHERE name = '${name}' AND type = '${type}' LIMIT 1;`);
      if (res.length > 0 && res[0].values.length > 0) {
        return res[0].values[0][0] as number;
      }
      return null;
    };

    const catFood = getCatId('Food', 'expense');
    const catRent = getCatId('Rent', 'expense');
    const catTransport = getCatId('Transportation', 'expense');
    const catPhone = getCatId('Phone and Internet', 'expense');
    const catShopping = getCatId('Shopping', 'expense');
    const catEducation = getCatId('Education', 'expense');
    const catEntertainment = getCatId('Entertainment', 'expense');
    const catSalary = getCatId('Part-time Salary', 'income');

    // 2. Set realistic employment settings (14 hrs/week, ¥1,250/hr, payday 25th)
    db.run(
      `UPDATE employment_settings
       SET hourly_wage_yen = 1250, weekly_hours = 14, pay_day = 25, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1;`
    );

    // 3. Clear existing test data for clean seed
    db.run("DELETE FROM transactions;");
    db.run("DELETE FROM salary_deductions;");
    db.run("DELETE FROM salary_records;");
    db.run("DELETE FROM budgets;");
    db.run("DELETE FROM savings_contributions;");
    db.run("DELETE FROM savings_goals;");
    db.run("DELETE FROM recurring_expenses;");

    // 4. Create Salary Record (Pay period: targetMonth)
    // 56 hours * ¥1,250 = ¥70,000 Gross. Deductions = ¥5,200. Net = ¥64,800.
    const paidDate = `${targetMonth}-25`;
    db.run(
      `INSERT INTO salary_records (pay_period, paid_date, gross_yen, net_yen, hours_worked, note)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [targetMonth, paidDate, 70000, 64800, 56, 'Izakaya part-time shift (居酒屋アルバイト)']
    );
    const salRes = db.exec("SELECT last_insert_rowid();");
    const salId = salRes[0].values[0][0] as number;

    // Deductions
    db.run("INSERT INTO salary_deductions (salary_record_id, deduction_name, amount_yen) VALUES (?, ?, ?);", [salId, 'Income Tax (所得税)', 1800]);
    db.run("INSERT INTO salary_deductions (salary_record_id, deduction_name, amount_yen) VALUES (?, ?, ?);", [salId, 'Health Insurance (健康保険)', 3400]);

    // Linked Income Transaction for Net Salary
    db.run(
      `INSERT INTO transactions (type, amount_yen, category_id, transaction_date, note, salary_record_id)
       VALUES ('income', 64800, ?, ?, 'Izakaya monthly net salary payout', ?);`,
      [catSalary, paidDate, salId]
    );

    // 5. Daily Living Expenses
    const sampleExpenses = [
      { cat: catRent, amount: 60000, day: '01', note: 'Apartment monthly rent (アパート家賃)' },
      { cat: catTransport, amount: 6800, day: '02', note: 'Suica commuter pass renewal (通勤定期券)' },
      { cat: catFood, amount: 680, day: '03', note: '7-Eleven Salmon bento & green tea' },
      { cat: catShopping, amount: 880, day: '05', note: 'Daiso cleaning supplies' },
      { cat: catFood, amount: 2450, day: '07', note: 'Supermarket groceries (MyBasket / まいばすけっと)' },
      { cat: catPhone, amount: 2980, day: '10', note: 'Mobile SIM phone bill (LINEMO)' },
      { cat: catEducation, amount: 3200, day: '12', note: 'JLPT N2 vocabulary textbook' },
      { cat: catFood, amount: 520, day: '15', note: 'Lawson karaage-kun & onigiri' },
      { cat: catEntertainment, amount: 1800, day: '18', note: 'Cinema movie ticket in Shinjuku' },
      { cat: catFood, amount: 1950, day: '21', note: 'Seiyu supermarket weekly food' },
    ];

    for (const exp of sampleExpenses) {
      db.run(
        `INSERT INTO transactions (type, amount_yen, category_id, transaction_date, note)
         VALUES ('expense', ?, ?, ?, ?);`,
        [exp.amount, exp.cat, `${targetMonth}-${exp.day}`, exp.note]
      );
    }

    // 6. Budgets for the target month
    if (catFood) db.run("INSERT INTO budgets (category_id, month, limit_yen) VALUES (?, ?, 25000);", [catFood, targetMonth]);
    if (catRent) db.run("INSERT INTO budgets (category_id, month, limit_yen) VALUES (?, ?, 60000);", [catRent, targetMonth]);
    if (catTransport) db.run("INSERT INTO budgets (category_id, month, limit_yen) VALUES (?, ?, 10000);", [catTransport, targetMonth]);
    if (catPhone) db.run("INSERT INTO budgets (category_id, month, limit_yen) VALUES (?, ?, 4000);", [catPhone, targetMonth]);
    if (catShopping) db.run("INSERT INTO budgets (category_id, month, limit_yen) VALUES (?, ?, 8000);", [catShopping, targetMonth]);

    // 7. Savings Goals & Contributions
    db.run("INSERT INTO savings_goals (name, target_yen, target_date) VALUES ('Emergency Fund (非常資金)', 300000, '2027-03-31');");
    const g1Res = db.exec("SELECT last_insert_rowid();");
    const g1Id = g1Res[0].values[0][0] as number;
    db.run("INSERT INTO savings_contributions (goal_id, amount_yen, contribution_date, note) VALUES (?, 30000, ?, 'Initial emergency savings');", [g1Id, `${targetMonth}-02`]);
    db.run("INSERT INTO savings_contributions (goal_id, amount_yen, contribution_date, note) VALUES (?, 20000, ?, 'Part-time tip surplus deposit');", [g1Id, `${targetMonth}-26`]);

    db.run("INSERT INTO savings_goals (name, target_yen, target_date) VALUES ('Tuition Reserve (学費積立)', 200000, '2027-06-30');");
    const g2Res = db.exec("SELECT last_insert_rowid();");
    const g2Id = g2Res[0].values[0][0] as number;
    db.run("INSERT INTO savings_contributions (goal_id, amount_yen, contribution_date, note) VALUES (?, 15000, ?, 'Monthly school tuition deposit');", [g2Id, `${targetMonth}-26`]);

    // 8. Recurring Expenses
    db.run(
      `INSERT INTO recurring_expenses (name, amount_yen, category_id, frequency, next_due_date, is_active, note)
       VALUES ('Apartment Rent (家賃)', 60000, ?, 'monthly', ?, 1, 'Automatic bank transfer on 27th');`,
      [catRent, `${targetMonth}-27`]
    );
    db.run(
      `INSERT INTO recurring_expenses (name, amount_yen, category_id, frequency, next_due_date, is_active, note)
       VALUES ('Mobile Phone SIM (スマホ代)', 2980, ?, 'monthly', ?, 1, 'Credit card payment');`,
      [catPhone, `${targetMonth}-10`]
    );
    db.run(
      `INSERT INTO recurring_expenses (name, amount_yen, category_id, frequency, next_due_date, is_active, note)
       VALUES ('Fiber Internet (光回線)', 4180, ?, 'monthly', ?, 1, 'Apartment broadband');`,
      [catPhone, `${targetMonth}-15`]
    );
  });
}

/**
 * Clear test transactions and salary slips, leaving custom categories and goals
 */
export async function clearTransactionsOnly(): Promise<void> {
  await runTransaction(async (db) => {
    db.run("DELETE FROM transactions;");
    db.run("DELETE FROM salary_deductions;");
    db.run("DELETE FROM salary_records;");
    db.run("DELETE FROM savings_contributions;");
  });
}

/**
 * Reset to 100% spotless Factory State for production handover:
 * Purges all user data and restores default categories and employment settings
 */
export async function resetToFactoryState(): Promise<void> {
  await runTransaction(async (db) => {
    db.run("DELETE FROM transactions;");
    db.run("DELETE FROM salary_deductions;");
    db.run("DELETE FROM salary_records;");
    db.run("DELETE FROM budgets;");
    db.run("DELETE FROM savings_contributions;");
    db.run("DELETE FROM savings_goals;");
    db.run("DELETE FROM recurring_expenses;");
    db.run("DELETE FROM categories;");
    db.run("DELETE FROM employment_settings;");

    // Reset SQLite auto-increment IDs
    try {
      db.run("DELETE FROM sqlite_sequence;");
    } catch (e) {
      // sqlite_sequence may not exist yet
    }

    // Re-seed default 13 categories and default employment settings
    seedDatabase(db);
  });
}
