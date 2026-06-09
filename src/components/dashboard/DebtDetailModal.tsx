'use client'

import { useState, useRef, useTransition } from 'react'
import { X, Upload, MoreVertical } from 'lucide-react'
import { updateAsset } from '@/app/dashboard/actions'

type Debt = {
  id: string
  name: string
  asset_type: string
  value: number
  currency: string
  metadata: unknown
  sheet?: string | null
  section?: string | null
}

type TabKey = 'DEBT' | 'BALANCE' | 'OWNERSHIP' | 'NOTES' | 'DOCUMENTS'

type BalanceRow = { id: string; date: string; balance: string }

export function DebtDetailModal({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const [tab, setTab] = useState<TabKey>('DEBT')
  const [name, setName] = useState(debt.name)
  const [editingName, setEditingName] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const [, startTransition] = useTransition()

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const [balanceRows, setBalanceRows] = useState<BalanceRow[]>([
    { id: 'today', date: today, balance: String(debt.value ?? 0) },
  ])
  const [menuRowId, setMenuRowId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  const [interestRate, setInterestRate] = useState(7)
  const [reduceAmount, setReduceAmount] = useState(100)
  const [cruiseA, setCruiseA] = useState(false)
  const [cruiseB, setCruiseB] = useState(false)

  const totalBalance = balanceRows.reduce((s, r) => s + (parseFloat(r.balance) || 0), 0)

  const tabs: TabKey[] = ['DEBT', 'BALANCE', 'OWNERSHIP', 'NOTES', 'DOCUMENTS']

  const commitName = () => {
    setEditingName(false)
    if (name.trim() && name !== debt.name) {
      startTransition(() => { updateAsset(debt.id, { name: name.trim() }) })
    }
  }

  const updateBalance = (id: string, val: string) => {
    setBalanceRows(rows => rows.map(r => r.id === id ? { ...r, balance: val } : r))
  }
  const commitBalance = () => {
    startTransition(() => { updateAsset(debt.id, { value: totalBalance }) })
  }
  const addBalanceRow = () => {
    setBalanceRows(rows => [...rows, { id: crypto.randomUUID(), date: today, balance: '0' }])
  }
  const deleteBalanceRow = (id: string) => {
    setBalanceRows(rows => rows.filter(r => r.id !== id))
    setMenuRowId(null)
  }
  const copyValueAbove = (id: string) => {
    const idx = balanceRows.findIndex(r => r.id === id)
    if (idx > 0) {
      const above = balanceRows[idx - 1].balance
      setBalanceRows(rows => rows.map(r => r.id === id ? { ...r, balance: above } : r))
    }
    setMenuRowId(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[580px] shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-8 pt-7 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-6">
              {editingName ? (
                <input
                  ref={nameRef}
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitName()
                    if (e.key === 'Escape') { setName(debt.name); setEditingName(false) }
                  }}
                  className="text-[15px] font-bold text-[#1a1a1a] border-b border-gray-400 focus:outline-none bg-transparent w-full"
                />
              ) : (
                <h2
                  className="text-[15px] font-bold text-[#1a1a1a] cursor-text hover:text-gray-700"
                  onClick={() => setEditingName(true)}
                >
                  {name}
                </h2>
              )}
              <div className="text-[28px] font-bold text-[#1a1a1a] leading-none mt-1.5">
                €{Math.round(totalBalance).toLocaleString('de-DE')}
              </div>
              <div className="text-[12px] text-gray-400 mt-0.5">Enter a debt lender</div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 mt-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-end border-b border-gray-200 mt-6 gap-6 overflow-x-auto no-scrollbar">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap transition-opacity ${
                  tab === t
                    ? 'text-[#1a1a1a] border-b-2 border-[#1a1a1a]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="px-8 py-6" style={{ minHeight: 260 }}>
          {tab === 'DEBT' && (
            <div className="text-[13px] text-gray-600 space-y-5 leading-relaxed">
              <p className="text-[13px] text-gray-500">There are 2 ways to use this generic debt.</p>
              <div>
                <p className="font-bold text-[#1a1a1a] mb-1">1. Enter and update the balance manually</p>
                <p className="text-gray-500">Start by entering the debt&apos;s current balance.</p>
                <p className="text-gray-500">Update it manually over time, just like you would in a spreadsheet.</p>
              </div>
              <div>
                <p className="font-bold text-[#1a1a1a] mb-1">2. Cruise Control</p>
                <p className="text-gray-500">Start by entering the debt&apos;s current balance.</p>
                <p className="text-gray-500">Set it to update automatically over time based on this rule.</p>
              </div>
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between border border-gray-200 px-4 py-3">
                  <span className="text-[12px] text-gray-500">
                    Apply interest rate{' '}
                    <input
                      type="number"
                      value={interestRate}
                      onChange={e => setInterestRate(Number(e.target.value))}
                      className="w-10 text-blue-500 underline decoration-dotted bg-transparent focus:outline-none"
                    />
                    <span className="text-blue-500 underline decoration-dotted">% per year</span>
                    . Updated <span className="text-blue-500 underline decoration-dotted cursor-pointer">every month on day 1</span>
                  </span>
                  <Toggle on={cruiseA} onClick={() => setCruiseA(v => !v)} />
                </div>
                <div className="flex items-center justify-between border border-gray-200 px-4 py-3">
                  <span className="text-[12px] text-gray-500">
                    <span className="text-blue-500 underline decoration-dotted cursor-pointer">Reduce</span> the balance by{' '}
                    <span className="text-blue-500 underline decoration-dotted cursor-pointer">EUR </span>
                    <input
                      type="number"
                      value={reduceAmount}
                      onChange={e => setReduceAmount(Number(e.target.value))}
                      className="w-16 text-blue-500 underline decoration-dotted bg-transparent focus:outline-none"
                    />
                    . Updated <span className="text-blue-500 underline decoration-dotted cursor-pointer">every month on day 1</span>
                  </span>
                  <Toggle on={cruiseB} onClick={() => setCruiseB(v => !v)} />
                </div>
              </div>
            </div>
          )}

          {tab === 'BALANCE' && (
            <div>
              <div className="grid grid-cols-[1fr_160px_32px] border-b border-gray-200 pb-2 mb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Balance</span>
                <div />
              </div>
              {balanceRows.map((row, idx) => (
                <div key={row.id} className="grid grid-cols-[1fr_160px_32px] border-b border-gray-100 items-center group">
                  <div className="py-3 text-[13px] text-[#1a1a1a]">{row.date}</div>
                  <div className="py-3 text-right">
                    <input
                      type="number"
                      value={row.balance}
                      onChange={e => updateBalance(row.id, e.target.value)}
                      onBlur={commitBalance}
                      className="w-full text-right text-[13px] text-[#1a1a1a] focus:outline-none border border-transparent focus:border-gray-300 px-1 bg-transparent"
                    />
                  </div>
                  <div className="flex justify-center relative">
                    <button
                      onClick={() => setMenuRowId(menuRowId === row.id ? null : row.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 p-1"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    {menuRowId === row.id && (
                      <div className="absolute right-0 top-6 bg-white border border-gray-200 shadow-xl py-1 w-52 z-20">
                        <button onClick={addBalanceRow} className="w-full text-left px-4 py-2 hover:bg-gray-50">
                          <div className="text-[12px] text-[#1a1a1a]">Insert New Row</div>
                          <div className="text-[10px] text-gray-400">Cmd+Shift+Enter</div>
                        </button>
                        {idx > 0 && (
                          <button onClick={() => copyValueAbove(row.id)} className="w-full text-left px-4 py-2 text-[12px] hover:bg-gray-50">Copy Value to Rows Above</button>
                        )}
                        <button onClick={() => deleteBalanceRow(row.id)} className="w-full text-left px-4 py-2 text-[12px] text-red-500 hover:bg-red-50">Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={addBalanceRow}
                className="mt-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest hover:text-[#1a1a1a]"
              >
                + ADD HISTORY
              </button>
            </div>
          )}

          {tab === 'NOTES' && (
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes about this debt..."
              className="w-full h-40 text-[13px] text-[#1a1a1a] border border-gray-200 p-3 focus:outline-none focus:border-gray-400 resize-none bg-white"
            />
          )}

          {tab === 'OWNERSHIP' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Owner</label>
                <input type="text" placeholder="Owner name" className="w-full border border-gray-300 px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Ownership %</label>
                <input type="number" defaultValue={100} min={0} max={100} className="w-full border border-gray-300 px-3 py-2 text-[13px] focus:outline-none focus:border-black" />
              </div>
            </div>
          )}

          {tab === 'DOCUMENTS' && (
            <div className="text-center py-8">
              <p className="text-[13px] text-gray-500 mb-1">Store important documents.</p>
              <p className="text-[13px] text-gray-500 mb-1">E.g. Loan Document, Account Statements etc.</p>
              <p className="text-[11px] text-gray-400 mt-3 mb-6">Personal information regarding minors should not be added here.</p>
              <button className="bg-[#1a1a1a] text-white text-[12px] font-semibold px-6 py-2.5 flex items-center gap-2 mx-auto hover:bg-black">
                <Upload className="w-4 h-4" /> Upload
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors flex-shrink-0 ${
        on ? 'bg-blue-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  )
}
