import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from '@/app/auth/actions'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile and assets
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', user.id)

  const totalNetWorth = assets?.reduce((acc, asset) => acc + Number(asset.value), 0) || 0

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Sidebar / Header */}
      <header className="border-b border-gray-100 py-4 px-6 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">KUBERA CLONE</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <form action={logout}>
            <button className="text-sm font-medium hover:underline">Logout</button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-12 px-6">
        <div className="mb-12">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-1">Net Worth</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold tracking-tighter">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: profile?.base_currency || 'USD' }).format(totalNetWorth)}
            </span>
            <span className="text-green-600 font-medium">+0.0%</span>
          </div>
        </div>

        <div className="grid gap-8">
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Assets</h3>
              <button className="text-sm bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors">
                Add Asset
              </button>
            </div>

            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assets && assets.length > 0 ? (
                    assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium">{asset.name}</td>
                        <td className="px-6 py-4 text-gray-500 capitalize">{asset.asset_type}</td>
                        <td className="px-6 py-4 text-right font-semibold">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: asset.currency }).format(asset.value)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                        No assets yet. Click "Add Asset" to start.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
