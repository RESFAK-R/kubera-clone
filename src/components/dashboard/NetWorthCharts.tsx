'use client'

import { useState, useEffect } from 'react'
import { 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer 
} from 'recharts'

type Props = {
  totalAssets: number
  totalNetWorth: number
  investableAssets: number
  stockAssets: number
  cryptoAssets: number
  metalAssets: number
  largestAsset: { name: string; value: number } | null
  assetsXSheetsData: Array<{ name: string; value: number }>
  baseCurrency: string
}

export function NetWorthCharts({
  totalAssets,
  totalNetWorth,
  investableAssets,
  stockAssets,
  cryptoAssets,
  metalAssets,
  largestAsset,
  assetsXSheetsData,
  baseCurrency
}: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  const formatCurrency = (val: number) => {
    if (val === 0) return baseCurrency === 'EUR' ? '€0' : '$0'
    return new Intl.NumberFormat('de-DE', { 
      style: 'currency', 
      currency: baseCurrency,
      maximumFractionDigits: 0
    }).format(val)
  }
  
  const largestAssetVal = Number(largestAsset?.value || 0)
  const largestAssetPct = totalAssets > 0 ? (largestAssetVal / totalAssets * 100) : 0

  // Chart Data: Investable Assets vs Net Worth
  const investableVsNetWorthData = [
    { name: 'Investable', value: investableAssets },
    { name: 'Remaining', value: Math.max(0, totalNetWorth - investableAssets) }
  ]

  // Chart Data: Investable ex Cash
  const investableExCashData = [
    { name: 'Stocks', value: stockAssets, color: '#4f46e5' },
    { name: 'Crypto', value: cryptoAssets, color: '#8b5cf6' },
    { name: 'Metals', value: metalAssets, color: '#d946ef' }
  ].filter(d => d.value > 0)

  if (!mounted) return <div className="min-h-[420px] w-full bg-[#f4f5f5] animate-pulse rounded-lg lg:min-h-[600px]" />

  return (
    <>
      {/* Horizontal Allocation Bar */}
      {largestAsset && (
        <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-6 mb-8 shadow-sm sm:p-8 lg:p-10">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
             <div className="flex min-w-0 flex-col">
                <span className="break-words text-[15px] font-bold text-[#1a1a1a] sm:text-[17px]">{largestAsset.name}: {formatCurrency(largestAssetVal)}</span>
             </div>
             <div className="flex flex-col text-right">
                <span className="text-[15px] font-bold text-[#1a1a1a] sm:text-[17px]">Assets: {formatCurrency(totalAssets)}</span>
             </div>
          </div>
          <div className="h-20 w-full flex rounded-sm overflow-hidden border border-gray-100">
             <div 
               className="bg-[#3b82f6] transition-all duration-1000 flex items-center justify-center" 
               style={{ width: `${Math.max(2, largestAssetPct)}%` }}
             >
             </div>
             <div 
               className="bg-[#f59e0b] transition-all duration-1000 flex items-center justify-center flex-1"
             >
             </div>
          </div>
          <div className="mt-8 flex justify-center">
             <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
             </div>
          </div>
        </div>
      )}

      {/* Allocation Donut Charts Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
          {/* Investable Assets */}
          <div className="min-w-0 bg-white border border-[#e5e7eb] rounded-[4px] p-6 shadow-sm h-[360px] flex flex-col lg:h-[400px] lg:p-8">
             <div className="flex justify-between items-center mb-4 text-[#1a1a1a]">
                <h3 className="text-[17px] font-bold">Investable Assets</h3>
                <span className="text-gray-400">⋮</span>
             </div>
             <div className="flex-1 relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                   <span className="break-words text-[24px] font-bold sm:text-[28px]">{formatCurrency(investableAssets)}</span>
                   <span className="text-[12px] text-gray-400 uppercase font-bold tracking-wider">{(totalAssets > 0 ? (investableAssets/totalAssets*100).toFixed(0) : 0)}% OF ASSETS</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={investableVsNetWorthData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={0}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      <Cell fill="#4c1d95" />
                      <Cell fill="#f3f4f6" />
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
             </div>
             <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-[14px]">Investments</span>
                  <span className="text-[14px] font-bold">100% • {formatCurrency(investableAssets)}</span>
                </div>
             </div>
          </div>

          {/* Investable Assets ex Cash */}
          <div className="min-w-0 bg-white border border-[#e5e7eb] rounded-[4px] p-6 shadow-sm h-[360px] flex flex-col lg:h-[400px] lg:p-8">
             <div className="flex justify-between items-center mb-4 text-[#1a1a1a]">
                <h3 className="text-[17px] font-bold">Investable Assets ex Cash</h3>
                <span className="text-gray-400">⋮</span>
             </div>
             <div className="flex-1 relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                   <span className="break-words text-[24px] font-bold sm:text-[28px]">{formatCurrency(investableAssets)}</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={investableExCashData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {investableExCashData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
             </div>
             <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-[14px]">Investments</span>
                  <span className="text-[14px] font-bold">100% • {formatCurrency(investableAssets)}</span>
                </div>
             </div>
          </div>

          {/* Assets x Sheets */}
          <div className="min-w-0 bg-white border border-[#e5e7eb] rounded-[4px] p-6 shadow-sm h-[360px] flex flex-col lg:h-[400px] lg:p-8">
             <div className="flex justify-between items-center mb-4 text-[#1a1a1a]">
                <h3 className="text-[17px] font-bold">Assets x Sheets</h3>
                <span className="text-gray-400">⋮</span>
             </div>
             <div className="flex-1 relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                   <span className="break-words text-[24px] font-bold sm:text-[28px]">{formatCurrency(totalAssets)}</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={assetsXSheetsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {assetsXSheetsData.map((_entry, index) => (
                        <Cell key={`cell-sheet-${index}`} fill={index === 0 ? "#4c1d95" : index === 1 ? "#a855f7" : "#d8b4fe"} />
                      ))}
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
             </div>
             <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-[14px]">Investments</span>
                  <span className="text-[14px] font-bold">100% • {formatCurrency(totalAssets)}</span>
                </div>
             </div>
          </div>
      </div>
    </>
  )
}
