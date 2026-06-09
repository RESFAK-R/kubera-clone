/**
 * Client-side utilities for rule management.
 * These are NOT server actions - they run client-side.
 */

import {
  RuleType,
  RuleDefinition,
  AnyRuleConfig,
  IncomeRuleConfig,
  ExpenseRuleConfig,
  CashGrowthRuleConfig,
  InvestableGrowthRuleConfig,
  InflationRuleConfig,
  DEFAULT_RULE_CONFIGS,
  DEFAULT_ENABLED_STATE,
} from '@/types/rules'

function numberFrom(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function booleanMonths(value: unknown, fallback: boolean[]): boolean[] {
  if (!Array.isArray(value)) return [...fallback]
  return Array.from({ length: 12 }, (_, index) =>
    typeof value[index] === 'boolean' ? value[index] : fallback[index] ?? true,
  )
}

function plainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function normalizeRuleConfig(ruleType: RuleType, config: unknown): AnyRuleConfig {
  const raw = plainObject(config)
  const defaults = DEFAULT_RULE_CONFIGS[ruleType]

  if (ruleType === 'cash') {
    const d = defaults as CashGrowthRuleConfig
    return {
      ...d,
      ...raw,
      growth_percent_yearly: numberFrom(raw.growth_percent_yearly ?? raw.annualRate, d.growth_percent_yearly),
    } as CashGrowthRuleConfig
  }

  if (ruleType === 'investable') {
    const d = defaults as InvestableGrowthRuleConfig
    return {
      ...d,
      ...raw,
      growth_percent_yearly: numberFrom(raw.growth_percent_yearly ?? raw.annualRate, d.growth_percent_yearly),
    } as InvestableGrowthRuleConfig
  }

  if (ruleType === 'income') {
    const d = defaults as IncomeRuleConfig
    return {
      ...d,
      ...raw,
      base_monthly: numberFrom(raw.base_monthly ?? raw.amount, d.base_monthly),
      yearly_bump_percent: numberFrom(raw.yearly_bump_percent ?? raw.yearlyBumpPct, d.yearly_bump_percent),
      yearly_bump_month: numberFrom(raw.yearly_bump_month, d.yearly_bump_month),
      active_months: booleanMonths(raw.active_months, d.active_months),
      extra_payments: plainObject(raw.extra_payments),
      extra_entries: Array.isArray(raw.extra_entries) ? raw.extra_entries : d.extra_entries,
    } as IncomeRuleConfig
  }

  if (ruleType === 'expense') {
    const d = defaults as ExpenseRuleConfig
    return {
      ...d,
      ...raw,
      base_monthly: numberFrom(raw.base_monthly ?? raw.amount, d.base_monthly),
      active_months: booleanMonths(raw.active_months, d.active_months),
      extra_entries: Array.isArray(raw.extra_entries) ? raw.extra_entries : d.extra_entries,
    } as ExpenseRuleConfig
  }

  const d = defaults as InflationRuleConfig
  return {
    ...d,
    ...raw,
    inflation_percent_yearly: numberFrom(raw.inflation_percent_yearly ?? raw.annualRate, d.inflation_percent_yearly),
    applies_to: Array.isArray(raw.applies_to) ? raw.applies_to : d.applies_to,
  } as InflationRuleConfig
}

export function normalizeRuleDefinition(rule: RuleDefinition): RuleDefinition {
  return {
    ...rule,
    config: normalizeRuleConfig(rule.rule_type, rule.config),
  }
}

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
