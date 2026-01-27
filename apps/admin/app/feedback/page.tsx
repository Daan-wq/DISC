import FeedbackContent from './FeedbackContent'

// Segment config - only works in Server Components (no 'use client')
export const dynamic = 'force-dynamic'

export default function FeedbackPage() {
  return <FeedbackContent />
}
