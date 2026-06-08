import { fireCelebrationConfetti } from '@/lib/celebration/confetti'

/** Confetti burst after an offer is marked accepted. */
export function triggerOfferAcceptedCelebration(): void {
  if (typeof window === 'undefined') return
  void fireCelebrationConfetti()
}
