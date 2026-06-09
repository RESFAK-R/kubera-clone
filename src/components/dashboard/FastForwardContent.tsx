'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts'
import { Plus, MoreHorizontal, Printer, ChevronDown, ChevronRight, X, RotateCw } from 'lucide-react'
import { saveCashForecastPdf } from '@/app/dashboard/fast-forward/save-pdf-action'
import { useFastForwardRules } from '@/hooks/useFastForwardRules'
import { RuleConfigModal } from '@/components/dashboard/RuleConfigModal'
import {
  RuleType,
  RuleDefinition,
  IncomeRuleConfig,
  ExpenseRuleConfig,
  CashGrowthRuleConfig,
  InflationRuleConfig,
  AnyRuleConfig,
  ExtraEntry,
  EntryRecurrence,
} from '@/types/rules'
import {
  applyIncomeRule,
  applyExpenseRule,
  applyGrowthRule,
  getMonthInfo,
} from '@/lib/ruleEngine'

type Props = {
  initialNetWorth: number
  totalAssets: number
  totalDebts: number
  investableAssets: number
  totalCash: number
  baseCurrency: string
  serverRules?: RuleDefinition[]
}

/** Returns true when absolute month offset `m` (0-based) falls on this recurrence */
function matchesRecurrence(m: number, recurrence: EntryRecurrence | undefined): boolean {
  if (!recurrence || recurrence === 'monthly') return true
  if (recurrence === 'quarterly') return m % 3 === 0
  if (recurrence === 'yearly') return m % 12 === 0
  return true
}

function recurrenceLabel(r: EntryRecurrence | undefined): string {
  if (r === 'quarterly') return 'every 3 months'
  if (r === 'yearly') return 'every year'
  return 'every month'
}

type Tab = 'Net Worth Projections' | 'Charts' | 'Cash Forecast'

type Rule = {
  id: string
  enabled: boolean
  isExtra?: boolean
  extraId?: string
  extraType?: 'income' | 'expense'
  extraRecurrence?: EntryRecurrence
  render: () => React.ReactNode
}


type LedgerRow = {
  key: string
  date: Date
  description: string
  inflow: number
  outflow: number
  editable: boolean
  balance?: number
}

type ForecastPeriod = '1M' | 'QUARTER' | '3M' | 'YEAR' | '1Y'

type BreakdownResult = {
  cashOpening: number
  investableOpening: number
  debts: number
  totalIncome: number
  totalExpense: number
  totalCashGrowth: number
  totalInvGrowth: number
  cashEnd: number
  invEnd: number
  assetsEnd: number
  netWorthEnd: number
  netWorthStart: number
  assetsStart: number
}

