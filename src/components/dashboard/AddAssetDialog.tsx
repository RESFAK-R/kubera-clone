'use client'

import { useState, useActionState, useEffect } from 'react'
import { addAsset } from '@/app/dashboard/actions'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useFormStatus } from 'react-dom'

export type FlowType = 'real_estate' | 'vehicle' | 'qty_price' | 'generic' | 'debt_manual' | 'asset_value'

export interface AddAssetDialogProps {
  trigger?: React.ReactNode
  defaultAssetType?: string
  flowType?: FlowType
  openOverride?: boolean
  onOpenChange?: (open: boolean) => void
  targetSheet?: string
  targetSection?: string
}

function SubmitButton({ label = 'Add Asset' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <div className="mt-8">
      <button
        type="submit"
        disabled={pending}
        className="bg-[#1a1a1a] text-white px-8 py-2.5 text-sm font-semibold hover:bg-black disabled:bg-gray-400 transition-colors"
      >
        {pending ? 'Saving...' : label}
      </button>
    </div>
  )
}

function RealEstateFlow({ assetType, sheet, section }: { assetType: string, sheet?: string, section?: string }) {
  return (
    <div className="pt-2">
      <h2 className="text-[28px] font-bold tracking-tight text-[#1a1a1a] mb-8">Real Estate</h2>
      <input type="hidden" name="asset_type" value={assetType} />
      <input type="hidden" name="currency" value="EUR" />
      <input type="hidden" name="sheet" value={sheet || 'Real Estate'} />
      <input type="hidden" name="section" value={section || 'Properties'} />
      
      <div className="space-y-6">
        <div>
          <label className="block text-[13px] text-gray-500 font-medium mb-2">Name of the property</label>
          <Input name="name" placeholder="e.g. My Beach House" className="h-12 border-gray-300 rounded-none bg-white text-base focus-visible:ring-0 focus-visible:border-black" required />
        </div>
        <div>
          <label className="block text-[13px] text-gray-500 font-medium mb-2">Address (Optional)</label>
          <Input name="address" placeholder="123 Ocean Drive, FL" className="h-12 border-gray-300 rounded-none bg-white text-base focus-visible:ring-0 focus-visible:border-black" />
        </div>
        <div>
          <label className="block text-[13px] text-gray-500 font-medium mb-2">Estimated Value</label>
          <Input name="value" type="number" step="any" placeholder="0" className="h-12 border-gray-300 rounded-none bg-white text-base focus-visible:ring-0 focus-visible:border-black" required />
        </div>
      </div>
      <SubmitButton />
    </div>
  )
}

function QtyPriceFlow({ assetType, sheet, section }: { assetType: string, sheet?: string, section?: string }) {
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  
  const q = parseFloat(qty) || 0
  const p = parseFloat(price) || 0
  const total = p * q

  return (
    <div className="pt-2">
      <h2 className="text-[28px] font-bold tracking-tight text-[#1a1a1a] mb-8">Enter Qty & Price</h2>
      <input type="hidden" name="asset_type" value={assetType} />
      <input type="hidden" name="currency" value="EUR" />
      <input type="hidden" name="sheet" value={sheet || 'Investments'} />
      <input type="hidden" name="section" value={section || 'Assets'} />
      <input type="hidden" name="value" value={total > 0 ? total : ''} />
      
      <div className="space-y-6">
        <div>
          <label className="block text-[13px] text-gray-500 font-medium mb-2">Asset Name</label>
          <Input name="name" className="h-12 border-gray-300 rounded-none bg-white text-base focus-visible:ring-0 focus-visible:border-black" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] text-gray-500 font-medium mb-2">Quantity</label>
            <Input name="qty" type="number" step="any" value={qty} onChange={e => setQty(e.target.value)} className="h-12 border-gray-300 rounded-none bg-white text-base focus-visible:ring-0 focus-visible:border-black" required />
          </div>
          <div>
            <label className="block text-[13px] text-gray-500 font-medium mb-2">Price per unit</label>
            <Input name="price_per_unit" type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} className="h-12 border-gray-300 rounded-none bg-white text-base focus-visible:ring-0 focus-visible:border-black" required />
          </div>
        </div>
        
        {total > 0 && (
           <div className="text-[13px] text-gray-500 pt-2">
             Total Value: <strong className="text-[#1a1a1a]">€{total.toLocaleString()}</strong>
           </div>
        )}
      </div>
      <div className="mt-8">
        <button
          type="submit"
          className="bg-[#1a1a1a] text-white px-8 py-2.5 text-sm font-semibold hover:bg-black transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

