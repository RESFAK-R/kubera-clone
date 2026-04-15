import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import React from 'react'
import { AssetSpreadsheet } from '@/components/dashboard/AssetSpreadsheet'
import { AddAssetGridModal } from '@/components/dashboard/AddAssetGridModal'
import { AddAssetDialog } from '@/components/dashboard/AddAssetDialog'
import { 
  PiggyBank, 
  Cat, 
  Home, 
  Car, 
  Coins, 
  Bot, 
  Fish,
} from 'lucide-react'

// Helper component for the grid tiles
function ActionTile({ 
  title, 
  icon: Icon, 
  assetType,
  flowType,
  targetSheet
}: { 
  title: string, 
  icon: any, 
  assetType: string,
  flowType?: any,
  targetSheet?: string
}) {
  return (
    <AddAssetDialog 
      defaultAssetType={assetType}
      flowType={flowType}
      targetSheet={targetSheet}
      trigger={
        <div className="flex flex-col justify-between h-full w-full p-4 text-left border border-gray-200 bg-[#e8ebeb] hover:bg-[#dcdede] transition-colors group cursor-pointer">
          <div className="font-bold text-[11px] font-mono tracking-widest text-[#1a1a1a] mb-8 uppercase" dangerouslySetInnerHTML={{ __html: title.replace(/\n/g, '<br/>') }} />
          <div className="self-end mt-auto text-[#1a1a1a]">
            {Icon && <Icon strokeWidth={1.5} className="w-8 h-8" />}
          </div>
        </div>
      }
    />
  )
}

function SubActionTile({ desc, actionTitle, assetType, flowType, targetSheet }: { desc: string, actionTitle: string, assetType: string, flowType?: any, targetSheet?: string }) {
  return (
    <AddAssetDialog 
      defaultAssetType={assetType}
      flowType={flowType}
      targetSheet={targetSheet}
      trigger={
        <div className="flex flex-col justify-between h-full w-full p-4 text-left border border-gray-200 bg-[#eff1f1] hover:bg-[#e4e6e6] transition-colors group cursor-pointer">
          <p className="text-[11px] text-gray-500 font-medium mb-4">{desc}</p>
          <div className="font-bold text-[11px] font-mono tracking-widest text-[#1a1a1a] uppercase mt-auto" dangerouslySetInnerHTML={{ __html: actionTitle.replace(/\n/g, '<br/>') }} />
        </div>
      }
    />
  )
}

function AiImportTile({ text }: { text: string }) {
  return (
    <button className="flex flex-col justify-between h-full w-full p-4 text-left border border-dashed border-gray-300 bg-[#f4f5f5] hover:bg-[#eff1f1] transition-colors group opacity-70">
      <p className="text-[11px] text-gray-500 font-medium mb-4">{text}</p>
      <div className="font-bold text-[11px] font-mono tracking-widest text-[#1a1a1a] uppercase mt-auto">AI IMPORT</div>
    </button>
  )
}

