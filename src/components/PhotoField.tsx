'use client'

import { useRef, useState } from 'react'

/**
 * Accepts either an uploaded file or a pasted image URL, and stores a URL
 * either way — so the same field works whether the photo lives on disk in dev
 * or on a blob host in production.
 */
export function PhotoField({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      onChange(json.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">Photo</span>
      <input type="hidden" name="photoUrl" value={value} />

      {value ? (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="size-24 rounded-[10px] object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-ink-soft text-sm underline"
          >
            Remove
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="bg-raised border-rule text-ink-soft rounded-full border px-3 py-1.5 text-sm disabled:opacity-60"
        >
          {uploading ? 'Uploading…' : value ? 'Replace photo' : 'Upload a photo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
        <input
          type="url"
          placeholder="…or paste an image URL"
          defaultValue={value.startsWith('/uploads/') ? '' : value}
          onBlur={(e) => e.target.value && onChange(e.target.value.trim())}
          className="field flex-1 min-w-48 text-sm"
        />
      </div>

      {error ? (
        <p className="text-warn text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
