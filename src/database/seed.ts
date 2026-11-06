/**
 * Database Seeding Logic
 * Seeds default categories and employment settings only once.
 * Preserves user custom categories and modifications.
 */
import type { Database } from 'sql.js';

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food', icon: 'Utensils' },
  { name: 'Rent', icon: 'Home' },
  { name: 'Transportation', icon: 'Train' },
  { name: 'Phone and Internet', icon: 'Smartphone' },
  { name: 'Shopping', icon: 'ShoppingBag' },
  { name: 'Healthcare', icon: 'HeartPulse' },
  { name: 'Education', icon: 'BookOpen' },
  { name: 'Entertainment', icon: 'Film' },
  { name: 'Personal Care', icon: 'Sparkles' },
  { name: 'Other', icon: 'MoreHorizontal' },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Part-time Salary', icon: 'Briefcase' },
  { name: 'Allowance', icon: 'Gift' },
  { name: 'Other Income', icon: 'Coins' },
];

export function seedDatabase(db: Database): void {
  // Check if categories are already populated
  const catCountResult = db.exec("SELECT COUNT(*) as count FROM categories");
  const count = catCountResult.length > 0 && catCountResult[0].values.length > 0
    ? (catCountResult[0].values[0][0] as number)
    : 0;

  if (count === 0) {
    // Seed default expense categories
    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      db.run(
        "INSERT INTO categories (name, type, icon, is_default) VALUES (?, 'expense', ?, 1)",
        [cat.name, cat.icon]
      );
    }

    // Seed default income categories
    for (const cat of DEFAULT_INCOME_CATEGORIES) {
      db.run(
        "INSERT INTO categories (name, type, icon, is_default) VALUES (?, 'income', ?, 1)",
        [cat.name, cat.icon]
      );
    }
  }

  // Check employment settings
  const settingsCountResult = db.exec("SELECT COUNT(*) as count FROM employment_settings WHERE id = 1");
  const settingsCount = settingsCountResult.length > 0 && settingsCountResult[0].values.length > 0
    ? (settingsCountResult[0].values[0][0] as number)
    : 0;

  if (settingsCount === 0) {
    db.run(
      `INSERT INTO employment_settings (id, hourly_wage_yen, weekly_hours, pay_frequency, pay_day, currency)
       VALUES (1, 1200, 8, 'monthly', 25, 'JPY')`
    );
  }
}
