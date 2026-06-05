import Link from 'next/link'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { NewTicketForm } from './NewTicketForm'

export default function NewTicketPage() {
  return (
    <div className="space-y-6 w-full max-w-2xl">
      <Link href="/portal/tickets" className="dash-back">
        ← Back to tickets
      </Link>

      <PageHeader
        title="New request"
        description="Send a request for anything — a fix, a change, or a question. It lands directly with BTF."
      />

      <NewTicketForm />
    </div>
  )
}
