import { del } from '@vercel/blob'

/**
 * Deleting stored photos.
 *
 * The app accepts two kinds of photo: files uploaded here, and image URLs
 * pasted from elsewhere. Only the first kind is ours to delete — issuing a
 * delete for someone else's URL would at best fail and at worst remove a photo
 * we never owned. So every deletion is gated on the URL being one we created.
 */

/** Vercel Blob public URLs look like https://<id>.public.blob.vercel-storage.com/... */
const BLOB_HOST_RE = /\.public\.blob\.vercel-storage\.com$/

/** Files written by the local dev fallback in the upload route. */
const LOCAL_PREFIX = '/uploads/'

/**
 * Finds the Blob read-write token.
 *
 * Vercel names it BLOB_READ_WRITE_TOKEN by default, but prefixes it when the
 * store was created with a custom environment-variable prefix — so matching on
 * the suffix is what makes this work regardless of how the store was set up.
 */
export function resolveBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith('BLOB_READ_WRITE_TOKEN') && value) return value
  }
  return undefined
}

export function isManagedPhoto(url: string | null | undefined): boolean {
  if (!url) return false
  if (url.startsWith(LOCAL_PREFIX)) return true
  try {
    return BLOB_HOST_RE.test(new URL(url).hostname)
  } catch {
    return false
  }
}

/**
 * Removes a photo we stored, if we stored it.
 *
 * Never throws: an orphaned blob is a tidiness problem, whereas a failed save
 * because cleanup hiccuped is a real one. Failures are logged and swallowed,
 * and scripts/prune-blobs.ts exists to sweep up whatever this misses.
 */
export async function deleteStoredPhoto(url: string | null | undefined): Promise<void> {
  if (!isManagedPhoto(url)) return

  try {
    if (url!.startsWith(LOCAL_PREFIX)) {
      const { unlink } = await import('node:fs/promises')
      const path = await import('node:path')
      // Resolve and confirm containment, so a crafted path can't escape.
      const dir = path.join(process.cwd(), 'public', 'uploads')
      const target = path.resolve(dir, path.basename(url!))
      if (!target.startsWith(dir)) return
      await unlink(target).catch(() => {})
      return
    }

    const token = resolveBlobToken()
    if (!token) return
    await del(url!, { token })
  } catch (error) {
    console.error('Photo cleanup failed for', url, error)
  }
}

/** Removes a photo only when it is genuinely being replaced. */
export async function deleteReplacedPhoto(
  previous: string | null | undefined,
  next: string | null | undefined,
): Promise<void> {
  if (!previous || previous === next) return
  await deleteStoredPhoto(previous)
}
