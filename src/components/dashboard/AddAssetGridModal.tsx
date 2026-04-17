'use client'

import React, { useState } from 'react'
import { X, PiggyBank, Home, Car, Coins, Bot, Fish } from 'lucide-react'
import { addAsset } from '@/app/dashboard/actions'
import { Input } from '@/components/ui/input'
import { useFormStatus } from 'react-dom'
import { useActionState, useEffect } from 'react'

// ─── Flow type registry ───────────────────────────────────────────────────────

type FlowKey =
  | 'banks'
  | 'stock_tickers'
  | 'crypto_wallets'
  | 'crypto_tickers'
  | 'real_estate'
  | 'vehicles'
  | 'metals'
  | 'qty_price'
  | 'asset_value'

interface FlowConfig {
  assetType: string
  targetSheet: string
  flowKey: FlowKey
}

const TILE_FLOWS: Record<string, FlowConfig> = {
  banks:         { assetType: 'cash',        targetSheet: 'Cash & Cards',  flowKey: 'banks' },
  stock_tickers: { assetType: 'stock',       targetSheet: 'Investments',   flowKey: 'stock_tickers' },
  crypto_wallets:{ assetType: 'crypto',      targetSheet: 'Investments',   flowKey: 'crypto_wallets' },
  crypto_tickers:{ assetType: 'crypto',      targetSheet: 'Investments',   flowKey: 'crypto_tickers' },
  real_estate:   { assetType: 'real_estate', targetSheet: 'Real Estate',   flowKey: 'real_estate' },
  vehicles:      { assetType: 'vehicle',     targetSheet: 'Others',        flowKey: 'vehicles' },
  metals:        { assetType: 'metal',       targetSheet: 'Investments',   flowKey: 'metals' },
  qty_price:     { assetType: 'other',       targetSheet: 'Others',        flowKey: 'qty_price' },
  asset_value:   { assetType: 'other',       targetSheet: 'Others',        flowKey: 'asset_value' },
}

// ─── Submit button ────────────────────────────────────────────────────────────

function SubmitButton({ label = 'Add Asset' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-8 bg-[#1a1a1a] text-white px-8 py-2.5 text-sm font-semibold hover:bg-black disabled:bg-gray-400 transition-colors"
    >
      {pending ? 'Saving...' : label}
    </button>
  )
}

// ─── Individual flows ─────────────────────────────────────────────────────────

function BanksFlow({ sheet }: { sheet: string }) {
  return (
    <div className="space-y-6">
      <input type="hidden" name="asset_type" value="cash" />
      <input type="hidden" name="currency" value="EUR" />
      <input type="hidden" name="sheet" value={sheet} />
      <input type="hidden" name="section" value="Banks & Brokerages" />
      <div>
        <label className="block text-[13px] text-gray-500 font-medium mb-2">Institution / Account Name</label>
        <Input name="name" placeholder="e.g. Revolut, BNP Paribas" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" required />
      </div>
      <div>
        <label className="block text-[13px] text-gray-500 font-medium mb-2">Account Balance</label>
        <Input name="value" type="number" step="any" placeholder="0" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" required />
      </div>
      <div>
        <label className="block text-[13px] text-gray-500 font-medium mb-2">Account Number (optional)</label>
        <Input name="account_number" placeholder="IBAN or last 4 digits" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" />
      </div>
      <SubmitButton label="Add Account" />
    </div>
  )
}

function QtyPriceFlow({ assetType, sheet, section, label }: { assetType: string; sheet: string; section: string; label: string }) {
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const total = (parseFloat(qty) || 0) * (parseFloat(price) || 0)

  return (
    <div className="space-y-6">
      <input type="hidden" name="asset_type" value={assetType} />
      <input type="hidden" name="currency" value="EUR" />
      <input type="hidden" name="sheet" value={sheet} />
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="value" value={total > 0 ? String(total) : ''} />
      <div>
        <label className="block text-[13px] text-gray-500 font-medium mb-2">Name / Ticker</label>
        <Input name="name" placeholder={label} className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] text-gray-500 font-medium mb-2">Quantity</label>
          <Input name="qty" type="number" step="any" value={qty} onChange={e => setQty(e.target.value)} className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" required />
        </div>
        <div>
          <label className="block text-[13px] text-gray-500 font-medium mb-2">Price per unit (€)</label>
          <Input name="price_per_unit" type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" required />
        </div>
      </div>
      {total > 0 && (
        <p className="text-[13px] text-gray-500">Total: <strong className="text-[#1a1a1a]">€{total.toLocaleString('de-DE', { maximumFractionDigits: 2 })}</strong></p>
      )}
      <SubmitButton />
    </div>
  )
}

