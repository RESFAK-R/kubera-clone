import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/app/auth/actions'
import Link from 'next/link'
import { Bot, LogOut, Menu, RefreshCw, Search, Share2 } from 'lucide-react'
import { SidebarNavLinks } from '@/components/dashboard/SidebarNavLinks'
import { computeNetWorthTotals } from '@/lib/netWorth'
import type { Asset } from '@/types/db'


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile and assets for dynamic values
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', user.id)

  const baseCurrency = profile?.base_currency || 'EUR'
  const userName = profile?.full_name || user.email?.split('@')[0] || 'User'

  const {
    totalAssets,
    totalDebts,
    netWorth: totalNetWorth,
  } = computeNetWorthTotals((assets ?? []) as Asset[])

  return (
    <div className="flex h-dvh bg-[#f4f5f5] text-[#1a1a1a] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[260px] flex-shrink-0 border-r border-[#e5e7eb] flex-col justify-between hidden lg:flex bg-[#f4f5f5]">
        <div className="min-w-0">
          <div className="h-20 flex items-center px-6 mb-4 min-w-0">
            <Menu className="w-5 h-5 mr-4 text-gray-500 cursor-pointer" />
            <span className="font-bold tracking-[0.15em] text-[18px]">KUBERA</span>
          </div>
          
          <SidebarNavLinks
            totalNetWorth={totalNetWorth}
            totalAssets={totalAssets}
            totalDebts={totalDebts}
            baseCurrency={baseCurrency}
          />
        </div>

        <div className="p-6 text-[12px] text-gray-500">
          <div className="space-y-4">
            <div>
              <p className="font-bold text-gray-700 mb-1">Get Kubera on mobile</p>
              <p className="text-[11px] leading-relaxed">Go to app.kubera.com on your phone and follow instructions to install it as an app. <span className="underline cursor-pointer">Know more</span></p>
            </div>
            
            <div>
              <p className="flex items-center text-red-500 font-bold mb-1">
                <span className="mr-1">❤️</span> Kubera Hearts
              </p>
              <p className="text-[11px]">$200 for you. $200 for your friend.</p>
              <p className="underline cursor-pointer mt-1">Know more</p>
            </div>

            <div className="pt-4 mt-6 border-t border-gray-200">
               <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="truncate max-w-[150px] font-bold text-gray-900">{userName}</span>
                  </div>
                  <form action={logout}>
                    <button type="submit" className="text-gray-400 hover:text-black" title="Logout">
                      <LogOut className="w-[16px] h-[16px]" />
                    </button>
                  </form>
               </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 flex flex-col h-full bg-[#f4f5f5] overflow-y-auto overflow-x-hidden relative">
        {/* Top Right Icons Header */}
        <header className="sticky top-0 right-0 z-50 w-full bg-[#f4f5f5]/85 backdrop-blur-sm px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center justify-between gap-4 text-[#1a1a1a]">
            <div className="flex items-center gap-3 lg:hidden min-w-0">
              <Menu className="w-5 h-5 text-gray-500" />
              <span className="font-bold tracking-[0.15em] text-[16px]">KUBERA</span>
            </div>

            <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3 sm:gap-5">
            <button className="text-gray-900 hover:bg-black/5 p-1 rounded transition" title="Refresh">
               <RefreshCw className="w-5 h-5" />
            </button>
            <button className="text-gray-900 hover:bg-black/5 p-1 rounded transition" title="Search">
               <Search className="w-5 h-5" />
            </button>
            <button className="text-gray-900 hover:bg-black/5 p-1 rounded transition" title="Share">
               <Share2 className="w-5 h-5" />
            </button>
            <Link href="/dashboard/ai-assistant" className="text-gray-900 hover:bg-black/5 p-1 rounded transition" title="AI Assistant">
               <Bot className="w-5 h-5" />
            </Link>
            
            <div className="flex min-w-0 items-center gap-3 sm:gap-4 sm:ml-2">
              <button className="flex items-center text-[15px] font-medium text-gray-800 transition">
                 {baseCurrency} {baseCurrency === 'EUR' ? '€' : '$'} <span className="ml-1 text-[8px]">▼</span>
              </button>

              <button className="flex min-w-0 items-center text-[15px] font-medium text-gray-800 transition gap-2 sm:gap-3 group">
                 <span className="hidden max-w-[160px] truncate group-hover:underline sm:inline">{userName}</span> <span className="hidden text-[8px] sm:inline">▼</span>
                 <div className="w-9 h-9 flex-shrink-0 rounded-full border border-gray-300 overflow-hidden shadow-sm">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} alt="Avatar" className="w-full h-full object-cover" />
                 </div>
              </button>
            </div>
            </div>
          </div>
        </header>

        <div className="min-w-0 flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}
