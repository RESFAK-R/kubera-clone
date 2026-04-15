'use client'

import React, { useState } from 'react'
import { ShieldCheck, Mail, Bell, Users, Plus, Shield, Check } from 'lucide-react'

export default function BeneficiaryPage() {
  const [lifeBeatFreq, setLifeBeatFreq] = useState('3 months')

  return (
    <div className="flex-1 w-full bg-[#f4f5f5] pb-24 px-8 md:px-16 overflow-y-auto">
      <div className="max-w-[800px] mx-auto pt-16">
        
        <h1 className="text-[32px] font-bold tracking-tight text-[#1a1a1a] mb-4">
          Beneficiary
        </h1>
        <p className="text-[14px] text-gray-500 mb-12 max-w-xl leading-relaxed">
          The Beneficiary feature ensures your loved ones can access your portfolio, along with the necessary legal and financial documents, in case of an unforeseen event.
        </p>

        <div className="grid grid-cols-1 gap-8">
           {/* Section 1: Life Beat Check */}
           <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-10 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 bg-black rounded-bl-full group-hover:scale-110 transition-transform">
                 <ShieldCheck className="w-24 h-24" />
              </div>

              <div className="flex items-center gap-4 mb-8">
                 <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white">
                    <Bell className="w-6 h-6" />
                 </div>
                 <div>
                    <h2 className="text-[17px] font-bold text-[#1a1a1a]">Life Beat Check™</h2>
                    <p className="text-[13px] text-gray-400 font-medium uppercase tracking-widest">DEAD MAN SWITCH</p>
                 </div>
              </div>

              <div className="space-y-6 max-w-lg">
                 <p className="text-[14px] text-[#1a1a1a] leading-relaxed">
                   Kubera will send you a Life Beat Check email every few months. If you don't respond after multiple attempts, your portfolio and documents will be automatically shared with your beneficiaries.
                 </p>

                 <div className="flex items-center gap-8 py-4 border-t border-gray-50">
                    <div>
                       <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Frequency</span>
                       <select 
                          value={lifeBeatFreq}
                          onChange={(e) => setLifeBeatFreq(e.target.value)}
                          className="bg-gray-100 border-none rounded-[4px] px-3 py-2 text-[14px] font-bold outline-none cursor-pointer hover:bg-gray-200 transition-colors"
                       >
                          <option>1 month</option>
                          <option>3 months</option>
                          <option>6 months</option>
                          <option>1 year</option>
                       </select>
                    </div>
                    <div>
                       <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Status</span>
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-[14px] font-bold text-green-600">Active</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Section 2: Beneficiaries */}
           <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-10 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-[#1a1a1a]">
                       <Users className="w-6 h-6" />
                    </div>
                    <div>
                       <h2 className="text-[17px] font-bold text-[#1a1a1a]">Beneficiaries</h2>
                       <p className="text-[13px] text-gray-400 font-medium uppercase tracking-widest leading-none">Access Control</p>
                    </div>
                 </div>
                 <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-[4px] text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">
                    <Plus className="w-4 h-4" /> Add
                 </button>
              </div>

              <div className="border border-dashed border-gray-200 rounded-[4px] p-12 flex flex-col items-center justify-center text-center">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                    <Mail className="w-8 h-8" />
                 </div>
                 <p className="text-[14px] text-gray-400 font-medium max-w-[280px]">
                    You haven't added any beneficiaries yet. They will only be notified when you stop responding to Life Beat Checks.
                 </p>
              </div>
           </div>

           {/* Section 3: Safe Deposit Box */}
           <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-10 shadow-sm group">
              <div className="flex items-center gap-4 mb-8">
                 <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                    <Shield className="w-6 h-6" />
                 </div>
                 <div>
                    <h2 className="text-[17px] font-bold text-[#1a1a1a]">Safe Deposit Box</h2>
                    <p className="text-[13px] text-gray-400 font-medium uppercase tracking-widest leading-none">Secure Storage</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                       </div>
                       <span className="text-[14px] font-medium">Bank Grade Encryption</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                       </div>
                       <span className="text-[14px] font-medium">Auto-share with Beneficiaries</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                       </div>
                       <span className="text-[14px] font-medium">Unlimited Documents</span>
                    </div>
                 </div>

                 <div className="bg-gray-50 rounded-[4px] p-6 border border-gray-100 flex flex-col items-center justify-center text-center">
                    <span className="text-[13px] text-gray-500 font-medium mb-4">Secure your passwords, recovery seeds and estate documents.</span>
                    <button className="text-[12px] font-bold text-blue-600 hover:underline uppercase tracking-widest">
                       Learn More
                    </button>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  )
}