export function FastForwardContent({
  initialNetWorth,
  totalAssets,
  totalDebts,
  investableAssets,
  totalCash,
  baseCurrency,
  serverRules,
}: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [activeTab, setActiveTab] = useState<Tab>('Net Worth Projections')
  const [detailMonths, setDetailMonths] = useState<number | null>(null)
  const [detailLabel, setDetailLabel] = useState<string>('')

  // Rules seeded server-side; no client-side fetch on mount
  const { rules, loading: rulesLoading, saveError, updateRule, getRule, refreshRules } = useFastForwardRules(serverRules)

  // Rule config modal state
  const [editingRule, setEditingRule] = useState<RuleDefinition | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Cash Forecast state
  const LS_KEY = 'kubera_cash_forecast'
  const loadForecastState = () => {
    if (typeof window === 'undefined') return null
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null')
    } catch {
      return null
    }
  }

  const savedForecast = loadForecastState()
  const [forecastPeriod, setForecastPeriod] = useState<ForecastPeriod>(savedForecast?.period ?? '1M')
  const [periodOpen, setPeriodOpen] = useState(false)
  const [rowOverrides, setRowOverrides] = useState<Record<string, { inflow?: number; outflow?: number; description?: string }>>({})

  // Rules from DB
  const incomeRule = getRule('income')
  const expenseRule = getRule('expense')
  const cashRule = getRule('cash')
  const investableRule = getRule('investable')
  const inflationRule = getRule('inflation')

  // Extra entries are stored inside income/expense rule config (persisted to Supabase via updateRule)
  const incomeConfig = incomeRule?.config as IncomeRuleConfig | undefined
  const expenseConfig = expenseRule?.config as ExpenseRuleConfig | undefined
  const extraIncomeEntries: ExtraEntry[] = incomeConfig?.extra_entries ?? []
  const extraExpenseEntries: ExtraEntry[] = expenseConfig?.extra_entries ?? []

  const addExtraEntry = async (
    type: 'income' | 'expense',
    description?: string,
    amount?: number,
  ) => {
    const newEntry: ExtraEntry = {
      id: crypto.randomUUID(),
      description: description ?? (type === 'income' ? 'New Income' : 'New Expense'),
      amount: amount ?? 0,
      enabled: true,
    }
    if (type === 'income' && incomeRule) {
      const cfg = incomeRule.config as IncomeRuleConfig
      await updateRule('income', incomeRule.enabled, {
        ...cfg,
        extra_entries: [...(cfg.extra_entries ?? []), newEntry],
      })
    } else if (type === 'expense' && expenseRule) {
      const cfg = expenseRule.config as ExpenseRuleConfig
      await updateRule('expense', expenseRule.enabled, {
        ...cfg,
        extra_entries: [...(cfg.extra_entries ?? []), newEntry],
      })
    }
  }

  const updateExtraEntry = async (
    type: 'income' | 'expense',
    id: string,
    patch: Partial<ExtraEntry>,
  ) => {
    if (type === 'income' && incomeRule) {
      const cfg = incomeRule.config as IncomeRuleConfig
      await updateRule('income', incomeRule.enabled, {
        ...cfg,
        extra_entries: (cfg.extra_entries ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
      })
    } else if (type === 'expense' && expenseRule) {
      const cfg = expenseRule.config as ExpenseRuleConfig
      await updateRule('expense', expenseRule.enabled, {
        ...cfg,
        extra_entries: (cfg.extra_entries ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
      })
    }
  }

  const removeExtraEntry = async (type: 'income' | 'expense', id: string) => {
    if (type === 'income' && incomeRule) {
      const cfg = incomeRule.config as IncomeRuleConfig
      await updateRule('income', incomeRule.enabled, {
        ...cfg,
        extra_entries: (cfg.extra_entries ?? []).filter((e) => e.id !== id),
      })
    } else if (type === 'expense' && expenseRule) {
      const cfg = expenseRule.config as ExpenseRuleConfig
      await updateRule('expense', expenseRule.enabled, {
        ...cfg,
        extra_entries: (cfg.extra_entries ?? []).filter((e) => e.id !== id),
      })
    }
  }

  const monthsForPeriod = (p: ForecastPeriod) => {
    const now = new Date()
    switch (p) {
      case '1M':
        return 1
      case 'QUARTER':
        return 3
      case '3M':
        return 3
      case 'YEAR':
        return Math.max(1, 12 - now.getMonth())
      case '1Y':
        return 12
    }
  }

  const start = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }, [])

  // Generate cash forecast ledger rows using rule engine
  const { rows, totalInflow, totalOutflow, openingBalance, closingBalance } = useMemo(() => {
    // Generate rows even if some rules are missing - only skip if NO rules at all
    const months = monthsForPeriod(forecastPeriod)
    const list: LedgerRow[] = []
    const openingBalance = 0

    let cashPool = Math.max(0, totalAssets - investableAssets - totalDebts)
    const incomeConfig = incomeRule?.config as IncomeRuleConfig | undefined
    const expenseConfig = expenseRule?.config as ExpenseRuleConfig | undefined
    const cashConfig = cashRule?.config as CashGrowthRuleConfig | undefined

    // Opening row
    const opening: LedgerRow = {
      key: 'opening',
      date: start,
      description: 'Opening Balance as of today',
      inflow: 0,
      outflow: 0,
      editable: false,
    }
    list.push(opening)

    // Generate rows for each month
    for (let m = 0; m < months; m++) {
      const d = new Date(start.getFullYear(), start.getMonth() + m, 1)
      const monthIndex = d.getMonth()
      const year = d.getFullYear()
      const yearsSinceStart = Math.floor(m / 12)

      // Income rows
      if (incomeRule?.enabled && incomeConfig) {
        const income = applyIncomeRule(incomeConfig, monthIndex, yearsSinceStart)

        if (income.baseIncome > 0) {
          const key = `${year}-${monthIndex}:salary`
          const ovr = rowOverrides[key]
          list.push({
            key,
            date: d,
            description: ovr?.description ?? 'Salary',
            inflow: ovr?.inflow ?? income.baseIncome,
            outflow: 0,
            editable: true,
          })
          cashPool += ovr?.inflow ?? income.baseIncome
        }

        if (income.extraPayment > 0) {
          const monthInfo = getMonthInfo(monthIndex)
          const extraKey = `${year}-${monthIndex}:extra-salary-${monthInfo.shortName}`
          const ovr = rowOverrides[extraKey]
          list.push({
            key: extraKey,
            date: d,
            description: ovr?.description ?? `${monthInfo.name} Extra (13esima/14esima)`,
            inflow: ovr?.inflow ?? income.extraPayment,
            outflow: 0,
            editable: true,
          })
          cashPool += ovr?.inflow ?? income.extraPayment
        }
      }

      // Cash growth rows
      if (cashRule?.enabled && cashConfig) {
        const growth = applyGrowthRule(cashConfig, cashPool, monthIndex)
        if (Math.abs(growth) > 0.5 || m === 0) {
          const key = `${year}-${monthIndex}:cashgrow`
          const ovr = rowOverrides[key]
          const growthAmount = ovr?.inflow ?? Math.round(growth)
          list.push({
            key,
            date: d,
            description: ovr?.description ?? `Cash grows by ${cashConfig.growth_percent_yearly}% per year`,
            inflow: growthAmount > 0 ? growthAmount : 0,
            outflow: growthAmount < 0 ? Math.abs(growthAmount) : 0,
            editable: true,
          })
          cashPool += growthAmount
        }
      }

      // Expense rows
      if (expenseRule?.enabled && expenseConfig) {
        const expense = applyExpenseRule(expenseConfig, monthIndex)
        if (expense > 0) {
          const key = `${year}-${monthIndex}:expenses`
          const ovr = rowOverrides[key]
          list.push({
            key,
            date: d,
            description: ovr?.description ?? 'Expenses',
            inflow: 0,
            outflow: ovr?.outflow ?? expense,
            editable: true,
          })
          cashPool -= expense
        }
      }

      // Extra income entries (from income rule config)
      for (const er of extraIncomeEntries) {
        if (!er.enabled) continue
        if (!matchesRecurrence(m, er.recurrence)) continue
        const key = `${year}-${monthIndex}:extra-inc-${er.id}`
        const ovr = rowOverrides[key]
        list.push({
          key,
          date: d,
          description: ovr?.description ?? er.description,
          inflow: ovr?.inflow ?? er.amount,
          outflow: 0,
          editable: true,
        })
        cashPool += ovr?.inflow ?? er.amount
      }
      // Extra expense entries (from expense rule config)
      for (const er of extraExpenseEntries) {
        if (!er.enabled) continue
        if (!matchesRecurrence(m, er.recurrence)) continue
        const key = `${year}-${monthIndex}:extra-exp-${er.id}`
        const ovr = rowOverrides[key]
        list.push({
          key,
          date: d,
          description: ovr?.description ?? er.description,
          inflow: 0,
          outflow: ovr?.outflow ?? er.amount,
          editable: true,
        })
        cashPool -= ovr?.outflow ?? er.amount
      }
    }

    // Calculate running balance
    let run = openingBalance
    let totalInflow = 0
    let totalOutflow = 0
    for (const r of list) {
      run += r.inflow - r.outflow
      totalInflow += r.inflow
      totalOutflow += r.outflow
      r.balance = run
    }

    const closingBalance = run
    return { rows: list, totalInflow, totalOutflow, openingBalance, closingBalance }
  }, [
    forecastPeriod,
    start,
    totalAssets,
    investableAssets,
    totalDebts,
    incomeRule,
    expenseRule,
    cashRule,
    rowOverrides,
    extraIncomeEntries,
    extraExpenseEntries,
  ])

  // Projection calculations using rule engine
  const projection = useMemo(() => {
    if (!incomeRule || !expenseRule || !cashRule || !investableRule) {
      return []
    }

    const months = 20 * 12
    const out: { month: number; netWorth: number; assets: number; debts: number; income: number; expenses: number }[] = []

    let nw = initialNetWorth
    let assets = totalAssets
    const debts = totalDebts
    let investable = investableAssets
    let cash = totalCash
    const illiquid = totalAssets - investableAssets - totalCash

    const incomeConfig = incomeRule.config as IncomeRuleConfig
    const expenseConfig = expenseRule.config as ExpenseRuleConfig
    const cashConfig = cashRule.config as CashGrowthRuleConfig
    const investableConfig = investableRule.config as CashGrowthRuleConfig

    out.push({ month: 0, netWorth: nw, assets, debts, income: 0, expenses: 0 })

    let cumIncome = 0
    let cumExpense = 0

    for (let m = 1; m <= months; m++) {
      const monthIndex = (m - 1) % 12
      const yearsSinceStart = Math.floor(m / 12)
      // m-1 for recurrence (0-based offset)
      const mOffset = m - 1

      // Apply income
      let monthIncome = 0
      if (incomeRule.enabled) {
        const income = applyIncomeRule(incomeConfig, monthIndex, yearsSinceStart - 1)
        monthIncome = income.totalIncome
      }

      const extraIncome = extraIncomeEntries
        .filter((r) => r.enabled && matchesRecurrence(mOffset, r.recurrence))
        .reduce((s, r) => s + r.amount, 0)

      // Apply expense
      let monthExpense = 0
      if (expenseRule.enabled) {
        monthExpense = applyExpenseRule(expenseConfig, monthIndex)
      }

      const extraExpense = extraExpenseEntries
        .filter((r) => r.enabled && matchesRecurrence(mOffset, r.recurrence))
        .reduce((s, r) => s + r.amount, 0)

      const netFlow = monthIncome + extraIncome - monthExpense - extraExpense
      cash += netFlow
      cumIncome += monthIncome + extraIncome
      cumExpense += monthExpense + extraExpense

      // Apply growth
      if (investableRule.enabled) {
        const invGrowth = applyGrowthRule(investableConfig, investable, monthIndex)
        investable += invGrowth
      }

      if (cashRule.enabled) {
        const cashGrowth = applyGrowthRule(cashConfig, cash, monthIndex)
        cash += cashGrowth
      }

      assets = investable + cash + illiquid
      nw = assets - debts

      out.push({ month: m, netWorth: nw, assets, debts, income: cumIncome, expenses: cumExpense })
    }

    return out
  }, [
    initialNetWorth,
    totalAssets,
    totalDebts,
    investableAssets,
    totalCash,
    incomeRule,
    expenseRule,
    cashRule,
    investableRule,
    extraIncomeEntries,
    extraExpenseEntries,
  ])

  const computeBreakdown = (months: number) => {
    if (!incomeRule || !expenseRule || !cashRule || !investableRule) {
      return {
        cashOpening: 0,
        investableOpening: 0,
        debts: totalDebts,
        totalIncome: 0,
        totalExpense: 0,
        totalCashGrowth: 0,
        totalInvGrowth: 0,
        cashEnd: 0,
        invEnd: 0,
        assetsEnd: 0,
        netWorthEnd: 0,
        netWorthStart: 0,
        assetsStart: totalAssets,
      }
    }

    const debts = totalDebts
    const cashStart = totalCash
    const investableStart = investableAssets
    const illiquid = totalAssets - investableAssets - totalCash
    const cashOpening = cashStart
    const investableOpening = investableStart

    const incomeConfig = incomeRule.config as IncomeRuleConfig
    const expenseConfig = expenseRule.config as ExpenseRuleConfig
    const cashConfig = cashRule.config as CashGrowthRuleConfig
    const investableConfig = investableRule.config as CashGrowthRuleConfig

    let totalIncome = 0
    let totalExpense = 0
    let totalCashGrowth = 0
    let totalInvGrowth = 0
    let cash = cashStart
    let investable = investableStart

    for (let m = 1; m <= months; m++) {
      const monthIndex = (m - 1) % 12
      const yearsSinceStart = Math.floor(m / 12)
      const mOffset = m - 1

      if (incomeRule.enabled) {
        const income = applyIncomeRule(incomeConfig, monthIndex, yearsSinceStart - 1)
        cash += income.totalIncome
        totalIncome += income.totalIncome
      }

      const monthExtraIncome = extraIncomeEntries
        .filter((r) => r.enabled && matchesRecurrence(mOffset, r.recurrence))
        .reduce((s, r) => s + r.amount, 0)
      const monthExtraExpense = extraExpenseEntries
        .filter((r) => r.enabled && matchesRecurrence(mOffset, r.recurrence))
        .reduce((s, r) => s + r.amount, 0)

      if (expenseRule.enabled) {
        const expense = applyExpenseRule(expenseConfig, monthIndex)
        cash -= expense
        totalExpense += expense
      }

      if (cashRule.enabled) {
        const g = applyGrowthRule(cashConfig, cash, monthIndex)
        cash += g
        totalCashGrowth += g
      }

      if (investableRule.enabled) {
        const g = applyGrowthRule(investableConfig, investable, monthIndex)
        investable += g
        totalInvGrowth += g
      }

      cash += monthExtraIncome
      cash -= monthExtraExpense
      totalIncome += monthExtraIncome
      totalExpense += monthExtraExpense
    }

    const cashEnd = cash
    const invEnd = investable
    const assetsEnd = cashEnd + invEnd + illiquid
    const netWorthEnd = assetsEnd - debts
    const netWorthStart = cashOpening + investableOpening + illiquid - debts

    return {
      cashOpening,
      investableOpening,
      debts,
      totalIncome,
      totalExpense,
      totalCashGrowth,
      totalInvGrowth,
      cashEnd,
      invEnd,
      assetsEnd,
      netWorthEnd,
      netWorthStart,
      assetsStart: totalAssets,
    }
  }

  const at = (m: number) => projection[Math.min(m, projection.length - 1)]
  const m1 = at(1)
  const y1 = at(12)
  const y5 = at(60)
  const y10 = at(120)
  const y20 = at(240)

  const currentYear = new Date().getFullYear()

  const sym = baseCurrency === 'EUR' ? '€' : '$'
  const fmt = (val: number) => `${sym} ${Math.round(val).toLocaleString('de-DE')}`
  const fmtCompact = (val: number) => {
    const abs = Math.abs(val)
    if (abs >= 1_000_000) return `${sym} ${(val / 1_000_000).toFixed(2).replace('.', ',')} Million`
    if (abs >= 1_000) return `${sym} ${Math.round(val).toLocaleString('de-DE')}`
    return `${sym} ${val.toFixed(0)}`
  }
  const fmtDelta = (val: number) => {
    const sign = val >= 0 ? '+' : '-'
    const abs = Math.abs(val)
    if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(3).replace('.', ',')}M`
    return `${sign}${sym}${Math.round(abs).toLocaleString('de-DE')}`
  }

  const periodLabel = useMemo(() => {
    const months = monthsForPeriod(forecastPeriod)
    const end = new Date(start.getFullYear(), start.getMonth() + months - 1, 1)
    const fmtM = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    if (months === 1) return fmtM(start)
    return `${fmtM(start)} - ${fmtM(end)}`
  }, [forecastPeriod, start])

  const periodOptions: { key: ForecastPeriod; label: string }[] = useMemo(() => {
    const now = new Date()
    const fmtM = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    const end3 = new Date(now.getFullYear(), now.getMonth() + 2, 1)
    const endQ = new Date(now.getFullYear(), now.getMonth() + 2, 1)
    const endY = new Date(now.getFullYear(), 11, 1)
    const end1Y = new Date(now.getFullYear(), now.getMonth() + 11, 1)
    return [
      { key: '1M', label: `${fmtM(start)} (1 Month)` },
      { key: 'QUARTER', label: `${fmtM(start)} - ${fmtM(endQ)} (This Quarter)` },
      { key: '3M', label: `${fmtM(start)} - ${fmtM(end3)} (3 Months)` },
      { key: 'YEAR', label: `${fmtM(start)} - ${fmtM(endY)} (This Year)` },
      { key: '1Y', label: `${fmtM(start)} - ${fmtM(end1Y)} (1 Year)` },
    ]
  }, [start])

  const netFlow = totalInflow - totalOutflow

  const updateRow = (key: string, patch: { inflow?: number; outflow?: number; description?: string }) => {
    setRowOverrides((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  const handlePrintPdf = async () => {
    const { default: jsPDF } = await import('jspdf')
    const autoTableModule = await import('jspdf-autotable')
    const autoTable = autoTableModule.default

    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()

    // Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text('FARES', 40, 50)

    doc.setFontSize(9)
    doc.text('SCENARIO A  /  CASH FORECAST', pageW - 40, 50, { align: 'right' })

    // Period title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(26)
    doc.text(periodLabel, 40, 90)
    doc.setFontSize(11)
    doc.setTextColor(150)
    const periodName =
      forecastPeriod === '1M'
        ? '1 Month'
        : forecastPeriod === 'QUARTER'
          ? 'This Quarter'
          : forecastPeriod === '3M'
            ? '3 Months'
            : forecastPeriod === 'YEAR'
              ? 'This Year'
              : '1 Year'
    doc.text(periodName, 40 + doc.getTextWidth(periodLabel) + 10, 90)

    // Summary line
    doc.setFontSize(9)
    doc.setTextColor(150)
    const labels = ['OPENING', 'INFLOW', 'OUTFLOW', 'CLOSING']
    const values = [fmt(openingBalance), fmt(totalInflow), fmt(totalOutflow), fmt(closingBalance)]
    const ops = ['+', '−', '=']
    let x = 40
    labels.forEach((lab, i) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(lab, x, 120)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(26)
      doc.text(values[i], x, 140)
      const w = doc.getTextWidth(values[i])
      x += w + 20
      if (i < 3) {
        doc.setFontSize(14)
        doc.setTextColor(180)
        doc.text(ops[i], x, 140)
        x += 20
      }
    })

    // Table
    const body = rows.map((r) => [
      r.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      r.description,
      r.inflow > 0 ? fmt(r.inflow) : '',
      r.outflow > 0 ? fmt(r.outflow) : '',
      fmt(r.balance ?? 0),
    ])
    body.push([
      new Date(start.getFullYear(), start.getMonth() + monthsForPeriod(forecastPeriod) - 1, 1).toLocaleDateString(
        'en-US',
        { month: 'short', year: 'numeric' }
      ),
      'Closing Balance',
      '',
      '',
      fmt(closingBalance),
    ])

    autoTable(doc, {
      startY: 170,
      head: [['DATE', '', 'INFLOW', 'OUTFLOW', 'BALANCE']],
      body,
      foot: [['', '', fmt(totalInflow), fmt(totalOutflow), fmt(openingBalance)]],
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9, textColor: 40, cellPadding: 6 },
      headStyles: { fontStyle: 'bold', fontSize: 8, textColor: 150, lineWidth: { bottom: 0.5 }, lineColor: 220 },
      bodyStyles: { lineWidth: { bottom: 0.3 }, lineColor: 235 },
      footStyles: { fillColor: [107, 107, 107], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 80 },
        3: { halign: 'right', cellWidth: 80 },
        4: { halign: 'right', cellWidth: 90 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.raw && (data.row.raw as string[])[1] === 'Closing Balance') {
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    const base64 = doc.output('datauristring').split(',')[1]
    const filename = `Fast Forward - Cash Forecast ${new Date().toISOString().slice(0, 10)}.pdf`

    try {
      const res = await saveCashForecastPdf(base64, filename)
      console.log('PDF saved:', res.path)
    } catch (e) {
      console.error('Save PDF failed:', e)
    }

    doc.save(filename)
  }

  // Rules array for rendering UI
  const displayRules: Rule[] = [
    {
      id: 'cash',
      enabled: cashRule?.enabled ?? false,
      render: () => {
        const cfg = cashRule?.config as CashGrowthRuleConfig | undefined
        return (
          <>
            Value of{' '}
            <EditLink onClick={() => handleEditRule('cash')}>Cash</EditLink>
            {' '}to change by{' '}
            <InlineNumber
              value={cfg?.growth_percent_yearly ?? 0}
              onSave={(v) => cashRule && updateRule('cash', cashRule.enabled, { ...cfg, growth_percent_yearly: v } as CashGrowthRuleConfig)}
              className="text-blue-500"
              suffix="% per year"
            />
          </>
        )
      },
    },
    {
      id: 'investable',
      enabled: investableRule?.enabled ?? false,
      render: () => {
        const cfg = investableRule?.config as CashGrowthRuleConfig | undefined
        return (
          <>
            Value of{' '}
            <EditLink onClick={() => handleEditRule('investable')}>Investable Assets</EditLink>
            {' '}to change by{' '}
            <InlineNumber
              value={cfg?.growth_percent_yearly ?? 0}
              onSave={(v) => investableRule && updateRule('investable', investableRule.enabled, { ...cfg, growth_percent_yearly: v } as CashGrowthRuleConfig)}
              className="text-blue-500"
              suffix="% per year"
            />
          </>
        )
      },
    },
    {
      id: 'income',
      enabled: incomeRule?.enabled ?? false,
      render: () => {
        const cfg = incomeRule?.config as IncomeRuleConfig | undefined
        return (
          <>
            Income of{' '}
            <EditLink onClick={() => handleEditRule('income')}>{sym === '€' ? 'EUR' : 'USD'}</EditLink>{' '}
            <InlineNumber
              value={cfg?.base_monthly ?? 0}
              onSave={(v) => incomeRule && updateRule('income', incomeRule.enabled, { ...cfg, base_monthly: v } as IncomeRuleConfig)}
              className="text-blue-500"
            />{' '}
            from{' '}
            <EditLink onClick={() => handleEditRule('income')}>Salary</EditLink>
            . Repeats{' '}
            <EditLink onClick={() => handleEditRule('income')}>every month</EditLink>
            . Revised to{' '}
            <InlineNumber
              value={cfg?.yearly_bump_percent ?? 0}
              onSave={(v) => incomeRule && updateRule('income', incomeRule.enabled, { ...cfg, yearly_bump_percent: v } as IncomeRuleConfig)}
              className="text-blue-500"
              prefix="+"
              suffix="%"
            />{' '}
            every year in{' '}
            <EditLink onClick={() => handleEditRule('income')}>
              {getMonthInfo(cfg?.yearly_bump_month ?? 0).shortName}
            </EditLink>
          </>
        )
      },
    },
    {
      id: 'expense',
      enabled: expenseRule?.enabled ?? false,
      render: () => {
        const cfg = expenseRule?.config as ExpenseRuleConfig | undefined
        return (
          <>
            Expense of{' '}
            <EditLink onClick={() => handleEditRule('expense')}>{sym === '€' ? 'EUR' : 'USD'}</EditLink>{' '}
            <InlineNumber
              value={cfg?.base_monthly ?? 0}
              onSave={(v) => expenseRule && updateRule('expense', expenseRule.enabled, { ...cfg, base_monthly: v } as ExpenseRuleConfig)}
              className="text-blue-500"
            />{' '}
            towards{' '}
            <EditLink onClick={() => handleEditRule('expense')}>Expenses</EditLink>
            . Repeats{' '}
            <EditLink onClick={() => handleEditRule('expense')}>every month</EditLink>
          </>
        )
      },
    },
    {
      id: 'inflation',
      enabled: inflationRule?.enabled ?? false,
      render: () => {
        const cfg = inflationRule?.config as InflationRuleConfig | undefined
        return (
          <>
            Inflation rate is{' '}
            <InlineNumber
              value={cfg?.inflation_percent_yearly ?? 0}
              onSave={(v) => inflationRule && updateRule('inflation', inflationRule.enabled, { ...cfg, inflation_percent_yearly: v } as InflationRuleConfig)}
              className="text-blue-500"
              suffix="% per year"
            />
          </>
        )
      },
    },
    ...extraIncomeEntries.map((er) => ({
      id: `extra-inc-${er.id}`,
      enabled: er.enabled,
      isExtra: true,
      extraId: er.id,
      extraType: 'income' as const,
      extraRecurrence: er.recurrence,
      render: () => (
        <>
          Income of <span className="text-gray-400">{sym === '€' ? 'EUR' : 'USD'}</span>{' '}
          <InlineNumber
            value={er.amount}
            onSave={(v) => updateExtraEntry('income', er.id, { amount: v })}
            className="text-blue-500"
          />{' '}
          from{' '}
          <InlineText
            value={er.description}
            onSave={(v) => updateExtraEntry('income', er.id, { description: v })}
            placeholder="Salary"
            className="text-blue-500"
          />
          . Repeats{' '}
          <span className="text-blue-500 underline decoration-dotted underline-offset-2">
            {recurrenceLabel(er.recurrence)}
          </span>
        </>
      ),
    })),
    ...extraExpenseEntries.map((er) => ({
      id: `extra-exp-${er.id}`,
      enabled: er.enabled,
      isExtra: true,
      extraId: er.id,
      extraType: 'expense' as const,
      extraRecurrence: er.recurrence,
      render: () => (
        <>
          Expense of <span className="text-gray-400">{sym === '€' ? 'EUR' : 'USD'}</span>{' '}
          <InlineNumber
            value={er.amount}
            onSave={(v) => updateExtraEntry('expense', er.id, { amount: v })}
            className="text-blue-500"
          />{' '}
          towards{' '}
          <InlineText
            value={er.description}
            onSave={(v) => updateExtraEntry('expense', er.id, { description: v })}
            placeholder="Expenses"
            className="text-blue-500"
          />
          . Repeats{' '}
          <span className="text-blue-500 underline decoration-dotted underline-offset-2">
            {recurrenceLabel(er.recurrence)}
          </span>
        </>
      ),
    })),
  ]

  const toggle = (key: string) => {
    const displayRule = displayRules.find((r) => r.id === key)
    if (displayRule?.isExtra && displayRule.extraId && displayRule.extraType) {
      updateExtraEntry(displayRule.extraType, displayRule.extraId, { enabled: !displayRule.enabled })
    } else {
      const ruleType = key as RuleType
      const rule = getRule(ruleType)
      if (rule) updateRule(ruleType, !rule.enabled, rule.config)
    }
  }

  const handleEditRule = (ruleType: RuleType) => {
    const rule = getRule(ruleType)
    if (rule) {
      setEditingRule(rule)
      setModalOpen(true)
    }
  }

  const handleSaveRuleConfig = async (ruleType: RuleType, enabled: boolean, config: AnyRuleConfig) => {
    await updateRule(ruleType, enabled, config)
  }

  return (
    <div className="w-full">
      {/* Save error banner */}
      {saveError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-[4px]">
          Failed to save rule: {saveError}. Check your connection and try again.
        </div>
      )}

      {/* Loading state */}
      {(!mounted || rulesLoading) && (
        <div className="min-h-[600px] w-full bg-gray-50 animate-pulse rounded-lg" />
      )}

      {mounted && !rulesLoading && (
        <>
          {/* Tabs with Refresh Button */}
          <div className="flex items-center justify-between border-b border-gray-200 mb-8">
        <div className="flex overflow-x-auto no-scrollbar">
          {(['Net Worth Projections', 'Charts', 'Cash Forecast'] as Tab[]).map((tab) => {
            const isActive = tab === activeTab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-1 mr-10 transition-colors relative flex-shrink-0 ${
                  isActive ? 'text-black opacity-100' : 'text-[#1a1a1a] opacity-40 hover:opacity-70'
                }`}
              >
                <span className="font-bold text-[12px] uppercase tracking-[0.12em]">{tab}</span>
                {isActive && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-black" />}
              </button>
            )
          })}
        </div>
        <button
          onClick={refreshRules}
          className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
          title="Refresh rules and recalculate"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {activeTab === 'Net Worth Projections' && (
        <div className="animate-in fade-in duration-300">
          {/* 01 MONTH / 01 YEAR grid */}
          <div className="grid grid-cols-1 gap-4 mb-4 xl:grid-cols-2">
            <ProjectionCard
              label="01 MONTH"
              netWorth={m1.netWorth}
              deltaAbs={m1.netWorth - initialNetWorth}
              deltaPct={((m1.netWorth - initialNetWorth) / Math.max(1, initialNetWorth)) * 100}
              assets={m1.assets}
              debts={m1.debts}
              income={m1.income}
              expenses={m1.expenses}
              fmt={fmt}
              fmtDelta={fmtDelta}
              onClick={() => {
                setDetailMonths(1)
                setDetailLabel('Next Month')
              }}
            />
            <ProjectionCard
              label="01 YEAR"
              netWorth={y1.netWorth}
              deltaAbs={y1.netWorth - initialNetWorth}
              deltaPct={((y1.netWorth - initialNetWorth) / Math.max(1, initialNetWorth)) * 100}
              assets={y1.assets}
              debts={y1.debts}
              income={y1.income}
              expenses={y1.expenses}
              fmt={fmt}
              fmtDelta={fmtDelta}
              onClick={() => {
                setDetailMonths(12)
                setDetailLabel('Next Year')
              }}
            />
          </div>

          {/* 5Y / 10Y / 20Y mini cards */}
          <div className="grid grid-cols-1 gap-4 mb-10 lg:grid-cols-3">
            <MiniProjectionCard
              years={5}
              year={currentYear + 5}
              netWorth={y5.netWorth}
              deltaAbs={y5.netWorth - initialNetWorth}
              deltaPct={((y5.netWorth - initialNetWorth) / Math.max(1, initialNetWorth)) * 100}
              fmtCompact={fmtCompact}
              fmtDelta={fmtDelta}
              onClick={() => {
                setDetailMonths(60)
                setDetailLabel('In 5 Years')
              }}
            />
            <MiniProjectionCard
              years={10}
              year={currentYear + 10}
              netWorth={y10.netWorth}
              deltaAbs={y10.netWorth - initialNetWorth}
              deltaPct={((y10.netWorth - initialNetWorth) / Math.max(1, initialNetWorth)) * 100}
              fmtCompact={fmtCompact}
              fmtDelta={fmtDelta}
              onClick={() => {
                setDetailMonths(120)
                setDetailLabel('In 10 Years')
              }}
            />
            <MiniProjectionCard
              years={20}
              year={currentYear + 20}
              netWorth={y20.netWorth}
              deltaAbs={y20.netWorth - initialNetWorth}
              deltaPct={((y20.netWorth - initialNetWorth) / Math.max(1, initialNetWorth)) * 100}
              fmtCompact={fmtCompact}
              fmtDelta={fmtDelta}
              onClick={() => {
                setDetailMonths(240)
                setDetailLabel('In 20 Years')
              }}
            />
          </div>

          <ScenarioRulesBlock
            rules={displayRules}
            toggle={(k) => toggle(k)}
            onEditRule={(ruleType) => handleEditRule(ruleType as RuleType)}
            onRemoveRule={(id) => {
              const rule = displayRules.find((r) => r.extraId === id)
              if (rule?.extraType) removeExtraEntry(rule.extraType, id)
            }}
            onAddRule={(type, desc, amount) => addExtraEntry(type, desc, amount)}
            onEditExtra={(id, patch) => {
              const rule = displayRules.find((r) => r.extraId === id)
              if (rule?.extraType) updateExtraEntry(rule.extraType, id, patch)
            }}
            summary={fmtCompact(y20.netWorth).replace('Million', 'M')}
          />
        </div>
      )}

      {activeTab === 'Charts' && (
        <div className="animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <div className="text-[13px] font-bold text-gray-400 mb-2">
                {new Date(currentYear + 10, start.getMonth(), 1).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
              <div className="break-words text-[32px] font-bold tracking-tight text-[#1a1a1a] leading-none sm:text-[40px]">
                {fmtCompact(y10.netWorth)}
              </div>
              <div className="text-[13px] font-bold text-green-600 mt-2">
                {fmtDelta(y10.netWorth - initialNetWorth)} (
                {(((y10.netWorth - initialNetWorth) / Math.max(1, initialNetWorth)) * 100)
                  .toFixed(2)
                  .replace('.', ',')}
                %)
              </div>
            </div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em]">
              Net Worth
            </div>
          </div>

          {/* Chart */}
          <div className="h-[300px] mb-10 sm:h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={projection.filter((_, i) => i % 12 === 0)}
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                  tickFormatter={(m) => `${m / 12}Y`}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                  tickFormatter={(val) => `${sym}${(val / 1000).toFixed(0)}k`}
                />
                <ReTooltip
                  formatter={(val) => fmt(Number(val))}
                  labelFormatter={(m) => `Month ${m}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="netWorth" stroke="#a855f7" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <ScenarioRulesBlock
            rules={displayRules}
            toggle={(k) => toggle(k)}
            onEditRule={(ruleType) => handleEditRule(ruleType as RuleType)}
            onRemoveRule={(id) => {
              const rule = displayRules.find((r) => r.extraId === id)
              if (rule?.extraType) removeExtraEntry(rule.extraType, id)
            }}
            onAddRule={(type, desc, amount) => addExtraEntry(type, desc, amount)}
            onEditExtra={(id, patch) => {
              const rule = displayRules.find((r) => r.extraId === id)
              if (rule?.extraType) updateExtraEntry(rule.extraType, id, patch)
            }}
            summary={fmtCompact(y20.netWorth).replace('Million', 'M')}
          />
        </div>
      )}

      {activeTab === 'Cash Forecast' && (
        <div className="animate-in fade-in duration-300">
          {/* Period header with dropdown */}
          <div className="relative mb-6">
            <button onClick={() => setPeriodOpen((v) => !v)} className="flex items-baseline gap-3 group">
              <h2 className="text-[24px] font-bold text-[#1a1a1a]">{periodLabel}</h2>
              <span className="text-[13px] text-gray-500 group-hover:text-gray-700">
                {forecastPeriod === '1M' && '1 Month'}
                {forecastPeriod === 'QUARTER' && 'This Quarter'}
                {forecastPeriod === '3M' && '3 Months'}
                {forecastPeriod === 'YEAR' && 'This Year'}
                {forecastPeriod === '1Y' && '1 Year'} ▾
              </span>
            </button>
            {periodOpen && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-[4px] shadow-lg z-10 min-w-[260px] py-1">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setForecastPeriod(opt.key)
                      setPeriodOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-[13px] hover:bg-gray-50 ${
                      forecastPeriod === opt.key ? 'font-bold text-[#1a1a1a]' : 'text-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary row */}
          <div className="flex flex-wrap items-baseline justify-between gap-4 pb-5 border-b border-gray-200 mb-0">
            <div className="flex flex-wrap items-baseline gap-4 sm:gap-8">
              <Summary label="Opening" value={fmt(openingBalance)} />
              <span className="text-gray-300 text-[18px]">+</span>
              <Summary label="Inflow" value={fmt(totalInflow)} />
              <span className="text-gray-300 text-[18px]">−</span>
              <Summary label="Outflow" value={fmt(totalOutflow)} />
              <span className="text-gray-300 text-[18px]">=</span>
              <Summary label="Closing" value={fmt(closingBalance)} />
            </div>
            <button
              onClick={handlePrintPdf}
              className="text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Export PDF"
              title="Export PDF"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>

          {/* Ledger table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] border-b border-gray-100">
                  <th className="text-left font-bold py-3 w-[100px]"></th>
                  <th className="text-left font-bold py-3"></th>
                  <th className="text-right font-bold py-3 w-[130px]">Inflow</th>
                  <th className="text-right font-bold py-3 w-[130px]">Outflow</th>
                  <th className="text-right font-bold py-3 w-[140px]">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isExtra = r.key.includes(':extra-inc-') || r.key.includes(':extra-exp-')
                  const isOpening = r.key === 'opening'
                  const balance = r.balance ?? 0
                  const extraIsIncome = r.key.includes(':extra-inc-')
                  const extraType = extraIsIncome ? 'income' : 'expense'
                  const extraId = isExtra
                    ? r.key.split(extraIsIncome ? ':extra-inc-' : ':extra-exp-')[1] ?? null
                    : null
                  return (
                    <tr key={r.key} className="border-b border-gray-50 hover:bg-gray-50/50 group">
                      <td className="py-3 text-gray-500 whitespace-nowrap">
                        {r.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 text-[#1a1a1a]">
                        {r.editable ? (
                          <input
                            type="text"
                            value={r.description}
                            onChange={(e) => {
                              updateRow(r.key, { description: e.target.value })
                              if (extraId) updateExtraEntry(extraType, extraId, { description: e.target.value })
                            }}
                            className="bg-transparent focus:outline-none focus:border-b focus:border-blue-400 w-full"
                          />
                        ) : (
                          r.description
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {r.editable ? (
                          <input
                            type="number"
                            value={r.inflow || ''}
                            onChange={(e) => {
                              updateRow(r.key, { inflow: Number(e.target.value) })
                              if (extraId && r.inflow >= 0) updateExtraEntry(extraType, extraId, { amount: Number(e.target.value) })
                            }}
                            placeholder="—"
                            className="bg-transparent focus:outline-none focus:border-b focus:border-blue-400 text-right w-24 text-[#1a1a1a]"
                          />
                        ) : (
                          ''
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {r.editable ? (
                          <input
                            type="number"
                            value={r.outflow || ''}
                            onChange={(e) => {
                              updateRow(r.key, { outflow: Number(e.target.value) })
                              if (extraId && r.outflow >= 0) updateExtraEntry(extraType, extraId, { amount: Number(e.target.value) })
                            }}
                            placeholder="—"
                            className="bg-transparent focus:outline-none focus:border-b focus:border-blue-400 text-right w-24 text-[#1a1a1a]"
                          />
                        ) : (
                          ''
                        )}
                      </td>
                      <td className={`py-3 text-right ${isOpening ? 'text-[#1a1a1a]' : 'font-medium text-[#1a1a1a]'}`}>
                        {fmt(balance)}
                        {isExtra && extraId && (
                          <button
                            onClick={() => removeExtraEntry(extraType, extraId)}
                            className="ml-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {/* Closing Balance row */}
                <tr className="border-b border-gray-100">
                  <td className="py-3 text-gray-500 whitespace-nowrap">
                    {new Date(
                      start.getFullYear(),
                      start.getMonth() + monthsForPeriod(forecastPeriod) - 1,
                      1
                    ).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-3 font-bold text-[#1a1a1a]">Closing Balance</td>
                  <td></td>
                  <td></td>
                  <td className="py-3 text-right font-bold text-[#1a1a1a]">{fmt(closingBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Add row button */}
          <button
            onClick={() => addExtraEntry('income')}
            className="mt-3 flex items-center gap-2 text-[11px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-[0.15em]"
          >
            <Plus className="w-3 h-3" /> Add Row
          </button>

          {/* Dark totals bar */}
          <div className="mt-4 grid min-w-0 grid-cols-1 rounded-[2px] bg-[#6b6b6b] text-white sm:grid-cols-5">
            <div className="py-3 px-4"></div>
            <div className="py-3 px-4"></div>
            <div className="py-3 px-4 text-right text-[13px] font-bold">{fmt(totalInflow)}</div>
            <div className="py-3 px-4 text-right text-[13px] font-bold">{fmt(totalOutflow)}</div>
            <div className="py-3 px-4 text-right text-[13px] font-bold">{fmt(openingBalance)}</div>
          </div>
        </div>
      )}

      {detailMonths !== null && (
        <ProjectionDetailsModal
          months={detailMonths}
          label={detailLabel}
          startDate={start}
          breakdown={computeBreakdown(detailMonths)}
          sym={sym}
          fmt={fmt}
          fmtDelta={fmtDelta}
          onClose={() => setDetailMonths(null)}
        />
      )}

      {/* Rule Config Modal */}
      <RuleConfigModal
        isOpen={modalOpen}
        rule={editingRule}
        onClose={() => {
          setModalOpen(false)
          setEditingRule(null)
        }}
        onSave={handleSaveRuleConfig}
      />
        </>
      )}
    </div>
  )
}

// ... [Component helper functions below] ...

function ProjectionDetailsModal({
  months,
  label,
  startDate,
  breakdown,
  sym,
  fmt,
  fmtDelta,
  onClose,
}: {
  months: number
  label: string
  startDate: Date
  breakdown: BreakdownResult
  sym: string
  fmt: (v: number) => string
  fmtDelta: (v: number) => string
  onClose: () => void
}) {
  const [cashOpen, setCashOpen] = useState(true)
  const [invOpen, setInvOpen] = useState(true)

  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + months, 0)
  const dateStr = endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const cashDelta = breakdown.cashEnd - breakdown.cashOpening
  const invDelta = breakdown.invEnd - breakdown.investableOpening
  const assetsDelta = breakdown.assetsEnd - breakdown.assetsStart
  const nwDelta = breakdown.netWorthEnd - breakdown.netWorthStart
  const nwPct = breakdown.netWorthStart > 0 ? (nwDelta / breakdown.netWorthStart) * 100 : 0

  const currencyCode = sym === '€' ? 'EUR' : 'USD'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-3 overflow-y-auto sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[6px] shadow-xl w-full max-w-[540px] mt-10 mb-10 p-5 relative animate-in fade-in zoom-in-95 duration-200 sm:mt-16 sm:mb-16 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-1 text-[22px] font-bold text-[#1a1a1a]">{dateStr}</div>
        <div className="text-[12px] text-gray-500 mb-6">{label}</div>

        <div className="flex items-start gap-3 mb-8">
          <div className="w-[3px] h-[50px] bg-purple-500 rounded-full" />
          <div>
            <div className="break-words text-[28px] font-bold tracking-tight text-[#1a1a1a] leading-none sm:text-[30px]">
              {fmt(breakdown.netWorthEnd)}
            </div>
            <div className="text-[13px] font-bold text-green-600 mt-1">
              {fmtDelta(nwDelta)} ({nwPct >= 0 ? '+' : ''}
              {nwPct.toFixed(2).replace('.', ',')}%)
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-[4px] overflow-hidden">
          {/* Cash group */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => setCashOpen((v) => !v)}
              className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2 text-[14px] font-bold">
                {cashOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Cash
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 text-[13px] sm:gap-6">
                <span className={`font-bold ${cashDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {fmtDelta(cashDelta)}
                </span>
                <span className="font-medium text-[#1a1a1a]">{fmt(breakdown.cashEnd)}</span>
              </div>
            </button>
            {cashOpen && (
              <div className="bg-gray-50/60 text-[13px]">
                <DetailRow
                  text={`Income from Salary`}
                  delta={fmtDelta(breakdown.totalIncome)}
                  positive
                />
                <DetailRow text={`Expenses`} delta={fmtDelta(-breakdown.totalExpense)} />
                <DetailRow
                  text={`Cash growth`}
                  delta={fmtDelta(breakdown.totalCashGrowth)}
                  positive={breakdown.totalCashGrowth >= 0}
                />
              </div>
            )}
          </div>

          {/* Investable group */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => setInvOpen((v) => !v)}
              className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2 text-[14px] font-bold">
                {invOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Investable Assets
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 text-[13px] sm:gap-6">
                <span className={`font-bold ${invDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {fmtDelta(invDelta)}
                </span>
                <span className="font-medium text-[#1a1a1a]">{fmt(breakdown.invEnd)}</span>
              </div>
            </button>
            {invOpen && (
              <div className="bg-gray-50/60 text-[13px]">
                <DetailRow
                  text="Investable Assets as of today"
                  delta=""
                  trailing={fmt(breakdown.investableOpening)}
                />
                <DetailRow
                  text={`Investable growth`}
                  delta={fmtDelta(breakdown.totalInvGrowth)}
                  positive={breakdown.totalInvGrowth >= 0}
                />
              </div>
            )}
          </div>

          {/* Total Assets */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 bg-white">
            <div className="text-[14px] font-bold">Total Assets</div>
            <div className="flex flex-wrap items-center justify-end gap-3 text-[13px] sm:gap-6">
              <span className={`font-bold ${assetsDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {fmtDelta(assetsDelta)}
              </span>
              <span className="font-bold text-[#1a1a1a]">{fmt(breakdown.assetsEnd)}</span>
            </div>
          </div>
        </div>

        {/* Total Debts */}
        <div className="mt-4 border border-gray-200 rounded-[4px]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
            <div className="text-[14px] font-bold">Total Debts</div>
            <div className="text-[13px] font-bold text-[#1a1a1a]">{fmt(breakdown.debts)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  text,
  delta,
  positive,
  trailing,
}: {
  text: string
  delta: string
  positive?: boolean
  trailing?: string
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 border-t border-gray-200/60">
      <div className="text-[12px] text-gray-700 pr-6 flex-1">{text}</div>
      <div className="flex items-center gap-3 text-[12px] whitespace-nowrap sm:gap-5">
        {delta && (
          <span className={`font-bold ${positive ? 'text-green-600' : 'text-red-500'}`}>{delta}</span>
        )}
        {trailing && <span className="font-medium text-[#1a1a1a]">{trailing}</span>}
      </div>
    </div>
  )
}

function ProjectionCard(props: {
  label: string
  netWorth: number
  deltaAbs: number
  deltaPct: number
  assets: number
  debts: number
  income: number
  expenses: number
  fmt: (v: number) => string
  fmtDelta: (v: number) => string
  onClick?: () => void
}) {
  const { label, netWorth, deltaAbs, deltaPct, assets, debts, income, expenses, fmt, fmtDelta, onClick } = props
  const positive = deltaAbs >= 0
  return (
    <button
      onClick={onClick}
      className="min-w-0 bg-white border border-[#e5e7eb] rounded-[4px] p-5 shadow-sm text-left hover:shadow-md hover:border-gray-300 transition-all cursor-pointer sm:p-6"
      type="button"
    >
      <div className="text-[13px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-4">{label}</div>

      <div className="text-[11px] font-medium text-gray-500 mb-1">Net Worth</div>
      <div className="mb-1 flex min-w-0 flex-wrap items-baseline gap-1">
        <span className="text-[14px] font-bold">{fmt(netWorth).slice(0, 1)}</span>
        <span className="break-words text-[24px] font-bold tracking-tight text-[#1a1a1a] sm:text-[28px]">{fmt(netWorth).slice(2)}</span>
      </div>
      <div className={`text-[12px] font-bold mb-5 ${positive ? 'text-green-600' : 'text-red-500'}`}>
        {fmtDelta(deltaAbs)} ({positive ? '+' : ''}
        {deltaPct.toFixed(2).replace('.', ',')}%)
      </div>

      <div className="grid grid-cols-1 gap-4 mb-5 sm:grid-cols-2 sm:gap-6">
        <div>
          <div className="text-[11px] font-medium text-gray-500 mb-1">Assets</div>
          <div className="text-[14px] font-bold">{fmt(assets)}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-gray-500 mb-1">Debts</div>
          <div className="text-[14px] font-bold">{fmt(debts)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <div className="text-[11px] font-medium text-gray-500 mb-1">Income</div>
          <div className="text-[14px] font-bold">{fmt(income)}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-gray-500 mb-1">Expenses</div>
          <div className="text-[14px] font-bold">{fmt(expenses)}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-gray-500 mb-1">Estimated Tax</div>
          <div className="text-[14px] font-bold">{fmt(0)}</div>
        </div>
      </div>
    </button>
  )
}

function MiniProjectionCard(props: {
  years: number
  year: number
  netWorth: number
  deltaAbs: number
  deltaPct: number
  fmtCompact: (v: number) => string
  fmtDelta: (v: number) => string
  onClick?: () => void
}) {
  const { years, year, netWorth, deltaAbs, deltaPct, fmtCompact, fmtDelta, onClick } = props
  const positive = deltaAbs >= 0
  return (
    <button
      onClick={onClick}
      type="button"
      className="min-w-0 bg-white border border-[#e5e7eb] rounded-[4px] p-5 shadow-sm text-left hover:shadow-md hover:border-gray-300 transition-all cursor-pointer sm:p-6"
    >
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-[13px] font-bold text-gray-400 uppercase tracking-[0.15em]">
          {String(years).padStart(2, '0')}Y
        </span>
        <span className="text-[10px] font-bold text-gray-400">{year}</span>
      </div>
      <div className="text-[11px] font-medium text-gray-500 mb-1">Net Worth</div>
      <div className="break-words text-[20px] font-bold tracking-tight text-[#1a1a1a] mb-1 sm:text-[22px]">
        {fmtCompact(netWorth)}
      </div>
      <div className={`text-[12px] font-bold ${positive ? 'text-green-600' : 'text-red-500'}`}>
        {fmtDelta(deltaAbs)} ({positive ? '+' : ''}
        {deltaPct.toFixed(2).replace('.', ',')}%)
      </div>
    </button>
  )
}

function ScenarioRulesBlock({
  rules,
  toggle,
  onEditRule,
  onRemoveRule,
  onAddRule,
  onEditExtra,
  summary,
}: {
  rules: Rule[]
  toggle: (key: string) => void
  onEditRule: (ruleType: string) => void
  onRemoveRule: (id: string) => void
  onAddRule: (type: 'income' | 'expense', description: string, amount: number) => void
  onEditExtra: (id: string, patch: Partial<ExtraEntry>) => void
  summary: string
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [ruleType, setRuleType] = useState<'income' | 'expense'>('income')
  const [ruleDesc, setRuleDesc] = useState('')
  const [ruleAmount, setRuleAmount] = useState('')
  const [expandedExtra, setExpandedExtra] = useState<string | null>(null)
  const descRef = useRef<HTMLInputElement>(null)

  const openForm = () => {
    setRuleDesc('')
    setRuleAmount('')
    setRuleType('income')
    setExpandedExtra(null)
    setFormOpen(true)
    setTimeout(() => descRef.current?.focus(), 0)
  }

  const handleAdd = () => {
    const desc = ruleDesc.trim() || (ruleType === 'income' ? 'New Income' : 'New Expense')
    const amount = parseFloat(ruleAmount) || 0
    onAddRule(ruleType, desc, amount)
    setFormOpen(false)
    setRuleDesc('')
    setRuleAmount('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') setFormOpen(false)
  }

  return (
    <>
      <div className="mb-2 flex items-center gap-4">
        <div className="border-l-[3px] border-purple-500 pl-3">
          <div className="text-[13px] font-bold text-[#1a1a1a]">Scenario A</div>
          <div className="text-[11px] text-gray-400 font-medium">{summary}</div>
        </div>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-[4px] shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
          Rules
        </div>
        <div className="divide-y divide-gray-100">
          {rules.map((rule) => (
            <div key={rule.id}>
              {/* Rule row */}
              <div className="flex items-center justify-between px-6 py-4 group">
                <div className={`text-[14px] flex-1 min-w-0 ${rule.enabled ? 'text-[#1a1a1a]' : 'text-gray-400 line-through'}`}>
                  {rule.render()}
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  <Toggle on={rule.enabled} onClick={() => toggle(rule.id)} />
                  {rule.isExtra && rule.extraId ? (
                    <button
                      onClick={() => setExpandedExtra(expandedExtra === rule.extraId ? null : rule.extraId!)}
                      className={`transition-colors ${expandedExtra === rule.extraId ? 'text-blue-500' : 'text-gray-300 hover:text-gray-600'}`}
                      title="Edit rule"
                      aria-label="Edit rule"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onEditRule(rule.id)}
                      className="text-gray-300 hover:text-gray-600 transition-colors"
                      aria-label="Edit rule"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Inline edit panel for extra entries */}
              {rule.isExtra && rule.extraId && expandedExtra === rule.extraId && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em]">Repeats</span>
                    <select
                      value={rule.extraRecurrence ?? 'monthly'}
                      onChange={(e) => onEditExtra(rule.extraId!, { recurrence: e.target.value as EntryRecurrence })}
                      className="text-[12px] border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="monthly">Every month</option>
                      <option value="quarterly">Every 3 months</option>
                      <option value="yearly">Every year</option>
                    </select>
                  </div>
                  <button
                    onClick={() => { onRemoveRule(rule.extraId!); setExpandedExtra(null) }}
                    className="ml-auto text-[11px] font-bold text-red-400 hover:text-red-600 uppercase tracking-[0.1em] flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Delete rule
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ADD RULE form — inline, matching Kubera style */}
        {formOpen ? (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex flex-wrap items-center gap-2 text-[14px]">
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as 'income' | 'expense')}
                className="text-[13px] font-medium border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 py-1 pr-1 cursor-pointer"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <span className="text-gray-500">of</span>
              <input
                type="number"
                placeholder="0"
                value={ruleAmount}
                onChange={(e) => setRuleAmount(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-28 border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 py-1 text-center font-medium placeholder-gray-300"
              />
              <span className="text-gray-500">from</span>
              <input
                ref={descRef}
                type="text"
                placeholder={ruleType === 'income' ? 'Salary' : 'Expenses'}
                value={ruleDesc}
                onChange={(e) => setRuleDesc(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 min-w-[120px] border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 py-1 placeholder-gray-300"
              />
              <span className="text-gray-400 text-[12px]">· repeats every month</span>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleAdd}
                className="text-[11px] font-bold bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 uppercase tracking-[0.1em]"
              >
                Add Rule
              </button>
              <button
                onClick={() => setFormOpen(false)}
                className="text-[11px] text-gray-400 hover:text-gray-600 uppercase tracking-[0.1em]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={openForm}
            className="w-full text-left px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] hover:text-blue-500 transition-colors border-t border-gray-100 flex items-center gap-2"
          >
            <Plus className="w-3 h-3" /> Add Rule
          </button>
        )}
      </div>
    </>
  )
}

/** Inline-editable number — click to edit, blur/Enter to save (Kubera-style) */
function InlineNumber({
  value,
  onSave,
  className = '',
  prefix = '',
  suffix = '',
}: {
  value: number
  onSave: (v: number) => void
  className?: string
  prefix?: string
  suffix?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  const commit = () => {
    const parsed = parseFloat(draft)
    if (!isNaN(parsed) && parsed !== value) onSave(parsed)
    setEditing(false)
  }

  if (editing) {
    return (
      <span className={`inline-flex items-center gap-0.5 ${className}`}>
        {prefix && <span>{prefix}</span>}
        <input
          autoFocus
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className={`bg-transparent border-b border-blue-500 focus:outline-none w-20 text-center`}
        />
        {suffix && <span>{suffix}</span>}
      </span>
    )
  }
  return (
    <span
      onClick={() => { setDraft(String(value)); setEditing(true) }}
      title="Click to edit"
      className={`cursor-pointer underline decoration-dotted underline-offset-2 ${className}`}
    >
      {prefix}{value.toLocaleString('de-DE')}{suffix}
    </span>
  )
}

function InlineText({
  value,
  onSave,
  placeholder = '',
  className = '',
}: {
  value: string
  onSave: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onSave(trimmed)
    setEditing(false)
  }

  // Keep draft in sync when value changes from outside (e.g. after save)
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className={`bg-transparent border-b border-blue-500 focus:outline-none min-w-[80px] ${className}`}
      />
    )
  }
  return (
    <span
      onClick={() => { setDraft(value); setEditing(true) }}
      title="Click to edit"
      className={`cursor-pointer underline decoration-dotted underline-offset-2 ${className}`}
    >
      {value || placeholder}
    </span>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1">
        {label}
      </div>
      <div className="text-[17px] font-bold text-[#1a1a1a]">{value}</div>
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

function EditLink({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <span
      onClick={onClick}
      className="text-blue-500 underline decoration-dotted underline-offset-2 cursor-pointer hover:text-blue-600"
    >
      {children}
    </span>
  )
}
