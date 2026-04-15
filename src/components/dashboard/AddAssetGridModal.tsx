'use client'

import React, { useState } from 'react'
import { AddAssetDialog } from './AddAssetDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  PiggyBank, 
  Cat, 
  Home, 
  Car, 
  Coins, 
  Bot, 
  Fish,
} from 'lucide-react'

function GridActionTile({ 
  title, 
  icon: Icon, 
  assetType,
  onSelect
}: { 
  title: string, 
  icon: any, 
  assetType: string,
  onSelect: (type: string) => void
}) {
  return (
    <button 
      onClick={() => onSelect(assetType)}
      className="flex flex-col justify-between h-[120px] w-full p-4 text-left border border-gray-200 bg-[#e8ebeb] hover:bg-[#dcdede] transition-colors group"
    >
      <div className="font-bold text-[10px] font-mono tracking-widest text-[#1a1a1a] mb-8 uppercase leading-tight" dangerouslySetInnerHTML={{ __html: title.replace(/\n/g, '<br/>') }} />
      <div className="self-end mt-auto text-[#1a1a1a]">
        {Icon && <Icon strokeWidth={1.5} className="w-6 h-6" />}
      </div>
    </button>
  )
}

function GridSubActionTile({ desc, actionTitle, assetType, onSelect }: { desc: string, actionTitle: string, assetType: string, onSelect: (type: string) => void }) {
  return (
    <button 
      onClick={() => onSelect(assetType)}
      className="flex flex-col justify-between h-[120px] w-full p-4 text-left border border-gray-200 bg-[#eff1f1] hover:bg-[#e4e6e6] transition-colors group"
    >
      <p className="text-[10px] text-gray-500 font-medium mb-4 leading-tight">{desc}</p>
      <div className="font-bold text-[10px] font-mono tracking-widest text-[#1a1a1a] uppercase mt-auto leading-tight" dangerouslySetInnerHTML={{ __html: actionTitle.replace(/\n/g, '<br/>') }} />
    </button>
  )
}

function AiImportTile({ text }: { text: string }) {
  return (
    <button className="flex flex-col justify-between h-[120px] w-full p-4 text-left border border-dashed border-gray-300 bg-[#f4f5f5] hover:bg-[#eff1f1] transition-colors group opacity-70">
      <p className="text-[10px] text-gray-500 font-medium mb-4 leading-tight">{text}</p>
      <div className="font-bold text-[10px] font-mono tracking-widest text-[#1a1a1a] uppercase mt-auto leading-tight">AI IMPORT</div>
    </button>
  )
}


export function AddAssetGridModal({ trigger, isDebt = false }: { trigger: React.ReactNode, isDebt?: boolean }) {
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)

  // When a grid tile is clicked, we need to open the AddAssetDialog
  // Which means we have two nested modals. Best is to compose them.

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents cursor-pointer">
        {trigger}
      </span>
    <Dialog open={open} onOpenChange={setOpen}>
      
      <DialogContent className="sm:max-w-[700px] bg-[#fcfdfd] border-gray-200 p-0 shadow-2xl overflow-hidden rounded-sm">
        <div className="p-8 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-xl font-bold tracking-tight text-[#1a1a1a]">
              Add {isDebt ? 'Debt' : 'Asset'}
            </DialogTitle>
          </DialogHeader>

          {/* Grid Selection Area */}
          <div className="flex flex-col w-full">
            
            {/* The Grid */}
            <div className="grid grid-cols-3">
              <div className="col-span-1">
                <GridActionTile title={'BANKS &\nBROKERAGES'} icon={PiggyBank} assetType="cash" onSelect={setSelectedType} />
              </div>
              <div className="col-span-1">
                <GridSubActionTile desc="If your brokerage can't be connected, add the holdings using tickers." actionTitle={'STOCK & FUND\nTICKERS'} assetType="stock" onSelect={setSelectedType} />
              </div>
              <div className="col-span-1">
                <AiImportTile text="Add stocks and funds in bulk" />
              </div>
            </div>

            <div className="grid grid-cols-3">
              <div className="col-span-1">
                <GridActionTile title={'CRYPTO\nWALLETS &\nEXCHANGES'} icon={Cat} assetType="crypto" onSelect={setSelectedType} />
              </div>
              <div className="col-span-1">
                <GridSubActionTile desc="No connectivity? Add your coins using tickers" actionTitle={'CRYPTO\nTICKERS'} assetType="crypto" onSelect={setSelectedType} />
              </div>
              <div className="col-span-1">
                <AiImportTile text="Add crypto holdings in bulk" />
              </div>
            </div>

            <div className="grid grid-cols-4">
              <div className="col-span-1">
                <GridActionTile title={'REAL ESTATE'} icon={Home} assetType="real_estate" onSelect={setSelectedType} />
              </div>
              <div className="col-span-1">
                <GridActionTile title={'VEHICLES'} icon={Car} assetType="vehicle" onSelect={setSelectedType} />
              </div>
              <div className="col-span-1">
                <GridActionTile title={'PRECIOUS\nMETALS'} icon={Coins} assetType="metal" onSelect={setSelectedType} />
              </div>
              <div className="col-span-1 h-[120px]">
                <button className="flex flex-col justify-between h-full w-full p-4 text-left border border-gray-200 bg-[#eff1f1] hover:bg-[#e4e6e6] transition-colors group">
                  <p className="text-[9px] text-gray-500 font-medium mb-1 leading-tight">No market price? Let AI estimate and track its value automatically</p>
                  <div className="flex justify-between items-end mt-auto">
                    <span className="font-bold text-[9px] font-mono tracking-widest text-[#1a1a1a] uppercase leading-tight">AI<br/>APPRAISER</span>
                    <Bot strokeWidth={1.5} className="w-4 h-4 text-[#1a1a1a]" />
                  </div>
                </button>
              </div>
            </div>

            {/* Manual Assets section in the modal */}
            <div className="mt-6 mb-2">
              <span className="font-mono text-[9px] tracking-widest text-gray-500 uppercase">MANUAL {isDebt ? 'DEBTS' : 'ASSETS'}</span>
            </div>
            
            <div className="grid grid-cols-4">
              <div className="col-span-1 p-4 border border-transparent">
                  <p className="text-[10px] text-gray-500 leading-relaxed pr-2">
                    For private investments (angel, VC, alts), accounts that didn't connect and everything else...
                  </p>
              </div>
              <div className="col-span-1">
                <GridSubActionTile desc="...manually track the units & price..." actionTitle={'ENTER\nQTY & PRICE'} assetType="other" onSelect={setSelectedType} />
              </div>
              <div className="col-span-1">
                <GridSubActionTile desc="...or enter and update their values as you go" actionTitle={'ENTER\nASSET VALUE'} assetType="other" onSelect={setSelectedType} />
              </div>
              <div className="col-span-1">
                <AiImportTile text="Add manual assets in bulk" />
              </div>
            </div>
            
          </div>
        </div>
      </DialogContent>

      {/* When a tile is selected, we mount the AddAssetDialog open */}
      {selectedType && (
        <AddAssetDialog 
          defaultAssetType={selectedType}
          trigger={null} 
          openOverride={true}
          targetSheet={isDebt ? 'Debts' : (selectedType === 'real_estate' ? 'Real Estate' : (['stock', 'crypto', 'metal'].includes(selectedType) ? 'Investments' : (selectedType === 'cash' ? 'Cash & Cards' : 'Others')))}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedType(null)
            }
          }}
        />
      )}
    </Dialog>
    </>
  )
}
