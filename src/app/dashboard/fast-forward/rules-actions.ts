'use server'

import { createClient } from '@/lib/supabase/server'
import { createClientSideDefaults } from '@/lib/ruleDefaults'
import {
  RuleType,
  RuleDefinition,
  AnyRuleConfig,
  DEFAULT_RULE_CONFIGS,
  DEFAULT_ENABLED_STATE,
} from '@/types/rules'

/**
 * Fetch all rules for a user from Supabase.
 * If no rules exist, returns defaults.
 */
export async function getRulesForUser(): Promise<RuleDefinition[]> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Fetch all rules for this user
  const { data: rules, error } = await supabase
    .from('scenario_rules')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    // If table doesn't exist, just return defaults
    // (this is expected if migration hasn't run)
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      console.warn('scenario_rules table does not exist yet, using defaults')
      return createClientSideDefaults(user.id)
    }
    console.error('Error fetching rules:', error)
    // For other errors, still return defaults rather than throwing
    return createClientSideDefaults(user.id)
  }

  // If no rules found, return defaults
  if (!rules || rules.length === 0) {
    return createDefaultRules(user.id)
  }

  return rules as RuleDefinition[]
}

/**
 * Save or update a single rule configuration for a user.
 */
export async function saveRuleConfig(
  ruleType: RuleType,
  enabled: boolean,
  config: AnyRuleConfig
): Promise<RuleDefinition> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  console.log(`💾 Saving ${ruleType} rule:`, { enabled, config })

  // Upsert the rule (update if exists, insert if new)
  const { data, error } = await supabase
    .from('scenario_rules')
    .upsert(
      {
        user_id: user.id,
        rule_type: ruleType,
        enabled,
        config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,rule_type' }
    )
    .select()
    .single()

  if (error) {
    console.error('❌ Error saving rule:', error)
    throw new Error(`Failed to save ${ruleType} rule: ${error.message}`)
  }

  console.log(`✅ Rule saved:`, data)
  return data as RuleDefinition
}

/**
 * Reset all rules for a user to defaults.
 * Deletes all existing rules and returns new defaults.
 */
export async function resetRulesToDefaults(): Promise<RuleDefinition[]> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Delete all existing rules for this user
  const { error: deleteError } = await supabase
    .from('scenario_rules')
    .delete()
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('Error deleting rules:', deleteError)
    throw new Error('Failed to reset rules')
  }

  // Create and return defaults
  return createDefaultRules(user.id)
}

/**
 * Helper: Create and insert default rules for a new user.
 * Called when rules don't exist.
 */
async function createDefaultRules(userId: string): Promise<RuleDefinition[]> {
  const supabase = await createClient()

  const ruleTypes: RuleType[] = ['cash', 'investable', 'income', 'expense', 'inflation']
  const now = new Date().toISOString()

  const rulesToInsert = ruleTypes.map((ruleType) => ({
    user_id: userId,
    rule_type: ruleType,
    enabled: DEFAULT_ENABLED_STATE[ruleType],
    config: DEFAULT_RULE_CONFIGS[ruleType],
    created_at: now,
    updated_at: now,
  }))

  const { data, error } = await supabase
    .from('scenario_rules')
    .insert(rulesToInsert)
    .select()

  if (error) {
    console.error('Error creating default rules:', error)
    // Don't throw here—just return client-side defaults
    // This handles the case where rules table doesn't exist yet
    return createClientSideDefaults(userId)
  }

  return data as RuleDefinition[]
}
