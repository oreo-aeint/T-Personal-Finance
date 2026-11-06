/**
 * Savings Goals & Contributions Service
 * Independent tracking of savings targets and deposits.
 * Note: Savings contributions are NOT counted as ordinary expenses.
 */
import { query, queryOne, run } from '../database/db';
import type { SavingsContribution, SavingsGoal } from '../types';

/**
 * Fetch all savings goals with current accumulated contributions
 */
export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const sql = `
    SELECT
      g.*,
      COALESCE((SELECT SUM(c.amount_yen) FROM savings_contributions c WHERE c.goal_id = g.id), 0) as current_saved_yen,
      (SELECT COUNT(c.id) FROM savings_contributions c WHERE c.goal_id = g.id) as contributions_count
    FROM savings_goals g
    ORDER BY g.created_at ASC
  `;
  return query<SavingsGoal>(sql);
}

/**
 * Fetch a single goal by ID with its contributions
 */
export async function getSavingsGoalById(id: number): Promise<{ goal: SavingsGoal | null; contributions: SavingsContribution[] }> {
  const goal = await queryOne<SavingsGoal>(
    `SELECT
       g.*,
       COALESCE((SELECT SUM(c.amount_yen) FROM savings_contributions c WHERE c.goal_id = g.id), 0) as current_saved_yen
     FROM savings_goals g WHERE g.id = ?`,
    [id]
  );

  const contributions = await query<SavingsContribution>(
    `SELECT * FROM savings_contributions WHERE goal_id = ? ORDER BY contribution_date DESC, id DESC`,
    [id]
  );

  return { goal, contributions };
}

/**
 * Create a new savings goal
 */
export async function createSavingsGoal(params: {
  name: string;
  target_yen: number;
  target_date?: string | null;
}): Promise<number> {
  if (params.target_yen <= 0) {
    throw new Error('Target amount must be greater than ¥0.');
  }
  const res = await run(
    `INSERT INTO savings_goals (name, target_yen, target_date) VALUES (?, ?, ?)`,
    [params.name.trim(), Math.round(params.target_yen), params.target_date ?? null]
  );
  return res.lastInsertRowid;
}

/**
 * Update an existing savings goal
 */
export async function updateSavingsGoal(
  id: number,
  params: { name: string; target_yen: number; target_date?: string | null }
): Promise<void> {
  if (params.target_yen <= 0) {
    throw new Error('Target amount must be greater than ¥0.');
  }
  await run(
    `UPDATE savings_goals SET name = ?, target_yen = ?, target_date = ? WHERE id = ?`,
    [params.name.trim(), Math.round(params.target_yen), params.target_date ?? null, id]
  );
}

/**
 * Delete a savings goal (contributions cascade-deleted by foreign key)
 */
export async function deleteSavingsGoal(id: number): Promise<void> {
  await run("DELETE FROM savings_goals WHERE id = ?", [id]);
}

/**
 * Add a savings contribution
 */
export async function addSavingsContribution(params: {
  goal_id: number;
  amount_yen: number;
  contribution_date: string;
  note?: string | null;
}): Promise<number> {
  if (params.amount_yen <= 0) {
    throw new Error('Contribution amount must be greater than ¥0.');
  }
  const res = await run(
    `INSERT INTO savings_contributions (goal_id, amount_yen, contribution_date, note)
     VALUES (?, ?, ?, ?)`,
    [params.goal_id, Math.round(params.amount_yen), params.contribution_date, params.note ?? null]
  );
  return res.lastInsertRowid;
}

/**
 * Delete a contribution
 */
export async function deleteSavingsContribution(id: number): Promise<void> {
  await run("DELETE FROM savings_contributions WHERE id = ?", [id]);
}
