'use client'

import { useState, useTransition, useRef } from 'react'
import { MoreHorizontal, AlignJustify, X, Upload, MoreVertical } from 'lucide-react'
import { deleteAsset, addAsset, updateAsset, renameSheet, deleteSheet } from '@/app/dashboard/actions'
import { DebtDetailModal } from '@/components/dashboard/DebtDetailModal'

type Asset = {
  id: string
  name: string
  asset_type: string
  value: number
  currency: string
  metadata: unknown
  sheet?: string | null
  section?: string | null
}

type Props = {
  debts: Asset[]
  baseCurrency: string
  totalDebts: number
}

function fmt(val: number, sym: string) {
  return `${sym}${Math.round(val).toLocaleString('de-DE')}`
}

type DebtTab = 'DEBT' | 'BALANCE' | 'OWNERSHIP' | 'NOTES' | 'DOCUMENTS'

type BalanceRow = { id: string; date: string; balance: string }

function AddDebtModal({ onClose, activeSheet }: { onClose: () => void; activeSheet: string }) {
  const [tab, setTab] = useState<DebtTab>('DEBT')
  const [debtName, setDebtName] = useState('Untitled Debt')
  const [editingName, setEditingName] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [menuRowId, setMenuRowId] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const [balanceRows, setBalanceRows] = useState<BalanceRow[]>([
    { id: 'today', date: today, balance: '0' },
  ])

  const totalBalance = balanceRows.reduce((s, r) => s + (parseFloat(r.balance) || 0), 0)

  const updateBalance = (id: string, val: string) => {
    setBalanceRows(rows => rows.map(r => r.id === id ? { ...r, balance: val } : r))
  }

  const addBalanceRow = () => {
    setBalanceRows(rows => [
      ...rows,
      { id: crypto.randomUUID(), date: today, balance: '0' },
    ])
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

  const handleSave = async () => {
    setSaving(true)
    const fd = new FormData()
    fd.set('name', debtName || 'Untitled Debt')
    fd.set('asset_type', 'liability')
    fd.set('value', String(totalBalance))
    fd.set('currency', 'EUR')
    fd.set('sheet', activeSheet)
    fd.set('section', 'Debts')
    fd.set('notes', note)
    await addAsset(null, fd)
    setSaving(false)
    onClose()
  }

  const tabs: DebtTab[] = ['DEBT', 'BALANCE', 'OWNERSHIP', 'NOTES', 'DOCUMENTS']

  const [interestRate, setInterestRate] = useState(7)
  const [reduceAmount, setReduceAmount] = useState(1000)
  const [cruiseA, setCruiseA] = useState(false)
  const [cruiseB, setCruiseB] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[580px] relative shadow-2xl"
        style={{ minHeight: 420 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-7 pb-0">
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1 pr-6">
              {editingName ? (
                <input
                  ref={nameInputRef}
                  autoFocus
                  value={debtName}
                  onChange={e => setDebtName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingName(false) }}
                  className="text-[22px] font-bold text-[#1a1a1a] border-b border-gray-400 focus:outline-none bg-transparent w-full"
                />
              ) : (
                <h2
                  className="text-[22px] font-bold text-[#1a1a1a] cursor-text hover:text-gray-700"
                  onClick={() => setEditingName(true)}
                >
                  {debtName}
                </h2>
              )}
              <div className="text-[32px] font-bold text-[#1a1a1a] leading-none mt-1">
                €{Math.round(totalBalance).toLocaleString('de-DE')}
              </div>
              <div className="text-[12px] text-gray-400 mt-0.5">Enter a debt lender</div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 mt-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-end border-b border-gray-200 mt-5 gap-6">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-[11px] font-bold tracking-widest uppercase transition-opacity ${
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

        {/* Tab body */}
        <div className="px-8 py-6" style={{ minHeight: 240 }}>
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
                  <DebtToggle on={cruiseA} onClick={() => setCruiseA(v => !v)} />
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
                  <DebtToggle on={cruiseB} onClick={() => setCruiseB(v => !v)} />
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
                        <button
                          onClick={addBalanceRow}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50"
                        >
                          <div className="text-[12px] text-[#1a1a1a]">Insert New Row</div>
                          <div className="text-[10px] text-gray-400">Cmd+Shift+Enter</div>
                        </button>
                        {idx > 0 && (
                          <button
                            onClick={() => copyValueAbove(row.id)}
                            className="w-full text-left px-4 py-2 text-[12px] text-[#1a1a1a] hover:bg-gray-50"
                          >
                            Copy Value to Rows Above
                          </button>
                        )}
                        <button
                          onClick={() => deleteBalanceRow(row.id)}
                          className="w-full text-left px-4 py-2 text-[12px] text-red-500 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={addBalanceRow}
                className="mt-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest hover:text-[#1a1a1a] transition-colors"
              >
                + ADD HISTORY
              </button>
            </div>
          )}

          {tab === 'NOTES' && (
            <div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add notes about this debt..."
                className="w-full h-40 text-[13px] text-[#1a1a1a] border border-gray-200 p-3 focus:outline-none focus:border-gray-400 resize-none bg-white"
              />
            </div>
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
              <button className="bg-[#1a1a1a] text-white text-[12px] font-semibold px-6 py-2.5 flex items-center gap-2 mx-auto hover:bg-black transition-colors">
                <Upload className="w-4 h-4" />
                Upload
              </button>
              <p className="text-[11px] text-gray-400 mt-4 underline cursor-pointer">Learn how to use documents here</p>
            </div>
          )}
        </div>

        {/* Footer save button */}
        <div className="px-8 pb-7 flex justify-start">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#1a1a1a] text-white text-[12px] font-bold tracking-widest uppercase px-8 py-2.5 hover:bg-black disabled:bg-gray-400 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Debt'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DebtToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
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

export function DebtsContent({ debts, baseCurrency }: Props) {
  const sym = baseCurrency === 'EUR' ? '€' : '$'
  const [, startTransition] = useTransition()
  const [addDebtOpen, setAddDebtOpen] = useState(false)
  const [newSectionOpen, setNewSectionOpen] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [detailDebt, setDetailDebt] = useState<Asset | null>(null)

  // Inline edit state
  const [editingField, setEditingField] = useState<{ id: string; field: 'name' | 'value' } | null>(null)
  const [editValue, setEditValue] = useState('')

  // Tab menu state
  const initialSheets = Array.from(new Set(debts.map(d => d.sheet || 'Credit Cards')))
  if (initialSheets.length === 0) initialSheets.push('Credit Cards')
  const [sheetList, setSheetList] = useState(initialSheets)
  const [activeSheet, setActiveSheet] = useState(initialSheets[0])
  const [openTabMenu, setOpenTabMenu] = useState<string | null>(null)
  const [renamingTab, setRenamingTab] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [addingTab, setAddingTab] = useState(false)
  const [newTabValue, setNewTabValue] = useState('')
  const [newSectionName, setNewSectionName] = useState('')

  const visibleDebts = debts.filter(d => (d.sheet || 'Credit Cards') === activeSheet)

  const tabTotal = (sheet: string) =>
    debts.filter(d => (d.sheet || 'Credit Cards') === sheet).reduce((s, d) => s + Number(d.value), 0)

  const handleDelete = (id: string) => {
    setOpenMenuId(null)
    startTransition(() => { deleteAsset(id) })
  }

  const startEdit = (debt: Asset, field: 'name' | 'value') => {
    setEditValue(field === 'name' ? debt.name : String(debt.value))
    setEditingField({ id: debt.id, field })
  }

  const commitEdit = (debt: Asset) => {
    if (!editingField) return
    const field = editingField.field
    if (field === 'name' && editValue.trim() && editValue !== debt.name) {
      startTransition(() => { updateAsset(debt.id, { name: editValue.trim() }) })
    } else if (field === 'value') {
      const v = parseFloat(editValue)
      if (!isNaN(v) && v !== debt.value) {
        startTransition(() => { updateAsset(debt.id, { value: v }) })
      }
    }
    setEditingField(null)
  }

  const handleRenameTab = (oldName: string) => {
    setOpenTabMenu(null)
    if (renameValue.trim() && renameValue !== oldName) {
      const newName = renameValue.trim()
      setSheetList(list => list.map(s => s === oldName ? newName : s))
      if (activeSheet === oldName) setActiveSheet(newName)
      startTransition(() => { renameSheet(oldName, newName) })
    }
    setRenamingTab(null)
    setRenameValue('')
  }

  const handleDeleteTab = (name: string) => {
    setOpenTabMenu(null)
    const remaining = sheetList.filter(s => s !== name)
    setSheetList(remaining)
    if (activeSheet === name && remaining.length > 0) setActiveSheet(remaining[0])
    startTransition(() => { deleteSheet(name) })
  }

  const handleAddTab = () => {
    if (!newTabValue.trim()) { setAddingTab(false); return }
    const name = newTabValue.trim()
    if (!sheetList.includes(name)) {
      setSheetList(list => [...list, name])
      setActiveSheet(name)
    }
    setAddingTab(false)
    setNewTabValue('')
  }

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex items-end border-b border-gray-200 mb-0 overflow-x-auto no-scrollbar">
        {sheetList.map(sheet => {
          const isActive = sheet === activeSheet
          const total = tabTotal(sheet)
          const isRenaming = renamingTab === sheet
          return (
            <div key={sheet} className="relative mr-8 flex-shrink-0">
              <button
                onClick={() => !isRenaming && setActiveSheet(sheet)}
                className={`pb-4 px-1 flex flex-col text-left relative transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                }`}
              >
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameTab(sheet)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameTab(sheet)
                      if (e.key === 'Escape') { setRenamingTab(null); setRenameValue('') }
                    }}
                    className="text-[14px] font-bold bg-transparent border-b border-gray-400 focus:outline-none focus:border-black w-[140px]"
                  />
                ) : (
                  <span className="text-[14px] font-bold text-[#1a1a1a]">{sheet}</span>
                )}
                <span className="text-[12px] text-gray-500">
                  {total > 0 ? fmt(total, sym) : `${sym}XXXX`}
                </span>
                {isActive && <div className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-black" />}
              </button>
              {isActive && !isRenaming && (
                <button
                  onClick={() => setOpenTabMenu(openTabMenu === sheet ? null : sheet)}
                  className="absolute top-0 -right-5 text-gray-400 hover:text-black p-1"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              )}
              {openTabMenu === sheet && (
                <div className="absolute top-6 right-0 bg-white border border-gray-200 shadow-xl rounded-md py-1.5 w-44 z-30">
                  <button
                    onClick={() => { setRenamingTab(sheet); setRenameValue(sheet); setOpenTabMenu(null) }}
                    className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50"
                  >
                    Rename Sheet
                  </button>
                  <button
                    onClick={() => { setAddingTab(true); setOpenTabMenu(null) }}
                    className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50"
                  >
                    Add New Sheet
                  </button>
                  <button
                    onClick={() => handleDeleteTab(sheet)}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50"
                  >
                    Delete Sheet
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {addingTab ? (
          <div className="pb-4 px-1 flex-shrink-0">
            <input
              autoFocus
              value={newTabValue}
              onChange={e => setNewTabValue(e.target.value)}
              onBlur={handleAddTab}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddTab()
                if (e.key === 'Escape') { setAddingTab(false); setNewTabValue('') }
              }}
              placeholder="Sheet name"
              className="text-[13px] font-bold bg-transparent border-b border-gray-400 focus:outline-none focus:border-black w-[140px] py-1"
            />
          </div>
        ) : (
          <button
            onClick={() => setAddingTab(true)}
            className="pb-4 px-1 opacity-40 hover:opacity-70 ml-1"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white border border-[#e5e7eb] mt-6">
        <div className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_160px_40px_40px] border-b border-[#e5e7eb] sm:grid-cols-[minmax(0,1fr)_200px_40px_40px]">
          <div className="py-3 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Debt</div>
          <div className="py-3 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] text-right">Balance</div>
          <div />
          <div />
        </div>

        {visibleDebts.length === 0 && (
          <>
            {[0, 1, 2].map(i => (
              <div key={i} className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_160px_40px_40px] border-b border-[#f1f2f2] items-center sm:grid-cols-[minmax(0,1fr)_200px_40px_40px]">
                <div className="py-4 px-5 text-[15px] text-gray-300">Debt</div>
                <div className="py-4 px-5 text-[15px] text-gray-300 text-right">Balance</div>
                <div />
                <div />
              </div>
            ))}
          </>
        )}

        {visibleDebts.map(debt => {
          const isEditingName = editingField?.id === debt.id && editingField.field === 'name'
          const isEditingValue = editingField?.id === debt.id && editingField.field === 'value'
          return (
            <div
              key={debt.id}
              className="grid min-w-[520px] grid-cols-[minmax(0,1fr)_160px_40px_40px] border-b border-[#f1f2f2] items-center hover:bg-[#f8f9f9] group transition-colors sm:grid-cols-[minmax(0,1fr)_200px_40px_40px]"
            >
              <div
                className="min-w-0 truncate py-4 px-5 text-[15px] text-[#1a1a1a] font-medium cursor-pointer"
                onDoubleClick={() => startEdit(debt, 'name')}
                onClick={() => !isEditingName && setDetailDebt(debt)}
              >
                {isEditingName ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(debt)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit(debt)
                      if (e.key === 'Escape') setEditingField(null)
                    }}
                    onClick={e => e.stopPropagation()}
                    className="w-full bg-transparent border-b border-gray-400 focus:outline-none focus:border-black"
                  />
                ) : (
                  debt.name
                )}
              </div>
              <div
                className="py-4 px-5 text-[15px] text-[#1a1a1a] font-medium text-right cursor-pointer"
                onDoubleClick={() => startEdit(debt, 'value')}
                onClick={() => !isEditingValue && setDetailDebt(debt)}
              >
                {isEditingValue ? (
                  <input
                    autoFocus
                    type="number"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(debt)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit(debt)
                      if (e.key === 'Escape') setEditingField(null)
                    }}
                    onClick={e => e.stopPropagation()}
                    className="w-full text-right bg-transparent border-b border-gray-400 focus:outline-none focus:border-black"
                  />
                ) : (
                  fmt(debt.value, sym)
                )}
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => setDetailDebt(debt)}
                  className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
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
                      onClick={() => { setDetailDebt(debt); setOpenMenuId(null) }}
                      className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50"
                    >
                      Edit
                    </button>
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
          )
        })}

        <button
          onClick={() => setAddDebtOpen(true)}
          className="w-full flex items-center gap-3 bg-[#595959] hover:bg-[#4d4d4d] text-white transition-colors py-3.5 px-5"
        >
          <span className="text-xl font-light leading-none">+</span>
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase">Add Debt</span>
        </button>
      </div>

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

      {addDebtOpen && (
        <AddDebtModal onClose={() => setAddDebtOpen(false)} activeSheet={activeSheet} />
      )}

      {detailDebt && (
        <DebtDetailModal debt={detailDebt} onClose={() => setDetailDebt(null)} />
      )}
    </div>
  )
}
