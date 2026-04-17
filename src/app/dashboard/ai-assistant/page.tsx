import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AIAssistantContent } from '@/components/dashboard/AIAssistantContent'
import type { AiConversation, AiMessage } from '@/types/db'

export default async function AiAssistantPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: conversations } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  const convs = (conversations ?? []) as AiConversation[]
  const activeId = convs[0]?.id ?? null

  let messages: AiMessage[] = []
  if (activeId) {
    const { data } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', activeId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    messages = (data ?? []) as AiMessage[]
  }

  return (
    <AIAssistantContent
      initialConversations={convs}
      initialConversationId={activeId}
      initialMessages={messages}
    />
  )
}
