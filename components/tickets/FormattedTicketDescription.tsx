import {
  isTicketDescriptionHtml,
  sanitizeTicketDescriptionHtml,
} from '@/lib/tickets/description-format'
import { cn } from '@/lib/utils'

export function FormattedTicketDescription({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  if (isTicketDescriptionHtml(content)) {
    const html = sanitizeTicketDescriptionHtml(content)
    return (
      <div
        className={cn('formatted-ticket-description', className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return (
    <div className={cn('formatted-ticket-description formatted-ticket-description--plain', className)}>
      {content}
    </div>
  )
}
