/**
 * RuleEngine: Pure functions that apply rule logic to projections and cash forecasts.
 *
 * Logic is deduced from rule configurations, not hardcoded.
 * Each function takes a config object and derives the calculation from its properties.
 */

import {
  IncomeRuleConfig,
  ExpenseRuleConfig,
  CashGrowthRuleConfig,
  InvestableGrowthRuleConfig,
  InflationRuleConfig,
} from '@/types/rules'

/**
 * Apply income rule for a given month.
 * Returns both base income and any extra payments for that month.
 */
export function applyIncomeRule(
  config: IncomeRuleConfig,
  monthIndex: number,  // 0-11 (0=Jan, 11=Dec)
  yearsSinceStart: number = 0  // Number of complete years since projection start
): {
  baseIncome: number
  extraPayment: number
  totalIncome: number
} {
  // Check if this month is active
  if (!config.active_months[monthIndex]) {
    return { baseIncome: 0, extraPayment: 0, totalIncome: 0 }
  }

  // Calculate base income with yearly bumps applied
  let baseIncome = config.base_monthly
  if (yearsSinceStart > 0 && monthIndex >= config.yearly_bump_month) {
    // Yearly bump has been applied this many times
    const bumpsApplied = yearsSinceStart
    baseIncome = baseIncome * Math.pow(1 + config.yearly_bump_percent / 100, bumpsApplied)
  } else if (yearsSinceStart > 0) {
    // Haven't reached the bump month yet this year, so only (bumpsApplied - 1) bumps
    const bumpsApplied = Math.max(0, yearsSinceStart - 1)
    baseIncome = baseIncome * Math.pow(1 + config.yearly_bump_percent / 100, bumpsApplied)
  }

  // Get extra payment for this month (13esima, 14esima, etc.)
  const monthName = getMonthName(monthIndex)
  const extraPayment = config.extra_payments?.[monthName] ?? 0

  return {
    baseIncome: Math.round(baseIncome),
    extraPayment: Math.round(extraPayment),
    totalIncome: Math.round(baseIncome + extraPayment),
  }
}

/**
 * Apply expense rule for a given month.
 */
export function applyExpenseRule(
  config: ExpenseRuleConfig,
  monthIndex: number
): number {
  if (!config.active_months[monthIndex]) {
    return 0
  }
  return config.base_monthly
}

/**
 * Apply growth rule (cash or investable assets) for a given month.
 * Derives monthly rate from yearly percentage.
 *
 * Logic: Monthly rate = (1 + yearly% / 100) ^ (1/12) - 1
 */
export function applyGrowthRule(
  config: CashGrowthRuleConfig | InvestableGrowthRuleConfig,
  balance: number,
  monthIndex: number  // Provided for future use (e.g., seasonal adjustments)
): number {
  const yearlyRate = config.growth_percent_yearly
  const monthlyRate = Math.pow(1 + yearlyRate / 100, 1 / 12) - 1
  const growth = balance * monthlyRate

  return growth
}

/**
 * Get monthly growth percentage (for display purposes).
 * Deduced from yearly rate using the same formula as applyGrowthRule.
 */
export function getMonthlyGrowthRate(yearlyPercent: number): number {
  return (Math.pow(1 + yearlyPercent / 100, 1 / 12) - 1) * 100
}

/**
 * Get inflation adjustment for a category.
 * Currently unused but prepared for future implementation.
 */
export function applyInflationRule(
  config: InflationRuleConfig,
  baseAmount: number,
  monthIndex: number,
  yearsSinceStart: number
): number {
  if (!config.applies_to || config.applies_to.length === 0) {
    return baseAmount
  }

  const yearlyInflation = config.inflation_percent_yearly
  const inflationMultiplier = Math.pow(1 + yearlyInflation / 100, yearsSinceStart)

  return baseAmount * inflationMultiplier
}

/**
 * Convert month index (0-11) to month name.
 * Used for extra_payments dictionary keys.
 */
function getMonthName(monthIndex: number): string {
  const monthNames = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ]
  return monthNames[monthIndex % 12]
}

/**
 * Get month name by capitalized full name or short code.
 * Useful for UI and storage.
 */
export function getMonthInfo(monthIndex: number): {
  name: string
  shortName: string
  index: number
} {
  const fullNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  const shortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return {
    name: fullNames[monthIndex],
    shortName: shortNames[monthIndex],
    index: monthIndex,
  }
}
