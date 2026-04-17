'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, Document } from '@/types/db'

const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED = /^(application|image|text)\//

const DocMeta = z.object({
  title: z.string().min(1).max(200),
  category: z.string().max(80).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  share_with_beneficiaries: z.boolean().default(true),
})

export async function uploadDocument(formData: FormData): Promise<ActionResult<Document>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const file = formData.get('file')
  if (!(file instanceof File)) return { success: false, error: 'No file provided' }
  if (file.size > MAX_BYTES) return { success: false, error: 'File exceeds 25 MB limit' }
  if (!ALLOWED.test(file.type)) return { success: false, error: `Unsupported type ${file.type}` }

  const parsed = DocMeta.safeParse({
    title: formData.get('title'),
    category: formData.get('category') ?? undefined,
    notes: formData.get('notes') ?? undefined,
    share_with_beneficiaries: formData.get('share') === 'on' || formData.get('share') === 'true',
  })
  if (!parsed.success) return { success: false, error: parsed.error.issues.map((i) => i.message).join(', ') }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadErr } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadErr) return { success: false, error: uploadErr.message }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      category: parsed.data.category || null,
      notes: parsed.data.notes || null,
      share_with_beneficiaries: parsed.data.share_with_beneficiaries,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select()
    .single()

  if (error) {
    await supabase.storage.from('documents').remove([storagePath])
    return { success: false, error: error.message }
  }

  await supabase.rpc('touch_life_beat', { p_user_id: user.id })
  revalidatePath('/dashboard/beneficiary')
  return { success: true, data: data as Document }
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: doc, error: fetchErr } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (fetchErr || !doc) return { success: false, error: 'Document not found' }

  await supabase.storage.from('documents').remove([doc.storage_path])

  const { error } = await supabase.from('documents').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/beneficiary')
  return { success: true }
}

export async function getDocumentUrl(id: string): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!doc) return { success: false, error: 'Document not found' }

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, 600)
  if (error || !data) return { success: false, error: error?.message ?? 'Signed URL failed' }

  return { success: true, data: { url: data.signedUrl } }
}
