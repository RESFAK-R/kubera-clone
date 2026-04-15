'use client'

import { useState, useEffect } from 'react'
import { 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip
} from 'recharts'

type Props = {
  assetClassData: any[]
  sheetData: any[]
  baseCurrency: string
}

export function RecapCharts({ assetClassData, sheetData, baseCurrency }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) return <div className="min-h-[400px] w-full bg-gray-50 animate-pulse rounded-lg" />

  const formatCurrency = (val: number) => {
    const symbol = baseCurrency === 'EUR' ? '€' : '$'
    return `${symbol}${val.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`
  }

  const COLORS = ['#4f46e5', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b', '#10b981']

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
      {/* Asset Classes Donut */}
      <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-8 shadow-sm h-[400px] flex flex-col">
        <h3 className="text-[17px] font-bold text-[#1a1a1a] mb-6">Asset Classes</h3>
        <div className="flex-1 relative">
           <ResponsiveContainer width="100%" height="100%">
             <RePieChart>
               <Pie
                 data={assetClassData}
                 cx="50%"
                 cy="50%"
                 innerRadius={70}
                 outerRadius={100}
                 paddingAngle={2}
                 dataKey="value"
               >
                 {assetClassData.map((_entry, index) => (
                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                 ))}
               </Pie>
               <Tooltip formatter={(value: number) => formatCurrency(value)} />
             </RePieChart>
           </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
           {assetClassData.map((item, index) => (
             <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className="text-[12px] font-medium text-[#1a1a1a] truncate">{item.name}</span>
                <span className="text-[12px] text-gray-400 ml-auto">{item.pct}%</span>
             </div>
           ))}
        </div>
      </div>

      {/* Sheets Breakdown Donut */}
      <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-8 shadow-sm h-[400px] flex flex-col">
        <h3 className="text-[17px] font-bold text-[#1a1a1a] mb-6">Sheets & Sections</h3>
        <div className="flex-1 relative">
           <ResponsiveContainer width="100%" height="100%">
             <RePieChart>
               <Pie
                 data={sheetData}
                 cx="50%"
                 cy="50%"
                 innerRadius={70}
                 outerRadius={100}
                 paddingAngle={2}
                 dataKey="value"
               >
                 {sheetData.map((_entry, index) => (
                   <Cell key={`cell-sheet-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                 ))}
               </Pie>
               <Tooltip formatter={(value: number) => formatCurrency(value)} />
             </RePieChart>
           </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
           {sheetData.map((item, index) => (
             <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }}></div>
                <span className="text-[12px] font-medium text-[#1a1a1a] truncate">{item.name}</span>
                <span className="text-[12px] text-gray-400 ml-auto">{item.pct}%</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  )
}
