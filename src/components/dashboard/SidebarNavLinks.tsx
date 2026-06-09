'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  PieChart,
  Gem,
  Link as LinkIcon,
  Rewind,
  FastForward,
  Umbrella,
} from 'lucide-react'

type Props = {
  totalNetWorth: number
  totalAssets: number
  totalDebts: number
  baseCurrency: string
}

export function SidebarNavLinks({ totalNetWorth, totalAssets, totalDebts, baseCurrency }: Props) {
  const pathname = usePathname()

  const formatCurrency = (val: number) => {
    const symbol = baseCurrency === 'EUR' ? '€' : '$'
    return `${symbol}${val.toLocaleString('de-DE')}`
  }

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <nav className="flex flex-col">
      {/* Net Worth */}
      <Link
        href="/dashboard/networth"
        className={`flex min-w-0 items-center justify-between gap-3 px-4 py-3 hover:bg-black/5 transition-colors ${isActive('/dashboard/networth') ? '' : 'opacity-70'}`}
      >
        <div className="flex min-w-0 items-center">
          <PieChart className={`w-[20px] h-[20px] mr-4 ${isActive('/dashboard/networth') ? 'text-gray-900' : 'text-gray-500'}`} />
          <div className="flex min-w-0 flex-col">
            <span className={`text-[14px] ${isActive('/dashboard/networth') ? 'font-bold text-[#1a1a1a]' : 'font-medium text-gray-700'}`}>
              Net Worth
            </span>
            {isActive('/dashboard/networth') && (
              <span className="text-[11px] text-gray-400 font-medium">Dashboard</span>
            )}
          </div>
        </div>
        <span className={`flex-shrink-0 text-right text-[14px] ${isActive('/dashboard/networth') ? 'font-bold text-gray-800' : 'font-medium text-gray-500'}`}>
          {formatCurrency(totalNetWorth)}
        </span>
      </Link>

      <div className="border-t border-gray-200"></div>

      {/* Assets */}
      <Link
        href="/dashboard/assets"
        className={`flex min-w-0 items-center justify-between gap-3 px-4 py-3 hover:bg-black/5 transition-colors ${isActive('/dashboard/assets') ? '' : 'opacity-70'}`}
      >
        <div className="flex min-w-0 items-center">
          <Gem className={`w-[20px] h-[20px] mr-4 ${isActive('/dashboard/assets') ? 'text-gray-900' : 'text-gray-500'}`} />
          <span className={`truncate text-[14px] ${isActive('/dashboard/assets') ? 'font-bold text-[#1a1a1a]' : 'font-medium text-gray-700'}`}>
            Assets
          </span>
        </div>
        <span className={`flex-shrink-0 text-right text-[14px] ${isActive('/dashboard/assets') ? 'font-bold text-gray-800' : 'font-medium text-gray-500'}`}>
          {formatCurrency(totalAssets)}
        </span>
      </Link>

      <div className="border-t border-gray-200"></div>

      {/* Debts */}
      <Link
        href="/dashboard/debts"
        className={`flex min-w-0 items-center justify-between gap-3 px-4 py-3 hover:bg-black/5 transition-colors ${isActive('/dashboard/debts') ? '' : 'opacity-70'}`}
      >
        <div className="flex min-w-0 items-center">
          <LinkIcon className={`w-[20px] h-[20px] mr-4 ${isActive('/dashboard/debts') ? 'text-gray-900' : 'text-gray-500'}`} />
          <span className={`truncate text-[14px] ${isActive('/dashboard/debts') ? 'font-bold text-[#1a1a1a]' : 'font-medium text-gray-700'}`}>
            Debts
          </span>
        </div>
        <span className={`flex-shrink-0 text-right text-[14px] ${isActive('/dashboard/debts') ? 'font-bold text-gray-800' : 'font-medium text-gray-500'}`}>
          {formatCurrency(totalDebts)}
        </span>
      </Link>

      <div className="border-t border-gray-200 my-2"></div>

      {/* Recap */}
      <Link
        href="/dashboard/recap"
        className={`flex items-center px-4 py-3 hover:bg-black/5 transition-colors ${isActive('/dashboard/recap') ? '' : 'opacity-70'}`}
      >
        <Rewind className={`w-[20px] h-[20px] mr-4 ${isActive('/dashboard/recap') ? 'text-gray-900' : 'text-gray-500'}`} />
        <span className={`text-[14px] ${isActive('/dashboard/recap') ? 'font-bold text-[#1a1a1a]' : 'font-medium text-gray-700'}`}>
          Recap
        </span>
      </Link>

      {/* Fast Forward */}
      <Link
        href="/dashboard/fast-forward"
        className={`flex items-center px-4 py-3 hover:bg-black/5 transition-colors ${isActive('/dashboard/fast-forward') ? '' : 'opacity-70'}`}
      >
        <FastForward className={`w-[20px] h-[20px] mr-4 ${isActive('/dashboard/fast-forward') ? 'text-gray-900' : 'text-gray-500'}`} />
        <span className={`text-[14px] ${isActive('/dashboard/fast-forward') ? 'font-bold text-[#1a1a1a]' : 'font-medium text-gray-700'}`}>
          Fast Forward
        </span>
      </Link>

      <div className="border-t border-gray-200 my-2"></div>

      {/* Beneficiary */}
      <Link
        href="/dashboard/beneficiary"
        className={`flex items-center px-4 py-3 hover:bg-black/5 transition-colors ${isActive('/dashboard/beneficiary') ? '' : 'opacity-70'}`}
      >
        <Umbrella className={`w-[20px] h-[20px] mr-4 ${isActive('/dashboard/beneficiary') ? 'text-gray-900' : 'text-gray-500'}`} />
        <span className={`text-[14px] ${isActive('/dashboard/beneficiary') ? 'font-bold text-[#1a1a1a]' : 'font-medium text-gray-700'}`}>
          Beneficiary
        </span>
      </Link>
    </nav>
  )
}
