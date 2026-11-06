/**
 * Exact SQLite Database Schema for T-Personal Finance Tracking
 * Matches the 9 required tables and indexes.
 */

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS employment_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    hourly_wage_yen INTEGER NOT NULL DEFAULT 1200,
    weekly_hours REAL NOT NULL DEFAULT 8,
    pay_frequency TEXT NOT NULL DEFAULT 'monthly',
    pay_day INTEGER,
    currency TEXT NOT NULL DEFAULT 'JPY',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS salary_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pay_period TEXT NOT NULL,
    paid_date TEXT NOT NULL,
    gross_yen INTEGER NOT NULL,
    net_yen INTEGER NOT NULL,
    hours_worked REAL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pay_period)
);

CREATE TABLE IF NOT EXISTS salary_deductions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salary_record_id INTEGER NOT NULL,
    deduction_name TEXT NOT NULL,
    amount_yen INTEGER NOT NULL CHECK(amount_yen >= 0),
    FOREIGN KEY (salary_record_id)
        REFERENCES salary_records(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    icon TEXT,
    is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    amount_yen INTEGER NOT NULL CHECK(amount_yen > 0),
    category_id INTEGER,
    transaction_date TEXT NOT NULL,
    note TEXT,
    salary_record_id INTEGER UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id)
        REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (salary_record_id)
        REFERENCES salary_records(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    limit_yen INTEGER NOT NULL CHECK(limit_yen >= 0),
    UNIQUE(category_id, month),
    FOREIGN KEY (category_id)
        REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS savings_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target_yen INTEGER NOT NULL CHECK(target_yen > 0),
    target_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS savings_contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    amount_yen INTEGER NOT NULL CHECK(amount_yen > 0),
    contribution_date TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY (goal_id)
        REFERENCES savings_goals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recurring_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount_yen INTEGER NOT NULL CHECK(amount_yen > 0),
    category_id INTEGER,
    frequency TEXT NOT NULL DEFAULT 'monthly',
    next_due_date TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    FOREIGN KEY (category_id)
        REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_date
ON transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_transactions_category
ON transactions(category_id);

CREATE INDEX IF NOT EXISTS idx_salary_period
ON salary_records(pay_period);

CREATE INDEX IF NOT EXISTS idx_contributions_goal
ON savings_contributions(goal_id);
`;
