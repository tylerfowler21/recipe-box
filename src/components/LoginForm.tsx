'use client'

import { useActionState } from 'react'
import { signIn } from '@/lib/actions'

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, undefined)

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="sr-only" htmlFor="password">
        Household password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoFocus
        autoComplete="current-password"
        placeholder="Household password"
        className="field text-center"
      />
      {state?.error ? (
        <p className="text-warn text-center text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="bg-accent w-full rounded-[10px] px-4 py-2.5 font-medium text-white disabled:opacity-60"
      >
        {pending ? 'Checking…' : 'Open the box'}
      </button>
    </form>
  )
}
