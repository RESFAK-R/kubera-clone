'use client'

import React, { useState } from 'react'
import { Search, Sparkles, Wand2, PieChart, TrendingUp, Shield } from 'lucide-react'

export default function AiAssistantPage() {
  const [query, setQuery] = useState('')

  const suggestions = [
    { text: "What's my asset allocation?", icon: PieChart },
    { text: "Show my crypto performance", icon: TrendingUp },
    { text: "Check my beneficiary status", icon: Shield },
    { text: "Total value of Real Estate", icon: Sparkles }
  ]

  return (
    <div className="flex-1 w-full bg-[#f4f5f5] pb-24 px-8 md:px-16 overflow-hidden flex flex-col items-center">
      <div className="max-w-[700px] w-full pt-20 flex-1 flex flex-col">
          
          <div className="flex items-center gap-4 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
             <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white">
                <Wand2 className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-[32px] font-bold tracking-tight text-[#1a1a1a]">AI Assistant</h1>
                <p className="text-[14px] text-gray-400 font-medium uppercase tracking-widest">Natural Language Portfolio Query</p>
             </div>
          </div>

          <div className="relative mb-12 group animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-300 group-focus-within:text-black transition-colors" />
             <input 
                type="text"
                placeholder="Ask anything about your portfolio..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-16 pl-16 pr-8 bg-white border border-[#e5e7eb] rounded-full shadow-lg text-[18px] outline-none focus:ring-2 focus:ring-black/5 transition-all"
             />
             <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-black text-white px-6 py-2 rounded-full text-[13px] font-bold uppercase tracking-widest cursor-pointer hover:bg-gray-800 transition-colors">
                ASK
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-1000 delay-300">
             {suggestions.map((s, idx) => (
                <button 
                  key={idx}
                  onClick={() => setQuery(s.text)}
                  className="flex items-center gap-4 p-6 bg-white border border-[#e5e7eb] rounded-[4px] hover:border-black transition-all text-left shadow-sm group"
                >
                   <s.icon className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
                   <span className="text-[14px] font-medium text-[#1a1a1a]">{s.text}</span>
                </button>
             ))}
          </div>

          {/* Results Area Placeholder */}
          <div className="mt-12 flex-1 border-t border-gray-100 pt-12 opacity-30 flex flex-col items-center justify-center text-center">
             <div className="w-12 h-12 bg-black rounded-t-[100px] relative mb-6">
                <div className="absolute top-4 left-2 w-2 h-2 bg-white rounded-full"></div>
                <div className="absolute top-4 right-2 w-2 h-2 bg-white rounded-full"></div>
             </div>
             <p className="text-[14px] max-w-[280px]">Ask a question to see a detailed analysis of your portfolio.</p>
          </div>

      </div>
    </div>
  )
}