function AssetValueFlow({ assetType, sheet, section }: { assetType: string; sheet: string; section: string }) {
  return (
    <div className="space-y-6">
      <input type="hidden" name="asset_type" value={assetType} />
      <input type="hidden" name="currency" value="EUR" />
      <input type="hidden" name="sheet" value={sheet} />
      <input type="hidden" name="section" value={section} />
      <div>
        <label className="block text-[13px] text-gray-500 font-medium mb-2">Asset Name</label>
        <Input name="name" placeholder="e.g. Angel Investment in Acme" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" required />
      </div>
      <div>
        <label className="block text-[13px] text-gray-500 font-medium mb-2">Current Value (€)</label>
        <Input name="value" type="number" step="any" placeholder="0" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" required />
      </div>
      <SubmitButton />
    </div>
  )
}

function RealEstateFlow({ sheet }: { sheet: string }) {
  return (
    <div className="space-y-6">
      <input type="hidden" name="asset_type" value="real_estate" />
      <input type="hidden" name="currency" value="EUR" />
      <input type="hidden" name="sheet" value={sheet} />
      <input type="hidden" name="section" value="Real Estate" />
      <div>
        <label className="block text-[13px] text-gray-500 font-medium mb-2">Name of the property</label>
        <Input name="name" placeholder="e.g. My Beach House" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" required />
      </div>
      <div>
        <label className="block text-[13px] text-gray-500 font-medium mb-2">Address (optional)</label>
        <Input name="address" placeholder="123 Ocean Drive, FL" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] text-gray-500 font-medium mb-2">Size (m²)</label>
          <Input name="size_sqm" type="number" step="any" placeholder="0" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" />
        </div>
        <div>
          <label className="block text-[13px] text-gray-500 font-medium mb-2">Year Built</label>
          <Input name="year_built" type="number" placeholder="e.g. 1990" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" />
        </div>
      </div>
      <div>
        <label className="block text-[13px] text-gray-500 font-medium mb-2">Estimated Value (€)</label>
        <Input name="value" type="number" step="any" placeholder="0" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" required />
      </div>
      <SubmitButton label="Add Property" />
    </div>
  )
}

