'use client'

import { useEffect, useState, useTransition } from 'react'
import type { ShareLinkRow } from '@/lib/queries'

/**
 * Create, copy and revoke public links to this recipe.
 *
 * The full URL is assembled in the browser from window.location.origin, so the
 * app doesn't need to know its own deployed hostname.
 */
export function ShareLinks({
  links,
  createAction,
  revokeAction,
}: {
  links: ShareLinkRow[]
  createAction: () => Promise<void>
  revokeAction: (id: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => setOrigin(window.location.origin), [])

  async function copy(token: string) {
    const url = `${origin}/share/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(token)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Clipboard can be blocked (insecure context, denied permission).
      // Selecting the text by hand still works, so fail quietly.
      setCopied(null)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-raised border-rule text-ink-soft no-print rounded-full border px-3 py-1.5 text-sm"
      >
        Share{links.length ? ` (${links.length})` : ''}
      </button>
    )
  }

  return (
    <div className="border-rule bg-raised no-print w-full space-y-3 rounded-[14px] border p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium">Share this recipe</h2>
        <button
          onClick={() => setOpen(false)}
          className="text-ink-faint hover:text-ink ml-auto text-sm"
        >
          Close
        </button>
      </div>

      <p className="text-ink-faint text-xs">
        Anyone with the link can read this one recipe without the household
        password. They can&rsquo;t see anything else, and you can turn a link off
        at any time.
      </p>

      {links.length === 0 ? (
        <p className="text-ink-faint text-sm">No active links.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.id} className="border-rule flex items-center gap-2 border-b pb-2">
              <code className="text-ink-soft min-w-0 flex-1 truncate text-xs">
                {origin}/share/{link.token}
              </code>
              <span className="text-ink-faint shrink-0 text-[11px]">
                {link.viewCount === 0
                  ? 'not opened'
                  : `opened ${link.viewCount}×`}
              </span>
              <button
                onClick={() => copy(link.token)}
                className="text-accent shrink-0 text-xs font-medium"
              >
                {copied === link.token ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => startTransition(() => revokeAction(link.id))}
                disabled={pending}
                className="text-ink-faint hover:text-warn shrink-0 text-xs"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => startTransition(() => createAction())}
        disabled={pending}
        className="bg-accent rounded-[10px] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? 'Working…' : 'Create a link'}
      </button>
    </div>
  )
}
