import { LoginForm } from '@/components/LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <div className="mb-8 text-center">
        <p className="text-4xl">🍜</p>
        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">Recipe Box</h1>
        <p className="text-ink-soft mt-2 text-sm">The family collection.</p>
      </div>
      <LoginForm next={next ?? '/'} />
    </main>
  )
}
