'use server'

import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function saveCashForecastPdf(base64: string, filename: string) {
  const buffer = Buffer.from(base64, 'base64')
  const dir = path.join(process.cwd(), 'screenshots')
  await mkdir(dir, { recursive: true })
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const target = path.join(dir, safeName)
  await writeFile(target, buffer)
  return { ok: true, path: `screenshots/${safeName}` }
}
