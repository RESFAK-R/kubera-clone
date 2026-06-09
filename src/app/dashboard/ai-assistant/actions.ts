'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { buildFinancialContext, renderSystemPrompt } from '@/lib/aiContext'
import type { ActionResult, AiConversation, AiMessage, Asset, NetWorthSnapshot, RecurringRule } from '@/types/db'
import type { RuleDefinition } from '@/types/rules'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
const MAX_TOKENS = 1024

async function callAnthropic(system: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not configured')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: system,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${body}`)
  }

  const json = (await res.json()) as {
    content: Array<{ type: string; text: string }>
    usage?: { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number }
  }
  const text = json.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n')
  return { text, usage: json.usage }
}

export async function listConversations(): Promise<AiConversation[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50)
  return (data ?? []) as AiConversation[]
}

export async function getMessages(conversationId: string): Promise<AiMessage[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  return (data ?? []) as AiMessage[]
}

export async function askAssistant(
  conversationId: string | null,
  userMessage: string,
): Promise<ActionResult<{ conversationId: string; reply: string }>> {
  if (!userMessage.trim()) return { success: false, error: 'Empty message' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  let convId = conversationId

  if (!convId) {
    const title = userMessage.slice(0, 60)
    const { data: created, error: insertErr } = await supabase
      .from('ai_conversations')
      .insert({ user_id: user.id, title })
      .select()
      .single()
    if (insertErr || !created) return { success: false, error: insertErr?.message ?? 'Failed to create conversation' }
    convId = created.id as string
  }

  await supabase.from('ai_messages').insert({
    conversation_id: convId,
    user_id: user.id,
    role: 'user',
    content: userMessage,
  })

  const [{ data: profile }, { data: assets }, { data: rules }, { data: recurring }, { data: snapshots }, { data: priorMessages }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('assets').select('*').eq('user_id', user.id),
    supabase.from('scenario_rules').select('*').eq('user_id', user.id),
    supabase.from('recurring_rules').select('*').eq('user_id', user.id).eq('enabled', true),
    supabase
      .from('net_worth_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(60),
    supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', convId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ])

  const ctx = buildFinancialContext({
    baseCurrency: profile?.base_currency ?? 'EUR',
    assets: (assets ?? []) as Asset[],
    rules: (rules ?? []) as RuleDefinition[],
    recurring: (recurring ?? []) as RecurringRule[],
    snapshots: ((snapshots ?? []) as NetWorthSnapshot[]).slice().reverse(),
  })

  const system = renderSystemPrompt(ctx)
  const messages = ((priorMessages ?? []) as AiMessage[])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  let reply: string
  let usage: { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number } | undefined
  try {
    const r = await callAnthropic(system, messages)
    reply = r.text
    usage = r.usage
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }

  await supabase.from('ai_messages').insert({
    conversation_id: convId,
    user_id: user.id,
    role: 'assistant',
    content: reply,
    tokens_in: usage?.input_tokens ?? null,
    tokens_out: usage?.output_tokens ?? null,
    cached_tokens: usage?.cache_read_input_tokens ?? null,
    model: MODEL,
  })

  await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId)
  await supabase.rpc('touch_life_beat', { p_user_id: user.id })

  revalidatePath('/dashboard/ai-assistant')
  return { success: true, data: { conversationId: convId, reply } }
}

export async function deleteConversation(conversationId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/ai-assistant')
  return { success: true }
}
