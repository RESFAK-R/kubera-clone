/**
 * Rule configuration validation
 * Ensures user-provided rule configs are valid before saving to database
 */

import {
  RuleType,
  AnyRuleConfig,
  IncomeRuleConfig,
  ExpenseRuleConfig,
  CashGrowthRuleConfig,
  InflationRuleConfig,
} from '@/types/rules'

/**
 * Validate a rule config based on its type
 * Returns array of error messages (empty array = valid)
 */
export function validateRuleConfig(ruleType: RuleType, config: AnyRuleConfig): string[] {
  const errors: string[] = []

  if (!config || typeof config !== 'object') {
    errors.push('Config must be an object')
    return errors
  }

  switch (ruleType) {
    case 'income':
      return validateIncomeConfig(config as IncomeRuleConfig)
    case 'expense':
      return validateExpenseConfig(config as ExpenseRuleConfig)
    case 'cash':
      return validateCashGrowthConfig(config as CashGrowthRuleConfig)
    case 'investable':
      return validateInvestableGrowthConfig(config as CashGrowthRuleConfig)
    case 'inflation':
      return validateInflationConfig(config as InflationRuleConfig)
    default:
      errors.push(`Unknown rule type: ${ruleType}`)
      return errors
  }
}

/**
 * Validate income rule config
 */
function validateIncomeConfig(config: IncomeRuleConfig): string[] {
  const errors: string[] = []

  // base_monthly validation
  if (typeof config.base_monthly !== 'number') {
    errors.push('base_monthly must be a number')
  } else if (config.base_monthly < 0) {
    errors.push('base_monthly cannot be negative')
  } else if (config.base_monthly > 1_000_000) {
    errors.push('base_monthly seems unreasonably high (> €1M/month)')
  }

  // yearly_bump_percent validation
  if (typeof config.yearly_bump_percent !== 'number') {
    errors.push('yearly_bump_percent must be a number')
  } else if (config.yearly_bump_percent < -100 || config.yearly_bump_percent > 1000) {
    errors.push('yearly_bump_percent must be between -100% and 1000%')
  }

  // yearly_bump_month validation
  if (typeof config.yearly_bump_month !== 'number') {
    errors.push('yearly_bump_month must be a number')
  } else if (config.yearly_bump_month < 0 || config.yearly_bump_month > 11) {
    errors.push('yearly_bump_month must be between 0 (Jan) and 11 (Dec)')
  }

  // active_months validation
  if (!Array.isArray(config.active_months)) {
    errors.push('active_months must be an array')
  } else if (config.active_months.length !== 12) {
    errors.push('active_months must have exactly 12 entries (one per month)')
  } else if (!config.active_months.every((m) => typeof m === 'boolean')) {
    errors.push('active_months must contain only boolean values')
  }

  // extra_payments validation (optional)
  if (config.extra_payments !== undefined) {
    if (typeof config.extra_payments !== 'object' || config.extra_payments === null) {
      errors.push('extra_payments must be an object')
    } else {
      for (const [key, value] of Object.entries(config.extra_payments)) {
        if (typeof value !== 'number' || value < 0) {
          errors.push(`extra_payments.${key} must be a non-negative number`)
        }
      }
    }
  }

  return errors
}

/**
 * Validate expense rule config
 */
function validateExpenseConfig(config: ExpenseRuleConfig): string[] {
  const errors: string[] = []

  // base_monthly validation
  if (typeof config.base_monthly !== 'number') {
    errors.push('base_monthly must be a number')
  } else if (config.base_monthly < 0) {
    errors.push('base_monthly cannot be negative')
  } else if (config.base_monthly > 500_000) {
    errors.push('base_monthly seems unreasonably high (> €500k/month)')
  }

  // active_months validation
  if (!Array.isArray(config.active_months)) {
    errors.push('active_months must be an array')
  } else if (config.active_months.length !== 12) {
    errors.push('active_months must have exactly 12 entries (one per month)')
  } else if (!config.active_months.every((m) => typeof m === 'boolean')) {
    errors.push('active_months must contain only boolean values')
  }

  return errors
}

/**
 * Validate cash growth rule config
 */
function validateCashGrowthConfig(config: CashGrowthRuleConfig): string[] {
  const errors: string[] = []

  if (typeof config.growth_percent_yearly !== 'number') {
    errors.push('growth_percent_yearly must be a number')
  } else if (config.growth_percent_yearly < -100 || config.growth_percent_yearly > 100) {
    errors.push('growth_percent_yearly must be between -100% and 100%')
  }

  return errors
}

/**
 * Validate investable growth rule config
 */
function validateInvestableGrowthConfig(config: CashGrowthRuleConfig): string[] {
  const errors: string[] = []

  if (typeof config.growth_percent_yearly !== 'number') {
    errors.push('growth_percent_yearly must be a number')
  } else if (config.growth_percent_yearly < -100 || config.growth_percent_yearly > 100) {
    errors.push('growth_percent_yearly must be between -100% and 100%')
  }

  return errors
}

/**
 * Validate inflation rule config
 */
function validateInflationConfig(config: InflationRuleConfig): string[] {
  const errors: string[] = []

  if (typeof config.inflation_percent_yearly !== 'number') {
    errors.push('inflation_percent_yearly must be a number')
  } else if (config.inflation_percent_yearly < -100 || config.inflation_percent_yearly > 50) {
    errors.push('inflation_percent_yearly must be between -100% and 50%')
  }

  // applies_to validation (optional)
  if (config.applies_to !== undefined) {
    if (!Array.isArray(config.applies_to)) {
      errors.push('applies_to must be an array')
    } else {
      const validTargets = ['expenses', 'cash_growth', 'investable_growth']
      for (const target of config.applies_to) {
        if (!validTargets.includes(target)) {
          errors.push(`applies_to contains invalid target: ${target}`)
        }
      }
    }
  }

  return errors
}
