import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
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
 * Writes to `public/uploads` on disk, which works locally and on any host with
 * a persistent filesystem. On a read-only serverless host this needs swapping
 * for a blob store — see README "Deploying".
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
  const dir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()))

  return NextResponse.json({ url: `/uploads/${name}` })
}
