'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Search, Wand2, PieChart, TrendingUp, Shield, Sparkles, Trash2, Plus } from 'lucide-react'
import { askAssistant, deleteConversation } from '@/app/dashboard/ai-assistant/actions'
import type { AiConversation, AiMessage } from '@/types/db'

const SUGGESTIONS = [
  { text: "What's my asset allocation?", icon: PieChart },
  { text: 'How is my crypto performing vs 30 days ago?', icon: TrendingUp },
  { text: 'Am I on track to reach €1M net worth in 10 years?', icon: Sparkles },
  { text: 'Summarize my debts and monthly expenses', icon: Shield },
]

export function AIAssistantContent({
  initialConversations,
  initialConversationId,
  initialMessages,
}: {
  initialConversations: AiConversation[]
  initialConversationId: string | null
  initialMessages: AiMessage[]
}) {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeId, setActiveId] = useState<string | null>(initialConversationId)
  const [messages, setMessages] = useState<Pick<AiMessage, 'role' | 'content'>[]>(initialMessages.map((m) => ({ role: m.role, content: m.content })))
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function ask(text: string) {
    if (!text.trim() || pending) return
    setError(null)
    const userMsg = { role: 'user' as const, content: text }
    setMessages((m) => [...m, userMsg])
    setQuery('')
    startTransition(async () => {
      const res = await askAssistant(activeId, text)
      if (!res.success) {
        setError(res.error)
        setMessages((m) => m.slice(0, -1))
        return
      }
      const { conversationId, reply } = res.data!
      setActiveId(conversationId)
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
      if (!conversations.some((c) => c.id === conversationId)) {
        setConversations((cs) => [
          { id: conversationId, user_id: '', title: text.slice(0, 60), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          ...cs,
        ])
      }
    })
  }

  function newChat() {
    setActiveId(null)
    setMessages([])
    setError(null)
  }

  function removeConv(id: string) {
    if (!confirm('Delete this conversation?')) return
    startTransition(async () => {
      const res = await deleteConversation(id)
      if (res.success) {
        setConversations((cs) => cs.filter((c) => c.id !== id))
        if (activeId === id) newChat()
      }
    })
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex w-full min-w-0 overflow-hidden bg-[#f4f5f5] px-4 pb-20 sm:px-6 lg:px-8">
      <aside className="hidden w-[220px] flex-shrink-0 flex-col pr-6 pt-8 xl:flex">
        <button
          onClick={newChat}
          className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-[4px] text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity mb-4"
        >
          <Plus className="w-4 h-4" /> New chat
        </button>
        <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">History</div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.length === 0 && (
            <div className="text-[12px] text-gray-400 italic">No conversations yet.</div>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center justify-between px-3 py-2 rounded-[4px] cursor-pointer text-[13px] ${
                c.id === activeId ? 'bg-black text-white' : 'hover:bg-gray-200 text-[#1a1a1a]'
              }`}
              onClick={() => setActiveId(c.id)}
            >
              <span className="truncate">{c.title || 'Untitled'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeConv(c.id)
                }}
                className="opacity-0 group-hover:opacity-100 p-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className="mx-auto flex min-w-0 flex-1 flex-col pt-8 xl:max-w-[720px]">
        <div className="flex items-center gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white">
            <Wand2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-[30px] font-bold tracking-tight text-[#1a1a1a] sm:text-[32px]">AI Assistant</h1>
            <p className="text-[12px] text-gray-400 font-medium uppercase tracking-widest sm:text-[14px]">
              Natural Language Portfolio Query
            </p>
          </div>
        </div>

        <div className="relative mb-6 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-black transition-colors sm:left-6 sm:w-6 sm:h-6" />
          <input
            type="text"
            placeholder="Ask anything about your portfolio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask(query)}
            disabled={pending}
            className="h-14 w-full rounded-full border border-[#e5e7eb] bg-white pl-12 pr-20 text-[15px] shadow-lg outline-none transition-all focus:ring-2 focus:ring-black/5 disabled:opacity-60 sm:h-16 sm:pl-16 sm:pr-28 sm:text-[18px]"
          />
          <button
            onClick={() => ask(query)}
            disabled={pending || !query.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-black px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-gray-800 disabled:opacity-50 sm:right-4 sm:px-6 sm:text-[13px]"
          >
            {pending ? '…' : 'ASK'}
          </button>
        </div>

        {error && (
          <div className="mb-4 text-[13px] text-red-600 font-medium bg-red-50 border border-red-100 rounded-[4px] p-3">
            {error}
          </div>
        )}

        {!hasMessages && (
          <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => ask(s.text)}
                disabled={pending}
                className="flex min-w-0 items-center gap-4 bg-white border border-[#e5e7eb] rounded-[4px] p-5 hover:border-black transition-all text-left shadow-sm group disabled:opacity-50 sm:p-6"
              >
                <s.icon className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
                <span className="text-[14px] font-medium text-[#1a1a1a]">{s.text}</span>
              </button>
            ))}
          </div>
        )}

        {hasMessages && (
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-4 rounded-[8px] ${
                  m.role === 'user'
                    ? 'bg-black text-white sm:ml-12'
                    : 'bg-white border border-[#e5e7eb] sm:mr-12'
                }`}
              >
                <div className="text-[11px] font-bold uppercase tracking-widest opacity-70 mb-2">
                  {m.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className="text-[14px] whitespace-pre-wrap leading-relaxed">{m.content}</div>
              </div>
            ))}
            {pending && (
              <div className="bg-white border border-[#e5e7eb] p-4 rounded-[8px] text-[14px] text-gray-500 italic sm:mr-12">
                Thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  )
}