function VehicleFlow({ sheet }: { sheet: string }) {
  const [tab, setTab] = useState<'vin' | 'model'>('vin')

  return (
    <div>
      <input type="hidden" name="asset_type" value="vehicle" />
      <input type="hidden" name="currency" value="EUR" />
      <input type="hidden" name="sheet" value={sheet} />
      <input type="hidden" name="section" value="Vehicles" />

      <div className="flex border-b border-gray-200 mb-6">
        {(['vin', 'model'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`pb-2 mr-8 text-[11px] font-bold uppercase tracking-widest border-b-2 ${tab === t ? 'border-[#1a1a1a] text-[#1a1a1a]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            {t === 'vin' ? 'VIN (US & Canada)' : 'Make & Model'}
          </button>
        ))}
      </div>

      {tab === 'vin' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] text-gray-500 font-medium mb-2">VIN Number</label>
            <div className="flex">
              <Input name="vin" placeholder="Enter VIN number" className="h-12 flex-1 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" />
              <div className="bg-gray-400 text-white px-5 flex items-center text-xs font-semibold cursor-not-allowed">Estimate</div>
            </div>
          </div>
          <div>
            <label className="block text-[13px] text-gray-500 font-medium mb-2">Name</label>
            <Input name="name" placeholder="e.g. My Tesla" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" required />
          </div>
          <input type="hidden" name="value" value="0" />
          <SubmitButton label="Add Vehicle" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] text-gray-500 font-medium mb-2">Year</label>
              <Input name="year" placeholder="2023" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" />
            </div>
            <div>
              <label className="block text-[13px] text-gray-500 font-medium mb-2">Make</label>
              <Input name="make" placeholder="e.g. Tesla" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" />
            </div>
            <div>
              <label className="block text-[13px] text-gray-500 font-medium mb-2">Model</label>
              <Input name="model" placeholder="e.g. Model 3" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" />
            </div>
            <div>
              <label className="block text-[13px] text-gray-500 font-medium mb-2">Mileage (km)</label>
              <Input name="mileage" type="number" placeholder="0" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" />
            </div>
          </div>
          <div>
            <label className="block text-[13px] text-gray-500 font-medium mb-2">Name</label>
            <Input name="name" placeholder="e.g. My Tesla Model 3" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" required />
          </div>
          <div>
            <label className="block text-[13px] text-gray-500 font-medium mb-2">Estimated Value (€)</label>
            <Input name="value" type="number" step="any" placeholder="0" className="h-12 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-black" required />
          </div>
          <SubmitButton label="Add Vehicle" />
        </div>
      )}
    </div>
  )
}

// ─── Flow wrapper (handles form action + close on success) ────────────────────

function FlowWrapper({
  flowKey,
  config,
  onSuccess,
}: {
  flowKey: FlowKey
  config: FlowConfig
  onSuccess: () => void
}) {
  const [state, formAction] = useActionState(addAsset, null)

  useEffect(() => {
    if (state?.success) onSuccess()
  }, [state, onSuccess])

  const FLOW_TITLES: Record<FlowKey, string> = {
    banks:          'Banks & Brokerages',
    stock_tickers:  'Stock & Fund Tickers',
    crypto_wallets: 'Crypto Wallets & Exchanges',
    crypto_tickers: 'Crypto Tickers',
    real_estate:    'Real Estate',
    vehicles:       'Vehicles',
    metals:         'Precious Metals',
    qty_price:      'Enter Qty & Price',
    asset_value:    'Enter Asset Value',
  }

  return (
    <form action={formAction} className="pt-2">
      <h2 className="text-[22px] font-bold text-[#1a1a1a] mb-8">{FLOW_TITLES[flowKey]}</h2>
      {flowKey === 'banks' && <BanksFlow sheet={config.targetSheet} />}
      {flowKey === 'stock_tickers' && <QtyPriceFlow assetType="stock" sheet={config.targetSheet} section="Stocks & Funds" label="e.g. AAPL, VUSA" />}
      {flowKey === 'crypto_wallets' && <AssetValueFlow assetType="crypto" sheet={config.targetSheet} section="Crypto" />}
      {flowKey === 'crypto_tickers' && <QtyPriceFlow assetType="crypto" sheet={config.targetSheet} section="Crypto" label="e.g. BTC, ETH" />}
      {flowKey === 'real_estate' && <RealEstateFlow sheet={config.targetSheet} />}
      {flowKey === 'vehicles' && <VehicleFlow sheet={config.targetSheet} />}
      {flowKey === 'metals' && <QtyPriceFlow assetType="metal" sheet={config.targetSheet} section="Precious Metals" label="e.g. Gold, Silver" />}
      {flowKey === 'qty_price' && <QtyPriceFlow assetType="other" sheet={config.targetSheet} section="Manual Assets" label="Asset name" />}
      {flowKey === 'asset_value' && <AssetValueFlow assetType="other" sheet={config.targetSheet} section="Manual Assets" />}
      {state?.error && <p className="text-red-500 text-sm mt-4">{state.error}</p>}
    </form>
  )
}

// ─── Tile components ──────────────────────────────────────────────────────────

function ActionTile({ title, icon: Icon, tileKey, onSelect }: { title: string; icon: React.ComponentType<{ strokeWidth?: number; className?: string }>; tileKey: string; onSelect: (k: string) => void }) {
  return (
    <button
      onClick={() => onSelect(tileKey)}
      className="flex flex-col justify-between h-[120px] w-full p-4 text-left border border-gray-200 bg-[#e8ebeb] hover:bg-[#dcdede] transition-colors"
    >
      <div className="font-bold text-[10px] tracking-widest text-[#1a1a1a] uppercase leading-tight" dangerouslySetInnerHTML={{ __html: title.replace(/\n/g, '<br/>') }} />
      <Icon strokeWidth={1.5} className="w-6 h-6 text-[#1a1a1a] self-end" />
    </button>
  )
}

function SubTile({ desc, label, tileKey, onSelect }: { desc: string; label: string; tileKey: string; onSelect: (k: string) => void }) {
  return (
    <button
      onClick={() => onSelect(tileKey)}
      className="flex flex-col justify-between h-[120px] w-full p-4 text-left border border-gray-200 bg-[#eff1f1] hover:bg-[#e4e6e6] transition-colors"
    >
      <p className="text-[10px] text-gray-500 leading-tight">{desc}</p>
      <div className="font-bold text-[10px] tracking-widest text-[#1a1a1a] uppercase leading-tight" dangerouslySetInnerHTML={{ __html: label.replace(/\n/g, '<br/>') }} />
    </button>
  )
}

function AiTile({ text }: { text: string }) {
  return (
    <button className="flex flex-col justify-between h-[120px] w-full p-4 text-left border border-dashed border-gray-300 bg-[#f4f5f5] hover:bg-[#eff1f1] transition-colors opacity-70 cursor-not-allowed">
      <p className="text-[10px] text-gray-500 leading-tight">{text}</p>
      <div className="font-bold text-[10px] tracking-widest text-[#1a1a1a] uppercase">AI IMPORT</div>
    </button>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function AddAssetGridModal({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const handleSelect = (key: string) => setSelectedKey(key)
  const handleBack = () => setSelectedKey(null)
  const handleClose = () => { setOpen(false); setSelectedKey(null) }
  const handleSuccess = () => { handleClose() }

  if (!open) {
    return (
      <span onClick={() => setOpen(true)} className="contents cursor-pointer">
        {trigger}
      </span>
    )
  }

  const selectedConfig = selectedKey ? TILE_FLOWS[selectedKey] : null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full max-w-[660px] shadow-2xl max-h-[90vh] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 z-10">
          <X className="w-5 h-5" />
        </button>

        {/* Grid view */}
        {!selectedConfig && (
          <div className="p-8">
            <h2 className="text-[22px] font-bold text-[#1a1a1a] mb-1">Add Asset</h2>
            <p className="text-[12px] text-gray-400 mb-6">Choose asset type</p>

            {/* Banks & Stocks row */}
            <div className="grid grid-cols-3">
              <ActionTile title={'BANKS &\nBROKERAGES'} icon={PiggyBank} tileKey="banks" onSelect={handleSelect} />
              <SubTile desc="Brokerage not connected? Add holdings using tickers." label={'STOCK & FUND\nTICKERS'} tileKey="stock_tickers" onSelect={handleSelect} />
              <AiTile text="Add stocks and funds in bulk" />
            </div>

            {/* Crypto row */}
            <div className="grid grid-cols-3">
              <ActionTile title={'CRYPTO\nWALLETS &\nEXCHANGES'} icon={Coins} tileKey="crypto_wallets" onSelect={handleSelect} />
              <SubTile desc="No connectivity? Add coins using tickers." label={'CRYPTO\nTICKERS'} tileKey="crypto_tickers" onSelect={handleSelect} />
              <AiTile text="Add crypto holdings in bulk" />
            </div>

            {/* Physical assets row */}
            <div className="grid grid-cols-4">
              <ActionTile title={'REAL\nESTATE'} icon={Home} tileKey="real_estate" onSelect={handleSelect} />
              <ActionTile title={'VEHICLES'} icon={Car} tileKey="vehicles" onSelect={handleSelect} />
              <ActionTile title={'PRECIOUS\nMETALS'} icon={Coins} tileKey="metals" onSelect={handleSelect} />
              <button className="flex flex-col justify-between h-[120px] w-full p-4 text-left border border-gray-200 bg-[#eff1f1] hover:bg-[#e4e6e6] transition-colors opacity-70 cursor-not-allowed">
                <p className="text-[9px] text-gray-500 leading-tight">No market price? Let AI estimate and track automatically</p>
                <div className="flex justify-between items-end mt-auto">
                  <span className="font-bold text-[9px] tracking-widest text-[#1a1a1a] uppercase leading-tight">AI<br />APPRAISER</span>
                  <Bot strokeWidth={1.5} className="w-4 h-4 text-[#1a1a1a]" />
                </div>
              </button>
            </div>

            {/* Link portfolio */}
            <div className="border border-gray-200 bg-[#e8ebeb] px-5 py-4 flex justify-between items-center cursor-not-allowed opacity-70">
              <div className="flex items-center gap-6">
                <span className="font-bold text-[10px] tracking-widest text-[#1a1a1a] uppercase leading-tight">LINK<br />PORTFOLIO</span>
                <p className="text-[10px] text-gray-500 max-w-[220px] leading-tight">Nested Portfolios to map trusts, LLCs and ownership structures.</p>
              </div>
              <Fish strokeWidth={1.5} className="w-6 h-6 text-[#1a1a1a]" />
            </div>

            {/* Manual assets */}
            <div className="mt-5 mb-2">
              <span className="text-[9px] tracking-widest text-gray-400 uppercase font-bold">Manual Assets</span>
            </div>
            <div className="grid grid-cols-4">
              <div className="p-4">
                <p className="text-[10px] text-gray-500 leading-relaxed">For private investments, accounts that didn&apos;t connect and everything else…</p>
              </div>
              <SubTile desc="…manually track units & price…" label={'ENTER\nQTY & PRICE'} tileKey="qty_price" onSelect={handleSelect} />
              <SubTile desc="…or enter and update their values as you go" label={'ENTER\nASSET VALUE'} tileKey="asset_value" onSelect={handleSelect} />
              <AiTile text="Add manual assets in bulk" />
            </div>
          </div>
        )}

        {/* Specific flow view */}
        {selectedConfig && (
          <div className="p-8">
            <button
              onClick={handleBack}
              className="text-[11px] font-bold text-gray-400 uppercase tracking-widest hover:text-[#1a1a1a] mb-6 flex items-center gap-1"
            >
              ← Back
            </button>
            <FlowWrapper
              flowKey={selectedConfig.flowKey}
              config={selectedConfig}
              onSuccess={handleSuccess}
            />
          </div>
        )}
      </div>
    </div>
  )
}
