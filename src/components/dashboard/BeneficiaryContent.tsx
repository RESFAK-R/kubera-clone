'use client'

import { useState, useTransition, useRef } from 'react'
import { ShieldCheck, Mail, Bell, Users, Plus, Shield, Check, Trash2, Edit2, Upload, FileText, Download } from 'lucide-react'
import {
  upsertBeneficiary,
  deleteBeneficiary,
  updateLifeBeat,
  resetLifeBeatTimer,
  type BeneficiaryInput,
} from '@/app/dashboard/beneficiary/actions'
import { uploadDocument, deleteDocument, getDocumentUrl } from '@/app/dashboard/beneficiary/document-actions'
import type { Beneficiary, BeneficiaryRole, LifeBeatState, Document } from '@/types/db'

const ROLE_LABEL: Record<BeneficiaryRole, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  trusted_angel: 'Trusted Angel',
}

const INTERVAL_OPTIONS = [
  { value: 30, label: '1 month' },
  { value: 45, label: '45 days (default)' },
  { value: 90, label: '3 months' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
]

function daysUntilTrigger(state: LifeBeatState | null): number | null {
  if (!state || !state.enabled) return null
  const last = new Date(state.last_active_at)
  const target = new Date(last)
  target.setDate(target.getDate() + state.check_interval_days)
  const diffMs = target.getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export function BeneficiaryContent({
  beneficiaries,
  lifeBeat,
  documents,
}: {
  beneficiaries: Beneficiary[]
  lifeBeat: LifeBeatState | null
  documents: Document[]
}) {
  const [editing, setEditing] = useState<BeneficiaryRole | null>(null)
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<string | null>(null)

  const [interval, setInterval] = useState<number>(lifeBeat?.check_interval_days ?? 45)
  const [enabled, setEnabled] = useState<boolean>(lifeBeat?.enabled ?? true)

  const daysLeft = daysUntilTrigger({
    ...(lifeBeat ?? ({} as LifeBeatState)),
    check_interval_days: interval,
    enabled,
    last_active_at: lifeBeat?.last_active_at ?? new Date().toISOString(),
  } as LifeBeatState)

  const byRole = new Map(beneficiaries.map((b) => [b.role, b]))
  const hasAny = beneficiaries.length > 0

  function handleLifeBeatSave() {
    startTransition(async () => {
      const res = await updateLifeBeat({ check_interval_days: interval, enabled })
      setFeedback(res.success ? 'Life Beat updated.' : `Error: ${res.error}`)
    })
  }

  function handleReset() {
    startTransition(async () => {
      const res = await resetLifeBeatTimer()
      setFeedback(res.success ? 'Timer reset.' : `Error: ${res.error}`)
    })
  }

  return (
    <div className="flex-1 w-full bg-[#f4f5f5] pb-24 px-8 md:px-16 overflow-y-auto">
      <div className="max-w-[800px] mx-auto pt-16">
        <h1 className="text-[32px] font-bold tracking-tight text-[#1a1a1a] mb-4">Beneficiary</h1>
        <p className="text-[14px] text-gray-500 mb-12 max-w-xl leading-relaxed">
          The Beneficiary feature ensures your loved ones can access your portfolio, along with the
          necessary legal and financial documents, in case of an unforeseen event.
        </p>

        {feedback && (
          <div className="mb-6 p-3 bg-green-50 text-green-800 text-[13px] font-medium rounded-[4px] border border-green-100">
            {feedback}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
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
                <p className="text-[13px] text-gray-400 font-medium uppercase tracking-widest">
                  DEAD MAN SWITCH
                </p>
              </div>
            </div>

            <div className="space-y-6 max-w-lg">
              <p className="text-[14px] text-[#1a1a1a] leading-relaxed">
                We&apos;ll send you a Life Beat Check email every {interval} days. If you don&apos;t
                respond after multiple attempts, your portfolio and documents will be shared with
                your beneficiaries.
              </p>

              <div className="flex items-center gap-8 py-4 border-t border-gray-50 flex-wrap">
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                    Frequency
                  </span>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
                    className="bg-gray-100 border-none rounded-[4px] px-3 py-2 text-[14px] font-bold outline-none cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    {INTERVAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                    Status
                  </span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                    <span className={`text-[14px] font-bold ${enabled ? 'text-green-600' : 'text-gray-500'}`}>
                      {enabled ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>
                {daysLeft !== null && (
                  <div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                      Next Check
                    </span>
                    <span className="text-[14px] font-bold text-[#1a1a1a]">in {daysLeft} days</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEnabled((e) => !e)}
                  className="px-4 py-2 bg-gray-100 rounded-[4px] text-[12px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors"
                >
                  {enabled ? 'Pause' : 'Enable'}
                </button>
                <button
                  onClick={handleLifeBeatSave}
                  disabled={pending}
                  className="px-4 py-2 bg-black text-white rounded-[4px] text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={handleReset}
                  disabled={pending}
                  className="px-4 py-2 bg-green-600 text-white rounded-[4px] text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  I&apos;m OK
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-10 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-[#1a1a1a]">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-[#1a1a1a]">Beneficiaries</h2>
                  <p className="text-[13px] text-gray-400 font-medium uppercase tracking-widest leading-none">
                    Access Control
                  </p>
                </div>
              </div>
              {!editing && (
                <button
                  onClick={() => setEditing('primary')}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-[4px] text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              )}
            </div>

            {editing && (
              <BeneficiaryForm
                initial={byRole.get(editing) ?? null}
                defaultRole={editing}
                onClose={() => setEditing(null)}
                onSaved={() => {
                  setEditing(null)
                  setFeedback('Beneficiary saved.')
                }}
              />
            )}

            {!editing && !hasAny && (
              <div className="border border-dashed border-gray-200 rounded-[4px] p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                  <Mail className="w-8 h-8" />
                </div>
                <p className="text-[14px] text-gray-400 font-medium max-w-[280px]">
                  You haven&apos;t added any beneficiaries yet. They will only be notified when you
                  stop responding to Life Beat Checks.
                </p>
              </div>
            )}

            {!editing && hasAny && (
              <div className="space-y-3">
                {beneficiaries.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-[4px] hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <div className="text-[14px] font-bold text-[#1a1a1a]">{b.full_name}</div>
                      <div className="text-[12px] text-gray-500">
                        {ROLE_LABEL[b.role]} • {b.email}
                        {b.relationship ? ` • ${b.relationship}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditing(b.role)}
                        className="p-2 rounded hover:bg-gray-100 text-gray-500"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${b.full_name}?`)) {
                            startTransition(async () => {
                              const res = await deleteBeneficiary(b.role)
                              setFeedback(res.success ? 'Beneficiary removed.' : `Error: ${res.error}`)
                            })
                          }
                        }}
                        className="p-2 rounded hover:bg-red-50 text-red-500"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-4">
                  {(['primary', 'secondary', 'trusted_angel'] as BeneficiaryRole[])
                    .filter((r) => !byRole.has(r))
                    .map((r) => (
                      <button
                        key={r}
                        onClick={() => setEditing(r)}
                        className="px-3 py-2 bg-gray-100 text-[11px] font-bold uppercase tracking-widest rounded-[4px] hover:bg-gray-200 transition-colors"
                      >
                        + {ROLE_LABEL[r]}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <SafeDepositBox documents={documents} onFeedback={setFeedback} />
        </div>
      </div>
    </div>
  )
}

function SafeDepositBox({
  documents,
  onFeedback,
}: {
  documents: Document[]
  onFeedback: (msg: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [share, setShare] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('Choose a file first.')
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', title || file.name)
    if (category) fd.append('category', category)
    fd.append('share', share ? 'true' : 'false')
    startTransition(async () => {
      const res = await uploadDocument(fd)
      if (!res.success) {
        setError(res.error)
        return
      }
      setTitle('')
      setCategory('')
      setShowForm(false)
      if (fileRef.current) fileRef.current.value = ''
      onFeedback('Document uploaded.')
    })
  }

  function openDoc(id: string) {
    startTransition(async () => {
      const res = await getDocumentUrl(id)
      if (res.success && res.data) {
        window.open(res.data.url, '_blank', 'noopener,noreferrer')
      } else if (!res.success) {
        onFeedback(`Error: ${res.error}`)
      }
    })
  }

  function remove(id: string) {
    if (!confirm('Delete this document?')) return
    startTransition(async () => {
      const res = await deleteDocument(id)
      onFeedback(res.success ? 'Document deleted.' : `Error: ${res.error}`)
    })
  }

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-10 shadow-sm group">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-[17px] font-bold text-[#1a1a1a]">Safe Deposit Box</h2>
            <p className="text-[13px] text-gray-400 font-medium uppercase tracking-widest leading-none">
              Secure Storage
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-[4px] text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="border border-gray-200 rounded-[4px] p-6 bg-gray-50 space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Last Will & Testament"
                className="bg-white border border-gray-200 rounded-[4px] px-3 py-2 text-[14px]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Category</span>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Estate / Insurance / Passwords…"
                className="bg-white border border-gray-200 rounded-[4px] px-3 py-2 text-[14px]"
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">File (max 25 MB)</span>
              <input ref={fileRef} type="file" className="text-[13px]" required />
            </label>
            <label className="flex items-center gap-2 md:col-span-2 text-[13px]">
              <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
              Share with beneficiaries when Life Beat triggers
            </label>
          </div>
          {error && <div className="text-[13px] text-red-600 font-medium">{error}</div>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 bg-black text-white rounded-[4px] text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {pending ? 'Uploading…' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 rounded-[4px] text-[12px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {documents.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            {['Bank Grade Encryption', 'Auto-share with Beneficiaries', 'Up to 25 MB per file'].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span className="text-[14px] font-medium">{f}</span>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-[4px] p-6 border border-gray-100 flex flex-col items-center justify-center text-center">
            <span className="text-[13px] text-gray-500 font-medium">
              Secure your passwords, recovery seeds and estate documents.
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between px-4 py-3 border border-gray-100 rounded-[4px] hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[14px] font-bold truncate">{d.title}</div>
                  <div className="text-[11px] text-gray-500 uppercase tracking-widest">
                    {d.category ?? 'Document'} • {Math.max(1, Math.round((d.size_bytes ?? 0) / 1024))} KB
                    {d.share_with_beneficiaries && ' • shared'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openDoc(d.id)}
                  className="p-2 rounded hover:bg-gray-100 text-gray-500"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(d.id)}
                  className="p-2 rounded hover:bg-red-50 text-red-500"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BeneficiaryForm({
  initial,
  defaultRole,
  onClose,
  onSaved,
}: {
  initial: Beneficiary | null
  defaultRole: BeneficiaryRole
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<BeneficiaryInput>({
    role: (initial?.role ?? defaultRole) as BeneficiaryRole,
    full_name: initial?.full_name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    relationship: initial?.relationship ?? '',
    notes: initial?.notes ?? '',
  })

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await upsertBeneficiary(form)
      if (res.success) {
        onSaved()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="border border-gray-200 rounded-[4px] p-6 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Role</span>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as BeneficiaryRole })}
            className="bg-white border border-gray-200 rounded-[4px] px-3 py-2 text-[14px]"
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="trusted_angel">Trusted Angel</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Full Name</span>
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="bg-white border border-gray-200 rounded-[4px] px-3 py-2 text-[14px]"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="bg-white border border-gray-200 rounded-[4px] px-3 py-2 text-[14px]"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Phone (optional)</span>
          <input
            value={form.phone || ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="bg-white border border-gray-200 rounded-[4px] px-3 py-2 text-[14px]"
          />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Relationship</span>
          <input
            value={form.relationship || ''}
            onChange={(e) => setForm({ ...form, relationship: e.target.value })}
            placeholder="Spouse, Parent, Friend…"
            className="bg-white border border-gray-200 rounded-[4px] px-3 py-2 text-[14px]"
          />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Notes</span>
          <textarea
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="bg-white border border-gray-200 rounded-[4px] px-3 py-2 text-[14px]"
          />
        </label>
      </div>

      {error && <div className="mt-4 text-[13px] text-red-600 font-medium">{error}</div>}

      <div className="flex gap-3 mt-6">
        <button
          onClick={submit}
          disabled={pending}
          className="px-4 py-2 bg-black text-white rounded-[4px] text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 rounded-[4px] text-[12px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
