'use client'

import { useState, useTransition, useRef } from 'react'
import { addAsset, deleteAsset } from '@/app/dashboard/actions'
import { MoreHorizontal, GripVertical } from 'lucide-react'

type Asset = {
  id: string
  name: string
  asset_type: string
  value: number
  currency: string
  metadata: any
  sheet?: string
  section?: string
}

type TabConfig = {
  id: string
  label: string
}

type Props = {
  assets: Asset[]
  baseCurrency: string
  tabs: TabConfig[]
}

export function AssetSpreadsheet({ assets, baseCurrency, tabs }: Props) {
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  // Filter assets for the current tab (sheet)
  const visibleAssets = assets.filter(a => (a.sheet || 'Others') === activeTabId)
  const tabSubtotal = visibleAssets.reduce((sum, a) => sum + Number(a.value), 0)

  // Group visible assets by section
  const sections: Record<string, Asset[]> = {}
  visibleAssets.forEach(asset => {
    const sectionName = asset.section || 'General'
    if (!sections[sectionName]) sections[sectionName] = []
    sections[sectionName].push(asset)
  })

  const formatCurrency = (val: number, curr: string) => {
    const symbol = curr === 'EUR' ? '€' : '$'
    return `${symbol}${val.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`
  }

  const handleDelete = (id: string) => {
    startTransition(() => {
      deleteAsset(id)
    })
  }

  return (
    <div className="w-full">
      {/* Tabs Header - Production style: small bold labels with subtotal below */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto no-scrollbar">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId
          const tabAssets = assets.filter(a => (a.sheet || 'Others') === tab.id)
          const tabTotal = tabAssets.reduce((sum, a) => sum + Number(a.value), 0)
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`pb-4 px-1 mr-10 flex flex-col text-left transition-colors relative flex-shrink-0 ${isActive ? 'text-black opacity-100' : 'text-[#1a1a1a] opacity-40 hover:opacity-70'}`}
            >
              <span className="font-bold text-[14px] mb-1">{tab.label}</span>
              <span className="text-[12px] font-medium">
                {formatCurrency(tabTotal, baseCurrency).replace(/\s/g, '')}
              </span>
              {isActive && (
                 <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-black"></div>
              )}
            </button>
          )
        })}
        <button className="pb-4 px-1 text-[#1a1a1a] opacity-40 hover:opacity-70 flex items-center">
           <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Spreadsheet Tables (one per section) */}
      <div className="flex flex-col space-y-8">
        {Object.entries(sections).map(([sectionName, sectionAssets]) => (
          <div key={sectionName} className="bg-white border border-[#e5e7eb] rounded-[2px] shadow-sm overflow-hidden">
            {/* Section Header */}
            <div className="grid grid-cols-[30px_1fr_150px_40px_40px] text-[10px] font-bold text-gray-400 tracking-[0.15em] uppercase border-b border-[#f1f2f2] bg-white">
               <div className="py-2.5 px-3"></div>
               <div className="py-2.5 px-4 border-r border-[#f1f2f2]">ASSET</div>
               <div className="py-2.5 px-4 border-r border-[#f1f2f2] text-right">VALUE</div>
               <div className="py-2.5 px-2"></div>
               <div className="py-2.5 px-2"></div>
            </div>

            {/* Rows */}
            <div className="flex flex-col">
              {sectionAssets.map(asset => (
                <div key={asset.id} className="grid grid-cols-[30px_1fr_150px_40px_40px] border-b border-[#f1f2f2] items-center hover:bg-[#f8f9f9] group transition-colors">
                  <div className="py-2 px-3 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab flex justify-center">
                     <GripVertical className="w-3.5 h-3.5" />
                  </div>
                  <div className="py-3.5 px-4 border-r border-[#f1f2f2] text-[16px] text-[#1a1a1a] font-medium truncate">
                    {asset.name}
                  </div>
                  <div className="py-3.5 px-4 border-r border-[#f1f2f2] text-[16px] text-[#1a1a1a] font-medium text-right">
                    {formatCurrency(asset.value, asset.currency).replace(/\s/g, '')}
                  </div>
                  <div className="py-2 px-2 flex justify-center">
                     <button className="text-gray-300 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity" title="Edit">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                     </button>
                  </div>
                  <div className="py-2 px-2 flex justify-center relative group/options">
                     <button className="p-1 text-gray-300 hover:text-black opacity-0 group-hover:opacity-100 transition-all" title="Delete">
                       <MoreHorizontal className="w-5 h-5" />
                     </button>
                     <div className="absolute right-10 top-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-xl rounded-md py-1.5 w-32 hidden group-hover/options:block z-20">
                        <button 
                          onClick={() => handleDelete(asset.id)}
                          className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50"
                        >
                          Delete Asset
                        </button>
                     </div>
                  </div>
                </div>
              ))}

              {/* + ADD ASSET Row (Dark Footer Style) */}
              <form 
                ref={formRef}
                action={(formData) => {
                  startTransition(() => {
                    addAsset(null, formData)
                    formRef.current?.reset()
                  })
                }} 
                className="grid grid-cols-[30px_1fr_150px_40px_40px] items-center bg-[#595959] text-white/90 hover:bg-[#4d4d4d] transition-colors group cursor-pointer"
                onClick={() => {
                  // If we wanted to trigger the modal here we could, but let's keep the inline simple add
                }}
              >
                <div className="py-3 px-3 flex justify-center">
                   <span className="text-xl font-light leading-none">+</span>
                </div>
                
                <input type="hidden" name="sheet" value={activeTabId} />
                <input type="hidden" name="section" value={sectionName} />
                <input type="hidden" name="currency" value={baseCurrency} />
                <input type="hidden" name="asset_type" value={sectionAssets[0]?.asset_type || 'other'} />

                <div className="flex-1">
                  <input 
                    name="name" 
                    type="text" 
                    autoComplete="off"
                    placeholder={`ADD ${activeTabId === 'Debts' ? 'DEBT' : 'ASSET'}`} 
                    className="w-full py-3.5 px-4 text-[11px] font-bold tracking-[0.15em] uppercase bg-transparent border-none outline-none placeholder:text-white/60 focus:bg-white/10 transition-colors"
                    required
                  />
                </div>

                <div className="text-right">
                  <input 
                    name="value" 
                    type="number" 
                    autoComplete="off"
                    placeholder="VALUE" 
                    className="w-full py-3.5 px-4 text-[13px] font-bold text-right bg-transparent border-none outline-none placeholder:text-white/60 focus:bg-white/10 transition-colors"
                  />
                </div>

                <div className="py-2 px-2"></div>
                <div className="py-2 px-2 text-right pr-4 opacity-70">
                   <button type="submit" className="hidden"></button>
                </div>
              </form>
            </div>
          </div>
        ))}
      </div>
      
      <button className="text-[11px] text-gray-400 font-bold tracking-[0.1em] hover:text-[#1a1a1a] mt-6 transition-colors uppercase">
        + NEW SECTION
      </button>

    </div>
  )
}
