import { ImportWizard } from '@/components/ImportWizard'

export const metadata = { title: 'Add from a link — Recipe Box' }

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Add from a link</h1>
      <ImportWizard />
    </div>
  )
}
