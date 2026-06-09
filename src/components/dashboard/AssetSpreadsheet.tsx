'use client'

import { useState, useTransition } from 'react'
import { deleteAsset, updateAsset, renameSheet, deleteSheet } from '@/app/dashboard/actions'
import { MoreHorizontal, GripVertical, X } from 'lucide-react'
import { AddAssetGridModal } from '@/components/dashboard/AddAssetGridModal'
import { AssetDetailModal } from '@/components/dashboard/AssetDetailModal'

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

type TabConfig = { id: string; label: string }

type Props = {
  assets: Asset[]
  baseCurrency: string
  tabs: TabConfig[]
}

export function AssetSpreadsheet({ assets, baseCurrency, tabs: initialTabs }: Props) {
  const [tabs, setTabs] = useState(initialTabs)
  const [activeTabId, setActiveTabId] = useState(initialTabs[0]?.id)
  const [, startTransition] = useTransition()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [openTabMenu, setOpenTabMenu] = useState<string | null>(null)
  const [renamingTab, setRenamingTab] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [addingTab, setAddingTab] = useState(false)
  const [newTabValue, setNewTabValue] = useState('')
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null)

  // Inline edits
  const [editingField, setEditingField] = useState<{ id: string; field: 'name' | 'value' } | null>(null)
  const [editValue, setEditValue] = useState('')

  const visibleAssets = assets.filter(a => (a.sheet || 'Others') === activeTabId)

  const sections: Record<string, Asset[]> = {}
  visibleAssets.forEach(asset => {
    const sectionName = asset.section || 'General'
    if (!sections[sectionName]) sections[sectionName] = []
    sections[sectionName].push(asset)
  })

  // If no assets in the current tab, still show at least one section so + ADD ASSET is visible
  if (Object.keys(sections).length === 0) {
    sections['General'] = []
  }

  const formatCurrency = (val: number, curr: string) => {
    const symbol = curr === 'EUR' ? '€' : '$'
    return `${symbol}${val.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`
  }

  const handleDelete = (id: string) => {
    setOpenMenuId(null)
    startTransition(() => { deleteAsset(id) })
  }

  const commitEdit = (asset: Asset) => {
    if (!editingField) return
    const field = editingField.field
    if (field === 'name' && editValue.trim() && editValue !== asset.name) {
      startTransition(() => { updateAsset(asset.id, { name: editValue.trim() }) })
    } else if (field === 'value') {
      const v = parseFloat(editValue)
      if (!isNaN(v) && v !== asset.value) {
        startTransition(() => { updateAsset(asset.id, { value: v }) })
      }
    }
    setEditingField(null)
  }

  const startEdit = (asset: Asset, field: 'name' | 'value') => {
    setEditValue(field === 'name' ? asset.name : String(asset.value))
    setEditingField({ id: asset.id, field })
  }

  const handleRenameTab = (oldName: string) => {
    setOpenTabMenu(null)
    if (renameValue.trim() && renameValue !== oldName) {
      const newName = renameValue.trim()
      setTabs(ts => ts.map(t => t.id === oldName ? { id: newName, label: newName } : t))
      if (activeTabId === oldName) setActiveTabId(newName)
      startTransition(() => { renameSheet(oldName, newName) })
    }
    setRenamingTab(null)
    setRenameValue('')
  }

  const handleDeleteTab = (name: string) => {
    setOpenTabMenu(null)
    setTabs(ts => ts.filter(t => t.id !== name))
    if (activeTabId === name && tabs.length > 1) {
      const remaining = tabs.find(t => t.id !== name)
      if (remaining) setActiveTabId(remaining.id)
    }
    startTransition(() => { deleteSheet(name) })
  }

  const handleAddTab = () => {
    if (!newTabValue.trim()) { setAddingTab(false); return }
    const name = newTabValue.trim()
    if (!tabs.find(t => t.id === name)) {
      setTabs(ts => [...ts, { id: name, label: name }])
      setActiveTabId(name)
    }
    setAddingTab(false)
    setNewTabValue('')
  }

  return (
    <div className="w-full">
      {/* Tabs Header */}
      <div className="flex items-end border-b border-gray-200 mb-8 overflow-x-auto no-scrollbar">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId
          const tabAssets = assets.filter(a => (a.sheet || 'Others') === tab.id)
          const tabTotal = tabAssets.reduce((sum, a) => sum + Number(a.value), 0)
          const isRenaming = renamingTab === tab.id

          return (
            <div key={tab.id} className="relative mr-10 flex-shrink-0">
              <button
                onClick={() => !isRenaming && setActiveTabId(tab.id)}
                className={`pb-4 px-1 flex flex-col text-left transition-colors relative ${
                  isActive ? 'text-black opacity-100' : 'text-[#1a1a1a] opacity-40 hover:opacity-70'
                }`}
              >
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameTab(tab.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameTab(tab.id)
                      if (e.key === 'Escape') { setRenamingTab(null); setRenameValue('') }
                    }}
                    className="font-bold text-[14px] mb-1 bg-transparent border-b border-gray-400 focus:outline-none focus:border-black w-[140px]"
                  />
                ) : (
                  <span className="font-bold text-[14px] mb-1">{tab.label}</span>
                )}
                <span className="text-[12px] font-medium">
                  {formatCurrency(tabTotal, baseCurrency)}
                </span>
                {isActive && <div className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-black" />}
              </button>
              {isActive && !isRenaming && (
                <button
                  onClick={() => setOpenTabMenu(openTabMenu === tab.id ? null : tab.id)}
                  className="absolute top-0 -right-5 text-gray-400 hover:text-black p-1"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              )}
              {openTabMenu === tab.id && (
                <div className="absolute top-6 right-0 bg-white border border-gray-200 shadow-xl rounded-md py-1.5 w-44 z-30">
                  <button
                    onClick={() => {
                      setRenamingTab(tab.id)
                      setRenameValue(tab.label)
                      setOpenTabMenu(null)
                    }}
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
                    onClick={() => handleDeleteTab(tab.id)}
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
            className="pb-4 px-1 text-[#1a1a1a] opacity-40 hover:opacity-70 flex items-center"
            title="Add Sheet"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tables */}
      <div className="flex flex-col space-y-8">
        {Object.entries(sections).map(([sectionName, sectionAssets]) => {
          const sectionTotal = sectionAssets.reduce((sum, a) => sum + Number(a.value), 0)
          return (
          <div key={sectionName} className="bg-white border border-[#e5e7eb] rounded-[2px] shadow-sm">
            {/* Section Header */}
            <div className="grid grid-cols-[30px_1fr_150px_40px_40px] text-[10px] font-bold text-gray-400 tracking-[0.15em] uppercase border-b border-[#f1f2f2]">
              <div className="py-2.5 px-3" />
              <div className="py-2.5 px-4 border-r border-[#f1f2f2]">ASSET</div>
              <div className="py-2.5 px-4 border-r border-[#f1f2f2] text-right">VALUE</div>
              <div />
              <div />
            </div>

            {/* Rows */}
            <div className="flex flex-col">
              {sectionAssets.map(asset => {
                const isEditingName = editingField?.id === asset.id && editingField.field === 'name'
                const isEditingValue = editingField?.id === asset.id && editingField.field === 'value'
                return (
                  <div
                    key={asset.id}
                    className="grid grid-cols-[30px_1fr_150px_40px_40px] border-b border-[#f1f2f2] items-center hover:bg-[#f8f9f9] group transition-colors"
                  >
                    <div className="py-2 px-3 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab flex justify-center">
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>
                    <div
                      className="py-3.5 px-4 border-r border-[#f1f2f2] text-[16px] text-[#1a1a1a] font-medium truncate"
                      onDoubleClick={() => startEdit(asset, 'name')}
                    >
                      {isEditingName ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(asset)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(asset)
                            if (e.key === 'Escape') setEditingField(null)
                          }}
                          onClick={e => e.stopPropagation()}
                          className="w-full bg-transparent border-b border-gray-400 focus:outline-none focus:border-black"
                        />
                      ) : (
                        <span 
                          className="cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => setDetailAsset(asset)}
                        >
                          {asset.name}
                        </span>
                      )}
                    </div>
                    <div
                      className="py-3.5 px-4 border-r border-[#f1f2f2] text-[16px] text-[#1a1a1a] font-medium text-right cursor-pointer"
                      onDoubleClick={() => startEdit(asset, 'value')}
                      onClick={() => !isEditingValue && setDetailAsset(asset)}
                    >
                      {isEditingValue ? (
                        <input
                          autoFocus
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(asset)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(asset)
                            if (e.key === 'Escape') setEditingField(null)
                          }}
                          onClick={e => e.stopPropagation()}
                          className="w-full text-right bg-transparent border-b border-gray-400 focus:outline-none focus:border-black"
                        />
                      ) : (
                        formatCurrency(asset.value, asset.currency)
                      )}
                    </div>
                    <div className="py-2 px-2 flex justify-center">
                      <button
                        onClick={() => setDetailAsset(asset)}
                        className="text-gray-300 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Open details"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                    <div className="py-2 px-2 flex justify-center relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === asset.id ? null : asset.id)}
                        className="p-1 text-gray-300 hover:text-black opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      {openMenuId === asset.id && (
                        <div className="absolute right-6 top-0 bg-white border border-gray-200 shadow-xl rounded-md py-1.5 w-36 z-[100]">
                          <button
                            onClick={() => { setDetailAsset(asset); setOpenMenuId(null) }}
                            className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              startEdit(asset, 'name')
                              setOpenMenuId(null)
                            }}
                            className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-gray-50"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => handleDelete(asset.id)}
                            className="w-full text-left px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50"
                          >
                            Delete Asset
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* + ADD ASSET Row */}
              <AddAssetGridModal
                trigger={
                  <div className="grid grid-cols-[30px_1fr_150px_40px_40px] items-center bg-[#595959] text-white/90 hover:bg-[#4d4d4d] transition-colors cursor-pointer rounded-b-[2px]">
                    <div className="py-3.5 px-3 flex justify-center">
                      <span className="text-xl font-light leading-none">+</span>
                    </div>
                    <div className="py-3.5 px-4 text-[11px] font-bold tracking-[0.15em] uppercase text-white/70">
                      ADD ASSET
                    </div>
                    <div className="py-3.5 px-4 text-[14px] font-semibold text-white text-right">
                      {sectionTotal > 0 ? formatCurrency(sectionTotal, baseCurrency) : ''}
                    </div>
                    <div />
                    <div />
                  </div>
                }
              />
            </div>
          </div>
          )
        })}
      </div>

      <button className="text-[11px] text-gray-400 font-bold tracking-[0.1em] hover:text-[#1a1a1a] mt-6 transition-colors uppercase">
        + NEW SECTION
      </button>

      {detailAsset && (
        <AssetDetailModal asset={detailAsset} onClose={() => setDetailAsset(null)} />
      )}
    </div>
  )
}
