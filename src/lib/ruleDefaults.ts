/**
 * Client-side utilities for rule management.
 * These are NOT server actions - they run client-side.
 */

import {
  RuleType,
  RuleDefinition,
  DEFAULT_RULE_CONFIGS,
  DEFAULT_ENABLED_STATE,
} from '@/types/rules'

/**
 * Create default rule objects client-side for initialization.
 * Used when DB insertion fails or as offline fallback.
 */
export function createClientSideDefaults(userId: string): RuleDefinition[] {
  const ruleTypes: RuleType[] = ['cash', 'investable', 'income', 'expense', 'inflation']
  const now = new Date().toISOString()

  return ruleTypes.map((ruleType) => ({
    id: `temp-${ruleType}-${Date.now()}`,
    user_id: userId,
    rule_type: ruleType,
    enabled: DEFAULT_ENABLED_STATE[ruleType],
    config: DEFAULT_RULE_CONFIGS[ruleType],
    created_at: now,
    updated_at: now,
  }))
}
