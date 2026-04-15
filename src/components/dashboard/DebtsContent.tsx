'use client'

import { useState, useTransition } from 'react'
import { MoreHorizontal, AlignJustify, CreditCard, FileText, X } from 'lucide-react'
import { deleteAsset } from '@/app/dashboard/actions'
import { AddAssetDialog } from '@/components/dashboard/AddAssetDialog'

type Asset = {
  id: string
  name: string
  asset_type: string
  value: number
  currency: string
  metadata: unknown
  sheet?: string
  section?: string
}

type Props = {
  debts: Asset[]
  baseCurrency: string
  totalDebts: number
}

function fmt(val: number, sym: string) {
  return `${sym}${Math.round(val).toLocaleString('de-DE')}`
}

// Modal that shows the "add debt" action tiles
function AddDebtModal({ onClose, activeSheet }: { onClose: () => void; activeSheet: string }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[520px] relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pb-6">
          <h2 className="text-[22px] font-bold text-[#1a1a1a] mb-1">Add Debt</h2>
          <p className="text-[13px] text-gray-500 mb-8">Choose debt type to add</p>

          <div className="grid grid-cols-2 gap-0">
            <AddAssetDialog
              defaultAssetType="liability"
              flowType="debt_manual"
              targetSheet={activeSheet}
              onOpenChange={open => { if (!open) onClose() }}
              trigger={
                <button className="flex flex-col justify-between h-[140px] w-full p-4 text-left border border-gray-200 bg-[#e8ebeb] hover:bg-[#dcdede] transition-colors">
                  <div className="font-bold text-[11px] tracking-widest text-[#1a1a1a] uppercase leading-tight">
                    LOANS &<br />MORTGAGE<br />ACCOUNTS
                  </div>
                  <FileText strokeWidth={1.5} className="w-8 h-8 text-[#1a1a1a]" />
                </button>
              }
            />
            <AddAssetDialog
              defaultAssetType="liability"
              flowType="debt_manual"
              targetSheet={activeSheet}
              onOpenChange={open => { if (!open) onClose() }}
              trigger={
                <button className="flex flex-col justify-between h-[140px] w-full p-4 text-left border border-gray-200 bg-[#e8ebeb] hover:bg-[#dcdede] transition-colors">
                  <div className="font-bold text-[11px] tracking-widest text-[#1a1a1a] uppercase">
                    CREDIT<br />CARDS
                  </div>
                  <CreditCard strokeWidth={1.5} className="w-8 h-8 text-[#1a1a1a]" />
                </button>
              }
            />
          </div>

          <div className="mt-0 border border-gray-200 bg-[#e8ebeb] p-4 flex justify-between items-start">
            <div>
              <p className="text-[11px] text-gray-500 leading-relaxed max-w-[300px]">
                For loan, mortgage and credit card accounts that didn't connect and all other debts, add them as manual debt entries
              </p>
              <AddAssetDialog
                defaultAssetType="liability"
                flowType="debt_manual"
                targetSheet={activeSheet}
                onOpenChange={open => { if (!open) onClose() }}
                trigger={
                  <button className="mt-3 font-bold text-[11px] tracking-widest text-[#1a1a1a] uppercase hover:underline">
                    ENTER DEBT BALANCE MANUALLY
                  </button>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DebtsContent({ debts, baseCurrency, totalDebts }: Props) {
  const sym = baseCurrency === 'EUR' ? '€' : '$'
  const [, startTransition] = useTransition()
  const [addDebtOpen, setAddDebtOpen] = useState(false)
  const [newSectionOpen, setNewSectionOpen] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Build tabs from unique sheets; default to Credit Cards if empty
  const sheetNames = Array.from(new Set(debts.map(d => d.sheet || 'Credit Cards')))
  if (sheetNames.length === 0) sheetNames.push('Credit Cards')

  const [activeSheet, setActiveSheet] = useState(sheetNames[0])
  const [newSectionName, setNewSectionName] = useState('')

  const visibleDebts = debts.filter(d => (d.sheet || 'Credit Cards') === activeSheet)

  const tabTotal = (sheet: string) =>
    debts.filter(d => (d.sheet || 'Credit Cards') === sheet).reduce((s, d) => s + Number(d.value), 0)

  const handleDelete = (id: string) => {
    setOpenMenuId(null)
    startTransition(() => { deleteAsset(id) })
  }

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex items-end border-b border-gray-200 mb-0 overflow-x-auto no-scrollbar">
        {sheetNames.map(sheet => {
          const isActive = sheet === activeSheet
          const total = tabTotal(sheet)
          return (
            <button
              key={sheet}
              onClick={() => setActiveSheet(sheet)}
              className={`pb-4 px-1 mr-8 flex flex-col text-left relative flex-shrink-0 transition-opacity ${
                isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'
              }`}
            >
              <span className={`text-[14px] font-bold ${isActive ? 'text-[#1a1a1a]' : 'text-[#1a1a1a]'}`}>
                {sheet}
              </span>
              <span className="text-[12px] text-gray-500">
                {total > 0 ? fmt(total, sym) : `${sym}XXXX`}
              </span>
              {isActive && (
                <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-black" />
              )}
            </button>
          )
        })}
        <button className="pb-4 px-1 opacity-40 hover:opacity-70 ml-1">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e7eb] mt-6">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_200px_40px_40px] border-b border-[#e5e7eb]">
          <div className="py-3 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
            Debt
          </div>
          <div className="py-3 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] text-right">
            Balance
          </div>
          <div />
          <div />
        </div>

        {/* Rows */}
        {visibleDebts.length === 0 && (
          <>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="grid grid-cols-[1fr_200px_40px_40px] border-b border-[#f1f2f2] items-center"
              >
                <div className="py-4 px-5 text-[15px] text-gray-300">Debt</div>
                <div className="py-4 px-5 text-[15px] text-gray-300 text-right">Balance</div>
                <div />
                <div />
              </div>
            ))}
          </>
        )}

        {visibleDebts.map(debt => (
          <div
            key={debt.id}
            className="grid grid-cols-[1fr_200px_40px_40px] border-b border-[#f1f2f2] items-center hover:bg-[#f8f9f9] group transition-colors"
          >
            <div className="py-4 px-5 text-[15px] text-[#1a1a1a] font-medium">
              {debt.name}
            </div>
            <div className="py-4 px-5 text-[15px] text-[#1a1a1a] font-medium text-right">
              {fmt(debt.value, sym)}
            </div>
            <div className="flex justify-center">
              <button className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <AlignJustify className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-center relative">
              <button
                onClick={() => setOpenMenuId(openMenuId === debt.id ? null : debt.id)}
                className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {openMenuId === debt.id && (
                <div className="absolute right-6 top-0 bg-white border border-gray-200 shadow-xl rounded-md py-1.5 w-36 z-20">
                  <button
                    onClick={() => handleDelete(debt.id)}
                    className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-50"
                  >
                    Delete Debt
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* + ADD DEBT button */}
        <button
          onClick={() => setAddDebtOpen(true)}
          className="w-full flex items-center gap-3 bg-[#595959] hover:bg-[#4d4d4d] text-white transition-colors py-3.5 px-5"
        >
          <span className="text-xl font-light leading-none">+</span>
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase">Add Debt</span>
        </button>
      </div>

      {/* + NEW SECTION */}
      {!newSectionOpen ? (
        <button
          onClick={() => setNewSectionOpen(true)}
          className="mt-5 text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em] hover:text-[#1a1a1a] transition-colors"
        >
          + New Section
        </button>
      ) : (
        <div className="mt-5 flex items-center gap-3">
          <input
            autoFocus
            type="text"
            value={newSectionName}
            onChange={e => setNewSectionName(e.target.value)}
            placeholder="Section name"
            className="text-[13px] border-b border-gray-400 focus:outline-none focus:border-black bg-transparent py-1 w-48"
            onKeyDown={e => {
              if (e.key === 'Enter' && newSectionName.trim()) {
                setNewSectionOpen(false)
                setNewSectionName('')
              }
              if (e.key === 'Escape') {
                setNewSectionOpen(false)
                setNewSectionName('')
              }
            }}
          />
          <button
            onClick={() => { setNewSectionOpen(false); setNewSectionName('') }}
            className="text-gray-400 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add Debt Modal */}
      {addDebtOpen && (
        <AddDebtModal onClose={() => setAddDebtOpen(false)} activeSheet={activeSheet} />
      )}
    </div>
  )
}
