'use client'

import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import { markPortalOnboardingComplete } from '@/app/actions/portal'
import {
  PORTAL_ONBOARDING_STEPS,
  type PortalOnboardingStep,
} from '@/components/portal/onboarding-steps'

type SpotlightRect = {
  top: number
  left: number
  width: number
  height: number
}

function getSpotlightRect(target: string | undefined): SpotlightRect | null {
  if (!target) return null
  const el = document.querySelector(target)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return null
  const pad = 6
  return {
    top: Math.max(8, rect.top - pad),
    left: Math.max(8, rect.left - pad),
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  }
}

function tooltipPosition(
  rect: SpotlightRect | null,
  placement: PortalOnboardingStep['placement']
): CSSProperties {
  if (!rect || placement === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: 'min(22rem, calc(100vw - 2rem))',
    }
  }

  const margin = 14
  const style: CSSProperties = { maxWidth: '20rem' }

  switch (placement) {
    case 'right':
      return {
        ...style,
        top: rect.top + rect.height / 2,
        left: rect.left + rect.width + margin,
        transform: 'translateY(-50%)',
      }
    case 'left':
      return {
        ...style,
        top: rect.top + rect.height / 2,
        left: rect.left - margin,
        transform: 'translate(-100%, -50%)',
      }
    case 'bottom':
      return {
        ...style,
        top: rect.top + rect.height + margin,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      }
    case 'top':
    default:
      return {
        ...style,
        top: rect.top - margin,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, -100%)',
      }
  }
}

export function PortalOnboarding({
  onboardingCompleted,
  runId = 0,
}: {
  onboardingCompleted: boolean
  runId?: number
}) {
  const pathname = usePathname()
  const [completed, setCompleted] = useState(onboardingCompleted)
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)

  const steps = PORTAL_ONBOARDING_STEPS
  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  const finish = useCallback(() => {
    setActive(false)
    if (!completed) {
      setCompleted(true)
      void markPortalOnboardingComplete().catch(err => {
        console.error('[portal] failed to save onboarding completion:', err)
      })
    }
  }, [completed])

  const updateSpotlight = useCallback(() => {
    setSpotlight(getSpotlightRect(step?.target))
  }, [step])

  useEffect(() => {
    if (runId > 0) {
      setStepIndex(0)
      setActive(true)
      return
    }
    if (completed) return
    const timer = window.setTimeout(() => setActive(true), 450)
    return () => window.clearTimeout(timer)
  }, [completed, runId])

  useLayoutEffect(() => {
    if (!active) return
    updateSpotlight()

    const target = step?.target ? document.querySelector(step.target) : null
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })

    window.addEventListener('resize', updateSpotlight)
    window.addEventListener('scroll', updateSpotlight, true)
    return () => {
      window.removeEventListener('resize', updateSpotlight)
      window.removeEventListener('scroll', updateSpotlight, true)
    }
  }, [active, stepIndex, step, pathname, updateSpotlight])

  useEffect(() => {
    if (!active) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, finish])

  if (!active || !step) return null

  function goNext() {
    if (isLast) {
      finish()
      return
    }
    setStepIndex(i => i + 1)
  }

  return (
    <div className="portal-onboarding" role="dialog" aria-modal="true" aria-labelledby="portal-onboarding-title">
      <button
        type="button"
        className={`portal-onboarding-backdrop${spotlight ? ' portal-onboarding-backdrop--spotlight' : ''}`}
        aria-label="Skip tour"
        onClick={finish}
      />

      {spotlight ? (
        <div
          className="portal-onboarding-spotlight"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
          aria-hidden
        />
      ) : null}

      <div
        className="portal-onboarding-card"
        style={tooltipPosition(spotlight, spotlight ? step.placement : 'center')}
      >
        <p className="portal-onboarding-eyebrow">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h2 id="portal-onboarding-title" className="portal-onboarding-title">
          {step.title}
        </h2>
        <p className="portal-onboarding-body">{step.body}</p>
        <div className="portal-onboarding-actions">
          <button type="button" className="portal-onboarding-skip" onClick={finish}>
            Skip tour
          </button>
          <button type="button" className="dash-btn-primary cursor-pointer" onClick={goNext}>
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
