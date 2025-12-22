/**
 * Rank immunity system.
 * Ranks 254-255 are immune to:
 * - Inactive status enforcement
 * - Pending verification restrictions
 * - Any automated actions that could suspend, restrict, or remove access
 */

export const IMMUNE_RANK_MIN = 254;
export const IMMUNE_RANK_MAX = 255;

/**
 * Check if a rank is immune to status restrictions.
 * Immune ranks (254-255) cannot be restricted by inactive/pending status.
 */
export function isImmuneRank(rank: number | null | undefined): boolean {
  if (rank === null || rank === undefined) {
    return false;
  }
  return rank >= IMMUNE_RANK_MIN && rank <= IMMUNE_RANK_MAX;
}
