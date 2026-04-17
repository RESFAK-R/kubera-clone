/**
 * Rule type definitions for the generalized data-driven rules system.
 * Each rule stores its logic in a config object that can be deduced at calculation time.
 */

export type RuleType = 'cash' | 'investable' | 'income' | 'expense' | 'inflation'

/**
 * Base configuration structure shared by all rules.
 * Specific rules extend this with their own properties.
 */
export type RuleConfig = Record<string, unknown>

/**
 * Income rule configuration
 * Supports:
 * - Base monthly income with yearly bump
 * - Active months (can disable certain months)
 * - Extra payments in specific months (13esima, 14esima, etc.)
 */
export interface IncomeRuleConfig extends RuleConfig {
  base_monthly: number           // Base monthly income
  yearly_bump_percent: number    // Percentage increase every year
  yearly_bump_month: number      // Month index (0=Jan, 11=Dec) when bump applies
  active_months: boolean[]       // Length 12, true = income paid this month
  extra_payments?: Record<string, number> // e.g., { 'december': 10000, 'january': 10000 }
}

/**
 * Expense rule configuration
 * Supports:
 * - Base monthly expense
 * - Active months toggle
 */
export interface ExpenseRuleConfig extends RuleConfig {
  base_monthly: number
  active_months: boolean[]       // Length 12, true = expense deducted this month
}

/**
 * Cash growth rule configuration
 * Supports:
 * - Annual growth percentage (compounded monthly)
 */
export interface CashGrowthRuleConfig extends RuleConfig {
  growth_percent_yearly: number  // Applied as monthly: (1 + r/100)^(1/12) - 1
}

/**
 * Investable assets growth rule configuration
 * Supports:
 * - Annual growth percentage (compounded monthly)
 */
export interface InvestableGrowthRuleConfig extends RuleConfig {
  growth_percent_yearly: number  // Applied as monthly: (1 + r/100)^(1/12) - 1
}

/**
 * Inflation rule configuration
 * Supports:
 * - Annual inflation rate
 * - Targets (which categories to apply inflation to)
 */
export interface InflationRuleConfig extends RuleConfig {
  inflation_percent_yearly: number
  applies_to?: ('expenses' | 'cash_growth')[]  // Future: where inflation applies
}

/**
 * Union type for all possible rule configs
 */
export type AnyRuleConfig =
  | IncomeRuleConfig
  | ExpenseRuleConfig
  | CashGrowthRuleConfig
  | InvestableGrowthRuleConfig
  | InflationRuleConfig

/**
 * Rule definition as stored in the database
 */
export interface RuleDefinition {
  id: string
  user_id: string
  rule_type: RuleType
  enabled: boolean
  config: AnyRuleConfig
  created_at: string
  updated_at: string
}

/**
 * Default configurations for each rule type
 */
export const DEFAULT_RULE_CONFIGS: Record<RuleType, AnyRuleConfig> = {
  cash: {
    growth_percent_yearly: 2,
  } as CashGrowthRuleConfig,

  investable: {
    growth_percent_yearly: 7,
  } as InvestableGrowthRuleConfig,

  income: {
    base_monthly: 10000,
    yearly_bump_percent: 10,
    yearly_bump_month: 0, // January
    active_months: [true, true, true, true, true, true, true, true, true, true, true, true],
    extra_payments: {},
  } as IncomeRuleConfig,

  expense: {
    base_monthly: 6000,
    active_months: [true, true, true, true, true, true, true, true, true, true, true, true],
  } as ExpenseRuleConfig,

  inflation: {
    inflation_percent_yearly: 3,
    applies_to: [],
  } as InflationRuleConfig,
}

/**
 * Default enabled state for each rule type
 */
export const DEFAULT_ENABLED_STATE: Record<RuleType, boolean> = {
  cash: true,
  investable: true,
  income: true,
  expense: true,
  inflation: false,  // Inflation is advanced, disabled by default
}
