import type { ProjectTemplate, ProjectTemplateKey } from './types'

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    key: 'blank',
    label: 'Blank project',
    description: 'Start with an empty project — add phases and tasks yourself.',
    phases: [],
  },
  {
    key: 'e_shop',
    label: 'E-shop',
    description: 'Discovery through launch for an online store build.',
    phases: [
      {
        name: 'Discovery',
        tasks: [
          'Kick-off & requirements',
          'Competitor & market review',
          'Sitemap & user flows',
        ],
      },
      {
        name: 'Design',
        tasks: ['Wireframes', 'UI design', 'Design review & sign-off'],
      },
      {
        name: 'Development',
        tasks: [
          'Shop setup & theme',
          'Product catalogue & checkout',
          'Integrations (payments, shipping)',
          'QA & UAT',
        ],
      },
      {
        name: 'Launch',
        tasks: ['Go-live checklist', 'Training handover', 'Post-launch support window'],
      },
    ],
  },
  {
    key: 'digital_ads',
    label: 'Digital ads',
    description: 'Strategy, creative, and campaign launch for paid media.',
    phases: [
      {
        name: 'Strategy',
        tasks: ['Goals & KPIs', 'Audience research', 'Channel plan & budget'],
      },
      {
        name: 'Creative',
        tasks: ['Ad copy', 'Visual assets', 'Landing page alignment'],
      },
      {
        name: 'Campaign setup',
        tasks: ['Account & pixel setup', 'Campaign build', 'Tracking verification'],
      },
      {
        name: 'Launch & optimize',
        tasks: ['Go live', 'First-week monitoring', 'Optimization report'],
      },
    ],
  },
  {
    key: 'email_marketing',
    label: 'Email marketing',
    description: 'Strategy through build for email campaigns or automation.',
    phases: [
      {
        name: 'Strategy',
        tasks: ['Audience segmentation', 'Campaign calendar', 'Content brief'],
      },
      {
        name: 'Content',
        tasks: ['Subject lines & copy', 'CTA strategy', 'Legal / compliance check'],
      },
      {
        name: 'Design',
        tasks: ['Email template design', 'Mobile review', 'Brand sign-off'],
      },
      {
        name: 'Build & send',
        tasks: ['ESP build & test', 'List setup', 'Send & performance report'],
      },
    ],
  },
]

export function getProjectTemplate(key: ProjectTemplateKey): ProjectTemplate {
  return PROJECT_TEMPLATES.find(t => t.key === key) ?? PROJECT_TEMPLATES[0]
}
