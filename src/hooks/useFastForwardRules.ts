'use client'

import { useState, useCallback } from 'react'
import {
  RuleType,
  RuleDefinition,
  AnyRuleConfig,
} from '@/types/rules'
import { getRulesForUser, saveRuleConfig } from '@/app/dashboard/fast-forward/rules-actions'

/**
 * Hook for managing Fast Forward rules.
 * Accepts server-side initial rules (loaded by RSC) to avoid client-side fetch on mount.
 * Falls back to fetching from Supabase only when no server rules are provided.
 */
export function useFastForwardRules(initialRules?: RuleDefinition[]) {
  const [rules, setRules] = useState<RuleDefinition[]>(initialRules ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const refreshRules = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const fetched = await getRulesForUser()
      setRules(fetched)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateRule = useCallback(
    async (ruleType: RuleType, enabled: boolean, config: AnyRuleConfig) => {
      // Snapshot current state for rollback
      let snapshot: RuleDefinition[] = []
      setRules((prev) => {
        snapshot = prev
        return prev.map((r) =>
          r.rule_type === ruleType
            ? { ...r, enabled, config, updated_at: new Date().toISOString() }
            : r,
        )
      })

      setSaveError(null)
      try {
        await saveRuleConfig(ruleType, enabled, config)
      } catch (err) {
        // Roll back optimistic update
        setRules(snapshot)
        const msg = (err as Error).message
        setSaveError(msg)
        setError(msg)
      }
    },
    [],
  )

  const getRule = useCallback(
    (ruleType: RuleType): RuleDefinition | undefined => {
      return rules.find((r) => r.rule_type === ruleType)
    },
    [rules],
  )

  const toggleRule = useCallback(
    async (ruleType: RuleType) => {
      const rule = rules.find((r) => r.rule_type === ruleType)
      if (!rule) return
      await updateRule(ruleType, !rule.enabled, rule.config)
    },
    [rules, updateRule],
  )

  return {
    rules,
    loading,
    error,
    saveError,
    updateRule,
    refreshRules,
    getRule,
    toggleRule,
  }

}
