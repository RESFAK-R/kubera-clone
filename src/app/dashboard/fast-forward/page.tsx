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
    rules = (inserted ?? toInsert.map((r, i) => ({ id: `seed-${i}`, ...r }))) as RuleDefinition[]
  } else {
    rules = rulesRaw as RuleDefinition[]
  }

  return (
    <div className="flex-1 w-full bg-[#f4f5f5] pb-24 px-8 md:px-16 overflow-y-auto">
      <div className="max-w-[1100px] mx-auto pt-10">
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
