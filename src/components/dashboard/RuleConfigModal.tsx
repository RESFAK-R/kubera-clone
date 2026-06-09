'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import {
  RuleType,
  RuleDefinition,
  IncomeRuleConfig,
  ExpenseRuleConfig,
  CashGrowthRuleConfig,
  InflationRuleConfig,
  AnyRuleConfig,
  ExtraEntry,
  DEFAULT_RULE_CONFIGS,
} from '@/types/rules'
import { getMonthInfo } from '@/lib/ruleEngine'

type Props = {
  isOpen: boolean
  rule: RuleDefinition | null
  onClose: () => void
  onSave: (ruleType: RuleType, enabled: boolean, config: AnyRuleConfig) => Promise<void>
}

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => getMonthInfo(i).shortName)

export function RuleConfigModal({ isOpen, rule, onClose, onSave }: Props) {
  const defaultConfig = rule ? DEFAULT_RULE_CONFIGS[rule.rule_type] : DEFAULT_RULE_CONFIGS.income
  const [enabled, setEnabled] = useState(rule?.enabled ?? true)
  const [config, setConfig] = useState<AnyRuleConfig>(rule?.config ?? defaultConfig)
  const [loading, setLoading] = useState(false)

  // Reset state when rule changes
  useEffect(() => {
    if (rule) {
      setEnabled(rule.enabled)
      setConfig(rule.config ?? DEFAULT_RULE_CONFIGS[rule.rule_type])
    }
  }, [rule?.id, rule?.rule_type])

  if (!isOpen || !rule) return null

  const handleSave = async () => {
    setLoading(true)
    try {
      await onSave(rule.rule_type, enabled, config)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[6px] shadow-xl w-full max-w-[500px] p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[20px] font-bold text-[#1a1a1a] capitalize">
              {rule.rule_type === 'investable' ? 'Investable Assets' : rule.rule_type} Rule
            </h2>
            <p className="text-[12px] text-gray-500 mt-1">Configure this rule&apos;s behavior</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enabled toggle */}
        <div className="mb-6 flex items-center justify-between">
          <label className="text-[14px] font-medium text-gray-700">Enable this rule</label>
          <Toggle on={enabled} onClick={() => setEnabled(!enabled)} />
        </div>

        {/* Rule-specific form */}
        <div className="mb-6 space-y-4">
          {rule.rule_type === 'income' && (
            <IncomeRuleForm
              config={config as IncomeRuleConfig}
              onChange={(c) => setConfig(c)}
            />
          )}
          {rule.rule_type === 'expense' && (
            <ExpenseRuleForm
              config={config as ExpenseRuleConfig}
              onChange={(c) => setConfig(c)}
            />
          )}
          {rule.rule_type === 'cash' && (
            <GrowthRuleForm
              label="Cash"
              config={config as CashGrowthRuleConfig}
              onChange={(c) => setConfig(c)}
            />
          )}
          {rule.rule_type === 'investable' && (
            <GrowthRuleForm
              label="Investable Assets"
              config={config as CashGrowthRuleConfig}
              onChange={(c) => setConfig(c)}
            />
          )}
          {rule.rule_type === 'inflation' && (
            <InflationRuleForm
              config={config as InflationRuleConfig}
              onChange={(c) => setConfig(c)}
            />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-bold text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-bold bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Form for income rule configuration
 */
function IncomeRuleForm({
  config,
  onChange,
}: {
  config: IncomeRuleConfig
  onChange: (c: IncomeRuleConfig) => void
}) {
  return (
    <>
      <div>
        <label className="text-[12px] font-bold text-gray-600 uppercase">Base Monthly Income</label>
        <input
          type="number"
          value={config.base_monthly}
          onChange={(e) => onChange({ ...config, base_monthly: Number(e.target.value) })}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[14px] focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[12px] font-bold text-gray-600 uppercase">Yearly Bump %</label>
          <input
            type="number"
            value={config.yearly_bump_percent}
            onChange={(e) => onChange({ ...config, yearly_bump_percent: Number(e.target.value) })}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[14px] focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-[12px] font-bold text-gray-600 uppercase">Bump Month</label>
          <select
            value={config.yearly_bump_month}
            onChange={(e) => onChange({ ...config, yearly_bump_month: Number(e.target.value) })}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[14px] focus:outline-none focus:border-blue-500"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[12px] font-bold text-gray-600 uppercase mb-2 block">Active Months</label>
        <div className="grid grid-cols-6 gap-2">
          {config.active_months.map((active, i) => (
            <button
              key={i}
              onClick={() => {
                const updated = [...config.active_months]
                updated[i] = !updated[i]
                onChange({ ...config, active_months: updated })
              }}
              className={`py-2 px-2 text-[11px] font-bold rounded transition-colors ${
                active
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {MONTH_NAMES[i]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[12px] font-bold text-gray-600 uppercase">Extra Payments</label>
        <p className="text-[11px] text-gray-500 mt-1 mb-2">
          e.g., 13esima in December, 14esima in January
        </p>
        <div className="space-y-2">
          {MONTH_NAMES.map((monthName, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[12px] text-gray-600 w-16">{monthName}</span>
              <input
                type="number"
                value={config.extra_payments?.[monthName.toLowerCase()] ?? 0}
                onChange={(e) => {
                  const monthKey = monthName.toLowerCase()
                  const val = Number(e.target.value)
                  const extras = { ...(config.extra_payments ?? {}) }
                  if (val > 0) {
                    extras[monthKey] = val
                  } else {
                    delete extras[monthKey]
                  }
                  onChange({ ...config, extra_payments: extras })
                }}
                placeholder="0"
                className="flex-1 px-3 py-1 border border-gray-300 rounded text-[12px] focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>
      </div>

      <ExtraEntriesEditor
        entries={config.extra_entries ?? []}
        onChange={(entries) => onChange({ ...config, extra_entries: entries })}
      />
    </>
  )
}

/**
 * Form for expense rule configuration
 */
function ExpenseRuleForm({
  config,
  onChange,
}: {
  config: ExpenseRuleConfig
  onChange: (c: ExpenseRuleConfig) => void
}) {
  return (
    <>
      <div>
        <label className="text-[12px] font-bold text-gray-600 uppercase">Base Monthly Expense</label>
        <input
          type="number"
          value={config.base_monthly}
          onChange={(e) => onChange({ ...config, base_monthly: Number(e.target.value) })}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[14px] focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="text-[12px] font-bold text-gray-600 uppercase mb-2 block">Active Months</label>
        <div className="grid grid-cols-6 gap-2">
          {config.active_months.map((active, i) => (
            <button
              key={i}
              onClick={() => {
                const updated = [...config.active_months]
                updated[i] = !updated[i]
                onChange({ ...config, active_months: updated })
              }}
              className={`py-2 px-2 text-[11px] font-bold rounded transition-colors ${
                active
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {MONTH_NAMES[i]}
            </button>
          ))}
        </div>
      </div>

      <ExtraEntriesEditor
        entries={config.extra_entries ?? []}
        onChange={(entries) => onChange({ ...config, extra_entries: entries })}
      />
    </>
  )
}

/**
 * Shared extra entries editor — used by both Income and Expense forms.
 * Each entry is persisted inside the rule's config JSONB.
 */
function ExtraEntriesEditor({
  entries,
  onChange,
}: {
  entries: ExtraEntry[]
  onChange: (e: ExtraEntry[]) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[12px] font-bold text-gray-600 uppercase">Additional Entries</label>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...entries,
              { id: crypto.randomUUID(), description: 'New Entry', amount: 0, enabled: true },
            ])
          }
          className="text-[11px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-[0.1em]"
        >
          + Add
        </button>
      </div>
      {entries.length === 0 && (
        <p className="text-[11px] text-gray-400">No additional entries. Click + Add to create one.</p>
      )}
      <div className="space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange(entries.map((x) => (x.id === e.id ? { ...x, enabled: !x.enabled } : x)))}
              className={`w-4 h-4 rounded-full border flex-shrink-0 ${e.enabled ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}
              aria-label="Toggle"
            />
            <input
              type="text"
              value={e.description}
              onChange={(ev) =>
                onChange(entries.map((x) => (x.id === e.id ? { ...x, description: ev.target.value } : x)))
              }
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-[12px] focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              value={e.amount}
              onChange={(ev) =>
                onChange(entries.map((x) => (x.id === e.id ? { ...x, amount: Number(ev.target.value) } : x)))
              }
              className="w-24 px-2 py-1 border border-gray-300 rounded text-[12px] focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => onChange(entries.filter((x) => x.id !== e.id))}
              className="text-gray-300 hover:text-red-500 transition-colors"
              aria-label="Remove"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Form for growth rules (cash, investable)
 */
function GrowthRuleForm({
  label,
  config,
  onChange,
}: {
  label: string
  config: CashGrowthRuleConfig
  onChange: (c: CashGrowthRuleConfig) => void
}) {
  return (
    <div>
      <label className="text-[12px] font-bold text-gray-600 uppercase">
        {label} Growth % per Year
      </label>
      <input
        type="number"
        step="0.1"
        value={config.growth_percent_yearly}
        onChange={(e) => onChange({ ...config, growth_percent_yearly: Number(e.target.value) })}
        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[14px] focus:outline-none focus:border-blue-500"
      />
      <p className="text-[11px] text-gray-500 mt-1">Applied as monthly compounding</p>
    </div>
  )
}

/**
 * Form for inflation rule configuration
 */
function InflationRuleForm({
  config,
  onChange,
}: {
  config: InflationRuleConfig
  onChange: (c: InflationRuleConfig) => void
}) {
  return (
    <div>
      <label className="text-[12px] font-bold text-gray-600 uppercase">Inflation Rate % per Year</label>
      <input
        type="number"
        step="0.1"
        value={config.inflation_percent_yearly}
        onChange={(e) => onChange({ ...config, inflation_percent_yearly: Number(e.target.value) })}
        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[14px] focus:outline-none focus:border-blue-500"
      />
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors ${
        on ? 'bg-blue-500' : 'bg-gray-200'
      }`}
      aria-pressed={on}
    >
      <span
        className={`inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  )
}