export default async function AssetsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: allAssets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // We are only handling assets (not liabilities) on this page
  const assets = allAssets?.filter(a => a.sheet !== 'Debts') || []
  const baseCurrency = profile?.base_currency || 'EUR'

  // Get unique sheets for tabs
  const uniqueSheets = Array.from(new Set(assets.map(a => a.sheet || 'Others')))
  const tabs = uniqueSheets.map(s => ({ id: s, label: s }))

  // Default sheets if none exist
  if (tabs.length === 0) {
    tabs.push({ id: 'Investments', label: 'Investments' })
    tabs.push({ id: 'Real Estate', label: 'Real Estate' })
    tabs.push({ id: 'Cash & Cards', label: 'Cash & Cards' })
    tabs.push({ id: 'Others', label: 'Others' })
  }

  return (
    <div className="flex-1 w-full bg-[#f4f5f5] pt-16 pb-24 px-8 md:px-16 flex justify-center overflow-y-auto">
      <div className="max-w-[700px] w-full">
        
        <div className="mb-12">
            <h1 className="text-[32px] font-bold tracking-tight text-[#1a1a1a] leading-tight mb-2">
              {assets.length === 0 ? 'All your assets\nin one place!' : 'Assets'}
            </h1>
            {assets.length > 0 && (
                <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-bold text-[#1a1a1a]">1 DAY</span>
                    <span className="text-[14px] font-bold text-gray-300">€0</span>
                </div>
            )}
        </div>

        <div className="mb-16">
          <AssetSpreadsheet 
            assets={assets} 
            baseCurrency={baseCurrency} 
            tabs={tabs} 
          />
        </div>

        <div className="flex flex-col mb-16 mt-8">
           {/* Section 1: Banks & Brokerages */}
           <div className="grid grid-cols-3">
              <div className="col-span-1 h-[140px]">
                <ActionTile title={'BANKS &\nBROKERAGES'} icon={PiggyBank} assetType="cash" flowType="generic" targetSheet="Cash & Cards" />
              </div>
              <div className="col-span-1 h-[140px]">
                <SubActionTile desc="If your brokerage can't be connected, add the holdings using tickers." actionTitle={'STOCK & FUND\nTICKERS'} assetType="stock" flowType="qty_price" targetSheet="Investments" />
              </div>
              <div className="col-span-1 h-[140px]">
                <AiImportTile text="Add stocks and funds in bulk" />
              </div>
           </div>

           {/* Section 2: Crypto */}
           <div className="grid grid-cols-3">
              <div className="col-span-1 h-[140px]">
                <ActionTile title={'CRYPTO\nWALLETS &\nEXCHANGES'} icon={Cat} assetType="crypto" flowType="generic" targetSheet="Investments" />
              </div>
              <div className="col-span-1 h-[140px]">
                <SubActionTile desc="No connectivity? Add your coins using tickers" actionTitle={'CRYPTO\nTICKERS'} assetType="crypto" flowType="qty_price" targetSheet="Investments" />
              </div>
              <div className="col-span-1 h-[140px]">
                <AiImportTile text="Add crypto holdings in bulk" />
              </div>
           </div>

           {/* Section 3: Physical */}
           <div className="grid grid-cols-4">
              <div className="col-span-1 h-[120px]">
                <ActionTile title={'REAL ESTATE'} icon={Home} assetType="real_estate" flowType="real_estate" targetSheet="Real Estate" />
              </div>
              <div className="col-span-1 h-[120px]">
                <ActionTile title={'VEHICLES'} icon={Car} assetType="vehicle" flowType="vehicle" targetSheet="Others" />
              </div>
              <div className="col-span-1 h-[120px]">
                <ActionTile title={'PRECIOUS\nMETALS'} icon={Coins} assetType="metal" flowType="qty_price" targetSheet="Investments" />
              </div>
              <div className="col-span-1 h-[120px]">
                <button className="flex flex-col justify-between h-full w-full p-4 text-left border border-gray-200 bg-[#eff1f1] hover:bg-[#e4e6e6] transition-colors group">
                  <p className="text-[11px] text-gray-500 font-medium mb-2 leading-tight">No market price? Let AI estimate and track its value automatically</p>
                  <div className="flex justify-between items-end mt-auto">
                    <span className="font-bold text-[11px] font-mono tracking-widest text-[#1a1a1a] uppercase leading-tight">AI<br/>APPRAISER</span>
                    <Bot strokeWidth={1.5} className="w-5 h-5 text-[#1a1a1a]" />
                  </div>
                </button>
              </div>
           </div>

           {/* Section 4: Link Portfolio */}
           <div className="border border-gray-200 bg-[#e8ebeb] p-4 flex justify-between items-center h-[90px] cursor-pointer hover:bg-[#dcdede] transition-colors">
              <div className="flex items-center">
                 <span className="font-bold text-[11px] font-mono tracking-widest text-[#1a1a1a] uppercase mr-6">LINK<br/>PORTFOLIO</span>
                 <p className="text-[11px] text-gray-500 max-w-[200px] leading-tight">Nested Portfolios to map trusts, LLCs and ownership structures. <span className="underline">Details</span></p>
              </div>
              <Fish strokeWidth={1.5} className="w-8 h-8 text-[#1a1a1a]" />
           </div>

           {/* Section 5: Manual Assets */}
           <div className="mt-6 mb-2">
             <span className="font-mono text-[10px] tracking-widest text-gray-500 uppercase">MANUAL ASSETS</span>
           </div>
           
           <div className="grid grid-cols-4">
              <div className="col-span-1 p-4 border border-transparent">
                 <p className="text-[11px] text-gray-500 leading-relaxed pr-2">
                   For private investments (angel, VC, alts), accounts that didn't connect and everything else...
                 </p>
              </div>
              <div className="col-span-1 h-[120px]">
                <SubActionTile desc="...manually track the units & price..." actionTitle={'ENTER\nQTY & PRICE'} assetType="other" flowType="qty_price" targetSheet="Others" />
              </div>
              <div className="col-span-1 h-[120px]">
                <SubActionTile desc="...or enter and update their values as you go" actionTitle={'ENTER\nASSET VALUE'} assetType="other" flowType="asset_value" targetSheet="Others" />
              </div>
              <div className="col-span-1 h-[120px]">
                <AiImportTile text="Add manual assets in bulk" />
              </div>
           </div>
        </div>

      </div>
    </div>
  )
}
