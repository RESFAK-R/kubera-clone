'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts'
import { Plus, MoreHorizontal, Printer, ChevronDown, ChevronRight, X } from 'lucide-react'
import { saveCashForecastPdf } from '@/app/dashboard/fast-forward/save-pdf-action'

type Props = {
  initialNetWorth: number
  totalAssets: number
  totalDebts: number
  investableAssets: number
  baseCurrency: string
}

type Tab = 'Net Worth Projections' | 'Charts' | 'Cash Forecast'

type Rule = {
  id: string
  enabled: boolean
  render: () => React.ReactNode
}

export function FastForwardContent({
  initialNetWorth,
  totalAssets,
  totalDebts,
  investableAssets,
  baseCurrency,
}: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [activeTab, setActiveTab] = useState<Tab>('Net Worth Projections')
  const [detailMonths, setDetailMonths] = useState<number | null>(null)
  const [detailLabel, setDetailLabel] = useState<string>('')

  // Scenario rules state (editable)
  const [cashGrowth, setCashGrowth] = useState(2)
  const [investableGrowth, setInvestableGrowth] = useState(7)
  const [monthlyIncome, setMonthlyIncome] = useState(10000)
  const [incomeYearlyBump, setIncomeYearlyBump] = useState(10)
  const [monthlyExpense, setMonthlyExpense] = useState(6000)
  const [inflation, setInflation] = useState(3)

  const [enabledRules, setEnabledRules] = useState({
    cash: true,
    investable: true,
    income: true,
    expense: true,
    inflation: true,
  })

  type ForecastPeriod = '1M' | 'QUARTER' | '3M' | 'YEAR' | '1Y'
  const [forecastPeriod, setForecastPeriod] = useState<ForecastPeriod>('1M')
  const [periodOpen, setPeriodOpen] = useState(false)

  // Editable per-row overrides (keyed by `${yyyy-mm}:${description}`)
  type LedgerRow = {
    key: string
    date: Date
    description: string
    inflow: number
    outflow: number
    editable: boolean
  }
  const [rowOverrides, setRowOverrides] = useState<Record<string, { inflow?: number; outflow?: number; description?: string }>>({})
  const [customRows, setCustomRows] = useState<{ key: string; date: Date; description: string; inflow: number; outflow: number }[]>([])

  const monthsForPeriod = (p: ForecastPeriod) => {
    const now = new Date()
    switch (p) {
      case '1M': return 1
      case 'QUARTER': return 3
      case '3M': return 3
      case 'YEAR': return Math.max(1, 12 - now.getMonth())
      case '1Y': return 12
    }
  }

  const start = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }, [])

  const { rows, totalInflow, totalOutflow, openingBalance, closingBalance } = useMemo(() => {
    const months = monthsForPeriod(forecastPeriod)
    const list: LedgerRow[] = []
    const openingBalance = 0
    let balance = openingBalance

    let cashPool = Math.max(0, totalAssets - investableAssets - totalDebts)
    let income = enabledRules.income ? monthlyIncome : 0
    const expense = enabledRules.expense ? monthlyExpense : 0
    const mCash = enabledRules.cash ? Math.pow(1 + cashGrowth / 100, 1 / 12) - 1 : 0

    const opening: LedgerRow = {
      key: 'opening',
      date: start,
      description: 'Opening Balance as of today',
      inflow: 0,
      outflow: 0,
      editable: false,
    }
    list.push(opening)

    for (let m = 0; m < months; m++) {
      const d = new Date(start.getFullYear(), start.getMonth() + m, 1)
      if (m > 0 && d.getMonth() === 0 && enabledRules.income) {
        income = income * (1 + incomeYearlyBump / 100)
      }

      if (enabledRules.income && income > 0) {
        const key = `${d.getFullYear()}-${d.getMonth()}:salary`
        const ovr = rowOverrides[key]
        list.push({
          key,
          date: d,
          description: ovr?.description ?? 'Salary',
          inflow: ovr?.inflow ?? income,
          outflow: 0,
          editable: true,
        })
      }

      if (enabledRules.cash && mCash > 0) {
        const growth = cashPool * mCash
        if (growth > 0.5 || m === 0) {
          const key = `${d.getFullYear()}-${d.getMonth()}:cashgrow`
          const ovr = rowOverrides[key]
          list.push({
            key,
            date: d,
            description: ovr?.description ?? `Cash grows by ${cashGrowth}% per year`,
            inflow: ovr?.inflow ?? Math.round(growth),
            outflow: 0,
            editable: true,
          })
          cashPool += growth
        }
      }

      if (enabledRules.expense && expense > 0) {
        const key = `${d.getFullYear()}-${d.getMonth()}:expenses`
        const ovr = rowOverrides[key]
        list.push({
          key,
          date: d,
          description: ovr?.description ?? 'Expenses',
          inflow: 0,
          outflow: ovr?.outflow ?? expense,
          editable: true,
        })
      }

      if (enabledRules.income) cashPool += income
      if (enabledRules.expense) cashPool -= expense

      // Append custom rows for this month
      for (const cr of customRows) {
        if (cr.date.getFullYear() === d.getFullYear() && cr.date.getMonth() === d.getMonth()) {
          list.push({ ...cr, editable: true })
        }
      }
    }

    // Compute running balance
    let run = openingBalance
    let totalInflow = 0
    let totalOutflow = 0
    for (const r of list) {
      run += r.inflow - r.outflow
      totalInflow += r.inflow
      totalOutflow += r.outflow
      ;(r as LedgerRow & { balance: number }).balance = run
    }

    const closingBalance = run
    return { rows: list, totalInflow, totalOutflow, openingBalance, closingBalance }
  }, [
    forecastPeriod,
    start,
    totalAssets,
    investableAssets,
    totalDebts,
    monthlyIncome,
    incomeYearlyBump,
    monthlyExpense,
    cashGrowth,
    enabledRules,
    rowOverrides,
    customRows,
  ])

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
    setRowOverrides(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }
  const addCustomRow = () => {
    const d = new Date(start.getFullYear(), start.getMonth(), 1)
    setCustomRows(prev => [
      ...prev,
      { key: `custom-${crypto.randomUUID()}`, date: d, description: 'New entry', inflow: 0, outflow: 0 },
    ])
  }
  const updateCustomRow = (key: string, patch: Partial<{ description: string; inflow: number; outflow: number }>) => {
    setCustomRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)))
  }
  const removeCustomRow = (key: string) => {
    setCustomRows(prev => prev.filter(r => r.key !== key))
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
      forecastPeriod === '1M' ? '1 Month'
      : forecastPeriod === 'QUARTER' ? 'This Quarter'
      : forecastPeriod === '3M' ? '3 Months'
      : forecastPeriod === 'YEAR' ? 'This Year'
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
    const body = rows.map(r => [
      r.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      r.description,
      r.inflow > 0 ? fmt(r.inflow) : '',
      r.outflow > 0 ? fmt(r.outflow) : '',
      fmt((r as LedgerRow & { balance: number }).balance),
    ])
    body.push([
      new Date(start.getFullYear(), start.getMonth() + monthsForPeriod(forecastPeriod) - 1, 1)
        .toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
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
      didParseCell: data => {
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

  const sym = baseCurrency === 'EUR' ? '€' : '$'
  const fmt = (val: number) =>
    `${sym} ${Math.round(val).toLocaleString('de-DE')}`
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

  // Projection engine: monthly compounding
  const projection = useMemo(() => {
    const months = 20 * 12
    const out: { month: number; netWorth: number; assets: number; debts: number; income: number; expenses: number }[] = []
    let nw = initialNetWorth
    let assets = totalAssets
    const debts = totalDebts
    let investable = investableAssets
    let cash = Math.max(0, totalAssets - investableAssets - totalDebts)
    let income = enabledRules.income ? monthlyIncome : 0
    const expense = enabledRules.expense ? monthlyExpense : 0

    const mCash = enabledRules.cash ? Math.pow(1 + cashGrowth / 100, 1 / 12) - 1 : 0
    const mInv = enabledRules.investable ? Math.pow(1 + investableGrowth / 100, 1 / 12) - 1 : 0

    out.push({ month: 0, netWorth: nw, assets, debts, income: 0, expenses: 0 })

    let cumIncome = 0
    let cumExpense = 0

    for (let m = 1; m <= months; m++) {
      // yearly income bump every 12 months
      if (m > 1 && m % 12 === 1 && enabledRules.income) {
        income = income * (1 + incomeYearlyBump / 100)
      }
      const netFlow = income - expense
      cash += netFlow
      cumIncome += income
      cumExpense += expense

      // Apply growth
      investable = investable * (1 + mInv)
      cash = cash * (1 + mCash)

      assets = investable + cash
      nw = assets - debts

      out.push({ month: m, netWorth: nw, assets, debts, income: cumIncome, expenses: cumExpense })
    }
    return out
  }, [
    initialNetWorth,
    totalAssets,
    totalDebts,
    investableAssets,
    cashGrowth,
    investableGrowth,
    monthlyIncome,
    incomeYearlyBump,
    monthlyExpense,
    enabledRules,
  ])

  const computeBreakdown = (months: number) => {
    const debts = totalDebts
    let cashStart = Math.max(0, totalAssets - investableAssets - totalDebts)
    let investableStart = investableAssets
    const cashOpening = cashStart
    const investableOpening = investableStart

    let income = enabledRules.income ? monthlyIncome : 0
    const expense = enabledRules.expense ? monthlyExpense : 0
    const mCash = enabledRules.cash ? Math.pow(1 + cashGrowth / 100, 1 / 12) - 1 : 0
    const mInv = enabledRules.investable ? Math.pow(1 + investableGrowth / 100, 1 / 12) - 1 : 0

    let totalIncome = 0
    let totalExpense = 0
    let totalCashGrowth = 0
    let totalInvGrowth = 0
    let cash = cashStart
    let investable = investableStart

    for (let m = 1; m <= months; m++) {
      const d = new Date(start.getFullYear(), start.getMonth() + m, 1)
      if (m > 1 && d.getMonth() === 0 && enabledRules.income) {
        income = income * (1 + incomeYearlyBump / 100)
      }
      if (enabledRules.income) {
        cash += income
        totalIncome += income
      }
      if (enabledRules.expense) {
        cash -= expense
        totalExpense += expense
      }
      if (enabledRules.cash) {
        const g = cash * mCash
        cash += g
        totalCashGrowth += g
      }
      if (enabledRules.investable) {
        const g = investable * mInv
        investable += g
        totalInvGrowth += g
      }
    }

    const cashEnd = cash
    const invEnd = investable
    const assetsEnd = cashEnd + invEnd
    const netWorthEnd = assetsEnd - debts
    const netWorthStart = cashOpening + investableOpening - debts
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
      assetsStart: cashOpening + investableOpening,
    }
  }

  const at = (m: number) => projection[Math.min(m, projection.length - 1)]
  const m1 = at(1)
  const y1 = at(12)
  const y5 = at(60)
  const y10 = at(120)
  const y20 = at(240)

  const currentYear = new Date().getFullYear()

  if (!mounted)
    return <div className="min-h-[600px] w-full bg-gray-50 animate-pulse rounded-lg" />

  const toggle = (key: keyof typeof enabledRules) =>
    setEnabledRules(prev => ({ ...prev, [key]: !prev[key] }))

  const rules: Rule[] = [
    {
      id: 'cash',
      enabled: enabledRules.cash,
      render: () => (
        <>
          Value of <EditLink>Cash</EditLink> to change by{' '}
          <EditValue onChange={v => setCashGrowth(v)} value={cashGrowth} suffix="% per year" />
        </>
      ),
    },
    {
      id: 'investable',
      enabled: enabledRules.investable,
      render: () => (
        <>
          Value of <EditLink>Investable Assets</EditLink> to change by{' '}
          <EditValue onChange={v => setInvestableGrowth(v)} value={investableGrowth} suffix="% per year" />
        </>
      ),
    },
    {
      id: 'income',
      enabled: enabledRules.income,
      render: () => (
        <>
          Income of <EditLink>{sym === '€' ? 'EUR' : 'USD'} {monthlyIncome.toLocaleString('de-DE')}</EditLink>{' '}
          from <EditLink>Salary</EditLink>. Repeats <EditLink>every month</EditLink>. Revised to{' '}
          <EditLink>+{incomeYearlyBump}%</EditLink> every year in <EditLink>Jan</EditLink>
        </>
      ),
    },
    {
      id: 'expense',
      enabled: enabledRules.expense,
      render: () => (
        <>
          Expense of <EditLink>{sym === '€' ? 'EUR' : 'USD'} {monthlyExpense.toLocaleString('de-DE')}</EditLink>{' '}
          towards <EditLink>Expenses</EditLink>. Repeats <EditLink>every month</EditLink>
        </>
      ),
    },
    {
      id: 'inflation',
      enabled: enabledRules.inflation,
      render: () => (
        <>
          Inflation rate is <EditValue onChange={v => setInflation(v)} value={inflation} suffix="% per year" />
        </>
      ),
    },
  ]

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto no-scrollbar">
        {(['Net Worth Projections', 'Charts', 'Cash Forecast'] as Tab[]).map(tab => {
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

      {activeTab === 'Net Worth Projections' && (
        <div className="animate-in fade-in duration-300">
          {/* 01 MONTH / 01 YEAR grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <ProjectionCard
              label="01 MONTH"
              netWorth={m1.netWorth}
              deltaAbs={m1.netWorth - initialNetWorth}
              deltaPct={((m1.netWorth - initialNetWorth) / Math.max(1, initialNetWorth)) * 100}
              assets={m1.assets}
              debts={m1.debts}
              income={enabledRules.income ? monthlyIncome : 0}
              expenses={enabledRules.expense ? monthlyExpense : 0}
              fmt={fmt}
              fmtDelta={fmtDelta}
              onClick={() => { setDetailMonths(1); setDetailLabel('Next Month') }}
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
              onClick={() => { setDetailMonths(12); setDetailLabel('Next Year') }}
            />
          </div>

          {/* 5Y / 10Y / 20Y mini cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <MiniProjectionCard
              years={5}
              year={currentYear + 5}
              netWorth={y5.netWorth}
              deltaAbs={y5.netWorth - initialNetWorth}
              deltaPct={((y5.netWorth - initialNetWorth) / Math.max(1, initialNetWorth)) * 100}
              fmtCompact={fmtCompact}
              fmtDelta={fmtDelta}
              onClick={() => { setDetailMonths(60); setDetailLabel('In 5 Years') }}
            />
            <MiniProjectionCard
              years={10}
              year={currentYear + 10}
              netWorth={y10.netWorth}
              deltaAbs={y10.netWorth - initialNetWorth}
              deltaPct={((y10.netWorth - initialNetWorth) / Math.max(1, initialNetWorth)) * 100}
              fmtCompact={fmtCompact}
              fmtDelta={fmtDelta}
              onClick={() => { setDetailMonths(120); setDetailLabel('In 10 Years') }}
            />
            <MiniProjectionCard
              years={20}
              year={currentYear + 20}
              netWorth={y20.netWorth}
              deltaAbs={y20.netWorth - initialNetWorth}
              deltaPct={((y20.netWorth - initialNetWorth) / Math.max(1, initialNetWorth)) * 100}
              fmtCompact={fmtCompact}
              fmtDelta={fmtDelta}
              onClick={() => { setDetailMonths(240); setDetailLabel('In 20 Years') }}
            />
          </div>

          <ScenarioRulesBlock
            rules={rules}
            toggle={(k) => toggle(k as keyof typeof enabledRules)}
            summary={fmtCompact(y20.netWorth).replace('Million', 'M')}
          />
        </div>
      )}

      {activeTab === 'Charts' && (
        <div className="animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-[13px] font-bold text-gray-400 mb-2">
                {new Date(currentYear + 10, start.getMonth(), 1).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
              <div className="text-[40px] font-bold tracking-tight text-[#1a1a1a] leading-none">
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
          <div className="h-[360px] mb-10">
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
                  tickFormatter={m => `${m / 12}Y`}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                  tickFormatter={val => `${sym}${(val / 1000).toFixed(0)}k`}
                />
                <ReTooltip
                  formatter={(val) => fmt(Number(val))}
                  labelFormatter={m => `Month ${m}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="netWorth" stroke="#a855f7" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <ScenarioRulesBlock
            rules={rules}
            toggle={(k) => toggle(k as keyof typeof enabledRules)}
            summary={fmtCompact(y20.netWorth).replace('Million', 'M')}
          />
        </div>
      )}

      {activeTab === 'Cash Forecast' && (
        <div className="animate-in fade-in duration-300">
          {/* Period header with dropdown */}
          <div className="relative mb-6">
            <button
              onClick={() => setPeriodOpen(v => !v)}
              className="flex items-baseline gap-3 group"
            >
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
                {periodOptions.map(opt => (
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
          <div className="flex items-baseline justify-between pb-5 border-b border-gray-200 mb-0">
            <div className="flex items-baseline gap-8">
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
          <table className="w-full text-[13px]">
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
              {rows.map(r => {
                const isCustom = r.key.startsWith('custom-')
                const isOpening = r.key === 'opening'
                const balance = (r as LedgerRow & { balance: number }).balance
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
                          onChange={e =>
                            isCustom
                              ? updateCustomRow(r.key, { description: e.target.value })
                              : updateRow(r.key, { description: e.target.value })
                          }
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
                          onChange={e =>
                            isCustom
                              ? updateCustomRow(r.key, { inflow: Number(e.target.value) })
                              : updateRow(r.key, { inflow: Number(e.target.value) })
                          }
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
                          onChange={e =>
                            isCustom
                              ? updateCustomRow(r.key, { outflow: Number(e.target.value) })
                              : updateRow(r.key, { outflow: Number(e.target.value) })
                          }
                          placeholder="—"
                          className="bg-transparent focus:outline-none focus:border-b focus:border-blue-400 text-right w-24 text-[#1a1a1a]"
                        />
                      ) : (
                        ''
                      )}
                    </td>
                    <td className={`py-3 text-right ${isOpening ? 'text-[#1a1a1a]' : 'font-medium text-[#1a1a1a]'}`}>
                      {fmt(balance)}
                      {isCustom && (
                        <button
                          onClick={() => removeCustomRow(r.key)}
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
                    1,
                  ).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </td>
                <td className="py-3 font-bold text-[#1a1a1a]">Closing Balance</td>
                <td></td>
                <td></td>
                <td className="py-3 text-right font-bold text-[#1a1a1a]">{fmt(closingBalance)}</td>
              </tr>
            </tbody>
          </table>

          {/* Add row button */}
          <button
            onClick={addCustomRow}
            className="mt-3 flex items-center gap-2 text-[11px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-[0.15em]"
          >
            <Plus className="w-3 h-3" /> Add Row
          </button>

          {/* Dark totals bar */}
          <div className="mt-4 bg-[#6b6b6b] text-white grid grid-cols-5 rounded-[2px]">
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
          cashGrowthPct={cashGrowth}
          investableGrowthPct={investableGrowth}
          monthlyIncome={monthlyIncome}
          incomeYearlyBump={incomeYearlyBump}
          monthlyExpense={monthlyExpense}
          enabledRules={enabledRules}
          sym={sym}
          fmt={fmt}
          fmtDelta={fmtDelta}
          onClose={() => setDetailMonths(null)}
        />
      )}
    </div>
  )
}

function ProjectionDetailsModal({
  months,
  label,
  startDate,
  breakdown,
  cashGrowthPct,
  investableGrowthPct,
  monthlyIncome,
  incomeYearlyBump,
  monthlyExpense,
  enabledRules,
  sym,
  fmt,
  fmtDelta,
  onClose,
}: {
  months: number
  label: string
  startDate: Date
  breakdown: ReturnType<FastForwardContentCtx['computeBreakdown']>
  cashGrowthPct: number
  investableGrowthPct: number
  monthlyIncome: number
  incomeYearlyBump: number
  monthlyExpense: number
  enabledRules: { cash: boolean; investable: boolean; income: boolean; expense: boolean; inflation: boolean }
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[6px] shadow-xl w-full max-w-[540px] mt-16 mb-16 p-8 relative animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
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
            <div className="text-[30px] font-bold tracking-tight text-[#1a1a1a] leading-none">
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
              onClick={() => setCashOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2 text-[14px] font-bold">
                {cashOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Cash
              </div>
              <div className="flex items-center gap-6 text-[13px]">
                <span className={`font-bold ${cashDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {fmtDelta(cashDelta)}
                </span>
                <span className="font-medium text-[#1a1a1a]">{fmt(breakdown.cashEnd)}</span>
              </div>
            </button>
            {cashOpen && (
              <div className="bg-gray-50/60 text-[13px]">
                {enabledRules.income && (
                  <DetailRow
                    text={`Income of ${currencyCode} ${monthlyIncome.toLocaleString('de-DE')} from Salary. Repeats every month. Revised to +${incomeYearlyBump}% every year in Jan`}
                    delta={fmtDelta(breakdown.totalIncome)}
                    positive
                  />
                )}
                {enabledRules.expense && (
                  <DetailRow
                    text={`Expense of ${currencyCode} ${monthlyExpense.toLocaleString('de-DE')} towards Expenses. Repeats every month`}
                    delta={fmtDelta(-breakdown.totalExpense)}
                  />
                )}
                {enabledRules.cash && (
                  <DetailRow
                    text={`Value of Cash to change by ${cashGrowthPct}% per year`}
                    delta={fmtDelta(breakdown.totalCashGrowth)}
                    positive={breakdown.totalCashGrowth >= 0}
                  />
                )}
              </div>
            )}
          </div>

          {/* Investable group */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => setInvOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2 text-[14px] font-bold">
                {invOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Investable Assets
              </div>
              <div className="flex items-center gap-6 text-[13px]">
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
                {enabledRules.investable && (
                  <DetailRow
                    text={`Value of Investable Assets to change by ${investableGrowthPct}% per year`}
                    delta={fmtDelta(breakdown.totalInvGrowth)}
                    positive={breakdown.totalInvGrowth >= 0}
                  />
                )}
              </div>
            )}
          </div>

          {/* Total Assets */}
          <div className="flex items-center justify-between px-4 py-4 bg-white">
            <div className="text-[14px] font-bold">Total Assets</div>
            <div className="flex items-center gap-6 text-[13px]">
              <span className={`font-bold ${assetsDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {fmtDelta(assetsDelta)}
              </span>
              <span className="font-bold text-[#1a1a1a]">{fmt(breakdown.assetsEnd)}</span>
            </div>
          </div>
        </div>

        {/* Total Debts */}
        <div className="mt-4 border border-gray-200 rounded-[4px]">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="text-[14px] font-bold">Total Debts</div>
            <div className="text-[13px] font-bold text-[#1a1a1a]">{fmt(breakdown.debts)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

type FastForwardContentCtx = {
  computeBreakdown: (months: number) => {
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
    <div className="flex items-start justify-between px-4 py-3 border-t border-gray-200/60">
      <div className="text-[12px] text-gray-700 pr-6 flex-1">{text}</div>
      <div className="flex items-center gap-5 text-[12px] whitespace-nowrap">
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
      className="bg-white border border-[#e5e7eb] rounded-[4px] p-6 shadow-sm text-left hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
      type="button"
    >
      <div className="text-[13px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-4">{label}</div>

      <div className="text-[11px] font-medium text-gray-500 mb-1">Net Worth</div>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-[14px] font-bold">{fmt(netWorth).slice(0, 1)}</span>
        <span className="text-[28px] font-bold tracking-tight text-[#1a1a1a]">
          {fmt(netWorth).slice(2)}
        </span>
      </div>
      <div className={`text-[12px] font-bold mb-5 ${positive ? 'text-green-600' : 'text-red-500'}`}>
        {fmtDelta(deltaAbs)} ({positive ? '+' : ''}
        {deltaPct.toFixed(2).replace('.', ',')}%)
      </div>

      <div className="grid grid-cols-2 gap-6 mb-5">
        <div>
          <div className="text-[11px] font-medium text-gray-500 mb-1">Assets</div>
          <div className="text-[14px] font-bold">{fmt(assets)}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-gray-500 mb-1">Debts</div>
          <div className="text-[14px] font-bold">{fmt(debts)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
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
      className="bg-white border border-[#e5e7eb] rounded-[4px] p-6 shadow-sm text-left hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
    >
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-[13px] font-bold text-gray-400 uppercase tracking-[0.15em]">
          {String(years).padStart(2, '0')}Y
        </span>
        <span className="text-[10px] font-bold text-gray-400">{year}</span>
      </div>
      <div className="text-[11px] font-medium text-gray-500 mb-1">Net Worth</div>
      <div className="text-[22px] font-bold tracking-tight text-[#1a1a1a] mb-1">
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
  summary,
}: {
  rules: Rule[]
  toggle: (key: string) => void
  summary: string
}) {
  return (
    <>
      <div className="mb-2 flex items-center gap-4">
        <div className="border-l-[3px] border-purple-500 pl-3">
          <div className="text-[13px] font-bold text-[#1a1a1a]">Scenario A</div>
          <div className="text-[11px] text-gray-400 font-medium">{summary}</div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 ml-2">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-[4px] shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
          Rules
        </div>
        <div className="divide-y divide-gray-100">
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between px-6 py-4 group">
              <div className={`text-[14px] ${rule.enabled ? 'text-[#1a1a1a]' : 'text-gray-400'}`}>
                {rule.render()}
              </div>
              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                <Toggle on={rule.enabled} onClick={() => toggle(rule.id)} />
                <button className="text-gray-300 hover:text-gray-600">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full text-left px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] hover:text-blue-500 transition-colors border-t border-gray-100">
          Add Rule
        </button>
      </div>
    </>
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

function EditLink({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-blue-500 underline decoration-dotted underline-offset-2 cursor-pointer hover:text-blue-600">
      {children}
    </span>
  )
}

function EditValue({
  value,
  onChange,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  suffix: string
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-12 text-blue-500 bg-transparent border-b border-dotted border-blue-400 focus:outline-none focus:border-blue-600 text-[14px]"
      />
      <span className="text-blue-500">{suffix}</span>
    </span>
  )
}