function VehicleFlow({ assetType, sheet, section }: { assetType: string, sheet?: string, section?: string }) {
  const [tab, setTab] = useState<'vin'|'model'>('vin')

  return (
    <div className="pt-2">
      <h2 className="text-[28px] font-bold tracking-tight text-[#1a1a1a] mb-6">Vehicles</h2>
      <input type="hidden" name="asset_type" value={assetType} />
      <input type="hidden" name="currency" value="EUR" />
      <input type="hidden" name="sheet" value={sheet || 'Others'} />
      <input type="hidden" name="section" value={section || 'Vehicles'} />
      <input type="hidden" name="name" value={tab === 'vin' ? 'Vehicle (VIN)' : 'Vehicle (Manual)'} />

      <div className="flex border-b border-gray-200 mb-8">
        <button 
          type="button" 
          onClick={() => setTab('vin')}
          className={`pb-2 px-1 text-[11px] font-bold uppercase tracking-widest mr-8 border-b-2 ${tab === 'vin' ? 'border-[#1a1a1a] text-[#1a1a1a]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          ENTER VIN (US & CANADA CARS)
        </button>
        <button 
          type="button" 
          onClick={() => setTab('model')}
          className={`pb-2 px-1 text-[11px] font-bold uppercase tracking-widest border-b-2 ${tab === 'model' ? 'border-[#1a1a1a] text-[#1a1a1a]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          ENTER MAKE & MODEL
        </button>
      </div>
      
      {tab === 'vin' ? (
        <div className="space-y-4">
          <label className="block text-[15px] text-[#1a1a1a] mb-4">Estimated value of your car (US & Canada Only)</label>
          <div className="flex">
            <Input name="vin" placeholder="Enter VIN number" className="h-12 flex-1 border-gray-300 rounded-none bg-[#f9fafa] text-base focus-visible:ring-0 focus-visible:border-black" />
            <div className="bg-gray-500 text-white px-6 flex items-center justify-center text-sm font-semibold cursor-not-allowed">
              Estimate
            </div>
          </div>
          <input type="hidden" name="value" value="0" />
          <p className="text-xs text-gray-400">VIN lookup is a placeholder pending API integration.</p>
          <SubmitButton />
        </div>
      ) : (
        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-[13px] text-gray-500 font-medium mb-2">Year</label>
               <Input name="year" className="h-12 border-gray-300 rounded-none bg-white text-base focus-visible:ring-0 focus-visible:border-black" />
             </div>
             <div>
               <label className="block text-[13px] text-gray-500 font-medium mb-2">Make</label>
               <Input name="make" placeholder="e.g. Tesla" className="h-12 border-gray-300 rounded-none bg-white text-base focus-visible:ring-0 focus-visible:border-black" />
             </div>
             <div className="col-span-2">
               <label className="block text-[13px] text-gray-500 font-medium mb-2">Model</label>
               <Input name="model" placeholder="e.g. Model 3" className="h-12 border-gray-300 rounded-none bg-white text-base focus-visible:ring-0 focus-visible:border-black" />
             </div>
           </div>
           <div>
             <label className="block text-[13px] text-gray-500 font-medium mb-2">Estimated Value</label>
             <Input name="value" type="number" step="any" placeholder="0" className="h-12 border-gray-300 rounded-none bg-white text-base focus-visible:ring-0 focus-visible:border-black" required />
           </div>
           <SubmitButton />
        </div>
      )}
    </div>
  )
}

function DefaultGenericFlow({ assetType, isDebt, sheet, section }: { assetType: string, isDebt?: boolean, sheet?: string, section?: string }) {
  return (
    <div className="pt-2">
      <h2 className="text-[28px] font-bold tracking-tight text-[#1a1a1a] mb-8">{isDebt ? 'Add Debt' : 'Add Asset'}</h2>
      <input type="hidden" name="asset_type" value={assetType} />
      <input type="hidden" name="currency" value="EUR" />
      <input type="hidden" name="sheet" value={sheet || (isDebt ? 'Debts' : 'Others')} />
      <input type="hidden" name="section" value={section || (isDebt ? 'Debts' : 'Assets')} />
      
      <div className="space-y-6">
        <div>
          <label className="block text-[13px] text-gray-500 font-medium mb-2">{isDebt ? 'Name / Lender' : 'Asset Name'}</label>
          <Input name="name" className="h-12 border-gray-300 rounded-none bg-white text-base focus-visible:ring-0 focus-visible:border-black" required />
        </div>
        <div>
          <label className="block text-[13px] text-gray-500 font-medium mb-2">{isDebt ? 'Current Balance' : 'Value'}</label>
          <Input name="value" type="number" step="any" placeholder="0" className="h-12 border-gray-300 rounded-none bg-white text-base focus-visible:ring-0 focus-visible:border-black" required />
        </div>
      </div>
      <SubmitButton label={isDebt ? 'Add Debt' : 'Add Asset'} />
    </div>
  )
}

export function AddAssetDialog({ 
  trigger, 
  defaultAssetType = 'other',
  flowType = 'generic',
  openOverride = undefined,
  onOpenChange = undefined,
  targetSheet,
  targetSection
}: AddAssetDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = openOverride !== undefined
  const open = isControlled ? openOverride : internalOpen
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen)
    }
    if (onOpenChange) {
      onOpenChange(newOpen)
    }
  }

  const [state, formAction] = useActionState(addAsset, null)

  // Close dialog on success
  useEffect(() => {
    if (state?.success && open) {
      handleOpenChange(false)
    }
  }, [state, open])

  // Map flowType to correct component UI
  const renderFlow = () => {
    switch(flowType) {
      case 'real_estate':
        return <RealEstateFlow assetType={defaultAssetType} sheet={targetSheet} section={targetSection} />
      case 'vehicle':
        return <VehicleFlow assetType={defaultAssetType} sheet={targetSheet} section={targetSection} />
      case 'qty_price':
        return <QtyPriceFlow assetType={defaultAssetType} sheet={targetSheet} section={targetSection} />
      case 'debt_manual':
        return <DefaultGenericFlow assetType="liability" isDebt={true} sheet="Debts" section="Debts" />
      case 'asset_value':
      case 'generic':
      default:
        return <DefaultGenericFlow assetType={defaultAssetType} isDebt={defaultAssetType === 'liability'} sheet={targetSheet} section={targetSection} />
    }
  }

  return (
    <>
      {trigger && (
        <span
          onClick={() => handleOpenChange(true)}
          className="contents cursor-pointer"
        >
          {trigger}
        </span>
      )}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[480px] bg-[#fbfcfc] p-10 border-0 shadow-lg rounded-none">
          <form action={formAction}>
             {renderFlow()}
             {state?.error && (
               <div className="text-red-500 text-sm font-medium mt-4">{state.error}</div>
             )}
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
