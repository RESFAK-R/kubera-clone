import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}

export async function POST(req: Request) {
  const token = req.headers.get('authorization') || req.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET
  if (!expected || !token || !token.includes(expected)) return unauthorized()

  const supabase = createAdminClient()

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id')
    .limit(5000)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  let captured = 0
  for (const u of users ?? []) {
    const { error: rpcErr } = await supabase.rpc('capture_net_worth_snapshot', { p_user_id: u.id })
    if (!rpcErr) captured++
  }

  return NextResponse.json({ ok: true, captured, total: users?.length ?? 0 })
}
