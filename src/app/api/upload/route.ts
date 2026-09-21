import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { put } from '@vercel/blob'
import { isSignedIn } from '@/lib/auth'

const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
])

/**
 * Photo upload.
 *
 * Goes to Vercel Blob when BLOB_READ_WRITE_TOKEN is present, and falls back to
 * writing under `public/uploads` when it isn't — so a fresh clone can add
 * photos locally without anyone having to provision a blob store first. The
 * rest of the app only ever handles the returned URL, so neither path is
 * special-cased anywhere else.
 */
export async function POST(request: Request) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That image is over 8MB' }, { status: 413 })
  }

  const ext = ALLOWED.get(file.type)
  if (!ext) {
    return NextResponse.json({ error: 'Use a JPEG, PNG, WebP or GIF' }, { status: 415 })
  }

  // Name the file ourselves — never trust the client's filename on a path.
  const name = `${randomUUID()}.${ext}`

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`recipes/${name}`, file, {
      access: 'public',
      contentType: file.type,
    })
    return NextResponse.json({ url: blob.url })
  }

  // Local development without a blob store. Vercel's filesystem is read-only,
  // so this branch never runs in production — the token is always set there.
  const { mkdir, writeFile } = await import('node:fs/promises')
  const path = await import('node:path')
  const dir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()))
  return NextResponse.json({ url: `/uploads/${name}` })
}
