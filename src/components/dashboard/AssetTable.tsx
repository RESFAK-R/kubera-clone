'use client'

import { useTransition } from 'react'
import { deleteAsset } from '@/app/dashboard/actions'
import { Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Asset = {
  id: string
  name: string
  asset_type: string
  value: number
  currency: string
  metadata: {
    ticker?: string
    quantity?: string | number
    address?: string
  } | null
}

type Props = {
  assets: Asset[]
  baseCurrency: string
}

export function AssetTable({ assets, baseCurrency }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      startTransition(() => {
        deleteAsset(id)
      })
    }
  }

  // Group assets by type
  const grouped = assets.reduce((acc, asset) => {
    if (!acc[asset.asset_type]) acc[asset.asset_type] = []
    acc[asset.asset_type].push(asset)
    return acc
  }, {} as Record<string, Asset[]>)

  const categories = [
    { id: 'cash', label: 'Cash & Bank Accounts' },
    { id: 'stock', label: 'Brokerage & Stocks' },
    { id: 'crypto', label: 'Crypto & DeFi' },
    { id: 'real_estate', label: 'Real Estate' },
    { id: 'metal', label: 'Precious Metals' },
    { id: 'vehicle', label: 'Vehicles' },
    { id: 'other', label: 'Other Assets' },
    { id: 'liability', label: 'Liabilities & Loans' },
  ]

  const formatCurrency = (val: number, curr: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(val)
  }

  return (
    <div className="space-y-8">
      {categories.map(category => {
        const categoryAssets = grouped[category.id]
        if (!categoryAssets || categoryAssets.length === 0) return null

        const subtotal = categoryAssets.reduce((sum, a) => sum + Number(a.value), 0)
        const isLiability = category.id === 'liability'

        return (
          <div key={category.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">{category.label}</h3>
              <span className={`font-semibold ${isLiability ? 'text-red-600' : 'text-gray-900'}`}>
                {formatCurrency(subtotal, baseCurrency)}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%]">Asset</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryAssets.map(asset => (
                  <TableRow key={asset.id} className={`group ${isPending ? 'opacity-50' : ''}`}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {asset.metadata?.ticker && <span className="bg-gray-100 px-2 py-1 rounded text-xs mr-2">{asset.metadata.ticker}</span>}
                      {asset.metadata?.quantity && <span>Qty: {asset.metadata.quantity}</span>}
                      {asset.metadata?.address && <span className="truncate max-w-[200px] inline-block">{asset.metadata.address}</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(asset.value, asset.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <button 
                        onClick={() => handleDelete(asset.id)}
                        className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete asset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      })}

      {assets.length === 0 && (
        <div className="text-center py-24 border border-dashed border-gray-300 rounded-xl bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Your portfolio is empty</h3>
          <p className="mt-1 text-gray-500">Add your first asset to start tracking your net worth.</p>
        </div>
      )}
    </div>
  )
}
