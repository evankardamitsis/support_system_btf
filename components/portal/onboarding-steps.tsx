import type { ReactNode } from 'react'

export type PortalOnboardingStep = {
  id: string
  title: string
  body: ReactNode
  target?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const HOUR_BASED_ONBOARDING_STEPS: PortalOnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to your support portal',
    body: (
      <>
        This short tour shows what you can do here —{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--action">submit requests</span>,{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--status">follow progress</span>,{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--approve">approve estimates</span>, and{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--plan">check your plan hours</span>.
      </>
    ),
    placement: 'center',
  },
  {
    id: 'nav-tickets',
    title: 'My Tickets',
    body: (
      <>
        Your home base. Every request you send to BTF appears here with{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--status">live status</span>.
      </>
    ),
    target: '[data-onboarding="nav-tickets"]',
    placement: 'right',
  },
  {
    id: 'new-request',
    title: 'Submit a new request',
    body: (
      <>
        Use <span className="portal-onboarding-kw portal-onboarding-kw--label">New request</span> for{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--action">bugs, tasks, questions, or changes</span>.
        Describe what you need and BTF picks it up from the queue.
      </>
    ),
    target: '[data-onboarding="new-request"]',
    placement: 'bottom',
  },
  {
    id: 'ticket-list',
    title: 'Track your requests',
    body: (
      <>
        <span className="portal-onboarding-kw portal-onboarding-kw--status">Filter by status</span> and click any row to open the{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--action">full thread</span>, see updates, and reply in the{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--label">activity</span> section.
      </>
    ),
    target: '[data-onboarding="ticket-list"]',
    placement: 'bottom',
  },
  {
    id: 'estimates',
    title: 'Approve estimates',
    body: (
      <>
        When BTF sets hours for a ticket, you will see{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--label">Approve estimate</span> on that row. Open the ticket to review the{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--approve">estimate and priority</span> before work continues.
      </>
    ),
    target: '[data-onboarding="ticket-list"]',
    placement: 'bottom',
  },
  {
    id: 'nav-plan',
    title: 'My Plan',
    body: (
      <>
        Check your <span className="portal-onboarding-kw portal-onboarding-kw--plan">retainer package</span>,{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--plan">hours used</span>, and what is left in the{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--plan">current billing period</span>.
      </>
    ),
    target: '[data-onboarding="nav-plan"]',
    placement: 'right',
  },
  {
    id: 'done',
    title: 'You are all set',
    body: (
      <>
        <span className="portal-onboarding-kw portal-onboarding-kw--action">Submit a request</span> whenever you need help. We will notify you by email when{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--approve">estimates are ready</span> or{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--status">tickets are resolved</span>.
      </>
    ),
    placement: 'center',
  },
]

const FIXED_PLAN_ONBOARDING_STEPS: PortalOnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to your support portal',
    body: (
      <>
        This short tour shows what you can do here —{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--action">submit requests</span> and{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--status">follow progress</span> on your{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--plan">fixed support plan</span>.
      </>
    ),
    placement: 'center',
  },
  ...HOUR_BASED_ONBOARDING_STEPS.filter(
    s => s.id !== 'welcome' && s.id !== 'estimates' && s.id !== 'nav-plan' && s.id !== 'done'
  ),
  {
    id: 'nav-plan',
    title: 'My Plan',
    body: (
      <>
        Check your <span className="portal-onboarding-kw portal-onboarding-kw--plan">fixed monthly plan</span> and{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--plan">current billing period</span>.
      </>
    ),
    target: '[data-onboarding="nav-plan"]',
    placement: 'right',
  },
  {
    id: 'done',
    title: 'You are all set',
    body: (
      <>
        <span className="portal-onboarding-kw portal-onboarding-kw--action">Submit a request</span> whenever you need help. We will notify you by email when{' '}
        <span className="portal-onboarding-kw portal-onboarding-kw--status">tickets are resolved</span>.
      </>
    ),
    placement: 'center',
  },
]

export function getPortalOnboardingSteps(hoursBilling: boolean): PortalOnboardingStep[] {
  return hoursBilling ? HOUR_BASED_ONBOARDING_STEPS : FIXED_PLAN_ONBOARDING_STEPS
}

/** @deprecated Use getPortalOnboardingSteps — defaults to hour-based steps */
export const PORTAL_ONBOARDING_STEPS = HOUR_BASED_ONBOARDING_STEPS
