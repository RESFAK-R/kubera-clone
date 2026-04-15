import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/app/auth/actions'
import Link from 'next/link'
import { LogOut, Menu } from 'lucide-react'
import { SidebarNavLinks } from '@/components/dashboard/SidebarNavLinks'


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

  // Calculate totals
  let totalAssets = 0
  let totalDebts = 0

  assets?.forEach(asset => {
    const val = Number(asset.value)
    if (asset.asset_type === 'liability') {
      totalDebts += val
    } else {
      totalAssets += val
    }
  })

  const totalNetWorth = totalAssets - totalDebts

  return (
    <div className="flex h-screen bg-[#f4f5f5] text-[#1a1a1a] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[260px] flex-shrink-0 border-r border-[#e5e7eb] flex flex-col justify-between hidden md:flex bg-[#f4f5f5]">
        <div>
          <div className="h-20 flex items-center px-6 mb-4">
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
      <main className="flex-1 flex flex-col h-full bg-[#f4f5f5] overflow-y-auto relative">
        {/* Top Right Icons Header */}
        <header className="sticky top-0 right-0 p-8 flex justify-end items-center space-x-8 text-[#1a1a1a] z-50 w-full bg-[#f4f5f5]/80 backdrop-blur-sm">
          <div className="flex items-center space-x-6">
            <button className="text-gray-900 hover:bg-black/5 p-1 rounded transition" title="Refresh">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 22v-6h6"/></svg>
            </button>
            <button className="text-gray-900 hover:bg-black/5 p-1 rounded transition" title="Search">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button className="text-gray-900 hover:bg-black/5 p-1 rounded transition" title="Share">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            <Link href="/dashboard/ai-assistant" className="text-gray-900 hover:bg-black/5 p-1 rounded transition" title="AI Assistant">
               <svg width="20" height="20" viewBox="0 0 41 41" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.227-3.274 10.079 10.079 0 0 0-10.855 4.835 9.965 9.965 0 0 0-6.227 3.274 10.079 10.079 0 0 0-2.372 10.538 9.962 9.962 0 0 0 .856 8.184 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.228 3.274 10.079 10.079 0 0 0 10.854-4.835 9.965 9.965 0 0 0 6.228-3.274 10.079 10.079 0 0 0 2.372-10.538zm-15.532 8.365a7.453 7.453 0 0 1-4.773-1.718l.236-.134 7.922-4.575a.912.912 0 0 0 .461-.8V13.14l3.349 1.934a.085.085 0 0 1 .046.065v9.268a7.473 7.473 0 0 1-7.241 5.828zm-15.701-6.849a7.43 7.43 0 0 1-.888-4.987l.236.142 7.922 4.574a.913.913 0 0 0 .924 0L23.419 13.9v3.868a.087.087 0 0 1-.035.073l-8.008 4.622a7.472 7.472 0 0 1-9.077-3.077zm-2.043-17.479a7.44 7.44 0 0 1 3.882-3.272l-.001.271v9.147a.914.914 0 0 0 .462.8l9.406 5.432-3.349 1.934a.086.086 0 0 1-.082.007L6.566 11.2a7.473 7.473 0 0 1-.31-9.293zm27.556 6.412-9.406-5.432 3.349-1.934a.086.086 0 0 1 .082-.007l7.945 4.586a7.474 7.474 0 0 1-1.158 13.528v-9.418a.914.914 0 0 0-.812-.323zm3.332-5.01-.236-.143-7.922-4.574a.912.912 0 0 0-.924 0l-9.406 5.432V13.9a.087.087 0 0 1 .035.073l8.008 4.622a7.473 7.473 0 0 1 9.077 3.077 7.43 7.43 0 0 1 .888 4.987l-.236-.142-7.922-4.575a.912.912 0 0 0-.924 0l-9.406 5.432v-3.868a.087.087 0 0 1 .035-.073l8.008-4.622a7.473 7.473 0 0 1 9.085-3.079 7.43 7.43 0 0 1 .888-4.987l-.001-.001z"/></svg>
            </Link>
            
            <div className="flex items-center space-x-4 ml-4">
              <button className="flex items-center text-[15px] font-medium text-gray-800 transition">
                 {baseCurrency} {baseCurrency === 'EUR' ? '€' : '$'} <span className="ml-1 text-[8px]">▼</span>
              </button>

              <button className="flex items-center text-[15px] font-medium text-gray-800 transition gap-3 group">
                 <span className="group-hover:underline">{userName}</span> <span className="text-[8px]">▼</span>
                 <div className="w-9 h-9 rounded-full border border-gray-300 overflow-hidden shadow-sm">
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} alt="Avatar" className="w-full h-full object-cover" />
                 </div>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}
