import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FastForwardContent } from '@/components/dashboard/FastForwardContent'
import { computeNetWorthTotals } from '@/lib/netWorth'
import type { Asset } from '@/types/db'
import {
  DEFAULT_RULE_CONFIGS,
  DEFAULT_ENABLED_STATE,
  type RuleDefinition,
} from '@/types/rules'
import { normalizeRuleDefinition } from '@/lib/ruleDefaults'

export default async function FastForwardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: profile }, { data: assetsRaw }, { data: rulesRaw }] = await Promise.all([
    supabase.from('profiles').select('base_currency').eq('id', user.id).single(),
    supabase.from('assets').select('*').eq('user_id', user.id),
    supabase.from('scenario_rules').select('*').eq('user_id', user.id),
  ])

  const assets = (assetsRaw ?? []) as Asset[]
  const { totalAssets, totalDebts, cash: totalCash, investable: investableAssets } =
    computeNetWorthTotals(assets)
  const totalNetWorth = totalAssets - totalDebts
  const baseCurrency = profile?.base_currency ?? 'EUR'

  // If no DB rules found (new user, trigger not yet run) seed them now
  let rules: RuleDefinition[]
  if (!rulesRaw || rulesRaw.length === 0) {
    const ruleTypes = ['cash', 'investable', 'income', 'expense', 'inflation'] as const
    const now = new Date().toISOString()
    const toInsert = ruleTypes.map((rt) => ({
      user_id: user.id,
      rule_type: rt,
      enabled: DEFAULT_ENABLED_STATE[rt],
      config: DEFAULT_RULE_CONFIGS[rt],
      created_at: now,
      updated_at: now,
    }))
    const { data: inserted } = await supabase
      .from('scenario_rules')
      .insert(toInsert)
      .select()
    rules = ((inserted ?? toInsert.map((r, i) => ({ id: `seed-${i}`, ...r }))) as RuleDefinition[])
      .map(normalizeRuleDefinition)
  } else {
    rules = (rulesRaw as RuleDefinition[]).map(normalizeRuleDefinition)
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden bg-[#f4f5f5] px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1120px] min-w-0 pt-8">
        <FastForwardContent
          initialNetWorth={totalNetWorth}
          totalAssets={totalAssets}
          totalDebts={totalDebts}
          investableAssets={investableAssets}
          totalCash={totalCash}
          baseCurrency={baseCurrency}
          serverRules={rules}
        />
      </div>
    </div>
  )
}
