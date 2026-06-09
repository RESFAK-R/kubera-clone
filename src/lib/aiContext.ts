import type { Asset, RecurringRule, NetWorthSnapshot } from '@/types/db'
import type { RuleDefinition } from '@/types/rules'
import { computeNetWorthTotals } from './netWorth'

export interface FinancialContext {
  asOf: string
  baseCurrency: string
  netWorth: number
  totalAssets: number
  totalDebts: number
  cash: number
  investable: number
  realEstate: number
  assetCount: number
  topAssets: Array<{ name: string; value: number; type: string; sheet: string | null }>
  debts: Array<{ name: string; value: number; sheet: string | null }>
  scenarioRules: RuleDefinition[]
  recurring: RecurringRule[]
  snapshotTrend: Array<{ date: string; netWorth: number }>
}

export function buildFinancialContext(input: {
  baseCurrency: string
  assets: Asset[]
  rules: RuleDefinition[]
  recurring: RecurringRule[]
  snapshots: NetWorthSnapshot[]
}): FinancialContext {
  const totals = computeNetWorthTotals(input.assets)

  const sorted = [...input.assets].sort((a, b) => Number(b.value) - Number(a.value))
  const topAssets = sorted
    .filter((a) => !a.is_liability && a.asset_type !== 'liability')
    .slice(0, 10)
    .map((a) => ({ name: a.name, value: Number(a.value), type: a.asset_type, sheet: a.sheet }))

  const debts = sorted
    .filter((a) => a.is_liability || a.asset_type === 'liability')
    .map((a) => ({ name: a.name, value: Number(a.value), sheet: a.sheet }))

  const snapshotTrend = input.snapshots
    .slice(-30)
    .map((s) => ({ date: s.snapshot_date, netWorth: Number(s.net_worth) }))

  return {
    asOf: new Date().toISOString(),
    baseCurrency: input.baseCurrency,
    netWorth: totals.netWorth,
    totalAssets: totals.totalAssets,
    totalDebts: totals.totalDebts,
    cash: totals.cash,
    investable: totals.investable,
    realEstate: totals.realEstate,
    assetCount: input.assets.length,
    topAssets,
    debts,
    scenarioRules: input.rules,
    recurring: input.recurring,
    snapshotTrend,
  }
}

export function renderSystemPrompt(ctx: FinancialContext): string {
  const rulesJson = JSON.stringify(ctx.scenarioRules.map((r) => ({ type: r.rule_type, enabled: r.enabled, config: r.config })))
  const recurringJson = JSON.stringify(ctx.recurring.map((r) => ({ name: r.name, kind: r.kind, amount: r.amount, cadence: r.cadence })))
  const assetsJson = JSON.stringify(ctx.topAssets)
  const debtsJson = JSON.stringify(ctx.debts)
  const trendJson = JSON.stringify(ctx.snapshotTrend)

  return [
    'You are the personal finance assistant embedded in a net-worth tracking app inspired by Kubera.',
    'Answer questions using ONLY the user data below. Be concise, factual, and numeric where possible.',
    `Base currency: ${ctx.baseCurrency}. As of: ${ctx.asOf}.`,
    `Totals — net worth: ${ctx.netWorth}, assets: ${ctx.totalAssets}, debts: ${ctx.totalDebts}, cash: ${ctx.cash}, investable: ${ctx.investable}, real estate: ${ctx.realEstate}. Asset rows: ${ctx.assetCount}.`,
    `Top assets JSON: ${assetsJson}`,
    `Debts JSON: ${debtsJson}`,
    `Scenario rules JSON (Fast Forward projections): ${rulesJson}`,
    `Recurring transactions JSON: ${recurringJson}`,
    `Net-worth snapshot trend (last 30d): ${trendJson}`,
    'If the user asks something the data cannot answer, say so plainly. Never invent figures.',
    'Use the base currency symbol in answers. Round to whole units unless more precision is requested.',
    'Never give regulated financial advice. Frame projections as estimates.',
  ].join('\n\n')
}
